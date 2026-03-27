# Complete Flow: Questions → Sprints → Paragraphs

## High-Level Architecture

```
USER SEED PROMPT
       ↓
   ORIENTATION PHASE (Step: 'orienting')
       ↓
   Generate 4-6 broad questions about intent, audience, tone
       ↓
   User answers all questions
       ↓
   BLUEPRINT GENERATION (Step: 'recommending')
       ↓
   LLM creates 3-5 paragraph roadmap based on answers
       ↓
   User confirms blueprint
       ↓
   PARAGRAPH PLANNING LOOP
       │
       ├─→ PARA 1 (Step: 'paragraph_planning')
       │    ├─→ Generate broad questions (Para 1: exploratory)
       │    ├─→ User answers
       │    ├─→ SPRINT 1 PLANNING
       │    │    ├─→ Generate specific sprint questions
       │    │    ├─→ User answers 3-5 questions
       │    │    ├─→ TRIGGER SPRINT GENERATION
       │    │    │    ├─→ LLM writes 2-3 sentences
       │    │    │    ├─→ Check coherence (para 1: skip)
       │    │    │    └─→ Accept sprint
       │    │    ├─→ More questions (3-5 more)
       │    │    └─→ TRIGGER SPRINT GENERATION (Sprint 2)
       │    │         ├─→ LLM writes 2-3 sentences
       │    │         ├─→ Check coherence (para 1: skip)
       │    │         └─→ Accept sprint
       │    └─→ PARAGRAPH ASSEMBLY
       │         ├─→ Take Sprint 1 + Sprint 2
       │         ├─→ LLM stitches them into 1 cohesive paragraph
       │         └─→ Paragraph approved
       │
       ├─→ PARA 2+ (Step: 'paragraph_planning')
       │    ├─→ Generate constrained questions (Para 2+: enforce coherence)
       │    ├─→ User answers
       │    ├─→ SPRINT 1 PLANNING
       │    │    ├─→ Generate specific sprint questions
       │    │    ├─→ User answers 3-5 questions
       │    │    ├─→ TRIGGER SPRINT GENERATION
       │    │    │    ├─→ LLM writes 2-3 sentences (with established PoV in mind)
       │    │    │    ├─→ Check coherence: score against all prior approved sprints
       │    │    │    ├─→ Score < 70%?
       │    │    │    │    ├─→ Delete newest sprint from previous paras
       │    │    │    │    ├─→ Re-score this sprint
       │    │    │    │    ├─→ Repeat until score ≥ 70% OR no sprints left
       │    │    │    │    └─→ If still < 70%: FLAG FOR REWRITE (regenerate with coherence prompt)
       │    │    │    └─→ Accept sprint
       │    │    ├─→ More questions (3-5 more)
       │    │    └─→ TRIGGER SPRINT GENERATION (Sprint 2)
       │    │         └─→ Same coherence checking as Sprint 1
       │    └─→ PARAGRAPH ASSEMBLY
       │         ├─→ Same as Para 1: stitch sprints, create final paragraph
       │         └─→ Paragraph approved
       │
       └─→ (Repeat for all paragraphs in blueprint)
```

---

## Detailed Breakdown

### Phase 1: ORIENTATION (Seed → Blueprint)

**Goal**: Understand user intent before planning document structure

```typescript
// User types: "Write about why remote work is sustainable"
// System state: AppStep = 'orienting'

// 1. Generate Orientation Questions
const questions = await generateQuestions(
  session,     // { seedPrompt: "..." }
  document,    // { blueprint: null, paragraphs: [] }
  -1           // paragraphIndex = -1 (special: orientation phase)
)

// Questions generated:
// - "Who is your core reader?" (CHOICE)
// - "What's the insight they should take away?" (FREETEXT)
// - "What would change if they believed you?" (FREETEXT)
// - etc. (4-6 total, ~35% freetext, 65% choice)

// 2. User answers all questions
// answers stored in document.globalDecisions[]

// 3. Generate blueprint from answers
const blueprint = await generateBlueprint(
  seedPrompt,
  globalDecisions  // Array of { question, answer }
)

// Blueprint returned:
// {
//   paragraphRoadmap: [
//     { job: "Establish why remote work exists", depth: "structural" },
//     { job: "Show the environmental benefit", depth: "sentence_level" },
//     { job: "Address counterarguments", depth: "sentence_level" },
//     { job: "Call to action", depth: "structural" }
//   ]
// }

// Create placeholder ParagraphState for each paragraph
document.paragraphs = [
  {
    id: "para-1",
    orderIndex: 0,
    status: "placeholder",
    sprints: [],
    draftText: "",
    approvedText: ""
  },
  // ... (3 more paragraphs)
]

// AppStep → 'confirming_blueprint'
// User sees blueprint, confirms or revises
// AppStep → 'paragraph_planning'
```

---

### Phase 2: PARAGRAPH PLANNING & SPRINT GENERATION

**For each paragraph:**

```typescript
// ─ PARAGRAPH PLANNING QUESTIONS ─

const paragraphIndex = 0  // First paragraph

// Question generation with difficulty curve
const questions = await generateQuestions(
  session,
  document,
  paragraphIndex,
  sprintIndex = undefined  // undefined = paragraph planning, not sprint planning
)

// Para 1 difficulty: EXPLORATORY
// Questions generated:
// - "What's the single biggest insight in this paragraph?"
// - "Should it challenge assumptions or explain a benefit?"
// - "How much evidence should we include?"
// (Broad, open-ended, let user explore)

// Para 3+ difficulty: ENFORCING COHERENCE
// Questions generated:
// - "How does this paragraph build on Para 1-2?"
// - "Which specific claim from Para 2 are we expanding?"
// - "Should we surprise the reader or reassure them?"
// (Specific, constrained, pull toward established PoV)

// User answers questions
// Answers stored in: document.paragraphs[0].decisions[]

// ─ SPRINT 1 PLANNING ─

const sprintIndex = 0
const sprintQuestions = await generateQuestions(
  session,
  document,
  paragraphIndex,
  sprintIndex  // defined = sprint planning
)

// Sprint questions are tactical/sentence-level:
// - "What's the opening sentence? (e.g., 'Remote work emerged...')"
// - "What concrete example should we open with?"
// - "In one sentence: what's the main point of this sprint?"

// User answers 3-5 of these questions
// Answers stored in: document.paragraphs[0].sprints[0].decisions[]

// ─ TRIGGER SPRINT GENERATION ─

// After every 3-5 answers, system auto-triggers sprint generation
// (This is the "show intermediate results" feedback)

const sprintText = await generateSprint(
  session,
  document,
  paragraphIndex = 0,
  sprintIndex = 0
)

// LLM prompt includes:
// - "Based on these decisions: [answers from sprint planning]"
// - "Write 2-3 sentences that:"
// - "  1. Land the core point"
// - "  2. Include the example user chose"
// - "  3. Set up for the next sprint"
//
// Output: "Remote work emerged in the 1990s... [2-3 sentences]"

// Store draft
document.paragraphs[0].sprints[0] = {
  ...sprint,
  draftText: sprintText,
  status: "draft"
}

// ─ COHERENCE CHECKING (Para 2+) ─

if (paragraphIndex >= 1) {  // Para 2 onwards

  const coherenceResult = await scoreCoherence(
    session,
    document,
    sprintText,
    paragraphIndex
  )

  // LLM scores: "How well does this sprint align with Para 1's voice?"
  // Returns: { score: 65, reasoning: "...", conflicts: [...], suggestions: [...] }

  if (coherenceResult.score < 70) {
    // Trigger conflict resolution
    const resolution = await resolveCoherenceConflict(
      session,
      document,
      sprintText,
      paragraphIndex,
      coherenceResult.score
    )

    // If resolution.resolved = true: (retractions succeeded)
    //   Keep the sprint, it now scores ≥ 70%
    //
    // If resolution.resolved = false: (no retractions helped)
    //   FLAG FOR REWRITE: regenerate sprint with coherence guidance
  }
}

// ─ CONTINUE SPRINT PLANNING ─

// User continues answering sprint questions
// Every 3-5 more answers → trigger Sprint 2 generation

const sprintText2 = await generateSprint(
  session,
  document,
  paragraphIndex = 0,
  sprintIndex = 1
)

// Same coherence checking as Sprint 1
// (Para 1: always accepts, Para 2+: enforces 70%)

// Both sprints now in:
// document.paragraphs[0].sprints = [Sprint1, Sprint2]

// ─ PARAGRAPH ASSEMBLY ─

// Once all sprints for paragraph are approved (status = "approved")
const finalParagraph = await assembleParagraph(
  session,
  document,
  paragraphIndex = 0
)

// LLM stitches sprints:
// Input: [Sprint1.approvedText, Sprint2.approvedText]
// "Preserve every idea exactly. Only smooth transition words."
// Output: "Remote work emerged in the 1990s... [smooth connections] ...next point"

// Update paragraph
document.paragraphs[0] = {
  ...paragraph,
  approvedText: finalParagraph,
  status: "approved"
}

// ─ LOOP: PARA 2, 3, etc. ─
// Repeat entire flow for next paragraph
```

---

### Key State Transitions

```typescript
// ─ App Steps ─

'idle'
  ↓ (user submits seed)
'orienting' (asking 4-6 broad questions)
  ↓ (user answers all)
'recommending' (LLM creates blueprint)
  ↓ (user confirms blueprint)
'confirming_blueprint'
  ↓
'paragraph_planning' (asking para-level questions)
  ↓ (user answers, triggers sprint generation)
'sprint_planning' (asking sprint-level questions for Sprint 1)
  ↓ (user answers, every 3-5 answers trigger generation)
'sprint_generating'
  ↓ (LLM writes sprint + coherence check)
'sprint_generated' (show draft, wait for approval)
  ↓ (user approves)
'sprint_approved'
  ↓ (ask more sprint questions for Sprint 2)
'sprint_planning' (again, for Sprint 2)
  ↓ (repeat sprint_generating → sprint_approved)
'paragraph_assembling' (stitch 2 sprints into 1 paragraph)
  ↓ (LLM stitches)
'paragraph_generated' (show final paragraph)
  ↓ (user approves)
'paragraph_approved'
  ↓ (move to next paragraph)
'paragraph_planning' (for Para 2)
  ↓ ... (repeat for all paragraphs)
'document_assembly_ready' (all paras approved, can export)
  ↓
'completed' (user has final document)
```

---

### Sprint vs. Paragraph vs. Question Count

**Example for one paragraph:**

```
Para 1 Paragraph Planning
  Questions: "What's core claim?" "How deep?" (2-4 questions)

  Sprint 1 Planning
    Questions: (3-5 tactical questions)
      "Opening sentence?"
      "Concrete example?"
      "Main point?"
    → GENERATE SPRINT 1 (2-3 sentences)

    Questions: (3-5 more)
      "What's the bridge to Sprint 2?"
      "Should we use data here?"
    → GENERATE SPRINT 1 REFINED (if coherence < 70% and we're para 2+)

  Sprint 2 Planning
    Questions: (3-5 tactical questions)
      "Closing sentence?"
      "How does this hand off?"
    → GENERATE SPRINT 2 (2-3 sentences)

  ASSEMBLE: Sprint 1 + Sprint 2 → Final Paragraph (1 full paragraph)

Total per paragraph:
  - 2-4 paragraph planning questions
  - ~6-10 sprint questions per sprint
  - 2 sprints per paragraph
  - Total: 14-24 questions per paragraph
  - Generates: 2 sprints + 1 final paragraph
```

---

### Coherence Scoring Timeline

```
Para 1:
  Sprint 1 generated → score = 90 (para 1: always high)
  Sprint 2 generated → score = 90
  Para 1 approved with high coherence (established baseline PoV)

Para 2:
  Sprint 1 generated → score = 72 ✅ (aligned with Para 1)
  Sprint 2 generated → score = 58 ❌ (conflicts with Para 1's PoV)
    → Delete Para 1 Sprint 2
    → Re-score Para 2 Sprint 2: score = 65 ❌ (still below 70)
    → Delete Para 1 Sprint 1
    → Re-score Para 2 Sprint 2: score = 76 ✅ (now accepted, but Para 1 lost last sprint)
    → ⚠️ Para 1 needs regeneration
    → Regenerate Para 1 Sprint 2 with Para 2 context
    → Re-check coherence of new Para 1 Sprint 2: score = 82 ✅
  Para 2 now approved

Para 3:
  Questions are even more constrained (enforce PoV from Para 1-2)
  Sprint 1 generated → score = 71 ✅
  Sprint 2 generated → score = 55 ❌
    → Delete Para 2 Sprint 2, Para 2 Sprint 1, Para 1 Sprint 2
    → Still < 70?
    → REWRITE Para 3 Sprint 2 from scratch with new angle
```

---

## API Endpoints

```typescript
// ─ Generate Questions ─
POST /api/generate
{
  action: 'generate-questions',
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: 0,
  sprintIndex: 0  // optional; if omitted = paragraph planning
}
Response: { questions: QuestionCard[] }

// ─ Generate Sprint ─
POST /api/generate
{
  action: 'generate-sprint',
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: 0,
  sprintIndex: 0
}
Response: {
  text: string,
  coherence?: {
    score: number,
    resolved: boolean,
    retractionCount: number,
    reasoning: string
  }
}

// ─ Assemble Paragraph ─
POST /api/generate
{
  action: 'assemble-paragraph',
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: 0
}
Response: { text: string }

// ─ Generate Blueprint ─
POST /api/generate
{
  action: 'generate-blueprint',
  seedPrompt: string,
  orientationAnswers: Array<{ question, answer }>
}
Response: { blueprint: Blueprint }
```

---

## State Storage (Zustand)

```typescript
// ─ Session State ─
{
  seedPrompt: string,
  currentStep: AppStep,
  currentParagraphIndex: number,
  currentSprintIndex: number,
  fatigueScore: number,
  permissionLevel: 0 | 1 | 2 | 3 | 4,
  interactionHistory: InteractionNode[],
}

// ─ Document State ─
{
  blueprint: Blueprint | null,
  globalDecisions: DecisionState[],
  paragraphs: [
    {
      id: string,
      status: ParagraphStatus,
      sprints: [
        {
          id: string,
          status: SprintStatus,
          decisions: DecisionState[],
          draftText: string,
          approvedText: string,
        },
        ...
      ],
      draftText: string,
      approvedText: string,
    },
    ...
  ]
}
```

---

## Key Invariants

1. **Coherence threshold**: Score must be ≥ 70 for para 2+
2. **Retraction limit**: Max 10 backward deletions before rewrite
3. **Sprint size**: 2-3 sentences per sprint
4. **Sprints per para**: Always 2 (SPRINTS_PER_PARAGRAPH)
5. **Permission gate**: Cannot export without permission ≥ 4
6. **Para 1 leniency**: No coherence checks for first paragraph
7. **Question difficulty**: Easy (para 1-2), hard (para 3+)
8. **No approval flow yet**: Sprints auto-included if coherent
