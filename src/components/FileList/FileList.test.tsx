import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileList } from './FileList';

describe('FileList', () => {
  const mockFiles = [
    {
      id: 'file-1',
      name: 'january-2024.csv',
      uploadedAt: new Date('2024-01-15T10:30:00'),
      transactionCount: 45,
      duplicateCount: 3,
    },
    {
      id: 'file-2',
      name: 'february-2024.xlsx',
      uploadedAt: new Date('2024-02-07T14:20:00'),
      transactionCount: 52,
      duplicateCount: 0,
    },
  ];

  it('should not render when files array is empty', () => {
    const { container } = render(
      <FileList files={[]} onRemoveFile={vi.fn()} onClearAll={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render file count in header', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('Uploaded Files (2)')).toBeInTheDocument();
  });

  it('should render all uploaded files', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('january-2024.csv')).toBeInTheDocument();
    expect(screen.getByText('february-2024.xlsx')).toBeInTheDocument();
  });

  it('should show transaction count for each file', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('45 transactions')).toBeInTheDocument();
    expect(screen.getByText('52 transactions')).toBeInTheDocument();
  });

  it('should use singular form for single transaction', () => {
    const singleFile = [
      {
        id: 'file-1',
        name: 'test.csv',
        uploadedAt: new Date(),
        transactionCount: 1,
        duplicateCount: 0,
      },
    ];

    render(
      <FileList
        files={singleFile}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('1 transaction')).toBeInTheDocument();
  });

  it('should show duplicate warning when duplicates exist', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/3 duplicates skipped/)).toBeInTheDocument();
  });

  it('should not show duplicate warning when count is zero', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    // Check that the second file (with 0 duplicates) doesn't show warning
    const fileItems = screen.getAllByRole('img', { name: /file icon/i });
    const secondFileContainer = fileItems[1]?.closest('div');

    expect(secondFileContainer).not.toHaveTextContent('duplicates skipped');
  });

  it('should use singular form for single duplicate', () => {
    const singleDuplicate = [
      {
        id: 'file-1',
        name: 'test.csv',
        uploadedAt: new Date(),
        transactionCount: 10,
        duplicateCount: 1,
      },
    ];

    render(
      <FileList
        files={singleDuplicate}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/1 duplicate skipped/)).toBeInTheDocument();
  });

  it('should show CSV icon for CSV files', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const icons = screen.getAllByRole('img', { name: /file icon/i });
    expect(icons[0]).toHaveTextContent('📄');
  });

  it('should show Excel icon for XLSX files', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const icons = screen.getAllByRole('img', { name: /file icon/i });
    expect(icons[1]).toHaveTextContent('📊');
  });

  it('should call onRemoveFile when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemoveFile = vi.fn();
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={onRemoveFile}
        onClearAll={vi.fn()}
      />
    );

    const removeButtons = screen.getAllByRole('button', {
      name: /Remove/i,
    });
    const firstButton = removeButtons[0];
    expect(firstButton).toBeDefined();
    if (firstButton) {
      await user.click(firstButton);
    }

    expect(onRemoveFile).toHaveBeenCalledWith('file-1');
  });

  it('should show Clear All button when multiple files exist', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /Clear All Files/i })
    ).toBeInTheDocument();
  });

  it('should not show Clear All button when only one file exists', () => {
    const firstFile = mockFiles[0];
    expect(firstFile).toBeDefined();
    if (!firstFile) return;
    const singleFile = [firstFile];

    render(
      <FileList
        files={singleFile}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: /Clear All Files/i })
    ).not.toBeInTheDocument();
  });

  it('should call onClearAll when Clear All button is clicked', async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={onClearAll}
      />
    );

    const clearAllButton = screen.getByRole('button', {
      name: /Clear All Files/i,
    });
    await user.click(clearAllButton);

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('should be collapsible', async () => {
    const user = userEvent.setup();
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    // Initially expanded, files should be visible
    expect(screen.getByText('january-2024.csv')).toBeInTheDocument();

    // Click header to collapse
    const header = screen.getByRole('button', {
      name: /Uploaded Files \(2\)/i,
    });
    await user.click(header);

    // Files should be hidden
    expect(screen.queryByText('january-2024.csv')).not.toBeInTheDocument();

    // Click again to expand
    await user.click(header);

    // Files should be visible again
    expect(screen.getByText('january-2024.csv')).toBeInTheDocument();
  });

  it('should start expanded by default', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('january-2024.csv')).toBeInTheDocument();
  });

  it('should format upload date correctly', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    // Date formatting may vary by locale, just check that a date is shown
    expect(screen.getByText(/Jan.*15.*2024/i)).toBeInTheDocument();
  });

  it('should have accessible remove buttons with aria-labels', () => {
    render(
      <FileList
        files={mockFiles}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /Remove january-2024.csv/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Remove february-2024.xlsx/i })
    ).toBeInTheDocument();
  });

  it('should truncate long file names with title attribute', () => {
    const longNameFile = [
      {
        id: 'file-1',
        name: 'very-long-file-name-that-should-be-truncated-in-the-ui.csv',
        uploadedAt: new Date(),
        transactionCount: 10,
        duplicateCount: 0,
      },
    ];

    render(
      <FileList
        files={longNameFile}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const fileName = screen.getByTitle(
      'very-long-file-name-that-should-be-truncated-in-the-ui.csv'
    );
    expect(fileName).toBeInTheDocument();
  });

  it('should handle file without extension', () => {
    const noExtensionFile = [
      {
        id: 'file-1',
        name: 'noextension',
        uploadedAt: new Date(),
        transactionCount: 10,
        duplicateCount: 0,
      },
    ];

    render(
      <FileList
        files={noExtensionFile}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const icons = screen.getAllByRole('img', { name: /file icon/i });
    expect(icons[0]).toHaveTextContent('📁'); // Default folder icon
  });
});
