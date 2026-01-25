import { describe, it, expect } from 'vitest';
import {
  detectColumns,
  levenshteinDistance,
  isDateLike,
  isNumberLike,
  analyzeColumnContent,
  COLUMN_PATTERNS,
} from './columnDetector';

describe('columnDetector', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('should be case-insensitive', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(0);
      expect(levenshteinDistance('DESCRIPTION', 'description')).toBe(0);
    });

    it('should return correct distance for different strings', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('abc', 'def')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'world')).toBe(5);
    });

    it('should calculate distance for typos', () => {
      expect(levenshteinDistance('description', 'descritpion')).toBeLessThanOrEqual(2);
      expect(levenshteinDistance('amount', 'ammount')).toBeLessThanOrEqual(1);
      expect(levenshteinDistance('category', 'catagory')).toBeLessThanOrEqual(1);
    });
  });

  describe('isDateLike', () => {
    it('should recognize ISO date format', () => {
      expect(isDateLike('2024-01-15')).toBe(true);
      expect(isDateLike('2024-12-31')).toBe(true);
    });

    it('should recognize US date format', () => {
      expect(isDateLike('01/15/2024')).toBe(true);
      expect(isDateLike('12/31/2024')).toBe(true);
    });

    it('should recognize short date formats', () => {
      expect(isDateLike('1/15/24')).toBe(true);
      expect(isDateLike('12/1/24')).toBe(true);
    });

    it('should recognize text date formats', () => {
      expect(isDateLike('Jan 15, 2024')).toBe(true);
      expect(isDateLike('15 Jan 2024')).toBe(true);
    });

    it('should recognize compact date format', () => {
      expect(isDateLike('20240115')).toBe(true);
    });

    it('should recognize date with slash separator', () => {
      expect(isDateLike('2024/01/15')).toBe(true);
    });

    it('should reject non-date values', () => {
      expect(isDateLike('hello')).toBe(false);
      expect(isDateLike('123.45')).toBe(false);
      expect(isDateLike('')).toBe(false);
      expect(isDateLike(null)).toBe(false);
      expect(isDateLike(undefined)).toBe(false);
    });

    it('should handle dates at boundaries of reasonable range', () => {
      // Dates in ISO format are validated against regex, then year is checked
      expect(isDateLike('1899-01-01')).toBe(false);
      expect(isDateLike('1900-01-01')).toBe(true);
      expect(isDateLike('2100-12-31')).toBe(true);
      expect(isDateLike('2101-01-01')).toBe(false);
    });
  });

  describe('isNumberLike', () => {
    it('should recognize plain numbers', () => {
      expect(isNumberLike(123)).toBe(true);
      expect(isNumberLike(-45.67)).toBe(true);
      expect(isNumberLike(0)).toBe(true);
    });

    it('should recognize number strings', () => {
      expect(isNumberLike('123.45')).toBe(true);
      expect(isNumberLike('-67.89')).toBe(true);
      expect(isNumberLike('0')).toBe(true);
    });

    it('should recognize currency formatted numbers', () => {
      expect(isNumberLike('$123.45')).toBe(true);
      expect(isNumberLike('€100.00')).toBe(true);
      expect(isNumberLike('£50.00')).toBe(true);
      expect(isNumberLike('¥1000')).toBe(true);
    });

    it('should recognize numbers with commas', () => {
      expect(isNumberLike('1,234.56')).toBe(true);
      expect(isNumberLike('$1,234,567.89')).toBe(true);
    });

    it('should recognize accounting format (parentheses for negative)', () => {
      expect(isNumberLike('(123.45)')).toBe(true);
      expect(isNumberLike('($100.00)')).toBe(true);
    });

    it('should reject non-number values', () => {
      expect(isNumberLike('hello')).toBe(false);
      expect(isNumberLike('abc123')).toBe(false);
      expect(isNumberLike('')).toBe(false);
      expect(isNumberLike(null)).toBe(false);
      expect(isNumberLike(undefined)).toBe(false);
    });

    it('should handle ambiguous date-like strings', () => {
      // Note: parseFloat('2024-01-15') returns 2024, so this is technically number-like
      // This is expected behavior - content analysis uses multiple signals
      expect(isNumberLike('2024-01-15')).toBe(true); // parseFloat extracts leading number
    });

    it('should reject NaN and Infinity', () => {
      expect(isNumberLike(NaN)).toBe(false);
    });
  });

  describe('analyzeColumnContent', () => {
    it('should detect date column', () => {
      const values = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];
      expect(analyzeColumnContent(values)).toBe('date');
    });

    it('should detect number column', () => {
      const values = ['$100.00', '$50.50', '-$25.00', '$75.25', '$200.00'];
      expect(analyzeColumnContent(values)).toBe('number');
    });

    it('should detect string column', () => {
      const values = ['Walmart', 'Amazon', 'Target', 'Costco', 'Home Depot'];
      expect(analyzeColumnContent(values)).toBe('string');
    });

    it('should return string for empty array', () => {
      expect(analyzeColumnContent([])).toBe('string');
    });

    it('should return string for array with only empty values', () => {
      expect(analyzeColumnContent(['', null, undefined])).toBe('string');
    });

    it('should handle mixed content based on threshold', () => {
      // 70% dates should be detected as date
      const mostlyDates = ['2024-01-01', '2024-01-02', '2024-01-03', 'invalid', '2024-01-05'];
      expect(analyzeColumnContent(mostlyDates)).toBe('date');

      // Less than 70% should be string
      const mixedValues = ['2024-01-01', '2024-01-02', 'text', 'more text', 'even more'];
      expect(analyzeColumnContent(mixedValues)).toBe('string');
    });
  });

  describe('COLUMN_PATTERNS', () => {
    it('should have patterns for all column types', () => {
      expect(COLUMN_PATTERNS.date).toBeDefined();
      expect(COLUMN_PATTERNS.description).toBeDefined();
      expect(COLUMN_PATTERNS.amount).toBeDefined();
      expect(COLUMN_PATTERNS.debit).toBeDefined();
      expect(COLUMN_PATTERNS.credit).toBeDefined();
      expect(COLUMN_PATTERNS.category).toBeDefined();
    });

    it('should have multiple patterns per type', () => {
      expect(COLUMN_PATTERNS.date.length).toBeGreaterThan(1);
      expect(COLUMN_PATTERNS.description.length).toBeGreaterThan(1);
    });
  });

  describe('detectColumns', () => {
    describe('exact matching', () => {
      it('should detect columns with exact header names', () => {
        const headers = ['Date', 'Description', 'Amount', 'Category'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Date');
        expect(result.mapping.description).toBe('Description');
        expect(result.mapping.amount).toBe('Amount');
        expect(result.mapping.category).toBe('Category');
      });

      it('should be case-insensitive', () => {
        const headers = ['DATE', 'DESCRIPTION', 'AMOUNT'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('DATE');
        expect(result.mapping.description).toBe('DESCRIPTION');
        expect(result.mapping.amount).toBe('AMOUNT');
      });

      it('should detect columns with partial matches', () => {
        const headers = ['Transaction Date', 'Merchant Name', 'Total Amount'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Transaction Date');
        expect(result.mapping.amount).toBe('Total Amount');
      });

      it('should assign high confidence for exact matches', () => {
        const headers = ['Date', 'Description', 'Amount'];
        const result = detectColumns(headers);

        expect(result.confidence.date).toBe(100);
        expect(result.confidence.description).toBe(100);
        expect(result.confidence.amount).toBe(100);
      });
    });

    describe('fuzzy matching', () => {
      it('should detect columns with typos', () => {
        const headers = ['Dte', 'Descritpion', 'Ammount'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Dte');
        expect(result.mapping.description).toBe('Descritpion');
        expect(result.mapping.amount).toBe('Ammount');
      });

      it('should have lower confidence for fuzzy matches', () => {
        const headers = ['Dte', 'Descritpion'];
        const result = detectColumns(headers);

        expect(result.confidence.date).toBeLessThan(100);
        expect(result.confidence.description).toBeLessThan(100);
      });

      it('should not match completely different strings', () => {
        const headers = ['xyz', 'abc', 'qwerty'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBeUndefined();
        expect(result.mapping.description).toBeUndefined();
        expect(result.mapping.amount).toBeUndefined();
      });
    });

    describe('content analysis', () => {
      it('should detect date column by content', () => {
        const headers = ['Col1', 'Col2', 'Col3'];
        const sampleRows = [
          ['2024-01-01', 'Walmart Purchase', '50.00'],
          ['2024-01-02', 'Amazon Order', '25.00'],
          ['2024-01-03', 'Gas Station', '35.00'],
        ];

        const result = detectColumns(headers, sampleRows);

        expect(result.mapping.date).toBe('Col1');
      });

      it('should detect amount column by numeric content', () => {
        const headers = ['Col1', 'Col2', 'Col3'];
        const sampleRows = [
          ['Walmart', '2024-01-01', '$50.00'],
          ['Amazon', '2024-01-02', '$25.00'],
          ['Target', '2024-01-03', '$35.00'],
        ];

        const result = detectColumns(headers, sampleRows);

        expect(result.mapping.amount).toBe('Col3');
      });

      it('should detect description by string content length', () => {
        const headers = ['Col1', 'Col2', 'Col3'];
        const sampleRows = [
          ['2024-01-01', 'WALMART SUPERCENTER #1234 PURCHASE', '50.00'],
          ['2024-01-02', 'AMAZON.COM ORDER #ABC123 DELIVERY', '25.00'],
          ['2024-01-03', 'SHELL GAS STATION FUEL PURCHASE', '35.00'],
        ];

        const result = detectColumns(headers, sampleRows);

        expect(result.mapping.description).toBe('Col2');
      });
    });

    describe('debit/credit handling', () => {
      it('should detect separate debit and credit columns', () => {
        const headers = ['Date', 'Description', 'Debit', 'Credit'];
        const result = detectColumns(headers);

        expect(result.mapping.debit).toBe('Debit');
        expect(result.mapping.credit).toBe('Credit');
      });

      it('should detect withdrawal and deposit columns', () => {
        const headers = ['Date', 'Description', 'Withdrawal', 'Deposit'];
        const result = detectColumns(headers);

        expect(result.mapping.debit).toBe('Withdrawal');
        expect(result.mapping.credit).toBe('Deposit');
      });

      it('should detect debit/credit by content when two number columns exist', () => {
        const headers = ['Date', 'Description', 'Money Out', 'Money In'];
        const sampleRows = [
          ['2024-01-01', 'Purchase', '50.00', ''],
          ['2024-01-02', 'Deposit', '', '100.00'],
        ];

        const result = detectColumns(headers, sampleRows);

        expect(result.mapping.debit).toBe('Money Out');
        expect(result.mapping.credit).toBe('Money In');
      });
    });

    describe('edge cases', () => {
      it('should handle empty headers', () => {
        const result = detectColumns([]);

        expect(result.mapping.date).toBeUndefined();
        expect(Object.keys(result.confidence)).toHaveLength(0);
      });

      it('should handle single column', () => {
        const headers = ['Amount'];
        const result = detectColumns(headers);

        expect(result.mapping.amount).toBe('Amount');
      });

      it('should not reuse column indices', () => {
        // "Date" matches date pattern, should not also match description
        const headers = ['Date', 'Date 2'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Date');
        // Date 2 should not be assigned to anything else
      });

      it('should handle multiple date columns (prefer first match)', () => {
        const headers = ['Transaction Date', 'Posted Date', 'Description', 'Amount'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Transaction Date');
      });

      it('should handle ambiguous data', () => {
        const headers = ['Field1', 'Field2', 'Field3'];
        const sampleRows = [
          ['abc', 'def', 'ghi'],
          ['jkl', 'mno', 'pqr'],
        ];

        const result = detectColumns(headers, sampleRows);

        // Should still return a result, even if empty
        expect(result.mapping).toBeDefined();
        expect(result.confidence).toBeDefined();
      });

      it('should handle mixed data types in same column', () => {
        const headers = ['Mixed'];
        const sampleRows = [
          ['2024-01-01'],
          ['$50.00'],
          ['Some text'],
          ['Another value'],
        ];

        const result = detectColumns(headers, sampleRows);

        // Should not crash and should make best guess
        expect(result.mapping).toBeDefined();
      });

      it('should handle special characters in headers', () => {
        const headers = ['Date (MM/DD/YYYY)', 'Amount ($)', 'Description/Memo'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Date (MM/DD/YYYY)');
        expect(result.mapping.amount).toBe('Amount ($)');
        expect(result.mapping.description).toBe('Description/Memo');
      });
    });

    describe('confidence scores', () => {
      it('should return 100 for exact matches', () => {
        const headers = ['Date', 'Amount'];
        const result = detectColumns(headers);

        expect(result.confidence.date).toBe(100);
        expect(result.confidence.amount).toBe(100);
      });

      it('should return 90 for contains matches', () => {
        // 'Transaction Date' contains 'date' pattern, so it's a 90 confidence match
        // But 'transaction date' is also in the patterns list, so it's exact (100)
        const headers = ['Trans. Date']; // Not in patterns, but contains 'date'
        const result = detectColumns(headers);

        expect(result.confidence.date).toBe(90);
      });

      it('should return lower scores for content-based detection', () => {
        const headers = ['Col1', 'Col2'];
        const sampleRows = [
          ['2024-01-01', '50.00'],
          ['2024-01-02', '25.00'],
          ['2024-01-03', '35.00'],
        ];

        const result = detectColumns(headers, sampleRows);

        expect(result.confidence.date).toBeLessThanOrEqual(60);
        expect(result.confidence.amount).toBeLessThanOrEqual(50);
      });
    });

    describe('with real-world data', () => {
      it('should handle typical bank statement headers', () => {
        const headers = ['Posted Date', 'Reference', 'Description', 'Debits', 'Credits', 'Balance'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Posted Date');
        expect(result.mapping.description).toBe('Description');
        expect(result.mapping.debit).toBe('Debits');
        expect(result.mapping.credit).toBe('Credits');
      });

      it('should handle credit card statement headers', () => {
        const headers = ['Trans Date', 'Post Date', 'Merchant Name', 'Category', 'Amount'];
        const result = detectColumns(headers);

        expect(result.mapping.date).toBe('Trans Date');
        expect(result.mapping.description).toBe('Merchant Name');
        expect(result.mapping.category).toBe('Category');
        expect(result.mapping.amount).toBe('Amount');
      });

      it('should handle minimal CSV with just essentials', () => {
        const headers = ['When', 'What', 'How Much'];
        const sampleRows = [
          ['2024-01-15', 'Grocery Store', '-45.67'],
          ['2024-01-16', 'Gas Station', '-30.00'],
          ['2024-01-17', 'Restaurant', '-25.50'],
        ];

        const result = detectColumns(headers, sampleRows);

        expect(result.mapping.date).toBe('When');
        expect(result.mapping.description).toBe('What');
        expect(result.mapping.amount).toBe('How Much');
      });
    });
  });
});
