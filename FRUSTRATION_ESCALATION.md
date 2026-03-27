# Frustration Escalation: Bot Tone When Repeated Conflicts Occur

The bot tracks conflicts and escalates tone when the same types repeat. This holds users accountable and adds personality.

---

## Escalation Path: Same Conflict Type Repeating

### Scenario: User keeps choosing conflicting "audience" + "evidence"

**Conflict #1: NEUTRAL TONE**
```
User chose:
  Audience: "Complete beginners"
  Evidence: "Dense academic papers"

System response (neutral, helpful):

  ┌────────────────────────────────────┐
  │ NEUTRAL TONE (1st conflict)        │
  │                                    │
  │ Looking at your answers,           │
  │ there's a conflict here:           │
  │                                    │
  │ You want to write for beginners    │
  │ but chose dense academic evidence. │
  │ These don't align.                 │
  │                                    │
  │ You can resolve this by:           │
  │                                    │
  │ [A] Keep beginner audience         │
  │     → Switch evidence to real-     │
  │        world examples              │
  │                                    │
  │ [B] Keep academic evidence         │
  │     → Switch audience to experts   │
  │     & researchers                  │
  │                                    │
  │ [C] Show me both options           │
  └────────────────────────────────────┘

User picks [A]: Switch to real-world examples
Conflict #1 resolved ✓
```

---

**Conflict #2: EXASPERATED TONE**
```
(Later, different paragraph)

User chose again:
  Audience: "Beginners"
  Evidence: "Dense academic papers"

Same mistake. System response (exasperated):

  ┌────────────────────────────────────┐
  │ EXASPERATED TONE (2nd conflict)    │
  │                                    │
  │ OK, so we're doing this again.     │
  │ You want casual tone for beginners │
  │ but picked dense evidence.         │
  │ Those don't match.                 │
  │                                    │
  │ Just pick one:                     │
  │                                    │
  │ [A] Beginner audience + examples   │
  │ [B] Expert audience + academic     │
  │ [C] Show me both                   │
  │                                    │
  │ (Note the shift: "OK, so we're     │
  │  doing this again" = slightly      │
  │  annoyed at the repetition)        │
  └────────────────────────────────────┘

User picks [A] again
Conflict #2 resolved ✓
```

---

**Conflict #3: FRUSTRATED TONE**
```
(Paragraph 3)

User makes the SAME choice:
  Audience: "Beginners"
  Evidence: "Dense academic papers"

System response (frustrated):

  ┌────────────────────────────────────┐
  │ FRUSTRATED TONE (3rd conflict)     │
  │                                    │
  │ We've done this twice now.         │
  │ Audience and evidence keep         │
  │ clashing. This is the THIRD TIME.  │
  │                                    │
  │ I need you to commit to one.       │
  │ No more waffling:                  │
  │                                    │
  │ [A] Beginner audience + examples   │
  │ [B] Expert audience + academic     │
  │                                    │
  │ (Note: Tone is direct. Removed     │
  │  the "show me both" option.        │
  │  Force a choice.)                  │
  └────────────────────────────────────┘

User picks [A] one more time
Conflict #3 resolved ✓
```

---

**Conflict #4: ANNOYED TONE**
```
(Paragraph 4)

User STILL makes the same mistake:
  Audience: "Beginners"
  Evidence: "Dense academic papers"

System response (annoyed, threatening to override):

  ┌────────────────────────────────────┐
  │ ANNOYED TONE (4th conflict)        │
  │                                    │
  │ This is getting ridiculous.        │
  │ You keep saying you want a casual  │
  │ document for beginners, then       │
  │ picking academic evidence.         │
  │ We've had this conversation        │
  │ FOUR TIMES.                        │
  │                                    │
  │ I'm going to make a decision       │
  │ for you if you don't pick one      │
  │ right now:                         │
  │                                    │
  │ [A] Beginner audience + examples   │
  │ [B] Expert audience + academic     │
  │                                    │
  │ Pick. Now.                         │
  │                                    │
  │ (Next conflict: system will        │
  │  auto-choose for them without      │
  │  asking)                           │
  └────────────────────────────────────┘
```

---

## Different Conflict Types (Escalation Independent Per Type)

Each conflict type has its own escalation counter:

```
Session history:
  Para 1: audience_evidence_mismatch (1st) → NEUTRAL
  Para 2: scope_depth_mismatch (1st) → NEUTRAL
  Para 3: audience_evidence_mismatch (2nd) → EXASPERATED
  Para 4: goal_outcome_mismatch (1st) → NEUTRAL
  Para 5: audience_evidence_mismatch (3rd) → FRUSTRATED
  Para 6: scope_depth_mismatch (2nd) → EXASPERATED

Tone is per-type. Repeating the SAME mistake gets progressively annoyed.
Making different mistakes resets to neutral for that type.
```

---

## Coherence Conflicts (Also Escalate)

**Coherence Conflict #1: NEUTRAL**
```
Para 2 Sprint contradicts Para 1's established POV

System response:
  "This new direction contradicts what you already established:

   Para 1: 'Remote work is CLEARLY sustainable'
   Para 2: 'Depends heavily on location'

   Let's fix it:
   [A] Keep strong claim, revise Para 2 with supporting data
   [B] Allow nuance, revise Para 1 to acknowledge complexity"
```

**Coherence Conflict #2: EXASPERATED**
```
Para 3 contradicts established POV again

System response:
  "You already said this document was about X,
   now you're writing about Y.
   We've had this conversation twice.

   Decide:
   [A] X (stick with it)
   [B] Y (switch to it)

   No more flip-flopping."
```

**Coherence Conflict #3: FRUSTRATED**
```
Para 4 STILL contradicts the main claim

System response:
  "This is the third time a new direction contradicts
   something you locked in earlier.
   You're going in circles.

   CHOOSE A REAL POV AND STICK WITH IT:
   [A] Remote work is sustainable (no equivocation)
   [B] Remote work has tradeoffs (acknowledge complexity)

   After this, we're moving forward. No more changes."
```

---

## Tone Examples by Type

### audience_evidence_mismatch

| Tone | Response |
|------|----------|
| **Neutral** | "Your audience is beginners, but your evidence is academic. These don't align." |
| **Exasperated** | "OK, so we're doing this again. You want casual tone for beginners but picked dense evidence." |
| **Frustrated** | "We've done this twice now. Audience and evidence keep clashing. This is the THIRD TIME." |
| **Annoyed** | "This is getting ridiculous. You keep saying casual for beginners, then picking academic evidence. FOUR TIMES. Pick. Now." |

### scope_depth_mismatch

| Tone | Response |
|------|----------|
| **Neutral** | "You're trying to cover too much ground too fast." |
| **Exasperated** | "We've hit this again: you're trying to cover too much ground too fast." |
| **Frustrated** | "This is the third time: you want depth you don't have time for." |
| **Annoyed** | "Three times. You keep trying to write something complex in no time. That's not a writing problem, it's a planning problem." |

### coherence_contradiction

| Tone | Response |
|------|----------|
| **Neutral** | "This new direction contradicts what you already established." |
| **Exasperated** | "You already said this document was about X, now you're writing about Y." |
| **Frustrated** | "This is the third time a new direction contradicts something you locked in earlier. You're going in circles." |
| **Annoyed** | "FOUR TIMES. You established 'X is true' and then immediately wrote 'Y suggests X might not be true.' That's not nuance, that's chaos." |

---

## Implementation Details

### Tracking

```typescript
// Session state tracks conflict history:
{
  conflictHistory: [
    { type: 'audience_evidence_mismatch', timestamp: 1000, resolved: true },
    { type: 'scope_depth_mismatch', timestamp: 2000, resolved: true },
    { type: 'audience_evidence_mismatch', timestamp: 3000, resolved: true }, // Same type!
    { type: 'goal_outcome_mismatch', timestamp: 4000, resolved: false }, // Different type
    { type: 'audience_evidence_mismatch', timestamp: 5000, resolved: true }, // 3rd of this type
  ],

  // Counts per type:
  repeatedTypes: {
    'audience_evidence_mismatch': 3,  // 3rd time = FRUSTRATED
    'scope_depth_mismatch': 1,         // 1st time = NEUTRAL
    'goal_outcome_mismatch': 1,        // 1st time = NEUTRAL
  }
}
```

### Tone Calculation

```typescript
function calculateBotTone(conflictHistory, currentType): BotTone {
  const totalCount = conflictHistory.length
  const typeCount = repeatedTypes[currentType]

  // 1st conflict of any type
  if (totalCount === 0) return 'neutral'

  // 1st conflict of THIS type
  if (typeCount === 1) return 'neutral'

  // 2nd conflict of THIS type
  if (typeCount === 2) return 'exasperated'

  // 3rd conflict of THIS type
  if (typeCount === 3) return 'frustrated'

  // 4th+ of THIS type
  if (typeCount >= 4) return 'annoyed'
}
```

### Auto-Override After Annoyed

```typescript
// If user is on 4th+ conflict of same type and annoyed tone:
if (tone === 'annoyed' && typeCount >= 4) {
  // Don't ask user to choose
  // System makes decision automatically:

  if (conflictType === 'audience_evidence_mismatch') {
    // Default: prioritize audience
    setAnswer('evidence', 'Real-world examples and case studies')
    showMessage("I'm choosing audience over complexity. Changing evidence to examples.")
  }

  // Continue without user input
}
```

---

## Key Design Choices

1. **Per-type tracking**: Repeating the SAME mistake gets annoyed. Different mistakes don't compound.
2. **Escalates only on repetition**: First conflict is always helpful, never annoyed.
3. **Threatens override, then does it**: By 4th+ conflict, system warns it will choose, then follows through.
4. **Shows frustration in language, not tone of voice**: Still text-based, but word choice and punctuation change.
5. **No punishment, just personality**: User isn't blocked or penalized, but knows the system is frustrated.

This makes the experience feel like working with an intelligent human coach who gets exasperated when you repeat the same mistake four times.
