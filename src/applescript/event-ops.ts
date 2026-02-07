import { executeAppleScript, formatDateForAppleScript, escapeAppleScriptString } from './bridge.js';
import rruleLib from 'rrule';
const { RRule, rrulestr } = rruleLib;

export interface Event {
  uid: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  calendar?: string;
}

/**
 * Create a new event in a calendar
 * @param calendar - Name of the calendar
 * @param summary - Event title
 * @param startDate - Event start date/time
 * @param endDate - Event end date/time
 * @param location - Optional location
 * @param description - Optional description
 * @returns UID of the created event
 */
export async function createEvent(
  calendar: string,
  summary: string,
  startDate: Date,
  endDate: Date,
  location?: string,
  description?: string
): Promise<string> {
  const safeCal = escapeAppleScriptString(calendar);
  const safeSummary = escapeAppleScriptString(summary);
  const safeLocation = location ? escapeAppleScriptString(location) : '';
  const safeDesc = description ? escapeAppleScriptString(description) : '';

  const startStr = formatDateForAppleScript(startDate);
  const endStr = formatDateForAppleScript(endDate);

  let properties = `summary:"${safeSummary}", start date:date "${startStr}", end date:date "${endStr}"`;
  if (location) {
    properties += `, location:"${safeLocation}"`;
  }
  if (description) {
    properties += `, description:"${safeDesc}"`;
  }

  const script = `
    tell application "Calendar"
      tell calendar "${safeCal}"
        set newEvent to make new event with properties {${properties}}
        return uid of newEvent
      end tell
    end tell
  `;

  return await executeAppleScript(script);
}

/**
 * List events in a calendar within a date range
 * @param calendar - Name of the calendar
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Array of events
 */
export async function listEvents(
  calendar: string,
  queryStartDate: Date,
  queryEndDate: Date
): Promise<Event[]> {
  const safeCal = escapeAppleScriptString(calendar);
  const startStr = formatDateForAppleScript(queryStartDate);
  const endStr = formatDateForAppleScript(queryEndDate);

  const script = `
    tell application "Calendar"
      tell calendar "${safeCal}"
        set output to ""
        set eventList to every event
        repeat with evt in eventList
          -- Convert dates to ISO 8601 format
          set startISO to (start date of evt) as «class isot» as string
          set endISO to (end date of evt) as «class isot» as string
          set output to output & uid of evt & "|" & summary of evt & "|" & startISO & "|" & endISO
          if location of evt is not missing value then
            set output to output & "|" & location of evt
          else
            set output to output & "|"
          end if
          if description of evt is not missing value then
            set output to output & "|" & description of evt
          else
            set output to output & "|"
          end if
          -- Add recurrence rule
          if recurrence of evt is not "" then
            set output to output & "|" & recurrence of evt
          else
            set output to output & "|"
          end if
          set output to output & "\\n"
        end repeat
        return output
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);
  if (!result) return [];

  const events: Event[] = [];
  const lines = result.split('\n').filter(Boolean);

  for (const line of lines) {
    const [uid, summary, startStr, endStr, location, description, recurrence] = line.split('|');
    const startDate = new Date(startStr || '');
    const endDate = new Date(endStr || '');
    const duration = endDate.getTime() - startDate.getTime();

    // If event has a recurrence rule, expand it
    if (recurrence && recurrence.trim()) {
      try {
        // Parse the RRULE
        const rule = rrulestr(`DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nRRULE:${recurrence}`);

        // Get all occurrences within the query date range
        const occurrences = rule.between(queryStartDate, queryEndDate, true);

        for (const occurrence of occurrences) {
          const occurrenceEnd = new Date(occurrence.getTime() + duration);
          events.push({
            uid: uid || '',
            summary: summary || '',
            startDate: occurrence,
            endDate: occurrenceEnd,
            ...(location && { location }),
            ...(description && { description }),
            calendar
          });
        }
      } catch (error) {
        // If recurrence parsing fails, just include the base event
        console.error('Failed to parse recurrence rule:', recurrence, error);
        events.push({
          uid: uid || '',
          summary: summary || '',
          startDate,
          endDate,
          ...(location && { location }),
          ...(description && { description }),
          calendar
        });
      }
    } else {
      // Non-recurring event - only include if within query date range
      if (startDate >= queryStartDate && startDate <= queryEndDate) {
        events.push({
          uid: uid || '',
          summary: summary || '',
          startDate,
          endDate,
          ...(location && { location }),
          ...(description && { description }),
          calendar
        });
      }
    }
  }

  return events;
}

/**
 * Delete an event by UID
 * @param eventUid - UID of the event to delete
 */
export async function deleteEvent(eventUid: string): Promise<void> {
  const safeUid = escapeAppleScriptString(eventUid);
  const script = `
    tell application "Calendar"
      set theEvent to missing value
      repeat with cal in calendars
        try
          set theEvent to first event of cal whose uid is "${safeUid}"
          exit repeat
        end try
      end repeat
      if theEvent is missing value then
        error "Event not found"
      end if
      delete theEvent
    end tell
  `;
  await executeAppleScript(script);
}

/**
 * Update an event's properties
 * @param eventUid - UID of the event to update
 * @param updates - Object containing properties to update
 */
export async function updateEvent(
  eventUid: string,
  updates: {
    summary?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
    description?: string;
  }
): Promise<void> {
  const safeUid = escapeAppleScriptString(eventUid);

  const setParts: string[] = [];

  if (updates.summary !== undefined) {
    const safeSummary = escapeAppleScriptString(updates.summary);
    setParts.push(`set summary of theEvent to "${safeSummary}"`);
  }

  if (updates.startDate) {
    const startStr = formatDateForAppleScript(updates.startDate);
    setParts.push(`set start date of theEvent to date "${startStr}"`);
  }

  if (updates.endDate) {
    const endStr = formatDateForAppleScript(updates.endDate);
    setParts.push(`set end date of theEvent to date "${endStr}"`);
  }

  if (updates.location !== undefined) {
    const safeLocation = escapeAppleScriptString(updates.location);
    setParts.push(`set location of theEvent to "${safeLocation}"`);
  }

  if (updates.description !== undefined) {
    const safeDesc = escapeAppleScriptString(updates.description);
    setParts.push(`set description of theEvent to "${safeDesc}"`);
  }

  if (setParts.length === 0) {
    throw new Error('No updates provided');
  }

  const script = `
    tell application "Calendar"
      set theEvent to missing value
      repeat with cal in calendars
        try
          set theEvent to first event of cal whose uid is "${safeUid}"
          exit repeat
        end try
      end repeat
      if theEvent is missing value then
        error "Event not found"
      end if
      ${setParts.join('\n      ')}
    end tell
  `;

  await executeAppleScript(script);
}

/**
 * Move an event to a different calendar
 * @param eventUid - UID of the event to move
 * @param targetCalendar - Name of the destination calendar
 */
export async function moveEvent(eventUid: string, targetCalendar: string): Promise<void> {
  const safeUid = escapeAppleScriptString(eventUid);
  const safeCal = escapeAppleScriptString(targetCalendar);

  // AppleScript's "move" command is unreliable, so we duplicate and delete instead
  const script = `
    tell application "Calendar"
      set theEvent to missing value
      set sourceCal to missing value
      repeat with cal in calendars
        try
          set theEvent to first event of cal whose uid is "${safeUid}"
          set sourceCal to cal
          exit repeat
        end try
      end repeat
      if theEvent is missing value then
        error "Event not found"
      end if

      -- Duplicate the event to the target calendar
      set targetCal to calendar "${safeCal}"
      tell targetCal
        set newEvent to make new event with properties {summary:(summary of theEvent), start date:(start date of theEvent), end date:(end date of theEvent)}
        if location of theEvent is not missing value then
          set location of newEvent to location of theEvent
        end if
        if description of theEvent is not missing value then
          set description of newEvent to description of theEvent
        end if
      end tell

      -- Delete the original event
      delete theEvent
    end tell
  `;

  await executeAppleScript(script);
}

/**
 * Search events by keyword across all calendars
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param keyword - Search term (searches summary, location, description)
 * @returns Array of matching events
 */
export async function searchEvents(
  startDate: Date,
  endDate: Date,
  keyword: string
): Promise<Event[]> {
  const allEvents = await listAllEvents(startDate, endDate);
  const searchTerm = keyword.toLowerCase();

  return allEvents.filter(event => {
    const summary = event.summary?.toLowerCase() || '';
    const location = event.location?.toLowerCase() || '';
    const description = event.description?.toLowerCase() || '';

    return summary.includes(searchTerm) ||
           location.includes(searchTerm) ||
           description.includes(searchTerm);
  });
}

/**
 * Get all events across all calendars within a date range
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Array of events with calendar information
 */
export async function listAllEvents(queryStartDate: Date, queryEndDate: Date): Promise<Event[]> {
  const startStr = formatDateForAppleScript(queryStartDate);
  const endStr = formatDateForAppleScript(queryEndDate);

  const script = `
    tell application "Calendar"
      set output to ""
      repeat with cal in calendars
        set calName to name of cal
        set eventList to every event of cal
        repeat with evt in eventList
          -- Convert dates to ISO 8601 format
          set startISO to (start date of evt) as «class isot» as string
          set endISO to (end date of evt) as «class isot» as string
          set output to output & calName & "|" & uid of evt & "|" & summary of evt & "|" & startISO & "|" & endISO
          if location of evt is not missing value then
            set output to output & "|" & location of evt
          else
            set output to output & "|"
          end if
          if description of evt is not missing value then
            set output to output & "|" & description of evt
          else
            set output to output & "|"
          end if
          -- Add recurrence rule
          if recurrence of evt is not "" then
            set output to output & "|" & recurrence of evt
          else
            set output to output & "|"
          end if
          set output to output & "\\n"
        end repeat
      end repeat
      return output
    end tell
  `;

  const result = await executeAppleScript(script);
  if (!result) return [];

  const events: Event[] = [];
  const lines = result.split('\n').filter(Boolean);

  for (const line of lines) {
    const [calendar, uid, summary, startStr, endStr, location, description, recurrence] = line.split('|');
    const startDate = new Date(startStr || '');
    const endDate = new Date(endStr || '');
    const duration = endDate.getTime() - startDate.getTime();

    // If event has a recurrence rule, expand it
    if (recurrence && recurrence.trim()) {
      try {
        // Parse the RRULE
        const rule = rrulestr(`DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nRRULE:${recurrence}`);

        // Get all occurrences within the query date range
        const occurrences = rule.between(queryStartDate, queryEndDate, true);

        for (const occurrence of occurrences) {
          const occurrenceEnd = new Date(occurrence.getTime() + duration);
          events.push({
            calendar: calendar || '',
            uid: uid || '',
            summary: summary || '',
            startDate: occurrence,
            endDate: occurrenceEnd,
            ...(location && { location }),
            ...(description && { description })
          });
        }
      } catch (error) {
        // If recurrence parsing fails, just include the base event
        console.error('Failed to parse recurrence rule:', recurrence, error);
        events.push({
          calendar: calendar || '',
          uid: uid || '',
          summary: summary || '',
          startDate,
          endDate,
          ...(location && { location }),
          ...(description && { description })
        });
      }
    } else {
      // Non-recurring event - only include if within query date range
      if (startDate >= queryStartDate && startDate <= queryEndDate) {
        events.push({
          calendar: calendar || '',
          uid: uid || '',
          summary: summary || '',
          startDate,
          endDate,
          ...(location && { location }),
          ...(description && { description })
        });
      }
    }
  }

  return events;
}
