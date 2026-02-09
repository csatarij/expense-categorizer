import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as fileParser from '@/utils/fileParser';
import type { ParsedFile } from '@/types';

// Helper to create a mock CSV file
function createMockFile(content: string, fileName: string): File {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], fileName, { type: 'text/csv' });
}

describe('App', () => {
  it('renders the header', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Expense Categorizer' })
    ).toBeInTheDocument();
  });

  it('renders the welcome message', () => {
    render(<App />);
    expect(
      screen.getByText(/Welcome to Expense Categorizer/)
    ).toBeInTheDocument();
  });

  it('displays description text', () => {
    render(<App />);
    expect(
      screen.getByText(/Upload your bank statements/)
    ).toBeInTheDocument();
  });

  it('handles file upload and displays transactions with currency', async () => {
    const user = userEvent.setup();
    const mockParsedFile: ParsedFile = {
      data: [
        {
          Date: '2024-01-01',
          Description: 'Test Transaction',
          Amount: '50.00',
          Currency: 'EUR',
        },
      ],
      headers: ['Date', 'Description', 'Amount', 'Currency'],
      detectedColumns: {
        date: 'Date',
        entity: 'Description',
        amount: 'Amount',
        currency: 'Currency',
      },
      fileName: 'test.csv',
      fileType: 'csv',
    };

    vi.spyOn(fileParser, 'parseFile').mockResolvedValue(mockParsedFile);

    render(<App />);

    const file = createMockFile(
      'Date,Description,Amount,Currency\n2024-01-01,Test Transaction,50.00,EUR',
      'test.csv'
    );
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/1 Transactions/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Test Transaction')).toBeInTheDocument();
    expect(screen.getByText(/€50\.00/)).toBeInTheDocument();
  });

  it('uses default USD currency when currency column is not detected', async () => {
    const user = userEvent.setup();
    const mockParsedFile: ParsedFile = {
      data: [
        {
          Date: '2024-01-01',
          Description: 'Test Transaction',
          Amount: '25.00',
        },
      ],
      headers: ['Date', 'Description', 'Amount'],
      detectedColumns: {
        date: 'Date',
        entity: 'Description',
        amount: 'Amount',
      },
      fileName: 'test.csv',
      fileType: 'csv',
    };

    vi.spyOn(fileParser, 'parseFile').mockResolvedValue(mockParsedFile);

    render(<App />);

    const file = createMockFile(
      'Date,Description,Amount\n2024-01-01,Test Transaction,25.00',
      'test.csv'
    );
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/1 Transactions/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
  });

  it('displays download button when transactions are loaded', async () => {
    const user = userEvent.setup();
    const mockParsedFile: ParsedFile = {
      data: [
        {
          Date: '2024-01-01',
          Description: 'Test',
          Amount: '10.00',
        },
      ],
      headers: ['Date', 'Description', 'Amount'],
      detectedColumns: {
        date: 'Date',
        entity: 'Description',
        amount: 'Amount',
      },
      fileName: 'test.csv',
      fileType: 'csv',
    };

    vi.spyOn(fileParser, 'parseFile').mockResolvedValue(mockParsedFile);

    render(<App />);

    const file = createMockFile(
      'Date,Description,Amount\n2024-01-01,Test,10.00',
      'test.csv'
    );
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Download Results')).toBeInTheDocument();
    });
  });

  it('displays error when file parsing fails', async () => {
    const user = userEvent.setup();

    vi.spyOn(fileParser, 'parseFile').mockRejectedValue(
      new fileParser.FileParserError('Parse error', 'PARSE_ERROR')
    );

    render(<App />);

    const file = createMockFile('invalid content', 'test.csv');
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Parse error')).toBeInTheDocument();
    });
  });

  it('handles category changes', async () => {
    const user = userEvent.setup();
    const mockParsedFile: ParsedFile = {
      data: [
        {
          Date: '2024-01-01',
          Description: 'Grocery Store',
          Amount: '50.00',
        },
      ],
      headers: ['Date', 'Description', 'Amount'],
      detectedColumns: {
        date: 'Date',
        entity: 'Description',
        amount: 'Amount',
      },
      fileName: 'test.csv',
      fileType: 'csv',
    };

    vi.spyOn(fileParser, 'parseFile').mockResolvedValue(mockParsedFile);

    render(<App />);

    const file = createMockFile(
      'Date,Description,Amount\n2024-01-01,Grocery Store,50.00',
      'test.csv'
    );
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    const categorySelect = screen.getAllByRole('combobox')[0];
    if (categorySelect) {
      await user.selectOptions(categorySelect, 'Food & Dining');

      expect(categorySelect).toHaveValue('Food & Dining');
    }
  });
});
