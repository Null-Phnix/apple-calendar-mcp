import type { Event } from '../applescript/event-ops.js';
import { formatDate } from './date-parser.js';

/**
 * Format a single event for display
 */
export function formatEvent(event: Event, includeCalendar: boolean = false): string {
  const lines: string[] = [
    `• ${event.summary}${includeCalendar && event.calendar ? ` [${event.calendar}]` : ''}`,
    `  ${formatDate(event.startDate)} - ${formatDate(event.endDate)}`,
    `  UID: ${event.uid}`
  ];

  if (event.location) {
    lines.push(`  Location: ${event.location}`);
  }

  if (event.description) {
    lines.push(`  Description: ${event.description}`);
  }

  return lines.join('\n');
}

/**
 * Format multiple events for display
 */
export function formatEventList(events: Event[], includeCalendar: boolean = false): string {
  if (events.length === 0) {
    return 'No events found.';
  }

  return events.map(e => formatEvent(e, includeCalendar)).join('\n\n');
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (60 * 60 * 1000));
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));

  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
