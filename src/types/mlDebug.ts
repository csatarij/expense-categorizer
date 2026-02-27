export interface CategorizationDebugInfo {
  transactionId: string;
  entity: string;
  amount: number;
  phaseResults: PhaseDebugResult[];
  finalCategory: string | undefined;
  finalSubcategory: string | undefined;
  finalConfidence: number;
  timestamp: Date;
}

export interface PhaseDebugResult {
  phase: number;
  phaseName: string;
  method?: CategorizationMethod;
  matched: boolean;
  category: string | undefined;
  subcategory: string | undefined;
  confidence: number;
  reason: string | undefined;
  details: PhaseDetails;
}

export interface PhaseDetails {
  exactMatch?: ExactMatchDetails | undefined;
  fuzzyMatch?: FuzzyMatchDetails | undefined;
  keywordRule?: KeywordRuleDetails | undefined;
  tfidfSimilarity?: TFIDFDetails | undefined;
  mlClassifier?: MLClassifierDetails | undefined;
}

export interface ExactMatchDetails {
  normalizedDescription: string;
  matchCount: number;
  matchedTransactions: Array<{
    entity: string;
    category: string;
    isManuallyEdited: boolean;
  }>;
  manuallyEditedMatch: boolean;
}

export interface FuzzyMatchDetails {
  similarity: number;
  matchedTransaction:
    | {
        entity: string;
        category: string;
        similarity: number;
      }
    | undefined;
  allSimilarTransactions: Array<{
    entity: string;
    category: string;
    similarity: number;
  }>;
  threshold: number;
}

export interface KeywordRuleDetails {
  matchedKeyword: string;
  rule: {
    category: string;
    subcategory: string | undefined;
    keywords: string[];
    priority: number;
  };
  baseConfidence: number;
  bonus: number;
}

export interface TFIDFDetails {
  similarity: number;
  cosineSimilarity: number;
  matchedTransaction:
    | {
        entity: string;
        category: string;
        similarity: number;
      }
    | undefined;
  topSimilarTransactions: Array<{
    entity: string;
    category: string;
    similarity: number;
  }>;
  threshold: number;
  vocabularySize: number;
}

export interface MLClassifierDetails {
  modelMetrics: {
    accuracy: number;
    loss: number;
    trainingSamples: number;
    validationSamples: number;
    lastTrainedAt?: Date;
  };
  predictionProbabilities?: Array<{
    category: string;
    probability: number;
  }>;
  topPrediction: {
    category: string;
    probability: number;
  };
  threshold: number;
}

export interface ModelInfo {
  phase1: {
    exactMatchStats: {
      totalMatches: number;
      uniqueEntities: number;
      manuallyEditedMatches: number;
    };
  };
  phase2: {
    keywordRules: Array<{
      category: string;
      subcategory?: string;
      keywords: string[];
      priority: number;
    }>;
    fuzzyStats: {
      totalComparisons: number;
      matches: number;
      avgSimilarity: number;
    };
    tfidfStats: {
      vocabularySize: number;
      corpusSize: number;
      avgSimilarity: number;
    };
  };
  phase3: {
    isTrained: boolean;
    metrics?: {
      accuracy: number;
      loss: number;
      trainingSamples: number;
      validationSamples: number;
      lastTrainedAt?: Date;
    };
    architecture: {
      vocabularySize: number;
      embeddingDim: number;
      maxDescriptionLength: number;
      layers: string[];
    };
  };
}

export type CategorizationMethod =
  | 'exact-match'
  | 'fuzzy-match'
  | 'keyword-rule'
  | 'tfidf-similarity'
  | 'ml-classifier'
  | 'user-confirmed'
  | 'historical-pattern';
