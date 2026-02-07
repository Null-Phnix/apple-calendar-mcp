import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Execute an AppleScript command
 * @param script - The AppleScript code to execute
 * @returns The stdout output from the script
 * @throws Error if the script execution fails
 */
export async function executeAppleScript(script: string): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync('/usr/bin/osascript', ['-e', script]);
    if (stderr) {
      throw new Error(`AppleScript stderr: ${stderr}`);
    }
    return stdout.trim();
  } catch (error: any) {
    throw new Error(`AppleScript execution failed: ${error.message}`);
  }
}

/**
 * Format a JavaScript Date object into AppleScript date format
 * AppleScript expects: "Monday, January 15, 2024 at 10:30:00 AM"
 * @param date - JavaScript Date object
 * @returns Formatted date string for AppleScript
 */
export function formatDateForAppleScript(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${dayName}, ${monthName} ${day}, ${year} at ${displayHours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Escape a string for safe use in AppleScript
 * Prevents AppleScript injection attacks
 * @param str - String to escape
 * @returns Escaped string safe for AppleScript
 */
export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
