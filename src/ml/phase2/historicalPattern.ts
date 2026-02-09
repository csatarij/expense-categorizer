import type { Transaction, CategorySuggestion, LearningPattern } from '@/types';

interface MerchantPattern {
  merchant: string;
  category: string;
  subcategory?: string | undefined;
  frequency: number;
  lastSeen: Date;
  timestamps: Date[];
  amounts: number[];
}

interface AmountPattern {
  category: string;
  subcategory?: string | undefined;
  minAmount: number;
  maxAmount: number;
  averageAmount: number;
  frequency: number;
}

interface RecurringPattern {
  description: string;
  category: string;
  subcategory?: string | undefined;
  recurringInterval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  minInterval: number;
  maxInterval: number;
  averageInterval: number;
  occurrences: number;
  lastSeen: Date;
  timestamps: Date[];
}

const MIN_PATTERN_OCCURRENCES = 3;
const AMOUNT_TOLERANCE = 0.2;

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function extractMerchant(description: string): string {
  const normalized = normalizeDescription(description);
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  return words.slice(0, 3).join(' ');
}

function isAmountSimilar(amount1: number, amount2: number): boolean {
  const tolerance = Math.abs(amount1 - amount2) / Math.max(amount1, amount2);
  return tolerance <= AMOUNT_TOLERANCE;
}

function calculateRecurringInterval(dates: Date[]): {
  interval: RecurringPattern['recurringInterval'];
  avg: number;
} {
  if (dates.length < 2) {
    return { interval: 'monthly', avg: 30 };
  }

  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const intervals: number[] = [];

  for (let i = 1; i < sortedDates.length; i++) {
    const d1 = sortedDates[i];
    const d2 = sortedDates[i - 1];
    if (d1 && d2) {
      const diff = d1.getTime() - d2.getTime();
      const daysDiff = diff / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }
  }

  if (intervals.length === 0) {
    return { interval: 'monthly', avg: 30 };
  }

  const averageInterval =
    intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

  let interval: RecurringPattern['recurringInterval'] = 'monthly';
  if (averageInterval <= 2) interval = 'daily';
  else if (averageInterval <= 10) interval = 'weekly';
  else if (averageInterval <= 40) interval = 'monthly';
  else interval = 'yearly';

  return { interval, avg: averageInterval };
}

export class PatternLearner {
  private merchantPatterns: Map<string, MerchantPattern>;
  private amountPatterns: AmountPattern[];
  private recurringPatterns: Map<string, RecurringPattern>;

  constructor() {
    this.merchantPatterns = new Map();
    this.amountPatterns = [];
    this.recurringPatterns = new Map();
  }

  learnFromTransactions(transactions: Transaction[]): void {
    const categorizedTransactions = transactions.filter(
      (t) => t.category && t.category.trim()
    );

    categorizedTransactions.forEach((transaction) => {
      this.learnMerchantPattern(transaction);
      this.learnAmountPattern(transaction);
      this.learnRecurringPattern(transaction);
    });
  }

  private learnMerchantPattern(transaction: Transaction): void {
    if (!transaction.category) return;

    const merchant = extractMerchant(transaction.entity);
    const existing = this.merchantPatterns.get(merchant);

    if (existing) {
      existing.frequency += 1;
      existing.lastSeen = transaction.date;
      existing.timestamps.push(transaction.date);
      existing.amounts.push(transaction.amount);
    } else {
      this.merchantPatterns.set(merchant, {
        merchant,
        category: transaction.category,
        subcategory: transaction.subcategory ?? undefined,
        frequency: 1,
        lastSeen: transaction.date,
        timestamps: [transaction.date],
        amounts: [transaction.amount],
      });
    }
  }

  private learnAmountPattern(transaction: Transaction): void {
    if (!transaction.category) return;

    const existing = this.amountPatterns.find(
      (p) =>
        p.category === transaction.category &&
        p.subcategory === transaction.subcategory
    );

    if (existing) {
      existing.frequency += 1;
      existing.minAmount = Math.min(existing.minAmount, transaction.amount);
      existing.maxAmount = Math.max(existing.maxAmount, transaction.amount);
      existing.averageAmount += transaction.amount;
    } else {
      this.amountPatterns.push({
        category: transaction.category,
        subcategory: transaction.subcategory ?? undefined,
        minAmount: transaction.amount,
        maxAmount: transaction.amount,
        averageAmount: transaction.amount,
        frequency: 1,
      });
    }
  }

  private learnRecurringPattern(transaction: Transaction): void {
    if (!transaction.category) return;

    const key = normalizeDescription(transaction.entity);
    const existing = this.recurringPatterns.get(key);

    if (existing) {
      existing.occurrences += 1;
      existing.lastSeen = transaction.date;

      const intervals: number[] = [];
      const sortedDates = [...existing.timestamps, transaction.date].sort(
        (a, b) => a.getTime() - b.getTime()
      );

      for (let i = 1; i < sortedDates.length; i++) {
        const d1 = sortedDates[i];
        const d2 = sortedDates[i - 1];
        if (d1 && d2) {
          const diff = d1.getTime() - d2.getTime();
          intervals.push(diff / (1000 * 60 * 60 * 24));
        }
      }

      if (intervals.length > 0) {
        const avg =
          intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        existing.averageInterval = avg;
        existing.minInterval = Math.min(...intervals, Number.MAX_SAFE_INTEGER);
        existing.maxInterval = Math.max(...intervals, Number.MIN_SAFE_INTEGER);
        existing.timestamps = sortedDates;

        const intervalInfo = calculateRecurringInterval(sortedDates);
        existing.recurringInterval = intervalInfo.interval;
      }
    } else {
      this.recurringPatterns.set(key, {
        description: transaction.entity,
        category: transaction.category,
        subcategory: transaction.subcategory ?? undefined,
        recurringInterval: 'monthly',
        minInterval: 30,
        maxInterval: 30,
        averageInterval: 30,
        occurrences: 1,
        lastSeen: transaction.date,
        timestamps: [transaction.date],
      });
    }
  }

  categorizeByPattern(transaction: {
    entity: string;
    amount: number;
    date?: Date;
  }): CategorySuggestion | null {
    const merchantPattern = this.getMerchantPattern(transaction.entity);
    if (merchantPattern) {
      const suggestion: CategorySuggestion = {
        category: merchantPattern.category,
        confidence: Math.min(95, 70 + merchantPattern.frequency * 5),
        reason: `Merchant pattern match: "${merchantPattern.merchant}" has been categorized as ${merchantPattern.category} ${String(merchantPattern.frequency)} times`,
        method: 'historical-pattern',
      };
      if (merchantPattern.subcategory !== undefined) {
        suggestion.subcategory = merchantPattern.subcategory;
      }
      return suggestion;
    }

    const recurringPattern = this.getRecurringPattern(transaction.entity);
    if (recurringPattern) {
      const suggestion: CategorySuggestion = {
        category: recurringPattern.category,
        confidence: Math.min(92, 65 + recurringPattern.occurrences * 5),
        reason: `Recurring pattern match: This transaction recurs ${recurringPattern.recurringInterval} (${String(recurringPattern.occurrences)} occurrences)`,
        method: 'historical-pattern',
      };
      if (recurringPattern.subcategory !== undefined) {
        suggestion.subcategory = recurringPattern.subcategory;
      }
      return suggestion;
    }

    if (transaction.date) {
      const amountPattern = this.getAmountPattern(transaction.amount);
      if (amountPattern) {
        const suggestion: CategorySuggestion = {
          category: amountPattern.category,
          confidence: Math.round(60 + amountPattern.frequency * 2),
          reason: `Amount pattern match: Amount $${transaction.amount.toFixed(2)} matches historical range for ${amountPattern.category}`,
          method: 'historical-pattern',
        };
        if (amountPattern.subcategory !== undefined) {
          suggestion.subcategory = amountPattern.subcategory;
        }
        return suggestion;
      }
    }

    return null;
  }

  private getMerchantPattern(description: string): MerchantPattern | null {
    const merchant = extractMerchant(description);
    const pattern = this.merchantPatterns.get(merchant);

    if (pattern && pattern.frequency >= MIN_PATTERN_OCCURRENCES) {
      return pattern;
    }

    return null;
  }

  private getRecurringPattern(description: string): RecurringPattern | null {
    const key = normalizeDescription(description);
    const pattern = this.recurringPatterns.get(key);

    if (pattern && pattern.occurrences >= MIN_PATTERN_OCCURRENCES) {
      return pattern;
    }

    return null;
  }

  private getAmountPattern(amount: number): AmountPattern | null {
    for (const pattern of this.amountPatterns) {
      if (
        isAmountSimilar(amount, pattern.averageAmount) &&
        pattern.frequency >= MIN_PATTERN_OCCURRENCES
      ) {
        return pattern;
      }
    }
    return null;
  }

  getLearningPatterns(): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    this.merchantPatterns.forEach((pattern) => {
      if (pattern.frequency >= MIN_PATTERN_OCCURRENCES) {
        const learningPattern: LearningPattern = {
          description: pattern.merchant,
          category: pattern.category,
          method: 'historical-pattern',
          timestamp: pattern.lastSeen,
          confidence: Math.min(95, 70 + pattern.frequency * 5),
        };
        if (pattern.subcategory) {
          learningPattern.subcategory = pattern.subcategory;
        }
        patterns.push(learningPattern);
      }
    });

    this.recurringPatterns.forEach((pattern) => {
      if (pattern.occurrences >= MIN_PATTERN_OCCURRENCES) {
        const learningPattern: LearningPattern = {
          description: pattern.description,
          category: pattern.category,
          method: 'historical-pattern',
          timestamp: pattern.lastSeen,
          confidence: Math.min(92, 65 + pattern.occurrences * 5),
        };
        if (pattern.subcategory) {
          learningPattern.subcategory = pattern.subcategory;
        }
        patterns.push(learningPattern);
      }
    });

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  getMerchantPatterns(): MerchantPattern[] {
    return Array.from(this.merchantPatterns.values()).filter(
      (p) => p.frequency >= MIN_PATTERN_OCCURRENCES
    );
  }

  getRecurringPatterns(): RecurringPattern[] {
    return Array.from(this.recurringPatterns.values()).filter(
      (p) => p.occurrences >= MIN_PATTERN_OCCURRENCES
    );
  }

  getAmountPatterns(): AmountPattern[] {
    this.amountPatterns.forEach((p) => {
      p.averageAmount = p.averageAmount / p.frequency;
    });
    return this.amountPatterns.filter(
      (p) => p.frequency >= MIN_PATTERN_OCCURRENCES
    );
  }

  clear(): void {
    this.merchantPatterns.clear();
    this.amountPatterns = [];
    this.recurringPatterns.clear();
  }
}

export function categorizeByHistoricalPattern(
  transaction: { entity: string; amount: number; date?: Date },
  historicalData: Transaction[],
  learner?: PatternLearner
): CategorySuggestion | null {
  const patternLearner = learner ?? new PatternLearner();
  patternLearner.learnFromTransactions(historicalData);
  return patternLearner.categorizeByPattern(transaction);
}

export function extractPatternsFromHistory(
  transactions: Transaction[]
): LearningPattern[] {
  const learner = new PatternLearner();
  learner.learnFromTransactions(transactions);
  return learner.getLearningPatterns();
}
