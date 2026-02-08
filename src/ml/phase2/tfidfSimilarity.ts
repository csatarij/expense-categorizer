import type { Transaction, CategorySuggestion } from '@/types';

interface TFIDFVector {
  [term: string]: number;
}

const SIMILARITY_THRESHOLD = 0.5;
const MIN_SIMILARITY = 0.3;
const STOP_WORDS: Set<string> = new Set([
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'i',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'if',
  'out',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'when',
  'make',
  'can',
  'like',
  'time',
  'no',
  'just',
  'him',
  'know',
  'take',
  'people',
  'into',
  'year',
  'your',
  'good',
  'some',
  'could',
  'them',
  'see',
  'other',
  'than',
  'then',
  'now',
  'look',
  'only',
  'come',
  'its',
  'over',
  'think',
  'also',
  'back',
  'after',
  'use',
  'two',
  'how',
  'our',
  'work',
  'first',
  'well',
  'way',
  'even',
  'new',
  'want',
  'because',
  'any',
  'these',
  'give',
  'day',
  'most',
  'us',
  'is',
  'are',
  'was',
  'were',
]);

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function buildCorpus(transactions: Transaction[]): string[] {
  return transactions
    .filter((t) => t.category)
    .map((t) => normalizeText(t.description));
}

function computeDocumentFrequency(corpus: string[]): Map<string, number> {
  const df = new Map<string, number>();

  for (const document of corpus) {
    const uniqueTerms = new Set(tokenize(document));
    for (const term of uniqueTerms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  return df;
}

function computeTFIDF(
  document: string,
  term: string,
  corpus: string[],
  df: Map<string, number>
): number {
  const tokens = tokenize(document);
  const termFrequency = tokens.filter((t) => t === term).length;
  const normalizedTF = termFrequency / tokens.length;

  const documentFrequency = df.get(term) ?? 0;
  const idf =
    documentFrequency > 0 ? Math.log(corpus.length / documentFrequency) : 0;

  return normalizedTF * idf;
}

function buildTFIDFVector(
  document: string,
  corpus: string[],
  df: Map<string, number>,
  vocabulary: string[]
): TFIDFVector {
  const vector: TFIDFVector = {};

  for (const term of vocabulary) {
    vector[term] = computeTFIDF(document, term, corpus, df);
  }

  return vector;
}

function buildVocabulary(corpus: string[]): string[] {
  const vocabSet = new Set<string>();

  for (const document of corpus) {
    const tokens = tokenize(document);
    tokens.forEach((t) => vocabSet.add(t));
  }

  return Array.from(vocabSet);
}

function cosineSimilarity(vectorA: TFIDFVector, vectorB: TFIDFVector): number {
  const termsA = Object.keys(vectorA);
  const termsB = Object.keys(vectorB);

  const allTerms = new Set([...termsA, ...termsB]);

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const term of allTerms) {
    const valA = vectorA[term] ?? 0;
    const valB = vectorB[term] ?? 0;

    dotProduct += valA * valB;
    magnitudeA += valA * valA;
    magnitudeB += valB * valB;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

interface SimilarityResult {
  transaction: Transaction & { category: string };
  similarity: number;
}

interface TFIDFModel {
  corpus: string[];
  vocabulary: string[];
  documentFrequency: Map<string, number>;
}

let cachedModel: TFIDFModel | null = null;

export function trainTFIDFModel(transactions: Transaction[]): TFIDFModel {
  const corpus = buildCorpus(transactions);
  if (corpus.length === 0) {
    return {
      corpus: [],
      vocabulary: [],
      documentFrequency: new Map<string, number>(),
    };
  }

  const vocabulary = buildVocabulary(corpus);
  const documentFrequency = computeDocumentFrequency(corpus);

  cachedModel = {
    corpus,
    vocabulary,
    documentFrequency,
  };

  return cachedModel;
}

export function categorizeByTFIDF(
  description: string,
  transactions: Transaction[],
  threshold: number = SIMILARITY_THRESHOLD
): CategorySuggestion | null {
  if (!description || description.trim() === '' || transactions.length === 0) {
    return null;
  }

  const categorizedTransactions = transactions.filter(
    (t): t is Transaction & { category: string } =>
      !!t.category && t.category !== ''
  );

  if (categorizedTransactions.length === 0) {
    return null;
  }

  const corpus = buildCorpus(categorizedTransactions);
  const vocabulary = buildVocabulary(corpus);
  const documentFrequency = computeDocumentFrequency(corpus);
  const normalizedDescription = normalizeText(description);

  const descriptionVector = buildTFIDFVector(
    normalizedDescription,
    corpus,
    documentFrequency,
    vocabulary
  );

  const similarities: SimilarityResult[] = categorizedTransactions.map(
    (transaction) => {
      const normalizedTransaction = normalizeText(transaction.description);
      const transactionVector = buildTFIDFVector(
        normalizedTransaction,
        corpus,
        documentFrequency,
        vocabulary
      );

      const similarity = cosineSimilarity(descriptionVector, transactionVector);

      return {
        transaction,
        similarity,
      };
    }
  );

  similarities.sort((a, b) => b.similarity - a.similarity);

  const bestMatch = similarities[0];

  if (
    !bestMatch ||
    bestMatch.similarity < MIN_SIMILARITY ||
    bestMatch.similarity < threshold
  ) {
    return null;
  }

  const confidence = Math.round(Math.min(100, bestMatch.similarity * 100 + 20));

  const suggestion: CategorySuggestion = {
    category: bestMatch.transaction.category,
    confidence,
    reason: `TF-IDF similarity match found: "${description}" is similar to "${bestMatch.transaction.description}" with ${bestMatch.similarity.toFixed(3)} similarity`,
    method: 'tfidf-similarity',
  };

  if (bestMatch.transaction.subcategory) {
    suggestion.subcategory = bestMatch.transaction.subcategory;
  }

  return suggestion;
}

export function findSimilarByTFIDF(
  description: string,
  transactions: Transaction[],
  limit: number = 5
): SimilarityResult[] {
  if (!description || description.trim() === '' || transactions.length === 0) {
    return [];
  }

  const categorizedTransactions = transactions.filter(
    (t): t is Transaction & { category: string } =>
      !!t.category && t.category !== ''
  );

  if (categorizedTransactions.length === 0) {
    return [];
  }

  const corpus = buildCorpus(categorizedTransactions);
  const vocabulary = buildVocabulary(corpus);
  const documentFrequency = computeDocumentFrequency(corpus);
  const normalizedDescription = normalizeText(description);

  const descriptionVector = buildTFIDFVector(
    normalizedDescription,
    corpus,
    documentFrequency,
    vocabulary
  );

  const similarities: SimilarityResult[] = categorizedTransactions.map(
    (transaction) => {
      const normalizedTransaction = normalizeText(transaction.description);
      const transactionVector = buildTFIDFVector(
        normalizedTransaction,
        corpus,
        documentFrequency,
        vocabulary
      );

      const similarity = cosineSimilarity(descriptionVector, transactionVector);

      return {
        transaction,
        similarity,
      };
    }
  );

  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities
    .filter((s) => s.similarity >= MIN_SIMILARITY)
    .slice(0, limit);
}

export function getCachedModel(): TFIDFModel | null {
  return cachedModel ? { ...cachedModel } : null;
}

export function setCachedModel(model: TFIDFModel): void {
  cachedModel = model;
}

export function calculateTFIDFConfidence(similarity: number): number {
  const baseConfidence = similarity * 100;
  const boostedConfidence = Math.min(100, baseConfidence + 20);
  return Math.max(0, Math.round(boostedConfidence));
}
