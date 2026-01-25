import type { CategoryTaxonomy } from '@/types';

/**
 * Default category taxonomy for expense categorization.
 * Maps top-level categories to their subcategories.
 */
export const DEFAULT_CATEGORIES: CategoryTaxonomy = {
  Income: [
    'Salary',
    'Freelance',
    'Investment Returns',
    'Refunds',
    'Other Income',
  ],
  Housing: [
    'Rent',
    'Mortgage',
    'Property Tax',
    'Home Insurance',
    'Utilities',
    'Maintenance',
    'HOA Fees',
  ],
  Transportation: [
    'Gas',
    'Public Transit',
    'Car Payment',
    'Car Insurance',
    'Maintenance & Repairs',
    'Parking',
    'Tolls',
  ],
  'Food & Dining': [
    'Groceries',
    'Restaurants',
    'Coffee Shops',
    'Fast Food',
    'Alcohol & Bars',
  ],
  Shopping: [
    'Clothing',
    'Electronics',
    'Home Goods',
    'Personal Care',
    'Gifts',
  ],
  Entertainment: [
    'Streaming Services',
    'Movies & Events',
    'Hobbies',
    'Sports',
    'Travel',
  ],
  'Health & Wellness': [
    'Medical',
    'Pharmacy',
    'Dental',
    'Vision',
    'Health Insurance',
    'Fitness',
  ],
  'Bills & Utilities': [
    'Phone',
    'Internet',
    'Subscriptions',
    'Cable',
    'Other Bills',
  ],
  Financial: [
    'Savings Transfer',
    'Investment',
    'Credit Card Payment',
    'Loan Payment',
    'Bank Fees',
  ],
  Education: [
    'Tuition',
    'Books',
    'Courses',
    'School Supplies',
  ],
  Pets: [
    'Food',
    'Veterinary',
    'Supplies',
    'Grooming',
  ],
  Uncategorized: [],
};

/**
 * Get all top-level category names
 */
export const getCategoryNames = (): string[] => {
  return Object.keys(DEFAULT_CATEGORIES);
};

/**
 * Get subcategories for a given category
 */
export const getSubcategories = (category: string): string[] => {
  return DEFAULT_CATEGORIES[category] ?? [];
};

/**
 * Check if a category exists in the taxonomy
 */
export const isValidCategory = (category: string): boolean => {
  return category in DEFAULT_CATEGORIES;
};

/**
 * Check if a subcategory exists under a given category
 */
export const isValidSubcategory = (
  category: string,
  subcategory: string
): boolean => {
  const subcategories = DEFAULT_CATEGORIES[category];
  return subcategories?.includes(subcategory) ?? false;
};
