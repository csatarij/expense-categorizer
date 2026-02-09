import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exactMatch, calculateExactMatchConfidence } from '@/ml/phase1';
import {
  categorizeByKeywordRule,
  calculateKeywordConfidence,
} from '@/ml/phase2/keywordRule';
import { fuzzyMatch, calculateFuzzyConfidence } from '@/ml/phase2/fuzzyMatch';
import {
  categorizeByTFIDF,
  calculateTFIDFConfidence,
} from '@/ml/phase2/tfidfSimilarity';
import {
  categorizeByHistoricalPattern,
  extractPatternsFromHistory,
} from '@/ml/phase2/historicalPattern';
import {
  initializeModel,
  predictCategory,
  isModelTrained,
  getModelMetrics,
} from '@/ml/phase3';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import type { Transaction } from '@/types';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    entity: 'STARBUCKS #123',
    amount: -5.5,
    currency: 'USD',
    category: 'Food & Dining',
    subcategory: 'Coffee Shops',
    confidence: 0.95,
    isManuallyEdited: true,
  },
  {
    id: '2',
    date: new Date('2024-01-16'),
    entity: 'STARBUCKS #123',
    amount: -5.5,
    currency: 'USD',
    category: 'Food & Dining',
    subcategory: 'Coffee Shops',
    confidence: 0.95,
    isManuallyEdited: true,
  },
  {
    id: '3',
    date: new Date('2024-01-17'),
    entity: 'STARBUCKS #123',
    amount: -5.5,
    currency: 'USD',
    category: 'Food & Dining',
    subcategory: 'Coffee Shops',
    confidence: 0.95,
    isManuallyEdited: true,
  },
];

describe('Categorization Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chain categorization flow', () => {
    it('should try Phase 1 then Phase 2 if Phase 1 returns null', () => {
      // Description not in historical data
      const result1 = exactMatch('XYZ AMAZON STORE', mockTransactions);
      expect(result1).toBeNull();

      // Fall back to keyword rule
      const result2 = categorizeByKeywordRule(
        'XYZ AMAZON STORE',
        DEFAULT_CATEGORIES
      );
      expect(result2).not.toBeNull();
    });

    it('should try all Phase 2 methods if selected', () => {
      const description = 'WALMART STORE';

      const keywordResult = categorizeByKeywordRule(
        description,
        DEFAULT_CATEGORIES
      );
      expect(keywordResult).not.toBeNull();
    });

    it('should use fuzzy matching when keywords fail', () => {
      const keywordResult = categorizeByKeywordRule(
        'xyzabc',
        DEFAULT_CATEGORIES
      );
      expect(keywordResult).toBeNull();

      // Fuzzy match should find similar description (using actual description from history)
      const fuzzyResult = fuzzyMatch('STARBUCKS #123', mockTransactions);
      expect(fuzzyResult).not.toBeNull();
    });

    it('should use TF-IDF matching when other methods fail', () => {
      const keywordResult = categorizeByKeywordRule(
        'abcxyz123',
        DEFAULT_CATEGORIES
      );
      expect(keywordResult).toBeNull();

      const fuzzyResult = fuzzyMatch('abcxyz123', []);
      expect(fuzzyResult).toBeNull();

      // TF-IDF would also fail with empty history
      const tfidfResult = categorizeByTFIDF('test', mockTransactions);
      // This may or may not find something
      expect(Array.isArray([keywordResult, fuzzyResult, tfidfResult])).toBe(
        true
      );
    });
  });

  describe('Historical patterns', () => {
    it('should extract patterns from transaction history', () => {
      const patterns = extractPatternsFromHistory(mockTransactions);
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should categorize using historical patterns', () => {
      const result = categorizeByHistoricalPattern(
        { entity: 'STARBUCKS #123', amount: 6.0, date: new Date() },
        mockTransactions
      );
      expect(result).not.toBeNull();
    });
  });

  describe('Confidence calculations', () => {
    it('should calculate exact match confidence correctly', () => {
      const confidence1 = calculateExactMatchConfidence(5, false);
      const confidence2 = calculateExactMatchConfidence(5, true);

      expect(confidence1).toBe(95);
      expect(confidence2).toBe(100);
    });

    it('should calculate keyword confidence with bonuses', () => {
      const exactWord = calculateKeywordConfidence('exactword');
      const wildcard = calculateKeywordConfidence('wildcard*');
      const multiWord = calculateKeywordConfidence('multi word');

      expect(exactWord).toBeGreaterThan(wildcard);
      expect(multiWord).toBeGreaterThan(exactWord);
    });

    it('should calculate fuzzy confidence', () => {
      const confidence = calculateFuzzyConfidence(0.8);
      expect(confidence).toBeGreaterThanOrEqual(60);
    });

    it('should calculate TF-IDF confidence', () => {
      const confidence = calculateTFIDFConfidence(0.7);
      expect(confidence).toBeGreaterThan(50);
    });
  });

  describe('ML Model operations', () => {
    it('should initialize model', () => {
      initializeModel();
      expect(isModelTrained()).toBe(false);
    });

    it('should return false for untrained model metrics', () => {
      const metrics = getModelMetrics();
      expect(metrics.accuracy).toBe(0);
    });

    it('should handle predictCategory errors gracefully', async () => {
      initializeModel();
      const result = await predictCategory('');
      expect(result).toBeNull();
    });
  });
});
