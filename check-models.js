const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function checkModels() {
    if (!process.env.API_KEY) {
        console.error("API_KEY is missing!");
        return;
    }
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    
    // We can't easily list models from the JS SDK directly without the full client, 
    // but we can try common ones and see the error.
    
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp"
    ];

    for (const modelName of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("hello");
            console.log(`✅ Model ${modelName} is AVAILABLE`);
        } catch (error) {
            console.log(`❌ Model ${modelName} FAILED: ${error.message}`);
        }
    }
}

checkModels();
