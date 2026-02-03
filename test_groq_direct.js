const API_KEY = "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";

async function testGroq() {
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
    Activity Title: "Clean-up Drive"
    Description: "We cleaned the local beach and collected 50kg of plastic."
    `;

    try {
        console.log("Testing Groq API...");
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
        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));

        if (data.choices && data.choices[0]) {
            console.log("Result:", data.choices[0].message.content);
        } else {
            console.log("No choices in response.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

testGroq();
