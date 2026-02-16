import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  getCategoryNames,
  getSubcategories,
} from '@/data/categories';
import {
  extractCategoryFromFile,
  mergeCategoriesFromFile,
} from '@/data/categoryImporter';
import type { CategoryTaxonomy } from '@/types';

describe('extractCategoryFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should extract category from CSV file', async () => {
    const mockParseCSV = async (file: File) => {
      const content =
        'date,entity,amount,category,subcategory\n2025-01-01,Spar,10.00,Food,Groceries\n';
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',');
      return {
        data: lines.slice(1).map((line) => {
          const values = line.split(',');
          const row: Record<string, unknown> = {};
          headers.forEach((header, i) => {
            row[header] = values[i];
          });
          return row;
        }),
        headers,
      };
    };

    vi.mock('@/utils/fileParser', async (originalModule) => {
      const actual = await originalModule();
      return {
        ...actual,
        parseCSV: mockParseCSV,
        parseXLSX: async () => {
          const content = [
            {
              date: '2025-01-01',
              entity: 'Spar',
              amount: 10.0,
              category: 'Food',
              subcategory: 'Groceries',
            } as any,
            {
              date: '2025-01-02',
              entity: 'Digital Republic',
              amount: 20.0,
              category: 'Housing',
              subcategory: 'Rent',
            } as any,
          ] as any;

          const headers = [
            'date',
            'entity',
            'amount',
            'category',
            'subcategory',
          ];
          return {
            data: content as Record<string, unknown>[],
          };
        },
      };
    });

    const { extractCategoryFromFile: extractor } =
      await import('@/data/categoryImporter');
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = await extractor(file);
    expect(result.category).toBe('Food');
    expect(result.subcategory).toBe('Groceries');
  });

  it('should extract category from XLSX file', async () => {
    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    vi.mock('@/utils/fileParser', async (originalModule) => {
      const actual = await originalModule();
      return {
        ...actual,
        parseXLSX: async () => {
          const content = [
            {
              date: '2025-01-01',
              entity: 'Spar',
              amount: 10.0,
              category: 'Food',
              subcategory: 'Groceries',
            } as any,
            {
              date: '2025-01-02',
              entity: 'Digital Republic',
              amount: 20.0,
              category: 'Housing',
              subcategory: 'Rent',
            } as any,
          ] as any;

          return {
            data: content as Record<string, unknown>[],
          };
        },
      };
    });

    const { extractCategoryFromFile: extractor } =
      await import('@/data/categoryImporter');
    const result = await extractor(file);
    expect(result.category).toBe('Food');
    expect(result.subcategory).toBe('Groceries');
  });

  it('should handle files with unknown category names', async () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });

    vi.mock('@/utils/fileParser', async (originalModule) => {
      const actual = await originalModule();
      return {
        ...actual,
        parseCSV: async () => {
          const content =
            'date,entity,amount,category\n2025-01-01,Such,10.00,Gebraucht\n';
          const lines = content.trim().split('\n');
          const headers = lines[0].split(',');
          return {
            data: lines.slice(1).map((line) => {
              const values = line.split(',');
              const row: Record<string, unknown> = {};
              headers.forEach((header, i) => {
                row[header] = values[i];
              });
              return row;
            }),
            headers,
          };
        },
      };
    });

    const { extractCategoryFromFile: extractor } =
      await import('@/data/categoryImporter');
    const result = await extractor(file);
    expect(result.category).toBeUndefined();
  });

  it('should handle non-CSV/XLSX files gracefully', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });

    const { extractCategoryFromFile: extractor } =
      await import('@/data/categoryImporter');
    const result = await extractor(file);
    expect(result.category).toBeUndefined();
    expect(result.subcategory).toBeUndefined();
  });
});

describe('mergeCategoriesFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add new category with subcategories', () => {
    const newCategories: CategoryTaxonomy = {
      TestCategory: ['Sub1', 'Sub2', 'Sub3'],
    };

    const result = mergeCategoriesFromFile(newCategories);
    expect(result.merged).toBe(true);
    expect(result.addedCategories).toEqual(['TestCategory']);
    expect(result.addedSubcategories).toEqual(['Sub1', 'Sub2', 'Sub3']);
    expect(DEFAULT_CATEGORIES.TestCategory).toEqual(['Sub1', 'Sub2', 'Sub3']);
  });

  it('should add new subcategory to existing category', () => {
    const originalFoodCategories = [...getSubcategories('Food & Dining')];
    const newCategories: CategoryTaxonomy = {
      'Food & Dining': ['NewGrocery', 'NewRestaurant'],
    };

    const result = mergeCategoriesFromFile(newCategories);
    expect(result.merged).toBe(true);
    expect(result.addedSubcategories).toEqual(['NewGrocery', 'NewRestaurant']);
    expect(DEFAULT_CATEGORIES['Food & Dining']).toEqual([
      ...originalFoodCategories,
      'NewGrocery',
      'NewRestaurant',
    ]);
    expect(result.addedCategories).toHaveLength(0);
  });

  it('should avoid adding duplicate subcategories', () => {
    const originalFoodCategories = [...getSubcategories('Food & Dining')];
    const newCategories: CategoryTaxonomy = {
      'Food & Dining': ['Groceries', 'Restaurants', 'NewGrocery'],
    };

    const result = mergeCategoriesFromFile(newCategories);
    expect(result.merged).toBe(true);
    expect(result.addedSubcategories).toEqual(['NewGrocery']);
    expect(DEFAULT_CATEGORIES['Food & Dining']).toEqual([
      ...originalFoodCategories,
      'NewGrocery',
    ]);
    expect(result.addedCategories).toHaveLength(0);
  });

  it('should handle category with no subcategories', () => {
    const newCategories: CategoryTaxonomy = {
      TestCategory: [],
    };

    const result = mergeCategoriesFromFile(newCategories);
    expect(result.merged).toBe(true);
    expect(DEFAULT_CATEGORIES.TestCategory).toBeUndefined();
  });

  it('should handle mixed category additions', () => {
    const newCategories: CategoryTaxonomy = {
      NewCategory1: ['Sub1', 'Sub2'],
      NewCategory2: ['Sub3', 'Sub4'],
    };

    const result = mergeCategoriesFromFile(newCategories);
    expect(result.merged).toBe(true);
    expect(result.addedCategories).toEqual(['NewCategory1', 'NewCategory2']);
    expect(result.addedSubcategories).toEqual(['Sub1', 'Sub2', 'Sub3', 'Sub4']);
    expect(DEFAULT_CATEGORIES.NewCategory1).toEqual(['Sub1', 'Sub2']);
    expect(DEFAULT_CATEGORIES.NewCategory2).toEqual(['Sub3', 'Sub4']);
  });

  it('should not merge categories into the Misc category', () => {
    const originalMiscCategories = getSubcategories('Misc');
    const newCategories: CategoryTaxonomy = {
      Misc: ['Test'],
    };

    const result = mergeCategoriesFromFile(newCategories);
    expect(result.merged).toBe(true);
    expect(result.addedCategories).toHaveLength(0);
    expect(result.addedSubcategories).toHaveLength(0);
    expect(getSubcategories('Misc')).toEqual(originalMiscCategories);
  });
});
