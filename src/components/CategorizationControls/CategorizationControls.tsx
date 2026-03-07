import { useState, useCallback } from 'react';
import { exactMatch } from '@/ml/phase1';
import {
  categorizeByKeywordRule,
  fuzzyMatch,
  categorizeByTFIDF,
  trainTFIDFModel,
} from '@/ml/phase2';
import {
  initializeModel,
  trainModel,
  predictCategory,
  isModelTrained,
  getModelMetrics,
} from '@/ml/phase3';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import type { Transaction } from '@/types';

interface CategorizationControlsProps {
  transactions: Transaction[];
  onCategorize: (updatedTransactions: Transaction[]) => void;
}

// #2: Progress state
interface CategorizationProgress {
  current: number;
  total: number;
  categorized: number;
}

export function CategorizationControls({
  transactions,
  onCategorize,
}: CategorizationControlsProps) {
  // #3: Default to Phase 1 and 2 enabled
  const [selectedPhases, setSelectedPhases] = useState<number[]>([1, 2]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [progress, setProgress] = useState<CategorizationProgress | null>(null);
  const [phase2Methods, setPhase2Methods] = useState<string[]>([
    'keyword',
    'fuzzy',
    'tfidf',
  ]);
  const [isTrainingModel, setIsTrainingModel] = useState(false);
  const [modelMetrics, setModelMetrics] = useState(() =>
    isModelTrained() ? getModelMetrics() : null
  );

  const handlePhaseToggle = (phase: number) => {
    setSelectedPhases((prev) => {
      return prev.includes(phase)
        ? prev.filter((p) => p !== phase)
        : [...prev, phase];
    });
  };

  const handlePhase2MethodToggle = (method: string) => {
    setPhase2Methods((prev) => {
      return prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method];
    });
  };

  const runCategorization = useCallback(async () => {
    setIsCategorizing(true);
    const categorizedTransactions = [...transactions];
    const historicalData = transactions.filter((t) => t.category);

    // #4: Pre-train TF-IDF model once before the loop
    if (selectedPhases.includes(2) && phase2Methods.includes('tfidf')) {
      trainTFIDFModel(historicalData);
    }

    const uncategorizedIndices: number[] = [];
    for (let i = 0; i < categorizedTransactions.length; i++) {
      const t = categorizedTransactions[i];
      if (t && !t.category) {
        uncategorizedIndices.push(i);
      }
    }

    let categorizedCount = 0;
    const total = uncategorizedIndices.length;

    // #2: Process in batches for progress feedback
    const BATCH_SIZE = 50;
    for (let batchStart = 0; batchStart < uncategorizedIndices.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, uncategorizedIndices.length);

      for (let b = batchStart; b < batchEnd; b++) {
        const i = uncategorizedIndices[b];
        if (i === undefined) continue;
        const transaction = categorizedTransactions[i];
        if (!transaction) continue;

        let suggestion = null;

        if (selectedPhases.includes(1)) {
          suggestion = exactMatch(transaction.entity, historicalData);
        }

        if (!suggestion && selectedPhases.includes(2)) {
          if (phase2Methods.includes('keyword')) {
            suggestion ??= categorizeByKeywordRule(
              transaction.entity,
              DEFAULT_CATEGORIES
            );
          }

          if (phase2Methods.includes('fuzzy') && !suggestion) {
            suggestion ??= fuzzyMatch(
              transaction.entity,
              historicalData,
              transaction.amount
            );
          }

          if (phase2Methods.includes('tfidf') && !suggestion) {
            suggestion ??= categorizeByTFIDF(
              transaction.entity,
              historicalData,
              transaction.amount
            );
          }
        }

        if (!suggestion && selectedPhases.includes(3)) {
          if (!isModelTrained()) {
            continue;
          }

          try {
            suggestion = await predictCategory(transaction.entity);
          } catch (err) {
            console.error('ML prediction error:', err);
          }
        }

        if (suggestion) {
          // #6: Spread original transaction to preserve all fields (notes, metadata, etc.)
          categorizedTransactions[i] = {
            ...transaction,
            category: suggestion.category,
            ...(suggestion.subcategory ? { subcategory: suggestion.subcategory } : {}),
            confidence: suggestion.confidence / 100,
            originalCategory: suggestion.category,
            isManuallyEdited: false,
          };
          categorizedCount++;
        }
      }

      // #2: Update progress after each batch, yield to UI
      setProgress({ current: batchEnd, total, categorized: categorizedCount });
      await new Promise((resolve) => { setTimeout(resolve, 0); });
    }

    onCategorize(categorizedTransactions);
    setIsCategorizing(false);
    setProgress(null);
  }, [transactions, selectedPhases, phase2Methods, onCategorize]);

  const trainPhase3Model = useCallback(async () => {
    setIsTrainingModel(true);
    try {
      initializeModel();

      const categorizedTransactions = transactions.filter(
        (t) => t.category && t.category.trim()
      );

      const metrics = await trainModel(categorizedTransactions, {
        epochs: 10,
        batchSize: 16,
        validationSplit: 0.2,
      });

      setModelMetrics(metrics);
    } catch (err) {
      console.error('Model training error:', err);
      alert(
        'Failed to train model. Make sure you have enough categorized transactions.'
      );
    } finally {
      setIsTrainingModel(false);
    }
  }, [transactions]);

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">
        AI Categorization
      </h3>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedPhases.includes(1)}
              onChange={() => {
                handlePhaseToggle(1);
              }}
              className="text-primary-600 focus:ring-primary-500 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Phase 1: Exact Match</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedPhases.includes(2)}
              onChange={() => {
                handlePhaseToggle(2);
              }}
              className="text-primary-600 focus:ring-primary-500 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Phase 2: Pattern Matching
            </span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedPhases.includes(3)}
              onChange={() => {
                handlePhaseToggle(3);
              }}
              className="text-primary-600 focus:ring-primary-500 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Phase 3: ML Model{' '}
              {!isModelTrained() && (
                <span className="text-xs text-orange-500">(Not trained)</span>
              )}
            </span>
          </label>
        </div>

        {selectedPhases.includes(2) && (
          <div className="ml-4 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <span className="text-xs font-semibold text-gray-600">
              Phase 2 Methods:
            </span>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={phase2Methods.includes('keyword')}
                  onChange={() => {
                    handlePhase2MethodToggle('keyword');
                  }}
                  className="text-primary-600 focus:ring-primary-500 rounded border-gray-300"
                />
                <span className="text-xs text-gray-700">Keyword Rules</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={phase2Methods.includes('fuzzy')}
                  onChange={() => {
                    handlePhase2MethodToggle('fuzzy');
                  }}
                  className="text-primary-600 focus:ring-primary-500 rounded border-gray-300"
                />
                <span className="text-xs text-gray-700">Fuzzy Matching</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={phase2Methods.includes('tfidf')}
                  onChange={() => {
                    handlePhase2MethodToggle('tfidf');
                  }}
                  className="text-primary-600 focus:ring-primary-500 rounded border-gray-300"
                />
                <span className="text-xs text-gray-700">TF-IDF Similarity</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              runCategorization().catch((err: unknown) => {
                console.error('Categorization error:', err);
              });
            }}
            disabled={isCategorizing || selectedPhases.length === 0}
            className="bg-primary-600 hover:bg-primary-700 rounded-md px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isCategorizing ? 'Categorizing...' : 'Categorize Now'}
          </button>

          <button
            onClick={() => {
              trainPhase3Model().catch((err: unknown) => {
                console.error('Model training error:', err);
              });
            }}
            disabled={isTrainingModel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {isTrainingModel ? 'Training...' : 'Train Phase 3 Model'}
          </button>
        </div>

        {/* #2: Progress bar during categorization */}
        {progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Processing {String(progress.current)} / {String(progress.total)} transactions</span>
              <span>{String(progress.categorized)} categorized</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="bg-primary-600 h-full rounded-full transition-all duration-150"
                style={{ width: `${String(progress.total > 0 ? (progress.current / progress.total) * 100 : 0)}%` }}
              />
            </div>
          </div>
        )}

        {modelMetrics && (
          <div className="mt-2 ml-2 rounded-lg border border-green-100 bg-green-50 p-3">
            <span className="text-xs font-semibold text-green-800">
              Model Metrics (Last Training):
            </span>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-green-700">
              <div>Accuracy: {(modelMetrics.accuracy * 100).toFixed(1)}%</div>
              <div>Loss: {modelMetrics.loss.toFixed(4)}</div>
              <div>Training Samples: {modelMetrics.trainingSamples}</div>
              <div>Validation Samples: {modelMetrics.validationSamples}</div>
              {modelMetrics.lastTrainedAt && (
                <div className="col-span-2">
                  Last Trained: {modelMetrics.lastTrainedAt.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Note: Categorization will be applied to uncategorized transactions
          only. Phases are processed in order (Phase 1 → Phase 2 → Phase 3).
        </p>
      </div>
    </div>
  );
}
