import { describe, it, expect } from 'vitest';
import { parseDate, formatDate } from './dateParser';

describe('dateParser', () => {
  describe('parseDate', () => {
    it('should parse ISO date format (YYYY-MM-DD)', () => {
      const dateStr = '2024-01-15';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse ISO datetime format', () => {
      const dateStr = '2024-01-15T10:30:00';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse German date format (DD.MM.YYYY)', () => {
      const dateStr = '15.01.2024';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse European date format with slashes (DD/MM/YYYY)', () => {
      const dateStr = '15/01/2024';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse American date format (MM/DD/YYYY)', () => {
      const dateStr = '12/25/2024';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(25);
    });

    it('should parse European date format with dashes (DD-MM-YYYY)', () => {
      const dateStr = '15-01-2024';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse Hungarian/German year-first format (YYYY.MM.DD)', () => {
      const dateStr = '2024.01.15';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse year-first format with slashes (YYYY/MM/DD)', () => {
      const dateStr = '2024/01/15';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse numeric timestamp', () => {
      const dateStr = '1705276800000';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse date without separators (YYYYMMDD)', () => {
      const dateStr = '20240115';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should handle single-digit day and month', () => {
      const dateStr = '1.2.2024';
      const date = parseDate(dateStr, new Date('2024-01-01'));
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(1);
    });

    it('should return fallback date for empty string', () => {
      const fallback = new Date('2024-01-01');
      const date = parseDate('', fallback);
      expect(date).toBe(fallback);
    });

    it('should return fallback date for null input', () => {
      const fallback = new Date('2024-01-01');
      const date = parseDate(null as unknown as string, fallback);
      expect(date).toBe(fallback);
    });

    it('should return fallback date for invalid date string', () => {
      const fallback = new Date('2024-01-01');
      const date = parseDate('not a date', fallback);
      expect(date).toBe(fallback);
    });

    it('should return fallback date for whitespace only', () => {
      const fallback = new Date('2024-01-01');
      const date = parseDate('   ', fallback);
      expect(date).toBe(fallback);
    });

    it('should handle different separators consistently', () => {
      const date1 = parseDate('15.01.2024', new Date('2024-01-01'));
      const date2 = parseDate('15/01/2024', new Date('2024-01-01'));
      const date3 = parseDate('15-01-2024', new Date('2024-01-01'));
      expect(date1.getTime()).toBe(date2.getTime());
      expect(date2.getTime()).toBe(date3.getTime());
    });

    it('should default to current date for invalid date without fallback', () => {
      const date = parseDate('not a date');
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe('formatDate', () => {
    it('should format date as iso', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatDate(date, 'iso')).toBe(date.toISOString());
    });

    it('should format date as date (YYYY-MM-DD)', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatDate(date, 'date')).toBe(date.toISOString().split('T')[0]);
    });

    it('should format date as month-year', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'month-year')).toContain('2024');
      expect(formatDate(date, 'month-year')).toContain('January');
    });

    it('should format date as full', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date, 'full');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });

    it('should auto-detect best format for ISO date', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'auto')).toBe('2024-01-15');
    });

    it('should handle auto format for dates with time', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const formatted = formatDate(date, 'auto');
      expect(formatted).toContain('2024-01-15');
    });
  });
});
