# Impossible Doc Gen

**A working parody of AI writing software that becomes more responsible, more interactive, and less capable of producing the thing you asked for.**

Impossible Doc Gen looks like a serious document-generation product. It asks clarifying questions, builds a structured blueprint, drafts in controlled sprints, scores coherence, detects inconsistency, tracks fatigue, escalates frustration, and keeps tightening the process as you go.

It does everything except let you leave with a finished document.

That is not a bug. That is the thesis.

## Why This Repo Exists

Most AI writing tools promise leverage, then quietly turn the user into the project manager. Every extra safeguard sounds reasonable on its own:

- ask a few more questions
- verify the direction
- enforce coherence
- slow down contradictions
- detect fatigue
- intervene when the user gets sloppy

Stack enough of those "reasonable" moves together and you get something absurd: a system that optimizes for process quality so aggressively that outcome delivery becomes secondary, then unreachable, then almost irrelevant.

This repo turns that failure mode into a real product experience.

## What Makes It Interesting

This is not a fake landing page and it is not a one-note joke. The parody is implemented in code:

- a real multi-step App Router application
- a stateful writing flow with orientation, blueprinting, planning, sprint drafting, approval, and revision
- coherence scoring that can retract earlier work when later ideas conflict
- fatigue detection that changes how the system behaves as the user gets worn down
- frustration tracking that changes the system's tone when conflict repeats
- permission and flow constraints that make "just give me the document" structurally difficult

The result is satire with architecture behind it.

## The Joke, Precisely

Impossible Doc Gen is a machine for showing what happens when an AI system is optimized for safety, structure, and intervention more than usefulness.

It satirizes:

- AI tools that claim to write for you but require constant supervision
- permission systems that imply progress while withholding the only thing you came for
- products that confuse "more workflow" with "more value"
- the creeping belief that if a system is sufficiently careful, it is therefore sufficiently good

The repo is funny if you read it as product critique.
It is more interesting if you read it as a warning.

## If You Want To Build Your Own Version

This is the part that should provoke builders.

If your reaction is, "I could make this actually useful," that is the right reaction. Fork it and prove it.

Questions worth testing:

- How many safeguards can you keep before the user experience collapses?
- Which constraint creates the biggest trust failure: coherence gates, permission gates, or endless clarification?
- At what point does "helpful steering" become disguised refusal?
- Can you preserve rigor without turning the user into unpaid middleware?

If you want a double push, here it is:

- clone this because the implementation is real
- challenge it because the worldview is intentionally hostile

The best follow-up to this repo is not admiration. It is a sharper version built by someone who disagrees with it.

## What It Does Technically

- Turns a seed prompt into a structured writing workflow instead of a single LLM completion.
- Generates orientation questions before planning the document blueprint.
- Breaks paragraph writing into sprint-sized drafting steps.
- Scores coherence for later paragraphs and can retract conflicting prior sprints.
- Tracks fatigue, frustration, inconsistency, and revision paths through the session.
- Exposes API routes for generation and health checks.

## Stack

- Next.js 16.2.1 with the App Router
- React 19
- TypeScript
- Zustand for client state
- AI SDK with `@ai-sdk/openai`
- Vitest for unit and stress tests

## Getting Started

1. Use Node.js 22 LTS for local development. An `.nvmrc` file is included.
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
- `/api/health` returns a readiness response and whether the API key is set.
- The generation route is pinned to the Node.js runtime and given a higher `maxDuration` because it performs multi-step LLM work.

## Project Layout

- `src/app` contains the App Router UI and API routes.
- `src/components` contains the document viewer and decision console UI.
- `src/hooks` contains the main document generation orchestration hook.
- `src/lib/agents` contains the drafting, planning, scoring, and resolution agents.
- `src/lib/engine` contains the fatigue, escalation, frustration, and novelty logic.
- `src/lib/stores` contains the Zustand document and session store.
- `src/__tests__` contains unit and stress coverage.

## Deeper Reading

The repo already includes design docs that explain the joke and the mechanics in more detail:

- `DOCUMENT_NEVER_GENERATED.md`
- `FLOW_DIAGRAM.md`
- `REVISED_COMPLETE_FLOW.md`
- `CONFLICT_HANDLING.md`
- `FATIGUE_ACKNOWLEDGMENT.md`
- `FRUSTRATION_ESCALATION.md`

## Quality Gates

This repository is set up so GitHub Actions can run the same checks used locally:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Publishing And Deployment

See `docs/deployment.md` for GitHub publishing and Vercel deployment guidance.

## Security

- Do not commit `.env.local` or real API keys.
- Review `SECURITY.md` before making the repository public.
