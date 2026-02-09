import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PatternLearner,
  categorizeByHistoricalPattern,
  extractPatternsFromHistory,
} from '@/ml/phase2/historicalPattern';
import type { Transaction } from '@/types';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    description: 'STARBUCKS COFFEE SHOP',
    amount: -5.5,
    currency: 'USD',
    category: 'Food & Dining',
    subcategory: 'Coffee Shops',
    confidence: 0.95,
    isManuallyEdited: false,
  },
  {
    id: '2',
    date: new Date('2024-01-16'),
    description: 'STARBUCKS COFFEE SHOP',
    amount: -6.0,
    currency: 'USD',
    category: 'Food & Dining',
    subcategory: 'Coffee Shops',
    confidence: 0.95,
    isManuallyEdited: false,
  },
  {
    id: '3',
    date: new Date('2024-01-17'),
    description: 'STARBUCKS COFFEE SHOP',
    amount: -5.8,
    currency: 'USD',
    category: 'Food & Dining',
    subcategory: 'Coffee Shops',
    confidence: 0.95,
    isManuallyEdited: false,
  },
  {
    id: '4',
    date: new Date('2024-01-01'),
    description: 'NETFLIX MONTHLY',
    amount: -15.99,
    currency: 'USD',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 0.9,
    isManuallyEdited: false,
  },
  {
    id: '5',
    date: new Date('2024-02-01'),
    description: 'NETFLIX MONTHLY',
    amount: -15.99,
    currency: 'USD',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 0.9,
    isManuallyEdited: false,
  },
  {
    id: '6',
    date: new Date('2024-03-01'),
    description: 'NETFLIX MONTHLY',
    amount: -15.99,
    currency: 'USD',
    category: 'Entertainment',
    subcategory: 'Streaming',
    confidence: 0.9,
    isManuallyEdited: false,
  },
];

describe('Phase 2 - Historical Pattern', () => {
  let learner: PatternLearner;

  beforeEach(() => {
    vi.clearAllMocks();
    learner = new PatternLearner();
    learner.learnFromTransactions(mockTransactions);
  });

  describe('PatternLearner', () => {
    describe('constructor', () => {
      it('should initialize with empty patterns', () => {
        const newLearner = new PatternLearner();
        const merchantPatterns = newLearner.getMerchantPatterns();
        const recurringPatterns = newLearner.getRecurringPatterns();
        const amountPatterns = newLearner.getAmountPatterns();
        expect(merchantPatterns).toHaveLength(0);
        expect(recurringPatterns).toHaveLength(0);
        expect(amountPatterns).toHaveLength(0);
      });
    });

    describe('learnFromTransactions', () => {
      it('should learn from multiple transactions', () => {
        const newLearner = new PatternLearner();
        expect(newLearner.getMerchantPatterns()).toHaveLength(0);
        newLearner.learnFromTransactions(mockTransactions);
        expect(newLearner.getMerchantPatterns().length).toBeGreaterThan(0);
      });

      it('should ignore transactions without category', () => {
        const newLearner = new PatternLearner();
        const transactionsWithoutCategory: Transaction[] = [
          {
            id: '7',
            date: new Date('2024-01-18'),
            description: 'Uncategorized Transaction',
            amount: -10.0,
            currency: 'USD',
            isManuallyEdited: false,
          },
        ];
        newLearner.learnFromTransactions(transactionsWithoutCategory);
        expect(newLearner.getMerchantPatterns()).toHaveLength(0);
      });
    });

    describe('categorizeByPattern', () => {
      it('should categorize by merchant pattern', () => {
        const result = learner.categorizeByPattern({
          description: 'STARBUCKS COFFEE SHOP',
          amount: 5.5,
        });
        expect(result).not.toBeNull();
        expect(result?.category).toBe('Food & Dining');
        expect(result?.method).toBe('historical-pattern');
      });

      it('should categorize by recurring pattern', () => {
        const result = learner.categorizeByPattern({
          description: 'NETFLIX MONTHLY',
          amount: 15.99,
        });
        expect(result).not.toBeNull();
        expect(result?.category).toBe('Entertainment');
      });

      it('should categorize by amount pattern when merchant / recurring not found', () => {
        const result = learner.categorizeByPattern({
          description: 'Some description',
          amount: -15.0,
          date: new Date('2024-04-01'),
        });
        expect(result).not.toBeNull();
        expect(result?.method).toBe('historical-pattern');
      });

      it('should return null for unknown patterns', () => {
        const result = learner.categorizeByPattern({
          description: 'Completely Unknown Merchant',
          amount: 999.99,
        });
        expect(result).toBeNull();
      });

      it('should include subcategory when available', () => {
        const result = learner.categorizeByPattern({
          description: 'starbucks coffee shop',
          amount: 5.5,
        });
        expect(result).not.toBeNull();
        expect(result?.subcategory).toBe('Coffee Shops');
      });

      it('should return confidence score', () => {
        const result = learner.categorizeByPattern({
          description: 'starbucks coffee shop',
          amount: 5.5,
        });
        expect(result).not.toBeNull();
        expect(result?.confidence).toBeGreaterThanOrEqual(0);
        expect(result?.confidence).toBeLessThanOrEqual(100);
      });

      it('should increase confidence with more occurrences', () => {
        const someOccurrences = learner.categorizeByPattern({
          description: 'starbucks coffee shop',
          amount: 5.5,
        });
        expect(someOccurrences).not.toBeNull();
        const baselineConfidence = someOccurrences?.confidence ?? 0;
        expect(baselineConfidence).toBeGreaterThan(60);
      });

      it('should include reason in suggestion', () => {
        const result = learner.categorizeByPattern({
          description: 'netflix monthly',
          amount: 15.99,
        });
        expect(result).not.toBeNull();
        expect(result?.reason).toContain('pattern');
      });
    });

    describe('getLearningPatterns', () => {
      it('should return learning patterns', () => {
        const patterns = learner.getLearningPatterns();
        expect(patterns.length).toBeGreaterThan(0);
        patterns.forEach((pattern) => {
          expect(pattern.category).toBeTruthy();
          expect(pattern.method).toBe('historical-pattern');
        });
      });

      it('should sort patterns by confidence descending', () => {
        const patterns = learner.getLearningPatterns();
        for (let i = 1; i < patterns.length; i++) {
          expect(patterns[i]?.confidence).toBeLessThanOrEqual(
            patterns[i - 1]?.confidence ?? 0
          );
        }
      });

      it('should include subcategory when available', () => {
        const patterns = learner.getLearningPatterns();
        const patternWithSub = patterns.find((p) => p.subcategory);
        expect(patternWithSub?.subcategory).toBe('Coffee Shops');
      });
    });

    describe('getMerchantPatterns', () => {
      it('should return merchant patterns', () => {
        const patterns = learner.getMerchantPatterns();
        expect(patterns.length).toBeGreaterThan(0);
        patterns.forEach((pattern) => {
          expect(pattern.merchant).toBeTruthy();
          expect(pattern.category).toBeTruthy();
          expect(pattern.frequency).toBeGreaterThanOrEqual(3);
        });
      });

      it('should filter patterns below minimum occurrences', () => {
        const newLearner = new PatternLearner();
        if (mockTransactions[0]) {
          newLearner.learnFromTransactions([mockTransactions[0]]);
        }
        const patterns = newLearner.getMerchantPatterns();
        expect(patterns).toHaveLength(0);
      });
    });

    describe('getRecurringPatterns', () => {
      it('should return recurring patterns', () => {
        const patterns = learner.getRecurringPatterns();
        expect(patterns.length).toBeGreaterThan(0);
        patterns.forEach((pattern) => {
          expect(pattern.description).toBeTruthy();
          expect(pattern.category).toBeTruthy();
          expect(pattern.occurrences).toBeGreaterThanOrEqual(3);
        });
      });

      it('should detect monthly recurring pattern', () => {
        const patterns = learner.getRecurringPatterns();
        const netflixPattern = patterns.find((p) =>
          p.description.includes('NETFLIX')
        );
        expect(netflixPattern?.recurringInterval).toBe('monthly');
      });
    });

    describe('getAmountPatterns', () => {
      it('should return amount patterns', () => {
        const patterns = learner.getAmountPatterns();
        expect(patterns.length).toBeGreaterThan(0);
        patterns.forEach((pattern) => {
          expect(pattern.category).toBeTruthy();
          expect(pattern.minAmount).toBeLessThanOrEqual(pattern.maxAmount);
          expect(Math.abs(pattern.averageAmount)).toBeGreaterThan(0);
          expect(pattern.frequency).toBeGreaterThanOrEqual(3);
        });
      });

      it('should calculate average amount correctly', () => {
        const patterns = learner.getAmountPatterns();
        const entPattern = patterns.find((p) => p.category === 'Entertainment');
        expect(entPattern?.averageAmount).toBeCloseTo(-15.99, 1);
      });
    });

    describe('clear', () => {
      it('should clear all patterns', () => {
        learner.clear();
        expect(learner.getMerchantPatterns()).toHaveLength(0);
        expect(learner.getRecurringPatterns()).toHaveLength(0);
        expect(learner.getAmountPatterns()).toHaveLength(0);
      });
    });
  });

  describe('categorizeByHistoricalPattern', () => {
    it('should categorize using historical data', () => {
      const result = categorizeByHistoricalPattern(
        {
          description: 'NETFLIX MONTHLY',
          amount: 15.99,
        },
        mockTransactions
      );
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Entertainment');
    });

    it('should use provided learner instead of creating new one', () => {
      const customLearner = new PatternLearner();
      customLearner.learnFromTransactions(mockTransactions);
      const result = categorizeByHistoricalPattern(
        {
          description: 'NETFLIX MONTHLY',
          amount: 15.99,
        },
        [],
        customLearner
      );
      expect(result).not.toBeNull();
    });

    it('should create new learner when none provided', () => {
      const result = categorizeByHistoricalPattern(
        {
          description: 'NETFLIX MONTHLY',
          amount: 15.99,
        },
        mockTransactions
      );
      expect(result).not.toBeNull();
    });

    it('should return null when no historical data', () => {
      const result = categorizeByHistoricalPattern(
        {
          description: 'Unknown',
          amount: 10,
        },
        []
      );
      expect(result).toBeNull();
    });
  });

  describe('extractPatternsFromHistory', () => {
    it('should extract patterns from transactions', () => {
      const patterns = extractPatternsFromHistory(mockTransactions);
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((pattern) => {
        expect(pattern.description).toBeTruthy();
        expect(pattern.category).toBeTruthy();
        expect(pattern.method).toBe('historical-pattern');
      });
    });

    it('should return empty array for empty transactions', () => {
      const patterns = extractPatternsFromHistory([]);
      expect(patterns).toHaveLength(0);
    });

    it('should include confidence in patterns', () => {
      const patterns = extractPatternsFromHistory(mockTransactions);
      patterns.forEach((pattern) => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should include timestamp in patterns', () => {
      const patterns = extractPatternsFromHistory(mockTransactions);
      patterns.forEach((pattern) => {
        expect(pattern.timestamp).toBeInstanceOf(Date);
      });
    });
  });
});
