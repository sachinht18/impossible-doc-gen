export const ESCALATION = {
  /** Questions during orientation phase (before blueprint) */
  ORIENTATION_Q: 22,
  /** Questions for paragraph 1 */
  SURFACE_Q1: 20,
  /** Questions for paragraph 2 */
  SURFACE_Q2: 22,
  /** Questions for paragraph 3 (structural depth) */
  STRUCTURAL_Q3: 24,
  /** Questions for paragraph 4 (sentence-level unlocks here) */
  STRUCTURAL_Q4: 26,
  /** Base questions for paragraphs 5–8 */
  MID_BASE: 24,
  /** Slope for linear interpolation across paragraphs 5–8 */
  MID_SLOPE: 1.5,
  /** Maximum bonus questions for late paragraphs */
  MAX_BONUS: 5,
  /** Absolute maximum questions per paragraph */
  MAX_QUESTIONS: 30,
  /** Progress threshold that triggers a boost */
  BOOST_THRESHOLD: 0.7,
  /** How many extra questions to add when boost fires */
  BOOST_AMOUNT: 4,
  /** Paragraph index (1-based) at which sentence-level depth unlocks */
  SENTENCE_LEVEL_UNLOCK_PARA: 3,
  /** Fire a partial preview draft every N answers during paragraph_planning */
  PARTIAL_GENERATION_THRESHOLD: 3,
  /** Dynamic inconsistency check interval: min answers between checks */
  INCONSISTENCY_CHECK_MIN: 4,
  /** Dynamic inconsistency check interval: max answers between checks */
  INCONSISTENCY_CHECK_MAX: 8,
  /** Base question count used for fatigue adjustment calculations */
  BASE_QUESTION_COUNT: 6,
} as const
