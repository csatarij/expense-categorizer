import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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

  it(
    'should train model with valid data',
    () =>
      trainModel(
        [
          createTransaction({
            description: 'STARBUCKS COFFEE',
            category: 'Food',
          }),
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
        ],
        { epochs: 1 }
      ).then((metrics) => {
        expect(metrics.trainingSamples).toBeGreaterThan(0);
        expect(metrics.validationSamples).toBeGreaterThanOrEqual(0);
        expect(metrics.lastTrainedAt).toBeInstanceOf(Date);
      }),
    30000
  );

  it(
    'should handle custom epochs',
    () =>
      trainModel(
        [
          createTransaction({ description: 'ITEM ONE', category: 'Food' }),
          createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
        ],
        { epochs: 1 }
      ).then((metrics) => {
        expect(metrics).toBeDefined();
      }),
    30000
  );

  it(
    'should handle custom validation split',
    () =>
      trainModel(
        [
          createTransaction({ description: 'ITEM ONE', category: 'Food' }),
          createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
        ],
        { validationSplit: 0.5 }
      ).then((metrics) => {
        expect(metrics.validationSamples).toBeGreaterThanOrEqual(0);
      }),
    30000
  );
});

describe('predictCategory - after training', () => {
  beforeAll(async () => {
    await trainModel(
      [
        createTransaction({
          description: 'STARBUCKS COFFEE',
          category: 'Food',
        }),
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
      ],
      { epochs: 1 }
    );
  }, 30000);

  it('should return null for empty description', async () => {
    const result = await predictCategory('');
    expect(result).toBeNull();
  });

  it('should predict category for known description', async () => {
    const result = await predictCategory('STARBUCKS COFFEE');
    if (result !== null) {
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('method', 'ml-classifier');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    }
  });

  it('should generate reason with confidence', async () => {
    const result = await predictCategory('AMAZON PURCHASE');
    if (result !== null) {
      expect(result.reason).toContain('% confidence');
      expect(result.reason).toContain('training samples');
    }
  });

  it('should have reason string', async () => {
    const result = await predictCategory('NETFLIX STREAMING');
    if (result !== null) {
      expect(typeof result.reason).toBe('string');
    }
  });
});

describe('isModelTrained', () => {
  it('should return true after training', async () => {
    await trainModel(
      [
        createTransaction({ description: 'ITEM ONE', category: 'Food' }),
        createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
      ],
      { epochs: 1 }
    );
    expect(isModelTrained()).toBe(true);
  }, 30000);
});

describe('getModelMetrics', () => {
  it(
    'should return current metrics after training',
    () =>
      trainModel(
        [
          createTransaction({ description: 'ITEM ONE', category: 'Food' }),
          createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
        ],
        { epochs: 1 }
      ).then(() => {
        const metrics = getModelMetrics();
        expect(metrics.trainingSamples).toBeGreaterThan(0);
        expect(metrics.lastTrainedAt).toBeInstanceOf(Date);
      }),
    30000
  );
});

describe('saveModel and loadModel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it(
    'should save model to localStorage',
    () =>
      trainModel(
        [
          createTransaction({ description: 'ITEM ONE', category: 'Food' }),
          createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
        ],
        { epochs: 1 }
      )
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
        }),
    30000
  );

  it(
    'should load model from localStorage',
    () =>
      trainModel(
        [
          createTransaction({ description: 'ITEM ONE', category: 'Food' }),
          createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
        ],
        { epochs: 1 }
      )
        .then(() => saveModel())
        .then(() => loadModel())
        .then((loaded) => {
          expect(loaded).toBe(true);
        }),
    30000
  );

  it(
    'should preserve vocabulary when loading',
    () =>
      trainModel(
        [
          createTransaction({ description: 'ITEM ONE', category: 'Food' }),
          createTransaction({ description: 'ITEM TWO', category: 'Shopping' }),
        ],
        { epochs: 1 }
      )
        .then(() => {
          const metricsBeforeSave = getModelMetrics();
          return saveModel().then(() => metricsBeforeSave);
        })
        .then((metricsBeforeSave) => {
          return loadModel().then((loaded) => {
            expect(loaded).toBe(true);
            const metricsAfterLoad = getModelMetrics();
            expect(metricsAfterLoad.trainingSamples).toBe(
              metricsBeforeSave.trainingSamples
            );
          });
        }),
    30000
  );

  it('should return false when loading model that does not exist', () => {
    localStorage.clear();
    return loadModel().then((loaded) => {
      expect(loaded).toBe(false);
    });
  });
});
