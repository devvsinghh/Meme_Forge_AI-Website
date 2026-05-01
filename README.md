# 🧠 MemeForge AI – AI-Powered Meme Generator

### AI Essential Subject Project

---

## 📌 Project Overview

**MemeForge AI** is a fully interactive, browser-based **AI Meme Generator** built with
vanilla HTML, CSS, and JavaScript. It combines three powerful APIs — **Gemini AI**,
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

All credentials are stored in `config.js` (git-ignored). See **Setup** below.

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
| **🤖 AI Caption Suggestions** | 6 vibe-based caption packs (Relatable, Savage, Wholesome, Programmer, Student, Monday) |
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

Create a `config.js` file in the project root with your API credentials:

```js
const IMGFLIP_CONFIG = {
  username: 'your_imgflip_username',
  password: 'your_imgflip_password',
};

const GEMINI_CONFIG = {
  apiKey: 'your_gemini_api_key',   // from aistudio.google.com/apikey
};

const GIPHY_CONFIG = {
  apiKey: 'your_giphy_api_key',    // from developers.giphy.com
};
```

> ⚠️ `config.js` is git-ignored — your credentials stay local.

### 2. Open the App

No build tools needed — just open the HTML file directly:

```
open index.html
```

Or use a local development server:

```bash
npx serve . -p 3333
# Then open http://localhost:3333
```

### 3. Start Creating

- **AI Magic** → Describe a situation → AI generates the meme  
- **Manual Mode** → Pick a template → Write captions → Forge  
- **GIF Memes** → Search or browse → Copy / Save to gallery  

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| HTML5 | Page structure & semantic markup |
| CSS3 | Dark theme, glassmorphism, gradients, particle animations |
| JavaScript (ES6+) | API integration, state management, DOM logic, NLU engine |
| Google Gemini AI | Natural language analysis & intelligent meme generation |
| Imgflip API | Meme template fetching & captioned image generation |
| Giphy API | Animated GIF meme search & discovery |
| Google Fonts (Outfit, Space Grotesk) | Modern typography |
| localStorage | Meme gallery persistence |

---

## 📁 Project Structure

```
aiEssential/
├── index.html    ← Full page structure (Hero, AI Magic, Generator, GIFs, Gallery)
├── style.css     ← Dark theme, glassmorphism, animations, responsive grid
├── app.js        ← All application logic (API calls, AI NLU engine, state, DOM)
├── config.js     ← API credentials (git-ignored — create your own)
├── .gitignore    ← Excludes config.js from version control
└── README.md     ← This file
```

---

## 🧠 Architecture Highlights

### AI Meme Pipeline

```
User Input (text)
    │
    ▼
┌────────────────────┐     ┌──────────────────────┐
│  Gemini AI (cloud)  │────▶│  Structured JSON      │
│  Emotion + Template │     │  emotion, category,   │
│  + Captions         │     │  template, captions   │
└────────────────────┘     └──────────┬───────────┘
    │ (fallback)                       │
    ▼                                  ▼
┌────────────────────┐     ┌──────────────────────┐
│  Client-Side NLU    │     │  Fuzzy Template Match │
│  Keyword matching   │     │  Against Imgflip list │
│  10 emotions ×      │     └──────────┬───────────┘
│  8 categories       │                │
└────────────────────┘                ▼
                              ┌──────────────────┐
                              │  Forge Meme via   │
                              │  Imgflip API POST │
                              └──────────────────┘
```

### Client-Side NLU Engine

The built-in fallback AI engine (`AI_NLU`) runs entirely in the browser:

- **10 Emotion categories**: Funny, Stress, Sarcasm, Relatable, Sad, Angry, Shocked, Happy, Tired, Confused
- **8 Topic categories**: Student Life, Coding, Work Life, Relationships, Daily Struggle, Internet Culture, Gaming, Food
- **Dynamic caption patterns**: Context-aware text generation per emotion
- **Template mapping**: 15+ emotion × category combinations mapped to curated Imgflip templates

---

## 🎓 Learning Outcomes

- **Multi-API integration** — coordinating Gemini AI, Imgflip, and Giphy in a single app
- **REST API calls** — `fetch()` with GET, POST, FormData, and URLSearchParams
- **AI / NLU concepts** — keyword-based emotion detection, template matching, caption generation
- **Async/Await** — clean asynchronous JavaScript with error handling and loading states
- **localStorage** — client-side data persistence for the gallery
- **Modern CSS** — glassmorphism, gradient text, particle animations, responsive grid layouts
- **UI/UX Design** — building premium, multi-section, responsive web interfaces
- **Security** — API key management via `.gitignore` and separate config files

---

## 📜 License

This project is built for academic purposes as part of the **AI Essential** subject curriculum.

---

*Built for AI Essential Subject · Powered by [Gemini AI](https://ai.google.dev/) · [Imgflip API](https://imgflip.com/api) · [Giphy](https://giphy.com)*
