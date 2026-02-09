import * as XLSX from 'xlsx';
import type { Transaction } from '@/types';

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * Options for file export
 */
export interface FileExportOptions {
  /** File name without extension */
  fileName?: string;
  /** Export format (default: xlsx) */
  format?: ExportFormat;
  /** Include metadata columns (default: false) */
  includeMetadata?: boolean;
}

/**
 * Converts transactions to a format suitable for export
 */
function transactionsToRows(
  transactions: Transaction[],
  includeMetadata: boolean = false
): Record<string, unknown>[] {
  return transactions.map((transaction) => {
    const baseRow: Record<string, unknown> = {
      Date: transaction.date.toISOString().split('T')[0],
      Entity: transaction.entity,
      Notes: transaction.notes || '',
      Amount: transaction.amount,
      Currency: transaction.currency,
      Category: transaction.category || '',
      Subcategory: transaction.subcategory || '',
      Confidence: transaction.confidence
        ? Math.round(transaction.confidence * 100)
        : '',
    };

    if (includeMetadata && transaction.metadata) {
      return {
        ...baseRow,
        'Original File': transaction.metadata.fileName,
        'Row Index': transaction.metadata.rowIndex,
        'Manually Edited': transaction.isManuallyEdited ? 'Yes' : 'No',
      };
    }

    return baseRow;
  });
}

/**
 * Exports transactions to a CSV file
 */
export function exportToCSV(
  transactions: Transaction[],
  options: FileExportOptions = {}
): void {
  const {
    fileName = `transactions-${new Date().toISOString().split('T')[0] ?? 'export'}`,
    includeMetadata = false,
  } = options;

  const rows = transactionsToRows(transactions, includeMetadata);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' });
}

/**
 * Exports transactions to an XLSX file
 */
export function exportToXLSX(
  transactions: Transaction[],
  options: FileExportOptions = {}
): void {
  const {
    fileName = `transactions-${new Date().toISOString().split('T')[0] ?? 'export'}`,
    includeMetadata = false,
  } = options;

  const rows = transactionsToRows(transactions, includeMetadata);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  // Set column widths for better readability
  const columnWidths = [
    { wch: 12 }, // Date
    { wch: 40 }, // Entity
    { wch: 40 }, // Notes
    { wch: 12 }, // Amount
    { wch: 10 }, // Currency
    { wch: 20 }, // Category
    { wch: 20 }, // Subcategory
    { wch: 12 }, // Confidence
  ];

  if (includeMetadata) {
    columnWidths.push(
      { wch: 25 }, // Original File
      { wch: 10 }, // Row Index
      { wch: 15 } // Manually Edited
    );
  }

  worksheet['!cols'] = columnWidths;

  XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' });
}

/**
 * Exports transactions to a file in the specified format
 */
export function exportTransactions(
  transactions: Transaction[],
  options: FileExportOptions = {}
): void {
  const { format = 'xlsx' } = options;

  if (format === 'csv') {
    exportToCSV(transactions, options);
  } else {
    exportToXLSX(transactions, options);
  }
}

/**
 * Merges new transactions with existing ones from a file
 * This is useful for appending new transactions to an existing export
 */
export function mergeTransactions(
  existing: Transaction[],
  newTransactions: Transaction[]
): Transaction[] {
  // Create a map of existing transactions by a composite key
  const existingMap = new Map<string, Transaction>();

  existing.forEach((t) => {
    const key = `${t.date.toISOString()}-${t.entity}-${String(t.amount)}-${t.currency}`;
    existingMap.set(key, t);
  });

  // Add new transactions, avoiding duplicates
  const merged = [...existing];

  newTransactions.forEach((t) => {
    const key = `${t.date.toISOString()}-${t.entity}-${String(t.amount)}-${t.currency}`;
    if (!existingMap.has(key)) {
      merged.push(t);
    }
  });

  return merged;
}

/**
 * Result of merging transactions with detailed metadata
 */
export interface MergeResult {
  /** All transactions after merge (existing + newly added) */
  merged: Transaction[];
  /** Transactions that were identified as duplicates and skipped */
  duplicates: Transaction[];
  /** Transactions that were newly added (not duplicates) */
  added: Transaction[];
}

/**
 * Merges new transactions with existing ones, returning detailed metadata
 * about the merge operation. This is useful for providing user feedback
 * about duplicate detection and newly added transactions.
 *
 * Duplicate detection uses a composite key of: date + entity + amount + currency
 *
 * @param existing - Array of existing transactions
 * @param newTransactions - Array of new transactions to merge
 * @returns MergeResult containing merged array, duplicates, and added transactions
 *
 * @example
 * const result = mergeTransactionsWithMetadata(existingTxns, newTxns);
 * console.log(`Added ${result.added.length} transactions`);
 * console.log(`Skipped ${result.duplicates.length} duplicates`);
 */
export function mergeTransactionsWithMetadata(
  existing: Transaction[],
  newTransactions: Transaction[]
): MergeResult {
  const existingMap = new Map<string, Transaction>();
  const duplicates: Transaction[] = [];
  const added: Transaction[] = [];

  // Build map of existing transactions
  existing.forEach((t) => {
    const key = `${t.date.toISOString()}-${t.entity}-${String(t.amount)}-${t.currency}`;
    existingMap.set(key, t);
  });

  const merged = [...existing];

  // Check each new transaction for duplicates
  newTransactions.forEach((t) => {
    const key = `${t.date.toISOString()}-${t.entity}-${String(t.amount)}-${t.currency}`;
    if (existingMap.has(key)) {
      duplicates.push(t);
    } else {
      merged.push(t);
      added.push(t);
    }
  });

  return { merged, duplicates, added };
}
