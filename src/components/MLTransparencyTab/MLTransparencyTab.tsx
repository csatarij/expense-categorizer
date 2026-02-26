import { useState } from 'react';
import { isModelTrained, getModelMetrics } from '@/ml/phase3';
import type { Transaction } from '@/types';

export function MLTransparencyTab({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);

  const categorizedCount = transactions.filter((t) => t.category).length;
  const isMLModelTrained = isModelTrained();
  const mlMetrics = isMLModelTrained ? getModelMetrics() : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          ML Categorization Overview
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Complete transparency into how our AI categorizes your expenses
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Categorized"
          value={`${String(categorizedCount)}/${String(transactions.length)}`}
          description="Transactions with categories"
        />
        <StatCard
          title="ML Model"
          value={isMLModelTrained ? 'Trained' : 'Not Trained'}
          description="Phase 3 classifier status"
          color={isMLModelTrained ? 'green' : 'gray'}
        />
        {mlMetrics && (
          <StatCard
            title="Accuracy"
            value={`${(mlMetrics.accuracy * 100).toFixed(1)}%`}
            description={`Based on ${String(mlMetrics.trainingSamples)} samples`}
            color="blue"
          />
        )}
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          Categorization Phases
        </h3>
        <div className="space-y-4">
          <PhaseCard
            phase={1}
            title="Phase 1: Exact Match"
            description="Matches transactions exactly with historical data. Provides highest confidence (95-100%) for previously seen merchants."
            expanded={selectedPhase === 1}
            onToggle={() => {
              setSelectedPhase(selectedPhase === 1 ? null : 1);
            }}
          >
            <Phase1Details transactions={transactions} />
          </PhaseCard>

          <PhaseCard
            phase={2}
            title="Phase 2: Pattern Matching"
            description="Uses multiple intelligent techniques to categorize new transactions: keyword rules, fuzzy matching, and TF-IDF similarity."
            expanded={selectedPhase === 2}
            onToggle={() => {
              setSelectedPhase(selectedPhase === 2 ? null : 2);
            }}
          >
            <Phase2Details />
          </PhaseCard>

          <PhaseCard
            phase={3}
            title="Phase 3: ML Classifier"
            description="Neural network model trained on your data for advanced categorization when exact and pattern matches fail."
            expanded={selectedPhase === 3}
            onToggle={() => {
              setSelectedPhase(selectedPhase === 3 ? null : 3);
            }}
          >
            <Phase3Details metrics={mlMetrics} />
          </PhaseCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  color = 'blue',
}: {
  title: string;
  value: string;
  description: string;
  color?: 'green' | 'blue' | 'gray';
}) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-xs font-semibold tracking-wider uppercase">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-75">{description}</div>
    </div>
  );
}

function PhaseCard({
  phase,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  phase: number;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white">
              {phase}
            </div>
            <div>
              <div className="font-semibold text-gray-800">{title}</div>
              <div className="text-sm text-gray-600">{description}</div>
            </div>
          </div>
          <svg
            className={`h-5 w-5 transform transition-transform ${
              expanded ? 'rotate-180' : ''
            } text-gray-500`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 p-4">{children}</div>
      )}
    </div>
  );
}

function Phase1Details({ transactions }: { transactions: Transaction[] }) {
  const categorized = transactions.filter((t) => t.category);
  const uniqueEntities = new Set(categorized.map((t) => t.entity));
  const manualEdits = categorized.filter((t) => t.isManuallyEdited);

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="mb-2 font-semibold text-gray-800">How It Works</h4>
        <ul className="list-disc space-y-1 pl-5 text-gray-600">
          <li>
            Normalizes transaction descriptions (lowercase, removes special
            chars, store numbers)
          </li>
          <li>
            Searches for exact matches in your historical categorized
            transactions
          </li>
          <li>Prioritizes manually edited matches (confidence: 100%)</li>
          <li>Returns category from the most recent match (confidence: 95%)</li>
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
        <div>
          <div className="text-xs text-gray-500">Unique Entities</div>
          <div className="text-lg font-semibold text-gray-800">
            {uniqueEntities.size}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Total Matches</div>
          <div className="text-lg font-semibold text-gray-800">
            {categorized.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Manual Edits</div>
          <div className="text-lg font-semibold text-gray-800">
            {manualEdits.length}
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-semibold text-gray-800">Confidence Score</h4>
        <div className="text-gray-600">
          <ul className="list-disc space-y-1 pl-5">
            <li>Base: 95%</li>
            <li>With manual edit confirmation: 100%</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Phase2Details() {
  const methods = [
    {
      name: 'Keyword Rules',
      description:
        'Matches keywords and phrases like "starbucks", "gas station", "netflix" to categories',
      keywords: 120,
      confidence: '75-85%',
      threshold: 'Multiple word: +5%',
    },
    {
      name: 'Fuzzy Matching',
      description:
        'Uses Levenshtein distance to find similar transaction names, handling typos and variations',
      keywords: 'N/A',
      confidence: '60-100%',
      threshold: 'Minimum: 70% similarity',
    },
    {
      name: 'TF-IDF Similarity',
      description:
        'Semantic matching using Term Frequency-Inverse Document Frequency for contextual understanding',
      keywords: 200,
      confidence: '50-100%',
      threshold: 'Minimum: 50% similarity',
    },
  ];

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="mb-2 font-semibold text-gray-800">How It Works</h4>
        <p className="mb-3 text-gray-600">
          Phase 2 runs three methods sequentially until one finds a match:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-gray-600">
          <li>
            <strong>Keyword Rules:</strong> Checks for known merchant names and
            keywords
          </li>
          <li>
            <strong>Fuzzy Matching:</strong> Finds similar names handling typos,
            store branches
          </li>
          <li>
            <strong>TF-IDF Similarity:</strong> Advanced semantic similarity
            matching
          </li>
        </ol>
      </div>

      <div className="space-y-2">
        {methods.map((method, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-semibold text-gray-800">{method.name}</div>
              <div className="text-primary-600 bg-primary-50 rounded px-2 py-0.5 text-xs font-medium">
                {method.confidence}
              </div>
            </div>
            <div className="mb-2 text-xs text-gray-600">
              {method.description}
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>
                {method.keywords !== 'N/A'
                  ? `${String(method.keywords)} keywords`
                  : ''}
              </span>
              <span>{method.threshold}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Phase3Details({
  metrics,
}: {
  metrics: {
    accuracy: number;
    loss: number;
    trainingSamples: number;
    validationSamples: number;
    lastTrainedAt?: Date | string;
  } | null;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="mb-2 font-semibold text-gray-800">Model Architecture</h4>
        <div className="rounded-lg bg-gray-50 p-3 font-mono text-xs">
          <div className="text-gray-600">
            <div>Input → Embedding (64 dim) → Bi-LSTM (64 units)</div>
            <div>→ Dropout (0.3) → Dense (32, ReLU)</div>
            <div>→ Dropout (0.2) → Dense (16, ReLU)</div>
            <div>→ Dense (N classes, Sigmoid)</div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-semibold text-gray-800">Configuration</h4>
        <ul className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <li>Vocabulary size: 5000</li>
          <li>Max description length: 50</li>
          <li>Optimizer: Adam (lr=0.001)</li>
          <li>Loss: Binary Crossentropy</li>
        </ul>
      </div>

      {metrics ? (
        <div>
          <h4 className="mb-2 font-semibold text-gray-800">Training Metrics</h4>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-green-50 p-3 text-xs">
            <div>
              <span className="text-gray-500">Accuracy:</span>{' '}
              <span className="font-semibold text-green-800">
                {(metrics.accuracy * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Loss:</span>{' '}
              <span className="font-semibold text-green-800">
                {metrics.loss.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Training samples:</span>{' '}
              <span className="font-semibold text-green-800">
                {metrics.trainingSamples}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Validation samples:</span>{' '}
              <span className="font-semibold text-green-800">
                {metrics.validationSamples}
              </span>
            </div>
            {metrics.lastTrainedAt && (
              <div className="col-span-2">
                <span className="text-gray-500">Last trained:</span>{' '}
                <span className="font-semibold text-green-800">
                  {new Date(metrics.lastTrainedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
          Model not yet trained. Upload and categorize more transactions, then
          train the model to use Phase 3.
        </div>
      )}

      <div>
        <h4 className="mb-2 font-semibold text-gray-800">
          Confidence Threshold
        </h4>
        <p className="text-gray-600">
          Only returns predictions with confidence above 30%. Below this
          threshold, the transaction remains uncategorized.
        </p>
      </div>
    </div>
  );
}
