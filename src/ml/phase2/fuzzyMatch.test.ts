import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fuzzyMatch,
  findSimilarTransactions,
  calculateFuzzyConfidence,
} from '@/ml/phase2/fuzzyMatch';
import type { Transaction } from '@/types';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    description: 'STARBUCKS #123',
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
    description: 'WALMART STORE 456',
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
    description: 'Shell Gas Station',
    amount: -50.0,
    currency: 'USD',
    category: 'Transportation',
    confidence: 0.85,
    isManuallyEdited: false,
  },
];

describe('Phase 2 - Fuzzy Match', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when description is empty', () => {
    const result = fuzzyMatch('', mockTransactions);
    expect(result).toBeNull();
  });

  it('should return null when historical data is empty', () => {
    const result = fuzzyMatch('Test Transaction', []);
    expect(result).toBeNull();
  });

  it('should return null when no matches found below threshold', () => {
    const result = fuzzyMatch('Completely Different Text', mockTransactions);
    expect(result).toBeNull();
  });

  it('should find fuzzy match for similar descriptions', () => {
    const result = fuzzyMatch('STARBUCKS #456', mockTransactions);
    expect(result).not.toBeNull();
    expect(result?.category).toBe('Food & Dining');
    expect(result?.subcategory).toBe('Coffee Shops');
    expect(result?.method).toBe('fuzzy-match');
  });

  it('should find fuzzy match ignoring case', () => {
    const result = fuzzyMatch('walmart store 789', mockTransactions);
    expect(result).not.toBeNull();
    expect(result?.category).toBe('Shopping');
  });

  it('should return confidence as percentage', () => {
    const result = fuzzyMatch('WALMART STORE', mockTransactions);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBeGreaterThanOrEqual(0);
    expect(result?.confidence).toBeLessThanOrEqual(100);
  });

  it('should include reason in suggestion', () => {
    const result = fuzzyMatch('STARBUCKS #456', mockTransactions);
    expect(result).not.toBeNull();
    expect(result?.reason).toContain('Fuzzy match');
    expect(result?.reason).toContain('similarity');
  });

  it('should find similar transactions', () => {
    const similar = findSimilarTransactions('STARBUCKS', mockTransactions);
    expect(similar).toHaveLength(1);
    const [firstResult] = similar;
    if (firstResult && firstResult.category) {
      expect(firstResult.category).toBe('Food & Dining');
    }
  });

  it('should limit similar transactions results', () => {
    const similar = findSimilarTransactions('STARBUCKS', mockTransactions, 1);
    expect(similar.length).toBeLessThanOrEqual(1);
  });

  it('should return empty array for no similar transactions', () => {
    const similar = findSimilarTransactions(
      'Completely Different Text',
      mockTransactions
    );
    expect(similar).toHaveLength(0);
  });

  it('should calculate confidence from similarity', () => {
    const confidence = calculateFuzzyConfidence(0.8);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it('should apply minimum similarity threshold', () => {
    const confidence = calculateFuzzyConfidence(0.4);
    expect(confidence).toBeGreaterThanOrEqual(60);
  });

  it('should ignore transactions without category', () => {
    const transactionsWithoutCategory = [
      ...mockTransactions,
      {
        id: '4',
        date: new Date('2024-01-18'),
        description: 'No Category Transaction',
        amount: -10.0,
        currency: 'USD',
        isManuallyEdited: false,
      },
    ];

    const result = fuzzyMatch(
      'Category Transaction',
      transactionsWithoutCategory
    );
    // Should not match the uncategorized transaction
    if (result) {
      expect(result.category).toBeTruthy();
    }
  });
});
