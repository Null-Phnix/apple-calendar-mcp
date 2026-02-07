import { executeAppleScript, escapeAppleScriptString } from './bridge.js';

export interface Calendar {
  name: string;
  uid: string;
}

/**
 * List all calendars in Apple Calendar
 * @returns Array of calendar objects with name and uid
 */
export async function listCalendars(): Promise<Calendar[]> {
  // Calendar IDs/UIDs require additional permissions that trigger errors
  // Since we reference calendars by name in operations anyway, use name as identifier
  const script = `tell application "Calendar" to return name of every calendar`;

  const result = await executeAppleScript(script);
  if (!result) return [];

  const names = result.split(', ').map(n => n.trim());

  // Use calendar name as the UID since that's how we reference them
  return names.map(name => ({
    name,
    uid: name
  }));
}

/**
 * Create a new calendar
 * @param name - Name of the calendar to create
 */
export async function createCalendar(name: string): Promise<void> {
  const safeName = escapeAppleScriptString(name);
  const script = `tell application "Calendar" to make new calendar with properties {name:"${safeName}"}`;
  await executeAppleScript(script);
}

/**
 * Delete a calendar by name
 * @param name - Name of the calendar to delete
 */
export async function deleteCalendar(name: string): Promise<void> {
  const safeName = escapeAppleScriptString(name);
  const script = `tell application "Calendar" to delete calendar "${safeName}"`;
  await executeAppleScript(script);
}

/**
 * Rename a calendar
 * @param oldName - Current name of the calendar
 * @param newName - New name for the calendar
 */
export async function renameCalendar(oldName: string, newName: string): Promise<void> {
  const safeOldName = escapeAppleScriptString(oldName);
  const safeNewName = escapeAppleScriptString(newName);
  const script = `tell application "Calendar" to set name of calendar "${safeOldName}" to "${safeNewName}"`;
  await executeAppleScript(script);
}

/**
 * Check if a calendar exists
 * @param name - Name of the calendar to check
 * @returns true if calendar exists
 */
export async function calendarExists(name: string): Promise<boolean> {
  const calendars = await listCalendars();
  return calendars.some(cal => cal.name === name);
}
