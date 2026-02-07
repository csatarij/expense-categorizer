import { describe, it, expect } from 'vitest';
import {
  importCategoryFromFile,
  validateCategory,
  validateSubcategory,
} from './categoryValidator';

describe('categoryValidator', () => {
  describe('importCategoryFromFile', () => {
    it('should import valid category with exact case match', () => {
      const result = importCategoryFromFile('Housing', 'Rent');
      expect(result).toEqual({
        category: 'Housing',
        subcategory: 'Rent',
      });
    });

    it('should import valid category with case-insensitive match', () => {
      const result = importCategoryFromFile('housing', 'rent');
      expect(result).toEqual({
        category: 'Housing',
        subcategory: 'Rent',
      });
    });

    it('should import valid category with uppercase input', () => {
      const result = importCategoryFromFile('HOUSING', 'RENT');
      expect(result).toEqual({
        category: 'Housing',
        subcategory: 'Rent',
      });
    });

    it('should import valid category with mixed case', () => {
      const result = importCategoryFromFile('HoUsInG', 'ReNt');
      expect(result).toEqual({
        category: 'Housing',
        subcategory: 'Rent',
      });
    });

    it('should import category with special characters like ampersand', () => {
      const result = importCategoryFromFile('food & dining', 'groceries');
      expect(result).toEqual({
        category: 'Food & Dining',
        subcategory: 'Groceries',
      });
    });

    it('should return category only when subcategory is not provided', () => {
      const result = importCategoryFromFile('Housing', undefined);
      expect(result).toEqual({
        category: 'Housing',
      });
    });

    it('should return category only when subcategory is empty string', () => {
      const result = importCategoryFromFile('Housing', '');
      expect(result).toEqual({
        category: 'Housing',
      });
    });

    it('should return category only when subcategory is invalid', () => {
      const result = importCategoryFromFile('Housing', 'InvalidSubcategory');
      expect(result).toEqual({
        category: 'Housing',
        subcategory: undefined,
      });
    });

    it('should return empty object for invalid category', () => {
      const result = importCategoryFromFile('InvalidCategory', 'Something');
      expect(result).toEqual({});
    });

    it('should return empty object for undefined category', () => {
      const result = importCategoryFromFile(undefined, 'Rent');
      expect(result).toEqual({});
    });

    it('should return empty object for null category', () => {
      const result = importCategoryFromFile(null, 'Rent');
      expect(result).toEqual({});
    });

    it('should return empty object for empty string category', () => {
      const result = importCategoryFromFile('', 'Rent');
      expect(result).toEqual({});
    });

    it('should return empty object for non-string category (number)', () => {
      const result = importCategoryFromFile(123, 'Rent');
      expect(result).toEqual({});
    });

    it('should return empty object for non-string category (object)', () => {
      const result = importCategoryFromFile({ category: 'Housing' }, 'Rent');
      expect(result).toEqual({});
    });

    it('should handle non-string subcategory gracefully', () => {
      const result = importCategoryFromFile('Housing', 123);
      expect(result).toEqual({
        category: 'Housing',
      });
    });

    it('should import Income category with subcategory', () => {
      const result = importCategoryFromFile('Income', 'Salary');
      expect(result).toEqual({
        category: 'Income',
        subcategory: 'Salary',
      });
    });

    it('should import Transportation category', () => {
      const result = importCategoryFromFile('transportation', 'gas');
      expect(result).toEqual({
        category: 'Transportation',
        subcategory: 'Gas',
      });
    });

    it('should import Health & Wellness category', () => {
      const result = importCategoryFromFile('health & wellness', 'medical');
      expect(result).toEqual({
        category: 'Health & Wellness',
        subcategory: 'Medical',
      });
    });

    it('should import Bills & Utilities category', () => {
      const result = importCategoryFromFile('bills & utilities', 'phone');
      expect(result).toEqual({
        category: 'Bills & Utilities',
        subcategory: 'Phone',
      });
    });

    it('should import Uncategorized category', () => {
      const result = importCategoryFromFile('uncategorized', undefined);
      expect(result).toEqual({
        category: 'Uncategorized',
      });
    });
  });

  describe('validateCategory', () => {
    it('should validate exact case match', () => {
      expect(validateCategory('Housing')).toBe('Housing');
    });

    it('should validate lowercase input', () => {
      expect(validateCategory('housing')).toBe('Housing');
    });

    it('should validate uppercase input', () => {
      expect(validateCategory('HOUSING')).toBe('Housing');
    });

    it('should validate mixed case input', () => {
      expect(validateCategory('HoUsInG')).toBe('Housing');
    });

    it('should validate category with special characters', () => {
      expect(validateCategory('food & dining')).toBe('Food & Dining');
    });

    it('should return undefined for invalid category', () => {
      expect(validateCategory('InvalidCategory')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(validateCategory('')).toBeUndefined();
    });

    it('should validate all standard categories', () => {
      expect(validateCategory('Income')).toBe('Income');
      expect(validateCategory('Housing')).toBe('Housing');
      expect(validateCategory('Transportation')).toBe('Transportation');
      expect(validateCategory('Food & Dining')).toBe('Food & Dining');
      expect(validateCategory('Shopping')).toBe('Shopping');
      expect(validateCategory('Entertainment')).toBe('Entertainment');
      expect(validateCategory('Health & Wellness')).toBe('Health & Wellness');
      expect(validateCategory('Bills & Utilities')).toBe('Bills & Utilities');
      expect(validateCategory('Financial')).toBe('Financial');
      expect(validateCategory('Education')).toBe('Education');
      expect(validateCategory('Pets')).toBe('Pets');
      expect(validateCategory('Uncategorized')).toBe('Uncategorized');
    });
  });

  describe('validateSubcategory', () => {
    it('should validate exact case match', () => {
      expect(validateSubcategory('Housing', 'Rent')).toBe('Rent');
    });

    it('should validate lowercase input', () => {
      expect(validateSubcategory('Housing', 'rent')).toBe('Rent');
    });

    it('should validate uppercase input', () => {
      expect(validateSubcategory('Housing', 'RENT')).toBe('Rent');
    });

    it('should validate mixed case input', () => {
      expect(validateSubcategory('Housing', 'ReNt')).toBe('Rent');
    });

    it('should return undefined for invalid subcategory', () => {
      expect(
        validateSubcategory('Housing', 'InvalidSubcategory')
      ).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(validateSubcategory('Housing', '')).toBeUndefined();
    });

    it('should validate subcategories across different categories', () => {
      expect(validateSubcategory('Housing', 'Mortgage')).toBe('Mortgage');
      expect(validateSubcategory('Transportation', 'Gas')).toBe('Gas');
      expect(validateSubcategory('Food & Dining', 'Groceries')).toBe(
        'Groceries'
      );
      expect(validateSubcategory('Income', 'Salary')).toBe('Salary');
    });

    it('should not match subcategory from different category', () => {
      // "Rent" is in Housing, not Transportation
      expect(validateSubcategory('Transportation', 'Rent')).toBeUndefined();
    });

    it('should handle category with no subcategories', () => {
      // Uncategorized has no subcategories
      expect(validateSubcategory('Uncategorized', 'Anything')).toBeUndefined();
    });
  });
});
