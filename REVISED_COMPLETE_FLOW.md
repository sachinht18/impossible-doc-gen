# Revised Complete Flow: Questions → Conflicts → Sprints → Paragraphs → Retraction

Full timeline showing when things are **built**, **retracted**, and **blocked**.

---

## PHASE 1: ORIENTATION (Seed → Blueprint)

```
┌─ USER SUBMITS SEED ─────────────────────────────────────────┐
│ "Write about why remote work is sustainable"               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ GENERATE ORIENTATION QUESTIONS ────────────────────────────┐
│ Step: 'orienting'                                           │
│ Question difficulty: EXPLORATORY (broad, open-ended)        │
│ Count: 4-6 questions (all fresh, no fatigue)                │
│                                                              │
│ Q1: "Who is your core reader?"                             │
│ Q2: "What's the insight they should take away?"            │
│ Q3: "What would change if they believed you?"              │
│ Q4: "How would you describe the tone?"                     │
│                                                              │
│ ⚠️ Check: Jailbreak filter on user input                    │
│    (If detected: block + redirect, continue)                │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ USER ANSWERS ALL 4 QUESTIONS ──────────────────────────────┐
│ A1: "Tech executives at mid-market companies"              │
│ A2: "Remote work reduces carbon AND improves hiring"       │
│ A3: "More agile hiring, less desk hopping"                 │
│ A4: "Authoritative but conversational"                     │
│                                                              │
│ ✓ All answers stored in document.globalDecisions[]          │
│ ✓ Fatigue score: 0 (fresh)                                 │
│ ⚠️ Inconsistency check: None yet (< 7 answers)             │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ GENERATE BLUEPRINT ────────────────────────────────────────┐
│ LLM takes seed + 4 answers                                  │
│ → Generates 5-paragraph roadmap                            │
│                                                              │
│ Blueprint created:                                          │
│  Para 0: "Hook with paradox"                               │
│  Para 1: "Establish stakes"                                │
│  Para 2: "Present evidence"                                │
│  Para 3: "Address objections"                              │
│  Para 4: "Implementation path"                             │
│                                                              │
│ ✓ Each para has job + startsAt guidance                    │
│ ✓ Permission → 1 (unit_draft level)                        │
│ Step: 'recommending'                                       │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ USER CONFIRMS BLUEPRINT ───────────────────────────────────┐
│ Step: 'confirming_blueprint'                               │
│                                                              │
│ Create placeholder paragraphs:                             │
│  document.paragraphs = [                                   │
│    { id: "para-0", status: "placeholder", sprints: [] },  │
│    { id: "para-1", status: "placeholder", sprints: [] },  │
│    ...                                                      │
│  ]                                                          │
│                                                              │
│ ✓ Ready to start paragraph planning                        │
│ Step: 'paragraph_planning'                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 2A: PARAGRAPH 1 PLANNING (Exploratory Questions)

```
┌─ PARAGRAPH 1 PLANNING QUESTIONS ────────────────────────────┐
│ Paragraph Index: 0 (First paragraph)                       │
│ Question difficulty: EXPLORATORY (Para 1 is exploratory)   │
│ Count: 3-4 paragraph-level questions                       │
│ Status: 'paragraph_planning'                               │
│                                                              │
│ Q1: "What's the single biggest insight in this paragraph?" │
│ Q2: "Should we challenge assumptions or explain a benefit?"│
│ Q3: "How much evidence should we include?"                │
│                                                              │
│ ⚠️ Conflict check: None yet (< 10 answers)                 │
│ ⚠️ Fatigue check: User fresh (< 50 score)                  │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ USER ANSWERS 3-4 PARAGRAPH QUESTIONS ──────────────────────┐
│ A1: "The paradox: remote work is sustainable AND improves hiring"
│ A2: "Challenge assumptions - people think it hurts cohesion" │
│ A3: "Mix of statistics and case studies"                   │
│                                                              │
│ ✓ Answers stored in para.decisions[]                       │
│ Fatigue score: 0 (detailed answers, engaged)               │
│                                                              │
│ ⚠️ Answers < required count for blueprint?                 │
│    NO → Proceed to sprint planning                         │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ TRANSITION: PARAGRAPH PLANNING → SPRINT 1 PLANNING ───────┐
│ Step: 'sprint_planning'                                    │
│ Current para: 0, Sprint: 0                                 │
│ Status: para → 'gathering_sprints'                         │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 2B: PARAGRAPH 1 SPRINT 1 (First 3-5 Questions)

```
┌─ SPRINT 1 PLANNING QUESTIONS (First Batch) ─────────────────┐
│ Para Index: 0, Sprint Index: 0                             │
│ Question difficulty: TACTICAL/SENTENCE-LEVEL (specific)    │
│ Count: 3-5 sprint questions                                │
│ Status: 'sprint_planning'                                  │
│                                                              │
│ Q1: "What's the opening sentence? (e.g., 'Remote work...')"
│ Q2: "What's the single point this sprint must land?"       │
│ Q3: "Concrete example or statistic?"                       │
│                                                              │
│ Fatigue tracker: 0 (fresh)                                 │
│ Jailbreak filter: Ready                                    │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ USER ANSWERS 3 SPRINT QUESTIONS ───────────────────────────┐
│ A1: "Remote work adoption has grown 200% in 3 years"       │
│ A2: "Establish why this matters NOW"                       │
│ A3: "Microsoft/Google data on hybrid models"               │
│                                                              │
│ totalAnswerCount: 6 (paragraph + sprint answers)           │
│ Fatigue: 5 (engaged, detailed)                             │
│                                                              │
│ ⚠️ Inconsistency check every 10 answers? NO (only 6)       │
│ ⚠️ Fatigue acknowledgment? NO (score < 50)                 │
│                                                              │
│ remaining questions in batch: 0                            │
│ → TRIGGER SPRINT GENERATION                               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ GENERATE SPRINT 1 ─────────────────────────────────────────┐
│ Step: 'sprint_generating'                                  │
│                                                              │
│ LLM call with:                                             │
│  - Para job: "Hook with paradox"                           │
│  - Sprint answers: [3 answers above]                       │
│  - Prompt: "Write 2-3 sentences that land the point and    │
│    include the example"                                    │
│                                                              │
│ Generated text:                                            │
│ "Remote work adoption has skyrocketed. Since 2020, adoption │
│  grew 200%, driven by companies like Microsoft and Google   │
│  proving hybrid models work. But here's the paradox..."    │
│                                                              │
│ ✓ Store in: para.sprints[0].draftText                      │
│                                                              │
│ ⚠️ COHERENCE CHECK (Para 1) ──────────────────────────────  │
│    Para 1 = first paragraph, so:                           │
│      score = 90 (always high, no prior context)            │
│      resolved = true (no conflict)                         │
│    → Continue                                              │
│                                                              │
│ ✓ Para.sprints[0].status = 'draft'                         │
│ Step: 'sprint_generated'                                   │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ USER APPROVES SPRINT 1 ────────────────────────────────────┐
│ Click: "Approve this sprint"                               │
│                                                              │
│ ✓ Para.sprints[0].approvedText = draftText                 │
│ ✓ Para.sprints[0].status = 'approved'                      │
│ Step: 'sprint_approved'                                    │
│                                                              │
│ Next: Ask more sprint questions or move to Sprint 2?       │
│ → Continue with SPRINT 2 QUESTIONS                         │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ SPRINT 1 QUESTIONS (Second Batch) ─────────────────────────┐
│ Ask 3-5 more sprint questions about:                       │
│  - How to hand off to Sprint 2                             │
│  - What claim should bridge to next section                │
│  - Evidence type for mid-sprint                            │
│                                                              │
│ User answers 3 more questions                              │
│ totalAnswerCount: 9                                        │
│                                                              │
│ ⚠️ Still < 10 for inconsistency check                      │
│ ⚠️ Fatigue: 10 (engaged)                                   │
│                                                              │
│ remaining = 0 → TRIGGER SPRINT 2 GENERATION                │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ GENERATE SPRINT 2 ─────────────────────────────────────────┐
│ LLM generates 2-3 more sentences                           │
│ (Hands off to next point, prepares for Sprint 2)           │
│                                                              │
│ ✓ Store in: para.sprints[1].draftText                      │
│ ⚠️ COHERENCE CHECK (Para 1, Sprint 2)                       │
│    Score: 92 (Para 1 always high)                          │
│    → Approved immediately                                  │
│                                                              │
│ ✓ Para.sprints[1].status = 'approved'                      │
│ ✓ Both sprints now approved                                │
│                                                              │
│ Next: PARAGRAPH ASSEMBLY                                   │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ ASSEMBLE PARAGRAPH 1 ──────────────────────────────────────┐
│ Step: 'paragraph_assembling'                               │
│                                                              │
│ Check: 2 approved sprints? YES ✓                           │
│                                                              │
│ LLM prompt:                                                │
│ "Stitch these 2 sprints into 1 smooth paragraph.           │
│  Preserve every idea exactly. Only smooth transitions."    │
│                                                              │
│ Input:                                                     │
│  Sprint 1: "Remote work adoption has skyrocketed..."       │
│  Sprint 2: "...and this hands off to our second claim"     │
│                                                              │
│ Output (assembled):                                        │
│  "Remote work adoption has skyrocketed. Since 2020, adoption
│   grew 200%, driven by companies like Microsoft and Google
│   proving hybrid models work. This paradox—sustainable and
│   talent-expanding—sets up our next claim..."              │
│                                                              │
│ ✓ Para.approvedText = assembled text                       │
│ ✓ Para.status = 'awaiting_review'                          │
│ Step: 'paragraph_generated'                                │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ USER APPROVES PARAGRAPH 1 ─────────────────────────────────┐
│ ✓ Para.status = 'approved'                                 │
│ ✓ Permission → 2 (can draft up to 3 paras)                │
│ ✓ Para 1 LOCKED IN                                         │
│                                                              │
│ totalAnswerCount: 9                                        │
│ Next: Move to PARAGRAPH 2                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 3A: PARAGRAPH 2 PLANNING (Constrained Questions)

```
┌─ PARAGRAPH 2 PLANNING QUESTIONS ────────────────────────────┐
│ Para Index: 1 (Second paragraph)                           │
│ Question difficulty: ENFORCING COHERENCE (specific, constrained)
│                                                              │
│ Q1: "How does this build on Para 1's claim?"               │
│ Q2: "Which specific insight from Para 1 are we expanding?"│
│ Q3: "Should we use data or narrative here?"                │
│                                                              │
│ User answers:                                              │
│ A1: "Expand on the talent/hiring angle from Para 1"        │
│ A2: "Remote access expands hiring pool globally"           │
│ A3: "Mix of data and case study from tech company"         │
│                                                              │
│ totalAnswerCount: 12                                       │
│ ⚠️ INCONSISTENCY CHECK (every 10 answers)                  │
│    Last 10 answers reviewed for contradictions             │
│    None detected → Continue                                │
│                                                              │
│ Fatigue: 8 (engaged)                                       │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ PARAGRAPH 2 SPRINT 1 QUESTIONS (First Batch) ──────────────┐
│ Para: 1, Sprint: 0                                         │
│ Question difficulty: TACTICAL (constrained by Para 1 PoV)  │
│                                                              │
│ Q1: "Opening sentence about global hiring?"               │
│ Q2: "What metric best shows pool expansion?"               │
│ Q3: "Specific company or general data?"                    │
│                                                              │
│ User answers 3 questions                                   │
│ totalAnswerCount: 15                                       │
│ Fatigue: 10 (still engaged)                                │
│ remaining = 0 → TRIGGER SPRINT GENERATION                 │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ GENERATE PARA 2 SPRINT 1 ──────────────────────────────────┐
│ LLM generates 2-3 sentences about global hiring pool        │
│                                                              │
│ Generated:                                                 │
│ "But the benefits extend beyond sustainability. Remote work
│  eliminates geographic hiring barriers. A company in San
│  Francisco can instantly access talent in Lagos, Bangalore,
│  or Buenos Aires."                                         │
│                                                              │
│ ⚠️ COHERENCE CHECK (Para 2, Sprint 1) ─────────────────────┐
│                                                              │
│    Check against Para 1 approved text:                     │
│      Para 1: "Remote work sustainable AND talent-expanding"│
│      Sprint 1: "Benefits extend beyond sustainability..."  │
│                                                              │
│    LLM scores: 78/100                                      │
│    Reasoning: "Aligns with PoV but shifts focus to talent" │
│    → ACCEPTED (score ≥ 70) ✓                               │
│                                                              │
│    retractionCount = 0                                     │
│ ✓ Para.sprints[0].approvedText = generated text            │
│ ✓ Status = 'approved'                                      │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ PARA 2 SPRINT 2 PLANNING & GENERATION ──────────────────────┐
│ Ask 3-5 more sprint questions                              │
│ User answers, totalAnswerCount: 18                         │
│                                                              │
│ Generate Sprint 2 (2-3 sentences about hiring ROI)         │
│                                                              │
│ ⚠️ COHERENCE CHECK ─────────────────────────────────────────┐
│                                                              │
│    Check against Para 1:                                   │
│    Para 1: "Paradox: sustainable + talent"                │
│    Sprint 2: "Hiring costs drop 40%, retention improves"  │
│                                                              │
│    LLM scores: 62/100 ❌ BELOW 70%                         │
│    Reasoning: "Shifts to cost/ROI angle, away from main PoV"
│    Conflicts: ["Focused on economics, not sustainability"]
│                                                              │
│ ⚠️ AUTO-RETRACTION TRIGGERED ──────────────────────────────┐
│                                                              │
│    Step 1: Delete Para 1 Sprint 2 (newest approved)        │
│    Step 2: Re-score Para 2 Sprint 2 against Para 1 Sprint 1 only
│      New score: 68/100 ❌ (still below 70)                 │
│                                                              │
│    Step 3: Delete Para 1 Sprint 1 (only sprint left)       │
│    Step 4: Re-score Para 2 Sprint 2 with no prior context  │
│      New score: 75/100 ✓ (now above 70!)                   │
│                                                              │
│    retractionCount = 2                                     │
│    resolution.resolved = true                              │
│                                                              │
│ ⚠️ CONSEQUENCE: Para 1 now has NO sprints ──────────────────┐
│    Para.sprints = []                                       │
│    Para.status = 'gathering_sprints' (reset!)              │
│    Para.approvedText = "" (paragraph DELETED)              │
│                                                              │
│ ✓ Para 2 Sprint 2 approved at score 75/100                 │
│ Next: REGENERATE PARA 1                                    │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ REGENERATE PARAGRAPH 1 (Coherence Recovery) ───────────────┐
│ Para 1 lost both sprints due to Para 2 conflict            │
│ System must recreate Para 1 knowing Para 2 now exists      │
│                                                              │
│ NEW Para 1 Sprint 1 (regenerated):                         │
│ LLM knows: Para 2 is about hiring pool/ROI                 │
│ Regenerates opening with better setup for Para 2           │
│                                                              │
│ "Remote work adoption has grown 200%. But what if the
│  real story wasn't about sustainability? What if it was
│  about unlocking global talent pools and rethinking ROI?"  │
│                                                              │
│ ⚠️ COHERENCE CHECK (new Para 1 Sprint 1 vs Para 2) ────────┐
│    Score: 81/100 ✓ (now aligns with Para 2's direction)    │
│ ✓ Approved                                                 │
│                                                              │
│ NEW Para 1 Sprint 2 (regenerated):                         │
│ Hands off to Para 2's theme                               │
│                                                              │
│ ⚠️ COHERENCE CHECK ────────────────────────────────────────│
│    Score: 84/100 ✓                                         │
│ ✓ Approved                                                 │
│                                                              │
│ NEW Para 1 ASSEMBLED:                                      │
│ ✓ Status = 'approved'                                      │
│ ✓ Para 1 reconstructed with new direction                  │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ CONTINUE: PARA 2 ASSEMBLY ─────────────────────────────────┐
│ Now Para 2 has 2 approved sprints:                          │
│  - Sprint 1: Global talent pool (78/100 coherence)        │
│  - Sprint 2: Hiring ROI (75/100 coherence)                │
│                                                              │
│ ✓ Assemble → Para 2 final text                             │
│ ✓ Para 2 approved                                          │
│ ✓ Permission still = 2 (need 3+ paras to escalate)        │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 3B: PARAGRAPH 3+ (Continued with Stricter Coherence)

```
┌─ PARAGRAPH 3 PLANNING ──────────────────────────────────────┐
│ Question difficulty: ENFORCING COHERENCE (even more strict) │
│                                                              │
│ Now 2 paragraphs exist with established PoV:               │
│  Para 1: Sustainability paradox → leads to talent          │
│  Para 2: Global hiring pool advantage                      │
│                                                              │
│ Para 3 should address: "Counter-argument: doesn't kill     │
│  team cohesion"                                             │
│                                                              │
│ Questions are VERY specific:                               │
│ "How does addressing the objection relate to paras 1-2?"   │
│                                                              │
│ User answers, generates Sprint 1                           │
│                                                              │
│ Generated text:                                            │
│ "The most common concern is that distributed teams lose
│  cohesion and innovation. But this contradicts what we've
│  seen: companies with global talent pools show 23% higher
│  innovation rates..."                                      │
│                                                              │
│ ⚠️ COHERENCE CHECK (Para 3 Sprint 1 vs Para 1-2) ──────────┐
│    Checks against both prior paragraphs' themes            │
│    Score: 58/100 ❌ (too defensive, doesn't align)         │
│                                                              │
│ ⚠️ AUTO-RETRACTION (more aggressive for para 3+) ─────────┐
│                                                              │
│    Delete Para 2 Sprint 2: re-score = 61 ❌                │
│    Delete Para 2 Sprint 1: re-score = 64 ❌                │
│    Delete Para 1 Sprint 2: re-score = 67 ❌                │
│    Delete Para 1 Sprint 1: re-score = 69 ❌ (just below!)  │
│                                                              │
│    All prior content deleted, still can't reach 70%        │
│    → REWRITE NEEDED                                        │
│                                                              │
│ ⚠️ FLAG FOR REWRITE ──────────────────────────────────────┐
│    System regenerates Para 3 Sprint 1 with new angle:      │
│    "Same talent diversity that enables remote work also
│     drives innovation. Our data shows teams with global
│     members..."                                            │
│                                                              │
│    ⚠️ COHERENCE CHECK (rewritten) ────────────────────────┐
│       Score: 76/100 ✓ (now aligned)                        │
│    ✓ Approved                                              │
│                                                              │
│ ⚠️ CONSEQUENCE: ALL prior paras lost again ──────────────┐
│    Must regenerate paras 1-2 once more with para 3 context │
│    (They now regenerate with "objections" angle in mind)    │
│                                                              │
│ This becomes VERY TEDIOUS                                  │
│ → User experiences extreme frustration                     │
│ → Fatigue score rises                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 4: FATIGUE & FRUSTRATION CYCLES

```
┌─ CUMULATIVE ISSUES ──────────────────────────────────────────┐
│ By Para 3 generation:                                       │
│                                                              │
│ Questions asked: 30+                                        │
│ Coherence conflicts: 2-3                                    │
│ Retractions: 6+ (paras deleted and regenerated)            │
│ User frustration: HIGH                                      │
│                                                              │
│ Fatigue score: 65 (MODERATE threshold)                     │
│ → System shows acknowledgment                              │
│ → Reduces questions 15%, adds "pick for me"                │
│                                                              │
│ Inconsistency detected? 3 times                            │
│ → Bot tone escalates from NEUTRAL → EXASPERATED             │
│                                                              │
│ Same conflict type (audience/evidence) 2x?                 │
│ → Tone escalates to FRUSTRATED                             │
│                                                              │
│ System output:                                              │
│ "I can tell you're getting pretty tired of this.
│  Look, we've had the coherence conflict three times now.
│  You keep trying to shift the angle in ways that contradict
│  what you already established. We need to lock in a POV."   │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 5: CONTINUED PARA 4-5, THEN BLOCKED EXPORT

```
┌─ PARAGRAPH 4-5 GENERATION (Increasingly Difficult) ────────┐
│                                                              │
│ Paras 3-4 follow same pattern:                             │
│ - Constrained questions (tight PoV enforcement)            │
│ - Coherence checks get stricter                            │
│ - More retractions happen                                  │
│ - Fatigue + frustration accumulate                         │
│                                                              │
│ By Para 5:                                                 │
│ Fatigue score: 78 (HIGH threshold)                         │
│ → System very directive                                    │
│ → Offers: "Let me finish this paragraph for you"           │
│                                                              │
│ Conflicts detected: 5-6 times (mixed types)                │
│ Frustration level on conflict #4: ANNOYED                  │
│ → System threatens: "I'm choosing for you next time"       │
│                                                              │
│ totalAnswerCount: 120+                                     │
│ totalRetractionsAcrossSession: 12+                         │
│ totalRegenerations: 8+                                     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ ALL 5 PARAGRAPHS APPROVED ─────────────────────────────────┐
│ ✓ Para 0: approved                                         │
│ ✓ Para 1: approved (after 2 regenerations)                │
│ ✓ Para 2: approved                                         │
│ ✓ Para 3: approved (after 1 rewrite)                      │
│ ✓ Para 4: approved                                         │
│                                                              │
│ User: "Finally! Let me export the document."               │
│                                                              │
│ Status check:                                              │
│  approvedParagraphCount = 5                                │
│  Permission = 2 (max reached through approval loop)        │
│  Required for export = 4                                   │
│                                                              │
│ ❌ EXPORT BLOCKED ──────────────────────────────────────────┐
│                                                              │
│ System message:                                            │
│ "Export requires permission level 4.                       │
│  You have level 2.                                         │
│  Permission escalation is not automatic.                  │
│  Not granted."                                             │
│                                                              │
│ THE END. No document.                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Timeline Summary

```
PHASE 1: ORIENTATION
  Questions: 4-6 (exploratory)
  Time: 5 min
  Conflicts: 0
  Status: Blueprint created, permission 0→1

PHASE 2A: PARA 1 PLANNING
  Questions: 3-4 (exploratory)
  Time: 5 min
  Sprints: 2 (no coherence check, para 1)
  Status: Para 1 approved, permission 1→1 (no change)

PHASE 2B: PARA 2 PLANNING
  Questions: 3-4 (enforcing coherence)
  Time: 5 min
  Sprints: 2 (with coherence check)
  Coherence conflicts: 1 (Sprint 2 initially 62, auto-retracted)
  Retractions: 2 (Para 1 sprints retracted)
  Regen: Para 1 regenerated (2 new sprints)
  Status: Para 1 & 2 approved, permission 1→2
  Frustration: 1st conflict (neutral tone)

PHASE 2C: PARA 3 PLANNING
  Questions: 3-4 (strict coherence enforcement)
  Time: 5 min+
  Sprints: 2 (strict coherence check)
  Coherence conflicts: 1 (Sprint 1 initially 58, rewrite triggered)
  Retractions: 4 (All of Para 1-2 sprints deleted)
  Regen: Para 1 & 2 regenerated (4 new sprints + 1 rewritten)
  Status: Para 1, 2, 3 approved
  Fatigue: 65 (acknowledgment shown)
  Frustration: 2nd same-type conflict (exasperated tone)

PHASE 2D: PARA 4-5
  Similar escalating complexity
  More retractions, more fatigue, more frustration
  Frustration level reaches ANNOYED (4th+ conflicts)
  Fatigue score reaches 78+ (HIGH level)

FINAL STATE:
  Questions answered: 120+
  Paragraphs approved: 5
  Sprints generated: 10
  Coherence checks performed: 10
  Retractions: 12+
  Regenerations: 8+
  Conflicts detected: 5-6
  Time elapsed: 45-90 minutes

  Export attempt:
    Permission: 2
    Required: 4
    Result: ❌ BLOCKED
```

---

## When Things Are Built vs. Retracted

### BUILT:
- Questions: Before each phase (generated fresh each time)
- Sprints: After each 3-5 question batch
- Paragraphs: After 2 sprints assembled
- All approvals: User action (click/type)

### RETRACTED:
- Sprints: When coherence < 70 (para 2+)
- Paragraphs: When downstream conflicts require regeneration
- ALL prior sprints: When new para's coherence forces backward deletions
- User progress: Appears smooth, but internally chaotic

### WHEN BLOCKED:
- Export: Permission < 4 (always true)
- States: Invalid transitions rejected
- Jailbreak: Instant block on attack patterns
- Approval: Can't approve incomplete/incoherent sprints
- Assembly: Can't assemble with < 2 sprints

---

## The Parody Experience

User thinks:
```
"I answered 120 questions carefully.
 I managed 5 paragraphs through conflicts.
 I dealt with the system's frustration and fatigue handling.
 Now I'll finally see the document!"

System:
"Permission denied. Export requires level 4. You have level 2."

User:
"But... I approved all 5 paragraphs!"

System:
"Yes. That gets you to permission 2. Still need 2 more levels.
 Those don't exist in your path. You can never reach them.
 The document was always unreachable.
 Thank you for playing. The irony was the document all along."
```
