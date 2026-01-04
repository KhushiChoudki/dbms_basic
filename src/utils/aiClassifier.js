export async function classifyActivity(title, description) {
    const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

    if (!API_KEY) {
        console.warn("GROQ API Key missing");
        return { is_sdg: false, sdg_category: null };
    }

    const systemPrompt = `
    You are an AI assistant that classifies student activities based on the 17 UN Sustainable Development Goals (SDGs).
    
    Instructions:
    1. STRICTLY CHECK: Is this activity related to community service, environment, education, health, or helping others?
    2. If YES -> "is_sdg": true. (e.g., Clean-up drive, Tree planting, Teaching, Blood donation, Charity).
    3. If NO -> "is_sdg": false. (e.g., Gaming tournament, Music concert, Party, General meeting).
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
        console.log("GROQ AI: Sending request for:", title);
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

        const data = await response.json();
        console.log("GROQ AI: Received response:", JSON.stringify(data, null, 2));

        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error("GROQ AI: No content in response");
            return { is_sdg: false, sdg_category: null };
        }

        const result = JSON.parse(content);
        console.log("GROQ AI: Parsed Result:", result);
        return result;

    } catch (error) {
        console.error("GROQ AI Error:", error);
        return { is_sdg: false, sdg_category: null };
    }
}
