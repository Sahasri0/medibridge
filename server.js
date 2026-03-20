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

// Temporary: Comment out helmet for local dev if HSTS lock-in persists
/*
app.use(helmet({
    contentSecurityPolicy: { ... },
    hsts: false,
}));
*/

// Efficiency: Compression for reduced asset size
app.use(compression());

// Logging: Morgan for tracking requests
app.use(morgan('dev'));

// Security: Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/analyze', limiter);

// Diagnostic Global Middleware
app.use((req, res, next) => {
    if (req.method === 'POST') {
        console.log(`[DIAGNOSTIC] Incoming ${req.method} request to ${req.url}`);
    }
    next();
});

// Efficiency: Body parser limits
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

if (!process.env.API_KEY) {
    console.error('CRITICAL ERROR: API_KEY is missing in your .env file or environment variables.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Health Check Endpoint for Cloud Run
 */
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.post('/analyze', async (req, res) => {
    console.log('--- Incoming /analyze request ---');
    try {
        const { image, notes } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }

        // Efficiency & Performance: Use the latest 2026 model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            // Advanced Feature: Support for structured output
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const imageData = image.split(',')[1];
        const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

        // Refined Prompting for India Context (v2.0)
        const systemPrompt = `Act as an expert Indian medical document interpreter.
        Analyze the provided image (prescription, report, or note) which may be in English, Hindi, Telugu, or Tamil.
        
        Extract and provide the following in structured JSON:
        - medications: array of {name, dosage, frequency}
        - generic_alternatives: array of Jan Aushadhi (generic) alternatives for the medicines mentioned (to save costs)
        - symptoms: key medical findings identified
        - nextSteps: follow-up actions/tests
        - scheme_eligibility: specify if the condition/procedure might be covered under 'Ayushman Bharat (PM-JAY)' or 'CGHS'
        - urgency: high, medium, or low
        - disclaimer: medical disclaimer in English and the patient's detected language
        
        Return ONLY valid JSON.`;

        const userNotes = notes ? `\nPatient's context: ${notes}` : "";
        const finalPrompt = `${userNotes}\nInterpret this medical document for an Indian patient context.`;

        console.log(`Analyzing document (v2.0) with model: gemini-2.5-flash`);
        
        const result = await model.generateContent([
            {
                inlineData: {
                    data: imageData,
                    mimeType: mimeType
                }
            },
            finalPrompt
        ]);

        const response = await result.response;
        const text = response.text();

        // Security: Log result but handle carefully in production
        res.json(JSON.parse(text));
    } catch (error) {
        console.error('Error analyzing image:', error);
        
        // Error handling refinement
        if (error.message.includes('API_KEY')) {
            return res.status(401).json({ error: 'Access Denied: Invalid API Key' });
        }
        
        res.status(500).json({ error: 'Failed to process request. Please try again later.' });
    }
});

// Port handling for Cloud Run compatibility
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port} (Production Mode)`);
});

module.exports = { app, server };
