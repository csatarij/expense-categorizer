import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  getCategoryNames,
  getSubcategories,
  isValidCategory,
  isValidSubcategory,
} from './categories';

describe('categories', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('should contain all expected top-level categories', () => {
      const expectedCategories = [
        'Income',
        'Housing',
        'Transportation',
        'Food & Dining',
        'Shopping',
        'Entertainment',
        'Health & Wellness',
        'Bills & Utilities',
        'Financial',
        'Education',
        'Pets',
        'Uncategorized',
      ];

      expect(Object.keys(DEFAULT_CATEGORIES)).toEqual(expectedCategories);
    });

    it('should have Income category with correct subcategories', () => {
      expect(DEFAULT_CATEGORIES.Income).toEqual([
        'Salary',
        'Freelance',
        'Investment Returns',
        'Refunds',
        'Other Income',
      ]);
    });

    it('should have Housing category with correct subcategories', () => {
      expect(DEFAULT_CATEGORIES.Housing).toContain('Rent');
      expect(DEFAULT_CATEGORIES.Housing).toContain('Mortgage');
      expect(DEFAULT_CATEGORIES.Housing).toContain('Utilities');
    });

    it('should have empty array for Uncategorized', () => {
      expect(DEFAULT_CATEGORIES.Uncategorized).toEqual([]);
    });

    it('should have Food & Dining category with correct subcategories', () => {
      expect(DEFAULT_CATEGORIES['Food & Dining']).toContain('Groceries');
      expect(DEFAULT_CATEGORIES['Food & Dining']).toContain('Restaurants');
    });
  });

  describe('getCategoryNames', () => {
    it('should return all category names', () => {
      const names = getCategoryNames();

      expect(names).toHaveLength(12);
      expect(names).toContain('Income');
      expect(names).toContain('Housing');
      expect(names).toContain('Uncategorized');
    });

    it('should return categories in correct order', () => {
      const names = getCategoryNames();

      expect(names[0]).toBe('Income');
      expect(names[names.length - 1]).toBe('Uncategorized');
    });
  });

  describe('getSubcategories', () => {
    it('should return subcategories for valid category', () => {
      const subcategories = getSubcategories('Income');

      expect(subcategories).toContain('Salary');
      expect(subcategories).toContain('Freelance');
    });

    it('should return empty array for Uncategorized', () => {
      const subcategories = getSubcategories('Uncategorized');

      expect(subcategories).toEqual([]);
    });

    it('should return empty array for non-existent category', () => {
      const subcategories = getSubcategories('NonExistent');

      expect(subcategories).toEqual([]);
    });

    it('should return correct subcategories for Transportation', () => {
      const subcategories = getSubcategories('Transportation');

      expect(subcategories).toContain('Gas');
      expect(subcategories).toContain('Public Transit');
      expect(subcategories).toContain('Car Payment');
    });
  });

  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      expect(isValidCategory('Income')).toBe(true);
      expect(isValidCategory('Housing')).toBe(true);
      expect(isValidCategory('Food & Dining')).toBe(true);
      expect(isValidCategory('Uncategorized')).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(isValidCategory('NonExistent')).toBe(false);
      expect(isValidCategory('')).toBe(false);
      expect(isValidCategory('income')).toBe(false); // case sensitive
    });
  });

  describe('isValidSubcategory', () => {
    it('should return true for valid subcategory in category', () => {
      expect(isValidSubcategory('Income', 'Salary')).toBe(true);
      expect(isValidSubcategory('Housing', 'Rent')).toBe(true);
      expect(isValidSubcategory('Transportation', 'Gas')).toBe(true);
    });

    it('should return false for invalid subcategory', () => {
      expect(isValidSubcategory('Income', 'Rent')).toBe(false);
      expect(isValidSubcategory('Housing', 'Salary')).toBe(false);
    });

    it('should return false for non-existent category', () => {
      expect(isValidSubcategory('NonExistent', 'Salary')).toBe(false);
    });

    it('should return false for Uncategorized with any subcategory', () => {
      expect(isValidSubcategory('Uncategorized', 'Anything')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isValidSubcategory('Income', 'salary')).toBe(false);
      expect(isValidSubcategory('Income', 'SALARY')).toBe(false);
    });
  });
});
