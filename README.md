# Model Arena

Same prompt. Different AI models. Real results.

Each test in this repo gives frontier AI models an identical coding challenge and compares what they build, unedited.

## Tests

### [Game Hub (March 2026)](./game-hub-2026-03/)

9 models were given the same prompt: build a multiplayer game hub with Tic-Tac-Toe and Rock Paper Scissors using Next.js 14, TypeScript, and Tailwind CSS.

| Rank | Model | Code Score | Tests | Cost |
|------|-------|-----------|-------|------|
| 1 | Claude Sonnet 4.6 | 37/40 | 11/11 | $1.42 |
| 2T | GPT-5.4 | 36/40 | 11/11 | $0.79 |
| 2T | Claude Opus 4.6 | 36/40 | 10/11 | $5.06 |
| 4 | Kimi K2.5 | 35/40 | 11/11 | $0.50 |
| 5 | GPT-5.3 Codex | 35/40 | 8/11 | $0.28 |
| 6 | MiniMax M2.5 | 33/40 | 11/11 | $0.20 |
| 7 | Qwen 3.5 397B A17B | 29/40 | 10/11 | $1.64 |
| 8 | GLM-5 | 30/40 | 7/11 | $0.65 |
| 9 | Gemini 3.1 Pro | 29/40 | — | $1.50 |

**Full writeup:** [ronnierocha.dev/blog/ai-model-arena-game-hub](https://ronnierocha.dev/blog/ai-model-arena-game-hub/)

## Structure

```
model-arena/
├── game-hub-2026-03/     # First test: multiplayer game hub
│   ├── sonnet/           # Claude Sonnet 4.6
│   ├── gpt54/            # GPT-5.4
│   ├── opus/             # Claude Opus 4.6
│   ├── kimi/             # Kimi K2.5
│   ├── gpt53/            # GPT-5.3 Codex
│   ├── minimax/          # MiniMax M2.5
│   ├── qwen/             # Qwen 3.5 397B A17B
│   └── glm/              # GLM-5
├── [future-test]/        # Next arena test
└── README.md
```

Each model folder contains the complete, unedited source code the model generated. `npm install && npm run dev` to run any of them locally.

## Author

[Ronnie Rocha](https://ronnierocha.dev)
