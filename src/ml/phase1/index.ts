/**
 * Phase 1: Rule-based categorization using exact matching
 *
 * This phase provides high-confidence categorization for transactions
 * that exactly match previously categorized transactions in the user's history.
 */

export {
  exactMatch,
  normalizeDescription,
  calculateExactMatchConfidence,
} from './exactMatch';
