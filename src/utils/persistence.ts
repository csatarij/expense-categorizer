import type { Transaction, TransactionMetadata } from '@/types';

const STORAGE_KEY = 'expense-categorizer-transactions';
const FILES_STORAGE_KEY = 'expense-categorizer-files';

interface SerializedTransaction {
  id: string;
  date: string;
  entity: string;
  notes?: string;
  amount: number;
  currency: string;
  category?: string;
  subcategory?: string;
  originalCategory?: string;
  confidence?: number;
  isManuallyEdited: boolean;
  metadata?: TransactionMetadata;
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    const serialized: SerializedTransaction[] = transactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.error('Failed to save transactions to localStorage:', e);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SerializedTransaction[];
    return parsed.map((t) => ({
      ...t,
      date: new Date(t.date),
    }));
  } catch (e) {
    console.error('Failed to load transactions from localStorage:', e);
    return [];
  }
}

export interface StoredFileInfo {
  id: string;
  name: string;
  uploadedAt: string;
  transactionCount: number;
  duplicateCount: number;
}

export function saveUploadedFiles(files: StoredFileInfo[]): void {
  try {
    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save file info to localStorage:', e);
  }
}

export function loadUploadedFiles(): StoredFileInfo[] {
  try {
    const stored = localStorage.getItem(FILES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as StoredFileInfo[];
  } catch (e) {
    console.error('Failed to load file info from localStorage:', e);
    return [];
  }
}
