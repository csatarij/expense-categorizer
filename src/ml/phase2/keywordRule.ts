import type { CategorySuggestion, CategoryTaxonomy } from '@/types';

interface KeywordRule {
  category: string;
  subcategory?: string | undefined;
  keywords: string[];
  priority: number;
}

const defaultKeywordRules: KeywordRule[] = [
  {
    category: 'Food & Dining',
    subcategory: 'Groceries',
    keywords: [
      'whole foods',
      'trader joes',
      'walmart',
      'target',
      'kroger',
      'safeway',
      'costco',
      'publix',
      'aldi',
      'harris teeter',
      'food lion',
      'market basket',
      'grocery',
      'supermarket',
      'supermarket*',
    ],
    priority: 1,
  },
  {
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    keywords: [
      'olive garden',
      'red robin',
      'cheesecake factory',
      'chipotle',
      'panera',
      'starbucks',
      'mcdonalds',
      'burger king',
      'wendys',
      'taco bell',
      'kfc',
      'subway',
      'pizza hut',
      'domino',
      'restaurant',
      'diner',
      'cafe',
      'bistro',
      'grill',
      'eatery',
      'restaurant*',
    ],
    priority: 1,
  },
  {
    category: 'Food & Dining',
    subcategory: 'Coffee Shops',
    keywords: [
      'starbucks',
      'caribou',
      'dunkin',
      'coffee bean',
      'peet coffee',
      'tim hortons',
      'coffee shop',
      'cafeteria',
    ],
    priority: 1,
  },
  {
    category: 'Food & Dining',
    subcategory: 'Fast Food',
    keywords: [
      'mcdonalds',
      'burger king',
      'wendys',
      'taco bell',
      'kfc',
      'subway',
      'pizza hut',
      'domino',
      'popeyes',
      'chick-fil-a',
      'jack in the box',
      'five guys',
    ],
    priority: 1,
  },
  {
    category: 'Food & Dining',
    subcategory: 'Alcohol & Bars',
    keywords: ['bar', 'pub', 'tavern', 'brewery', 'winery', 'liquor store'],
    priority: 1,
  },
  {
    category: 'Shopping',
    subcategory: 'Clothing',
    keywords: [
      'nike',
      'adidas',
      'gap',
      'old navy',
      'banana republic',
      'h&m',
      'zara',
      'forever 21',
      'forever21',
      'nordstrom',
      'macy',
      'kohl',
      'jcpenney',
      'bloomingdale',
      'saks',
      'neiman',
      'saks fifth',
      'clothing store',
      'apparel',
      'fashion',
    ],
    priority: 1,
  },
  {
    category: 'Shopping',
    subcategory: 'Electronics',
    keywords: [
      'best buy',
      'apple',
      'apple store',
      'microsoft',
      'sony',
      'samsung',
      'dell',
      'hp',
      'amazon',
      'amazon.com',
      'newegg',
      'b&h',
      'electronics',
      'computer',
      'gaming',
    ],
    priority: 1,
  },
  {
    category: 'Shopping',
    subcategory: 'Home Goods',
    keywords: [
      'home depot',
      'lowes',
      'bed bath',
      'williams sonoma',
      'crate barrel',
      'pottery barn',
      'ikea',
      'target',
      'walmart',
      'kohl',
      'home goods',
      'furniture',
      'decor',
    ],
    priority: 1,
  },
  {
    category: 'Shopping',
    subcategory: 'Personal Care',
    keywords: [
      'sephora',
      'ulta',
      'cvs',
      'walgreens',
      'rite aid',
      'nordstrom',
      'ulta beauty',
      'beauty',
      'cosmetics',
      'pharmacy',
    ],
    priority: 1,
  },
  {
    category: 'Entertainment',
    subcategory: 'Streaming Services',
    keywords: [
      'netflix',
      'hulu',
      'disney',
      'disney+',
      'hbo',
      'hbo max',
      'amazon prime',
      'prime video',
      'peacock',
      'paramount',
      'apple tv',
      'youtube',
      'youtube tv',
      'spotify',
      'apple music',
      'pandora',
      'sirius',
      'siriusxm',
    ],
    priority: 1,
  },
  {
    category: 'Entertainment',
    subcategory: 'Movies & Events',
    keywords: ['amc', 'regal', 'cineplex', 'movie', 'cinema', 'theater'],
    priority: 1,
  },
  {
    category: 'Entertainment',
    subcategory: 'Travel',
    keywords: [
      'expedia',
      'booking',
      'airbnb',
      'hotels.com',
      'marriott',
      'hilton',
      'hyatt',
      'wyndham',
      'delta',
      'united',
      'american airlines',
      'southwest',
      'jetblue',
      'alaska air',
      'amtrak',
      'uber',
      'lyft',
      'rental car',
      'hotel',
      'motel',
      'airline',
      'flight',
    ],
    priority: 1,
  },
  {
    category: 'Entertainment',
    subcategory: 'Hobbies',
    keywords: [
      'gaming',
      'steam',
      'playstation',
      'xbox',
      'nintendo',
      'blizzard',
      'riot games',
      'epic games',
      'hobby lobby',
      'michaels',
      'joann',
    ],
    priority: 1,
  },
  {
    category: 'Entertainment',
    subcategory: 'Sports',
    keywords: ['gym', 'fitness', 'yoga', 'pilate', 'crossfit', 'equinox'],
    priority: 1,
  },
  {
    category: 'Transportation',
    keywords: [
      'shell',
      'chevron',
      'exxon',
      'mobil',
      'bp',
      'sunoco',
      'circle k',
      '7-eleven',
      'quiktrip',
      'marathon',
      'gas station',
      'fuel',
      'gas',
      'uber',
      'lyft',
      'taxi',
      'parking',
      'metro',
      'transit',
      'amtrak',
      'metro',
      'bus',
      'subway',
      'train',
    ],
    priority: 1,
  },
  {
    category: 'Housing',
    subcategory: 'Rent',
    keywords: ['rent', 'apartment', 'lease'],
    priority: 1,
  },
  {
    category: 'Housing',
    subcategory: 'Mortgage',
    keywords: [
      'mortgage',
      ' Wells Fargo Bank',
      'bank of america',
      'chase bank',
    ],
    priority: 1,
  },
  {
    category: 'Housing',
    subcategory: 'Utilities',
    keywords: [
      'electric',
      'gas',
      'water',
      'sewer',
      'trash',
      'waste management',
      'comcast',
      'xfinity',
      'verizon',
      'at&t',
      'spectrum',
      'utility',
      'utilities',
    ],
    priority: 1,
  },
  {
    category: 'Housing',
    subcategory: 'Maintenance',
    keywords: [
      'home depot',
      'lowes',
      'ace hardware',
      'true value',
      'handyman',
      'plumber',
      'electrician',
      'contractor',
    ],
    priority: 1,
  },
  {
    category: 'Housing',
    subcategory: 'Property Tax',
    keywords: ['property tax', 'county tax', 'tax collector'],
    priority: 1,
  },
  {
    category: 'Housing',
    subcategory: 'Home Insurance',
    keywords: [
      'state farm',
      'geico',
      'progressive',
      'allstate',
      'usaa',
      'liberty mutual',
      'insurance',
      'ins',
    ],
    priority: 1,
  },
  {
    category: 'Health & Wellness',
    subcategory: 'Medical',
    keywords: [
      'hospital',
      'clinic',
      'medical center',
      'doctor',
      'physician',
      'surgery',
      'urgent care',
      'emergency',
      'er',
      'laboratory',
      'lab',
    ],
    priority: 1,
  },
  {
    category: 'Health & Wellness',
    subcategory: 'Pharmacy',
    keywords: [
      'cvs',
      'walgreens',
      'rite aid',
      'pharmacy',
      'drug store',
      'prescription',
      'medication',
    ],
    priority: 1,
  },
  {
    category: 'Health & Wellness',
    subcategory: 'Dental',
    keywords: ['dentist', 'dental', 'orthodontist', 'oral surgery'],
    priority: 1,
  },
  {
    category: 'Health & Wellness',
    subcategory: 'Vision',
    keywords: ['optometrist', 'eye doctor', 'vision', 'optical'],
    priority: 1,
  },
  {
    category: 'Health & Wellness',
    subcategory: 'Health Insurance',
    keywords: [
      'blue cross',
      'aetna',
      'cigna',
      'united healthcare',
      'humana',
      'kaiser',
      'health insurance',
      'medical insurance',
    ],
    priority: 1,
  },
  {
    category: 'Bills & Utilities',
    subcategory: 'Phone',
    keywords: [
      'verizon',
      'at&t',
      't-mobile',
      'sprint',
      'mobile',
      'cell phone',
      'wireless',
      'phone bill',
    ],
    priority: 1,
  },
  {
    category: 'Bills & Utilities',
    subcategory: 'Internet',
    keywords: ['comcast', 'xfinity', 'verizon', 'at&t', 'spectrum', 'internet'],
    priority: 1,
  },
  {
    category: 'Bills & Utilities',
    subcategory: 'Cable',
    keywords: ['comcast', 'xfinity', 'directv', 'dish', 'cable', 'spectrum'],
    priority: 1,
  },
  {
    category: 'Bills & Utilities',
    subcategory: 'Subscriptions',
    keywords: [
      'subscription',
      'membership',
      'annual fee',
      'monthly fee',
      'prime membership',
    ],
    priority: 1,
  },
  {
    category: 'Financial',
    subcategory: 'Credit Card Payment',
    keywords: [
      'credit card payment',
      'card payment',
      'amex payment',
      'visa payment',
      'mastercard payment',
    ],
    priority: 1,
  },
  {
    category: 'Financial',
    subcategory: 'Investment',
    keywords: [
      'fidelity',
      'vanguard',
      'charles schwab',
      'etrade',
      'robinhood',
      'brokerage',
      'investment',
      'td ameritrade',
      'merrill',
    ],
    priority: 1,
  },
  {
    category: 'Financial',
    subcategory: 'Savings Transfer',
    keywords: ['savings transfer', 'transfer to savings', 'deposit savings'],
    priority: 1,
  },
  {
    category: 'Financial',
    subcategory: 'Bank Fees',
    keywords: [
      'atm fee',
      'overdraft',
      'bank fee',
      'monthly fee',
      'service fee',
    ],
    priority: 1,
  },
  {
    category: 'Education',
    subcategory: 'Tuition',
    keywords: ['tuition', 'school', 'university', 'college', 'education'],
    priority: 1,
  },
  {
    category: 'Education',
    subcategory: 'Books',
    keywords: ['amazon', 'bookstore', 'books', 'kindle', 'audible'],
    priority: 1,
  },
  {
    category: 'Education',
    subcategory: 'Courses',
    keywords: [
      'coursera',
      'udemy',
      'skillshare',
      'linkedin learning',
      'pluralsight',
      'course',
      'class',
    ],
    priority: 1,
  },
  {
    category: 'Education',
    subcategory: 'School Supplies',
    keywords: ['staples', 'office depot', 'office supplies'],
    priority: 1,
  },
  {
    category: 'Pets',
    subcategory: 'Food',
    keywords: [
      'petco',
      'petsmart',
      'chewy',
      'pet food',
      'pet supplies',
      'pet store',
    ],
    priority: 1,
  },
  {
    category: 'Pets',
    subcategory: 'Veterinary',
    keywords: ['vet', 'veterinary', 'animal hospital', 'pet clinic'],
    priority: 1,
  },
  {
    category: 'Pets',
    subcategory: 'Supplies',
    keywords: ['petco', 'petsmart', 'chewy', 'pet supplies', 'animal hospital'],
    priority: 1,
  },
  {
    category: 'Pets',
    subcategory: 'Grooming',
    keywords: ['grooming', 'pet grooming', 'dog grooming'],
    priority: 1,
  },
  {
    category: 'Income',
    subcategory: 'Salary',
    keywords: ['payroll', 'salary', 'paycheck', 'direct deposit'],
    priority: 1,
  },
  {
    category: 'Income',
    subcategory: 'Freelance',
    keywords: [
      'freelance',
      'contract',
      'consulting',
      'upwork',
      'fiverr',
      'guru',
      'freelancer',
    ],
    priority: 1,
  },
  {
    category: 'Income',
    subcategory: 'Investment Returns',
    keywords: ['dividend', 'interest', 'capital gain', 'return of capital'],
    priority: 1,
  },
];

function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function findMatchingRules(
  normalizedDescription: string,
  rules: KeywordRule[]
): Array<KeywordRule & { matchedKeyword: string }> {
  const matches: Array<KeywordRule & { matchedKeyword: string }> = [];

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = keyword.toLowerCase().replace(/\*/g, '');
      const startsWithWildcard = keyword.startsWith('*');
      const endsWithWildcard = keyword.endsWith('*');

      if (startsWithWildcard && endsWithWildcard) {
        if (normalizedDescription.includes(normalizedKeyword)) {
          matches.push({ ...rule, matchedKeyword: keyword });
          break;
        }
      } else if (startsWithWildcard) {
        if (normalizedDescription.endsWith(normalizedKeyword)) {
          matches.push({ ...rule, matchedKeyword: keyword });
          break;
        }
      } else if (endsWithWildcard) {
        if (normalizedDescription.startsWith(normalizedKeyword)) {
          matches.push({ ...rule, matchedKeyword: keyword });
          break;
        }
      } else {
        if (normalizedDescription.includes(normalizedKeyword)) {
          matches.push({ ...rule, matchedKeyword: keyword });
          break;
        }
      }
    }
  }

  return matches.sort((a, b) => b.priority - a.priority);
}

export function categorizeByKeywordRule(
  description: string,
  _categories: CategoryTaxonomy,
  customRules: KeywordRule[] = []
): CategorySuggestion | null {
  if (!description || description.trim() === '') {
    return null;
  }

  const normalizedDescription = normalizeForMatching(description);
  if (normalizedDescription === '') {
    return null;
  }

  const allRules = [...defaultKeywordRules, ...customRules];
  const matches = findMatchingRules(normalizedDescription, allRules);

  if (matches.length === 0) {
    return null;
  }

  const bestMatch = matches[0];
  if (!bestMatch) {
    return null;
  }

  const confidence = calculateKeywordConfidence(bestMatch.matchedKeyword);
  const suggestion: CategorySuggestion = {
    category: bestMatch.category,
    confidence,
    reason: `Keyword match found: "${bestMatch.matchedKeyword}" suggests ${bestMatch.category}${bestMatch.subcategory ? ` - ${bestMatch.subcategory}` : ''}`,
    method: 'keyword-rule',
  };

  if (bestMatch.subcategory) {
    suggestion.subcategory = bestMatch.subcategory;
  }

  return suggestion;
}

export function learnKeywordFromTransaction(
  transaction: {
    entity: string;
    category: string;
    subcategory?: string;
  },
  existingRules: KeywordRule[] = []
): KeywordRule | null {
  if (!transaction.category || !transaction.entity) {
    return null;
  }

  const normalizedDescription = normalizeForMatching(transaction.entity);
  const keywords = normalizedDescription
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) {
    return null;
  }

  const existingRule = existingRules.find(
    (r) =>
      r.category === transaction.category &&
      r.subcategory === transaction.subcategory
  );

  if (existingRule) {
    const newKeywords = keywords.filter(
      (k) => !existingRule.keywords.includes(k)
    );
    if (newKeywords.length > 0) {
      return {
        category: existingRule.category,
        subcategory: existingRule.subcategory,
        keywords: [...existingRule.keywords, ...newKeywords],
        priority: existingRule.priority,
      };
    }
    return null;
  }

  return {
    category: transaction.category,
    subcategory: transaction.subcategory,
    keywords: [...new Set(keywords)],
    priority: 2,
  };
}

export function calculateKeywordConfidence(keyword: string): number {
  const baseScore = 75;
  const exactWordBonus = keyword.includes('*') ? 0 : 10;
  const multipleWordBonus = keyword.split(/\s+/).length > 1 ? 5 : 0;

  return Math.min(100, baseScore + exactWordBonus + multipleWordBonus);
}

export function mergeKeywordRules(
  existingRules: KeywordRule[],
  newRules: KeywordRule[]
): KeywordRule[] {
  const mergedRules: KeywordRule[] = [...existingRules];

  for (const newRule of newRules) {
    const existingIndex = mergedRules.findIndex(
      (r) =>
        r.category === newRule.category && r.subcategory === newRule.subcategory
    );

    if (existingIndex >= 0) {
      const existingRule = mergedRules[existingIndex];
      if (existingRule) {
        mergedRules[existingIndex] = {
          category: existingRule.category,
          subcategory: existingRule.subcategory,
          keywords: [
            ...new Set([...existingRule.keywords, ...newRule.keywords]),
          ],
          priority: Math.max(existingRule.priority, newRule.priority),
        };
      }
    } else {
      mergedRules.push(newRule);
    }
  }

  return mergedRules;
}
