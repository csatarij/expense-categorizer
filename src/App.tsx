import { useState, useCallback } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { TransactionTable } from '@/components/TransactionTable';
import { DownloadButton } from '@/components/DownloadButton';
import { MergeSummary } from '@/components/MergeSummary';
import { FileList } from '@/components/FileList';
import { parseFile, FileParserError } from '@/utils/fileParser';
import { mergeTransactionsWithMetadata } from '@/utils/fileExporter';
import { importCategoryFromFile } from '@/utils/categoryValidator';
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

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseFile(file);

      // Generate unique file ID using timestamp
      const fileId = `${file.name}-${String(Date.now())}`;

      // Convert parsed data to Transaction objects
      const newTransactions: Transaction[] = parsed.data.map((row, index) => {
        const { detectedColumns } = parsed;

        // Helper to safely convert cell value to string
        const cellToString = (value: unknown): string => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return value;
          if (typeof value === 'number' || typeof value === 'boolean')
            return String(value);
          return '';
        };

        // Extract amount (handle debit/credit columns if no amount column)
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

        // Extract currency (default to USD if not found)
        const currency = detectedColumns.currency
          ? cellToString(row[detectedColumns.currency]).toUpperCase() || 'USD'
          : 'USD';

        // Parse date
        const dateStr = detectedColumns.date
          ? cellToString(row[detectedColumns.date])
          : '';
        const date = new Date(dateStr);

        // Import and validate categories from file if present
        const importedCategories = importCategoryFromFile(
          row[detectedColumns.category ?? ''],
          row[detectedColumns.subcategory ?? '']
        );

        const merchant = detectedColumns.merchant
          ? cellToString(row[detectedColumns.merchant])
          : undefined;

        const baseTransaction: {
          id: string;
          date: Date;
          description: string;
          amount: number;
          currency: string;
          category?: string;
          subcategory?: string;
          originalCategory?: string;
          confidence?: number;
          isManuallyEdited: boolean;
          metadata: TransactionMetadata;
        } = {
          id: `${fileId}-${String(index)}`,
          date: isNaN(date.getTime()) ? new Date() : date,
          description: detectedColumns.description
            ? cellToString(row[detectedColumns.description])
            : '',
          amount,
          currency,
          isManuallyEdited: false,
          metadata: {
            source: 'upload' as const,
            fileName: file.name,
            fileId,
            rowIndex: index,
            rawData: row,
          },
        };

        if (merchant) {
          (baseTransaction as Transaction).merchant = merchant;
        }

        return {
          ...baseTransaction,
          ...importedCategories,
          ...(importedCategories.category && {
            originalCategory: importedCategories.category,
          }),
        };
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold">Expense Categorizer</h1>
          <p className="text-primary-100 mt-1">
            AI-powered expense tracking with progressive ML categorization
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
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
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {transactions.length} Transactions
                  </h3>
                  {uploadedFiles.length > 0 && (
                    <span className="text-sm text-gray-500">
                      From {uploadedFiles.length}{' '}
                      {uploadedFiles.length === 1 ? 'file' : 'files'}
                    </span>
                  )}
                </div>
                <DownloadButton transactions={transactions} />
              </div>
              <TransactionTable
                transactions={transactions}
                onCategoryChange={handleCategoryChange}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
