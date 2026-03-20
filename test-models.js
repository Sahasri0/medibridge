const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    try {
        // There isn't a direct listModels in the SDK for some versions, 
        // but we can try to hit the endpoint or just try different model names.
        console.log("Testing model names...");
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-1.5-flash-002"];
        
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                console.log(`Model ${m} works!`);
                return;
            } catch (e) {
                console.log(`Model ${m} failed: ${e.message}`);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
