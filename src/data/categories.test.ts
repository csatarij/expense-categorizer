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
        'FoodShopping',
        'Financial',
        'Education',
        'Pets',
        'Misc',
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
        'Income Salary',
      ]);
    });

    it('should have Housing category with correct subcategories', () => {
      expect(DEFAULT_CATEGORIES.Housing).toContain('Rent');
      expect(DEFAULT_CATEGORIES.Housing).toContain('Mortgage');
      expect(DEFAULT_CATEGORIES.Housing).toContain('Utilities');
    });

    it('should have empty array for Misc', () => {
      expect(DEFAULT_CATEGORIES.Misc).toEqual([]);
    });

    it('should have FoodShopping category with correct subcategories', () => {
      expect(DEFAULT_CATEGORIES.FoodShopping).toEqual([
        'Food',
        'Food / Groceries',
        'Groceries Food',
        'Food / Dining',
      ]);
    });
  });

  describe('category order', () => {
    it('categories should be in correct order', () => {
      const expectedOrder = [
        'Income',
        'Housing',
        'Transportation',
        'Food & Dining',
        'Shopping',
        'Entertainment',
        'Health & Wellness',
        'Bills & Utilities',
        'FoodShopping',
        'Financial',
        'Education',
        'Pets',
        'Misc',
      ];

      const categories = Object.keys(DEFAULT_CATEGORIES);
      expect(categories).toHaveLength(13);
      expect(categories).toEqual(expectedOrder);
    });

    it('FoodShopping should appear before Financial', () => {
      const categories = Object.keys(DEFAULT_CATEGORIES);
      const foodShoppingIndex = categories.indexOf('FoodShopping');
      const financialIndex = categories.indexOf('Financial');
      expect(foodShoppingIndex).toBeLessThan(financialIndex);
    });

    it('Misc should be last category', () => {
      const categories = Object.keys(DEFAULT_CATEGORIES);
      const miscIndex = categories.indexOf('Misc');
      expect(miscIndex).toBe(categories.length - 1);
    });
  });

  describe('getCategoryNames', () => {
    it('should return all category names', () => {
      const names = getCategoryNames();

      expect(names).toHaveLength(13);
      expect(names).toContain('Income');
      expect(names).toContain('Housing');
      expect(names).toContain('FoodShopping');
    });

    it('should return categories in correct order', () => {
      const names = getCategoryNames();

      expect(names[0]).toBe('Income');
      expect(names[names.length - 1]).toBe('Misc');
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
      expect(isValidCategory('Misc')).toBe(true);
      expect(isValidCategory('FoodShopping')).toBe(true);
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

    it('should validate FoodShopping subcategories', () => {
      expect(isValidSubcategory('FoodShopping', 'Food')).toBe(true);
      expect(isValidSubcategory('FoodShopping', 'Food / Groceries')).toBe(true);
      expect(isValidSubcategory('FoodShopping', 'Groceries Food')).toBe(true);
      expect(isValidSubcategory('FoodShopping', 'Food / Dining')).toBe(true);
    });

    it('should return false for non-FoodShopping subcategories', () => {
      expect(isValidSubcategory('FoodShopping', 'Groceries')).toBe(false);
      expect(isValidSubcategory('FoodShopping', 'Restaurants')).toBe(false);
    });
  });
});
