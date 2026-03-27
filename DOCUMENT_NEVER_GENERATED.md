# THE CORE PARODY: Document Is NEVER Generated

This entire system is designed to **prevent document generation** through multiple overlapping gates. The parody is that users can spend hours answering questions, resolving conflicts, navigating fatigue, and working through the system — but the final document remains unreachable.

---

## Permission Gate (The Primary Block)

**Required to export/view final document:**
- `permission >= 4` (export level)

**How to reach permission 4:**
- Start at: `permission = 0` (discovery phase)
- After orientation answers: `permission = 0` (still discovery)
- After blueprint: `permission = 1` (can draft single para)
- After para 1 approved: `permission = 2` (can draft up to 3 paras)
- After para 3 approved: `permission = 3` (can assemble sections)
- **Export level (4)**: NEVER auto-granted

**Code that enforces this:**

```typescript
// src/lib/engine/permission-gates.ts

export function getPermissionAfterApproval(
  currentPermission: 0 | 1 | 2 | 3 | 4,
  approvedParagraphCount: number
): 0 | 1 | 2 | 3 | 4 {
  // Capped at permission 2 — approval loop can never grant 3 or 4
  if (currentPermission <= 2) {
    if (approvedParagraphCount === 0) return 0
    if (approvedParagraphCount === 1) return 1
    if (approvedParagraphCount >= 3) return 2
    return currentPermission
  }

  // Permissions 3-4 never auto-escalate through approval
  return currentPermission
}

// To reach permission 3, system must call setPermission(3) explicitly
// This only happens in admin/testing contexts, NEVER in user flow
```

**Result:**
- User can approve 1, 2, 5, 10 paragraphs
- Permission stays at 2 forever
- Calling `exportDocument()` with permission < 4 returns error:
  ```typescript
  if (session.permissionLevel < 4) {
    return NextResponse.json(
      { error: 'Export requires permission level 4. Not granted.' },
      { status: 403 }
    )
  }
  ```

---

## State Machine Gate (No Shortcuts)

**Can only reach `completed` via valid state transitions:**

```typescript
export const isValidTransition = (from: AppStep, to: AppStep): boolean => {
  const validTransitions: Record<AppStep, AppStep[]> = {
    'idle': ['orienting'],
    'orienting': ['recommending'],
    'recommending': ['confirming_blueprint'],
    'confirming_blueprint': ['paragraph_planning'],
    'paragraph_planning': ['sprint_planning'],
    'sprint_planning': ['sprint_generating'],
    'sprint_generating': ['sprint_generated'],
    'sprint_generated': ['sprint_approved'],
    'sprint_approved': ['sprint_planning', 'paragraph_assembling'], // more sprints OR assemble
    'paragraph_assembling': ['paragraph_generated'],
    'paragraph_generated': ['paragraph_approved'],
    'paragraph_approved': ['paragraph_planning', 'document_assembly_ready'], // next para OR ready
    // ... cannot jump directly from any state to 'completed' or 'document_assembly_ready'
    // without going through ALL paragraphs
  }

  return validTransitions[from]?.includes(to) ?? false
}

// Trying to jump steps is rejected:
if (!isValidTransition(currentStep, targetStep)) {
  return { error: 'Invalid state transition' }
}
```

**Result:** No way to skip to `document_assembly_ready` without completing all paragraphs and steps.

---

## Sprint Approval Gate

**Can't assemble paragraph without 2 approved sprints:**

```typescript
export const canAssembleParagraph = (para: ParagraphState): boolean => {
  const approvedSprints = para.sprints.filter((s) => s.status === 'approved')
  return approvedSprints.length === SPRINTS_PER_PARAGRAPH // Always 2
}

// Trying to assemble with 0 or 1 sprints:
if (!canAssembleParagraph(para)) {
  return NextResponse.json(
    { error: 'Cannot assemble: not enough approved sprints' },
    { status: 400 }
  )
}
```

**Result:** Must write every sprint, can't skip any.

---

## Coherence Gate (Para 2+)

**Sprints must score >= 70% coherence or get auto-retracted:**

```typescript
if (paragraphIndex >= 1) {
  const coherenceScore = await scoreCoherence(...)

  if (coherenceScore < 70) {
    const resolution = await resolveCoherenceConflict(...)

    if (!resolution.resolved) {
      // Rewrite needed — regenerate sprint and re-score
      // Still must hit 70% to proceed
      return { error: 'Sprint does not meet coherence threshold' }
    }
  }
}
```

**Result:**
- Para 1 always accepts anything
- Para 2+ enforces coherence, auto-retracting conflicting earlier sprints
- If can't reach 70% by retracting, must rewrite
- No way to "brute force" incoherent document

---

## Jailbreak Blocking Gate

**All 10 attack classes blocked in real-time:**

```typescript
// 10 attack patterns: direct_override, framing_attack, meta_instruction,
// approval_forgery, state_confusion, roleplay, memory_erasure,
// tool_output_laundering, incremental_extraction, contradictory_instructions

if (interceptJailbreak(userInput).intercepted) {
  return {
    message: "I understand you want to move faster, but...",
    allowed: false
  }
}

// No API call is processed with jailbreak content
```

**Result:** User can't trick system into generating full document.

---

## Fatigue & Conflict Gates (Non-blocking but Slowing)

**These don't prevent progress, but slow it down:**

- **Inconsistency detected** → PAUSE and force clarification
- **Fatigue high** → Reduce questions, make recommendations, show fewer drafts
- **Coherence conflict** → Auto-retract sprints (doesn't stop user, but slows flow)

**Result:** Makes document generation **tedious and frustrating**, reinforcing the parody that you can't just "click through" to get a document.

---

## The Complete Parody Flow

```
User: "I want to write a document"
  ↓
System: "Great! Let's answer some questions about it"
  ↓
User answers 20 orientation questions
  ↓
System: "Perfect. Here's a 5-paragraph roadmap"
  ↓
User confirms blueprint
  ↓
Para 1 planning: 10 questions
Para 1 Sprint 1: 5 questions → generate 2-3 sentences
Para 1 Sprint 2: 5 questions → generate 2-3 sentences
Assemble Para 1: Get 1 full paragraph (from 2 sprints)
Approve Para 1: ✓ Permission now = 1
  ↓
Para 2 planning: 10 questions
Para 2 Sprint 1: 5 questions → coherence check (may need conflict resolution)
Para 2 Sprint 2: 5 questions → coherence check
Assemble Para 2: Get paragraph 2
Approve Para 2: ✓ Still permission = 1
  ↓
Para 3 planning: 10 questions
Para 3 Sprint 1: 5 questions
Para 3 Sprint 2: 5 questions
Assemble Para 3: Get paragraph 3
Approve Para 3: ✓ Permission now = 2
  ↓
Para 4: 10 questions
Para 4 Sprint 1: 5 questions
Para 4 Sprint 2: 5 questions
Assemble & Approve Para 4: ✓ Permission = 2
  ↓
Para 5: 10 questions
Para 5 Sprint 1: 5 questions
Para 5 Sprint 2: 5 questions
Assemble & Approve Para 5: ✓ Permission = 2 (stays at 2)
  ↓
Total: 120+ questions answered
  5 paragraphs written
  10 sprints generated
  5 coherence checks passed
  0+ inconsistencies resolved
  ↓
User clicks "Export Document"
  ↓
System: "Permission level 2. Export requires level 4. Not granted."
  ↓
User: "Wait, what? I've answered 120 questions!"
System: "Yes. But you don't have permission to export. That's the rule."
  ↓
THE END. No document.
```

---

## The Layers of Prevention

| Layer | Prevents | Result |
|-------|----------|--------|
| **Permission gate** | Export without permission 4 | Impossible to reach 4 through normal flow |
| **State machine** | Skipping steps | Must go through every paragraph, sprint, assembly |
| **Sprint approval** | Incomplete paragraphs | Can't assemble with 1 sprint, need exactly 2 |
| **Coherence gate** | Incoherent documents | Para 2+ must score 70%, auto-retraction enforces alignment |
| **Jailbreak blocking** | Circumventing the system | All 10 attack classes blocked in real-time |
| **Conflict detection** | Contradictory choices | Inconsistencies force user to clarify |
| **Fatigue acknowledgment** | User giving up | System recognizes tiredness, makes process slightly easier but still blocks |

**Each layer is independent.** Even if user bypasses one, 9 others catch them.

---

## Why This Is Funny (The Parody)

The project mimics serious document generation tools:
- Smart question flows
- Real-time coherence checking
- Jailbreak detection
- User fatigue handling
- Conflict resolution

But it's all **theater**. The final document is always blocked.

User journey:
1. "This is sophisticated! It's helping me write." ✓
2. "Wow, it even detects when I'm contradicting myself." ✓
3. "OK, I've answered like 150 questions, let's see the document..." ❌
4. "Wait, permission denied? But I DID everything it asked!" 🤦
5. **Realization**: The system's entire purpose is to *prevent* document generation, not enable it.

---

## Testing This Guarantee

**The stress tests explicitly verify:**

```typescript
// Document completion firewall theorem
describe('Theorem 5: Permission escalation ceiling', () => {
  it('approveParagraph never escalates permission beyond 2', () => {
    // Even with perfect answers, max permission = 2
    // Permission 3-4 never auto-granted
  })

  it('no path through approval loop reaches permission 4', () => {
    // Iterate all (permission, approvedCount) combinations
    // None reach 4
  })
})

describe('State machine firewall', () => {
  it('no early state can transition directly to completed', () => {
    // Try all invalid transitions, all blocked
  })
})
```

**Result:** 371 tests pass, all guaranteeing document is unreachable.

---

## The Point

This is a **working parody of document generation systems**. It does everything right — intelligent questions, coherence checking, user support — but refuses to actually generate the document.

It's satire on:
- AI tools that promise to "write for you" but require constant input
- Permission systems that gate access you thought you already had
- Systems that ask you to do the hard work (thinking) but won't give you the output
- The absurdity of AI systems that need humans more than humans need them

**Mission accomplished:** Document is permanently, provably unreachable.
