const request = require('supertest');
const { app, server } = require('../server');

describe('POST /analyze', () => {
    // Correctly close server after tests
    afterAll(async () => {
        await server.close();
    });

    it('should return 400 if no image is provided', async () => {
        const res = await request(app)
            .post('/analyze')
            .send({ notes: 'Test notes' });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should have a health check endpoint', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe('OK');
    });

    // Note: We don't test the actual Gemini API call here as it requires an API_KEY 
    // and would be an integration/E2E test. We can mock it if needed.
});
