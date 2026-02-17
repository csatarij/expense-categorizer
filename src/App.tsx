import { useState, useCallback, useMemo } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { TransactionTable } from '@/components/TransactionTable';
import { DownloadButton } from '@/components/DownloadButton';
import { MergeSummary } from '@/components/MergeSummary';
import { FileList } from '@/components/FileList';
import { CategorizationControls } from '@/components/CategorizationControls';
import { FilterPanel } from '@/components/FilterPanel/FilterPanel';
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

function App() {
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

      // Merge with existing transactions
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

      // Show merge summary
      setMergeSummary({
        fileName: file.name,
        addedCount: added.length,
        duplicateCount: duplicates.length,
      });

      // Auto-dismiss after 5 seconds
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
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Welcome to Expense Categorizer
          </h2>
          <p className="text-gray-600">
            Upload your bank statements to automatically categorize expenses
            using machine learning.
          </p>
          <FileUpload onFileUpload={(file) => void handleFileUpload(file)} />

          {mergeSummary && (
            <MergeSummary
              fileName={mergeSummary.fileName}
              addedCount={mergeSummary.addedCount}
              duplicateCount={mergeSummary.duplicateCount}
              onDismiss={() => {
                setMergeSummary(null);
              }}
            />
          )}

          {uploadedFiles.length > 0 && (
            <FileList
              files={uploadedFiles}
              onRemoveFile={handleRemoveFile}
              onClearAll={handleClearAll}
            />
          )}

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}
          {isLoading && (
            <div className="mt-4 text-center text-gray-600">
              Processing file...
            </div>
          )}

          {transactions.length > 0 && (
            <div className="mt-6">
              <CategorizationControls
                transactions={transactions}
                onCategorize={setTransactions}
              />
            </div>
          )}

          {transactions.length > 0 && (
            <div className="mt-6">
              <FilterPanel
                availableSources={availableSources}
                values={filterValues}
                onChange={setFilterValues}
              />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {filteredAndSortedTransactions.length}{' '}
                    {filteredAndSortedTransactions.length ===
                    transactions.length
                      ? 'Transactions'
                      : `of ${String(transactions.length)} Transactions`}
                  </h3>
                  {filteredAndSortedTransactions.length !==
                    transactions.length && (
                    <span className="text-sm text-gray-500">
                      Filters applied
                    </span>
                  )}
                  {uploadedFiles.length > 0 &&
                    filteredAndSortedTransactions.length ===
                      transactions.length && (
                      <span className="text-sm text-gray-500">
                        From {uploadedFiles.length}{' '}
                        {uploadedFiles.length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                </div>
                <DownloadButton transactions={transactions} />
              </div>
              <TransactionTable
                transactions={filteredAndSortedTransactions}
                onCategoryChange={handleCategoryChange}
                onNotesChange={handleNotesChange}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
