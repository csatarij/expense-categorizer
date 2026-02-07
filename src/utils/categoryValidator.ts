import {
  getCategoryNames,
  getSubcategories,
} from '@/data/categories';

/**
 * Result of importing category/subcategory from an uploaded file
 */
export interface ImportedCategories {
  category?: string;
  subcategory?: string;
}

/**
 * Imports and validates category/subcategory from uploaded file data.
 * Only returns categories that match the app's DEFAULT_CATEGORIES taxonomy.
 * Matching is case-insensitive to handle variations in user data.
 *
 * @param category - Raw category value from uploaded file
 * @param subcategory - Raw subcategory value from uploaded file
 * @returns Object with validated category/subcategory, or empty object if invalid
 *
 * @example
 * // Valid category, exact match
 * importCategoryFromFile('Housing', 'Rent')
 * // => { category: 'Housing', subcategory: 'Rent' }
 *
 * @example
 * // Valid category, case-insensitive match
 * importCategoryFromFile('housing', 'RENT')
 * // => { category: 'Housing', subcategory: 'Rent' }
 *
 * @example
 * // Invalid category
 * importCategoryFromFile('InvalidCategory', 'Something')
 * // => {}
 *
 * @example
 * // Valid category, invalid subcategory
 * importCategoryFromFile('Housing', 'InvalidSubcategory')
 * // => { category: 'Housing' }
 */
export function importCategoryFromFile(
  category: unknown,
  subcategory: unknown
): ImportedCategories {
  // Validate category is a non-empty string
  if (!category || typeof category !== 'string') {
    return {};
  }

  // Find matching category (case-insensitive)
  const validCategory = getCategoryNames().find(
    (c) => c.toLowerCase() === category.toLowerCase()
  );

  // If category doesn't match taxonomy, ignore it
  if (!validCategory) {
    return {};
  }

  // If no subcategory provided, return just the category
  if (!subcategory || typeof subcategory !== 'string') {
    return { category: validCategory };
  }

  // Find matching subcategory (case-insensitive)
  const validSubcategory = getSubcategories(validCategory).find(
    (s) => s.toLowerCase() === subcategory.toLowerCase()
  );

  // Return category with optional subcategory (undefined if no match)
  if (validSubcategory) {
    return {
      category: validCategory,
      subcategory: validSubcategory,
    };
  }

  return {
    category: validCategory,
  };
}

/**
 * Validates a category name against the app's taxonomy.
 * Case-insensitive matching.
 *
 * @param category - Category name to validate
 * @returns The properly-cased category name if valid, undefined otherwise
 *
 * @example
 * validateCategory('housing') // => 'Housing'
 * validateCategory('Invalid') // => undefined
 */
export function validateCategory(category: string): string | undefined {
  return getCategoryNames().find(
    (c) => c.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Validates a subcategory name against a category's subcategories.
 * Case-insensitive matching.
 *
 * @param category - The parent category name (must be valid)
 * @param subcategory - Subcategory name to validate
 * @returns The properly-cased subcategory name if valid, undefined otherwise
 *
 * @example
 * validateSubcategory('Housing', 'rent') // => 'Rent'
 * validateSubcategory('Housing', 'Invalid') // => undefined
 */
export function validateSubcategory(
  category: string,
  subcategory: string
): string | undefined {
  return getSubcategories(category).find(
    (s) => s.toLowerCase() === subcategory.toLowerCase()
  );
}
