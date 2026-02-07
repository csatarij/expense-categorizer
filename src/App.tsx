import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { TransactionTable } from '@/components/TransactionTable';
import { DownloadButton } from '@/components/DownloadButton';
import { parseFile, FileParserError } from '@/utils/fileParser';
import type { ParsedFile, Transaction } from '@/types';

function App() {
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (files: File | File[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const fileArray = Array.isArray(files) ? files : [files];
      const allTransactions: Transaction[] = [];

      // Process each file
      for (const file of fileArray) {
        const parsed = await parseFile(file);

        // Convert parsed data to Transaction objects
        const fileTransactions: Transaction[] = parsed.data.map((row, index) => {
          const { detectedColumns } = parsed;

          // Helper to safely convert cell value to string
          const cellToString = (value: unknown): string => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            return '';
          };

          // Extract amount (handle debit/credit columns if no amount column)
          let amount = 0;
          if (detectedColumns.amount) {
            amount = parseFloat(cellToString(row[detectedColumns.amount])) || 0;
          } else if (detectedColumns.debit || detectedColumns.credit) {
            const debit = parseFloat(cellToString(row[detectedColumns.debit ?? ''])) || 0;
            const credit = parseFloat(cellToString(row[detectedColumns.credit ?? ''])) || 0;
            amount = credit - debit;
          }

          // Extract currency (default to USD if not found)
          const currency = detectedColumns.currency
            ? cellToString(row[detectedColumns.currency]).toUpperCase() || 'USD'
            : 'USD';

          // Parse date
          const dateStr = detectedColumns.date ? cellToString(row[detectedColumns.date]) : '';
          const date = new Date(dateStr);

          return {
            id: `${file.name}-${String(index)}`,
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
              rowIndex: index,
              rawData: row,
            },
          };
        });

        allTransactions.push(...fileTransactions);
      }

      // Set the last parsed file info (for display purposes)
      if (fileArray.length === 1 && fileArray[0]) {
        const parsed = await parseFile(fileArray[0]);
        setParsedFile(parsed);
      } else {
        setParsedFile(null);
      }

      setTransactions(allTransactions);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold">Expense Categorizer</h1>
          <p className="mt-1 text-primary-100">
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
            <FileUpload
              onFileUpload={(files) => void handleFileUpload(files)}
              multiple={true}
            />
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}
            {isLoading && (
              <div className="mt-4 text-center text-gray-600">
                Processing files...
              </div>
            )}

            {transactions.length > 0 && (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {transactions.length} Transactions
                    </h3>
                    {parsedFile && (
                      <span className="text-sm text-gray-500">
                        From: {parsedFile.fileName}
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
