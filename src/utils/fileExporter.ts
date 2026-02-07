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
      Description: transaction.description,
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
    { wch: 40 }, // Description
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
    const key = `${t.date.toISOString()}-${t.description}-${String(t.amount)}-${t.currency}`;
    existingMap.set(key, t);
  });

  // Add new transactions, avoiding duplicates
  const merged = [...existing];

  newTransactions.forEach((t) => {
    const key = `${t.date.toISOString()}-${t.description}-${String(t.amount)}-${t.currency}`;
    if (!existingMap.has(key)) {
      merged.push(t);
    }
  });

  return merged;
}
