export async function classifyActivity(title, description) {
    const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

    if (!API_KEY) {
        console.warn("GROQ AI: API Key missing in environment variables.");
        return { is_sdg: false, sdg_category: null };
    }

    const systemPrompt = `
    You are an expert AI assistant specializing in the 17 UN Sustainable Development Goals (SDGs).
    
    Your task is to determine if a student activity aligns with any SDG.
    
    SDG Quick Reference:
    1: No Poverty, 2: Zero Hunger, 3: Good Health, 4: Quality Education, 5: Gender Equality, 
    6: Clean Water, 7: Affordable Energy, 8: Decent Work, 9: Industry/Innovation, 10: Reduced Inequality, 
    11: Sustainable Cities, 12: Responsible Consumption, 13: Climate Action, 14: Life Below Water, 
    15: Life on Land, 16: Peace/Justice, 17: Partnerships.

    Instructions:
    1. STRICTLY CHECK: Is this activity related to community service, environment, education, health, helping others, or any SDG above?
    2. If YES -> "is_sdg": true. (e.g., Clean-up drive, Tree planting, Teaching, Blood donation, Charity, Tech for good).
    3. If NO -> "is_sdg": false. (e.g., Gaming tournament, Music concert, Party, General meeting, Routine personal tasks).
    4. Assign the most relevant SDG Category if true (e.g., "SDG 4: Quality Education", "SDG 13: Climate Action").
    
    Return ONLY a JSON object with this format:
    {
      "is_sdg": boolean,
      "sdg_category": string // or null
    }
    `;

    const userPrompt = `
    Activity Title: "${title}"
    Description: "${description}"
    `;

    try {
        console.log("GROQ AI: Requesting classification for:", title);

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

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`GROQ AI: API Error (Status ${response.status}):`, errorText);
            return { is_sdg: false, sdg_category: null };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error("GROQ AI: No content in response choices", data);
            return { is_sdg: false, sdg_category: null };
        }

        const result = JSON.parse(content);
        console.log("GROQ AI: Classification Result:", result);
        return result;

    } catch (error) {
        console.error("GROQ AI: Request failed:", error);
        return { is_sdg: false, sdg_category: null };
    }
}
