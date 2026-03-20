const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

if (!process.env.API_KEY) {
    console.error('CRITICAL ERROR: API_KEY is missing in your .env file or environment variables.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/analyze', async (req, res) => {
    try {
        const { image, notes } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const imageData = image.split(',')[1];
        const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

        const systemPrompt = "Act as a professional medical document interpreter. Extract: Medications, Dosages, Symptoms, and Next Steps. Always include a disclaimer.";
        const userNotes = notes ? `\nPatient's context/notes: ${notes}` : "";
        const finalPrompt = `${systemPrompt}${userNotes}\nAnalyze the provided medical document image and extract the information mentioned above.`;

        console.log(`Analyzing document with model: gemini-2.5-flash`);
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

        res.json({ analysis: text });
    } catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
