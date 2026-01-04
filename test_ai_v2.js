const https = require('https');
const fs = require('fs');

const API_KEY = "AIzaSyDG9JYCOgrfsXqIcUYmCF3a4voNSoA9Sus";

console.log("Fetching available models to file...");

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log("Status Code:", res.statusCode);
        fs.writeFileSync('response_debug.txt', data); // Save raw response
        try {
            const json = JSON.parse(data);
            if (json.models) {
                const modelNames = json.models.map(m => m.name).join('\n');
                fs.writeFileSync('models_list.txt', modelNames);
                console.log("Models saved to models_list.txt");
            } else {
                console.log("No models found. Response saved to response_debug.txt");
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
            fs.writeFileSync('response_debug.txt', "Error parsing: " + e.message + "\nData: " + data);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
