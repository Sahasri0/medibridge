const https = require('https');
require('dotenv').config();

const API_KEY = process.env.API_KEY;

function testV1() {
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.write(JSON.stringify({
        contents: [{
            parts: [{ text: "hello" }]
        }]
    }));
    req.end();
}

testV1();
