import type { ColumnMapping } from '@/types';

/**
 * Result of column detection with confidence scores
 */
export interface ColumnDetectionResult {
  mapping: ColumnMapping;
  confidence: Partial<Record<keyof ColumnMapping, number>>;
}

/**
 * Common column name patterns for detection
 */
export const COLUMN_PATTERNS: Record<keyof ColumnMapping, string[]> = {
  date: [
    'date',
    'transaction date',
    'posted date',
    'trans date',
    'txn date',
    'posting date',
  ],
  entity: [
    'entity',
    'description',
    'details',
    'merchant',
    'payee',
    'vendor',
    'store',
    'retailer',
    'memo',
    'transaction',
    'name',
  ],
  notes: [
    'notes',
    'note',
    'subject',
    'comment',
    'remarks',
    'custom description',
  ],
  amount: ['amount', 'transaction amount', 'value', 'total', 'sum'],
  currency: ['currency', 'curr', 'ccy', 'currency code'],
  debit: ['debit', 'withdrawal', 'charge', 'debit amount', 'money out'],
  credit: ['credit', 'deposit', 'credit amount', 'money in'],
  category: ['category', 'type', 'class', 'classification', 'expense type'],
  subcategory: ['subcategory', 'sub-category', 'sub category', 'subtype'],
};

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    const row = matrix[0];
    if (row) {
      row[j] = j;
    }
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      const currentRow = matrix[i];
      const prevRow = matrix[i - 1];
      if (!currentRow || !prevRow) continue;

      const prevRowPrevCol = prevRow[j - 1] ?? 0;
      const currentRowPrevCol = currentRow[j - 1] ?? 0;
      const prevRowCurrentCol = prevRow[j] ?? 0;

      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        currentRow[j] = prevRowPrevCol;
      } else {
        currentRow[j] = Math.min(
          prevRowPrevCol + 1, // substitution
          currentRowPrevCol + 1, // insertion
          prevRowCurrentCol + 1 // deletion
        );
      }
    }
  }

  const lastRow = matrix[bLower.length];
  return lastRow?.[aLower.length] ?? Math.max(aLower.length, bLower.length);
}

/**
 * Check if a value looks like a date
 */
export function isDateLike(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  // Safe to convert since we check for object type
  const strValue =
    typeof value === 'object'
      ? ''
      : (value as string | number | boolean).toString().trim();
  if (!strValue) return false;

  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // ISO: 2024-01-15
    /^\d{2}\/\d{2}\/\d{4}$/, // US: 01/15/2024
    /^\d{2}-\d{2}-\d{4}$/, // EU: 15-01-2024
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // Short: 1/15/24
    /^\d{4}\/\d{2}\/\d{2}$/, // 2024/01/15
    /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/, // Jan 15, 2024
    /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/, // 15 Jan 2024
    /^\d{8}$/, // 20240115
  ];

  let matchesPattern = false;
  for (const pattern of datePatterns) {
    if (pattern.test(strValue)) {
      matchesPattern = true;
      break;
    }
  }

  // If it matches a pattern or can be parsed, validate the year range
  const parsed = Date.parse(strValue);
  if (matchesPattern || !isNaN(parsed)) {
    if (!isNaN(parsed)) {
      const year = new Date(parsed).getFullYear();
      return year >= 1900 && year <= 2100;
    }
    // If pattern matched but can't parse, still accept it
    return matchesPattern;
  }

  return false;
}

/**
 * Check if a value looks like a number/currency
 */
export function isNumberLike(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (typeof value === 'number') {
    return !isNaN(value);
  }

  if (typeof value === 'object') {
    return false;
  }

  // Safe to convert to string since we've checked for object above
  const strValue = (value as string | number | boolean).toString().trim();

  // Remove common currency symbols and formatting
  const cleaned = strValue
    .replace(/[$€£¥₹,\s]/g, '')
    .replace(/^\((.+)\)$/, '-$1'); // Handle accounting format (1000) = -1000

  // Check if it's a valid number
  const num = parseFloat(cleaned);
  return !isNaN(num) && isFinite(num);
}

/**
 * Analyze column content to determine its type
 */
export function analyzeColumnContent(
  values: unknown[]
): 'date' | 'number' | 'string' {
  const nonEmptyValues = values.filter(
    (v) => v !== null && v !== undefined && v !== ''
  );

  if (nonEmptyValues.length === 0) {
    return 'string';
  }

  let dateCount = 0;
  let numberCount = 0;

  for (const value of nonEmptyValues) {
    if (isDateLike(value)) {
      dateCount++;
    }
    if (isNumberLike(value)) {
      numberCount++;
    }
  }

  const threshold = nonEmptyValues.length * 0.7; // 70% threshold

  if (dateCount >= threshold) {
    return 'date';
  }
  if (numberCount >= threshold) {
    return 'number';
  }

  return 'string';
}

/**
 * Calculate similarity score based on Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Find best match using exact matching
 */
function findExactMatch(
  header: string,
  patterns: string[]
): { matched: boolean; confidence: number } {
  const normalizedHeader = header.toLowerCase().trim();

  for (const pattern of patterns) {
    if (normalizedHeader === pattern.toLowerCase()) {
      return { matched: true, confidence: 100 };
    }
  }

  // Check if header contains the pattern
  for (const pattern of patterns) {
    if (normalizedHeader.includes(pattern.toLowerCase())) {
      return { matched: true, confidence: 90 };
    }
  }

  return { matched: false, confidence: 0 };
}

/**
 * Find best match using fuzzy matching
 */
function findFuzzyMatch(
  header: string,
  patterns: string[]
): { matched: boolean; confidence: number } {
  const normalizedHeader = header.toLowerCase().trim();
  let bestSimilarity = 0;

  for (const pattern of patterns) {
    const similarity = calculateSimilarity(
      normalizedHeader,
      pattern.toLowerCase()
    );
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
    }
  }

  // Consider it a fuzzy match if similarity is above 70%
  if (bestSimilarity >= 70) {
    return { matched: true, confidence: bestSimilarity };
  }

  return { matched: false, confidence: 0 };
}

/**
 * Extract column values from sample rows
 */
function getColumnValues(
  sampleRows: unknown[][],
  columnIndex: number
): unknown[] {
  return sampleRows.map((row) => row[columnIndex]);
}

/**
 * Detect columns in data based on headers and sample content
 */
export function detectColumns(
  headers: string[],
  sampleRows: unknown[][] = []
): ColumnDetectionResult {
  const mapping: ColumnMapping = {};
  const confidence: Partial<Record<keyof ColumnMapping, number>> = {};
  const usedIndices = new Set<number>();

  const columnTypes = Object.keys(COLUMN_PATTERNS) as (keyof ColumnMapping)[];

  // Step 1: Exact matching
  for (const columnType of columnTypes) {
    const patterns = COLUMN_PATTERNS[columnType];

    for (let i = 0; i < headers.length; i++) {
      if (usedIndices.has(i)) continue;

      const header = headers[i];
      if (!header) continue;

      const result = findExactMatch(header, patterns);
      if (result.matched && result.confidence > (confidence[columnType] ?? 0)) {
        mapping[columnType] = header;
        confidence[columnType] = result.confidence;
        usedIndices.add(i);
        break;
      }
    }
  }

  // Step 2: Fuzzy matching for undetected columns
  for (const columnType of columnTypes) {
    if (mapping[columnType]) continue;

    const patterns = COLUMN_PATTERNS[columnType];

    for (let i = 0; i < headers.length; i++) {
      if (usedIndices.has(i)) continue;

      const header = headers[i];
      if (!header) continue;

      const result = findFuzzyMatch(header, patterns);
      if (result.matched && result.confidence > (confidence[columnType] ?? 0)) {
        mapping[columnType] = header;
        confidence[columnType] = result.confidence;
        usedIndices.add(i);
        break;
      }
    }
  }

  // Step 3: Content analysis for remaining columns
  if (sampleRows.length > 0) {
    // Try to detect date column by content
    if (!mapping.date) {
      for (let i = 0; i < headers.length; i++) {
        if (usedIndices.has(i)) continue;

        const header = headers[i];
        if (!header) continue;

        const values = getColumnValues(sampleRows, i);
        const contentType = analyzeColumnContent(values);

        if (contentType === 'date') {
          mapping.date = header;
          confidence.date = 60; // Lower confidence for content-based detection
          usedIndices.add(i);
          break;
        }
      }
    }

    // Try to detect amount/debit/credit by content
    if (!mapping.amount && !mapping.debit && !mapping.credit) {
      const numberColumns: { index: number; header: string }[] = [];

      for (let i = 0; i < headers.length; i++) {
        if (usedIndices.has(i)) continue;

        const header = headers[i];
        if (!header) continue;

        const values = getColumnValues(sampleRows, i);
        const contentType = analyzeColumnContent(values);

        if (contentType === 'number') {
          numberColumns.push({ index: i, header });
        }
      }

      // If we found exactly one number column, it's likely the amount
      if (numberColumns.length === 1 && numberColumns[0]) {
        mapping.amount = numberColumns[0].header;
        confidence.amount = 50;
        usedIndices.add(numberColumns[0].index);
      }
      // If we found two number columns, they might be debit/credit
      else if (
        numberColumns.length === 2 &&
        numberColumns[0] &&
        numberColumns[1]
      ) {
        // Check headers for hints
        const col1Lower = numberColumns[0].header.toLowerCase();
        const col2Lower = numberColumns[1].header.toLowerCase();

        if (col1Lower.includes('out') || col2Lower.includes('in')) {
          mapping.debit = numberColumns[0].header;
          mapping.credit = numberColumns[1].header;
          confidence.debit = 40;
          confidence.credit = 40;
        } else if (col1Lower.includes('in') || col2Lower.includes('out')) {
          mapping.credit = numberColumns[0].header;
          mapping.debit = numberColumns[1].header;
          confidence.credit = 40;
          confidence.debit = 40;
        } else {
          // Default: first is debit, second is credit
          mapping.debit = numberColumns[0].header;
          mapping.credit = numberColumns[1].header;
          confidence.debit = 30;
          confidence.credit = 30;
        }
        usedIndices.add(numberColumns[0].index);
        usedIndices.add(numberColumns[1].index);
      }
    }

    // Try to detect entity by finding longest string column
    if (!mapping.entity) {
      let bestColumn: {
        index: number;
        header: string;
        avgLength: number;
      } | null = null;

      for (let i = 0; i < headers.length; i++) {
        if (usedIndices.has(i)) continue;

        const header = headers[i];
        if (!header) continue;

        const values = getColumnValues(sampleRows, i);
        const contentType = analyzeColumnContent(values);

        if (contentType === 'string') {
          const avgLength =
            values.reduce((sum: number, v) => {
              const str =
                v !== null && v !== undefined && typeof v !== 'object'
                  ? (v as string | number | boolean).toString()
                  : '';
              return sum + str.length;
            }, 0) / values.length;

          if (!bestColumn || avgLength > bestColumn.avgLength) {
            bestColumn = { index: i, header, avgLength };
          }
        }
      }

      if (bestColumn && bestColumn.avgLength > 5) {
        mapping.entity = bestColumn.header;
        confidence.entity = 40;
        usedIndices.add(bestColumn.index);
      }
    }
  }

  return { mapping, confidence };
}
