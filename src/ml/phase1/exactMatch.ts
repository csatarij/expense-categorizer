import type { Transaction, CategorySuggestion } from '@/types';

/**
 * Normalizes a transaction description for comparison.
 * - Converts to lowercase
 * - Removes special characters except spaces
 * - Trims whitespace
 * - Handles common merchant patterns (e.g., "STARBUCKS #123" → "starbucks")
 */
export function normalizeDescription(desc: string): string {
  if (!desc || typeof desc !== 'string') {
    return '';
  }

  let normalized = desc.toLowerCase();

  // Remove store/location numbers (e.g., "#12345", "STORE 123")
  normalized = normalized.replace(/#\d+/g, '');
  normalized = normalized.replace(/\bstore\s*\d+/gi, '');

  // Remove asterisk prefixes (e.g., "UBER *EATS" → "uber eats")
  normalized = normalized.replace(/\*+/g, ' ');

  // Remove special characters except spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');

  // Collapse multiple spaces into one
  normalized = normalized.replace(/\s+/g, ' ');

  // Trim whitespace
  normalized = normalized.trim();

  return normalized;
}

/**
 * Calculates confidence for an exact match.
 * - Base confidence: 95%
 * - +5% if the match was manually edited by a user
 */
export function calculateExactMatchConfidence(
  matchCount: number,
  manuallyEdited: boolean
): number {
  if (matchCount === 0) {
    return 0;
  }

  const baseConfidence = 95;
  const manualEditBonus = manuallyEdited ? 5 : 0;

  return Math.min(100, baseConfidence + manualEditBonus);
}

/**
 * Finds exact matches in historical data and suggests a category.
 *
 * @param description - The transaction description to match
 * @param historicalData - Array of historical transactions to search
 * @returns CategorySuggestion if match found, null otherwise
 */
/**
 * Represents a transaction with a confirmed category
 */
interface CategorizedTransaction extends Transaction {
  category: string;
}

export function exactMatch(
  description: string,
  historicalData: Transaction[]
): CategorySuggestion | null {
  if (description === '' || historicalData.length === 0) {
    return null;
  }

  const normalizedInput = normalizeDescription(description);

  if (normalizedInput === '') {
    return null;
  }

  // Find all transactions with matching normalized descriptions that have a category
  const matches = historicalData.filter(
    (transaction): transaction is CategorizedTransaction => {
      if (!transaction.category) {
        return false;
      }
      const normalizedHistorical = normalizeDescription(
        transaction.entity
      );
      return normalizedHistorical === normalizedInput;
    }
  );

  if (matches.length === 0) {
    return null;
  }

  // Prefer manually edited matches
  const manuallyEditedMatches = matches.filter((t) => t.isManuallyEdited);
  const hasManuallyEditedMatch = manuallyEditedMatches.length > 0;

  // Use manually edited matches if available, otherwise use all matches
  const preferredMatches =
    hasManuallyEditedMatch ? manuallyEditedMatches : matches;

  // Get the most recent match (assuming historical data may have timestamps)
  // If multiple matches exist, take the first one from preferred matches
  const bestMatch = preferredMatches[0];

  // Safety check - should never happen due to length check above
  if (!bestMatch) {
    return null;
  }

  const confidence = calculateExactMatchConfidence(
    matches.length,
    hasManuallyEditedMatch
  );

  const reason = generateMatchReason(
    description,
    matches.length,
    hasManuallyEditedMatch
  );

  const suggestion: CategorySuggestion = {
    category: bestMatch.category,
    confidence,
    reason,
    method: 'exact-match',
  };

  if (bestMatch.subcategory) {
    suggestion.subcategory = bestMatch.subcategory;
  }

  return suggestion;
}

/**
 * Generates a human-readable reason for the match.
 */
function generateMatchReason(
  description: string,
  matchCount: number,
  manuallyEdited: boolean
): string {
  const matchText =
    matchCount === 1
      ? '1 identical transaction'
      : `${String(matchCount)} identical transactions`;

  if (manuallyEdited) {
    return `Exact match found: "${description}" matches ${matchText} with user-confirmed category`;
  }

  return `Exact match found: "${description}" matches ${matchText} in history`;
}
