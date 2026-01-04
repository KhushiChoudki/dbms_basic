const https = require('https');

const url = "https://docs.google.com/spreadsheets/d/1Vw_aePjfQ8I99mqx2P2dbEwjtv3Rbr2GmLDFNqItfb8/edit?usp=sharing";

console.log(`Fetching: ${url}`);

https.get(url, (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Content-Type:", res.headers['content-type']);
    console.log("Location (if redirect):", res.headers['location']);

    let data = '';
    res.on('data', (chunk) => {
        if (data.length < 500) data += chunk;
    });
    res.on('end', () => {
        console.log("Data preview (first 500 chars):");
        console.log(data.substring(0, 500));
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
