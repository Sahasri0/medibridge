const request = require('supertest');
const nock = require('nock');
const { app, server } = require('../server');

describe('MediBridge Core API Tests', () => {

    const CURRENT_API_KEY = process.env.API_KEY || 'test_key';

    beforeAll(() => {
        // Suppress console logs during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(async () => {
        await server.close();
        nock.cleanAll();
    });

    describe('GET / Health', () => {
        it('should return 200 for root endpoint', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toMatch(/html/);
        });

        it('should return 200 for health check', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toEqual(200);
            expect(res.text).toBe('OK');
        });
    });

    describe('POST /analyze (Gemini Integration)', () => {
        const mockImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

        it('should return 400 if no image is provided', async () => {
            const res = await request(app)
                .post('/analyze')
                .send({ notes: 'Test' });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Image is required');
        });

        it('should correctly parse and return mock Gemini India-context JSON response', async () => {
            const mockGeminiResponse = {
                medications: [{ name: "Paracetamol", dosage: "500mg", frequency: "TDS" }],
                generic_alternatives: ["Generic Paracetamol (Jan Aushadhi)"],
                symptoms: "Fever and cold.",
                nextSteps: "Rest and hydration.",
                scheme_eligibility: "Patient may qualify for Ayushman Bharat (PM-JAY).",
                urgency: "low",
                disclaimer: "Medical disclaimer in English and Hindi."
            };

            // Mocking the Google Generative Language API call
            nock('https://generativelanguage.googleapis.com')
                .post(uri => uri.includes('/v1beta/models/gemini-2.5-flash:generateContent'))
                .query(true) // match all query params
                .reply(200, {
                    candidates: [{
                        content: {
                            parts: [{ text: JSON.stringify(mockGeminiResponse) }]
                        }
                    }]
                });

            const res = await request(app)
                .post('/analyze')
                .send({ image: mockImage, notes: 'Fever' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.medications[0].name).toBe('Paracetamol');
            expect(res.body.scheme_eligibility).toContain('Ayushman Bharat');
            expect(res.body.generic_alternatives).toContain("Generic Paracetamol (Jan Aushadhi)");
        });

        it('should handle API errors gracefully', async () => {
            nock('https://generativelanguage.googleapis.com')
                .post(uri => uri.includes('/v1beta/models/gemini-2.5-flash:generateContent'))
                .query(true)
                .reply(500, { error: { message: 'Internal Server Error' } });

            const res = await request(app)
                .post('/analyze')
                .send({ image: mockImage });

            expect(res.statusCode).toEqual(500);
            expect(res.body.error).toMatch(/Failed to process request/);
        });
    });
});
