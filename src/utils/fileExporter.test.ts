import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  exportToCSV,
  exportToXLSX,
  exportTransactions,
  mergeTransactions,
  mergeTransactionsWithMetadata,
} from './fileExporter';
import type { Transaction } from '@/types';

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('fileExporter', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: new Date('2024-01-01'),
      entity: 'Grocery Store',
      amount: -50.25,
      currency: 'USD',
      category: 'Food',
      subcategory: 'Groceries',
      confidence: 0.95,
      isManuallyEdited: false,
    },
    {
      id: '2',
      date: new Date('2024-01-02'),
      entity: 'Coffee Shop',
      amount: -5.5,
      currency: 'EUR',
      category: 'Food',
      subcategory: 'Dining',
      confidence: 0.85,
      isManuallyEdited: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToCSV', () => {
    it('should export transactions to CSV format', () => {
      exportToCSV(mockTransactions);

      expect(vi.mocked(XLSX.utils.json_to_sheet)).toHaveBeenCalled();
      expect(vi.mocked(XLSX.utils.book_new)).toHaveBeenCalled();
      expect(vi.mocked(XLSX.utils.book_append_sheet)).toHaveBeenCalled();
      expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.csv'),
        { bookType: 'csv' }
      );
    });

    it('should use custom filename when provided', () => {
      exportToCSV(mockTransactions, { fileName: 'my-transactions' });

      expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(
        expect.anything(),
        'my-transactions.csv',
        { bookType: 'csv' }
      );
    });

    it('should convert transactions to correct row format', () => {
      exportToCSV(mockTransactions);

      const callArgs = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0];
      const rows = callArgs ? callArgs[0] : [];

      expect(rows).toEqual([
        {
          Date: '2024-01-01',
          Entity: 'Grocery Store',
          Notes: '',
          Amount: -50.25,
          Currency: 'USD',
          Category: 'Food',
          Subcategory: 'Groceries',
          Confidence: 95,
        },
        {
          Date: '2024-01-02',
          Entity: 'Coffee Shop',
          Notes: '',
          Amount: -5.5,
          Currency: 'EUR',
          Category: 'Food',
          Subcategory: 'Dining',
          Confidence: 85,
        },
      ]);
    });
  });

  describe('exportToXLSX', () => {
    it('should export transactions to XLSX format', () => {
      exportToXLSX(mockTransactions);

      expect(vi.mocked(XLSX.utils.json_to_sheet)).toHaveBeenCalled();
      expect(vi.mocked(XLSX.utils.book_new)).toHaveBeenCalled();
      expect(vi.mocked(XLSX.utils.book_append_sheet)).toHaveBeenCalled();
      expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.xlsx'),
        { bookType: 'xlsx' }
      );
    });

    it('should set column widths for XLSX', () => {
      const mockWorksheet = {};
      vi.mocked(XLSX.utils.json_to_sheet).mockReturnValue(mockWorksheet);

      exportToXLSX(mockTransactions);

      expect(mockWorksheet).toHaveProperty('!cols');
    });
  });

  describe('exportTransactions', () => {
    it('should export as CSV when format is csv', () => {
      exportTransactions(mockTransactions, { format: 'csv' });

      // Verify XLSX.writeFile was called with csv
      expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.csv'),
        { bookType: 'csv' }
      );
    });

    it('should export as XLSX by default', () => {
      exportTransactions(mockTransactions);

      expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.xlsx'),
        { bookType: 'xlsx' }
      );
    });
  });

  describe('mergeTransactions', () => {
    it('should merge new transactions with existing ones', () => {
      const existing: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          entity: 'Old Transaction',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const newOnes: Transaction[] = [
        {
          id: '2',
          date: new Date('2024-01-02'),
          entity: 'New Transaction',
          amount: -20,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const merged = mergeTransactions(existing, newOnes);

      expect(merged).toHaveLength(2);
      expect(merged[0]?.entity).toBe('Old Transaction');
      expect(merged[1]?.entity).toBe('New Transaction');
    });

    it('should avoid duplicate transactions', () => {
      const transaction: Transaction = {
        id: '1',
        date: new Date('2024-01-01'),
        entity: 'Same Transaction',
        amount: -10,
        currency: 'USD',
        isManuallyEdited: false,
      };

      const existing = [transaction];
      const newOnes = [{ ...transaction, id: '2' }]; // Same data, different ID

      const merged = mergeTransactions(existing, newOnes);

      expect(merged).toHaveLength(1);
    });

    it('should handle empty arrays', () => {
      const merged1 = mergeTransactions([], mockTransactions);
      expect(merged1).toHaveLength(2);

      const merged2 = mergeTransactions(mockTransactions, []);
      expect(merged2).toHaveLength(2);

      const merged3 = mergeTransactions([], []);
      expect(merged3).toHaveLength(0);
    });
  });

  describe('mergeTransactionsWithMetadata', () => {
    it('should merge new transactions and return metadata', () => {
      const existing: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          entity: 'Old Transaction',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const newOnes: Transaction[] = [
        {
          id: '2',
          date: new Date('2024-01-02'),
          entity: 'New Transaction',
          amount: -20,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const result = mergeTransactionsWithMetadata(existing, newOnes);

      expect(result.merged).toHaveLength(2);
      expect(result.added).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
      expect(result.added[0]?.entity).toBe('New Transaction');
    });

    it('should identify duplicate transactions', () => {
      const transaction: Transaction = {
        id: '1',
        date: new Date('2024-01-01'),
        entity: 'Same Transaction',
        amount: -10,
        currency: 'USD',
        isManuallyEdited: false,
      };

      const existing = [transaction];
      const newOnes = [{ ...transaction, id: '2' }]; // Same data, different ID

      const result = mergeTransactionsWithMetadata(existing, newOnes);

      expect(result.merged).toHaveLength(1);
      expect(result.added).toHaveLength(0);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]?.entity).toBe('Same Transaction');
    });

    it('should handle mixed scenario with both new and duplicate transactions', () => {
      const existing: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          entity: 'Existing Transaction',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const newOnes: Transaction[] = [
        // Duplicate
        {
          id: '2',
          date: new Date('2024-01-01'),
          entity: 'Existing Transaction',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
        // New transaction 1
        {
          id: '3',
          date: new Date('2024-01-02'),
          entity: 'New Transaction 1',
          amount: -20,
          currency: 'USD',
          isManuallyEdited: false,
        },
        // New transaction 2
        {
          id: '4',
          date: new Date('2024-01-03'),
          entity: 'New Transaction 2',
          amount: -30,
          currency: 'EUR',
          isManuallyEdited: false,
        },
      ];

      const result = mergeTransactionsWithMetadata(existing, newOnes);

      expect(result.merged).toHaveLength(3); // 1 existing + 2 new
      expect(result.added).toHaveLength(2);
      expect(result.duplicates).toHaveLength(1);
      expect(result.added.map((t) => t.entity)).toEqual([
        'New Transaction 1',
        'New Transaction 2',
      ]);
      expect(result.duplicates[0]?.entity).toBe('Existing Transaction');
    });

    it('should handle empty existing array', () => {
      const newOnes: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          entity: 'Transaction',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const result = mergeTransactionsWithMetadata([], newOnes);

      expect(result.merged).toHaveLength(1);
      expect(result.added).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should handle empty new transactions array', () => {
      const existing: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          entity: 'Transaction',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const result = mergeTransactionsWithMetadata(existing, []);

      expect(result.merged).toHaveLength(1);
      expect(result.added).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should handle both arrays empty', () => {
      const result = mergeTransactionsWithMetadata([], []);

      expect(result.merged).toHaveLength(0);
      expect(result.added).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should detect duplicates based on composite key', () => {
      const existing: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          entity: 'Coffee',
          amount: -5,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const newOnes: Transaction[] = [
        // Same date, description, amount, currency = duplicate
        {
          id: '2',
          date: new Date('2024-01-01'),
          entity: 'Coffee',
          amount: -5,
          currency: 'USD',
          isManuallyEdited: false,
        },
        // Different amount = not duplicate
        {
          id: '3',
          date: new Date('2024-01-01'),
          entity: 'Coffee',
          amount: -6,
          currency: 'USD',
          isManuallyEdited: false,
        },
        // Different currency = not duplicate
        {
          id: '4',
          date: new Date('2024-01-01'),
          entity: 'Coffee',
          amount: -5,
          currency: 'EUR',
          isManuallyEdited: false,
        },
        // Different description = not duplicate
        {
          id: '5',
          date: new Date('2024-01-01'),
          entity: 'Tea',
          amount: -5,
          currency: 'USD',
          isManuallyEdited: false,
        },
        // Different date = not duplicate
        {
          id: '6',
          date: new Date('2024-01-02'),
          entity: 'Coffee',
          amount: -5,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const result = mergeTransactionsWithMetadata(existing, newOnes);

      expect(result.merged).toHaveLength(5); // 1 existing + 4 new
      expect(result.added).toHaveLength(4);
      expect(result.duplicates).toHaveLength(1);
    });

    it('should preserve order: existing first, then added', () => {
      const existing: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          entity: 'First',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const newOnes: Transaction[] = [
        {
          id: '2',
          date: new Date('2024-01-02'),
          entity: 'Second',
          amount: -20,
          currency: 'USD',
          isManuallyEdited: false,
        },
        {
          id: '3',
          date: new Date('2024-01-03'),
          entity: 'Third',
          amount: -30,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const result = mergeTransactionsWithMetadata(existing, newOnes);

      expect(result.merged[0]?.entity).toBe('First');
      expect(result.merged[1]?.entity).toBe('Second');
      expect(result.merged[2]?.entity).toBe('Third');
    });
  });
});
