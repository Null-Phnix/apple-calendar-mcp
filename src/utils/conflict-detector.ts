import type { Event } from '../applescript/event-ops.js';

export interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * Check if two time slots overlap
 * @param slot1 - First time slot
 * @param slot2 - Second time slot
 * @returns true if the slots overlap
 */
export function hasOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return (
    (slot1.start < slot2.end && slot1.end > slot2.start) ||
    (slot2.start < slot1.end && slot2.end > slot1.start)
  );
}

/**
 * Find all events that conflict with a given time slot
 * @param timeSlot - Time slot to check
 * @param events - Array of events to check against
 * @returns Array of conflicting events
 */
export function findConflicts(timeSlot: TimeSlot, events: Event[]): Event[] {
  return events.filter(event => {
    const eventSlot: TimeSlot = {
      start: event.startDate,
      end: event.endDate
    };
    return hasOverlap(timeSlot, eventSlot);
  });
}

/**
 * Check if a time slot is free (no conflicts)
 * @param timeSlot - Time slot to check
 * @param events - Array of events to check against
 * @returns true if the time slot is free
 */
export function isFree(timeSlot: TimeSlot, events: Event[]): boolean {
  return findConflicts(timeSlot, events).length === 0;
}

/**
 * Find free time slots within a date range
 * @param startDate - Start of search range
 * @param endDate - End of search range
 * @param duration - Required duration in milliseconds
 * @param events - Array of existing events
 * @param businessHoursOnly - Only search during business hours (9am-5pm)
 * @returns Array of free time slots
 */
export function findFreeSlots(
  startDate: Date,
  endDate: Date,
  duration: number,
  events: Event[],
  businessHoursOnly: boolean = false
): TimeSlot[] {
  const freeSlots: TimeSlot[] = [];
  const step = 30 * 60 * 1000; // Check every 30 minutes

  let currentTime = new Date(startDate);

  while (currentTime.getTime() + duration <= endDate.getTime()) {
    // Skip non-business hours if requested
    if (businessHoursOnly) {
      const hour = currentTime.getHours();
      if (hour < 9 || hour >= 17) {
        currentTime = new Date(currentTime.getTime() + step);
        continue;
      }
    }

    const slot: TimeSlot = {
      start: new Date(currentTime),
      end: new Date(currentTime.getTime() + duration)
    };

    if (isFree(slot, events)) {
      freeSlots.push(slot);
    }

    currentTime = new Date(currentTime.getTime() + step);
  }

  return freeSlots;
}

/**
 * Calculate meeting density (meetings per day) over a period
 * @param events - Array of events
 * @param startDate - Start of period
 * @param endDate - End of period
 * @returns Average meetings per day
 */
export function calculateMeetingDensity(
  events: Event[],
  startDate: Date,
  endDate: Date
): number {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  return events.length / days;
}

/**
 * Calculate total time spent in meetings
 * @param events - Array of events
 * @returns Total duration in milliseconds
 */
export function calculateTotalDuration(events: Event[]): number {
  return events.reduce((total, event) => {
    return total + (event.endDate.getTime() - event.startDate.getTime());
  }, 0);
}

/**
 * Group events by day
 * @param events - Array of events
 * @returns Map of date string to events
 */
export function groupEventsByDay(events: Event[]): Map<string, Event[]> {
  const grouped = new Map<string, Event[]>();

  for (const event of events) {
    const dateKey = event.startDate.toISOString().split('T')[0];
    if (!dateKey) continue;

    const dayEvents = grouped.get(dateKey) || [];
    dayEvents.push(event);
    grouped.set(dateKey, dayEvents);
  }

  return grouped;
}

/**
 * Find the optimal time slot that minimizes conflicts and maximizes preferences
 * @param candidates - Array of candidate time slots
 * @param events - Existing events
 * @param preferences - Preferred hours (e.g., [9, 10, 11] for morning preference)
 * @returns Best time slot or null if none available
 */
export function findOptimalSlot(
  candidates: TimeSlot[],
  events: Event[],
  preferences?: number[]
): TimeSlot | null {
  const freeSlots = candidates.filter(slot => isFree(slot, events));

  if (freeSlots.length === 0) return null;
  if (freeSlots.length === 1) return freeSlots[0] || null;

  if (preferences && preferences.length > 0) {
    // Score each slot based on how well it matches preferred hours
    const scoredSlots = freeSlots.map(slot => {
      const hour = slot.start.getHours();
      const score = preferences.includes(hour) ? 1 : 0;
      return { slot, score };
    });

    // Sort by score (highest first)
    scoredSlots.sort((a, b) => b.score - a.score);
    return scoredSlots[0]?.slot || null;
  }

  // Return first free slot if no preferences
  return freeSlots[0] || null;
}
