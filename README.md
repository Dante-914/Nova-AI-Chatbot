# Nova — AI Chat Assistant

A Gemini-powered chatbot built with React (Vite) and a Netlify serverless
function, so the API key never reaches the browser.

## Stack

- **Frontend:** React + Vite
- **Backend:** Netlify Function (`netlify/functions/chat.js`)
- **Model:** Gemini 2.5 Flash via the Google Gemini API (free tier, no card required)

## Local setup

1. Install dependencies:
   ```
   npm install
   npm install -g netlify-cli
   ```
2. Copy `.env.example` to `.env` and add your Gemini API key
   (get one free at https://aistudio.google.com/app/apikey — sign in with
   any Google account, no credit card needed).
3. Run both the frontend and the function together:
   ```
   netlify dev
   ```
   This starts Vite *and* the serverless function on one local server so
   `/api/chat` resolves correctly. (Running `npm run dev` alone will start
   the frontend but the function won't be available.)

## Deploying to Netlify

1. Push this project to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
   Build command and publish directory are already set in `netlify.toml`.
3. Go to **Site settings → Environment variables** and add:
   - `GEMINI_API_KEY` = your key
4. Deploy. Your chatbot will be live at `your-site.netlify.app`.

## Project structure

```
├── src/
│   ├── App.jsx              # Layout, chat state, send logic
│   ├── App.css               # Styling
│   ├── components/
│   │   ├── ChatWindow.jsx    # Scrollable message list
│   │   └── MessageBubble.jsx # Single message bubble
├── netlify/functions/
│   └── chat.js                # Server-side proxy to the Gemini API
├── netlify.toml                # Build + redirect config
└── .env.example
```

## About the free tier

Gemini's free tier (via Google AI Studio) doesn't expire and needs no card,
but it's rate-limited (currently in the tens of requests per minute and low
thousands per day — check https://ai.google.dev/gemini-api/docs/rate-limits
for current numbers, since limits change). Fine for a portfolio demo; if it
ever gets hit hard, `chat.js` is the only file you'd need to touch to move
to a different provider.

## Ideas for extending this

- **Streaming responses** — Gemini's API supports `streamGenerateContent`;
  right now this scaffold waits for the full reply, which is simpler and
  more reliable but less snappy-feeling than streaming.
- **Conversation persistence** — save chat history to `localStorage` so a
  refresh doesn't lose it.
- **Rate limiting** — add a basic per-IP limit in the function if you make
  this public, so one visitor can't burn through your free-tier quota.
- **System prompt customization** — let visitors pick a "personality" for
  Nova, or scope it to answer questions about your portfolio specifically.

## Security note

The API key lives only in the Netlify environment variable and is read
server-side in `chat.js`. It is never sent to or exposed in the browser
bundle. Don't add `VITE_` prefixes to the key — anything prefixed `VITE_`
gets bundled into client-side JS.

