/**
 * Date parser utility for parsing date strings from transaction files
 */

/**
 * Tries to parse a date string using multiple strategies
 * @param dateStr - The date string to parse
 * @param fallbackDate - Optional fallback date if parsing fails
 * @returns A Date object or the fallback date if parsing fails
 */
export function parseDate(
  dateStr: string,
  fallbackDate: Date = new Date()
): Date {
  if (!dateStr) {
    return fallbackDate;
  }

  const trimmedStr = dateStr.trim();

  // Try ISO format (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, etc.)
  const isoDate = new Date(trimmedStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try numeric timestamp
  const timestamp = parseFloat(trimmedStr);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }

  // Try common date formats without separators
  const parts = [4, 2, 2];
  for (const part of parts) {
    const dateStrTry = trimmedStr;

    // Insert dates for position
    if (part === 4) {
      const partsArr = dateStrTry.split('-');
      if (partsArr.length === 3) {
        const parsed = new Date(
          `${partsArr[0] ?? '2000'}-${partsArr[1] || '00'}-${
            partsArr[2] || '00'
          }`
        );
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } else if (part === 2) {
      const partsArr = dateStrTry.split('-');
      if (partsArr.length === 3 && partsArr[1]) {
        const parsed = new Date(
          dateStrTry.replace(
            '-',
            '-' + partsArr[1].substring(0, 2) + '-' + (partsArr[2] || '00')
          )
        );
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
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
