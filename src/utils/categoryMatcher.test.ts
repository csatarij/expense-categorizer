import { describe, it, expect } from 'vitest';
import {
  parseAndMatchCategories,
  extractLearningRules,
} from './categoryMatcher';
import type { Transaction } from '@/types';

describe('categoryMatcher', () => {
  it('should match categories from uploaded file', () => {
    const rows = [
      {
        Date: '2024-01-15',
        Entity: 'WALMART SUPERCENTER',
        Amount: -87.43,
        Category: 'Food & Dining',
        Subcategory: 'Groceries',
      },
      {
        Date: '2024-01-16',
        Entity: 'SHELL GAS STATION',
        Amount: -45.0,
        Category: 'Transportation',
        Subcategory: 'Gas',
      },
      {
        Date: '2024-01-17',
        Entity: 'NETFLIX SUBSCRIPTION',
        Amount: -15.99,
        Category: 'Entertainment',
        Subcategory: 'Streaming Services',
      },
    ];

    const result = parseAndMatchCategories(rows);

    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[0]?.category).toBe('Food & Dining');
    expect(result.transactions[0]?.subcategory).toBe('Groceries');
    expect(result.transactions[1]?.category).toBe('Transportation');
    expect(result.transactions[1]?.subcategory).toBe('Gas');
    expect(result.transactions[2]?.category).toBe('Entertainment');
    expect(result.transactions[2]?.subcategory).toBe('Streaming Services');
  });

  it('should handle fuzzy matching for similar categories', () => {
    const rows = [
      {
        Date: '2024-01-15',
        Entity: 'WALMART SUPERCENTER',
        Amount: -87.43,
        Category: 'Food and Dining',
        Subcategory: 'Groceries',
      },
      {
        Date: '2024-01-16',
        Entity: 'SHELL GAS STATION',
        Amount: -45.0,
        Category: 'Transportation',
        Subcategory: 'Fuel',
      },
    ];

    const result = parseAndMatchCategories(rows);

    expect(result.transactions[0]?.category).toBe('Food & Dining');
    expect(result.transactions[0]?.subcategory).toBe('Groceries');
    expect(result.transactions[1]?.category).toBe('Transportation');
    expect(result.transactions[1]?.subcategory).toBe('');
  });

  it('should identify unmatched categories', () => {
    const rows = [
      {
        Date: '2024-01-15',
        Entity: 'WALMART SUPERCENTER',
        Amount: -87.43,
        Category: 'Food & Dining',
        Subcategory: 'Groceries',
      },
      {
        Date: '2024-01-16',
        Entity: 'UNKNOWN STORE',
        Amount: -45.0,
        Category: 'Random Category',
        Subcategory: 'Random Subcategory',
      },
    ];

    const result = parseAndMatchCategories(rows);

    expect(result.unmatchedCategories).toContain('Random Category');
    expect(result.unmatchedCategories).toContain('Random Subcategory');
    expect(result.transactions[1]?.category).toBe('Uncategorized');
  });

  it('should create category mapping', () => {
    const rows = [
      {
        Date: '2024-01-15',
        Entity: 'WALMART SUPERCENTER',
        Amount: -87.43,
        Category: 'Food & Dining',
        Subcategory: 'Groceries',
      },
      {
        Date: '2024-01-16',
        Entity: 'SHELL GAS STATION',
        Amount: -45.0,
        Category: 'Transportation',
        Subcategory: 'Gas',
      },
    ];

    const result = parseAndMatchCategories(rows);

    expect(result.categoryMapping['Food & Dining']).toEqual({
      category: 'Food & Dining',
      subcategory: 'Groceries',
      confidence: expect.any(Number) as unknown,
    });
    expect(result.categoryMapping['Transportation']).toEqual({
      category: 'Transportation',
      subcategory: 'Gas',
      confidence: expect.any(Number) as unknown,
    });
  });

  it('should extract learning rules from transactions', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: new Date('2024-01-15'),
        entity: 'WALMART SUPERCENTER #1234',
        amount: -87.43,
        currency: 'USD',
        category: 'Food & Dining',
        subcategory: 'Groceries',
        confidence: 0.95,
        isManuallyEdited: false,
        metadata: {
          source: 'upload',
          fileName: 'test.csv',
          fileId: 'file-1',
          rowIndex: 0,
          rawData: {},
        },
      },
      {
        id: '2',
        date: new Date('2024-01-16'),
        entity: 'SHELL GAS STATION',
        amount: -45.0,
        currency: 'USD',
        category: 'Transportation',
        subcategory: 'Gas',
        confidence: 0.9,
        isManuallyEdited: false,
      },
    ];

    const rules = extractLearningRules(transactions);

    expect(rules).toHaveLength(2);
    expect(rules[0]?.pattern).toBe('WALMART SUPERCENTER');
    expect(rules[0]?.category).toBe('Food & Dining');
    expect(rules[0]?.subcategory).toBe('Groceries');
    expect(rules[1]?.pattern).toBe('SHELL GAS');
    expect(rules[1]?.category).toBe('Transportation');
    expect(rules[1]?.subcategory).toBe('Gas');
  });

  it('should throw error when no category column found', () => {
    const rows = [
      {
        Date: '2024-01-15',
        Entity: 'WALMART SUPERCENTER',
        Amount: -87.43,
      },
    ];

    expect(() => parseAndMatchCategories(rows)).toThrow(
      'No category column found in uploaded file'
    );
  });

  it('should handle files without subcategory columns', () => {
    const rows = [
      {
        Date: '2024-01-15',
        Entity: 'WALMART SUPERCENTER',
        Amount: -87.43,
        Category: 'Food & Dining',
      },
      {
        Date: '2024-01-16',
        Entity: 'SHELL GAS STATION',
        Amount: -45.0,
        Category: 'Transportation',
      },
    ];

    const result = parseAndMatchCategories(rows);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]?.category).toBe('Food & Dining');
    expect(result.transactions[1]?.category).toBe('Transportation');
  });

  it('should handle various column naming conventions', () => {
    const rows = [
      {
        TransactionDate: '2024-01-15',
        Merchant: 'WALMART SUPERCENTER',
        Value: -87.43,
        cat: 'Food & Dining',
        sub: 'Groceries',
      },
    ];

    const result = parseAndMatchCategories(rows);

    expect(result.transactions[0]?.category).toBe('Food & Dining');
    expect(result.transactions[0]?.subcategory).toBe('Groceries');
  });

  it('should calculate proper confidence scores', () => {
    const rows = [
      {
        Date: '2024-01-15',
        Entity: 'WALMART SUPERCENTER',
        Amount: -87.43,
        Category: 'Food & Dining',
        Subcategory: 'Groceries',
      },
      {
        Date: '2024-01-16',
        Entity: 'SOME RANDOM PLACE',
        Amount: -45.0,
        Category: 'Random Wrong Category',
        Subcategory: 'Random Subcategory',
      },
    ];

    const result = parseAndMatchCategories(rows);

    expect(result.transactions[0]?.confidence).toBeGreaterThan(0.5);
    expect(result.transactions[1]?.confidence).toBeLessThan(0.5);
  });
});
