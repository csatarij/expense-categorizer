import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  categorizeByKeywordRule,
  learnKeywordFromTransaction,
  calculateKeywordConfidence,
  mergeKeywordRules,
} from '@/ml/phase2/keywordRule';
import { DEFAULT_CATEGORIES } from '@/data/categories';

interface KeywordRule {
  category: string;
  subcategory?: string | undefined;
  keywords: string[];
  priority: number;
}

interface TransactionForLearning {
  entity: string;
  category: string;
  subcategory?: string;
}

describe('Phase 2 - Keyword Rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('categorizeByKeywordRule', () => {
    it('should return null for empty description', () => {
      const result = categorizeByKeywordRule('', DEFAULT_CATEGORIES);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only description', () => {
      const result = categorizeByKeywordRule('   ', DEFAULT_CATEGORIES);
      expect(result).toBeNull();
    });

    it('should categorize using keyword rules', () => {
      const result = categorizeByKeywordRule(
        'Purchase at STARBUCKS',
        DEFAULT_CATEGORIES
      );
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food & Dining');
      // STARBUCKS matches Restaurants first in the default rules
      expect(result?.subcategory).toBeDefined();
    });

    it('should prioritize exact keyword matches', () => {
      const result = categorizeByKeywordRule(
        'McDonalds lunch',
        DEFAULT_CATEGORIES
      );
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food & Dining');
      // McDonalds matches Restaurants in default rules
      expect(result?.subcategory).toBeDefined();
    });

    it('should handle case-insensitive matching', () => {
      const result1 = categorizeByKeywordRule('MCDONALDS', DEFAULT_CATEGORIES);
      const result2 = categorizeByKeywordRule('mcdonalds', DEFAULT_CATEGORIES);
      const result3 = categorizeByKeywordRule('McDonaldS', DEFAULT_CATEGORIES);

      expect(result1?.category).toBe('Food & Dining');
      expect(result2?.category).toBe('Food & Dining');
      expect(result3?.category).toBe('Food & Dining');
    });

    it('should return confidence score', () => {
      const result = categorizeByKeywordRule(
        'Netflix subscription',
        DEFAULT_CATEGORIES
      );
      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(100);
    });

    it('should include reason in suggestion', () => {
      const result = categorizeByKeywordRule('Shell gas', DEFAULT_CATEGORIES);
      expect(result).not.toBeNull();
      expect(result?.reason).toContain('Keyword match');
    });

    it('should handle custom rules', () => {
      const customRules: KeywordRule[] = [
        {
          category: 'Custom',
          keywords: ['uniquekeyword'],
          priority: 1,
        },
      ];

      const result = categorizeByKeywordRule(
        'uniquekeyword test',
        DEFAULT_CATEGORIES,
        customRules
      );
      expect(result?.category).toBe('Custom');
    });

    it('should apply subcategory when available', () => {
      const result = categorizeByKeywordRule(
        'Target shopping',
        DEFAULT_CATEGORIES
      );
      expect(result).not.toBeNull();
      expect(result?.subcategory).toBeTruthy();
    });
  });

  describe('learnKeywordFromTransaction', () => {
    it('should return null for transaction without category', () => {
      const transaction = {
        entity: 'Some description',
        isManuallyEdited: false,
      };

      // @ts-expect-error - Testing invalid input
      const rule = learnKeywordFromTransaction(transaction);
      expect(rule).toBeNull();
    });

    it('should create new rule from transaction', () => {
      const transaction: TransactionForLearning = {
        entity: 'New Merchant Store',
        category: 'Shopping',
        subcategory: 'Electronics',
      };

      const rule = learnKeywordFromTransaction(transaction);
      expect(rule).not.toBeNull();
      expect(rule?.category).toBe('Shopping');
      expect(rule?.subcategory).toBe('Electronics');
    });

    it('should extract keywords from description', () => {
      const transaction: TransactionForLearning = {
        entity: 'Amazon Web Services',
        category: 'Shopping',
      };

      const rule = learnKeywordFromTransaction(transaction);
      expect(rule).not.toBeNull();
      expect(rule?.keywords).toContain('amazon');
      expect(rule?.keywords).toContain('web');
      expect(rule?.keywords).toContain('services');
    });

    it('should filter short keywords', () => {
      const transaction: TransactionForLearning = {
        entity: 'AB',
        category: 'Shopping',
      };

      const rule = learnKeywordFromTransaction(transaction);
      expect(rule).toBeNull();
    });
  });

  describe('calculateKeywordConfidence', () => {
    it('should return positive confidence', () => {
      const confidence = calculateKeywordConfidence('test');
      expect(confidence).toBeGreaterThan(0);
    });

    it('should return confidence below 100', () => {
      const confidence = calculateKeywordConfidence('test');
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should add bonus for exact word match', () => {
      const exactWordConf = calculateKeywordConfidence('exactword');
      const wildcardConf = calculateKeywordConfidence('exactword*');

      expect(exactWordConf).toBeGreaterThan(wildcardConf);
    });

    it('should add bonus for multi-word keywords', () => {
      const singleWordConf = calculateKeywordConfidence('single');
      const multiWordConf = calculateKeywordConfidence('multiple words');

      expect(multiWordConf).toBeGreaterThan(singleWordConf);
    });
  });

  describe('mergeKeywordRules', () => {
    it('should merge different category rules', () => {
      const existingRules: KeywordRule[] = [
        {
          category: 'Food',
          keywords: ['pizza'],
          priority: 1,
        },
      ];

      const newRules: KeywordRule[] = [
        {
          category: 'Transport',
          keywords: ['gas'],
          priority: 1,
        },
      ];

      const merged = mergeKeywordRules(existingRules, newRules);
      expect(merged.length).toBe(2);
    });

    it('should merge keywords for same category', () => {
      const existingRules: KeywordRule[] = [
        {
          category: 'Food',
          subcategory: 'Restaurants',
          keywords: ['pizza'],
          priority: 1,
        },
      ];

      const newRules: KeywordRule[] = [
        {
          category: 'Food',
          subcategory: 'Restaurants',
          keywords: ['burger'],
          priority: 1,
        },
      ];

      const merged = mergeKeywordRules(existingRules, newRules);
      const mergedFirst = merged[0];
      expect(merged.length).toBe(1);
      expect(mergedFirst?.keywords).toContain('pizza');
      expect(mergedFirst?.keywords).toContain('burger');
    });

    it('should maximize priority for merged rules', () => {
      const existingRules: KeywordRule[] = [
        {
          category: 'Food',
          keywords: ['pizza'],
          priority: 1,
        },
      ];

      const newRules: KeywordRule[] = [
        {
          category: 'Food',
          keywords: ['burger'],
          priority: 3,
        },
      ];

      const merged = mergeKeywordRules(existingRules, newRules);
      const mergedFirst = merged[0];
      expect(mergedFirst?.priority).toBe(3);
    });

    it('should remove duplicate keywords', () => {
      const existingRules: KeywordRule[] = [
        {
          category: 'Food',
          keywords: ['pizza', 'burger'],
          priority: 1,
        },
      ];

      const newRules: KeywordRule[] = [
        {
          category: 'Food',
          keywords: ['pizza', 'fries'],
          priority: 1,
        },
      ];

      const merged = mergeKeywordRules(existingRules, newRules);
      const mergedFirst = merged[0];
      const pizzaCount =
        mergedFirst?.keywords.filter((k) => k === 'pizza').length ?? 0;
      expect(pizzaCount).toBe(1);
    });
  });
});
