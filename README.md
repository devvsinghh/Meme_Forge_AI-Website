# 🧠 MemeForge AI – AI-Powered Meme Generator

### AI Essential Subject Project

---

## 📌 Project Overview

**MemeForge AI** is an AI-powered **Meme Generator** built with a **Python Flask backend**
and a vanilla **HTML/CSS/JavaScript frontend**. It combines three powerful APIs — **Gemini AI**,
**Imgflip**, and **Giphy** — to let users describe any situation in plain text and
instantly generate a perfectly captioned meme along with related GIF suggestions.

The app features a complete **AI Magic** pipeline (NLU emotion detection → template
matching → caption generation), a **manual meme generator** with 100+ Imgflip templates,
a **GIF memes** browser powered by Giphy, and a persistent **gallery** for saving
creations locally.

---

## 🌐 APIs Used

| API | Endpoint(s) | Purpose |
|---|---|---|
| **Imgflip** | `GET /get_memes` · `POST /caption_image` | Fetch 100+ trending meme templates & generate captioned meme images |
| **Google Gemini AI** | `POST /v1beta/models/gemini-2.0-flash:generateContent` | Analyze user text → detect emotion, pick template, generate captions |
| **Giphy** | `GET /v1/gifs/search` | Search & discover animated GIF memes by keyword or mood |

### API Keys Required

| API | How to Get |
|---|---|
| Imgflip | Free account — [imgflip.com/signup](https://imgflip.com/signup) (username + password) |
| Gemini AI | Free API key — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Giphy | Free API key — [developers.giphy.com](https://developers.giphy.com/dashboard/?create=true) |

All credentials are stored in `backend/.env` (git-ignored). See **Setup** below.

---

## ✨ Features

### 🪄 AI Magic (Step 1)
| Feature | Description |
|---|---|
| **Natural Language Input** | Describe any situation, feeling, or thought in plain text (up to 300 chars) |
| **Gemini AI Analysis** | Detects emotion, category, suggests the perfect template, and generates captions |
| **Client-Side NLU Fallback** | Built-in keyword-based emotion & category engine when Gemini is unavailable |
| **Quick Examples** | One-click example prompts to get started instantly |
| **Related GIF Suggestions** | AI auto-fetches mood-matching GIFs from Giphy alongside the meme |
| **One-Click Forge** | "Use This & Forge Meme" auto-applies template + captions and generates the meme |

### 🎨 Manual Generator (Step 2)
| Feature | Description |
|---|---|
| **Template Browser** | Browse 100+ trending meme templates fetched live from Imgflip |
| **Live Search** | Instantly filter templates by name |
| **Dynamic Caption Inputs** | Adapts to each template's box count (up to 4 text boxes) |
| **Style Controls** | Choose font family (Impact, Arial, Comic Sans) and text color |
| **🤖 AI Vision Suggestions** | Gemini Vision scans the template image and generates 6 vibe-based caption pairs |
| **Fuzzy Template Matching** | AI suggestions auto-match to available Imgflip templates via fuzzy search |

### 🎬 GIF Memes (Step 3)
| Feature | Description |
|---|---|
| **GIF Search** | Full-text search for animated GIF memes via Giphy API |
| **Category Chips** | Quick-filter by mood: Trending, Funny, Coding, Student, Monday, Sarcastic, Sad, Celebrate |
| **Infinite Load** | "Load More GIFs" pagination for deep browsing |
| **Copy / Open / Save** | Copy GIF URL, open on Giphy, or save directly to your gallery |

### 🖼️ Gallery & General
| Feature | Description |
|---|---|
| **My Meme Gallery** | Save generated memes & GIFs to browser `localStorage` |
| **Persistent Storage** | Gallery survives page reloads and browser sessions |
| **Download** | Download generated meme images directly |
| **Share Link** | Open meme at its public Imgflip URL |
| **Toast Notifications** | Color-coded feedback for every action (success, warning, error, info) |
| **Responsive Design** | Fully responsive across desktop, tablet, and mobile |
| **Particle Background** | Animated floating particles for visual depth |

---

## 🚀 How to Run

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd aiEssential
```

Create a `backend/.env` file with your API credentials:

```env
# Google Gemini API Key (free from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key

# Giphy API Key (free from https://developers.giphy.com/dashboard/?create=true)
GIPHY_API_KEY=your_giphy_api_key

# Imgflip Credentials (free from https://imgflip.com/signup)
IMGFLIP_USERNAME=your_imgflip_username
IMGFLIP_PASSWORD=your_imgflip_password
```

> ⚠️ `backend/.env` is git-ignored — your credentials stay local and are never exposed to the browser.

### 2. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Start the Server

```bash
python app.py
```

The server starts at **http://localhost:5000** — open it in your browser.

### 4. Start Creating

- **AI Magic** → Describe a situation → AI generates the meme  
- **Manual Mode** → Pick a template → Write captions → Forge  
- **GIF Memes** → Search or browse → Copy / Save to gallery  

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| **Python / Flask** | Backend server — proxies all API calls, manages secrets |
| **HTML5** | Page structure & semantic markup |
| **CSS3** | Dark theme, glassmorphism, gradients, particle animations |
| **JavaScript (ES6+)** | Frontend logic, state management, DOM interaction, NLU engine |
| **Google Gemini AI** | Natural language analysis & intelligent meme generation |
| **Imgflip API** | Meme template fetching & captioned image generation |
| **Giphy API** | Animated GIF meme search & discovery |
| **Google Fonts** | Modern typography (Outfit, Space Grotesk) |
| **localStorage** | Meme gallery persistence |

---

## 📁 Project Structure

```
aiEssential/
├── backend/
│   ├── app.py              ← Flask server with 6 API endpoints
│   ├── requirements.txt    ← Python dependencies (flask, flask-cors, etc.)
│   └── .env                ← API credentials (git-ignored)
├── frontend/
│   ├── index.html          ← Full page structure (Hero, AI Magic, Generator, GIFs, Gallery)
│   ├── style.css           ← Dark theme, glassmorphism, animations, responsive grid
│   └── app.js              ← Frontend logic (calls backend API, NLU fallback, DOM)
├── .gitignore              ← Excludes .env and __pycache__ from version control
└── README.md               ← This file
```

### Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Serves the frontend |
| `/api/health` | GET | Health check — reports which API keys are configured |
| `/api/memes` | GET | Proxies Imgflip `get_memes` API |
| `/api/caption` | POST | Proxies Imgflip `caption_image` (server injects credentials) |
| `/api/ai/analyze` | POST | Sends text to Gemini AI for meme analysis |
| `/api/ai/vision` | POST | Sends image to Gemini Vision for caption suggestions |
| `/api/gifs/search` | GET | Proxies Giphy search API |

---

## 🧠 Architecture

### Frontend ↔ Backend Flow

```
Frontend (browser)              Backend (Flask @ :5000)           External APIs
─────────────────              ────────────────────────           ─────────────
                                                         
User types text ──►  fetch('/api/ai/analyze')  ──►  Gemini AI
                          ◄── JSON result ◄──           
                                                         
User clicks Forge ──►  fetch('/api/caption')  ──►  Imgflip API
                          ◄── meme URL ◄──              
                                                         
GIF search ──►  fetch('/api/gifs/search')  ──►  Giphy API
                     ◄── GIF results ◄──                
```

> **Key benefit:** All API keys stay on the server. The frontend never sees or transmits any secrets.



## 🎓 Learning Outcomes

- **Full-Stack Architecture** — Python Flask backend with a static JavaScript frontend
- **API Security** — Server-side API key management via environment variables
- **Multi-API integration** — coordinating Gemini AI, Imgflip, and Giphy in a single app
- **REST API design** — building proxy endpoints with Flask
- **AI / NLU concepts** — keyword-based emotion detection, template matching, caption generation

---


~AI Essential Subject · Powered by [Gemini AI](https://ai.google.dev/) · [Imgflip API](https://imgflip.com/api) · [Giphy](https://giphy.com)
