import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveTransactions,
  loadTransactions,
  saveUploadedFiles,
  loadUploadedFiles,
} from './persistence';
import type { Transaction } from '@/types';
import type { StoredFileInfo } from './persistence';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: new Date('2024-01-15'),
      entity: 'Grocery Store',
      amount: -50.25,
      currency: 'USD',
      isManuallyEdited: false,
    },
    {
      id: '2',
      date: new Date('2024-02-01'),
      entity: 'Salary',
      amount: 3000,
      currency: 'USD',
      category: 'Income',
      isManuallyEdited: true,
    },
  ];

  describe('saveTransactions', () => {
    it('should save transactions to localStorage', () => {
      saveTransactions(mockTransactions);

      const stored = localStorage.getItem('expense-categorizer-transactions');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored ?? '[]') as Record<string, unknown>[];
      expect(parsed).toHaveLength(2);
      expect(parsed[0]?.entity).toBe('Grocery Store');
      expect(parsed[1]?.category).toBe('Income');
    });

    it('should serialize dates to ISO strings', () => {
      saveTransactions(mockTransactions);

      const stored = localStorage.getItem('expense-categorizer-transactions');
      const parsed = JSON.parse(stored ?? '[]') as Record<string, unknown>[];
      expect(parsed[0]?.date).toBe('2024-01-15T00:00:00.000Z');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      saveTransactions(mockTransactions);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save transactions to localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('loadTransactions', () => {
    it('should load transactions from localStorage', () => {
      saveTransactions(mockTransactions);

      const loaded = loadTransactions();
      expect(loaded).toHaveLength(2);
      expect(loaded[0]?.entity).toBe('Grocery Store');
      expect(loaded[0]?.date).toBeInstanceOf(Date);
    });

    it('should return empty array when nothing stored', () => {
      const result = loadTransactions();
      expect(result).toEqual([]);
    });

    it('should handle corrupted data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('expense-categorizer-transactions', 'not valid json{{{');

      const result = loadTransactions();
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load transactions from localStorage:',
        expect.any(Error)
      );
    });
  });

  const mockFiles: StoredFileInfo[] = [
    {
      id: 'f1',
      name: 'bank-statement.csv',
      uploadedAt: '2024-01-15T10:00:00.000Z',
      transactionCount: 50,
      duplicateCount: 2,
    },
  ];

  describe('saveUploadedFiles', () => {
    it('should save file info to localStorage', () => {
      saveUploadedFiles(mockFiles);

      const stored = localStorage.getItem('expense-categorizer-files');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored ?? '[]') as Record<string, unknown>[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.name).toBe('bank-statement.csv');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      saveUploadedFiles(mockFiles);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save file info to localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('loadUploadedFiles', () => {
    it('should load file info from localStorage', () => {
      saveUploadedFiles(mockFiles);

      const loaded = loadUploadedFiles();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]?.name).toBe('bank-statement.csv');
    });

    it('should return empty array when nothing stored', () => {
      const result = loadUploadedFiles();
      expect(result).toEqual([]);
    });

    it('should handle corrupted data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('expense-categorizer-files', '{invalid');

      const result = loadUploadedFiles();
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load file info from localStorage:',
        expect.any(Error)
      );
    });
  });
});
