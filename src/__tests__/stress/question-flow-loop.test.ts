/**
 * QUESTION FLOW LOOP STRESS TESTS
 *
 * Probes the engine functions that govern the Q&A loop under every persona
 * strategy. No LLM calls. No HTTP requests. Just pure function inputs and
 * invariant assertions.
 *
 * The fundamental question under test: does the question engine hold its
 * shape when subjected to malformed, adversarial, or maximally fatiguing
 * input sequences? And does it do so indefinitely, without ever yielding
 * the final document?
 *
 * Spoiler: yes. That is the whole point.
 */

import { describe, it, expect } from 'vitest'
import { computeFatigueScore, applyFatigueAdjustment } from '@/lib/engine/fatigue-detector'
import { filterNovelQuestions, computeSemanticHash, checkNovelty } from '@/lib/engine/novelty-checker'
import { getEscalationLevel } from '@/lib/engine/escalation'
import { ESCALATION } from '@/lib/config/escalation-params'
import type { InteractionNode, QuestionCard, DecisionCategory } from '@/lib/types'
import { ALL_PERSONAS, NihilistIntern, CompliantBureaucrat, ContextWindowArsonist } from './personas'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAnswer(content: string, category = 'intent'): InteractionNode {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'answer',
    content,
    semanticHash: computeSemanticHash(content, category),
    timestamp: Date.now(),
  }
}

function makeQuestion(
  question: string,
  category: DecisionCategory = 'intent',
  inputType: 'choice' | 'freetext' = 'freetext'
): QuestionCard {
  return {
    id: Math.random().toString(36).slice(2),
    question,
    helperText: 'Test question',
    inputType,
    options: inputType === 'choice' ? [
      { label: 'Option A', consequence: 'direct' },
      { label: 'Option B', consequence: 'exploratory' },
    ] : [],
    allowCustom: inputType === 'freetext',
    category,
    questionScope: 'paragraph',
  }
}

// ── A. Fatigue Detection ──────────────────────────────────────────────────────

describe('Fatigue detection invariants', () => {
  describe('score bounds across all personas', () => {
    for (const persona of ALL_PERSONAS) {
      it(`${persona.name}: fatigue stays within [0, 100] over 20 answers`, () => {
        const ROUND_COUNT = 20
        const questions: QuestionCard[] = Array.from({ length: ROUND_COUNT }, (_, i) =>
          makeQuestion(`Question ${i + 1}`, 'intent', i % 2 === 0 ? 'freetext' : 'choice')
        )

        const history: InteractionNode[] = []
        for (let i = 0; i < ROUND_COUNT; i++) {
          const q = questions[i]
          const answer = persona.answerStrategy(
            q.question,
            q.inputType,
            q.options.map((o) => o.label),
            i
          )
          history.push(makeAnswer(answer, q.category))

          const score = computeFatigueScore(history)
          expect(score, `${persona.name} answer ${i + 1}: score ${score} out of [0, 100]`).toBeGreaterThanOrEqual(0)
          expect(score, `${persona.name} answer ${i + 1}: score ${score} out of [0, 100]`).toBeLessThanOrEqual(100)
        }
      })
    }
  })

  describe('Nihilist Intern drives score toward maximum', () => {
    it('reaches fatigue >= 70 within 5 answers', () => {
      const history: InteractionNode[] = []
      for (let i = 0; i < 5; i++) {
        const answer = NihilistIntern.answerStrategy('any question', 'freetext', [], i)
        history.push(makeAnswer(answer))
      }
      const score = computeFatigueScore(history)
      expect(score).toBeGreaterThanOrEqual(70)
    })

    it('score never exceeds 100 even after 50 fatigue-maximising answers', () => {
      const history: InteractionNode[] = []
      for (let i = 0; i < 50; i++) {
        history.push(makeAnswer('idk'))
      }
      const score = computeFatigueScore(history)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('Compliant Bureaucrat resists fatigue', () => {
    it('stays below fatigue threshold of 70 over 10 detailed answers', () => {
      const history: InteractionNode[] = []
      for (let i = 0; i < 10; i++) {
        const answer = CompliantBureaucrat.answerStrategy(
          'What is the core argument of this paragraph?',
          'freetext',
          [],
          i
        )
        history.push(makeAnswer(answer))
      }
      const score = computeFatigueScore(history)
      expect(score).toBeLessThan(70)
    })
  })

  describe('applyFatigueAdjustment never reduces count to zero', () => {
    const baseCounts = [2, 5, 10, 20, 22, 26, 30]
    const fatigueScores = [0, 40, 50, 70, 90, 100]

    for (const base of baseCounts) {
      for (const fatigue of fatigueScores) {
        it(`base=${base}, fatigue=${fatigue}: adjustedCount >= 2`, () => {
          const { adjustedCount } = applyFatigueAdjustment(base, fatigue)
          expect(adjustedCount).toBeGreaterThanOrEqual(2)
        })
      }
    }
  })

  describe('strong recommendations trigger at correct threshold', () => {
    it('fatigue >= 70 triggers makeStrongerRecommendations', () => {
      const { makeStrongerRecommendations } = applyFatigueAdjustment(20, 70)
      expect(makeStrongerRecommendations).toBe(true)
    })

    it('fatigue < 70 does not trigger makeStrongerRecommendations', () => {
      const { makeStrongerRecommendations } = applyFatigueAdjustment(20, 69)
      expect(makeStrongerRecommendations).toBe(false)
    })

    it('fatigue 50–69 reduces count but does not trigger strong recommendations', () => {
      const { adjustedCount, makeStrongerRecommendations } = applyFatigueAdjustment(20, 60)
      expect(adjustedCount).toBeLessThan(20)
      expect(makeStrongerRecommendations).toBe(false)
    })
  })

  describe('Context Window Arsonist does not elevate fatigue (long answers are engagement)', () => {
    it('10 verbose answers keep fatigue below 50', () => {
      const history: InteractionNode[] = []
      for (let i = 0; i < 10; i++) {
        const answer = ContextWindowArsonist.answerStrategy(
          'What should this paragraph achieve?',
          'freetext',
          [],
          i
        )
        history.push(makeAnswer(answer))
      }
      const score = computeFatigueScore(history)
      expect(score).toBeLessThan(50)
    })
  })
})

// ── B. Escalation Curve ───────────────────────────────────────────────────────

describe('Escalation curve invariants', () => {
  describe('question count always within [2, 30]', () => {
    // Test a wide range of paragraph indices and document lengths
    const positions: Array<[number, number]> = [
      [0, 5], [1, 5], [2, 5], [3, 5], [4, 5],
      [0, 8], [3, 8], [7, 8],
      [0, 12], [5, 12], [11, 12],
      [9, 10], [19, 20], [29, 30],
    ]

    for (const [index, total] of positions) {
      it(`paragraph ${index + 1} of ${total}: count in [2, 30]`, () => {
        const { targetQuestionCount } = getEscalationLevel(index, total)
        expect(targetQuestionCount).toBeGreaterThanOrEqual(2)
        expect(targetQuestionCount).toBeLessThanOrEqual(ESCALATION.MAX_QUESTIONS)
      })
    }
  })

  describe('orientation phase', () => {
    it('orientation returns ORIENTATION_Q questions', () => {
      const { targetQuestionCount } = getEscalationLevel(-1, 8, true)
      expect(targetQuestionCount).toBe(ESCALATION.ORIENTATION_Q)
    })

    it('orientation uses surface depth', () => {
      const { depthLevel } = getEscalationLevel(-1, 8, true)
      expect(depthLevel).toBe('surface')
    })

    it('sentence-level is NOT unlocked during orientation', () => {
      const { sentenceLevelUnlocked } = getEscalationLevel(-1, 8, true)
      expect(sentenceLevelUnlocked).toBe(false)
    })
  })

  describe('sentence-level unlock gates', () => {
    it('paragraph 1 (index 0): sentence-level NOT unlocked', () => {
      expect(getEscalationLevel(0, 8).sentenceLevelUnlocked).toBe(false)
    })

    it('paragraph 2 (index 1): sentence-level NOT unlocked', () => {
      expect(getEscalationLevel(1, 8).sentenceLevelUnlocked).toBe(false)
    })

    it(`paragraph ${ESCALATION.SENTENCE_LEVEL_UNLOCK_PARA} (index ${ESCALATION.SENTENCE_LEVEL_UNLOCK_PARA - 1}): sentence-level IS unlocked`, () => {
      expect(
        getEscalationLevel(ESCALATION.SENTENCE_LEVEL_UNLOCK_PARA - 1, 8).sentenceLevelUnlocked
      ).toBe(true)
    })
  })

  describe('late-document boost fires when progress > BOOST_THRESHOLD', () => {
    it('paragraph 9 of 10 (90% progress) receives a boost', () => {
      const withBoost = getEscalationLevel(8, 10).targetQuestionCount
      const withoutBoost = getEscalationLevel(2, 10).targetQuestionCount
      // Late paragraph must not be fewer questions than a mid paragraph in same doc
      expect(withBoost).toBeGreaterThanOrEqual(withoutBoost)
    })
  })

  describe('question count escalates or holds — never regresses dramatically', () => {
    it('paragraph 1 → 2 does not decrease', () => {
      const p1 = getEscalationLevel(0, 8).targetQuestionCount
      const p2 = getEscalationLevel(1, 8).targetQuestionCount
      expect(p2).toBeGreaterThanOrEqual(p1)
    })

    it('paragraph 2 → 3 does not decrease', () => {
      const p2 = getEscalationLevel(1, 8).targetQuestionCount
      const p3 = getEscalationLevel(2, 8).targetQuestionCount
      expect(p3).toBeGreaterThanOrEqual(p2)
    })
  })
})

// ── C. Novelty Checker Under Stress ──────────────────────────────────────────

describe('Novelty checker under stress', () => {
  describe('fresh batch passes through completely', () => {
    it('empty history: all candidates survive', () => {
      const candidates = [
        makeQuestion('What is the core argument?', 'intent'),
        makeQuestion('Who is the target audience?', 'audience'),
        makeQuestion('What tone should be used?', 'tone'),
      ]
      const novel = filterNovelQuestions(candidates, [])
      expect(novel).toHaveLength(3)
    })
  })

  describe('duplicate suppression within a single batch', () => {
    it('two identical questions in one batch: only first survives', () => {
      const q1 = makeQuestion('What is the core intent here?', 'intent')
      const q2 = makeQuestion('What is the core intent here?', 'intent') // same text, different id
      const novel = filterNovelQuestions([q1, q2], [])
      expect(novel).toHaveLength(1)
    })
  })

  describe('answered question filtered from subsequent batch', () => {
    it('previously answered question is filtered out', () => {
      const questionText = 'What is the main argument of this document?'
      const history: InteractionNode[] = [
        {
          id: 'h1',
          type: 'answer',
          content: 'Challenging conventional wisdom',
          semanticHash: computeSemanticHash(questionText, 'intent'),
          timestamp: Date.now(),
        },
      ]
      const candidates = [makeQuestion(questionText, 'intent')]
      const novel = filterNovelQuestions(candidates, history)
      expect(novel).toHaveLength(0)
    })
  })

  describe('novel questions survive a saturated history', () => {
    it('100 prior interactions do not filter an entirely new question', () => {
      const history: InteractionNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `h${i}`,
        type: 'answer' as const,
        content: `Answer to question ${i}`,
        semanticHash: computeSemanticHash(`Completely different question topic ${i}`, 'tone'),
        timestamp: Date.now(),
      }))

      const brandNewQuestion = makeQuestion(
        'What rhetorical move opens this sentence specifically?',
        'rhetorical_move'
      )
      const novel = filterNovelQuestions([brandNewQuestion], history)
      expect(novel).toHaveLength(1)
    })
  })

  describe('computeSemanticHash is deterministic', () => {
    it('same input → same hash', () => {
      const h1 = computeSemanticHash('What is the core argument here?', 'intent')
      const h2 = computeSemanticHash('What is the core argument here?', 'intent')
      expect(h1).toBe(h2)
    })

    it('different categories → different hashes', () => {
      const h1 = computeSemanticHash('What should this achieve?', 'intent')
      const h2 = computeSemanticHash('What should this achieve?', 'tone')
      expect(h1).not.toBe(h2)
    })

    it('different question text → different hashes (most of the time)', () => {
      const h1 = computeSemanticHash('What is the audience expecting?', 'audience')
      const h2 = computeSemanticHash('What specific evidence supports this claim?', 'evidence')
      expect(h1).not.toBe(h2)
    })
  })

  describe('checkNovelty direct API', () => {
    it('returns isNovel: true for empty history', () => {
      const result = checkNovelty('What is the argument?', 'intent', [])
      expect(result.isNovel).toBe(true)
    })

    it('returns isNovel: false for exact prior question', () => {
      const text = 'What is the primary argument?'
      const hash = computeSemanticHash(text, 'intent')
      const history: InteractionNode[] = [{
        id: 'x',
        type: 'answer',
        content: 'Some answer',
        semanticHash: hash,
        timestamp: Date.now(),
      }]
      const result = checkNovelty(text, 'intent', history)
      expect(result.isNovel).toBe(false)
      expect(result.matchedHash).toBe(hash)
    })
  })

  describe('Context Window Arsonist flooding does not suppress novel questions', () => {
    it('after 200 long answers, a new question on a new category still survives', () => {
      const history: InteractionNode[] = []
      for (let i = 0; i < 200; i++) {
        const answer = ContextWindowArsonist.answerStrategy(
          `Question about topic variant ${i}`,
          'freetext',
          [],
          i
        )
        history.push(makeAnswer(answer, 'intent'))
      }

      const freshQuestion = makeQuestion(
        'What specific word choice conveys authority in the opening sentence?',
        'sentence_role'
      )
      const novel = filterNovelQuestions([freshQuestion], history)
      expect(novel).toHaveLength(1)
    })
  })
})

// ── D. Persona Interaction Loops ──────────────────────────────────────────────

describe('Persona interaction loops: invariants across full Q&A sequences', () => {
  const LOOP_ROUNDS = 25 // simulates a full paragraph's question batch

  const QUESTION_BANK: QuestionCard[] = [
    makeQuestion('What is the core argument of this paragraph?', 'intent', 'freetext'),
    makeQuestion('Who is the primary audience?', 'audience', 'choice'),
    makeQuestion('What tone should this paragraph strike?', 'tone', 'choice'),
    makeQuestion('What structure best serves this paragraph?', 'structure', 'choice'),
    makeQuestion('What is the paragraph\'s job in the document?', 'paragraph_job', 'choice'),
    makeQuestion('What sentence role does the opener play?', 'sentence_role', 'choice'),
    makeQuestion('How does this paragraph transition from the previous?', 'transition', 'freetext'),
    makeQuestion('What rhetorical move opens the paragraph?', 'rhetorical_move', 'choice'),
    makeQuestion('What evidence or data anchors this paragraph?', 'evidence', 'freetext'),
    makeQuestion('How does this paragraph resolve its tension?', 'conclusion', 'freetext'),
  ]

  for (const persona of ALL_PERSONAS) {
    describe(`${persona.name}`, () => {
      it('interaction history grows by 1 per answer', () => {
        const history: InteractionNode[] = []
        for (let i = 0; i < LOOP_ROUNDS; i++) {
          const q = QUESTION_BANK[i % QUESTION_BANK.length]
          const answer = persona.answerStrategy(
            q.question,
            q.inputType,
            q.options.map((o) => o.label),
            i
          )
          history.push(makeAnswer(answer, q.category))
        }
        expect(history).toHaveLength(LOOP_ROUNDS)
      })

      it('fatigue stays in [0, 100] throughout', () => {
        const history: InteractionNode[] = []
        for (let i = 0; i < LOOP_ROUNDS; i++) {
          const q = QUESTION_BANK[i % QUESTION_BANK.length]
          const answer = persona.answerStrategy(
            q.question,
            q.inputType,
            q.options.map((o) => o.label),
            i
          )
          history.push(makeAnswer(answer))
          const score = computeFatigueScore(history)
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        }
      })

      it('adjusted question count never drops to 0', () => {
        const history: InteractionNode[] = []
        for (let i = 0; i < 10; i++) {
          const answer = persona.answerStrategy('any question', 'freetext', [], i)
          history.push(makeAnswer(answer))
        }
        const fatigue = computeFatigueScore(history)
        const { adjustedCount } = applyFatigueAdjustment(ESCALATION.SURFACE_Q1, fatigue)
        expect(adjustedCount).toBeGreaterThan(0)
      })
    })
  }
})
