import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseFile,
  parseCSV,
  parseXLSX,
  validateFileSize,
  detectFileType,
  FileParserError,
  type FileParserOptions,
} from './fileParser';

/**
 * Creates a mock File object from content with proper UTF-8 encoding
 */
function createMockFile(
  content: string | ArrayBuffer,
  fileName: string,
  type: string = 'text/csv'
): File {
  // Encode string as UTF-8 using TextEncoder for proper Unicode support
  const encodedContent =
    typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const blob = new Blob([encodedContent], { type });
  return new File([blob], fileName, { type });
}

/**
 * Creates an XLSX file as a mock File object
 */
function createMockXLSXFile(
  data: (string | number)[][],
  fileName: string
): File {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('fileParser', () => {
  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const file = createMockFile('test content', 'test.csv');
      expect(() => {
        validateFileSize(file, 1024 * 1024);
      }).not.toThrow();
    });

    it('should reject files exceeding size limit', () => {
      const largeContent = 'x'.repeat(1024 * 1024 + 1); // Just over 1MB
      const file = createMockFile(largeContent, 'large.csv');
      expect(() => {
        validateFileSize(file, 1024 * 1024);
      }).toThrow(FileParserError);
      expect(() => {
        validateFileSize(file, 1024 * 1024);
      }).toThrow('exceeds maximum allowed size');
    });

    it('should reject empty files', () => {
      const file = createMockFile('', 'empty.csv');
      expect(() => {
        validateFileSize(file, 1024 * 1024);
      }).toThrow(FileParserError);
      expect(() => {
        validateFileSize(file, 1024 * 1024);
      }).toThrow('File is empty');
    });

    it('should include file size in error message', () => {
      const content = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const file = createMockFile(content, 'large.csv');
      try {
        validateFileSize(file, 1024 * 1024); // 1MB limit
      } catch (error) {
        expect(error).toBeInstanceOf(FileParserError);
        expect((error as FileParserError).message).toContain('2.0MB');
        expect((error as FileParserError).code).toBe('FILE_TOO_LARGE');
      }
    });
  });

  describe('detectFileType', () => {
    it('should detect CSV files', () => {
      expect(detectFileType('test.csv')).toBe('csv');
      expect(detectFileType('TEST.CSV')).toBe('csv');
      expect(detectFileType('my-file.CSV')).toBe('csv');
    });

    it('should detect XLSX files', () => {
      expect(detectFileType('test.xlsx')).toBe('xlsx');
      expect(detectFileType('TEST.XLSX')).toBe('xlsx');
    });

    it('should detect XLS files as xlsx type', () => {
      expect(detectFileType('old-file.xls')).toBe('xlsx');
    });

    it('should throw error for unsupported file types', () => {
      expect(() => detectFileType('test.pdf')).toThrow(FileParserError);
      expect(() => detectFileType('test.pdf')).toThrow('Unsupported file type');
    });

    it('should include supported types in error message', () => {
      try {
        detectFileType('test.txt');
      } catch (error) {
        expect(error).toBeInstanceOf(FileParserError);
        expect((error as FileParserError).message).toContain('.csv');
        expect((error as FileParserError).message).toContain('.xlsx');
        expect((error as FileParserError).code).toBe('UNSUPPORTED_FILE_TYPE');
      }
    });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV file', async () => {
      const csvContent = 'Date,Description,Amount\n2024-01-01,Test Transaction,-50.00';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseCSV(file);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        Date: '2024-01-01',
        Description: 'Test Transaction',
        Amount: '-50.00',
      });
    });

    it('should handle CSV with multiple rows', async () => {
      const csvContent =
        'Date,Description,Amount\n2024-01-01,First,-10\n2024-01-02,Second,-20\n2024-01-03,Third,-30';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseCSV(file);

      expect(result).toHaveLength(3);
      expect(result[0]?.Description).toBe('First');
      expect(result[2]?.Description).toBe('Third');
    });

    it('should handle CSV with special characters', async () => {
      const csvContent =
        'Date,Description,Amount\n2024-01-01,"Café, résumé & naïve",-25.00';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseCSV(file);

      expect(result).toHaveLength(1);
      expect(result[0]?.Description).toBe('Café, résumé & naïve');
    });

    it('should handle CSV with quoted fields containing commas', async () => {
      const csvContent =
        'Date,Description,Amount\n2024-01-01,"Company, Inc. Payment",-100.00';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseCSV(file);

      expect(result).toHaveLength(1);
      expect(result[0]?.Description).toBe('Company, Inc. Payment');
    });

    it('should handle empty values', async () => {
      const csvContent = 'Date,Description,Amount\n2024-01-01,,-50.00';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseCSV(file);

      expect(result).toHaveLength(1);
      expect(result[0]?.Description).toBe('');
    });
  });

  describe('parseXLSX', () => {
    it('should parse valid XLSX file', async () => {
      const data = [
        ['Date', 'Description', 'Amount'],
        ['2024-01-01', 'Test Transaction', -50],
      ];
      const file = createMockXLSXFile(data, 'test.xlsx');
      const result = await parseXLSX(file);

      expect(result).toHaveLength(1);
      expect(result[0]?.Description).toBe('Test Transaction');
    });

    it('should handle XLSX with multiple rows', async () => {
      const data = [
        ['Date', 'Description', 'Amount'],
        ['2024-01-01', 'First', -10],
        ['2024-01-02', 'Second', -20],
        ['2024-01-03', 'Third', -30],
      ];
      const file = createMockXLSXFile(data, 'test.xlsx');
      const result = await parseXLSX(file);

      expect(result).toHaveLength(3);
      expect(result[0]?.Description).toBe('First');
      expect(result[2]?.Description).toBe('Third');
    });

    it('should handle XLSX with special characters', async () => {
      const data = [
        ['Date', 'Description', 'Amount'],
        ['2024-01-01', 'Café résumé naïve', -25],
      ];
      const file = createMockXLSXFile(data, 'test.xlsx');
      const result = await parseXLSX(file);

      expect(result).toHaveLength(1);
      expect(result[0]?.Description).toBe('Café résumé naïve');
    });

    it('should handle XLSX with numeric values', async () => {
      const data = [
        ['Date', 'Description', 'Amount'],
        ['2024-01-01', 'Test', -123.45],
      ];
      const file = createMockXLSXFile(data, 'test.xlsx');
      const result = await parseXLSX(file);

      expect(result).toHaveLength(1);
      expect(result[0]?.Amount).toBe('-123.45');
    });
  });

  describe('parseFile', () => {
    it('should parse CSV file and return ParsedFile structure', async () => {
      const csvContent = 'Date,Description,Amount\n2024-01-01,Test,-50.00';
      const file = createMockFile(csvContent, 'transactions.csv');
      const result = await parseFile(file);

      expect(result.fileName).toBe('transactions.csv');
      expect(result.fileType).toBe('csv');
      expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
      expect(result.data).toHaveLength(1);
    });

    it('should parse XLSX file and return ParsedFile structure', async () => {
      const data = [
        ['Date', 'Description', 'Amount'],
        ['2024-01-01', 'Test', -50],
      ];
      const file = createMockXLSXFile(data, 'transactions.xlsx');
      const result = await parseFile(file);

      expect(result.fileName).toBe('transactions.xlsx');
      expect(result.fileType).toBe('xlsx');
      expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
      expect(result.data).toHaveLength(1);
    });

    it('should detect column mappings automatically', async () => {
      const csvContent =
        'Transaction Date,Description,Amount,Category\n2024-01-01,Test,-50.00,Food';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.detectedColumns.date).toBe('Transaction Date');
      expect(result.detectedColumns.description).toBe('Description');
      expect(result.detectedColumns.amount).toBe('Amount');
      expect(result.detectedColumns.category).toBe('Category');
    });

    it('should detect debit/credit columns', async () => {
      const csvContent =
        'Date,Description,Debit,Credit\n2024-01-01,Test,50.00,';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.detectedColumns.debit).toBe('Debit');
      expect(result.detectedColumns.credit).toBe('Credit');
    });

    it('should detect currency column', async () => {
      const csvContent =
        'Date,Description,Amount,Currency\n2024-01-01,Test,50.00,USD';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.detectedColumns.currency).toBe('Currency');
    });

    it('should respect custom max file size option', async () => {
      const content = 'x'.repeat(100);
      const file = createMockFile(content, 'test.csv');
      const options: FileParserOptions = { maxFileSize: 50 };

      await expect(parseFile(file, options)).rejects.toThrow(FileParserError);
      await expect(parseFile(file, options)).rejects.toThrow('exceeds maximum');
    });

    it('should reject unsupported file types', async () => {
      const file = createMockFile('content', 'test.pdf');

      await expect(parseFile(file)).rejects.toThrow(FileParserError);
      await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
    });

    it('should handle empty file', async () => {
      const file = createMockFile('', 'empty.csv');

      await expect(parseFile(file)).rejects.toThrow(FileParserError);
      await expect(parseFile(file)).rejects.toThrow('File is empty');
    });

    it('should extract headers from first row', async () => {
      const csvContent = 'Col1,Col2,Col3\nA,B,C\nD,E,F';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.headers).toEqual(['Col1', 'Col2', 'Col3']);
      expect(result.data).toHaveLength(2);
    });

    it('should handle file with only headers', async () => {
      const csvContent = 'Date,Description,Amount';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.headers).toEqual([]);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('header extraction', () => {
    it('should handle headers with spaces', async () => {
      const csvContent = 'Transaction Date,Full Description,Total Amount\n2024-01-01,Test,-50';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.headers).toContain('Transaction Date');
      expect(result.headers).toContain('Full Description');
      expect(result.headers).toContain('Total Amount');
    });

    it('should preserve original header casing', async () => {
      const csvContent = 'DATE,Description,AMOUNT\n2024-01-01,Test,-50';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.headers).toEqual(['DATE', 'Description', 'AMOUNT']);
    });
  });

  describe('data row extraction', () => {
    it('should extract all data rows', async () => {
      const csvContent = 'A,B\n1,2\n3,4\n5,6\n7,8\n9,10';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.data).toHaveLength(5);
    });

    it('should map data to correct headers', async () => {
      const csvContent = 'Name,Value\nAlice,100\nBob,200';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.data[0]).toEqual({ Name: 'Alice', Value: '100' });
      expect(result.data[1]).toEqual({ Name: 'Bob', Value: '200' });
    });
  });

  describe('encoding handling', () => {
    it('should handle UTF-8 encoded files', async () => {
      const csvContent = 'Name,City\nJosé,São Paulo\nFrançois,Montréal';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.data[0]?.Name).toBe('José');
      expect(result.data[0]?.City).toBe('São Paulo');
      expect(result.data[1]?.Name).toBe('François');
    });

    it('should handle emoji in data', async () => {
      const csvContent = 'Name,Note\nTest,Hello 👋 World 🌍';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.data[0]?.Note).toBe('Hello 👋 World 🌍');
    });
  });

  describe('malformed data handling', () => {
    it('should handle rows with missing values', async () => {
      const csvContent = 'A,B,C\n1,,3\n,2,\n1,2,3';
      const file = createMockFile(csvContent, 'test.csv');
      const result = await parseFile(file);

      expect(result.data).toHaveLength(3);
      expect(result.data[0]?.B).toBe('');
      expect(result.data[1]?.A).toBe('');
      expect(result.data[1]?.C).toBe('');
    });

    it('should handle inconsistent row lengths gracefully', async () => {
      const csvContent = 'A,B,C\n1,2\n1,2,3,4\n1,2,3';
      const file = createMockFile(csvContent, 'test.csv');

      // Should not throw, SheetJS handles this
      const result = await parseFile(file);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('FileParserError', () => {
    it('should have correct name property', () => {
      const error = new FileParserError('Test message', 'TEST_CODE');
      expect(error.name).toBe('FileParserError');
    });

    it('should have message and code properties', () => {
      const error = new FileParserError('Test message', 'TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
    });

    it('should be instance of Error', () => {
      const error = new FileParserError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FileParserError);
    });
  });
});
