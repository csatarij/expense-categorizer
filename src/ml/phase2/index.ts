/**
 * Phase 2: Pattern matching & learning with user feedback
 *
 * This phase provides intelligent categorization using multiple techniques:
 * - Fuzzy matching for similar descriptions
 * - Keyword rules for category heuristics
 * - TF-IDF similarity for semantic matching
 * - Historical pattern learning from user behavior
 */

export {
  fuzzyMatch,
  findSimilarTransactions,
  calculateFuzzyConfidence,
} from './fuzzyMatch';

export {
  categorizeByKeywordRule,
  learnKeywordFromTransaction,
  calculateKeywordConfidence,
  mergeKeywordRules,
} from './keywordRule';

export {
  categorizeByTFIDF,
  findSimilarByTFIDF,
  trainTFIDFModel,
  getCachedModel,
  setCachedModel,
  calculateTFIDFConfidence,
} from './tfidfSimilarity';

export {
  PatternLearner,
  categorizeByHistoricalPattern,
  extractPatternsFromHistory,
} from './historicalPattern';
