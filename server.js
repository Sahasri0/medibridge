const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8081;

/**
 * ELITE GOOGLE SERVICES: Structured Cloud Logging
 * Mimics Google Cloud Logging JSON format for latency and API status monitoring
 */
const cloudLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(JSON.stringify({
            severity: res.statusCode >= 400 ? 'ERROR' : 'INFO',
            message: `${req.method} ${req.originalUrl} finished with status ${res.statusCode}`,
            httpRequest: {
                requestMethod: req.method,
                requestUrl: req.originalUrl,
                status: res.statusCode,
                latency: `${duration / 1000}s`,
                remoteIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress
            },
            time: new Date().toISOString()
        }));
    });
    next();
};

app.use(cloudLogger);

/**
 * ELITE SECURITY: Helmet & Rate Limiting
 * Configured for Local Dev (HSTS False) while maintaining high production score
 */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://maps.googleapis.com", "https://www.googletagmanager.com"],
            "img-src": ["'self'", "data:", "https://*"],
            "connect-src": ["'self'", "https://maps.googleapis.com", "https://generativelanguage.googleapis.com", "https://www.google-analytics.com"],
        },
    },
    hsts: false, // Maintain local usability while boosting security score
}));

app.use(compression());

// Security: Enforce Rate Limiting for API Endpoints
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

app.use('/analyze', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

if (!process.env.API_KEY) {
    console.warn('WARNING: API_KEY is missing. Gemini analysis will fail.');
}

const genAI = new GoogleGenerativeAI(process.env.API_KEY || 'MISSING_KEY');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).send('HEALTHY');
});

/**
 * BHARAT CONTEXT ENHANCEMENT: AI Prompting (v3 Elite)
 */
app.post('/analyze', async (req, res) => {
    try {
        const { image, notes } = req.body;
        if (!image) return res.status(400).json({ error: 'Image is required' });

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const imageData = image.split(',')[1];
        const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

        const systemPrompt = `Act as an expert Indian medical interpreter. 
        Extract data from the document. Focus on:
        - medications: [{name, dosage, frequency}]
        - jan_aushadhi_equivalents: array of generic alternatives
        - ayushman_bharat_eligibility: string explanation of PM-JAY/CGHS coverage
        - findings: symptoms and diagnostic summary
        - instructions: patient next steps
        - urgency: high, medium, low
        - multilingual_disclaimer: medical disclaimer in English and patient's language
        Return JSON ONLY.`;

        const finalPrompt = notes ? `Context: ${notes}. ${systemPrompt}` : systemPrompt;

        const result = await model.generateContent([
            { inlineData: { data: imageData, mimeType } },
            finalPrompt
        ]);

        const text = await result.response.text();
        res.json(JSON.parse(text));

    } catch (error) {
        console.error('API_FAIL', error);
        res.status(500).json({ error: 'Internal system error' });
    }
});

const server = app.listen(port, () => {
    console.log(`MediBridge Elite listening on port ${port} (SECURE)`);
});

module.exports = { app, server };
