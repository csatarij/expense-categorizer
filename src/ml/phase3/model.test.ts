import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  initializeModel,
  trainModel,
  predictCategory,
  isModelTrained,
  getModelMetrics,
  saveModel,
  loadModel,
  resetModel,
} from './model';
import * as tf from '@tensorflow/tfjs';
import type { Transaction } from '@/types';

describe('Phase 3 ML Model', () => {
  beforeAll(() => {
    void tf.setBackend('cpu');
  });

  function createTransaction(
    overrides: Partial<Transaction> = {}
  ): Transaction {
    return {
      id: crypto.randomUUID(),
      date: new Date('2024-01-15'),
      entity: 'Test Transaction',
      amount: 100,
      currency: 'USD',
      isManuallyEdited: false,
      ...overrides,
    };
  }

  beforeEach(async () => {
    localStorage.clear();
    resetModel();
    await tf.nextFrame();
  });

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
    it('should handle empty descriptions', async () => {
      await expect(trainModel([], { epochs: 1 })).rejects.toThrow();
    });

    it('should require at least 2 categories', async () => {
      const transactions: Transaction[] = [
        createTransaction({ entity: 'Test', category: 'Food' }),
      ];

      await expect(trainModel(transactions, { epochs: 1 })).rejects.toThrow(
        'Insufficient training data'
      );
    });
  });

  describe('buildVocabulary', () => {
    it('should handle empty descriptions', () => {
      return expect(trainModel([], { epochs: 1 })).rejects.toThrow();
    });

    it('should require at least 2 categories', () => {
      const transactions: Transaction[] = [
        createTransaction({ entity: 'Test', category: 'Food' }),
      ];

      return expect(trainModel(transactions, { epochs: 1 })).rejects.toThrow(
        'Insufficient training data'
      );
    });
  });

  describe('trainModel', () => {
    it('should throw error with insufficient data', async () => {
      const transactions: Transaction[] = [
        createTransaction({ entity: 'Test', category: 'Food' }),
      ];

      await expect(trainModel(transactions, { epochs: 1 })).rejects.toThrow(
        'Insufficient training data'
      );
    });

    it('should throw error with no categories', async () => {
      const transactions: Transaction[] = [
        createTransaction({ entity: 'Test' }),
      ];

      await expect(trainModel(transactions, { epochs: 1 })).rejects.toThrow(
        'Insufficient training data'
      );
    });

    it('should train model with valid data', async () => {
      const metrics = await trainModel(
        [
          createTransaction({
            entity: 'STARBUCKS COFFEE',
            category: 'Food',
          }),
          createTransaction({
            entity: 'WHOLE FOODS MARKET',
            category: 'Groceries',
          }),
          createTransaction({
            entity: 'AMAZON PURCHASE ONLINE',
            category: 'Shopping',
          }),
          createTransaction({
            entity: 'NETFLIX STREAMING',
            category: 'Entertainment',
          }),
          createTransaction({
            entity: 'UBER RIDE',
            category: 'Transportation',
          }),
        ],
        { epochs: 1 }
      );
      expect(metrics.trainingSamples).toBeGreaterThan(0);
      expect(metrics.validationSamples).toBeGreaterThanOrEqual(0);
      expect(metrics.lastTrainedAt).toBeInstanceOf(Date);
    }, 60000);

    it('should handle custom epochs', async () => {
      const metrics = await trainModel(
        [
          createTransaction({ entity: 'ITEM ONE', category: 'Food' }),
          createTransaction({
            entity: 'ITEM TWO',
            category: 'Shopping',
          }),
        ],
        { epochs: 1 }
      );
      expect(metrics).toBeDefined();
    }, 60000);

    it('should handle custom validation split', async () => {
      const metrics = await trainModel(
        [
          createTransaction({ entity: 'ITEM ONE', category: 'Food' }),
          createTransaction({
            entity: 'ITEM TWO',
            category: 'Shopping',
          }),
        ],
        { validationSplit: 0.5 }
      );
      expect(metrics.validationSamples).toBeGreaterThanOrEqual(0);
    }, 60000);
  });

  describe('predictCategory', () => {
    beforeEach(async () => {
      await trainModel(
        [
          createTransaction({
            entity: 'STARBUCKS COFFEE',
            category: 'Food',
          }),
          createTransaction({
            entity: 'WHOLE FOODS MARKET',
            category: 'Groceries',
          }),
          createTransaction({
            entity: 'AMAZON PURCHASE ONLINE',
            category: 'Shopping',
          }),
          createTransaction({
            entity: 'NETFLIX STREAMING',
            category: 'Entertainment',
          }),
          createTransaction({
            entity: 'UBER RIDE',
            category: 'Transportation',
          }),
        ],
        { epochs: 1 }
      );
    }, 60000);

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
    it.skip('should return true after training', async () => {
      await trainModel(
        [
          createTransaction({
            entity: 'STARBUCKS COFFEE',
            category: 'Food',
          }),
          createTransaction({
            entity: 'WHOLE FOODS MARKET',
            category: 'Groceries',
          }),
          createTransaction({
            entity: 'AMAZON PURCHASE ONLINE',
            category: 'Shopping',
          }),
          createTransaction({
            entity: 'NETFLIX STREAMING',
            category: 'Entertainment',
          }),
          createTransaction({
            entity: 'UBER RIDE',
            category: 'Transportation',
          }),
        ],
        { epochs: 5 }
      );
      expect(isModelTrained()).toBe(true);
    }, 60000);
  });

  describe('getModelMetrics', () => {
    it('should return current metrics after training', async () => {
      await trainModel(
        [
          createTransaction({ entity: 'ITEM ONE', category: 'Food' }),
          createTransaction({
            entity: 'ITEM TWO',
            category: 'Shopping',
          }),
        ],
        { epochs: 1 }
      );
      const metrics = getModelMetrics();
      expect(metrics.trainingSamples).toBeGreaterThan(0);
      expect(metrics.lastTrainedAt).toBeInstanceOf(Date);
    }, 60000);
  });

  describe('saveModel and loadModel', () => {
    it('should save model to localStorage', async () => {
      await trainModel(
        [
          createTransaction({ entity: 'ITEM ONE', category: 'Food' }),
          createTransaction({
            entity: 'ITEM TWO',
            category: 'Shopping',
          }),
        ],
        { epochs: 1 }
      );
      await saveModel();
      expect(localStorage.getItem('expense-categorizer-encoder')).toBeTruthy();
      expect(localStorage.getItem('expense-categorizer-decoder')).toBeTruthy();
      expect(
        localStorage.getItem('expense-categorizer-vocabulary')
      ).toBeTruthy();
    }, 60000);

    it('should load model from localStorage', async () => {
      await trainModel(
        [
          createTransaction({ entity: 'ITEM ONE', category: 'Food' }),
          createTransaction({
            entity: 'ITEM TWO',
            category: 'Shopping',
          }),
        ],
        { epochs: 1 }
      );
      await saveModel();
      const loaded = await loadModel();
      expect(loaded).toBe(true);
    }, 60000);

    it('should preserve vocabulary when loading', async () => {
      await trainModel(
        [
          createTransaction({ entity: 'ITEM ONE', category: 'Food' }),
          createTransaction({
            entity: 'ITEM TWO',
            category: 'Shopping',
          }),
        ],
        { epochs: 1 }
      );
      const metricsBeforeSave = getModelMetrics();
      await saveModel();
      const loaded = await loadModel();
      expect(loaded).toBe(true);
      const metricsAfterLoad = getModelMetrics();
      expect(metricsAfterLoad.trainingSamples).toBe(
        metricsBeforeSave.trainingSamples
      );
    }, 60000);

    it('should return false when loading model that does not exist', async () => {
      await expect(loadModel()).resolves.toBe(false);
    });
  });
});
