import type { CategoryTaxonomy } from '@/types';

/**
 * Default category taxonomy for expense categorization.
 * Maps top-level categories to their subcategories.
 * Extended with common categories from expense tracking examples.
 */
export const DEFAULT_CATEGORIES: CategoryTaxonomy = {
  Income: [
    'Salary',
    'Freelance',
    'Investment Returns',
    'Refunds',
    'Other Income',
    'Income Salary',
  ],
  Housing: [
    'Rent',
    'Mortgage',
    'Property Tax',
    'Home Insurance',
    'Utilities',
    'Maintenance',
    'HOA Fees',
    'Household',
    'Rent / Utilities',
  ],
  Transportation: [
    'Gas',
    'Public Transit',
    'Car Payment',
    'Car Insurance',
    'Maintenance & Repairs',
    'Parking',
    'Tolls',
    'Transport',
    'Transportation',
  ],
  'Food & Dining': [
    'Groceries',
    'Restaurants',
    'Coffee Shops',
    'Fast Food',
    'Alcohol & Bars',
    'Food',
    'Food & Dining',
    'Groceries / Dining',
  ],
  Shopping: [
    'Clothing',
    'Electronics',
    'Home Goods',
    'Personal Care',
    'Gifts',
    'Shopping',
    'Shopping / Gifts',
  ],
  Entertainment: [
    'Streaming Services',
    'Movies & Events',
    'Hobbies',
    'Sports',
    'Travel',
    'Leisure',
    'Entertainment Leisure',
    'Sports Leasure',
  ],
  'Health & Wellness': [
    'Medical',
    'Pharmacy',
    'Dental',
    'Vision',
    'Health Insurance',
    'Fitness',
    'Health',
    'Health & Wellness',
    'Health / Mental Health',
  ],
  'Bills & Utilities': [
    'Phone',
    'Internet',
    'Subscriptions',
    'Cable',
    'Other Bills',
    'Utilities',
    'Utilities / Bills',
  ],
  FoodShopping: ['Food', 'Food / Groceries', 'Groceries Food', 'Food / Dining'],
  Financial: [
    'Savings Transfer',
    'Investment',
    'Credit Card Payment',
    'Loan Payment',
    'Bank Fees',
    'Finance',
    'Finances',
    'Savings & Investments',
  ],
  Education: ['Tuition', 'Books', 'Courses', 'School Supplies'],
  Pets: ['Food', 'Veterinary', 'Supplies', 'Grooming'],
  Misc: [],
};

/**
 * Get all top-level category names
 */
export const getCategoryNames = (): string[] => {
  return Object.keys(DEFAULT_CATEGORIES);
};

/**
 * Get category names in the correct order
 */
export const getCategoryOrder = (): string[] => {
  return [
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

/**
 * Adds a new category to the taxonomy
 */
export const addCategory = (
  category: string,
  subcategories: string[]
): void => {
  if (category && subcategories.some((sub) => sub)) {
    DEFAULT_CATEGORIES[category] = subcategories;
  }
};
