import { useState, useCallback, useMemo } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { TransactionTable } from '@/components/TransactionTable';
import { DownloadButton } from '@/components/DownloadButton';
import { MergeSummary } from '@/components/MergeSummary';
import { FileList } from '@/components/FileList';
import { CategorizationControls } from '@/components/CategorizationControls';
import { FilterPanel } from '@/components/FilterPanel/FilterPanel';
import { MLTransparencyTab } from '@/components/MLTransparencyTab';
import type { FilterValues } from '@/components/FilterPanel/FilterPanel';
import { parseFile, FileParserError } from '@/utils/fileParser';
import { mergeTransactionsWithMetadata } from '@/utils/fileExporter';
import { parseDate } from '@/utils/dateParser';
import { findBestMatch } from '@/utils/categoryMatcher';
import type { Transaction, TransactionMetadata } from '@/types';

interface UploadedFileInfo {
  id: string;
  name: string;
  uploadedAt: Date;
  transactionCount: number;
  duplicateCount: number;
}

type AppTab = 'transactions' | 'ml-insights';

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [mergeSummary, setMergeSummary] = useState<{
    fileName: string;
    addedCount: number;
    duplicateCount: number;
  } | null>(null);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterValues, setFilterValues] = useState<FilterValues>({
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    searchText: '',
    selectedCategories: new Set(),
    selectedSubcategories: new Set(),
    selectedSources: new Set(),
  });

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseFile(file);
      const fileId = `${file.name}-${String(Date.now())}`;

      const newTransactions: Transaction[] = parsed.data.map((row, index) => {
        const { detectedColumns } = parsed;

        const cellToString = (value: unknown): string => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return value;
          if (typeof value === 'number' || typeof value === 'boolean')
            return String(value);
          return '';
        };

        let amount = 0;
        if (detectedColumns.amount) {
          amount = parseFloat(cellToString(row[detectedColumns.amount])) || 0;
        } else if (detectedColumns.debit || detectedColumns.credit) {
          const debit =
            parseFloat(cellToString(row[detectedColumns.debit ?? ''])) || 0;
          const credit =
            parseFloat(cellToString(row[detectedColumns.credit ?? ''])) || 0;
          amount = credit - debit;
        }

        const currency = detectedColumns.currency
          ? cellToString(row[detectedColumns.currency]).toUpperCase() || 'CHF'
          : 'CHF';

        const dateStr = detectedColumns.date
          ? cellToString(row[detectedColumns.date])
          : '';
        const date = parseDate(dateStr);

        const notes = detectedColumns.notes
          ? cellToString(row[detectedColumns.notes])
          : undefined;

        const cellCategory = detectedColumns.category
          ? cellToString(row[detectedColumns.category])
          : undefined;
        const cellSubcategory = detectedColumns.subcategory
          ? cellToString(row[detectedColumns.subcategory])
          : undefined;

        let transactionCategory = undefined;
        let transactionSubcategory = undefined;

        if (cellCategory) {
          const match = findBestMatch(cellCategory, cellSubcategory || '');

          if (match.confidence > 0.5) {
            transactionCategory = match.category;
            transactionSubcategory =
              match.subcategory && match.subcategory !== ''
                ? match.subcategory
                : undefined;
          }
        }

        const baseTransaction = {
          id: `${fileId}-${String(index)}`,
          date: isNaN(date.getTime()) ? new Date() : date,
          entity: detectedColumns.entity
            ? cellToString(row[detectedColumns.entity])
            : '',
          amount,
          currency,
          category: transactionCategory,
          subcategory: transactionSubcategory,
          notes,
          isManuallyEdited: false,
          metadata: {
            source: 'upload' as const,
            fileName: file.name,
            fileId,
            rowIndex: index,
            rawData: row,
          },
        } as unknown as {
          id: string;
          date: Date;
          entity: string;
          notes?: string;
          amount: number;
          currency: string;
          category?: string;
          subcategory?: string;
          originalCategory?: string;
          confidence?: number;
          isManuallyEdited: boolean;
          metadata: TransactionMetadata;
        };

        if (notes) {
          baseTransaction.notes = notes;
        }

        return baseTransaction;
      });

      const { merged, duplicates, added } = mergeTransactionsWithMetadata(
        transactions,
        newTransactions
      );

      setTransactions(merged);
      setUploadedFiles((prev) => [
        ...prev,
        {
          id: fileId,
          name: file.name,
          uploadedAt: new Date(),
          transactionCount: added.length,
          duplicateCount: duplicates.length,
        },
      ]);

      setMergeSummary({
        fileName: file.name,
        addedCount: added.length,
        duplicateCount: duplicates.length,
      });

      setTimeout(() => {
        setMergeSummary(null);
      }, 5000);
    } catch (err) {
      if (err instanceof FileParserError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while parsing the file');
      }
      console.error('File parsing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (
    id: string,
    category: string,
    subcategory?: string
  ) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              category,
              ...(subcategory !== undefined ? { subcategory } : {}),
              isManuallyEdited: true,
            }
          : t
      )
    );
  };

  const handleNotesChange = (id: string, notes: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              notes,
            }
          : t
      )
    );
  };

  const handleRemoveFile = useCallback((fileId: string) => {
    setTransactions((prev) =>
      prev.filter((t) => t.metadata?.fileId !== fileId)
    );
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Remove all uploaded files and transactions?')) {
      setTransactions([]);
      setUploadedFiles([]);
    }
  }, []);

  const handleSort = useCallback(
    (column: string, direction: 'asc' | 'desc') => {
      setSortColumn(column);
      setSortDirection(direction);
    },
    []
  );

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (filterValues.searchText) {
      const searchLower = filterValues.searchText.toLowerCase();
      result = result.filter(
        (t) =>
          t.entity.toLowerCase().includes(searchLower) ||
          (t.notes && t.notes.toLowerCase().includes(searchLower))
      );
    }

    if (filterValues.dateRange.start || filterValues.dateRange.end) {
      result = result.filter((t) => {
        const date = t.date;
        if (
          filterValues.dateRange.start &&
          date < filterValues.dateRange.start
        ) {
          return false;
        }
        if (filterValues.dateRange.end && date > filterValues.dateRange.end) {
          return false;
        }
        return true;
      });
    }

    if (
      filterValues.amountRange.min !== null ||
      filterValues.amountRange.max !== null
    ) {
      result = result.filter((t) => {
        const min = filterValues.amountRange.min;
        const max = filterValues.amountRange.max;
        if (min !== null && t.amount < min) {
          return false;
        }
        if (max !== null && t.amount > max) {
          return false;
        }
        return true;
      });
    }

    if (filterValues.selectedCategories.size > 0) {
      result = result.filter(
        (t) => t.category && filterValues.selectedCategories.has(t.category)
      );
    }

    if (filterValues.selectedSubcategories.size > 0) {
      result = result.filter(
        (t) =>
          t.subcategory && filterValues.selectedSubcategories.has(t.subcategory)
      );
    }

    if (filterValues.selectedSources.size > 0) {
      result = result.filter(
        (t) =>
          t.metadata?.fileName &&
          filterValues.selectedSources.has(t.metadata.fileName)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;

      if (sortColumn === 'date') {
        comparison = a.date.getTime() - b.date.getTime();
      } else if (sortColumn === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortColumn === 'entity') {
        comparison = a.entity.localeCompare(b.entity);
      } else if (sortColumn === 'notes') {
        comparison = (a.notes || '').localeCompare(b.notes || '');
      } else if (sortColumn === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      } else if (sortColumn === 'subcategory') {
        comparison = (a.subcategory || '').localeCompare(b.subcategory || '');
      } else if (sortColumn === 'confidence') {
        comparison = (a.confidence || 0) - (b.confidence || 0);
      } else if (sortColumn === 'source') {
        comparison = (a.metadata?.fileName || '').localeCompare(
          b.metadata?.fileName || ''
        );
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, filterValues, sortColumn, sortDirection]);

  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    transactions.forEach((t) => {
      if (t.metadata?.fileName) {
        sources.add(t.metadata.fileName);
      }
    });
    return Array.from(sources).sort();
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white shadow-lg">
        <div className="mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Expense Categorizer</h1>
          <p className="text-primary-100 mt-1">
            AI-powered expense tracking with progressive ML categorization
          </p>
        </div>
      </header>
      <main className="mx-auto px-4 py-8">
        <div className="rounded-lg bg-white shadow">
          <TabNavigation activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-6">
            {activeTab === 'transactions' ? (
              <TransactionsView
                transactions={transactions}
                uploadedFiles={uploadedFiles}
                isLoading={isLoading}
                error={error}
                mergeSummaryProp={mergeSummary}
                filterValues={filterValues}
                filteredAndSortedTransactions={filteredAndSortedTransactions}
                availableSources={availableSources}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onFileUpload={handleFileUpload}
                onRemoveFile={handleRemoveFile}
                onClearAll={handleClearAll}
                onCategorize={setTransactions}
                onCategoryChange={handleCategoryChange}
                onNotesChange={handleNotesChange}
                onSort={handleSort}
                onFilterChange={setFilterValues}
                onMergeSummaryDismiss={() => { setMergeSummary(null); }}
              />
            ) : (
              <MLTransparencyTab transactions={transactions} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function TabNavigation({
  activeTab,
  onChange,
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8 px-6">
        <TabButton
          active={activeTab === 'transactions'}
          onClick={() => { onChange('transactions'); }}
        >
          Transactions
        </TabButton>
        <TabButton
          active={activeTab === 'ml-insights'}
          onClick={() => { onChange('ml-insights'); }}
        >
          ML Insights
        </TabButton>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
        active
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

interface TransactionsViewProps {
  transactions: Transaction[];
  uploadedFiles: UploadedFileInfo[];
  isLoading: boolean;
  error: string | null;
  mergeSummaryProp: {
    fileName: string;
    addedCount: number;
    duplicateCount: number;
  } | null;
  filterValues: FilterValues;
  filteredAndSortedTransactions: Transaction[];
  availableSources: string[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onFileUpload: (file: File) => Promise<void>;
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
  onCategorize: (updatedTransactions: Transaction[]) => void;
  onCategoryChange: (
    id: string,
    category: string,
    subcategory?: string
  ) => void;
  onNotesChange: (id: string, notes: string) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onFilterChange: React.Dispatch<React.SetStateAction<FilterValues>>;
  onMergeSummaryDismiss: () => void;
}

function TransactionsView({
  transactions,
  uploadedFiles,
  isLoading,
  error,
  mergeSummaryProp,
  filterValues,
  filteredAndSortedTransactions,
  availableSources,
  sortColumn,
  sortDirection,
  onFileUpload,
  onRemoveFile,
  onClearAll,
  onCategorize,
  onCategoryChange,
  onNotesChange,
  onSort,
  onFilterChange,
  onMergeSummaryDismiss,
}: TransactionsViewProps) {
  return (
    <>
      {uploadedFiles.length === 0 && <UserJourneyGuide />}

      <FileUpload
        onFileUpload={(file) => {
          void onFileUpload(file);
        }}
      />

      {mergeSummaryProp && (
        <MergeSummary
          fileName={mergeSummaryProp.fileName}
          addedCount={mergeSummaryProp.addedCount}
          duplicateCount={mergeSummaryProp.duplicateCount}
          onDismiss={onMergeSummaryDismiss}
        />
      )}

      {uploadedFiles.length > 0 && (
        <FileList
          files={uploadedFiles}
          onRemoveFile={onRemoveFile}
          onClearAll={onClearAll}
        />
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="mt-4 text-center text-gray-600">Processing file...</div>
      )}

      {transactions.length > 0 && (
        <div className="mt-6">
          <CategorizationControls
            transactions={transactions}
            onCategorize={onCategorize}
          />
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-6">
          <FilterPanel
            availableSources={availableSources}
            values={filterValues}
            onChange={onFilterChange}
          />
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {filteredAndSortedTransactions.length}{' '}
                {filteredAndSortedTransactions.length === transactions.length
                  ? 'Transactions'
                  : `of ${String(transactions.length)} Transactions`}
              </h3>
              {filteredAndSortedTransactions.length !== transactions.length && (
                <span className="text-sm text-gray-500">Filters applied</span>
              )}
              {uploadedFiles.length > 0 &&
                filteredAndSortedTransactions.length ===
                  transactions.length && (
                  <span className="text-sm text-gray-500">
                    {' '}
                    From {uploadedFiles.length}{' '}
                    {uploadedFiles.length === 1 ? 'file' : 'files'}
                  </span>
                )}
            </div>
            <DownloadButton transactions={transactions} />
          </div>
          <TransactionTable
            transactions={filteredAndSortedTransactions}
            onCategoryChange={onCategoryChange}
            onNotesChange={onNotesChange}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
      )}
    </>
  );
}

function UserJourneyGuide() {
  const steps = [
    {
      number: 1,
      title: 'Upload Your Bank Statement',
      description:
        'Drag and drop or select a CSV or XLSX file exported from your bank. You can upload multiple files — duplicates are detected automatically.',
      detail: null,
    },
    {
      number: 2,
      title: 'Run Auto-Categorization',
      description:
        'Choose which AI phases to apply and click "Categorize Now". The engine works through three progressive phases:',
      detail: (
        <ol className="mt-2 space-y-1 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="font-semibold text-primary-600">Phase 1</span>
            <span>
              <span className="font-medium">Exact Match</span> — instantly
              recognises transactions you have categorised before (95%+
              confidence).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-primary-600">Phase 2</span>
            <span>
              <span className="font-medium">Pattern Matching</span> — uses
              keyword rules, fuzzy matching, and TF-IDF similarity to handle
              similar or slightly different descriptions.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-primary-600">Phase 3</span>
            <span>
              <span className="font-medium">ML Neural Network</span> — a
              TensorFlow.js model trained on your own data for the highest
              accuracy on new merchants. Train it once you have enough
              categorised transactions.
            </span>
          </li>
        </ol>
      ),
    },
    {
      number: 3,
      title: 'Review & Fine-tune',
      description:
        'Check the transaction table, filter by date, amount, or category, and correct any categories with a single click. Your edits are used to improve future runs.',
      detail: null,
    },
    {
      number: 4,
      title: 'Export Results',
      description:
        'Download the fully categorised data as a spreadsheet. Visit the ML Insights tab at any time to see how the model made its decisions.',
      detail: null,
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="mb-1 text-xl font-semibold text-gray-800">
        Welcome to Expense Categorizer
      </h2>
      <p className="mb-6 text-gray-500 text-sm">
        Follow these steps to categorise your expenses with progressive AI.
      </p>
      <ol className="space-y-4">
        {steps.map((step) => (
          <li key={step.number} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {step.number}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800">{step.title}</h3>
              <p className="mt-0.5 text-sm text-gray-600">{step.description}</p>
              {step.detail}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default App;
