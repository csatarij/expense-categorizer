import { useState, useCallback } from 'react';
import { exactMatch } from '@/ml/phase1';
import {
  categorizeByKeywordRule,
  fuzzyMatch,
  categorizeByTFIDF,
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

export function CategorizationControls({
  transactions,
  onCategorize,
}: CategorizationControlsProps) {
  const [selectedPhases, setSelectedPhases] = useState<number[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
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

    for (let i = 0; i < categorizedTransactions.length; i++) {
      const transaction = categorizedTransactions[i];
      if (!transaction || transaction.category) {
        continue;
      }

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
          suggestion ??= fuzzyMatch(transaction.entity, historicalData);
        }

        if (phase2Methods.includes('tfidf') && !suggestion) {
          suggestion ??= categorizeByTFIDF(transaction.entity, historicalData);
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
        const updatedTransaction: Transaction = {
          id: transaction.id,
          date: transaction.date,
          entity: transaction.entity,
          amount: transaction.amount,
          currency: transaction.currency,
          category: suggestion.category,
          confidence: suggestion.confidence / 100,
          originalCategory: suggestion.category,
          isManuallyEdited: false,
        };

        if (suggestion.subcategory) {
          updatedTransaction.subcategory = suggestion.subcategory;
        }

        if (transaction.metadata) {
          updatedTransaction.metadata = transaction.metadata;
        }

        categorizedTransactions[i] = updatedTransaction;
      }
    }

    onCategorize(categorizedTransactions);
    setIsCategorizing(false);
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
