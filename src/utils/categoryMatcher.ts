/**
 * Utility functions for matching categories from uploaded expense files.
 *
 * This module handles reading category and subcategory data from uploaded CSV/XLSX files
 * and matching them against the application's taxonomy. It supports:
 *
 * - Automatic detection of category/subcategory columns
 * - Fuzzy matching for similar category names
 * - Building category mappings for learning
 * - Extracting learning rules from categorized transactions
 *
 * Main function: `parseAndMatchCategories(rows)` - Parse file rows and match categories
 */

import { DEFAULT_CATEGORIES } from '@/data/categories';
import type { Transaction } from '@/types';

interface CategoryMatch {
  category: string;
  subcategory: string;
  confidence: number;
}

interface CategoryMapping {
  [key: string]: CategoryMatch;
}

/**
 * Finds matching category and subcategory in the taxonomy
 * Returns the best match with confidence score
 */
export function findBestMatch(
  inputCategory: string,
  inputSubcategory: string
): CategoryMatch {
  const normalizedInput = inputCategory.toLowerCase().trim();
  const normalizedSubcategory = inputSubcategory.toLowerCase().trim();

  let bestMatch: CategoryMatch = {
    category: 'Uncategorized',
    subcategory: '',
    confidence: 0,
  };

  if (!inputCategory) {
    return bestMatch;
  }

  if (inputSubcategory) {
    for (const [category, subcategories] of Object.entries(
      DEFAULT_CATEGORIES
    )) {
      const normalizedCategory = category.toLowerCase();

      const categorySimilarity = calculateSimilarity(
        normalizedInput,
        normalizedCategory
      );

      let bestSubcategoryMatch = '';
      let bestSubcategorySimilarity = 0;

      for (const subcategory of subcategories) {
        const normalizedSub = subcategory.toLowerCase();
        const subcategorySimilarity = calculateSimilarity(
          normalizedSubcategory,
          normalizedSub
        );

        if (subcategorySimilarity > bestSubcategorySimilarity) {
          bestSubcategoryMatch = subcategory;
          bestSubcategorySimilarity = subcategorySimilarity;
        }
      }

      if (bestSubcategorySimilarity > 0.5 && categorySimilarity > 0.5) {
        const combinedSimilarity =
          (categorySimilarity + bestSubcategorySimilarity) / 2;

        if (combinedSimilarity > bestMatch.confidence) {
          bestMatch = {
            category,
            subcategory: bestSubcategoryMatch,
            confidence: combinedSimilarity,
          };
        }
      }
    }
  }

  if (bestMatch.category === 'Uncategorized' || bestMatch.confidence < 0.7) {
    for (const [category] of Object.entries(DEFAULT_CATEGORIES)) {
      const normalizedCategory = category.toLowerCase();

      const categorySimilarity = calculateSimilarity(
        normalizedInput,
        normalizedCategory
      );

      if (categorySimilarity > bestMatch.confidence) {
        bestMatch = {
          category,
          subcategory: '',
          confidence: categorySimilarity,
        };
      }
    }
  }

  // If still no good match, try matching the input against subcategory names.
  // This handles files where the category column uses subcategory-level terms
  // (e.g. 'food', 'health', 'transport' instead of 'Food & Dining', 'Health & Wellness').
  if (bestMatch.category === 'Uncategorized' || bestMatch.confidence < 0.7) {
    for (const [category, subcategories] of Object.entries(DEFAULT_CATEGORIES)) {
      for (const subcategory of subcategories) {
        const subSimilarity = calculateSimilarity(
          normalizedInput,
          subcategory.toLowerCase()
        );

        if (subSimilarity > bestMatch.confidence) {
          bestMatch = {
            category,
            subcategory,
            confidence: subSimilarity,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Calculates similarity between two strings using Jaccard similarity
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[&]/g, 'and')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  const normalized1 = normalize(str1);
  const normalized2 = normalize(str2);

  if (normalized1 === normalized2) return 1;

  const set1 = new Set(normalized1.split(/\s+/).filter(Boolean));
  const set2 = new Set(normalized2.split(/\s+/).filter(Boolean));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;

  const jaccardSimilarity = intersection.size / union.size;

  if (jaccardSimilarity === 1) return 1;

  const commonWords = ['food', 'dining', 'gas', 'fuel', 'transportation'];
  const hasCommonConcept =
    [...set1].some((w) => commonWords.includes(w)) &&
    [...set2].some((w) => commonWords.includes(w));

  return hasCommonConcept
    ? Math.max(jaccardSimilarity, 0.3)
    : jaccardSimilarity;
}

/**
 * Parses uploaded file and matches categories
 * Creates new learning rules from matched transactions
 */
export function parseAndMatchCategories(rows: Record<string, unknown>[]): {
  transactions: Transaction[];
  categoryMapping: CategoryMapping;
  unmatchedCategories: string[];
} {
  const transactions: Transaction[] = [];
  const categoryMapping: CategoryMapping = {};
  const unmatchedCategories: Set<string> = new Set();
  const categoryKeys = detectCategoryColumns(Object.keys(rows[0] || {}));

  if (!categoryKeys.category) {
    throw new Error('No category column found in uploaded file');
  }

  rows.forEach((row, index) => {
    const entityType = findEntityColumn(row);
    const descriptionKey = findDescriptionColumn(row);
    const dateKey = findDateColumn(row);
    const amountKey = findAmountColumn(row);

    const entity = String(
      entityType in row
        ? row[entityType]
        : descriptionKey in row
          ? row[descriptionKey]
          : ''
    );
    const amountValue = row[amountKey];
    const amount = parseAmount(
      amountValue && typeof amountValue === 'string' ? amountValue : '0'
    );
    const dateValue = row[dateKey];
    const date = parseDate(
      dateValue && typeof dateValue === 'string'
        ? dateValue
        : new Date().toISOString()
    );
    const notesValue = row.Notes;
    const notes =
      notesValue && typeof notesValue === 'string' ? notesValue : '';

    const inputCategory = categoryKeys.category
      ? (() => {
          const categoryValue = row[categoryKeys.category];
          return (
            categoryValue && typeof categoryValue === 'string'
              ? categoryValue
              : ''
          ).trim();
        })()
      : '';
    const inputSubcategory = categoryKeys.subcategory
      ? (() => {
          const subcategoryValue = row[categoryKeys.subcategory];
          return (
            subcategoryValue && typeof subcategoryValue === 'string'
              ? subcategoryValue
              : ''
          ).trim();
        })()
      : '';

    if (inputCategory) {
      const match = findBestMatch(inputCategory, inputSubcategory);

      if (match.category !== 'Uncategorized') {
        categoryMapping[inputCategory] = match;
        categoryMapping[inputSubcategory] = match;
      } else {
        unmatchedCategories.add(inputCategory);
        if (inputSubcategory) {
          unmatchedCategories.add(inputSubcategory);
        }
      }

      transactions.push({
        id: `uploaded-${String(index)}`,
        date,
        entity,
        amount,
        currency: 'USD',
        notes,
        category: match.category,
        subcategory: match.subcategory,
        confidence: match.confidence,
        metadata: {
          source: 'upload' as const,
          fileName: 'uploaded-file',
          fileId: `file-${String(Date.now())}`,
          rowIndex: index,
          rawData: row,
        },
        isManuallyEdited: true,
      });
    }
  });

  return {
    transactions,
    categoryMapping,
    unmatchedCategories: Array.from(unmatchedCategories),
  };
}

/**
 * Detects which columns contain category information
 */
function detectCategoryColumns(columns: string[]): {
  category: string | null;
  subcategory: string | null;
} {
  const normalizedColumns = columns.map((c) => ({
    original: c,
    normalized: c.toLowerCase().trim(),
  }));

  const categoryColumn = normalizedColumns.find(
    (c) => c.normalized === 'category' || c.normalized === 'cat'
  );
  const subcategoryColumn = normalizedColumns.find(
    (c) =>
      c.normalized === 'subcategory' ||
      c.normalized === 'sub-category' ||
      c.normalized === 'sub'
  );

  return {
    category: categoryColumn?.original || null,
    subcategory: subcategoryColumn?.original || null,
  };
}

/**
 * Finds the entity column in a row
 */
function findEntityColumn(row: Record<string, unknown>): string {
  const entityKeys = [
    'Entity',
    'entity',
    'Merchant',
    'merchant',
    'Payee',
    'payee',
  ];
  for (const key of entityKeys) {
    if (key in row && row[key]) return key;
  }

  const keys = Object.keys(row).filter(
    (k) =>
      k.toLowerCase().includes('entity') || k.toLowerCase().includes('merchant')
  );

  return keys[0] || Object.keys(row)[0] || '';
}

/**
 * Finds the description column in a row
 */
function findDescriptionColumn(row: Record<string, unknown>): string {
  const descriptionKeys = [
    'Description',
    'description',
    'desc',
    'Notes',
    'notes',
    'Narrative',
    'narrative',
  ];
  for (const key of descriptionKeys) {
    if (key in row && row[key]) return key;
  }
  return '';
}

/**
 * Finds the date column in a row
 */
function findDateColumn(row: Record<string, unknown>): string {
  const dateKeys = [
    'Date',
    'date',
    'Transaction Date',
    'transaction date',
    'Trans Date',
  ];
  for (const key of dateKeys) {
    if (key in row) return key;
  }
  return Object.keys(row)[0] || 'Date';
}

/**
 * Finds the amount column in a row
 */
function findAmountColumn(row: Record<string, unknown>): string {
  const amountKeys = [
    'Amount',
    'amount',
    'Value',
    'value',
    'Debit',
    'debit',
    'Credit',
    'credit',
  ];
  for (const key of amountKeys) {
    if (key in row) return key;
  }
  return 'Amount';
}

/**
 * Parses amount string to number
 */
function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Parses date string to Date object
 */
function parseDate(dateStr: string): Date {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Creates learning rules from matched categories
 * Can be used to train the ML system
 */
export function extractLearningRules(
  transactions: Transaction[]
): Array<{ pattern: string; category: string; subcategory: string }> {
  const rules = new Map<string, { category: string; subcategory: string }>();

  transactions.forEach((t) => {
    if (t.category && t.category !== 'Uncategorized' && t.entity) {
      const pattern = t.entity.split(/\s+/).slice(0, 2).join(' ');
      if (!rules.has(pattern)) {
        rules.set(pattern, {
          category: t.category,
          subcategory: t.subcategory || '',
        });
      }
    }
  });

  return Array.from(rules.entries()).map(([pattern, match]) => ({
    pattern,
    category: match.category,
    subcategory: match.subcategory,
  }));
}
