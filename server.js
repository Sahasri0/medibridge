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
 * ELITE GOOGLE SERVICES: Structured Cloud Logging (ALL LOGS)
 * Every log line is now formatted as JSON for Google Cloud Operations (Stackdriver)
 */
const logToCloud = (severity, message, extra = {}) => {
    console.log(JSON.stringify({
        severity,
        message,
        ...extra,
        timestamp: new Date().toISOString(),
        serviceContext: { service: 'medibridge-elite', version: '3.0' }
    }));
};

// Global Latency Monitor
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logToCloud(res.statusCode >= 400 ? 'ERROR' : 'INFO', 
            `${req.method} ${req.originalUrl} HTTP/${req.httpVersion}`, {
            httpRequest: {
                requestMethod: req.method,
                requestUrl: req.originalUrl,
                status: res.statusCode,
                latency: `${(Date.now() - start) / 1000}s`,
                remoteIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress
            }
        });
    });
    next();
});

// Elite Security: Helmet (HSTS: false for local dev)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://maps.googleapis.com", "https://accounts.google.com"],
            "img-src": ["'self'", "data:", "https://*"],
            "connect-src": ["'self'", "https://maps.googleapis.com", "https://generativelanguage.googleapis.com"],
            "frame-src": ["https://accounts.google.com"],
        },
    },
    hsts: false,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 50,
    handler: (req, res) => {
        logToCloud('WARNING', 'Rate limit exceeded for IP: ' + req.ip);
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
});
app.use('/analyze', apiLimiter);

/**
 * GOOGLE CLOUD STORAGE ARCHITECTURE: Mock Signed URL Generation
 * Demonstrates how to handle direct-to-cloud secure uploads
 */
app.get('/generate-gcs-url', (req, res) => {
    logToCloud('INFO', 'Simulating GCS Signed URL generation for secure report upload');
    res.json({
        uploadUrl: `https://storage.googleapis.com/medibridge-reports-bucket/mock-upload-${Date.now()}`,
        expires: 3600,
        headers: { "x-goog-content-length-range": "0,5242880" }
    });
});

const genAI = new GoogleGenerativeAI(process.env.API_KEY || 'MISSING_KEY');

app.post('/analyze', async (req, res) => {
    logToCloud('INFO', 'Starting Gemini 2.5 Flash Analysis');
    try {
        const { image, notes } = req.body;
        if (!image) return res.status(400).json({ error: 'Image missing' });

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const imageData = image.split(',')[1];
        const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

        // India-Centric Prompt (Jan Aushadhi + Ayushman Bharat)
        const systemPrompt = `Analyze this Indian medical document. Provide JSON with:
        medications: [{name, dosage, frequency}],
        jan_aushadhi_equivalents: array of generic alternatives,
        ayushman_bharat_eligibility: eligibility for PM-JAY/CGHS schemes,
        findings: symptoms summary,
        urgency: high/medium/low,
        disclaimer: multilingual (EN + Detected language)`;

        const result = await model.generateContent([
            { inlineData: { data: imageData, mimeType } },
            notes || systemPrompt
        ]);

        const text = await result.response.text();
        logToCloud('INFO', 'Gemini analysis successful');
        res.json(JSON.parse(text));

    } catch (error) {
        logToCloud('ERROR', 'Gemini Analysis Failed', { stack: error.stack });
        res.status(500).json({ error: 'Deep analysis failed. Verify image quality.' });
    }
});

app.get('/health', (req, res) => res.status(200).send('HEALTHY'));

const server = app.listen(port, () => {
    logToCloud('INFO', `MediBridge Elite v3.5 listening on port ${port}`);
});

module.exports = { app, server };
