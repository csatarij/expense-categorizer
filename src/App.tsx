import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { parseFile, FileParserError } from '@/utils/fileParser';
import type { ParsedFile, Transaction } from '@/types';

function App() {
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);

      // Convert parsed data to Transaction objects
      const newTransactions: Transaction[] = parsed.data.map((row, index) => {
        const { detectedColumns } = parsed;
        
        // Extract amount (handle debit/credit columns if no amount column)
        let amount = 0;
        if (detectedColumns.amount) {
          amount = parseFloat(String(row[detectedColumns.amount] || 0));
        } else if (detectedColumns.debit || detectedColumns.credit) {
          const debit = parseFloat(String(row[detectedColumns.debit ?? ''] || 0));
          const credit = parseFloat(String(row[detectedColumns.credit ?? ''] || 0));
          amount = credit - debit;
        }

        // Parse date
        const dateStr = detectedColumns.date ? String(row[detectedColumns.date] || '') : '';
        const date = new Date(dateStr);

        return {
          id: `${file.name}-${index}`,
          date: isNaN(date.getTime()) ? new Date() : date,
          description: detectedColumns.description 
            ? String(row[detectedColumns.description] || '') 
            : '',
          amount,
          isManuallyEdited: false,
          metadata: {
            source: 'upload' as const,
            fileName: file.name,
            rowIndex: index,
            rawData: row,
          },
        };
      });

      setTransactions(newTransactions);
      console.log(`Parsed ${newTransactions.length} transactions`);
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
            <FileUpload onFileUpload={handleFileUpload} />
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
              <div className="mt-6 rounded-lg bg-white p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-800">
                  Loaded {transactions.length} transactions
                </h3>
                <p className="text-sm text-gray-500">
                  From: {parsedFile?.fileName}
                </p>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

export default App;
