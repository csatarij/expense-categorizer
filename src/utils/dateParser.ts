/**
 * Date parser utility for parsing date strings from transaction files
 */

type DateOrder = 'mdy' | 'dmy' | 'unknown';

/**
 * #8: Detect date format from a column of date strings.
 * If any value has a first number > 12, the column is DD/MM/YYYY.
 * If any value has a second number > 12, the column is MM/DD/YYYY.
 */
export function detectDateFormat(dateStrings: string[]): DateOrder {
  let hasDayFirst = false;
  let hasMonthFirst = false;

  for (const str of dateStrings) {
    if (!str) continue;
    const trimmed = str.trim();
    const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (!match) continue;

    const first = parseInt(match[1] ?? '0', 10);
    const second = parseInt(match[2] ?? '0', 10);

    if (first > 12) hasDayFirst = true;
    if (second > 12) hasMonthFirst = true;
  }

  if (hasDayFirst && !hasMonthFirst) return 'dmy';
  if (hasMonthFirst && !hasDayFirst) return 'mdy';
  return 'unknown';
}

/**
 * Tries to parse a date string using multiple strategies
 * @param dateStr - The date string to parse
 * @param fallbackDate - Optional fallback date if parsing fails
 * @param dateOrder - Optional hint for date format order ('mdy' or 'dmy')
 * @returns A Date object or the fallback date if parsing fails
 */
export function parseDate(
  dateStr: string,
  fallbackDate: Date = new Date(),
  dateOrder: DateOrder = 'unknown'
): Date {
  if (!dateStr) {
    return fallbackDate;
  }

  const trimmedStr = dateStr.trim();

  // Parse slash-separated dates (DD/MM/YYYY or MM/DD/YYYY)
  const slashMatch = trimmedStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = parseInt(slashMatch[1] ?? '0', 10);
    const second = parseInt(slashMatch[2] ?? '0', 10);
    const year = parseInt(slashMatch[3] ?? '0', 10);

    // Use dateOrder hint if available, otherwise fall back to heuristic
    const isDayFirst =
      dateOrder === 'dmy' ||
      (dateOrder === 'unknown' && first > 12);

    if (isDayFirst) {
      const parsed = new Date(year, second - 1, first);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } else {
      const parsed = new Date(year, first - 1, second);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  const datePatterns: {
    pattern: RegExp;
    parser: (match: RegExpMatchArray) => Date;
  }[] = [
    {
      pattern: /^(\d{4})-(\d{1,2})-(\d{1,2})/,
      parser: (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    },
    {
      pattern: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
      parser: (m) => new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])),
    },
    {
      pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      parser: (m) => {
        const first = Number(m[1]);
        const second = Number(m[2]);
        const year = Number(m[3]);
        const isDayFirst =
          dateOrder === 'dmy' ||
          (dateOrder === 'unknown' && first > 12);
        if (isDayFirst) {
          return new Date(year, second - 1, first);
        }
        return new Date(year, first - 1, second);
      },
    },
    {
      pattern: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
      parser: (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    },
    {
      pattern: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      parser: (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    },
  ];

  for (const { pattern, parser } of datePatterns) {
    const match = trimmedStr.match(pattern);
    if (match) {
      const parsed = parser(match);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // Try ISO format with time (YYYY-MM-DDTHH:mm:ss, etc.)
  const isoDate = new Date(trimmedStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try numeric timestamp (must be reasonable - between year 1970 and 2100 approx as ms)
  const timestamp = parseFloat(trimmedStr);
  if (
    !isNaN(timestamp) &&
    timestamp > 10000000000 &&
    timestamp < 5000000000000
  ) {
    return new Date(timestamp);
  }

  // Try common date formats without separators (YYYYMMDD)
  if (trimmedStr.length === 8 && /^\d+$/.test(trimmedStr)) {
    const year = trimmedStr.substring(0, 4);
    const month = trimmedStr.substring(4, 6);
    const day = trimmedStr.substring(6, 8);
    const parsed = new Date(`${year}-${month}-${day}`);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // If all parsing fails, return fallback
  return fallbackDate;
}

/**
 * Format a date for display
 * @param date - The date to format
 * @param format - The format type ('auto', 'date', 'iso', 'month-year', 'full')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  format: 'auto' | 'date' | 'iso' | 'month-year' | 'full' = 'auto'
): string {
  const isoStr = date.toISOString();

  switch (format) {
    case 'iso':
      return isoStr;

    case 'date':
      return isoStr.split('T')[0] || isoStr;

    case 'month-year':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });

    case 'full':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    default:
      // Auto-detect best format
      if (isoStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        return isoStr.split('T')[0] || isoStr;
      }
      return isoStr;
  }
}
