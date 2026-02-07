import { useState } from 'react';

interface UploadedFileInfo {
  id: string;
  name: string;
  uploadedAt: Date;
  transactionCount: number;
  duplicateCount: number;
}

export interface FileListProps {
  files: UploadedFileInfo[];
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
}

/**
 * Component that displays a list of uploaded files with management options.
 * Shows file details (name, transaction count, upload date) and allows
 * removing individual files or clearing all files at once.
 */
export function FileList({ files, onRemoveFile, onClearAll }: FileListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (files.length === 0) {
    return null;
  }

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'csv') return '📄';
    if (extension === 'xlsx' || extension === 'xls') return '📊';
    return '📁';
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <h3 className="font-semibold text-gray-800">
          Uploaded Files ({files.length})
        </h3>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* File List */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="divide-y divide-gray-100">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-start justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0" role="img" aria-label="file icon">
                    {getFileIcon(file.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>
                        {file.transactionCount}{' '}
                        {file.transactionCount === 1
                          ? 'transaction'
                          : 'transactions'}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">
                        {formatDate(file.uploadedAt)}
                      </span>
                    </div>
                    {file.duplicateCount > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          {file.duplicateCount}{' '}
                          {file.duplicateCount === 1
                            ? 'duplicate'
                            : 'duplicates'}{' '}
                          skipped
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onRemoveFile(file.id);
                  }}
                  className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                  aria-label={`Remove ${file.name}`}
                  title="Remove file"
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
            ))}
          </div>

          {/* Clear All Button */}
          {files.length > 1 && (
            <div className="border-t border-gray-200 px-4 py-3">
              <button
                onClick={onClearAll}
                className="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Clear All Files
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
