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

    expect(screen.getByText('All as Excel (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('All as CSV (.csv)')).toBeInTheDocument();
  });

  it('exports as XLSX when Excel option is clicked', () => {
    render(<DownloadButton transactions={mockTransactions} />);

    const button = screen.getByText('Download Results');
    fireEvent.click(button);

    const xlsxOption = screen.getByText('All as Excel (.xlsx)');
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

    const csvOption = screen.getByText('All as CSV (.csv)');
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

    const xlsxOption = screen.getByText('All as Excel (.xlsx)');
    fireEvent.click(xlsxOption);

    expect(screen.queryByText('All as Excel (.xlsx)')).not.toBeInTheDocument();
  });

  it('shows filtered export options when filteredTransactions provided', () => {
    const filtered = [mockTransactions[0] as (typeof mockTransactions)[0]];
    render(
      <DownloadButton
        transactions={mockTransactions}
        filteredTransactions={filtered}
      />
    );

    const button = screen.getByText('Download Results');
    fireEvent.click(button);

    expect(screen.getByText('Filtered (1) as Excel')).toBeInTheDocument();
    expect(screen.getByText('Filtered (1) as CSV')).toBeInTheDocument();
  });

  it('exports filtered transactions as Excel when filtered option clicked', () => {
    const filtered = [mockTransactions[0] as (typeof mockTransactions)[0]];
    render(
      <DownloadButton
        transactions={mockTransactions}
        filteredTransactions={filtered}
      />
    );

    fireEvent.click(screen.getByText('Download Results'));
    fireEvent.click(screen.getByText('Filtered (1) as Excel'));

    expect(fileExporter.exportTransactions).toHaveBeenCalledWith(
      filtered,
      expect.objectContaining({
        format: 'xlsx',
        fileName: expect.stringContaining('-filtered-'),
      })
    );
  });

  it('exports filtered transactions as CSV when filtered option clicked', () => {
    const filtered = [mockTransactions[0] as (typeof mockTransactions)[0]];
    render(
      <DownloadButton
        transactions={mockTransactions}
        filteredTransactions={filtered}
      />
    );

    fireEvent.click(screen.getByText('Download Results'));
    fireEvent.click(screen.getByText('Filtered (1) as CSV'));

    expect(fileExporter.exportTransactions).toHaveBeenCalledWith(
      filtered,
      expect.objectContaining({
        format: 'csv',
        fileName: expect.stringContaining('-filtered-'),
      })
    );
  });

  it('handles export errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(fileExporter.exportTransactions).mockImplementation(() => {
      throw new Error('Export failed');
    });

    render(<DownloadButton transactions={mockTransactions} />);

    fireEvent.click(screen.getByText('Download Results'));
    fireEvent.click(screen.getByText('All as Excel (.xlsx)'));

    expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    expect(alertSpy).toHaveBeenCalledWith(
      'Failed to export transactions. Please try again.'
    );

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('toggles format menu off when clicked again', () => {
    render(<DownloadButton transactions={mockTransactions} />);

    const button = screen.getByText('Download Results');
    fireEvent.click(button);
    expect(screen.getByText('All as Excel (.xlsx)')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByText('All as Excel (.xlsx)')).not.toBeInTheDocument();
  });
});
