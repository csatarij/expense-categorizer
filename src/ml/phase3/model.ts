import * as tf from '@tensorflow/tfjs';
import type { Transaction, CategorySuggestion } from '@/types';

const MAX_DESCRIPTION_LENGTH = 50;
const VOCABULARY_SIZE = 5000;
const EMBEDDING_DIM = 64;

let model: tf.LayersModel | null = null;
let vocabulary: string[] = [];
let categoryEncoder: Map<string, number> | null = null;
let categoryDecoder: Map<number, string> | null = null;
let isInitialized = false;

interface ModelMetrics {
  accuracy: number;
  loss: number;
  trainingSamples: number;
  validationSamples: number;
  lastTrainedAt?: Date;
}

interface TrainingHistory {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number | undefined;
  valAccuracy: number | undefined;
}

let currentMetrics: ModelMetrics = {
  accuracy: 0,
  loss: 0,
  trainingSamples: 0,
  validationSamples: 0,
};

function buildVocabulary(descriptions: string[]): string[] {
  const wordSet = new Set<string>();

  descriptions.forEach((desc) => {
    const words = desc
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0);
    words.forEach((w) => wordSet.add(w));
  });

  const words = Array.from(wordSet);
  words.sort((a, b) => a.localeCompare(b));

  return words.slice(0, VOCABULARY_SIZE);
}

function tokenize(description: string): number[] {
  const normalized = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const indices = normalized.map((word) => {
    const idx = vocabulary.indexOf(word);
    return idx >= 0 ? idx + 1 : 0;
  });

  if (indices.length < MAX_DESCRIPTION_LENGTH) {
    const paddingLength = MAX_DESCRIPTION_LENGTH - indices.length;
    const padding = new Array(paddingLength).fill(0) as number[];
    return [...indices, ...padding];
  }

  return indices.slice(0, MAX_DESCRIPTION_LENGTH);
}

export function initializeModel(): void {
  if (isInitialized) {
    return;
  }

  const sequential = tf.sequential();

  sequential.add(
    tf.layers.embedding({
      inputDim: VOCABULARY_SIZE + 1,
      outputDim: EMBEDDING_DIM,
      inputLength: MAX_DESCRIPTION_LENGTH,
    })
  );

  sequential.add(
    tf.layers.bidirectional({
      layer: tf.layers.lstm({ units: 64, returnSequences: false }),
    })
  );

  sequential.add(tf.layers.dropout({ rate: 0.3 }));
  sequential.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  sequential.add(tf.layers.dropout({ rate: 0.2 }));
  sequential.add(tf.layers.dense({ units: 16, activation: 'relu' }));

  sequential.add(
    tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
    })
  );

  sequential.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  model = sequential;
  isInitialized = true;
}

function prepareTrainingData(transactions: Transaction[]): {
  descriptions: string[];
  labels: number[];
  categories: string[];
} {
  const categorized = transactions.filter(
    (t) => t.category && t.category.trim()
  );

  if (categorized.length === 0) {
    return { descriptions: [], labels: [], categories: [] };
  }

  const uniqueCategories = Array.from(
    new Set(categorized.map((t) => t.category as string))
  );

  if (uniqueCategories.length === 0) {
    return { descriptions: [], labels: [], categories: [] };
  }

  categoryEncoder = new Map();
  categoryDecoder = new Map();
  const encoder = categoryEncoder;
  const decoder = categoryDecoder;

  uniqueCategories.forEach((category, index) => {
    encoder.set(category, index);
    decoder.set(index, category);
  });

  const descriptions = categorized.map((t) => t.entity);
  const labels = categorized.map((t) => {
    const cat = encoder.get(t.category as string);
    return cat !== undefined ? cat : 0;
  });

  return {
    descriptions,
    labels,
    categories: uniqueCategories,
  };
}

export async function trainModel(
  transactions: Transaction[],
  options: {
    epochs?: number;
    batchSize?: number;
    validationSplit?: number;
    onEpochEnd?: (epoch: number, history: TrainingHistory) => void;
  } = {}
): Promise<ModelMetrics> {
  initializeModel();

  const {
    epochs = 10,
    batchSize = 32,
    validationSplit = 0.2,
    onEpochEnd,
  } = options;

  const { descriptions, labels, categories } =
    prepareTrainingData(transactions);

  if (descriptions.length === 0 || categories.length <= 1) {
    throw new Error(
      'Insufficient training data. Need at least 2 different categories with multiple transactions each.'
    );
  }

  vocabulary = buildVocabulary(descriptions);

  const tokenizedDescriptions = descriptions.map(tokenize);

  const featuresTensor = tf.tensor2d(
    tokenizedDescriptions,
    [tokenizedDescriptions.length, MAX_DESCRIPTION_LENGTH],
    'int32'
  );

  const labelsTensor = tf.tensor1d(labels, 'float32');

  const totalSamples = descriptions.length;
  const validationSamples = Math.floor(totalSamples * validationSplit);
  const trainingSamples = totalSamples - validationSamples;

  if (!model) {
    throw new Error('Model not initialized');
  }

  const history = await model.fit(featuresTensor, labelsTensor, {
    epochs,
    batchSize,
    validationSplit,
    shuffle: true,
    callbacks: {
      onEpochEnd: (_epoch: number, logs?: Record<string, number>) => {
        if (onEpochEnd && logs) {
          const historyData: TrainingHistory = {
            epoch: _epoch,
            loss: logs.loss || 0,
            accuracy: logs.acc || logs.accuracy || 0,
            valLoss: logs.val_loss ?? undefined,
            valAccuracy: logs.val_acc ?? logs.val_accuracy ?? undefined,
          };
          onEpochEnd(_epoch, historyData);
        }
      },
    },
  });

  const finalHistory = history.history;

  const lossValue = Array.isArray(finalHistory.loss)
    ? (finalHistory.loss[finalHistory.loss.length - 1] as number)
    : 0;
  const accuracyValue = Array.isArray(finalHistory.acc)
    ? (finalHistory.acc[finalHistory.acc.length - 1] as number)
    : Array.isArray(finalHistory.accuracy)
      ? (finalHistory.accuracy[finalHistory.accuracy.length - 1] as number)
      : 0;

  currentMetrics = {
    accuracy: accuracyValue,
    loss: lossValue,
    trainingSamples,
    validationSamples,
    lastTrainedAt: new Date(),
  };

  featuresTensor.dispose();
  labelsTensor.dispose();

  return currentMetrics;
}

export async function predictCategory(
  description: string
): Promise<CategorySuggestion | null> {
  if (
    !model ||
    !categoryEncoder ||
    !categoryDecoder ||
    vocabulary.length === 0
  ) {
    return null;
  }

  if (!description || description.trim() === '') {
    return null;
  }

  try {
    const tokenized = tokenize(description);
    const featuresTensor = tf.tensor2d(
      [tokenized],
      [1, MAX_DESCRIPTION_LENGTH],
      'int32'
    );

    const prediction = model.predict(featuresTensor) as tf.Tensor;
    const probabilities = await prediction.data();

    featuresTensor.dispose();
    prediction.dispose();

    const bestIndex = probabilities.indexOf(Math.max(...probabilities));
    const maxProbability = probabilities[bestIndex];
    const predictedCategory = categoryDecoder.get(bestIndex);

    if (!predictedCategory || maxProbability === undefined) {
      return null;
    }

    const confidence = Math.round(maxProbability * 100);

    if (confidence < 30) {
      return null;
    }

    return {
      category: predictedCategory,
      confidence,
      reason: `ML prediction with ${String(confidence)}% confidence based on ${String(currentMetrics.trainingSamples)} training samples`,
      method: 'ml-classifier',
    };
  } catch (error) {
    console.error('Prediction error:', error);
    return null;
  }
}

export function isModelTrained(): boolean {
  return (
    isInitialized &&
    model !== null &&
    currentMetrics.trainingSamples > 0 &&
    currentMetrics.accuracy > 0
  );
}

export function getModelMetrics(): ModelMetrics {
  return { ...currentMetrics };
}

export async function saveModel(): Promise<void> {
  if (!model) {
    throw new Error('Model not initialized');
  }

  try {
    await model.save('localstorage://expense-categorizer-model');

    if (categoryEncoder && categoryDecoder) {
      const encoderData = Array.from(categoryEncoder.entries());
      const decoderData = Array.from(categoryDecoder.entries());

      localStorage.setItem(
        'expense-categorizer-encoder',
        JSON.stringify(encoderData)
      );
      localStorage.setItem(
        'expense-categorizer-decoder',
        JSON.stringify(decoderData)
      );
      localStorage.setItem(
        'expense-categorizer-vocabulary',
        JSON.stringify(vocabulary)
      );
      localStorage.setItem(
        'expense-categorizer-metrics',
        JSON.stringify({
          ...currentMetrics,
          lastTrainedAt: currentMetrics.lastTrainedAt?.toISOString(),
        })
      );
    }
  } catch (error) {
    console.error('Error saving model:', error);
    throw new Error('Failed to save model to local storage', { cause: error });
  }
}

export async function loadModel(): Promise<boolean> {
  try {
    const loadedModel = await tf.loadLayersModel(
      'localstorage://expense-categorizer-model'
    );

    model = loadedModel;
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });
    isInitialized = true;

    const encoderJson = localStorage.getItem('expense-categorizer-encoder');
    const decoderJson = localStorage.getItem('expense-categorizer-decoder');
    const metricsJson = localStorage.getItem('expense-categorizer-metrics');
    const vocabJson = localStorage.getItem('expense-categorizer-vocabulary');

    if (encoderJson && decoderJson) {
      const encoderData: unknown = JSON.parse(encoderJson);
      const decoderData: unknown = JSON.parse(decoderJson);

      if (Array.isArray(encoderData) && Array.isArray(decoderData)) {
        categoryEncoder = new Map(encoderData as [string, number][]);
        categoryDecoder = new Map(decoderData as [number, string][]);
      }
    }

    if (vocabJson) {
      const vocab: unknown = JSON.parse(vocabJson);
      if (Array.isArray(vocab)) {
        vocabulary = vocab as string[];
      }
    }

    if (metricsJson) {
      const parsedMetrics: unknown = JSON.parse(metricsJson);

      if (typeof parsedMetrics === 'object' && parsedMetrics !== null) {
        const metricsObj = parsedMetrics as Record<string, unknown>;
        if (
          'lastTrainedAt' in metricsObj &&
          typeof metricsObj.lastTrainedAt === 'string'
        ) {
          currentMetrics = {
            ...parsedMetrics,
            lastTrainedAt: new Date(metricsObj.lastTrainedAt),
          } as ModelMetrics;
        } else {
          currentMetrics = parsedMetrics as ModelMetrics;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error loading model:', error);
    return false;
  }
}

export function resetModel(): void {
  if (model) {
    model.dispose();
    model = null;
  }
  vocabulary = [];
  categoryEncoder = null;
  categoryDecoder = null;
  isInitialized = false;
  currentMetrics = {
    accuracy: 0,
    loss: 0,
    trainingSamples: 0,
    validationSamples: 0,
  };
}
