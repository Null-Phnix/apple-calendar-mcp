import * as chrono from 'chrono-node';

/**
 * Parse natural language date/time string into a Date object
 * Examples: "tomorrow at 3pm", "next Friday", "in 2 hours", "Jan 15 at 10:30am"
 * @param input - Natural language date/time string
 * @param referenceDate - Optional reference date for relative dates (defaults to now)
 * @returns Parsed Date object
 * @throws Error if the input cannot be parsed
 */
export function parseDateTime(input: string, referenceDate?: Date): Date {
  const parsed = chrono.parseDate(input, referenceDate);
  if (!parsed) {
    throw new Error(`Could not parse date: "${input}"`);
  }
  return parsed;
}

/**
 * Parse a date range from natural language
 * @param startInput - Start date string
 * @param endInput - End date string (optional)
 * @param defaultDuration - Default duration in milliseconds if end not specified
 * @returns Object with start and end dates
 */
export function parseDateRange(
  startInput: string,
  endInput?: string,
  defaultDuration: number = 60 * 60 * 1000 // 1 hour default
): { start: Date; end: Date } {
  const start = parseDateTime(startInput);
  const end = endInput
    ? parseDateTime(endInput, start)
    : new Date(start.getTime() + defaultDuration);

  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  return { start, end };
}

/**
 * Format a date for human-readable display
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get a date range for common time periods
 * @param period - 'today', 'tomorrow', 'this_week', 'next_week', 'this_month'
 * @returns Object with start and end dates
 */
export function getCommonDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch (period.toLowerCase()) {
    case 'today':
      // Already set correctly
      break;

    case 'tomorrow':
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
      break;

    case 'this_week': {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek); // Sunday
      end.setDate(start.getDate() + 6); // Saturday
      break;
    }

    case 'next_week': {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek + 7); // Next Sunday
      end.setDate(start.getDate() + 6); // Next Saturday
      break;
    }

    case 'this_month':
      start.setDate(1); // First day of month
      end.setMonth(end.getMonth() + 1, 0); // Last day of month
      break;

    case 'next_month':
      start.setMonth(start.getMonth() + 1, 1); // First day of next month
      end.setMonth(end.getMonth() + 2, 0); // Last day of next month
      break;

    default:
      throw new Error(`Unknown period: ${period}`);
  }

  return { start, end };
}
