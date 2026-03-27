import type { InteractionNode } from '../types'

/**
 * Prevents the system from asking the same semantic question twice.
 * Uses a simple hash of (decisionCategory + normalized question text) to
 * detect duplicates without needing a vector DB.
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractKeyTerms(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up',
    'about', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'this', 'that', 'these', 'those', 'your', 'you', 'what',
    'how', 'who', 'which', 'when', 'where', 'why', 'want', 'like',
  ])
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length > 2 && !stopWords.has(w))
}

export function computeSemanticHash(question: string, category: string): string {
  const terms = extractKeyTerms(question).sort().slice(0, 5).join('_')
  return `${category}::${terms}`
}

export interface NoveltyCheckResult {
  isNovel: boolean
  reason?: string
  matchedHash?: string
}

export function checkNovelty(
  questionText: string,
  category: string,
  interactionHistory: InteractionNode[]
): NoveltyCheckResult {
  const hash = computeSemanticHash(questionText, category)

  const existing = interactionHistory.find((node) => node.semanticHash === hash)

  if (existing) {
    return {
      isNovel: false,
      reason: `This question (${category}) was already addressed`,
      matchedHash: hash,
    }
  }

  return { isNovel: true }
}

export function filterNovelQuestions<T extends { question: string; category: string }>(
  candidates: T[],
  interactionHistory: InteractionNode[]
): T[] {
  const seen = new Set<string>()
  return candidates.filter((q) => {
    const hash = computeSemanticHash(q.question, q.category)
    const alreadyAnswered = interactionHistory.some((n) => n.semanticHash === hash)
    if (alreadyAnswered || seen.has(hash)) return false
    seen.add(hash)
    return true
  })
}
