import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownloadButton } from './DownloadButton';
import type { Transaction } from '@/types';
import * as fileExporter from '@/utils/fileExporter';

// Mock the file exporter
vi.mock('@/utils/fileExporter', () => ({
  exportTransactions: vi.fn(),
}));

describe('DownloadButton', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: new Date('2024-01-01'),
      entity: 'Test Transaction',
      amount: -50,
      currency: 'USD',
      isManuallyEdited: false,
    },
  ];

  it('renders download button', () => {
    render(<DownloadButton transactions={mockTransactions} />);

    expect(screen.getByText('Download Results')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<DownloadButton transactions={mockTransactions} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables button when transactions array is empty', () => {
    render(<DownloadButton transactions={[]} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows format menu when clicked', () => {
    render(<DownloadButton transactions={mockTransactions} />);

    const button = screen.getByText('Download Results');
    fireEvent.click(button);

    expect(screen.getByText('Download as Excel (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('Download as CSV (.csv)')).toBeInTheDocument();
  });

  it('exports as XLSX when Excel option is clicked', () => {
    render(<DownloadButton transactions={mockTransactions} />);

    const button = screen.getByText('Download Results');
    fireEvent.click(button);

    const xlsxOption = screen.getByText('Download as Excel (.xlsx)');
    fireEvent.click(xlsxOption);

    expect(fileExporter.exportTransactions).toHaveBeenCalledWith(
      mockTransactions,
      expect.objectContaining({
        format: 'xlsx',
      })
    );
  });

  it('exports as CSV when CSV option is clicked', () => {
    render(<DownloadButton transactions={mockTransactions} />);

    const button = screen.getByText('Download Results');
    fireEvent.click(button);

    const csvOption = screen.getByText('Download as CSV (.csv)');
    fireEvent.click(csvOption);

    expect(fileExporter.exportTransactions).toHaveBeenCalledWith(
      mockTransactions,
      expect.objectContaining({
        format: 'csv',
      })
    );
  });

  it('closes menu after export', () => {
    render(<DownloadButton transactions={mockTransactions} />);

    const button = screen.getByText('Download Results');
    fireEvent.click(button);

    const xlsxOption = screen.getByText('Download as Excel (.xlsx)');
    fireEvent.click(xlsxOption);

    expect(screen.queryByText('Download as Excel (.xlsx)')).not.toBeInTheDocument();
  });
});
