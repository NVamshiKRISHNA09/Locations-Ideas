# Locality Idea Search & Build Assistant

A location-aware AI-powered app that finds **software and hardware project ideas** grounded in your city's real problems, local makerspaces, and available resources — then provides an AI chat assistant to help you build them.

---

## ✨ Features

- **📍 Location Grounding** — GPS auto-detect or city search (powered by OpenStreetMap/Nominatim)
- **🏪 Local Resource Map** — Finds nearby makerspaces, electronics stores, and hardware suppliers (Overpass API)
- **💡 AI Idea Generator** — Generates 8 ideas tailored to your locale, local infrastructure, and available resources
- **🏗️ Build Brief** — Detailed architecture, Bill of Materials, phased roadmap, and safety notes
- **💬 Streaming AI Chat** — Real-time SSE streaming chat assistant scoped to your project
- **📋 BOM Tracker** — Interactive checkbox-based component tracking
- **🔁 Chat History** — All threads saved in `localStorage`
- **🔑 API Key Manager** — Set your key directly in the app's UI

---

## 🚀 Quick Start

### 1. Install Node.js

Download from **[nodejs.org](https://nodejs.org)** (LTS version recommended). Verify:

```bash
node --version   # v18+ required
npm --version
```

### 2. Clone / Open the Project

This project lives in `c:\Users\raora\.cursor\`

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure API Key

Copy the example env file:

```bash
copy .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-key-here
```

**Alternatively**, you can add the key directly in the app UI → Settings (⚙️ icon in navbar).

### 5. Run Dev Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 API Key Setup

The app uses an **OpenAI-compatible API**. Supported providers:

| Provider | Base URL | Notes |
|----------|----------|-------|
| **OpenAI** | `https://api.openai.com/v1` (default) | GPT-4o-mini recommended |
| **Groq** | `https://api.groq.com/openai/v1` | Free tier, very fast |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Access to many models |
| **Ollama (local)** | `http://localhost:11434/v1` | No API key needed |

Set these in `.env.local` **or** in the ⚙️ Settings modal in the app. The browser-stored key never leaves your device.

**No API key?** The app still works! It shows 8 sample ideas so you can explore the UI.

---

## 🌍 How Location & OSM Work

1. **Geocoding** — Uses [Nominatim](https://nominatim.org/) (OpenStreetMap's geocoding service, free, no key needed)
2. **Nearby Resources** — Uses [Overpass API](https://overpass-api.de/) to query makerspaces, hackerspaces, electronics stores within 25km
3. **Fallback** — If Overpass is unreachable, ideas are still generated using the place name only

### Privacy
- Location is stored in `localStorage` only — never sent to any analytics service
- GPS coordinates are used for OSM queries and sent to your configured LLM with the idea generation prompt

---

## 📁 Project Structure

```
app/
  page.tsx                    # Home: location + idea grid
  layout.tsx                  # Root layout
  globals.css                 # Dark theme, glassmorphism styles
  api/
    locality/route.ts         # Geocoding + Overpass nearby resources
    ideas/route.ts            # LLM idea generation
    chat/route.ts             # SSE streaming chat

components/
  Navbar.tsx                  # Navigation with location badge + API key status
  LocationPicker.tsx          # GPS + city search with autocomplete
  IdeaCard.tsx                # Project idea card
  ApiKeyModal.tsx             # API key settings modal

lib/
  prompts.ts                  # LLM system + user prompts
  chat-store.ts               # localStorage manager (types, CRUD)
```

---

## 🛠️ Customization

- **Idea count** — Edit `buildIdeasUserPrompt()` in `lib/prompts.ts` to ask for more/fewer ideas
- **Search radius** — Change `radiusM` in `app/api/locality/route.ts` (default 25km)
- **Model** — Set `OPENAI_MODEL=gpt-4o` in `.env.local` for more detailed responses
- **Fallback ideas** — Edit `buildFallbackIdeas()` in `app/api/ideas/route.ts`

---

## ⚠️ Disclaimer

All AI-generated build plans are for **hobby/prototype use only**. Hardware plans involving electrical components, RF, or mechanical systems may require professional certification for commercial deployment. Always follow local safety regulations.

---

## 📄 License

MIT — use freely for personal and commercial projects.
