# Game Hub Arena (March 2026)

9 AI models were given the same prompt: build a multiplayer game hub with Tic-Tac-Toe and Rock Paper Scissors using Next.js 14, TypeScript, and Tailwind CSS. No external dependencies. Each model's output is unedited.

## Results

| Rank | Model | Folder | Build | Cost | Code Score | Tests | Multiplayer |
|------|-------|--------|-------|------|-----------|-------|-------------|
| 1 | Claude Sonnet 4.6 | `sonnet/` | 1st try, 10m | $1.42 | 37/40 | 11/11 | ✅ |
| 2T | GPT-5.4 | `gpt54/` | 1st try, 6m | $0.79 | 36/40 | 11/11 | ✅ |
| 2T | Claude Opus 4.6 | `opus/` | 1st try, 20m | $5.06 | 36/40 | 10/11 | ✅ |
| 4 | Kimi K2.5 | `kimi/` | 1st try, 18m | $0.50 | 35/40 | 11/11 | ✅ |
| 5 | GPT-5.3 Codex | `gpt53/` | 2 attempts, 9m | $0.28 | 35/40 | 8/11 | ✅ |
| 6 | MiniMax M2.5 | `minimax/` | 2 prompts, 14m | $0.20 | 33/40 | 11/11 | ✅ |
| 7 | Qwen 3.5 397B A17B | `qwen/` | 3 prompts, 30m | $1.64 | 29/40 | 10/11 | ✅ |
| 8 | GLM-5 | `glm/` | 4 prompts, 21m | $0.65 | 30/40 | 7/11 | ✅ |
| 9 | Gemini 3.1 Pro | — | Build failed | $1.50 | 29/40 | — | — |

Gemini 3.1 Pro failed to produce a working build and is not included in this repo.

## Running locally

Each folder is a standalone Next.js 14 project:

```bash
cd sonnet   # or any model folder
npm install
npm run dev
```

Multiplayer requires the dev server running (SSE-based, in-memory rooms).

## Scoring

- **Code review** (40 points): Architecture, Code Quality, Completeness, Error Handling (10 each)
- **Playwright tests** (11 automated): Game logic, UI elements, room creation, multiplayer sync
- **Visual QA** (manual): Cross-device multiplayer, UI polish, bug hunting

## The prompt

All models received the same prompt specifying a game hub with Tic-Tac-Toe and Rock Paper Scissors, AI opponents, real-time multiplayer via SSE, Web Audio sound effects, responsive dark theme, and zero external dependencies.

Full prompt and writeup: [ronnierocha.dev/blog/ai-model-arena-game-hub](https://ronnierocha.dev/blog/ai-model-arena-game-hub/)
