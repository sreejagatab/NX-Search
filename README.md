# nx-search

Standalone semantic search UI over [NeuronX](https://neuronx.jagatab.uk) — 257K learned patterns, 210K FAISS vectors, 16 domains.

## Setup

```bash
cp .env.example .env
# Fill in VITE_NEURONX_API_KEY in .env

npm install
npm run dev        # http://localhost:3002
```

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve dist/ locally
```

## Test

```bash
npm test           # run all tests (Vitest)
npm run test:watch # watch mode
```

## Docker

```bash
# Build and run
docker compose up --build

# Or with explicit env
VITE_NEURONX_API_KEY=your_key docker compose up --build
```

The app runs on **port 3002**.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_NEURONX_API_URL` | No | API base URL (default: `https://neuronx.jagatab.uk`) |
| `VITE_NEURONX_API_KEY` | Yes | API key sent as `X-API-Key` header |

## Features

- **Two search modes**: Semantic (FAISS vector) and Pattern (keyword)
- **Domain filters**: All 16 NeuronX knowledge domains
- **Ask Brain**: Streams a Brain 72B answer using top 5 results as context (SSE)
- **URL state sync**: `?q=query&domain=python&mode=semantic` — shareable links
- **Keyboard shortcuts**: `/` to focus search, `Escape` to clear, `Enter` to search
- **Autocomplete**: Suggestions from `/api/search/suggest`
- **Recent searches**: Last 10 queries stored in localStorage
- **Dark theme**: `#0a0a0a` bg, `#1a1a1a` cards, amber `#d4a84b` accents
