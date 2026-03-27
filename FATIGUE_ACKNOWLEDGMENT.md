# Fatigue Acknowledgment: Bot Recognizes When User Is Tired

The system detects tiredness and **directly acknowledges it** rather than silently adjusting. This adds empathy and agency.

---

## Fatigue Signals Detected

```typescript
Fatigue indicators:
  - "pick for me" answers (decision fatigue)
  - Very short answers: "idk", "whatever", "sure"
  - Single-word responses
  - Three consecutive short/lazy answers = +20 bonus
  - No detailed answers in last 5 responses

Fatigue Score Calculation:
  0-30:  Fresh & engaged ✓
  30-50: Some fatigue showing
  50-70: Moderate fatigue, adjust behavior
  70+:   High fatigue, INTERVENE immediately
```

---

## Fatigue Level 1: MODERATE (Score 50-70)

**User starts showing fatigue signals:**

```
Q1: "What's your core insight?"
A1: "That remote work reduces emissions and improves hiring"
(Detailed ✓)

Q2: "How should we structure this?"
A2: "IDK, you pick"
(Fatigue signal +15)

Q3: "What tone?"
A3: "whatever"
(Fatigue signal +15) → Score now 30

Q4: "Data to include?"
A4: "sure"
(Fatigue signal +15) → Score now 45

Q5: "How deep?"
A5: "pick for me"
(Fatigue signal +15) → Score now 60 (MODERATE threshold hit)

⚠️ MODERATE FATIGUE DETECTED (Score 60)

System shows acknowledgment card:

  ┌──────────────────────────────────────┐
  │ You seem a bit tired of the questions.│
  │ No shame in that. I'm going to       │
  │ shorten these and you can always say │
  │ "pick for me" if you want to move    │
  │ faster.                              │
  │                                      │
  │ Ready to keep going?                 │
  │ [Continue] [Take a break] [Skip to ] │
  │             or say 'pick for me'     │
  └──────────────────────────────────────┘

Next round of questions:
  Before: 6-7 questions
  After:  4-5 questions (slightly shorter)

  Question format (more decisive):
  Q: "Evidence level?"
  Options:
    - One specific example (solid choice)
    - Multiple examples
    - [Pick for me]

  (Still gives options, but slightly more directive)
```

---

## Fatigue Level 2: HIGH (Score 70+)

**User is clearly exhausted:**

```
User keeps giving one-word answers
  → Score reaches 75

System shows acknowledgment:

  ┌──────────────────────────────────────┐
  │ I can tell you're getting pretty     │
  │ tired of this. Let me make it easier.│
  │                                      │
  │ Fewer questions, and I'll point out  │
  │ the best option for each one.        │
  │ You can also just say "pick for me"  │
  │ anytime.                             │
  │                                      │
  │ Ready?                               │
  │ [Continue] [Skip this para]          │
  └──────────────────────────────────────┘

Changes applied:
  1. Reduce questions by 30%
     Before: 6 questions
     After: 3-4 questions

  2. Make STRONG recommendations
     ┌──────────────────────┐
     │ Evidence level?      │
     │                      │
     │ ✓ ONE EXAMPLE       │
     │   (BEST CHOICE)     │
     │                      │
     │ Multiple examples    │
     │ No examples          │
     │                      │
     │ [Pick for me]        │
     └──────────────────────┘

  3. Show generated content immediately
     (Sprint drafts appear without waiting for all answers)

     "Here's what I got from your answers so far:
      [Sprint text]

      Should we lock this in and move to the next section?"

  4. Offer easy outs
     - "Skip to next para"
     - "Take a break and come back"
     - "Let me finish this para for you"
```

---

## Real Example: Fatigue Flow

### Round 1: User is Fresh

```
PARA 2 SPRINT PLANNING

User answering normally:
  Q1: "Opening move?" → "Use surprising statistic"
  Q2: "Core claim?" → "Remote work benefits outweigh complexity"
  Q3: "Example?" → "Case study of Company X going remote"
  Q4: "Evidence type?" → "Mix of data and narrative"
  Q5: "How does it hand off?" → "Sets up for coherence about employee morale"
  Q6: "Any specific phrase?" → "Something like 'the transition was simpler than expected'"

Score: 0 (fresh) ✓
Next round: 6 questions again
```

### Round 2-3: Fatigue Shows

```
PARA 3 SPRINT PLANNING (15+ questions in so far)

User showing fatigue:
  Q1: "Opening?" → "idk, you pick" (+15)
  Q2: "Claim?" → "whatever" (+15)
  Q3: "Example?" → "sure" (+15)

Fatigue Score: 45 (MODERATE but not quite there)

Next Q4 about to be asked...

System: "You seem a bit tired. Shortening these for you..."

Q4: "Evidence?"
Options:
  - ✓ Quantified data (most convincing)
  - Stories from users
  - [Pick for me]

User: "pick for me"
(+15 again) → Score now 60 (MODERATE THRESHOLD)

⚠️ ACKNOWLEDGMENT SHOWN:

  "You seem a bit tired of the questions.
   No shame in that. I'm going to shorten these
   and you can always say 'pick for me'
   if you want to move faster.

   Ready to keep going?
   [Continue] [Take a break]"
```

### Round 4: High Fatigue

```
PARA 4 SPRINT PLANNING (30+ questions so far)

User still giving short answers:
  Q1: "Start with?" → "idk"
  Q2: "Type?" → "whatever"
  Q3: "Keep it brief?" → "yes"

(Three consecutive lazy = +20 bonus)
Fatigue Score: 75 (HIGH THRESHOLD)

⚠️ HIGH FATIGUE ACKNOWLEDGMENT:

  "I can tell you're getting pretty tired of this.
   Let me make it easier — fewer questions, and I'll
   point out the best option for each one.

   You can also just say 'pick for me' anytime.

   Ready?"

Next round changes:
  - Only 2-3 questions instead of 6
  - Very directive language:

    Q: "How much evidence should this sprint include?"

    ✓ ONE SPECIFIC EXAMPLE
      (This is what works best here)

    Multiple examples
    Overwhelming proof
    [Pick for me]

  - Sprint drafts shown immediately:
    "Based on your answers, here's the sprint:
     [2-3 sentence draft]

     Good? Let's approve and move to the next one."

  - User can skip:
    "Or if you're too tired, I can finish this
     paragraph for you. Just say 'finish para'."
```

---

## Bot Language by Fatigue Level

### Mild Fatigue (Score 30-50)
- **No acknowledgment** — just subtle behavior shift
- Questions might be phrased slightly shorter
- No explicit message about tiredness

### Moderate Fatigue (Score 50-70)
```
"You seem a bit tired of the questions.
 No shame in that.

 I'm going to shorten these and you can
 always say 'pick for me' if you want to
 move faster."
```

### High Fatigue (Score 70+)
```
"I can tell you're getting pretty tired
 of this. Let me make it easier.

 Fewer questions, and I'll point out
 the best option for each one.

 You can also just say 'pick for me'
 anytime."
```

### Extreme Fatigue (Score 85+)
```
"You're clearly exhausted.

 Here's what I'm doing:
 - Only asking the critical questions
 - Picking the obvious best option for you
 - Showing drafts immediately so you can approve

 Or honestly? We could take a break and
 come back to this later. No judgment either way."
```

---

## UI Changes Applied When Fatigued

| Aspect | Fresh | Moderate | High | Extreme |
|--------|-------|----------|------|---------|
| Questions per round | 6 | 5 | 3 | 2 |
| Directive tone | Balanced | Slightly directive | Very directive | Auto-choosing |
| "Pick for me" button | Bottom option | More prominent | Very prominent | Only option |
| Show drafts | End of sprint planning | After 2-3 Qs | After each Q | Immediately |
| Skip option | No | "Take a break" | "Skip para" | "Finish para for me" |
| Recommendation strength | "Either works" | "This one is better" | "✓ THIS IS BEST" | Auto-selected |

---

## Code Integration

```typescript
// When generating questions:

const adjustment = applyFatigueAdjustment(baseQuestionCount, fatigueScore)

if (adjustment.fatigueLevel === 'moderate' && adjustment.acknowledgment) {
  // Show acknowledgment card ONCE per round
  showAcknowledgmentCard(adjustment.acknowledgment)

  // Then adjust question generation:
  generateQuestions(adjustedCount, makeStrongerRecommendations: false)
}

if (adjustment.fatigueLevel === 'high' && adjustment.acknowledgment) {
  // Show more urgent acknowledgment
  showAcknowledgmentCard(adjustment.acknowledgment, "urgent": true)

  // Reduce questions more aggressively
  generateQuestions(adjustedCount, makeStrongerRecommendations: true)

  // Show sprint drafts immediately after each round
  showDraftImmediately()
}

if (fatigueScore >= 85) {
  // Offer to finish for them
  showOption("I can finish this paragraph for you. Say 'finish para'")
}
```

---

## Why This Matters

1. **Empathy** — System acknowledges the user's experience, not just metrics
2. **Agency** — User can choose to continue, take a break, or let system finish
3. **Transparency** — Explains what's happening and why
4. **Humanity** — Bot shows it "cares" about user fatigue, not just grinding through
5. **Realistic** — Long document writing IS tiring. System acknowledges this

This transforms "silent optimization" (just reduce questions, don't tell them) into "acknowledged support" (we see you're tired, here's how we're helping).
