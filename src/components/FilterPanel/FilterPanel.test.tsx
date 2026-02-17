import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel, type FilterValues } from './FilterPanel';

describe('FilterPanel', () => {
  const mockOnChange = vi.fn();
  const availableSources = ['file1.xlsx', 'file2.csv'];

  const defaultValues: FilterValues = {
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    searchText: '',
    selectedCategories: new Set(),
    selectedSubcategories: new Set(),
    selectedSources: new Set(),
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders collapsed by default', () => {
    render(
      <FilterPanel
        availableSources={availableSources}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.queryByLabelText('Date Range')).not.toBeInTheDocument();
  });

  it('expands when clicked', () => {
    render(
      <FilterPanel
        availableSources={availableSources}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    const button = screen.getByText('Filters', { exact: false });
    fireEvent.click(button);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('From')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('displays active filter count', () => {
    const valuesWithFilters: FilterValues = {
      ...defaultValues,
      selectedCategories: new Set(['Food & Dining']),
      dateRange: { start: new Date('2024-01-01'), end: null },
    };

    render(
      <FilterPanel
        availableSources={availableSources}
        values={valuesWithFilters}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Filters (2)')).toBeInTheDocument();
  });

  it('calls onChange when date range changes', () => {
    render(
      <FilterPanel
        availableSources={availableSources}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters'));

    const startDateInput = screen.getByPlaceholderText('From');
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultValues,
      dateRange: { start: new Date('2024-01-01'), end: null },
    });
  });

  it('calls onChange when amount range changes', () => {
    render(
      <FilterPanel
        availableSources={availableSources}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters'));

    const minInput = screen.getByPlaceholderText('Min');
    fireEvent.change(minInput, { target: { value: '100' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultValues,
      amountRange: { min: 100, max: null },
    });
  });

  it('calls onChange when search text changes', () => {
    render(
      <FilterPanel
        availableSources={availableSources}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters'));

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'coffee' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultValues,
      searchText: 'coffee',
    });
  });

  it('calls onChange when category is toggled', () => {
    render(
      <FilterPanel
        availableSources={availableSources}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters'));

    const categoryCheckbox = screen.getByLabelText('Food & Dining');
    fireEvent.click(categoryCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultValues,
      selectedCategories: new Set(['Food & Dining']),
      selectedSubcategories: new Set(),
    });
  });

  it('removes category when toggled off', () => {
    const valuesWithCategory: FilterValues = {
      ...defaultValues,
      selectedCategories: new Set(['Food & Dining']),
    };

    render(
      <FilterPanel
        availableSources={availableSources}
        values={valuesWithCategory}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters', { exact: false }));

    const firstCheckedCheckbox = screen
      .getAllByRole('checkbox')
      .find(
        (cb) => cb instanceof HTMLInputElement && cb.checked
      ) as HTMLInputElement;
    expect(firstCheckedCheckbox).toBeInTheDocument();
    fireEvent.click(firstCheckedCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...valuesWithCategory,
      selectedCategories: new Set(),
      selectedSubcategories: new Set(),
    });
  });

  it('shows subcategories when category is selected', () => {
    const valuesWithCategory: FilterValues = {
      ...defaultValues,
      selectedCategories: new Set(['Food & Dining']),
    };

    render(
      <FilterPanel
        availableSources={availableSources}
        values={valuesWithCategory}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters', { exact: false }));

    expect(screen.getByText('Subcategories')).toBeInTheDocument();
  });

  it('calls onChange when subcategory is toggled', () => {
    const valuesWithCategory: FilterValues = {
      ...defaultValues,
      selectedCategories: new Set(['Food & Dining']),
    };

    render(
      <FilterPanel
        availableSources={availableSources}
        values={valuesWithCategory}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters', { exact: false }));

    const subcategoryCheckbox = screen.getByLabelText('Restaurants');
    fireEvent.click(subcategoryCheckbox);

    expect(mockOnChange).toHaveBeenCalled();
    const filterValues = mockOnChange.mock.calls[0]?.[0] as FilterValues;
    expect(filterValues.selectedSubcategories.has('Restaurants')).toBe(true);
  });

  it('clears all filters when button is clicked', () => {
    const valuesWithFilters: FilterValues = {
      ...defaultValues,
      selectedCategories: new Set(['Food & Dining']),
      selectedSources: new Set(availableSources),
      dateRange: { start: new Date('2024-01-01'), end: null },
    };

    render(
      <FilterPanel
        availableSources={availableSources}
        values={valuesWithFilters}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters', { exact: false }));
    fireEvent.click(screen.getByText('Clear All Filters'));

    expect(mockOnChange).toHaveBeenCalledWith(defaultValues);
  });

  it('calls onChange when source is toggled', () => {
    render(
      <FilterPanel
        availableSources={availableSources}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters'));

    const sourceCheckbox = screen.getByLabelText('file1.xlsx');
    fireEvent.click(sourceCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultValues,
      selectedSources: new Set(['file1.xlsx']),
    });
  });

  it('does not show sources when no sources available', () => {
    render(
      <FilterPanel
        availableSources={[]}
        values={defaultValues}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByText('Filters'));

    expect(screen.queryByLabelText('Sources')).not.toBeInTheDocument();
  });
});
