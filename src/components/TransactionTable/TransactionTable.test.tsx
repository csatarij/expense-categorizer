import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionTable } from './TransactionTable';
import type { Transaction } from '@/types';
import { getCategoryNames, getSubcategories } from '@/data/categories';

/**
 * Create a mock transaction for testing
 */
function createMockTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: 'test-1',
    date: new Date('2024-01-15'),
    entity: 'Test Transaction',
    amount: -50.0,
    currency: 'USD',
    isManuallyEdited: false,
    ...overrides,
  };
}

/**
 * Helper to get the category select (first combobox in a row)
 */
function getCategorySelect(index = 0): HTMLElement {
  const comboboxes = screen.getAllByRole('combobox');
  const element = comboboxes[index * 2];
  if (!element) {
    throw new Error(`Category select at index ${String(index)} not found`);
  }
  return element;
}

/**
 * Helper to get the subcategory select (second combobox in a row)
 */
function getSubcategorySelect(index = 0): HTMLElement {
  const comboboxes = screen.getAllByRole('combobox');
  const element = comboboxes[index * 2 + 1];
  if (!element) {
    throw new Error(`Subcategory select at index ${String(index)} not found`);
  }
  return element;
}

describe('TransactionTable', () => {
  describe('rendering', () => {
    it('should display empty state when no transactions', () => {
      render(<TransactionTable transactions={[]} />);

      expect(
        screen.getByText(/no transactions to display/i)
      ).toBeInTheDocument();
    });

    it('should render table with column headers', () => {
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Entity')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Subcategory')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      const transactions = [
        createMockTransaction({ id: '1' }),
        createMockTransaction({ id: '2' }),
        createMockTransaction({ id: '3' }),
      ];
      render(<TransactionTable transactions={transactions} />);

      const rows = screen.getAllByRole('row');
      // 1 header row + 3 data rows
      expect(rows).toHaveLength(4);
    });
  });

  describe('date formatting', () => {
    it('should format date correctly', () => {
      const transactions = [
        createMockTransaction({ date: new Date('2024-03-25') }),
      ];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByText('Mar 25, 2024')).toBeInTheDocument();
    });

    it('should handle different dates', () => {
      const transactions = [
        createMockTransaction({ id: '1', date: new Date('2024-01-01') }),
        createMockTransaction({ id: '2', date: new Date('2024-12-31') }),
      ];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
      expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument();
    });
  });

  describe('description display', () => {
    it('should display transaction description', () => {
      const transactions = [
        createMockTransaction({ entity: 'Grocery Store Purchase' }),
      ];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByText('Grocery Store Purchase')).toBeInTheDocument();
    });

    it('should display long descriptions (truncated via CSS)', () => {
      const longDescription =
        'A very long transaction description that should be truncated by CSS';
      const transactions = [createMockTransaction({ entity: longDescription })];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  describe('amount formatting', () => {
    it('should format negative amounts with minus sign and red color', () => {
      const transactions = [createMockTransaction({ amount: -123.45 })];
      render(<TransactionTable transactions={transactions} />);

      const amountCell = screen.getByText(/\$123\.45/);
      expect(amountCell).toHaveTextContent('-$123.45');
      expect(amountCell).toHaveClass('text-red-600');
    });

    it('should format positive amounts with plus sign and green color', () => {
      const transactions = [createMockTransaction({ amount: 500.0 })];
      render(<TransactionTable transactions={transactions} />);

      const amountCell = screen.getByText(/\$500\.00/);
      expect(amountCell).toHaveTextContent('+$500.00');
      expect(amountCell).toHaveClass('text-green-600');
    });

    it('should format zero amount as positive', () => {
      const transactions = [createMockTransaction({ amount: 0 })];
      render(<TransactionTable transactions={transactions} />);

      const amountCell = screen.getByText(/\$0\.00/);
      expect(amountCell).toHaveTextContent('+$0.00');
      expect(amountCell).toHaveClass('text-green-600');
    });

    it('should format large amounts with commas', () => {
      const transactions = [createMockTransaction({ amount: -1234567.89 })];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByText(/-\$1,234,567\.89/)).toBeInTheDocument();
    });
  });

  describe('category dropdown', () => {
    it('should render category dropdown with all categories', () => {
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      const categorySelect = getCategorySelect();
      expect(categorySelect).toBeInTheDocument();

      const categories = getCategoryNames();
      categories.forEach((category) => {
        expect(within(categorySelect).getByText(category)).toBeInTheDocument();
      });
    });

    it('should show "Select category" as default option', () => {
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      const categorySelect = getCategorySelect();
      expect(
        within(categorySelect).getByText('Select category')
      ).toBeInTheDocument();
    });

    it('should display selected category', () => {
      const transactions = [
        createMockTransaction({ category: 'Food & Dining' }),
      ];
      render(<TransactionTable transactions={transactions} />);

      const categorySelect = getCategorySelect();
      expect(categorySelect).toHaveValue('Food & Dining');
    });

    it('should call onCategoryChange when category is selected', async () => {
      const user = userEvent.setup();
      const onCategoryChange = vi.fn();
      const transactions = [createMockTransaction({ id: 'tx-1' })];
      render(
        <TransactionTable
          transactions={transactions}
          onCategoryChange={onCategoryChange}
        />
      );

      const categorySelect = getCategorySelect();
      await user.selectOptions(categorySelect, 'Shopping');

      expect(onCategoryChange).toHaveBeenCalledWith(
        'tx-1',
        'Shopping',
        undefined
      );
    });
  });

  describe('subcategory dropdown', () => {
    it('should be disabled when no category is selected', () => {
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      const subcategorySelect = getSubcategorySelect();
      expect(subcategorySelect).toBeDisabled();
    });

    it('should be enabled when category is selected', () => {
      const transactions = [
        createMockTransaction({ category: 'Food & Dining' }),
      ];
      render(<TransactionTable transactions={transactions} />);

      const subcategorySelect = getSubcategorySelect();
      expect(subcategorySelect).not.toBeDisabled();
    });

    it('should show subcategories for selected category', () => {
      const transactions = [
        createMockTransaction({ category: 'Food & Dining' }),
      ];
      render(<TransactionTable transactions={transactions} />);

      const subcategorySelect = getSubcategorySelect();
      const subcategories = getSubcategories('Food & Dining');

      subcategories.forEach((subcategory) => {
        expect(
          within(subcategorySelect).getByText(subcategory)
        ).toBeInTheDocument();
      });
    });

    it('should display selected subcategory', () => {
      const transactions = [
        createMockTransaction({
          category: 'Food & Dining',
          subcategory: 'Groceries',
        }),
      ];
      render(<TransactionTable transactions={transactions} />);

      const subcategorySelect = getSubcategorySelect();
      expect(subcategorySelect).toHaveValue('Groceries');
    });

    it('should call onCategoryChange when subcategory is selected', async () => {
      const user = userEvent.setup();
      const onCategoryChange = vi.fn();
      const transactions = [
        createMockTransaction({ id: 'tx-1', category: 'Food & Dining' }),
      ];
      render(
        <TransactionTable
          transactions={transactions}
          onCategoryChange={onCategoryChange}
        />
      );

      const subcategorySelect = getSubcategorySelect();
      await user.selectOptions(subcategorySelect, 'Restaurants');

      expect(onCategoryChange).toHaveBeenCalledWith(
        'tx-1',
        'Food & Dining',
        'Restaurants'
      );
    });
  });

  describe('confidence display', () => {
    it('should display high confidence (>=80%) with green badge', () => {
      const transactions = [createMockTransaction({ confidence: 0.95 })];
      render(<TransactionTable transactions={transactions} />);

      const badge = screen.getByText('95%');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should display medium confidence (50-79%) with yellow badge', () => {
      const transactions = [createMockTransaction({ confidence: 0.65 })];
      render(<TransactionTable transactions={transactions} />);

      const badge = screen.getByText('65%');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should display low confidence (<50%) with gray badge', () => {
      const transactions = [createMockTransaction({ confidence: 0.3 })];
      render(<TransactionTable transactions={transactions} />);

      const badge = screen.getByText('30%');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should display dash when no confidence', () => {
      // Don't set confidence at all to test the undefined case
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getAllByText('—')).toHaveLength(1);
    });

    it('should round confidence to nearest integer', () => {
      const transactions = [createMockTransaction({ confidence: 0.856 })];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByText('86%')).toBeInTheDocument();
    });

    it('should display 80% as green (boundary)', () => {
      const transactions = [createMockTransaction({ confidence: 0.8 })];
      render(<TransactionTable transactions={transactions} />);

      const badge = screen.getByText('80%');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should display 50% as yellow (boundary)', () => {
      const transactions = [createMockTransaction({ confidence: 0.5 })];
      render(<TransactionTable transactions={transactions} />);

      const badge = screen.getByText('50%');
      expect(badge).toHaveClass('bg-yellow-100');
    });
  });

  describe('multiple transactions', () => {
    it('should render multiple transactions correctly', () => {
      const transactions = [
        createMockTransaction({
          id: '1',
          entity: 'Coffee Shop Purchase',
          amount: -5.5,
          category: 'Food & Dining',
        }),
        createMockTransaction({
          id: '2',
          entity: 'Monthly Paycheck',
          amount: 3000,
          category: 'Income',
        }),
        createMockTransaction({
          id: '3',
          entity: 'Electric Bill Payment',
          amount: -150,
          category: 'Bills & Utilities',
        }),
      ];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getByText('Coffee Shop Purchase')).toBeInTheDocument();
      expect(screen.getByText('Monthly Paycheck')).toBeInTheDocument();
      expect(screen.getByText('Electric Bill Payment')).toBeInTheDocument();
    });

    it('should call onCategoryChange with correct transaction id', async () => {
      const user = userEvent.setup();
      const onCategoryChange = vi.fn();
      const transactions = [
        createMockTransaction({ id: 'tx-1', entity: 'First' }),
        createMockTransaction({ id: 'tx-2', entity: 'Second' }),
      ];
      render(
        <TransactionTable
          transactions={transactions}
          onCategoryChange={onCategoryChange}
        />
      );

      // Get second row's category dropdown
      const secondCategorySelect = getCategorySelect(1);
      await user.selectOptions(secondCategorySelect, 'Entertainment');

      expect(onCategoryChange).toHaveBeenCalledWith(
        'tx-2',
        'Entertainment',
        undefined
      );
    });
  });

  describe('sorting', () => {
    it('should call onSort with date column and desc direction when first clicked', () => {
      const onSort = vi.fn();
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} onSort={onSort} />);

      fireEvent.click(screen.getByText('Date'));

      expect(onSort).toHaveBeenCalledWith('date', 'desc');
    });

    it('should call onSort with asc direction when same column clicked twice', () => {
      const onSort = vi.fn();
      const transactions = [createMockTransaction()];
      render(
        <TransactionTable
          transactions={transactions}
          onSort={onSort}
          sortColumn="date"
          sortDirection="desc"
        />
      );

      fireEvent.click(screen.getByText('Date'));

      expect(onSort).toHaveBeenCalledWith('date', 'asc');
    });

    it('should show desc indicator for date column', () => {
      const transactions = [createMockTransaction()];
      render(
        <TransactionTable
          transactions={transactions}
          sortColumn="date"
          sortDirection="desc"
        />
      );

      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('should show asc indicator for date column', () => {
      const transactions = [createMockTransaction()];
      render(
        <TransactionTable
          transactions={transactions}
          sortColumn="date"
          sortDirection="asc"
        />
      );

      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('should highlight sorted column with different background', () => {
      const transactions = [createMockTransaction()];
      render(
        <TransactionTable
          transactions={transactions}
          sortColumn="date"
          sortDirection="desc"
        />
      );

      const dateHeader = screen.getByText('Date').closest('th');
      expect(dateHeader).toHaveClass('bg-gray-200');
    });

    it('should not highlight unsorted column', () => {
      const transactions = [createMockTransaction()];
      render(
        <TransactionTable
          transactions={transactions}
          sortColumn="date"
          sortDirection="desc"
        />
      );

      const amountHeader = screen.getByText('Amount').closest('th');
      expect(amountHeader).not.toHaveClass('bg-gray-200');
    });

    it('should work without onSort callback', () => {
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      const dateHeader = screen.getByText('Date');
      expect(() => fireEvent.click(dateHeader)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle transaction with no optional fields set', () => {
      // Create transaction without setting optional fields
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      expect(screen.getAllByText('—')).toHaveLength(1);
      const categorySelect = getCategorySelect();
      expect(categorySelect).toHaveValue('');
    });

    it('should handle empty description', () => {
      const transactions = [createMockTransaction({ entity: '' })];
      render(<TransactionTable transactions={transactions} />);

      // Table should still render
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should work without onCategoryChange callback', async () => {
      const user = userEvent.setup();
      const transactions = [createMockTransaction()];
      render(<TransactionTable transactions={transactions} />);

      const categorySelect = getCategorySelect();

      // Should not throw error when selecting without callback
      // Note: Value won't change as component is controlled by parent
      await expect(
        user.selectOptions(categorySelect, 'Shopping')
      ).resolves.not.toThrow();
    });
  });
});
