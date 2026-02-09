import type { Transaction, CategorySuggestion } from '@/types';

const SIMILARITY_THRESHOLD = 0.7;
const MIN_SIMILARITY_FOR_MATCH = 0.6;

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = [];

  const row0: number[] = [];
  for (let j = 0; j <= n; j++) {
    row0.push(j);
  }
  dp.push(row0);

  for (let i = 1; i <= m; i++) {
    const currentRow: number[] = [i];
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        const prevRow = dp[i - 1];
        if (prevRow) {
          const val = prevRow[j - 1] ?? 0;
          currentRow.push(val);
        } else {
          currentRow.push(j);
        }
      } else {
        const prevRow = dp[i - 1];
        if (prevRow) {
          currentRow.push(
            1 +
              Math.min(
                prevRow[j] ?? 0,
                currentRow[j - 1] ?? 0,
                prevRow[j - 1] ?? 0,
                Number.MAX_SAFE_INTEGER
              )
          );
        } else {
          currentRow.push(i + j);
        }
      }
    }
    dp.push(currentRow);
  }

  const lastRow = dp[m];
  return lastRow?.[n] ?? 0;
}

function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return (maxLen - distance) / maxLen;
}

export function fuzzyMatch(
  description: string,
  historicalData: Transaction[],
  amount?: number,
  threshold: number = SIMILARITY_THRESHOLD
): CategorySuggestion | null {
  if (
    !description ||
    description.trim() === '' ||
    historicalData.length === 0
  ) {
    return null;
  }

  const normalizedInput = description.toLowerCase().trim();

  const filteredHistoricalData =
    (amount ?? 0) > 0
      ? historicalData.filter((t) => t.category === 'Income')
      : historicalData.filter((t) => t.category !== 'Income');

  let bestMatch: (Transaction & { category: string }) | null = null;
  let bestSimilarity = 0;

  for (const transaction of filteredHistoricalData) {
    if (!transaction.category) {
      continue;
    }

    const normalizedHistory = transaction.entity.toLowerCase().trim();
    const similarity = calculateSimilarity(normalizedInput, normalizedHistory);

    if (similarity > bestSimilarity && similarity >= MIN_SIMILARITY_FOR_MATCH) {
      bestSimilarity = similarity;
      bestMatch = {
        ...transaction,
        category: transaction.category,
      };
    }
  }

  if (!bestMatch || bestSimilarity < threshold) {
    return null;
  }

  const confidence = Math.round(bestSimilarity * 100);
  const suggestion: CategorySuggestion = {
    category: bestMatch.category,
    confidence,
    reason: `Fuzzy match found: "${description}" is similar to "${bestMatch.entity}" with ${String(confidence)}% similarity`,
    method: 'fuzzy-match',
  };

  if (bestMatch.subcategory) {
    suggestion.subcategory = bestMatch.subcategory;
  }

  return suggestion;
}

export function findSimilarTransactions(
  description: string,
  historicalData: Transaction[],
  limit: number = 5
): Array<Transaction & { similarity: number }> {
  if (
    !description ||
    description.trim() === '' ||
    historicalData.length === 0
  ) {
    return [];
  }

  const normalizedInput = description.toLowerCase().trim();

  const results: Array<Transaction & { similarity: number }> = historicalData
    .filter(
      (t: Transaction): t is Transaction & { category: string } =>
        t.category !== undefined && t.category !== ''
    )
    .map((transaction) => ({
      ...transaction,
      similarity: calculateSimilarity(
        normalizedInput,
        transaction.entity.toLowerCase().trim()
      ),
    }))
    .filter((t) => t.similarity >= MIN_SIMILARITY_FOR_MATCH)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

export function calculateFuzzyConfidence(similarity: number): number {
  const baseConfidence = Math.round(similarity * 100);
  return Math.max(MIN_SIMILARITY_FOR_MATCH * 100, baseConfidence);
}
