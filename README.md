# Apple Calendar MCP Server

[![macOS Only](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> **Note:** This MCP server requires macOS with Apple Calendar.

A Model Context Protocol (MCP) server that provides Claude with full access to Apple Calendar for smart scheduling, calendar management, and time management assistance.

---

## Table of Contents

- [Why I Built This](#why-i-built-this)
- [Features](#features)
- [Current Pain Points](#current-pain-points)
- [End Goals](#end-goals--where-this-is-headed)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Technical Details](#technical-details)
- [Configuration](#configuration)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## Why I Built This

Apple's Calendar.app is fine for looking at your schedule. It's garbage for adding events. "Create an event Team Meeting tomorrow at 2pm in the Work calendar" — you can't do that without clicking 6 times. Natural language scheduling doesn't exist in Apple's UI.

I wanted my agent to handle scheduling like it handles everything else: via tool calls. "Lunch with Sarah at 1pm" → calendar entry. "Find free time tomorrow for a 1-hour meeting" → time slot suggestions. "Am I free Friday at 3pm?" → yes/no with conflict details.

This is an MCP server because Claude Code should be able to schedule things the same way it edits code or runs tests — as a tool call, not a manual GUI interaction.

---

## Features

### Calendar Management
- **list_calendars** - List all available calendars
- **create_calendar** - Create new calendars
- **delete_calendar** - Delete calendars
- **rename_calendar** - Rename existing calendars

### Event Operations
- **create_event** - Create events with natural language date parsing
  - Supports "tomorrow at 3pm", "next Friday", "in 2 hours", etc.
- **list_events** - List events in a specific calendar
- **list_all_events** - List events across all calendars
- **search_events** - Search for events by keyword (searches title, location, description)
- **update_event** - Update event properties
- **delete_event** - Delete events
- **move_event** - Move events between calendars

### Smart Scheduling
- **find_free_time** - Find available time slots
  - Optional business hours filter (9am-5pm)
- **check_conflicts** - Check for scheduling conflicts
- **suggest_optimal_time** - AI-powered time suggestions with preferences

### Templates
- **create_template** - Save event configurations as reusable templates
- **use_template** - Create events from templates
- **list_templates** - View all saved templates
- **delete_template** - Remove templates

### Analytics
- **analyze_schedule** - Get insights on:
  - Meeting density (meetings per day)
  - Total time spent in meetings
  - Daily breakdown of schedule

---

## Current Pain Points

These are the battles I'm actively fighting:

1. **AppleScript is the only interface** — Calendar.app has no public API. Everything goes through `osascript` which is brittle, slow, and has no error handling. If Calendar.app is in a weird state (syncing, locked, backgrounded), AppleScript hangs or returns garbage.

2. **macOS-only** — This inherently locks out my Linux desktop. I can't run this on my main machine. It only works on the MacBook at work. For an agent ecosystem that should run everywhere, this is a limitation I haven't solved.

3. **Permission dialogs are user-hostile** — "Allow Terminal to control Calendar?" — macOS shows this dialog once, and if the user clicks "Don't Allow" by accident, the server fails silently forever. Resetting permissions requires deep System Preferences navigation.

4. **No recurring events** — The server can create one-off events but not recurring ones ("every Monday at 9am"). AppleScript supports RRULE but the MCP server doesn't expose it yet. This is the most requested missing feature.

5. **Date parsing edge cases** — `chrono-node` handles 95% of natural language dates but fails on ambiguous cases ("next week" when it's Sunday, "this weekend" on a Saturday). I have fallback logic but it's heuristic.

6. **No sync status awareness** — Calendar.app might be syncing with iCloud when you create an event. The AppleScript returns success but the event doesn't appear for 30 seconds. The server has no way to know if the event actually landed.

---

## End Goals — Where This Is Headed

### Short Term (now → 3 months)
- **Recurring events** — expose RRULE through AppleScript, support "every Monday at 9am"
- **Better permission handling** — detect permission failures, provide clear instructions for fixing
- **Sync status polling** — verify events actually appeared after creation

### Medium Term (3–6 months)
- **Cross-platform calendar** — abstract the calendar backend so it works with Google Calendar API (Linux) and Apple Calendar (macOS) through the same MCP interface
- **Integration with agent ecosystem** — JobHound schedules interview reminders, Blackreach schedules research deadlines, all through the same calendar interface
- **Proactive scheduling** — "You have 3 hours free tomorrow afternoon — want me to schedule that Deep Work block?"

### Long Term (6–12 months)
- **Universal calendar agent** — one MCP server that talks to Apple Calendar, Google Calendar, Outlook, and any CalDAV server
- **Schedule optimization** — analyze your patterns, suggest better meeting times, protect Deep Work blocks, automatically decline low-priority conflicts
- **Integration with Bifrost** — mythology research deadlines, agent task schedules, all visible in one calendar view

---

## Installation

### Prerequisites
- macOS (required for Apple Calendar)
- Node.js 20+ and npm
- Apple Calendar app
- Claude Code CLI

### Setup

1. **Clone/Install the server:**
   ```bash
   cd ~/mcp-servers/calendar
   npm install
   npm run build
   ```

2. **Grant Calendar Access:**
   - System Preferences > Security & Privacy > Privacy > Automation
   - Enable Terminal (or your terminal app) to control Calendar

3. **Configure Claude Code:**

   The server is already configured in:
   `~/Library/Application Support/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "apple-calendar": {
         "command": "node",
         "args": [
           "/path/to/apple-calendar-mcp/dist/index.js"
         ]
       }
     }
   }
   ```

4. **Restart Claude Code:**

   The server will auto-start when Claude Code launches.

---

## Usage Examples

### Basic Calendar Operations

```
"List my calendars"
"Create a calendar called Work"
"Rename the Work calendar to Office"
"Delete the Test calendar"
```

### Creating Events

```
"Create an event 'Team Meeting' tomorrow at 2pm in the life calendar"
"Schedule 'Dentist Appointment' next Tuesday at 10am with 1 hour duration"
"Add 'Coffee with Sarah' at 3pm today at Starbucks"
```

### Natural Language Date Parsing

The server understands:
- "tomorrow at 3pm"
- "next Friday"
- "in 2 hours"
- "Jan 15 at 10:30am"
- "this weekend"

### Smart Scheduling

```
"Find free time tomorrow for a 1 hour meeting"
"Check if I'm free Friday at 3pm"
"Suggest the best time for a meeting next week, I prefer mornings"
"Find free time during business hours only"
```

### Searching Events

```
"Search for 'dentist' events this month"
"Find all events with 'meeting' in the title from last week"
"Search for events at 'Starbucks' this year"
```

### Using Templates

```
"Create a template called 'standup' with 15 minute duration"
"Schedule a standup meeting from template tomorrow at 9am"
"List all my templates"
```

### Analytics

```
"Analyze my schedule for this week"
"Show insights for next week"
"How busy am I this month?"
```

---

## Architecture

```
~/mcp-servers/calendar/
├── src/
│   ├── index.ts                 # Entry point
│   ├── server.ts                # MCP server with all tools
│   ├── applescript/
│   │   ├── bridge.ts            # AppleScript execution wrapper
│   │   ├── calendar-ops.ts      # Calendar CRUD operations
│   │   └── event-ops.ts         # Event CRUD operations
│   ├── utils/
│   │   ├── date-parser.ts       # Natural language date parsing (chrono-node)
│   │   └── conflict-detector.ts # Conflict detection & free time finding
│   └── storage/
│       └── database.ts          # SQLite for templates & history
├── storage/
│   └── calendar.db              # SQLite database (auto-created)
└── dist/                        # Compiled JavaScript
```

---

## Technical Details

### Natural Language Processing
- Uses `chrono-node` for parsing natural language dates
- Supports relative dates, absolute dates, and common phrases
- Automatically handles time zones and ambiguity

### AppleScript Integration
- Direct `osascript` calls for reliable Calendar access
- Proper date formatting for AppleScript
- String escaping to prevent injection attacks
- Error handling for Calendar API failures

### Data Storage
- SQLite database for templates and history
- Settings for default preferences
- Undo history (last 100 operations)

### Conflict Detection
- Efficient time slot overlap checking
- Free time finding with configurable intervals
- Business hours filtering
- Optimal time suggestions based on preferences

---

## Configuration

Default settings (stored in SQLite):
- `default_calendar`: "life"
- `default_event_duration`: 1 hour (3600000 ms)
- `business_hours_start`: 9 (9am)
- `business_hours_end`: 17 (5pm)

---

## Development

### Build
```bash
npm run build
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Debug with MCP Inspector
```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

---

## Troubleshooting

### "Calendar access not allowed"
**Solution:** Grant automation permissions in System Preferences > Security & Privacy > Privacy > Automation

### Server not connecting
1. Check logs in `~/Library/Logs/Claude/`
2. Verify build succeeded: `npm run build`
3. Test directly: `npx tsx src/index.ts`
4. Ensure Calendar.app is not in a broken state

### Date parsing fails
- chrono-node handles most common formats
- For edge cases, use explicit formats like "2024-01-15 10:30am"
- Check the input format in the error message

### Events not appearing
1. Verify calendar name matches exactly (case-sensitive)
2. Check if Calendar.app is running
3. Refresh Calendar.app view

---

## Future Enhancements

Potential features for v2:
- Recurring events with RRULE support
- Attendee management
- Location autocomplete
- Video conferencing link generation
- iCal import/export
- Proactive schedule optimization
- ML-based event categorization

---

## License

MIT

## Author

Built by [Null-Phnix](https://github.com/Null-Phnix)
