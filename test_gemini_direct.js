const API_KEY = "AIzaSyDG9JYCOgrfsXqIcUYmCF3a4voNSoA9Sus";

async function testGemini() {
    const prompt = `
    You are an AI assistant that classifies student activities based on the 17 UN Sustainable Development Goals (SDGs).
    
    Activity Title: "Clean-up Drive"
    Description: "We cleaned the local beach and collected 50kg of plastic."
    
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

    try {
        console.log("Testing Gemini API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();
        console.log("Response Status:", response.status);

        if (data.candidates && data.candidates[0]) {
            console.log("Result:", data.candidates[0].content.parts[0].text);
        } else {
            console.log("No candidates in response. Error:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

testGemini();
