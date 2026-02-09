import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  categorizeByTFIDF,
  findSimilarByTFIDF,
  trainTFIDFModel,
  getCachedModel,
  setCachedModel,
  calculateTFIDFConfidence,
} from '@/ml/phase2/tfidfSimilarity';
import type { Transaction } from '@/types';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    entity: 'STARBUCKS COFFEE SHOP',
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
    entity: 'WALMART GROCERY STORE',
    amount: -45.67,
    currency: 'USD',
    category: 'Shopping',
    subcategory: 'Groceries',
    confidence: 0.9,
    isManuallyEdited: false,
  },
  {
    id: '3',
    date: new Date('2024-01-17'),
    entity: 'SHELL GAS STATION FUEL',
    amount: -50.0,
    currency: 'USD',
    category: 'Transportation',
    confidence: 0.85,
    isManuallyEdited: false,
  },
];

describe('Phase 2 - TF-IDF Similarity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('categorizeByTFIDF', () => {
    it('should return null for empty description', () => {
      const result = categorizeByTFIDF('', mockTransactions);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only description', () => {
      const result = categorizeByTFIDF('   ', mockTransactions);
      expect(result).toBeNull();
    });

    it('should return null when historical data is empty', () => {
      const result = categorizeByTFIDF('Test Transaction', []);
      expect(result).toBeNull();
    });

    it('should find similar description by TF-IDF', () => {
      const result = categorizeByTFIDF('STARBUCKS COFFEE', mockTransactions);
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food & Dining');
      expect(result?.method).toBe('tfidf-similarity');
    });

    it('should return confidence score', () => {
      const result = categorizeByTFIDF('WALMART STORE', mockTransactions);
      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThanOrEqual(0);
      expect(result?.confidence).toBeLessThanOrEqual(100);
    });

    it('should include reason in suggestion', () => {
      const result = categorizeByTFIDF('SHELL FUEL', mockTransactions);
      expect(result).not.toBeNull();
      expect(result?.reason).toContain('TF-IDF');
      expect(result?.reason).toContain('similarity');
    });

    it('should include subcategory when available', () => {
      const result = categorizeByTFIDF('STARBUCKS COFFEE', mockTransactions);
      expect(result).not.toBeNull();
      expect(result?.subcategory).toBe('Coffee Shops');
    });

    it('should handle custom threshold', () => {
      const result = categorizeByTFIDF('Different text', mockTransactions, 0.9);
      expect(result).toBeNull();
    });

    it('should ignore transactions without category', () => {
      const transactionsWithoutCategory: Transaction[] = [
        ...mockTransactions,
        {
          id: '4',
          date: new Date('2024-01-18'),
          entity: 'No Category Transaction',
          amount: -10.0,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const result = categorizeByTFIDF(
        'Test Transaction',
        transactionsWithoutCategory
      );
      if (result) {
        expect(result.category).toBeTruthy();
      }
    });

    it('should return null when similarity is below minimum', () => {
      const result = categorizeByTFIDF(
        'Completely Different Description Here',
        mockTransactions
      );
      expect(result).toBeNull();
    });
  });

  describe('findSimilarByTFIDF', () => {
    it('should return empty array for empty description', () => {
      const result = findSimilarByTFIDF('', mockTransactions);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty historical data', () => {
      const result = findSimilarByTFIDF('Test Transaction', []);
      expect(result).toHaveLength(0);
    });

    it('should find similar transactions', () => {
      const result = findSimilarByTFIDF('COFFEE SHOP', mockTransactions);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.transaction.category).toBe('Food & Dining');
    });

    it('should include similarity score in results', () => {
      const result = findSimilarByTFIDF('GAS FUEL', mockTransactions);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.similarity).toBeGreaterThanOrEqual(0);
      expect(result[0]?.similarity).toBeLessThanOrEqual(1);
    });

    it('should limit results to specified limit', () => {
      const result = findSimilarByTFIDF('GROCERY STORE', mockTransactions, 1);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should filter results below minimum similarity', () => {
      const result = findSimilarByTFIDF(
        'Completely Different Description',
        mockTransactions
      );
      expect(result).toHaveLength(0);
    });

    it('should sort results by similarity descending', () => {
      const result = findSimilarByTFIDF('STARBUCKS WALMART', mockTransactions);
      for (let i = 1; i < result.length; i++) {
        expect(result[i]?.similarity).toBeLessThanOrEqual(
          result[i - 1]?.similarity ?? 0
        );
      }
    });
  });

  describe('trainTFIDFModel', () => {
    it('should train model with transactions', () => {
      const model = trainTFIDFModel(mockTransactions);
      expect(model).toBeDefined();
      expect(model.corpus).toHaveLength(mockTransactions.length);
      expect(model.vocabulary.length).toBeGreaterThan(0);
      expect(model.documentFrequency.size).toBeGreaterThan(0);
    });

    it('should return empty model for empty transactions', () => {
      const model = trainTFIDFModel([]);
      expect(model).toBeDefined();
      expect(model.corpus).toHaveLength(0);
      expect(model.vocabulary).toHaveLength(0);
      expect(model.documentFrequency.size).toBe(0);
    });

    it('should ignore transactions without category', () => {
      const transactionsWithoutCategory: Transaction[] = [
        ...mockTransactions,
        {
          id: '4',
          date: new Date('2024-01-18'),
          entity: 'No Category Transaction',
          amount: -10.0,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const model = trainTFIDFModel(transactionsWithoutCategory);
      expect(model.corpus.length).toBeLessThan(
        transactionsWithoutCategory.length
      );
    });
  });

  describe('getCachedModel', () => {
    it('should return cached model after training', () => {
      trainTFIDFModel(mockTransactions);
      const modelAfter = getCachedModel();
      expect(modelAfter).not.toBeNull();
      expect(modelAfter?.corpus).toBeDefined();
    });
  });

  describe('setCachedModel', () => {
    it('should set cached model', () => {
      const customModel = {
        corpus: ['test transaction'],
        vocabulary: ['test', 'transaction'],
        documentFrequency: new Map([
          ['test', 1],
          ['transaction', 1],
        ]),
      };

      setCachedModel(customModel);
      const model = getCachedModel();
      expect(model).not.toBeNull();
      expect(model?.corpus).toEqual(customModel.corpus);
    });
  });

  describe('calculateTFIDFConfidence', () => {
    it('should calculate confidence from similarity', () => {
      const confidence = calculateTFIDFConfidence(0.7);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should boost confidence by at least 20', () => {
      const similarity = 0.5;
      const confidence = calculateTFIDFConfidence(similarity);
      const expectedMinimum = Math.round(Math.min(100, similarity * 100 + 20));
      expect(confidence).toBeGreaterThanOrEqual(expectedMinimum);
    });

    it('should cap confidence at 100', () => {
      const confidence = calculateTFIDFConfidence(1.0);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should return non-negative confidence', () => {
      const confidence = calculateTFIDFConfidence(0);
      expect(confidence).toBeGreaterThanOrEqual(0);
    });

    it('should round confidence to integer', () => {
      const confidence = calculateTFIDFConfidence(0.758);
      expect(Number.isInteger(confidence)).toBe(true);
    });
  });
});
