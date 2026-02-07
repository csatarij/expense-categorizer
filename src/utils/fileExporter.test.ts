import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  exportToCSV,
  exportToXLSX,
  exportTransactions,
  mergeTransactions,
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
      description: 'Grocery Store',
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
      description: 'Coffee Shop',
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
          Description: 'Grocery Store',
          Amount: -50.25,
          Currency: 'USD',
          Category: 'Food',
          Subcategory: 'Groceries',
          Confidence: 95,
        },
        {
          Date: '2024-01-02',
          Description: 'Coffee Shop',
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
          description: 'Old Transaction',
          amount: -10,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const newOnes: Transaction[] = [
        {
          id: '2',
          date: new Date('2024-01-02'),
          description: 'New Transaction',
          amount: -20,
          currency: 'USD',
          isManuallyEdited: false,
        },
      ];

      const merged = mergeTransactions(existing, newOnes);

      expect(merged).toHaveLength(2);
      expect(merged[0]?.description).toBe('Old Transaction');
      expect(merged[1]?.description).toBe('New Transaction');
    });

    it('should avoid duplicate transactions', () => {
      const transaction: Transaction = {
        id: '1',
        date: new Date('2024-01-01'),
        description: 'Same Transaction',
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
});
