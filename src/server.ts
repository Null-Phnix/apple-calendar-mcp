import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';

import * as calendarOps from './applescript/calendar-ops.js';
import * as eventOps from './applescript/event-ops.js';
import { parseDateTime, parseDateRange, formatDate, getCommonDateRange } from './utils/date-parser.js';
import {
  findConflicts,
  isFree,
  findFreeSlots,
  calculateMeetingDensity,
  calculateTotalDuration,
  groupEventsByDay,
  findOptimalSlot
} from './utils/conflict-detector.js';
import { db, getSetting, recordHistory } from './storage/database.js';
import { success, error, data } from './utils/response-helpers.js';
import { formatEvent, formatEventList, formatDuration } from './utils/formatters.js';
import {
  validateInput,
  createEventSchema,
  updateEventSchema,
  calendarNameSchema,
  dateRangeSchema,
  findFreeTimeSchema
} from './utils/validators.js';

const server = new Server(
  {
    name: 'apple-calendar',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all available tools
const tools: Tool[] = [
  // Calendar Management
  {
    name: 'list_calendars',
    description: 'List all available calendars with their names and UIDs',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_calendar',
    description: 'Create a new calendar',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Calendar name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_calendar',
    description: 'Delete a calendar by name',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Calendar name to delete' },
      },
      required: ['name'],
    },
  },
  {
    name: 'rename_calendar',
    description: 'Rename a calendar',
    inputSchema: {
      type: 'object',
      properties: {
        old_name: { type: 'string', description: 'Current calendar name' },
        new_name: { type: 'string', description: 'New calendar name' },
      },
      required: ['old_name', 'new_name'],
    },
  },

  // Event Operations
  {
    name: 'create_event',
    description: 'Create a calendar event with natural language date parsing. Supports dates like "tomorrow at 3pm", "next Friday", "in 2 hours"',
    inputSchema: {
      type: 'object',
      properties: {
        calendar: { type: 'string', description: 'Calendar name (defaults to "life")' },
        summary: { type: 'string', description: 'Event title/summary' },
        start: { type: 'string', description: 'Start date/time in natural language' },
        end: { type: 'string', description: 'End date/time in natural language (optional, defaults to 1 hour after start)' },
        location: { type: 'string', description: 'Event location (optional)' },
        description: { type: 'string', description: 'Event description (optional)' },
      },
      required: ['summary', 'start'],
    },
  },
  {
    name: 'list_events',
    description: 'List events in a calendar within a date range. Can use common periods like "today", "tomorrow", "this_week"',
    inputSchema: {
      type: 'object',
      properties: {
        calendar: { type: 'string', description: 'Calendar name (defaults to "life")' },
        start: { type: 'string', description: 'Start date (natural language or common period)' },
        end: { type: 'string', description: 'End date (natural language)' },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'list_all_events',
    description: 'List events from ALL calendars within a date range',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start date (natural language or common period)' },
        end: { type: 'string', description: 'End date (natural language)' },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'search_events',
    description: 'Search for events by keyword across all calendars. Searches event title, location, and description.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Search term to find in events' },
        start: { type: 'string', description: 'Start date for search range (natural language)' },
        end: { type: 'string', description: 'End date for search range (natural language)' },
      },
      required: ['keyword', 'start', 'end'],
    },
  },
  {
    name: 'update_event',
    description: 'Update an existing event\'s properties',
    inputSchema: {
      type: 'object',
      properties: {
        event_uid: { type: 'string', description: 'UID of the event to update' },
        summary: { type: 'string', description: 'New event title (optional)' },
        start: { type: 'string', description: 'New start date/time (optional, natural language)' },
        end: { type: 'string', description: 'New end date/time (optional, natural language)' },
        location: { type: 'string', description: 'New location (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
      },
      required: ['event_uid'],
    },
  },
  {
    name: 'delete_event',
    description: 'Delete an event by its UID',
    inputSchema: {
      type: 'object',
      properties: {
        event_uid: { type: 'string', description: 'UID of the event to delete' },
      },
      required: ['event_uid'],
    },
  },
  {
    name: 'move_event',
    description: 'Move an event to a different calendar',
    inputSchema: {
      type: 'object',
      properties: {
        event_uid: { type: 'string', description: 'UID of the event to move' },
        target_calendar: { type: 'string', description: 'Name of the destination calendar' },
      },
      required: ['event_uid', 'target_calendar'],
    },
  },

  // Smart Scheduling
  {
    name: 'find_free_time',
    description: 'Find available time slots for a meeting. Searches across all calendars to find free time.',
    inputSchema: {
      type: 'object',
      properties: {
        start_search: { type: 'string', description: 'When to start searching (natural language)' },
        end_search: { type: 'string', description: 'When to stop searching (natural language)' },
        duration_minutes: { type: 'number', description: 'Required duration in minutes' },
        business_hours_only: { type: 'boolean', description: 'Only search during business hours (9am-5pm)', default: false },
      },
      required: ['start_search', 'end_search', 'duration_minutes'],
    },
  },
  {
    name: 'check_conflicts',
    description: 'Check if a specific time slot conflicts with existing events',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start date/time (natural language)' },
        end: { type: 'string', description: 'End date/time (natural language)' },
        calendar: { type: 'string', description: 'Specific calendar to check (optional, defaults to all)' },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'suggest_optimal_time',
    description: 'Suggest the best time for a meeting based on preferences and availability',
    inputSchema: {
      type: 'object',
      properties: {
        start_search: { type: 'string', description: 'When to start searching (natural language)' },
        end_search: { type: 'string', description: 'When to stop searching (natural language)' },
        duration_minutes: { type: 'number', description: 'Required duration in minutes' },
        preferred_hours: {
          type: 'array',
          items: { type: 'number' },
          description: 'Preferred hours (0-23), e.g., [9, 10, 11] for morning preference'
        },
      },
      required: ['start_search', 'end_search', 'duration_minutes'],
    },
  },

  // Templates
  {
    name: 'create_template',
    description: 'Save an event configuration as a reusable template',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Template name' },
        summary: { type: 'string', description: 'Event title' },
        duration_minutes: { type: 'number', description: 'Event duration in minutes' },
        location: { type: 'string', description: 'Default location (optional)' },
        description: { type: 'string', description: 'Default description (optional)' },
        calendar: { type: 'string', description: 'Default calendar (optional)' },
      },
      required: ['name', 'summary', 'duration_minutes'],
    },
  },
  {
    name: 'use_template',
    description: 'Create an event from a saved template',
    inputSchema: {
      type: 'object',
      properties: {
        template_name: { type: 'string', description: 'Name of the template to use' },
        start: { type: 'string', description: 'When to schedule the event (natural language)' },
        calendar: { type: 'string', description: 'Override template calendar (optional)' },
        location: { type: 'string', description: 'Override template location (optional)' },
      },
      required: ['template_name', 'start'],
    },
  },
  {
    name: 'list_templates',
    description: 'List all saved event templates',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'delete_template',
    description: 'Delete a saved template',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Template name to delete' },
      },
      required: ['name'],
    },
  },

  // Analytics
  {
    name: 'analyze_schedule',
    description: 'Analyze schedule metrics like meeting density, total meeting time, and daily breakdown',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start of analysis period (natural language)' },
        end: { type: 'string', description: 'End of analysis period (natural language)' },
        calendar: { type: 'string', description: 'Specific calendar to analyze (optional, defaults to all)' },
      },
      required: ['start', 'end'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: 'text', text: 'No arguments provided' }],
      isError: true,
    };
  }

  try {
    switch (name) {
      // Calendar Management
      case 'list_calendars': {
        const calendars = await calendarOps.listCalendars();
        return data(calendars);
      }

      case 'create_calendar': {
        const validation = validateInput(calendarNameSchema, args);
        if (!validation.success) {
          return error(validation.error);
        }

        const { name } = validation.data;

        // Check if calendar already exists
        const exists = await calendarOps.calendarExists(name);
        if (exists) {
          return error(`Calendar "${name}" already exists`);
        }

        await calendarOps.createCalendar(name);
        recordHistory('create', 'calendar', name, null, { name });
        return success(`✓ Created calendar: ${name}`);
      }

      case 'delete_calendar': {
        const validation = validateInput(calendarNameSchema, args);
        if (!validation.success) {
          return error(validation.error);
        }

        const { name } = validation.data;

        // Check if calendar exists
        const exists = await calendarOps.calendarExists(name);
        if (!exists) {
          return error(`Calendar "${name}" not found`);
        }

        recordHistory('delete', 'calendar', name, { name }, null);
        await calendarOps.deleteCalendar(name);
        return success(`✓ Deleted calendar: ${name}`);
      }

      case 'rename_calendar': {
        const oldName = args.old_name as string;
        const newName = args.new_name as string;

        if (!oldName || !newName) {
          return error('Both old_name and new_name are required');
        }

        // Check if old calendar exists
        const exists = await calendarOps.calendarExists(oldName);
        if (!exists) {
          return error(`Calendar "${oldName}" not found`);
        }

        // Check if new name already exists
        const newExists = await calendarOps.calendarExists(newName);
        if (newExists) {
          return error(`Calendar "${newName}" already exists`);
        }

        recordHistory('rename', 'calendar', oldName, { name: oldName }, { name: newName });
        await calendarOps.renameCalendar(oldName, newName);
        return success(`✓ Renamed calendar from "${oldName}" to "${newName}"`);
      }

      // Event Operations
      case 'create_event': {
        const validation = validateInput(createEventSchema, args);
        if (!validation.success) {
          return error(validation.error);
        }

        const { summary, start: startStr, end: endStr, location, description } = validation.data;
        const calendar = validation.data.calendar || getSetting('default_calendar') || 'life';

        // Check if calendar exists
        const exists = await calendarOps.calendarExists(calendar);
        if (!exists) {
          return error(`Calendar "${calendar}" not found. Use list_calendars to see available calendars.`);
        }

        // Parse dates
        let start: Date, end: Date;
        try {
          const parsed = parseDateRange(
            startStr,
            endStr,
            parseInt(getSetting('default_event_duration') || '3600000')
          );
          start = parsed.start;
          end = parsed.end;
        } catch (err: any) {
          return error(`Date parsing failed: ${err.message}`);
        }

        const uid = await eventOps.createEvent(
          calendar,
          summary,
          start,
          end,
          location,
          description
        );

        recordHistory('create', 'event', uid, null, {
          calendar,
          summary,
          start,
          end,
          location,
          description
        });

        return success(
          `✓ Created event: "${summary}"\n  Calendar: ${calendar}\n  When: ${formatDate(start)} - ${formatDate(end)}\n  Duration: ${formatDuration(end.getTime() - start.getTime())}\n  UID: ${uid}`
        );
      }

      case 'list_events': {
        const calendar = (args.calendar as string) || getSetting('default_calendar') || 'life';
        const { start, end } = parseDateRange(args.start as string, args.end as string);

        const events = await eventOps.listEvents(calendar, start, end);

        if (events.length === 0) {
          return success(`No events found in "${calendar}" calendar for this period.`);
        }

        const formatted = formatEventList(events, false);
        return success(`Events in "${calendar}" (${events.length} total):\n\n${formatted}`);
      }

      case 'list_all_events': {
        const { start, end } = parseDateRange(args.start as string, args.end as string);
        const events = await eventOps.listAllEvents(start, end);

        if (events.length === 0) {
          return success('No events found for this period.');
        }

        const formatted = formatEventList(events, true);
        return success(`All events (${events.length} total):\n\n${formatted}`);
      }

      case 'search_events': {
        const keyword = args.keyword as string;
        const { start, end } = parseDateRange(args.start as string, args.end as string);

        const events = await eventOps.searchEvents(start, end, keyword);

        if (events.length === 0) {
          return success(`No events found matching "${keyword}".`);
        }

        const formatted = formatEventList(events, true);
        return success(`Found ${events.length} event${events.length !== 1 ? 's' : ''} matching "${keyword}":\n\n${formatted}`);
      }

      case 'update_event': {
        const validation = validateInput(updateEventSchema, args);
        if (!validation.success) {
          return error(validation.error);
        }

        const { event_uid, summary, start, end, location, description } = validation.data;
        const updates: any = {};

        if (summary !== undefined) updates.summary = summary;
        if (start !== undefined) {
          try {
            updates.startDate = parseDateTime(start);
          } catch (err: any) {
            return error(`Invalid start date: ${err.message}`);
          }
        }
        if (end !== undefined) {
          try {
            updates.endDate = parseDateTime(end);
          } catch (err: any) {
            return error(`Invalid end date: ${err.message}`);
          }
        }
        if (location !== undefined) updates.location = location;
        if (description !== undefined) updates.description = description;

        if (Object.keys(updates).length === 0) {
          return error('No updates provided. Specify at least one field to update.');
        }

        await eventOps.updateEvent(event_uid, updates);
        recordHistory('update', 'event', event_uid, null, updates);

        return success(`✓ Updated event: ${event_uid}`);
      }

      case 'delete_event': {
        const uid = args.event_uid as string;
        if (!uid) {
          return error('Event UID is required');
        }

        recordHistory('delete', 'event', uid, { uid }, null);
        await eventOps.deleteEvent(uid);
        return success(`✓ Deleted event: ${uid}`);
      }

      case 'move_event': {
        const uid = args.event_uid as string;
        const targetCal = args.target_calendar as string;

        if (!uid || !targetCal) {
          return error('Event UID and target calendar are required');
        }

        // Check if target calendar exists
        const exists = await calendarOps.calendarExists(targetCal);
        if (!exists) {
          return error(`Target calendar "${targetCal}" not found`);
        }

        await eventOps.moveEvent(uid, targetCal);
        recordHistory('move', 'event', uid, null, { targetCalendar: targetCal });
        return success(`✓ Moved event ${uid} to calendar: ${targetCal}`);
      }

      // Smart Scheduling
      case 'find_free_time': {
        const validation = validateInput(findFreeTimeSchema, args);
        if (!validation.success) {
          return error(validation.error);
        }

        const { start_search, end_search, duration_minutes, business_hours_only } = validation.data;

        let start: Date, end: Date;
        try {
          const parsed = parseDateRange(start_search, end_search);
          start = parsed.start;
          end = parsed.end;
        } catch (err: any) {
          return error(`Date parsing failed: ${err.message}`);
        }

        const durationMs = duration_minutes * 60 * 1000;
        const allEvents = await eventOps.listAllEvents(start, end);
        const freeSlots = findFreeSlots(start, end, durationMs, allEvents, business_hours_only);

        if (freeSlots.length === 0) {
          return success('No free time slots found for the specified duration.');
        }

        const formatted = freeSlots.slice(0, 10).map(slot =>
          `• ${formatDate(slot.start)} - ${formatDate(slot.end)} (${formatDuration(durationMs)})`
        ).join('\n');

        const moreMsg = freeSlots.length > 10 ? `\n\n(${freeSlots.length - 10} more slots available)` : '';
        return success(`Found ${freeSlots.length} free time slot${freeSlots.length !== 1 ? 's' : ''}:\n\n${formatted}${moreMsg}`);
      }

      case 'check_conflicts': {
        let start: Date, end: Date;
        try {
          const parsed = parseDateRange(args.start as string, args.end as string);
          start = parsed.start;
          end = parsed.end;
        } catch (err: any) {
          return error(`Date parsing failed: ${err.message}`);
        }

        const timeSlot = { start, end };
        const duration = formatDuration(end.getTime() - start.getTime());

        let events;
        if (args.calendar) {
          const cal = args.calendar as string;
          const exists = await calendarOps.calendarExists(cal);
          if (!exists) {
            return error(`Calendar "${cal}" not found`);
          }
          events = await eventOps.listEvents(cal, start, end);
        } else {
          events = await eventOps.listAllEvents(start, end);
        }

        const conflicts = findConflicts(timeSlot, events);

        if (conflicts.length === 0) {
          return success(`✓ Time slot is FREE\n${formatDate(start)} - ${formatDate(end)}\nDuration: ${duration}`);
        }

        const formatted = formatEventList(conflicts, true);
        return success(`⚠ ${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} found:\n\n${formatted}`);
      }

      case 'suggest_optimal_time': {
        const durationMinutes = args.duration_minutes as number;
        if (!durationMinutes || durationMinutes <= 0) {
          return error('Duration must be a positive number');
        }

        let start: Date, end: Date;
        try {
          const parsed = parseDateRange(args.start_search as string, args.end_search as string);
          start = parsed.start;
          end = parsed.end;
        } catch (err: any) {
          return error(`Date parsing failed: ${err.message}`);
        }

        const durationMs = durationMinutes * 60 * 1000;
        const preferredHours = args.preferred_hours as number[] | undefined;

        const allEvents = await eventOps.listAllEvents(start, end);
        const candidates = findFreeSlots(start, end, durationMs, allEvents, false);
        const optimal = findOptimalSlot(candidates, allEvents, preferredHours);

        if (!optimal) {
          return success('No available time slots found for the specified duration.');
        }

        const duration = formatDuration(durationMs);
        return success(`✓ Suggested optimal time:\n${formatDate(optimal.start)} - ${formatDate(optimal.end)}\nDuration: ${duration}`);
      }

      // Templates
      case 'create_template': {
        const stmt = db.prepare(`
          INSERT INTO templates (name, summary, duration, location, description, calendar)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          args.name,
          args.summary,
          (args.duration_minutes as number) * 60 * 1000,
          args.location || null,
          args.description || null,
          args.calendar || null
        );

        return {
          content: [{ type: 'text', text: `✓ Created template: ${args.name}` }],
        };
      }

      case 'use_template': {
        const stmt = db.prepare('SELECT * FROM templates WHERE name = ?');
        const template = stmt.get(args.template_name) as any;

        if (!template) {
          throw new Error(`Template not found: ${args.template_name}`);
        }

        const calendar = (args.calendar as string) || template.calendar || getSetting('default_calendar') || 'life';
        const start = parseDateTime(args.start as string);
        const end = new Date(start.getTime() + template.duration); // duration is already in milliseconds
        const location = (args.location as string) || template.location;

        const uid = await eventOps.createEvent(
          calendar,
          template.summary,
          start,
          end,
          location,
          template.description
        );

        return {
          content: [{
            type: 'text',
            text: `✓ Created event from template "${args.template_name}"\n  ${formatDate(start)} - ${formatDate(end)}\n  UID: ${uid}`
          }],
        };
      }

      case 'list_templates': {
        const stmt = db.prepare('SELECT * FROM templates ORDER BY name');
        const templates = stmt.all() as any[];

        if (templates.length === 0) {
          return {
            content: [{ type: 'text', text: 'No templates saved.' }],
          };
        }

        const formatted = templates.map(t =>
          `• ${t.name}\n  Summary: ${t.summary}\n  Duration: ${t.duration / 60000} minutes${t.location ? `\n  Location: ${t.location}` : ''}`
        ).join('\n\n');

        return {
          content: [{ type: 'text', text: `Templates (${templates.length} total):\n\n${formatted}` }],
        };
      }

      case 'delete_template': {
        const stmt = db.prepare('DELETE FROM templates WHERE name = ?');
        stmt.run(args.name);
        return {
          content: [{ type: 'text', text: `✓ Deleted template: ${args.name}` }],
        };
      }

      // Analytics
      case 'analyze_schedule': {
        const { start, end } = parseDateRange(args.start as string, args.end as string);

        let events;
        if (args.calendar) {
          events = await eventOps.listEvents(args.calendar as string, start, end);
        } else {
          events = await eventOps.listAllEvents(start, end);
        }

        const density = calculateMeetingDensity(events, start, end);
        const totalMs = calculateTotalDuration(events);
        const totalHours = totalMs / (60 * 60 * 1000);
        const grouped = groupEventsByDay(events);

        let dayBreakdown = '';
        for (const [date, dayEvents] of grouped) {
          const dayTotal = calculateTotalDuration(dayEvents);
          const dayHours = (dayTotal / (60 * 60 * 1000)).toFixed(1);
          dayBreakdown += `\n  ${date}: ${dayEvents.length} events, ${dayHours} hours`;
        }

        return {
          content: [{
            type: 'text',
            text: `Schedule Analysis:\n\n` +
              `Total Events: ${events.length}\n` +
              `Total Time: ${totalHours.toFixed(1)} hours\n` +
              `Average Events/Day: ${density.toFixed(1)}\n` +
              `\nDaily Breakdown:${dayBreakdown}`
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Apple Calendar MCP server running on stdio');
}
