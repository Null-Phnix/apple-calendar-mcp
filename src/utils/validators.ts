import { z } from 'zod';

/**
 * Zod schemas for input validation
 */

export const createEventSchema = z.object({
  calendar: z.string().optional(),
  summary: z.string().min(1, 'Event summary cannot be empty'),
  start: z.string().min(1, 'Start time is required'),
  end: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const updateEventSchema = z.object({
  event_uid: z.string().min(1, 'Event UID is required'),
  summary: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const calendarNameSchema = z.object({
  name: z.string().min(1, 'Calendar name cannot be empty'),
});

export const dateRangeSchema = z.object({
  start: z.string().min(1, 'Start date is required'),
  end: z.string().min(1, 'End date is required'),
  calendar: z.string().optional(),
});

export const findFreeTimeSchema = z.object({
  start_search: z.string().min(1, 'Start search time is required'),
  end_search: z.string().min(1, 'End search time is required'),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours'),
  business_hours_only: z.boolean().optional().default(false),
});

/**
 * Validate input against a schema
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errors };
  }
  return { success: true, data: result.data };
}
