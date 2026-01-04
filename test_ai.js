const https = require('https');

const API_KEY = "AIzaSyDG9JYCOgrfsXqIcUYmCF3a4voNSoA9Sus";

async function testAI() {
    console.log("Testing AI Classifer...");

    const title = "Community Clean-up Drive";
    const description = "Collecting plastic waste from the local park to improve sanitation and help the environment.";

    const prompt = `
    Analyze the following student activity and determine if it aligns with any of the 17 UN Sustainable Development Goals (SDGs).
    
    Activity Title: "${title}"
    Description: "${description}"

    Instructions:
    1. If the activity is clearly related to environmental, social, or economic sustainability (e.g., planting trees, teaching underprivileged kids, recycling, health awareness), mark "is_sdg" as true.
    2. Assign the most relevant SDG Category (e.g., "SDG 4: Quality Education", "SDG 13: Climate Action").
    3. If mostly for fun/entertainment (e.g., gaming, party), mark "is_sdg" as false.

    Return ONLY a JSON object with this format:
    {
      "is_sdg": boolean,
      "sdg_category": string // e.g., "SDG 13: Climate Action" or null
    }
    `;

    const data = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1/models?key=${API_KEY}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log("Status Code:", res.statusCode);

            try {
                const json = JSON.parse(body);
                if (json.models) {
                    console.log("Available Gemini Models:");
                    const geminiModels = json.models.filter(m => m.name.includes('gemini'));
                    if (geminiModels.length > 0) {
                        geminiModels.forEach(m => console.log(m.name));
                    } else {
                        console.log("No 'gemini' models found. Listing all:");
                        json.models.forEach(m => console.log(m.name));
                    }
                } else {
                    console.log("No models found. Response:", body);
                }
            } catch (e) {
                console.error("Error parsing JSON:", e);
                console.log("Raw body:", body);
            }
        });
    });

    req.on('error', (error) => {
        console.error("Request Error:", error);
    });

    req.end();
}

testAI();
