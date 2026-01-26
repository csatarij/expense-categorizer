import { describe, it, expect } from 'vitest';
import {
  normalizeDescription,
  calculateExactMatchConfidence,
  exactMatch,
} from './exactMatch';
import type { Transaction } from '@/types';

// Helper to create test transactions
function createTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: crypto.randomUUID(),
    date: new Date('2024-01-15'),
    description: 'Test Transaction',
    amount: 100,
    isManuallyEdited: false,
    ...overrides,
  };
}

describe('normalizeDescription', () => {
  it('should convert to lowercase', () => {
    expect(normalizeDescription('STARBUCKS')).toBe('starbucks');
    expect(normalizeDescription('McDonald\'s')).toBe('mcdonalds');
    expect(normalizeDescription('AMAZON.COM')).toBe('amazoncom');
  });

  it('should remove special characters except spaces', () => {
    expect(normalizeDescription('AMAZON.COM')).toBe('amazoncom');
    expect(normalizeDescription('McDonald\'s')).toBe('mcdonalds');
    expect(normalizeDescription('Whole Foods!')).toBe('whole foods');
  });

  it('should trim whitespace', () => {
    expect(normalizeDescription('  STARBUCKS  ')).toBe('starbucks');
    expect(normalizeDescription('\t\nAMAZON\n\t')).toBe('amazon');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeDescription('WHOLE   FOODS   MKT')).toBe('whole foods mkt');
    expect(normalizeDescription('target    item')).toBe('target item');
  });

  it('should handle store/location numbers', () => {
    expect(normalizeDescription('STARBUCKS #12345')).toBe('starbucks');
    expect(normalizeDescription('STARBUCKS #1')).toBe('starbucks');
    expect(normalizeDescription('TARGET STORE 123')).toBe('target');
    expect(normalizeDescription('WALMART STORE 4567')).toBe('walmart');
  });

  it('should handle asterisk prefixes', () => {
    expect(normalizeDescription('UBER *EATS')).toBe('uber eats');
    expect(normalizeDescription('LYFT **RIDE')).toBe('lyft ride');
    expect(normalizeDescription('SQ *COFFEE SHOP')).toBe('sq coffee shop');
  });

  it('should handle empty and invalid inputs', () => {
    expect(normalizeDescription('')).toBe('');
    expect(normalizeDescription(null as unknown as string)).toBe('');
    expect(normalizeDescription(undefined as unknown as string)).toBe('');
  });

  it('should handle various merchant name patterns', () => {
    expect(normalizeDescription('AMAZON.COM')).toBe('amazoncom');
    expect(normalizeDescription('STARBUCKS #12345')).toBe('starbucks');
    expect(normalizeDescription('McDonald\'s')).toBe('mcdonalds');
    expect(normalizeDescription('WHOLE FOODS MKT')).toBe('whole foods mkt');
    expect(normalizeDescription('UBER *EATS')).toBe('uber eats');
    expect(normalizeDescription('PAYPAL *SPOTIFY')).toBe('paypal spotify');
    expect(normalizeDescription('SQ *LOCAL CAFE')).toBe('sq local cafe');
    expect(normalizeDescription('AMZN MKTP US*ABC123')).toBe('amzn mktp us abc123');
  });
});

describe('calculateExactMatchConfidence', () => {
  it('should return 0 for no matches', () => {
    expect(calculateExactMatchConfidence(0, false)).toBe(0);
    expect(calculateExactMatchConfidence(0, true)).toBe(0);
  });

  it('should return 95% base confidence for non-manual matches', () => {
    expect(calculateExactMatchConfidence(1, false)).toBe(95);
    expect(calculateExactMatchConfidence(5, false)).toBe(95);
    expect(calculateExactMatchConfidence(100, false)).toBe(95);
  });

  it('should return 100% for manually edited matches', () => {
    expect(calculateExactMatchConfidence(1, true)).toBe(100);
    expect(calculateExactMatchConfidence(10, true)).toBe(100);
  });

  it('should cap confidence at 100%', () => {
    expect(calculateExactMatchConfidence(1000, true)).toBe(100);
  });
});

describe('exactMatch', () => {
  it('should find an exact match', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'STARBUCKS',
        category: 'Food & Dining',
        subcategory: 'Coffee Shops',
      }),
    ];

    const result = exactMatch('STARBUCKS', historicalData);

    expect(result).not.toBeNull();
    expect(result?.category).toBe('Food & Dining');
    expect(result?.subcategory).toBe('Coffee Shops');
    expect(result?.method).toBe('exact-match');
  });

  it('should perform case-insensitive matching', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'AMAZON.COM',
        category: 'Shopping',
      }),
    ];

    const result = exactMatch('amazon.com', historicalData);

    expect(result).not.toBeNull();
    expect(result?.category).toBe('Shopping');
  });

  it('should handle special character differences', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'MCDONALD\'S',
        category: 'Food & Dining',
        subcategory: 'Fast Food',
      }),
    ];

    const result = exactMatch('McDonalds', historicalData);

    expect(result).not.toBeNull();
    expect(result?.category).toBe('Food & Dining');
  });

  it('should normalize whitespace for matching', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'WHOLE FOODS MKT',
        category: 'Groceries',
      }),
    ];

    const result = exactMatch('WHOLE  FOODS  MKT', historicalData);

    expect(result).not.toBeNull();
    expect(result?.category).toBe('Groceries');
  });

  it('should prefer manually edited matches', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'STARBUCKS #001',
        category: 'Food & Dining',
        isManuallyEdited: false,
      }),
      createTransaction({
        description: 'STARBUCKS #002',
        category: 'Coffee',
        isManuallyEdited: true,
      }),
    ];

    const result = exactMatch('STARBUCKS #999', historicalData);

    expect(result).not.toBeNull();
    expect(result?.category).toBe('Coffee');
    expect(result?.confidence).toBe(100);
  });

  it('should calculate correct confidence for non-manual matches', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'TARGET',
        category: 'Shopping',
        isManuallyEdited: false,
      }),
    ];

    const result = exactMatch('TARGET', historicalData);

    expect(result).not.toBeNull();
    expect(result?.confidence).toBe(95);
  });

  it('should calculate correct confidence for manual matches', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'COSTCO',
        category: 'Groceries',
        isManuallyEdited: true,
      }),
    ];

    const result = exactMatch('COSTCO', historicalData);

    expect(result).not.toBeNull();
    expect(result?.confidence).toBe(100);
  });

  it('should return null when no match found', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'STARBUCKS',
        category: 'Food & Dining',
      }),
    ];

    const result = exactMatch('WALMART', historicalData);

    expect(result).toBeNull();
  });

  it('should return null for empty description', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'STARBUCKS',
        category: 'Food & Dining',
      }),
    ];

    expect(exactMatch('', historicalData)).toBeNull();
  });

  it('should return null for empty historical data', () => {
    expect(exactMatch('STARBUCKS', [])).toBeNull();
  });

  it('should handle empty description', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'STARBUCKS',
        category: 'Food & Dining',
      }),
    ];

    expect(exactMatch('', historicalData)).toBeNull();
  });

  it('should skip transactions without categories', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'STARBUCKS',
        // No category - should be skipped
      }),
      createTransaction({
        description: 'STARBUCKS',
        category: 'Coffee',
      }),
    ];

    const result = exactMatch('STARBUCKS', historicalData);

    expect(result).not.toBeNull();
    expect(result?.category).toBe('Coffee');
  });

  it('should generate appropriate reason for single match', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'NETFLIX',
        category: 'Entertainment',
        isManuallyEdited: false,
      }),
    ];

    const result = exactMatch('NETFLIX', historicalData);

    expect(result?.reason).toContain('1 identical transaction');
    expect(result?.reason).toContain('in history');
  });

  it('should generate appropriate reason for multiple matches', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'SPOTIFY',
        category: 'Entertainment',
      }),
      createTransaction({
        description: 'SPOTIFY',
        category: 'Entertainment',
      }),
      createTransaction({
        description: 'SPOTIFY',
        category: 'Entertainment',
      }),
    ];

    const result = exactMatch('SPOTIFY', historicalData);

    expect(result?.reason).toContain('3 identical transactions');
  });

  it('should generate appropriate reason for user-confirmed matches', () => {
    const historicalData: Transaction[] = [
      createTransaction({
        description: 'APPLE.COM',
        category: 'Technology',
        isManuallyEdited: true,
      }),
    ];

    const result = exactMatch('APPLE.COM', historicalData);

    expect(result?.reason).toContain('user-confirmed');
  });

  describe('merchant name pattern tests', () => {
    it('should match AMAZON.COM pattern', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'AMAZON.COM',
          category: 'Shopping',
          subcategory: 'Online Shopping',
        }),
      ];

      const result = exactMatch('amazon.com', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Shopping');
    });

    it('should match STARBUCKS with store numbers', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'STARBUCKS #12345',
          category: 'Food & Dining',
          subcategory: 'Coffee Shops',
        }),
      ];

      const result = exactMatch('STARBUCKS #99999', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food & Dining');
      expect(result?.subcategory).toBe('Coffee Shops');
    });

    it('should match McDonald\'s with apostrophe variations', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'MCDONALD\'S',
          category: 'Food & Dining',
          subcategory: 'Fast Food',
        }),
      ];

      const result = exactMatch('McDonalds', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food & Dining');
    });

    it('should match WHOLE FOODS MKT pattern', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'WHOLE FOODS MKT',
          category: 'Groceries',
        }),
      ];

      const result = exactMatch('Whole Foods Mkt', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Groceries');
    });

    it('should match UBER *EATS pattern', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'UBER *EATS',
          category: 'Food & Dining',
          subcategory: 'Food Delivery',
        }),
      ];

      const result = exactMatch('UBER* EATS', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food & Dining');
      expect(result?.subcategory).toBe('Food Delivery');
    });

    it('should match SQ * (Square) patterns', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'SQ *LOCAL COFFEE',
          category: 'Food & Dining',
        }),
      ];

      const result = exactMatch('SQ* LOCAL COFFEE', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food & Dining');
    });

    it('should match PAYPAL * patterns', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'PAYPAL *SPOTIFY',
          category: 'Entertainment',
          subcategory: 'Subscriptions',
        }),
      ];

      const result = exactMatch('PAYPAL*SPOTIFY', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Entertainment');
    });
  });

  describe('edge cases', () => {
    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(500) + ' STORE #12345';
      const historicalData: Transaction[] = [
        createTransaction({
          description: longDescription,
          category: 'Shopping',
        }),
      ];

      const result = exactMatch(longDescription, historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Shopping');
    });

    it('should handle descriptions with only special characters', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'TEST',
          category: 'Test',
        }),
      ];

      const result = exactMatch('***###!!!', historicalData);

      expect(result).toBeNull();
    });

    it('should handle unicode characters', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'CAFÉ EXPRESS',
          category: 'Food & Dining',
        }),
      ];

      const result = exactMatch('CAFE EXPRESS', historicalData);

      // Note: This will not match because unicode normalization
      // converts differently. This is expected behavior.
      expect(result).toBeNull();
    });

    it('should use first manually edited match when multiple exist', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'CHIPOTLE',
          category: 'Food',
          isManuallyEdited: true,
        }),
        createTransaction({
          description: 'CHIPOTLE',
          category: 'Restaurants',
          isManuallyEdited: true,
        }),
      ];

      const result = exactMatch('CHIPOTLE', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food');
    });

    it('should handle mixed manual and non-manual matches', () => {
      const historicalData: Transaction[] = [
        createTransaction({
          description: 'CVS PHARMACY',
          category: 'Shopping',
          isManuallyEdited: false,
        }),
        createTransaction({
          description: 'CVS PHARMACY',
          category: 'Health',
          isManuallyEdited: true,
        }),
        createTransaction({
          description: 'CVS PHARMACY',
          category: 'Shopping',
          isManuallyEdited: false,
        }),
      ];

      const result = exactMatch('CVS PHARMACY', historicalData);

      expect(result).not.toBeNull();
      expect(result?.category).toBe('Health');
      expect(result?.confidence).toBe(100);
    });
  });
});
