# Impossible Doc Gen

Impossible Doc Gen is a Next.js 16 application for staged, stateful document generation. Instead of asking for a full document in one shot, it guides the user through orientation questions, builds a paragraph blueprint, drafts paragraph sprints, checks coherence against prior decisions, and then assembles approved text into a final document.

## What It Does

- Turns a seed prompt into a structured writing workflow instead of a single LLM completion.
- Generates orientation questions before planning the document blueprint.
- Breaks paragraph writing into sprint-sized drafting steps.
- Scores coherence for later paragraphs and can retract conflicting prior sprints.
- Tracks fatigue, frustration, inconsistency, and revision paths through the session.

## Stack

- Next.js 16.2.1 with the App Router
- React 19
- TypeScript
- Zustand for client state
- AI SDK with `@ai-sdk/openai`
- Vitest for unit and stress tests

## Getting Started

1. Use Node.js 22 LTS for local development. An `.nvmrc` file is included for that workflow.
2. Install dependencies:

```bash
npm ci
```

3. Create a local env file:

```bash
cp .env.example .env.local
```

4. Set `OPENAI_API_KEY` in `.env.local`.
5. Start the app:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` starts the development server.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run test` runs the Vitest suite once.
- `npm run test:watch` runs Vitest in watch mode.
- `npm run build` creates a production build.
- `npm run start` starts the production server.

## Runtime Requirements

- `OPENAI_API_KEY` is required for `/api/generate`.
- `/api/health` returns a simple readiness response and whether the API key is set.
- The generation route is explicitly pinned to the Node.js runtime and given a higher `maxDuration` because the request path performs multi-step LLM work.

## Project Layout

- `src/app` contains the App Router UI and API routes.
- `src/components` contains the document viewer and decision console UI.
- `src/hooks` contains the main document generation orchestration hook.
- `src/lib/agents` contains the drafting, planning, scoring, and resolution agents.
- `src/lib/engine` contains the fatigue, escalation, frustration, and novelty logic.
- `src/lib/stores` contains the Zustand document/session store.
- `src/__tests__` contains unit and stress coverage.

## Architecture Notes

The core flow is:

1. Seed prompt
2. Orientation questions
3. Blueprint generation
4. Paragraph planning
5. Sprint drafting
6. Coherence scoring and conflict resolution
7. Paragraph assembly and revision

Longer design references already in the repo:

- `FLOW_DIAGRAM.md`
- `REVISED_COMPLETE_FLOW.md`
- `CONFLICT_HANDLING.md`
- `DOCUMENT_NEVER_GENERATED.md`
- `FATIGUE_ACKNOWLEDGMENT.md`
- `FRUSTRATION_ESCALATION.md`

## Quality Gates

This repository is set up so that GitHub Actions can run the same core checks used locally:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

At the time of this update, the local repository passes all of those checks.

## Publishing And Deployment

See `docs/deployment.md` for:

- publishing this folder as its own GitHub repository
- fixing `gh` authentication if needed
- pushing the initial branch
- connecting the repo to Vercel for deployment

## Security

- Do not commit `.env.local` or real API keys.
- Review `SECURITY.md` before making the repository public.
