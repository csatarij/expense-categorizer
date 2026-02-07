import { useEffect } from 'react';

export interface MergeSummaryProps {
  fileName: string;
  addedCount: number;
  duplicateCount: number;
  onDismiss: () => void;
}

/**
 * Toast notification component that displays merge summary after file upload.
 * Shows how many transactions were added and how many duplicates were skipped.
 * Auto-dismisses after 5 seconds.
 */
export function MergeSummary({
  fileName,
  addedCount,
  duplicateCount,
  onDismiss,
}: MergeSummaryProps) {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <div className="fixed right-4 top-4 z-50 animate-slide-in-right">
      <div className="flex min-w-[320px] max-w-md items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 shadow-lg">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-green-800">File Uploaded</p>
          <p className="mt-1 text-sm text-green-700">
            <span className="font-medium">{fileName}</span>
          </p>
          <div className="mt-2 space-y-1 text-sm text-green-600">
            <p>
              ✓ Added <span className="font-semibold">{addedCount}</span>{' '}
              {addedCount === 1 ? 'transaction' : 'transactions'}
            </p>
            {duplicateCount > 0 && (
              <p>
                ⚠ Skipped <span className="font-semibold">{duplicateCount}</span>{' '}
                {duplicateCount === 1 ? 'duplicate' : 'duplicates'}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Dismiss notification"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
