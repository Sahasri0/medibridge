const https = require('https');
require('dotenv').config();

const API_KEY = process.env.API_KEY;

function listModels() {
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1/models?key=${API_KEY}`,
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        let data = '';
        res.on('data', (d) => {
            data += d;
        });
        res.on('end', () => {
            console.log(data);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.end();
}

listModels();
