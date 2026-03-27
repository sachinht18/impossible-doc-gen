# Contributing

## Local Setup

1. Use Node.js 22 LTS.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Set `OPENAI_API_KEY`.
5. Start development with `npm run dev`.

## Before Opening A Pull Request

Run the full local validation set:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Branch And PR Guidance

- Keep changes scoped to a single problem.
- Prefer small pull requests over large mixed changes.
- Include screenshots or short recordings for UI changes.
- Update `README.md` or `docs/deployment.md` when behavior or setup changes.
- Do not commit secrets, `.env.local`, or generated build output.

## Next.js Note

This project uses Next.js 16. When changing framework-level behavior, read the relevant guide in `node_modules/next/dist/docs/` first instead of relying on older Next.js conventions.
