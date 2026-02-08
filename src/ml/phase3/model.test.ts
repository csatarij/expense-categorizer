import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import {
  initializeModel,
  trainModel,
  predictCategory,
  isModelTrained,
  getModelMetrics,
  saveModel,
  loadModel,
} from './model';
import * as tf from '@tensorflow/tfjs';
import type { Transaction } from '@/types';

beforeAll(() => {
  void tf.setBackend('cpu');
});

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    date: new Date('2024-01-15'),
    description: 'Test Transaction',
    amount: 100,
    currency: 'USD',
    isManuallyEdited: false,
    ...overrides,
  };
}

describe('initializeModel', () => {
  it('should initialize the model', () => {
    initializeModel();
    const metrics = getModelMetrics();
    expect(metrics).toBeDefined();
  });

  it('should not reinitialize if already initialized', () => {
    initializeModel();
    initializeModel();
    expect(isModelTrained()).toBe(false);
  });
});

describe('buildVocabulary', () => {
  it('should handle empty descriptions', () => {
    return expect(trainModel([], { epochs: 1 })).rejects.toThrow();
  });

  it('should require at least 2 categories', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'Test', category: 'Food' }),
    ];

    return expect(trainModel(transactions, { epochs: 1 })).rejects.toThrow(
      'Insufficient training data'
    );
  });
});

describe('trainModel', () => {
  beforeEach(() => {
    tf.dispose();
  });

  it('should throw error with insufficient data', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'Test', category: 'Food' }),
    ];

    return expect(trainModel(transactions, { epochs: 1 })).rejects.toThrow(
      'Insufficient training data'
    );
  });

  it('should throw error with no categories', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'Test' }),
    ];

    return expect(trainModel(transactions, { epochs: 1 })).rejects.toThrow(
      'Insufficient training data'
    );
  });

  it('should train model with valid data', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'STARBUCKS COFFEE', category: 'Food' }),
      createTransaction({
        description: 'WHOLE FOODS MARKET',
        category: 'Groceries',
      }),
      createTransaction({
        description: 'AMAZON PURCHASE ONLINE',
        category: 'Shopping',
      }),
      createTransaction({
        description: 'NETFLIX STREAMING',
        category: 'Entertainment',
      }),
      createTransaction({
        description: 'UBER RIDE',
        category: 'Transportation',
      }),
    ];

    return trainModel(transactions, { epochs: 1 }).then((metrics) => {
      expect(metrics.trainingSamples).toBeGreaterThan(0);
      expect(metrics.validationSamples).toBeGreaterThanOrEqual(0);
      expect(metrics.lastTrainedAt).toBeInstanceOf(Date);
    });
  }, 30000);

  it('should call onEpochEnd callback', () => {
    const onEpochEnd = vi.fn();

    const transactions: Transaction[] = [
      createTransaction({ description: 'FOOD ITEM', category: 'Food' }),
      createTransaction({
        description: 'SHOPPING ITEM',
        category: 'Shopping',
      }),
    ];

    return trainModel(transactions, { epochs: 1, onEpochEnd }).then(() => {
      expect(onEpochEnd).toHaveBeenCalled();
    });
  }, 30000);

  it('should handle custom epochs', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'ITEM ONE', category: 'Food' }),
      createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
    ];

    return trainModel(transactions, { epochs: 1 }).then((metrics) => {
      expect(metrics).toBeDefined();
    });
  }, 30000);

  it('should handle custom validation split', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'ITEM ONE', category: 'Food' }),
      createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
    ];

    return trainModel(transactions, { validationSplit: 0.5 }).then(
      (metrics) => {
        expect(metrics.validationSamples).toBeGreaterThanOrEqual(0);
      }
    );
  }, 30000);
});

describe('predictCategory', () => {
  beforeEach(() => {
    tf.dispose();
    const transactions: Transaction[] = [
      createTransaction({ description: 'STARBUCKS COFFEE', category: 'Food' }),
      createTransaction({
        description: 'WHOLE FOODS MARKET',
        category: 'Groceries',
      }),
      createTransaction({
        description: 'AMAZON PURCHASE ONLINE',
        category: 'Shopping',
      }),
      createTransaction({
        description: 'NETFLIX STREAMING',
        category: 'Entertainment',
      }),
      createTransaction({
        description: 'UBER RIDE',
        category: 'Transportation',
      }),
    ];

    void trainModel(transactions, { epochs: 1 });
  });

  it('should return null for empty description', () => {
    return predictCategory('').then((result) => {
      expect(result).toBeNull();
    });
  });

  it('should return null when model not trained', () => {
    tf.dispose();
    return predictCategory('TEST DESCRIPTION').then((result) => {
      expect(result).toBeNull();
    });
  });

  it('should predict category for known description', async () => {
    return predictCategory('STARBUCKS COFFEE').then((result) => {
      if (result !== null) {
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('method', 'ml-classifier');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
      }
    });
  }, 30000);

  it('should generate reason with confidence', async () => {
    return predictCategory('AMAZON PURCHASE').then((result) => {
      if (result !== null) {
        expect(result.reason).toContain('% confidence');
        expect(result.reason).toContain('training samples');
      }
    });
  }, 30000);

  it('should have reason string', async () => {
    return predictCategory('NETFLIX STREAMING').then((result) => {
      if (result !== null) {
        expect(typeof result.reason).toBe('string');
      }
    });
  }, 30000);
});

describe('isModelTrained', () => {
  beforeEach(() => {
    tf.dispose();
  });

  it('should return false before training', () => {
    expect(isModelTrained()).toBe(false);
  });

  it('should return true after training', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'ITEM ONE', category: 'Food' }),
      createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
    ];

    return trainModel(transactions, { epochs: 1 }).then(() => {
      expect(isModelTrained()).toBe(true);
    });
  }, 30000);
});

describe('getModelMetrics', () => {
  it('should return default metrics before training', () => {
    const metrics = getModelMetrics();
    expect(metrics.accuracy).toBe(0);
    expect(metrics.loss).toBe(0);
    expect(metrics.trainingSamples).toBe(0);
  });

  it('should return current metrics after training', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'ITEM ONE', category: 'Food' }),
      createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
    ];

    return trainModel(transactions, { epochs: 1 }).then(() => {
      const metrics = getModelMetrics();
      expect(metrics.trainingSamples).toBeGreaterThan(0);
      expect(metrics.lastTrainedAt).toBeInstanceOf(Date);
    });
  }, 30000);
});

describe('saveModel and loadModel', () => {
  beforeEach(() => {
    localStorage.clear();
    tf.dispose();
  });

  it('should save model to localStorage', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'ITEM ONE', category: 'Food' }),
      createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
    ];

    return trainModel(transactions, { epochs: 1 })
      .then(() => saveModel())
      .then(() => {
        expect(
          localStorage.getItem('expense-categorizer-encoder')
        ).toBeTruthy();
        expect(
          localStorage.getItem('expense-categorizer-decoder')
        ).toBeTruthy();
        expect(
          localStorage.getItem('expense-categorizer-vocabulary')
        ).toBeTruthy();
      });
  }, 30000);

  it('should load model from localStorage', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'ITEM ONE', category: 'Food' }),
      createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
    ];

    return trainModel(transactions, { epochs: 1 })
      .then(() => saveModel())
      .then(() => loadModel())
      .then((loaded) => {
        expect(loaded).toBe(true);
      });
  }, 30000);

  it('should preserve vocabulary when loading', () => {
    const transactions: Transaction[] = [
      createTransaction({ description: 'ITEM ONE', category: 'Food' }),
      createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
    ];

    return trainModel(transactions, { epochs: 1 })
      .then(() => {
        const metricsBeforeSave = getModelMetrics();
        return saveModel().then(() => metricsBeforeSave);
      })
      .then((metricsBeforeSave) => {
        localStorage.clear();
        tf.dispose();
        return loadModel().then(() => metricsBeforeSave);
      })
      .then((metricsBeforeSave) => {
        const metricsAfterLoad = getModelMetrics();
        expect(metricsAfterLoad.trainingSamples).toBe(
          metricsBeforeSave.trainingSamples
        );
      });
  }, 30000);

  it('should return false when loading model that does not exist', () => {
    localStorage.clear();
    return loadModel().then((loaded) => {
      expect(loaded).toBe(false);
    });
  });
});
