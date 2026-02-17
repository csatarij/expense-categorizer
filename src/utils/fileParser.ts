import * as XLSX from 'xlsx';
import type { ParsedFile, ColumnMapping } from '@/types';

/**
 * Options for file parsing
 */
export interface FileParserOptions {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Array of date formats to try when parsing dates */
  dateFormats?: string[];
  /** File encoding (default: UTF-8) */
  encoding?: string;
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Custom error class for file parsing errors
 */
export class FileParserError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'FileParserError';
  }
}

/**
 * Validates that the file size is within the allowed limit
 * @throws FileParserError if file exceeds size limit
 */
export function validateFileSize(file: File, maxSize: number): void {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new FileParserError(
      `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      'FILE_TOO_LARGE'
    );
  }

  if (file.size === 0) {
    throw new FileParserError('File is empty', 'FILE_EMPTY');
  }
}

/**
 * Detects file type from file name extension
 * @throws FileParserError if file type is not supported
 */
export function detectFileType(fileName: string): 'csv' | 'xlsx' {
  const extension = fileName.toLowerCase().split('.').pop() ?? '';

  if (extension === 'csv') {
    return 'csv';
  }

  if (extension === 'xlsx' || extension === 'xls') {
    return 'xlsx';
  }

  throw new FileParserError(
    `Unsupported file type: .${extension}. Supported types: .csv, .xlsx, .xls`,
    'UNSUPPORTED_FILE_TYPE'
  );
}

/**
 * Reads a file as an ArrayBuffer
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(new FileParserError('Failed to read file', 'READ_ERROR'));
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Detects the CSV separator (comma, semicolon, or tab) from the first line
 */
function detectCSVSeparator(firstLine: string): ',' | ';' | '\t' {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const tabCount = (firstLine.match(/\t/g) ?? []).length;

  if (semicolonCount > commaCount) {
    return ';';
  }
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t';
  }
  return ',';
}

/**
 * Parses a CSV file and returns the data as an array of objects
 */
export async function parseCSV(file: File): Promise<Record<string, unknown>[]> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);

    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(arrayBuffer);

    // Normalize line endings to \n
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText
      .split('\n')
      .filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      throw new FileParserError('CSV file is empty', 'NO_DATA');
    }

    // Detect separator from first line
    const firstLine = lines[0] ?? '';
    const separator = detectCSVSeparator(firstLine);

    // Parse CSV handling quotes properly
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let prevChar = '';
      let i = 0;

      while (i < line.length) {
        const char = line[i] as string;
        const nextChar = i + 1 < line.length ? (line[i + 1] as string) : '';

        // Handle escaped quotes "" which become "
        if (char === '"' && nextChar === '"') {
          current += '"';
          i += 2;
          prevChar = '"';
          continue;
        }

        // Toggle quote state (but only if it's not part of an escape sequence)
        if (char === '"' && prevChar !== '"') {
          inQuotes = !inQuotes;
          i++;
          prevChar = '"';
          continue;
        }

        // Separator handling - only split if not in quotes
        if (char === separator && !inQuotes) {
          result.push(current);
          current = '';
          i++;
          prevChar = char;
          continue;
        }

        current += char;
        i++;
        prevChar = char;
      }

      // Add the last field
      result.push(current);

      return result;
    };

    // Strip outer quotes if the entire line is quoted
    const stripOuterQuotes = (line: string): string => {
      const trimmed = line.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        // Check if this is a properly quoted CSV field (should have no separator outside quotes)
        // If the entire line is wrapped in quotes, remove them
        return trimmed.slice(1, -1).trim();
      }
      return line;
    };

    // Pre-process lines to strip outer quotes if present
    const processedLines = lines.map(stripOuterQuotes);

    // Parse headers
    const headers = parseCSVLine(processedLines[0] ?? '');
    const cleanedHeaders = headers.map((h) => {
      let cleaned = h.trim();
      // Replace all "" with single " throughout
      cleaned = cleaned.replace(/""/g, '"');
      // Remove any remaining surrounding quotes
      if (
        cleaned.startsWith('"') &&
        cleaned.endsWith('"') &&
        cleaned.length > 1
      ) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned.trim();
    });

    if (cleanedHeaders.length === 0) {
      throw new FileParserError('CSV file has no headers', 'NO_DATA');
    }

    // Parse data rows
    const data: Record<string, unknown>[] = [];
    for (let i = 1; i < processedLines.length; i++) {
      const line = processedLines[i] ?? '';
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      const row: Record<string, unknown> = {};

      for (let j = 0; j < cleanedHeaders.length; j++) {
        const header = cleanedHeaders[j];
        if (!header) continue;

        const value = values[j] ?? '';

        // Replace all "" with single " throughout, then remove surrounding quotes if present
        let cleanedValue = value.trim();
        cleanedValue = cleanedValue.replace(/""/g, '"');
        if (
          cleanedValue.startsWith('"') &&
          cleanedValue.endsWith('"') &&
          cleanedValue.length > 1
        ) {
          cleanedValue = cleanedValue.slice(1, -1);
        }
        cleanedValue = cleanedValue.trim();

        row[header] = cleanedValue;
      }

      if (Object.keys(row).length > 0) {
        data.push(row);
      }
    }

    return data;
  } catch (error) {
    if (error instanceof FileParserError) {
      throw error;
    }
    throw new FileParserError(
      `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PARSE_ERROR'
    );
  }
}

/**
 * Parses an XLSX file and returns the data as an array of objects
 */
export async function parseXLSX(
  file: File
): Promise<Record<string, unknown>[]> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      codepage: 65001,
    });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new FileParserError('XLSX file contains no sheets', 'NO_DATA');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new FileParserError('XLSX file contains no sheets', 'NO_DATA');
    }
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: false,
    });

    return data;
  } catch (error) {
    if (error instanceof FileParserError) {
      throw error;
    }
    throw new FileParserError(
      `Failed to parse XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PARSE_ERROR'
    );
  }
}

/**
 * Extracts headers from the parsed data
 */
function extractHeaders(data: Record<string, unknown>[]): string[] {
  if (data.length === 0 || !data[0]) {
    return [];
  }
  return Object.keys(data[0]);
}

/**
 * Attempts to detect column mappings based on header names
 */
function detectColumnMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  // Date detection
  const datePatterns = [
    'date',
    'transaction date',
    'trans date',
    'posting date',
  ];
  const dateIndex = lowerHeaders.findIndex((h) =>
    datePatterns.some((p) => h.includes(p))
  );
  if (dateIndex !== -1 && headers[dateIndex]) {
    mapping.date = headers[dateIndex];
  }

  // Entity detection
  const entityPatterns = [
    'description',
    'merchant',
    'payee',
    'vendor',
    'store',
    'retailer',
    'details',
    'name',
  ];
  const entityIndex = lowerHeaders.findIndex((h) =>
    entityPatterns.some((p) => h.includes(p) && !h.includes('date'))
  );
  if (entityIndex !== -1 && headers[entityIndex]) {
    mapping.entity = headers[entityIndex];
  }

  // Secondary entity patterns for less specific fields
  const secondaryEntityPatterns = [
    'transaction',
    'memo',
    'narrative',
    'subject',
    'reference',
  ];
  if (!mapping.entity) {
    const secondaryIndex = lowerHeaders.findIndex((h) =>
      secondaryEntityPatterns.some((p) => h.includes(p) && !h.includes('date'))
    );
    if (secondaryIndex !== -1 && headers[secondaryIndex]) {
      mapping.entity = headers[secondaryIndex];
    }
  }

  // Notes detection
  const notesPatterns = [
    'notes',
    'note',
    'subject',
    'comment',
    'remarks',
    'custom description',
  ];
  const notesIndex = lowerHeaders.findIndex((h) =>
    notesPatterns.some((p) => h.includes(p))
  );
  if (notesIndex !== -1 && headers[notesIndex]) {
    mapping.notes = headers[notesIndex];
  }

  // Amount detection
  const amountPatterns = ['amount', 'sum', 'total', 'value'];
  const amountIndex = lowerHeaders.findIndex((h) =>
    amountPatterns.some((p) => h.includes(p))
  );
  if (amountIndex !== -1 && headers[amountIndex]) {
    mapping.amount = headers[amountIndex];
  }

  // Debit detection
  const debitPatterns = ['debit', 'withdrawal', 'out'];
  const debitIndex = lowerHeaders.findIndex((h) =>
    debitPatterns.some((p) => h.includes(p))
  );
  if (debitIndex !== -1 && headers[debitIndex]) {
    mapping.debit = headers[debitIndex];
  }

  // Credit detection
  const creditPatterns = ['credit', 'deposit', 'in'];
  const creditIndex = lowerHeaders.findIndex((h) =>
    creditPatterns.some((p) => h === p || h.includes(p))
  );
  if (creditIndex !== -1 && headers[creditIndex]) {
    mapping.credit = headers[creditIndex];
  }

  // Balance detection (often present in bank statements but not used for transactions)
  const balancePatterns = ['balance', 'running balance'];
  const balanceIndex = lowerHeaders.findIndex((h) =>
    balancePatterns.some((p) => h.includes(p))
  );
  if (balanceIndex !== -1 && headers[balanceIndex]) {
    mapping.balance = headers[balanceIndex];
  }

  // Category detection
  const categoryPatterns = ['category', 'type', 'class'];
  const categoryIndex = lowerHeaders.findIndex((h) =>
    categoryPatterns.some((p) => h.includes(p))
  );
  if (categoryIndex !== -1 && headers[categoryIndex]) {
    mapping.category = headers[categoryIndex];
  }

  // Currency detection
  const currencyPatterns = ['currency', 'curr', 'ccy'];
  const currencyIndex = lowerHeaders.findIndex((h) =>
    currencyPatterns.some((p) => h.includes(p))
  );
  if (currencyIndex !== -1 && headers[currencyIndex]) {
    mapping.currency = headers[currencyIndex];
  }

  return mapping;
}

/**
 * Parses a file (CSV or XLSX) and returns structured data
 * @param file - The file to parse
 * @param options - Optional parsing options
 * @returns Promise resolving to ParsedFile object
 * @throws FileParserError for validation or parsing errors
 */
export async function parseFile(
  file: File,
  options: FileParserOptions = {}
): Promise<ParsedFile> {
  const { maxFileSize = DEFAULT_MAX_FILE_SIZE } = options;

  // Validate file
  validateFileSize(file, maxFileSize);

  // Detect file type
  const fileType = detectFileType(file.name);

  // Parse based on file type
  let data: Record<string, unknown>[];
  if (fileType === 'csv') {
    data = await parseCSV(file);
  } else {
    data = await parseXLSX(file);
  }

  // Extract headers and detect column mappings
  const headers = extractHeaders(data);
  const detectedColumns = detectColumnMappings(headers);

  return {
    data,
    headers,
    detectedColumns,
    fileName: file.name,
    fileType,
  };
}
