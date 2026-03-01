import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText(/Upload Your Bank Statement/)).toBeInTheDocument();
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

  it('uses default CHF currency when currency column is not detected', async () => {
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

    expect(screen.getByText(/CHF\s*25\.00/)).toBeInTheDocument();
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

  it('displays filters panel when transactions exist', async () => {
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
      'Date,Description,Amount\\n2024-01-01,Test,10.00',
      'test.csv'
    );
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  it('filters transactions by search text', async () => {
    const user = userEvent.setup();
    const mockParsedFile: ParsedFile = {
      data: [
        {
          Date: '2024-01-01',
          Description: 'Coffee Shop',
          Amount: '5.00',
        },
        {
          Date: '2024-01-02',
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
      'Date,Description,Amount\\n2024-01-01,Coffee Shop,5.00\\n2024-01-02,Grocery Store,50.00',
      'test.csv'
    );
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('2 Transactions')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Filters'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.clear(searchInput);
    await user.type(searchInput, 'Coffee');

    await waitFor(() => {
      expect(screen.getByText('1 of 2 Transactions')).toBeInTheDocument();
      expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
      expect(screen.queryByText('Grocery Store')).not.toBeInTheDocument();
    });
  });

  it('sorts transactions when clicking column headers', async () => {
    const user = userEvent.setup();
    const mockParsedFile: ParsedFile = {
      data: [
        {
          Date: '2024-01-02',
          Description: 'Second',
          Amount: '50.00',
        },
        {
          Date: '2024-01-01',
          Description: 'First',
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
      'Date,Description,Amount\\n2024-01-02,Second,50.00\\n2024-01-01,First,10.00',
      'test.csv'
    );
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('2 Transactions')).toBeInTheDocument();
    });

    const dateHeader = screen.getByText('Date');
    fireEvent.click(dateHeader);

    await waitFor(() => {
      expect(screen.getByText(/▲|▼/)).toBeInTheDocument();
    });
  });
});
