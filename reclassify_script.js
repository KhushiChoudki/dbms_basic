const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function classifyActivity(title, description) {
    if (!API_KEY) return { is_sdg: false, sdg_category: null };

    const systemPrompt = `
    You are an expert AI assistant specializing in the 17 UN Sustainable Development Goals (SDGs).
    Instructions:
    1. STRICTLY CHECK: Is this activity related to community service, environment, education, health, helping others, or any SDG?
    2. If YES -> "is_sdg": true.
    3. If NO -> "is_sdg": false.
    4. Assign the most relevant SDG Category if true (e.g., "SDG 4: Quality Education", "SDG 13: Climate Action").
    Return ONLY a JSON object: {"is_sdg": boolean, "sdg_category": string | null}
    `;

    const userPrompt = `Activity Title: "${title}"\nDescription: "${description}"`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) return { is_sdg: false, sdg_category: null };
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        return content ? JSON.parse(content) : { is_sdg: false, sdg_category: null };
    } catch (error) {
        return { is_sdg: false, sdg_category: null };
    }
}

async function runReclassification() {
    console.log("Fetching activities missing SDG classification...");

    const { data: activities, error } = await supabase
        .from('activities')
        .select('activity_id, title, description, is_sdg')
        .or('is_sdg.is.null,is_sdg.eq.false'); // Checking for null or false (to be safe)

    if (error) {
        console.error("Error fetching activities:", error);
        return;
    }

    console.log(`Found ${activities.length} activities to check.`);

    for (const activity of activities) {
        console.log(`Checking: ${activity.title}...`);
        const result = await classifyActivity(activity.title, activity.description);

        if (result.is_sdg) {
            console.log(`  -> Classifying as ${result.sdg_category}`);
            const { error: updateError } = await supabase
                .from('activities')
                .update({
                    is_sdg: true,
                    sdg_category: result.sdg_category
                })
                .eq('activity_id', activity.activity_id);

            if (updateError) console.error(`  !! Update failed for ${activity.activity_id}:`, updateError);
        } else {
            console.log(`  -> Not an SDG activity.`);
        }
    }

    console.log("Done!");
}

runReclassification();
