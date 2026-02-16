import {
  DEFAULT_CATEGORIES,
  getCategoryNames,
  getSubcategories,
} from '@/data/categories';
import type { CategoryTaxonomy } from '@/types';

/**
 * Result of reading and extracting categories from a file
 */
export interface CategoriesFromFile {
  category?: string;
  subcategory?: string;
}

/**
 * Extracts category information from CSV or XLSX file
 * @param file - File to extract categories from
 * @returns Object containing category name and optional subcategory name
 */
export async function extractCategoryFromFile(
  file: File
): Promise<CategoriesFromFile> {
  try {
    const fileTypeExtension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (fileTypeExtension === 'csv') {
      return await extractCategoryFromCSV(file);
    } else if (fileTypeExtension === 'xlsx' || fileTypeExtension === 'xls') {
      return await extractCategoryFromXLSX(file);
    }

    return {};
  } catch (error) {
    console.error('Error extracting category from file:', error);
    return {};
  }
}

/**
 * Extracts category information from CSV file
 */
async function extractCategoryFromCSV(file: File): Promise<CategoriesFromFile> {
  const { parseCSV } = await import('@/utils/fileParser');

  const data = await parseCSV(file);

  if (data.length === 0) {
    return {};
  }

  // Try to find a column with 'category' in header (case-insensitive)
  const headers = data[0] as Record<string, unknown>;
  const categoryKey = Object.keys(headers).find((key) =>
    key.toLowerCase().includes('category')
  );

  if (!categoryKey) {
    return {};
  }

  // Get first category value encountered
  for (const row of data) {
    if (row[categoryKey]) {
      const category = row[categoryKey];
      const categoryStr =
        typeof category === 'string' || typeof category === 'number'
          ? String(category)
          : '';

      if (!categoryStr) continue;

      // Find the category in app's taxonomy
      const validCategory = getCategoryNames().find(
        (c) =>
          c.toLowerCase() === categoryStr.toLowerCase() ||
          categoryStr.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(categoryStr.toLowerCase())
      );

      if (validCategory) {
        // Check if there's a subcategory column
        const subcategoryKey = Object.keys(headers).find((key) =>
          key.toLowerCase().includes('subcategory')
        );

        if (subcategoryKey && row[subcategoryKey]) {
          const subcategory = row[subcategoryKey];
          const subcategoryStr =
            typeof subcategory === 'string' || typeof subcategory === 'number'
              ? String(subcategory)
              : '';

          const validSubcategory = getSubcategories(validCategory).find(
            (s) => s.toLowerCase() === subcategoryStr.toLowerCase()
          );

          if (validSubcategory) {
            return {
              category: validCategory,
              subcategory: validSubcategory,
            };
          }
        }

        return { category: validCategory };
      }
    }
  }

  return {};
}

/**
 * Extracts category information from XLSX file
 */
async function extractCategoryFromXLSX(
  file: File
): Promise<CategoriesFromFile> {
  const { parseXLSX } = await import('@/utils/fileParser');
  const data = await parseXLSX(file);

  if (data.length === 0) {
    return {};
  }

  const headers = data[0] as Record<string, unknown>;

  // Try different common column names for category
  const categoryKeys = ['category', 'Category', 'Category', 'Kategorie'];

  for (const categoryKey of categoryKeys) {
    if (!headers[categoryKey]) {
      continue;
    }

    for (const row of data) {
      if (row[categoryKey]) {
        const category = row[categoryKey];
        const categoryStr =
          typeof category === 'string' || typeof category === 'number'
            ? String(category)
            : '';

        if (!categoryStr) continue;

        // Try different column names for subcategory
        const subcategoryKeys = [
          'subcategory',
          'Subcategory',
          'Subject',
          'Type',
          'Betrag',
          'Tags',
        ];

        for (const subcategoryKey of subcategoryKeys) {
          if (!headers[subcategoryKey] || subcategoryKey === categoryKey) {
            continue;
          }

          if (!row[subcategoryKey]) {
            // Create a reasonable mapping for common German terms
            mapGermanTermToSubcategory(categoryKey, categoryStr);

            return { category: categoryStr };
          }

          const subcategoryRaw = row[subcategoryKey];
          const subcategoryStr =
            typeof subcategoryRaw === 'string' ||
            typeof subcategoryRaw === 'number'
              ? String(subcategoryRaw)
              : '';

          // Find the category in app's taxonomy
          const validCategory = getCategoryNames().find(
            (c) =>
              c.toLowerCase() === categoryStr.toLowerCase() ||
              categoryStr.toLowerCase().includes(c.toLowerCase()) ||
              c.toLowerCase().includes(categoryStr.toLowerCase())
          );

          if (validCategory) {
            const validSubcategory = getSubcategories(validCategory).find(
              (s) => s.toLowerCase() === subcategoryStr.toLowerCase()
            );

            if (validSubcategory) {
              return {
                category: validCategory,
                subcategory: validSubcategory,
              };
            }
          }

          return { category: categoryStr };
        }
      }
    }
  }

  return {};
}

/**
 * Map German category terms to subcategories
 * Used for files like CathyJaniExpenseTracking2025.xlsx
 */
function mapGermanTermToSubcategory(_column: string, value: string): string {
  // Find a valid category that contains the value
  if (value.toLowerCase().includes('food')) {
    const cat = getCategoryNames().find((c) => c.includes('Food'));
    if (cat) return 'Groceries';
  }

  if (
    value.toLowerCase().includes('rent') ||
    value.toLowerCase().includes('miete')
  ) {
    const cat = getCategoryNames().find((c) => c.includes('Housing'));
    if (cat) return 'Rent';
  }

  if (
    value.toLowerCase().includes('health') ||
    value.toLowerCase().includes('gesundheit')
  ) {
    const cat = getCategoryNames().find((c) => c.includes('Health'));
    if (cat) return 'Medical';
  }

  if (
    value.toLowerCase().includes('transport') ||
    value.toLowerCase().includes('transport')
  ) {
    const cat = getCategoryNames().find((c) => c.includes('Transport'));
    if (cat) return 'Gas';
  }

  if (
    value.toLowerCase().includes('shopping') ||
    value.toLowerCase().includes('shop')
  ) {
    const cat = getCategoryNames().find((c) => c.includes('Shopping'));
    if (cat) return 'Clothing';
  }

  if (
    value.toLowerCase().includes('leisure') ||
    value.toLowerCase().includes('freizeit')
  ) {
    const cat = getCategoryNames().find((c) => c.includes('Entertainment'));
    if (cat) return 'Hobbies';
  }

  return 'Food';
}

/**
 * Merges categories from a file taxonomy into the app's default taxonomy
 * Updates the app's category taxnomomy with any missing categories/subcategories
 * @param newCategories - New category taxonomy from file
 * @returns Object with details about what was merged
 */
export function mergeCategoriesFromFile(newCategories: CategoryTaxonomy): {
  merged: true;
  addedCategories: string[];
  addedSubcategories: string[];
} {
  const addedCategories: string[] = [];
  const addedSubcategories: string[] = [];

  for (const [category, subcategories] of Object.entries(newCategories)) {
    if (typeof subcategories !== 'string') {
      // Skip Misc category - should not be modified
      if (category === 'Misc') continue;

      const existingSubcategories = DEFAULT_CATEGORIES[category] ?? [];
      const newSubcategoryArray = Array.isArray(subcategories)
        ? subcategories
        : [];

      // Check if category exists
      if (!getCategoryNames().includes(category)) {
        // Only add if there are subcategories
        if (newSubcategoryArray.length > 0) {
          addedCategories.push(category);
          DEFAULT_CATEGORIES[category] = newSubcategoryArray.slice(0, 5);
          addedSubcategories.push(...newSubcategoryArray.slice(0, 5));
        }
      } else {
        // Category exists, add new subcategories
        if (!DEFAULT_CATEGORIES[category]) {
          DEFAULT_CATEGORIES[category] = [];
        }
        for (const sub of newSubcategoryArray) {
          if (!existingSubcategories.includes(sub)) {
            addedSubcategories.push(sub);
            DEFAULT_CATEGORIES[category].push(sub);
          }
        }
      }
    }
  }

  return { merged: true, addedCategories, addedSubcategories };
}
