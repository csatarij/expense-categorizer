import { useCallback, useState, useEffect, useRef } from 'react';
import type { Transaction } from '@/types';
import { getCategoryNames, getSubcategories } from '@/data/categories';

export interface TransactionTableProps {
  transactions: Transaction[];
  onCategoryChange?: (
    id: string,
    category: string,
    subcategory?: string
  ) => void;
  onRevertCategory?: (id: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

// #10: Debounced notes input component using key-based remount instead of setState-in-effect
function DebouncedNotesInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (id: string, notes: string) => void;
  id: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (isMounted.current) {
        onChange(id, newValue);
      }
    }, 300);
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onBlur={() => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        onChange(id, localValue);
      }}
      placeholder="Add notes..."
      className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm"
    />
  );
}

// #9: Row height and virtualization constants
const ROW_HEIGHT = 53;
const OVERSCAN = 10;
const VIRTUALIZATION_THRESHOLD = 100;

export function TransactionTable({
  transactions,
  onCategoryChange,
  onRevertCategory,
  onNotesChange,
  sortColumn,
  sortDirection,
  onSort,
}: TransactionTableProps): React.JSX.Element {
  const categories = getCategoryNames();

  // #9: Virtualization state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const useVirtualization = transactions.length > VIRTUALIZATION_THRESHOLD;

  useEffect(() => {
    if (!useVirtualization || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); };
  }, [useVirtualization]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    transactions.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  );
  const visibleTransactions = useVirtualization
    ? transactions.slice(startIndex, endIndex)
    : transactions;

  const formatAmount = (amount: number, currency: string): string => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(Math.abs(amount));
    } catch {
      return `${Math.abs(amount).toFixed(2)} ${currency}`;
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCategoryChange = useCallback(
    (id: string, category: string) => {
      onCategoryChange?.(id, category, undefined);
    },
    [onCategoryChange]
  );

  const handleSubcategoryChange = useCallback(
    (id: string, category: string, subcategory: string) => {
      onCategoryChange?.(id, category, subcategory);
    },
    [onCategoryChange]
  );

  const handleNotesChange = useCallback(
    (id: string, value: string) => {
      onNotesChange?.(id, value);
    },
    [onNotesChange]
  );

  const handleSort = useCallback(
    (column: string) => {
      if (!onSort) {
        return;
      }

      if (sortColumn === column) {
        if (sortDirection === 'asc') {
          onSort(column, 'desc');
        } else {
          onSort(column, 'asc');
        }
      } else {
        onSort(column, 'desc');
      }
    },
    [onSort, sortColumn, sortDirection]
  );

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No transactions to display
      </div>
    );
  }

  const renderRow = (transaction: Transaction) => (
    <tr
      key={transaction.id}
      className="transition-colors hover:bg-gray-50"
      style={useVirtualization ? { height: ROW_HEIGHT } : undefined}
    >
      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
        {formatDate(transaction.date)}
      </td>
      <td className="px-4 py-3 text-sm">
        {transaction.metadata?.fileName && (
          <span
            className="inline-flex max-w-[150px] items-center truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            title={transaction.metadata.fileName}
          >
            {transaction.metadata.fileName.length > 20
              ? `${transaction.metadata.fileName.substring(0, 17)}...`
              : transaction.metadata.fileName}
          </span>
        )}
      </td>
      <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">
        {transaction.entity}
      </td>
      <td className="max-w-xs px-4 py-3 text-sm text-gray-900">
        <DebouncedNotesInput
          value={transaction.notes || ''}
          onChange={handleNotesChange}
          id={transaction.id}
        />
      </td>
      <td
        className={`px-4 py-3 text-right text-sm font-medium whitespace-nowrap ${
          transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
        }`}
      >
        {transaction.amount < 0 ? '-' : '+'}
        {formatAmount(transaction.amount, transaction.currency)}
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <div className="flex items-center gap-1">
          <select
            value={transaction.category || ''}
            onChange={(e) => {
              handleCategoryChange(transaction.id, e.target.value);
            }}
            className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {/* #14: Show revert button when transaction was manually edited */}
          {transaction.isManuallyEdited && transaction.originalCategory && onRevertCategory && (
            <button
              onClick={() => { onRevertCategory(transaction.id); }}
              title={`Revert to "${transaction.originalCategory}"`}
              className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
              </svg>
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <select
          value={transaction.subcategory || ''}
          onChange={(e) => {
            handleSubcategoryChange(
              transaction.id,
              transaction.category || '',
              e.target.value
            );
          }}
          disabled={!transaction.category}
          className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border-gray-300 text-sm disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">Select subcategory</option>
          {transaction.category &&
            getSubcategories(transaction.category).map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
        </select>
      </td>
      <td className="px-4 py-3 text-center text-sm whitespace-nowrap">
        {transaction.confidence !== undefined ? (
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
              transaction.confidence >= 0.8
                ? 'bg-green-100 text-green-800'
                : transaction.confidence >= 0.5
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {Math.round(transaction.confidence * 100)}%
          </span>
        ) : (
          <span className="text-gray-400">&mdash;</span>
        )}
      </td>
    </tr>
  );

  return (
    <div
      ref={containerRef}
      className="mt-6 overflow-x-auto rounded-lg border border-gray-200"
      style={useVirtualization ? { maxHeight: '70vh', overflowY: 'auto' } : undefined}
      onScroll={useVirtualization ? handleScroll : undefined}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className={`cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'date' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('date');
              }}
            >
              <div className="flex items-center gap-1">
                Date
                {sortColumn === 'date' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'source' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('source');
              }}
            >
              <div className="flex items-center gap-1">
                Source
                {sortColumn === 'source' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'entity' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('entity');
              }}
            >
              <div className="flex items-center gap-1">
                Entity
                {sortColumn === 'entity' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'notes' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('notes');
              }}
            >
              <div className="flex items-center gap-1">
                Notes
                {sortColumn === 'notes' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`cursor-pointer px-4 py-3 text-right text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'amount' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('amount');
              }}
            >
              <div className="flex items-center justify-end gap-1">
                Amount
                {sortColumn === 'amount' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'category' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('category');
              }}
            >
              <div className="flex items-center gap-1">
                Category
                {sortColumn === 'category' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'subcategory' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('subcategory');
              }}
            >
              <div className="flex items-center gap-1">
                Subcategory
                {sortColumn === 'subcategory' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider uppercase hover:bg-gray-100 ${
                sortColumn === 'confidence' ? 'bg-gray-200' : ''
              }`}
              onClick={() => {
                handleSort('confidence');
              }}
            >
              <div className="flex items-center justify-center gap-1">
                Confidence
                {sortColumn === 'confidence' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {useVirtualization ? (
            <>
              {startIndex > 0 && (
                <tr style={{ height: startIndex * ROW_HEIGHT }}>
                  <td colSpan={8} />
                </tr>
              )}
              {visibleTransactions.map(renderRow)}
              {endIndex < transactions.length && (
                <tr style={{ height: (transactions.length - endIndex) * ROW_HEIGHT }}>
                  <td colSpan={8} />
                </tr>
              )}
            </>
          ) : (
            transactions.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}
