import { useState, useCallback, useMemo } from 'react';
import { getCategoryNames, getSubcategories } from '@/data/categories';

export interface FilterValues {
  dateRange: { start: Date | null; end: Date | null };
  amountRange: { min: number | null; max: number | null };
  searchText: string;
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;
  selectedSources: Set<string>;
}

export interface FilterPanelProps {
  availableSources: string[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

export function FilterPanel({
  availableSources,
  values,
  onChange,
}: FilterPanelProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = getCategoryNames();

  const handleDateChange = useCallback(
    (field: 'start' | 'end', value: string) => {
      const newDate = value ? new Date(value) : null;
      onChange({
        ...values,
        dateRange: { ...values.dateRange, [field]: newDate },
      });
    },
    [values, onChange]
  );

  const handleAmountChange = useCallback(
    (field: 'min' | 'max', value: string) => {
      const newAmount = value ? parseFloat(value) : null;
      onChange({
        ...values,
        amountRange: { ...values.amountRange, [field]: newAmount },
      });
    },
    [values, onChange]
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      onChange({ ...values, searchText: text });
    },
    [values, onChange]
  );

  const handleCategoryToggle = useCallback(
    (category: string) => {
      const newSelected = new Set(values.selectedCategories);
      if (newSelected.has(category)) {
        newSelected.delete(category);
      } else {
        newSelected.add(category);
      }
      onChange({
        ...values,
        selectedCategories: newSelected,
        selectedSubcategories: new Set(),
      });
    },
    [values, onChange]
  );

  const handleSubcategoryToggle = useCallback(
    (subcategory: string) => {
      const newSelected = new Set(values.selectedSubcategories);
      if (newSelected.has(subcategory)) {
        newSelected.delete(subcategory);
      } else {
        newSelected.add(subcategory);
      }
      onChange({
        ...values,
        selectedSubcategories: newSelected,
      });
    },
    [values, onChange]
  );

  const handleSourceToggle = useCallback(
    (source: string) => {
      const newSelected = new Set(values.selectedSources);
      if (newSelected.has(source)) {
        newSelected.delete(source);
      } else {
        newSelected.add(source);
      }
      onChange({
        ...values,
        selectedSources: newSelected,
      });
    },
    [values, onChange]
  );

  const handleClearAll = useCallback(() => {
    onChange({
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
      searchText: '',
      selectedCategories: new Set(),
      selectedSubcategories: new Set(),
      selectedSources: new Set(),
    });
  }, [onChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (values.dateRange.start || values.dateRange.end) count++;
    if (values.amountRange.min !== null || values.amountRange.max !== null)
      count++;
    if (values.searchText) count++;
    if (values.selectedCategories.size > 0) count++;
    if (values.selectedSubcategories.size > 0) count++;
    if (values.selectedSources.size > 0) count++;
    return count;
  }, [values]);

  const availableSubcategories = useMemo(() => {
    if (values.selectedCategories.size === 0) return [];
    const subcategoriesSet = new Set<string>();
    values.selectedCategories.forEach((cat) => {
      getSubcategories(cat).forEach((sub) => subcategoriesSet.add(sub));
    });
    return Array.from(subcategoriesSet).sort();
  }, [values.selectedCategories]);

  const formattedDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0] ?? '';
  };

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50"
        type="button"
      >
        <span className="font-semibold text-gray-800">
          Filters {activeFilterCount > 0 && `(${String(activeFilterCount)})`}
        </span>
        <svg
          className={`h-5 w-5 transform transition-transform ${
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

      {isExpanded && (
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formattedDate(values.dateRange.start)}
                  onChange={(e) => {
                    handleDateChange('start', e.target.value);
                  }}
                  className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={formattedDate(values.dateRange.end)}
                  onChange={(e) => {
                    handleDateChange('end', e.target.value);
                  }}
                  className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm"
                  placeholder="To"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Amount Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={values.amountRange.min ?? ''}
                  onChange={(e) => {
                    handleAmountChange('min', e.target.value);
                  }}
                  className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm"
                  placeholder="Min"
                  step="0.01"
                />
                <input
                  type="number"
                  value={values.amountRange.max ?? ''}
                  onChange={(e) => {
                    handleAmountChange('max', e.target.value);
                  }}
                  className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm"
                  placeholder="Max"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Search (Entity & Notes)
              </label>
              <input
                type="text"
                value={values.searchText}
                onChange={(e) => {
                  handleSearchChange(e.target.value);
                }}
                className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm"
                placeholder="Search..."
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Categories
              </label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2">
                {categories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={values.selectedCategories.has(category)}
                      onChange={() => {
                        handleCategoryToggle(category);
                      }}
                      className="focus:border-primary-500 focus:ring-primary-500 mr-2 h-4 w-4 rounded border-gray-300"
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>

            {availableSubcategories.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subcategories
                </label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2">
                  {availableSubcategories.map((subcategory) => (
                    <label
                      key={subcategory}
                      className="flex items-center text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={values.selectedSubcategories.has(subcategory)}
                        onChange={() => {
                          handleSubcategoryToggle(subcategory);
                        }}
                        className="focus:border-primary-500 focus:ring-primary-500 mr-2 h-4 w-4 rounded border-gray-300"
                      />
                      {subcategory}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {availableSources.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sources
                </label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2">
                  {availableSources.map((source) => (
                    <label
                      key={source}
                      className="flex items-center text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={values.selectedSources.has(source)}
                        onChange={() => {
                          handleSourceToggle(source);
                        }}
                        className="focus:border-primary-500 focus:ring-primary-500 mr-2 h-4 w-4 rounded border-gray-300"
                      />
                      {source}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleClearAll}
              className="focus:ring-primary-500 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:outline-none"
              type="button"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
