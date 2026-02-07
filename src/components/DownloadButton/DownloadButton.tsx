import { useState } from 'react';
import type { Transaction } from '@/types';
import { exportTransactions, type ExportFormat } from '@/utils/fileExporter';

export interface DownloadButtonProps {
  transactions: Transaction[];
  disabled?: boolean;
}

export function DownloadButton({
  transactions,
  disabled = false,
}: DownloadButtonProps): React.JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const handleExport = (format: ExportFormat) => {
    setIsExporting(true);
    setShowFormatMenu(false);

    try {
      exportTransactions(transactions, {
        format,
        fileName: `expense-categorizer-${new Date().toISOString().split('T')[0] ?? 'export'}`,
        includeMetadata: false,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => {
          setShowFormatMenu(!showFormatMenu);
        }}
        disabled={disabled || isExporting || transactions.length === 0}
        className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-50"
      >
        <svg
          className="-ml-1 mr-2 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        {isExporting ? 'Exporting...' : 'Download Results'}
      </button>

      {showFormatMenu && !disabled && !isExporting && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
          <div className="py-1">
            <button
              onClick={() => {
                handleExport('xlsx');
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Download as Excel (.xlsx)
            </button>
            <button
              onClick={() => {
                handleExport('csv');
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Download as CSV (.csv)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
