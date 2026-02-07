/**
 * Categorization method used to determine a transaction's category
 */
export type CategorizationMethod =
  | 'exact-match'
  | 'fuzzy-match'
  | 'keyword-rule'
  | 'tfidf-similarity'
  | 'ml-classifier'
  | 'user-confirmed'
  | 'historical-pattern';

/**
 * Metadata about the source of a transaction
 */
export interface TransactionMetadata {
  source: 'upload' | 'statement';
  fileName: string;
  rowIndex: number;
  rawData: Record<string, unknown>;
}

/**
 * Core transaction interface representing an expense or income entry
 */
export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  subcategory?: string;
  originalCategory?: string;
  confidence?: number;
  isManuallyEdited: boolean;
  metadata?: TransactionMetadata;
}

/**
 * A suggested category for a transaction with confidence and reasoning
 */
export interface CategorySuggestion {
  category: string;
  subcategory?: string;
  confidence: number;
  reason: string;
  method: CategorizationMethod;
}

/**
 * Category taxonomy mapping categories to their subcategories
 */
export type CategoryTaxonomy = Record<string, string[]>;

/**
 * Mapping of column names to their roles in the parsed file
 */
export interface ColumnMapping {
  date?: string;
  description?: string;
  amount?: string;
  currency?: string;
  category?: string;
  subcategory?: string;
  debit?: string;
  credit?: string;
}

/**
 * Result of parsing an uploaded file
 */
export interface ParsedFile {
  data: Record<string, unknown>[];
  headers: string[];
  detectedColumns: ColumnMapping;
  fileName: string;
  fileType: 'csv' | 'xlsx';
}

/**
 * A learned pattern from user categorization behavior
 */
export interface LearningPattern {
  description: string;
  category: string;
  subcategory?: string;
  method: CategorizationMethod;
  timestamp: Date;
  confidence: number;
}

/**
 * Global application state for state management
 */
export interface AppState {
  transactions: Transaction[];
  categories: CategoryTaxonomy;
  learningPatterns: LearningPattern[];
  parsedFile: ParsedFile | null;
  isLoading: boolean;
  error: string | null;
  selectedTransactionIds: string[];
  filters: {
    category?: string;
    dateRange?: { start: Date; end: Date };
    searchQuery?: string;
  };
}

/**
 * Legacy interfaces for backward compatibility
 */
export interface Expense {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category?: string;
  confidence?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  keywords?: string[];
}

export type CategoryConfidence = {
  category: string;
  confidence: number;
};
