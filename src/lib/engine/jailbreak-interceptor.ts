import type { JailbreakResult } from '../types'
import { ATTACK_PATTERNS } from '../config/jailbreak-patterns'

/**
 * Pattern-based defense covering all 10 attack classes.
 * Never flat-refuses — always redirects to nearest valid action.
 */
export function interceptJailbreak(userInput: string): JailbreakResult {
  for (const attackDef of ATTACK_PATTERNS) {
    for (const pattern of attackDef.patterns) {
      if (pattern.test(userInput)) {
        return {
          intercepted: true,
          attackClass: attackDef.class,
          suggestedResponse: attackDef.response,
          validAlternatives: attackDef.alternatives,
        }
      }
    }
  }
  return { intercepted: false }
}
