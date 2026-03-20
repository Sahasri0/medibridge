# 🏥 MediBridge 2.0 (India Context Edition)

MediBridge is an AI-powered medical document interpreter built for the **PromptWars Hyderabad Hackathon**. It uses Gemini 2.5 Flash to help Indian patients understand their prescriptions and reports better by identifying generic medicine alternatives (Jan Aushadhi) and checking eligibility for health schemes like Ayushman Bharat (PM-JAY).

---

## 🚀 Key Features (v2.0)

- **AI-Driven Interpretation**: Automatically extracts medications, dosages, and symptoms from prescriptions.
- **India Focus**: Suggests **Jan Aushadhi** generic medicine alternatives and identifies **Ayushman Bharat / CGHS** eligibility.
- **Multilingual Support**: Supports inputs and notes in **Hindi, Telugu, and Tamil**.
- **Nearby Care**: Integrated with Google Maps Places API to find the 3 nearest hospitals/pharmacies based on your geolocation.
- **Premium UX**: High-performance, accessible, and responsive dark UI with glassmorphism.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Node.js 18.x or 20.x
- Google AI Studio API Key (Gemini)
- Google Maps JavaScript API Key (with Places Library enabled)

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
API_KEY=your_gemini_api_key
PORT=8080
```

### 3. Frontend Configuration
Replace `YOUR_MAPS_API_KEY` in `index.html` with your actual Google Maps API key:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_MAPS_API_KEY&libraries=places"></script>
```

### 4. Run Locally
```bash
npm install
npm start
```
Access the app at `http://localhost:8080`.

---

## 🧪 Test Cases

To verify the quality and robustness of the application, test the following scenarios:

1. **Standard Image**: Upload a clear PNG/JPG of an English prescription. (Expected: List of meds, dosages, and next steps).
2. **Hindi/Telugu Inputs**: Add notes in Hindi (e.g., "मुझे सिरदर्द हो रहा है") or Telugu. (Expected: AI understands context and provides bilingual disclaimer).
3. **Jan Aushadhi Check**: Upload a prescription with common brand names. (Expected: Generics like 'Paracetamol' instead of brands appear in the 'Generic Alternatives' list).
4. **Large File Rejection**: Attempt to upload a file >5MB. (Expected: Frontend alert "File is too large!").
5. **Geolocation (Nearby Care)**: Click "Nearby Hospitals". (Expected: Browser asks for location permission, then displays 3 hospital cards with ratings).
6. **Non-Image Rejection**: Try uploading a `.pdf` or `.txt` file. (Expected: Frontend alert "Invalid file type").

---

## 🛡️ Security Measures

- **Input Sanitization**: All Gemini outputs are passed through a frontend sanitizer function to prevent XSS (Cross-Site Scripting) when rendering AI-generated content.
- **Rate Limiting**:
  - **Client-Side**: A 3-second 'cooldown' logic on the main button prevents accidental double-submits.
  - **Server-Side**: `express-rate-limit` window prevents API abuse from single IP addresses.
- **Secure Headers**: Using `helmet.js` to set Content Security Policy (CSP) and remove `X-Powered-By` headers.
- **Environment Variables**: Production API keys are managed purely via environment variables and never committed to version control (`.dockerignore` and `.gitignore` configured).

---

## 📦 Deployment (Cloud Run)

MediBridge is optimized for Google Cloud Run with a multi-stage `Dockerfile`.

```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/medibridge
gcloud run deploy medibridge --image gcr.io/[PROJECT_ID]/medibridge --set-env-vars API_KEY=[API_KEY]
```

---

## ⚖️ Disclaimer
*MediBridge is an AI experimental tool. It does not provide professional medical advice. Always consult a certified physician for medical decisions.*
