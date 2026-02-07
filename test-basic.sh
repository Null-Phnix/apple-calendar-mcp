#!/bin/bash

# Basic verification script for Apple Calendar MCP Server

echo "=== Apple Calendar MCP Server - Basic Verification ==="
echo

echo "1. Checking Apple Calendar access..."
if osascript -e 'tell application "Calendar" to get name of calendars' >/dev/null 2>&1; then
    echo "   ✓ Apple Calendar access working"
    calendars=$(osascript -e 'tell application "Calendar" to get name of calendars')
    echo "   Available calendars: $calendars"
else
    echo "   ✗ Cannot access Apple Calendar"
    echo "   Please grant automation permissions in System Preferences"
    exit 1
fi

echo
echo "2. Checking project build..."
if [ -f "$HOME/mcp-servers/calendar/dist/index.js" ]; then
    echo "   ✓ Project built successfully"
else
    echo "   ✗ Project not built. Run: npm run build"
    exit 1
fi

echo
echo "3. Checking database..."
if [ -f "$HOME/mcp-servers/calendar/storage/calendar.db" ]; then
    echo "   ✓ Database created"
    settings_count=$(sqlite3 "$HOME/mcp-servers/calendar/storage/calendar.db" "SELECT COUNT(*) FROM settings;")
    echo "   Settings configured: $settings_count"
else
    echo "   ✗ Database not created"
    exit 1
fi

echo
echo "4. Checking Claude Code configuration..."
config_file="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$config_file" ]; then
    if grep -q "apple-calendar" "$config_file"; then
        echo "   ✓ MCP server configured in Claude Code"
    else
        echo "   ✗ MCP server not found in configuration"
        exit 1
    fi
else
    echo "   ✗ Claude Code config file not found"
    exit 1
fi

echo
echo "5. Testing date parsing (chrono-node)..."
node -e "const chrono = require('chrono-node'); const date = chrono.parseDate('tomorrow at 3pm'); console.log('   Parsed \"tomorrow at 3pm\" to:', date);"

echo
echo "=== All checks passed! ==="
echo
echo "Next steps:"
echo "1. Restart Claude Code"
echo "2. The server will auto-start and be available"
echo "3. Try: 'List my calendars' or 'Create event tomorrow at 3pm'"
echo
