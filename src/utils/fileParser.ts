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
 * Parses a CSV file and returns the data as an array of objects
 */
export async function parseCSV(file: File): Promise<Record<string, unknown>[]> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      raw: true,
      codepage: 65001, // UTF-8
    });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new FileParserError('CSV file contains no data', 'NO_DATA');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new FileParserError('CSV file contains no data', 'NO_DATA');
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
      `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PARSE_ERROR'
    );
  }
}

/**
 * Parses an XLSX file and returns the data as an array of objects
 */
export async function parseXLSX(file: File): Promise<Record<string, unknown>[]> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      raw: true,
      codepage: 65001, // UTF-8
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
  const datePatterns = ['date', 'transaction date', 'trans date', 'posting date'];
  const dateIndex = lowerHeaders.findIndex((h) =>
    datePatterns.some((p) => h.includes(p))
  );
  if (dateIndex !== -1 && headers[dateIndex]) {
    mapping.date = headers[dateIndex];
  }

  // Description detection
  const descPatterns = ['description', 'desc', 'memo', 'narrative', 'details', 'transaction'];
  const descIndex = lowerHeaders.findIndex((h) =>
    descPatterns.some((p) => h.includes(p) && !h.includes('date'))
  );
  if (descIndex !== -1 && headers[descIndex]) {
    mapping.description = headers[descIndex];
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

  // Category detection
  const categoryPatterns = ['category', 'type', 'class'];
  const categoryIndex = lowerHeaders.findIndex((h) =>
    categoryPatterns.some((p) => h.includes(p))
  );
  if (categoryIndex !== -1 && headers[categoryIndex]) {
    mapping.category = headers[categoryIndex];
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
