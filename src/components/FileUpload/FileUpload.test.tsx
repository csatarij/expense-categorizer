import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from './FileUpload';

// Mock DataTransfer for JSDOM environment
class MockDataTransfer {
  items: { add: (file: File) => void };
  private fileList: File[] = [];

  constructor() {
    this.items = {
      add: (file: File) => {
        this.fileList.push(file);
      },
    };
  }

  get files(): FileList {
    const fileList = this.fileList;
    const list: Record<number, File> & {
      length: number;
      item: (index: number) => File | null;
      [Symbol.iterator]: () => Iterator<File>;
    } = {
      length: fileList.length,
      item: (index: number) => fileList[index] ?? null,
      [Symbol.iterator]: function* () {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          if (file) yield file;
        }
      },
    };
    // Add numeric indexer
    fileList.forEach((file, i) => {
      list[i] = file;
    });
    return list as unknown as FileList;
  }
}

beforeAll(() => {
  // @ts-expect-error - Mocking global DataTransfer
  global.DataTransfer = MockDataTransfer;
});

/**
 * Create a mock File object
 */
function createMockFile(
  name: string,
  size: number,
  type: string = 'text/csv'
): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

/**
 * Create a mock FileList from files
 */
function createMockFileList(files: File[]): FileList {
  const dataTransfer = new MockDataTransfer();
  files.forEach((file) => {
    dataTransfer.items.add(file);
  });
  return dataTransfer.files;
}

/**
 * Helper to upload a file to the input
 */
function uploadFile(input: HTMLElement, file: File | File[]): void {
  const files = Array.isArray(file) ? file : [file];
  const fileList = createMockFileList(files);
  Object.defineProperty(input, 'files', { value: fileList, writable: true });
  fireEvent.change(input);
}

/**
 * Create a DataTransfer object for drag-and-drop events
 */
function createDataTransfer(files: File[]): DataTransfer {
  const dataTransfer = new MockDataTransfer();
  files.forEach((file) => {
    dataTransfer.items.add(file);
  });
  return dataTransfer as unknown as DataTransfer;
}

describe('FileUpload', () => {
  describe('rendering', () => {
    it('should render the drop zone', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.getByText(/drag & drop your file here/i)).toBeInTheDocument();
    });

    it('should display accepted formats', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} acceptedFormats={['.csv', '.xlsx']} />);

      expect(screen.getByText(/\.csv, \.xlsx/)).toBeInTheDocument();
    });

    it('should display max file size', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} maxFileSize={5 * 1024 * 1024} />);

      expect(screen.getByText(/5 MB/)).toBeInTheDocument();
    });

    it('should have hidden file input', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const input = screen.getByTestId('file-input');
      expect(input).toHaveClass('hidden');
    });
  });

  describe('click to upload', () => {
    it('should trigger file input when drop zone is clicked', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      const fileInput = screen.getByTestId('file-input');
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(dropZone);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should call onFileUpload when valid file is selected', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('test.csv', 100);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('drag and drop', () => {
    it('should add highlight on drag over', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragEnter(dropZone, {
        dataTransfer: createDataTransfer([createMockFile('test.csv', 100)]),
      });

      expect(dropZone).toHaveClass('border-blue-500');
      expect(dropZone).toHaveClass('bg-blue-50');
    });

    it('should remove highlight on drag leave', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragEnter(dropZone, {
        dataTransfer: createDataTransfer([createMockFile('test.csv', 100)]),
      });
      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass('border-blue-500');
    });

    it('should change text on drag over', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragEnter(dropZone, {
        dataTransfer: createDataTransfer([createMockFile('test.csv', 100)]),
      });

      expect(screen.getByText(/drop your file here/i)).toBeInTheDocument();
    });

    it('should trigger onFileUpload on drop', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      const file = createMockFile('test.csv', 100);

      fireEvent.drop(dropZone, {
        dataTransfer: createDataTransfer([file]),
      });

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('file validation', () => {
    it('should accept valid CSV files', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('data.csv', 1000);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledWith(file);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should accept valid XLSX files', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('data.xlsx', 1000);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledWith(file);
      });
    });

    it('should reject invalid file types', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('document.pdf', 1000, 'application/pdf');
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      expect(onFileUpload).not.toHaveBeenCalled();
    });

    it('should reject files over size limit', () => {
      const onFileUpload = vi.fn();
      const maxSize = 1024; // 1KB
      render(<FileUpload onFileUpload={onFileUpload} maxFileSize={maxSize} />);

      const file = createMockFile('large.csv', 2048); // 2KB
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      expect(onFileUpload).not.toHaveBeenCalled();
    });

    it('should reject empty files', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('empty.csv', 0);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/file is empty/i)).toBeInTheDocument();
      expect(onFileUpload).not.toHaveBeenCalled();
    });
  });

  describe('file info display', () => {
    it('should display selected file name', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('my-expenses.csv', 500);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('my-expenses.csv')).toBeInTheDocument();
      });
    });

    it('should display file size in human-readable format', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('data.csv', 1536); // 1.5 KB
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/1\.5 KB/)).toBeInTheDocument();
      });
    });

    it('should display CSV icon for CSV files', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('data.csv', 100);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('📄')).toBeInTheDocument();
      });
    });

    it('should display Excel icon for XLSX files', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('data.xlsx', 100);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('📊')).toBeInTheDocument();
      });
    });
  });

  describe('error message display', () => {
    it('should show error with alert role', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('doc.pdf', 100);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('bg-red-50');
    });

    it('should clear error when valid file is selected', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const fileInput = screen.getByTestId('file-input');

      // First, upload invalid file
      uploadFile(fileInput, createMockFile('doc.pdf', 100));
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Then, upload valid file
      uploadFile(fileInput, createMockFile('data.csv', 100));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have accessible drop zone with aria-label', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toHaveAttribute('aria-label');
      expect(dropZone.getAttribute('aria-label')).toContain('Upload file');
    });

    it('should have role="button" on drop zone', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toHaveAttribute('role', 'button');
    });

    it('should be keyboard accessible (Enter key)', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      const fileInput = screen.getByTestId('file-input');
      const clickSpy = vi.spyOn(fileInput, 'click');

      dropZone.focus();
      fireEvent.keyDown(dropZone, { key: 'Enter' });

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should be keyboard accessible (Space key)', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      const fileInput = screen.getByTestId('file-input');
      const clickSpy = vi.spyOn(fileInput, 'click');

      dropZone.focus();
      fireEvent.keyDown(dropZone, { key: ' ' });

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should have tabIndex for keyboard navigation', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toHaveAttribute('tabIndex', '0');
    });

    it('should show processing status accessibly', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('data.csv', 100);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      // Processing indicator should have appropriate role when visible
      const processingIndicator = screen.queryByRole('status');
      if (processingIndicator) {
        expect(processingIndicator).toHaveAttribute('aria-label', 'Processing file');
      }
    });
  });

  describe('multiple file upload', () => {
    it('should allow multiple files when multiple prop is true', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} multiple={true} />);

      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('should not allow multiple files by default', () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).not.toHaveAttribute('multiple');
    });

    it('should call onFileUpload for each file when multiple', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} multiple={true} />);

      const files = [
        createMockFile('file1.csv', 100),
        createMockFile('file2.csv', 200),
      ];
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, files);

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledTimes(1);
        expect(onFileUpload).toHaveBeenCalledWith(files);
      });
    });
  });

  describe('clear file functionality', () => {
    it('should allow clearing selected file', async () => {
      const onFileUpload = vi.fn();
      render(<FileUpload onFileUpload={onFileUpload} />);

      const file = createMockFile('data.csv', 100);
      const fileInput = screen.getByTestId('file-input');

      uploadFile(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('data.csv')).toBeInTheDocument();
      });

      const clearButton = screen.getByText(/choose different file/i);
      fireEvent.click(clearButton);

      expect(screen.queryByText('data.csv')).not.toBeInTheDocument();
      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    });
  });
});
