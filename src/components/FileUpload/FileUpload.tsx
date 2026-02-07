import { useCallback, useRef, useState } from 'react';

export interface FileUploadProps {
  onFileUpload: (file: File) => void;
  acceptedFormats?: string[];
  maxFileSize?: number;
  multiple?: boolean;
}

const DEFAULT_ACCEPTED_FORMATS = ['.csv', '.xlsx'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  const unit = sizes[i] ?? 'Bytes';
  return `${String(size)} ${unit}`;
}

/**
 * Get file type icon based on extension
 */
function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    return '📄';
  }
  if (extension === 'xlsx' || extension === 'xls') {
    return '📊';
  }
  return '📁';
}

/**
 * FileUpload component with drag-and-drop support
 */
export function FileUpload({
  onFileUpload,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  multiple = true,
}: FileUploadProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file extension
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const extension = `.${ext}`;
      if (!acceptedFormats.includes(extension)) {
        return `Invalid file type. Accepted formats: ${acceptedFormats.join(', ')}`;
      }

      // Check file size
      if (file.size > maxFileSize) {
        return `File too large. Maximum size: ${formatFileSize(maxFileSize)}`;
      }

      // Check for empty file
      if (file.size === 0) {
        return 'File is empty';
      }

      return null;
    },
    [acceptedFormats, maxFileSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setIsProcessing(true);

      // Simulate brief processing delay for UX
      setTimeout(() => {
        setIsProcessing(false);
        onFileUpload(file);
      }, 100);
    },
    [validateFile, onFileUpload]
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        if (multiple) {
          Array.from(files).forEach(handleFile);
        } else {
          const file = files[0];
          if (file) {
            handleFile(file);
          }
        }
      }
    },
    [handleFile, multiple]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        if (multiple) {
          Array.from(files).forEach(handleFile);
        } else {
          const file = files[0];
          if (file) {
            handleFile(file);
          }
        }
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFile, multiple]
  );

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
        data-testid="file-input"
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload file. Accepted formats: ${acceptedFormats.join(', ')}. Maximum size: ${formatFileSize(maxFileSize)}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-testid="drop-zone"
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[200px] p-6
          border-2 border-dashed rounded-lg
          cursor-pointer transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
              role="status"
              aria-label="Processing file"
            />
            <p className="text-sm text-gray-600">Processing...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl" role="img" aria-label="File icon">
              {getFileIcon(selectedFile.name)}
            </span>
            <div className="text-center">
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              aria-label="Clear selected file"
            >
              Choose a different file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl" role="img" aria-label="Upload icon">
              📤
            </span>
            <div className="text-center">
              <p className="font-medium text-gray-700">
                {isDragging
                  ? 'Drop your files here'
                  : 'Drag & drop your files here'}
              </p>
              <p className="text-sm text-gray-500">
                or <span className="text-blue-600">click to browse</span>{' '}
                {multiple && <span>(multiple files supported)</span>}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Accepted: {acceptedFormats.join(', ')} (max {formatFileSize(maxFileSize)})
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md"
        >
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
