# Apple Calendar MCP Server - Quick Start Guide

## ✅ Ready to Use!

Your Apple Calendar MCP server is installed and configured. Just **restart Claude Code** to start using it!

## Quick Reference

### 📅 Calendar Commands

```
List my calendars
Create a calendar called [Name]
Delete the [Name] calendar
Rename [OldName] to [NewName]
```

### 📝 Event Commands

```
Create event '[Title]' [when] in [calendar]
List events in [calendar] from [start] to [end]
List all my events this week
Update event [UID] with [changes]
Delete event [UID]
Move event [UID] to [calendar]
```

### 🧠 Smart Scheduling

```
Find free time [when] for [duration] minutes
Check if I'm free [when]
Suggest optimal time for [duration] minutes, I prefer [morning/afternoon]
Find free time during business hours only
```

### 📋 Templates

```
Create a template called '[name]' with [duration] minute duration
Use template '[name]' [when]
List my templates
Delete template '[name]'
```

### 📊 Analytics

```
Analyze my schedule for [period]
Show insights for this week
How busy am I next month?
```

## Natural Language Examples

The server understands phrases like:

- **"tomorrow at 3pm"**
- **"next Friday"**
- **"in 2 hours"**
- **"this weekend"**
- **"Jan 15 at 10:30am"**
- **"next Tuesday at 10am"**

## Common Workflows

### Schedule a Meeting
```
1. "Find free time tomorrow for 1 hour"
2. "Create event 'Team Standup' tomorrow at 10am"
3. "Check if there are conflicts"
```

### Use Templates for Recurring Meetings
```
1. "Create a template called 'standup' with 15 minute duration"
2. Every day: "Schedule a standup tomorrow at 9am"
```

### Analyze Your Week
```
1. "Analyze my schedule for this week"
2. See meeting density, total hours, daily breakdown
```

## Troubleshooting

### Server not working after restart?
1. Check logs: `~/Library/Logs/Claude/`
2. Verify build: `cd ~/mcp-servers/calendar && npm run build`
3. Test server: `./test-basic.sh`

### Calendar access denied?
- System Preferences → Security & Privacy → Privacy → Automation
- Enable your terminal app to control Calendar

## Files & Locations

- **Server code:** `~/mcp-servers/calendar/`
- **Database:** `~/mcp-servers/calendar/storage/calendar.db`
- **Configuration:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Full docs:** `~/mcp-servers/calendar/README.md`

## Default Settings

- Primary calendar: **"life"**
- Event duration: **1 hour**
- Business hours: **9am - 5pm**

## Available Tools (18)

| Category | Tools |
|----------|-------|
| Calendar Management | list_calendars, create_calendar, delete_calendar, rename_calendar |
| Events | create_event, list_events, list_all_events, update_event, delete_event, move_event |
| Smart Scheduling | find_free_time, check_conflicts, suggest_optimal_time |
| Templates | create_template, use_template, list_templates, delete_template |
| Analytics | analyze_schedule |

## Ready to Use!

Just ask Claude to help with your calendar:
- "What's on my schedule today?"
- "Find time for a meeting tomorrow"
- "Create an event for dentist next week"

**The server auto-starts with Claude Code - no manual startup needed!** 🚀
