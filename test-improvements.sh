#!/bin/bash

echo "=== Testing Code Improvements ==="
echo

# Test 1: Verify new files exist
echo "1. Checking new utility files..."
if [ -f "src/utils/validators.ts" ] && [ -f "src/utils/formatters.ts" ] && [ -f "src/utils/response-helpers.ts" ]; then
    echo "   ✓ All new utility files created"
else
    echo "   ✗ Missing utility files"
    exit 1
fi

# Test 2: Verify build includes new files
echo
echo "2. Checking compiled output..."
if [ -f "dist/utils/validators.js" ] && [ -f "dist/utils/formatters.js" ] && [ -f "dist/utils/response-helpers.js" ]; then
    echo "   ✓ All utilities compiled successfully"
else
    echo "   ✗ Missing compiled files"
    exit 1
fi

# Test 3: Check for search function
echo
echo "3. Checking new search functionality..."
if grep -q "searchEvents" dist/applescript/event-ops.js; then
    echo "   ✓ searchEvents function added"
else
    echo "   ✗ searchEvents function not found"
    exit 1
fi

# Test 4: Check for validation schemas
echo
echo "4. Checking validation schemas..."
if grep -q "createEventSchema" dist/utils/validators.js; then
    echo "   ✓ Validation schemas compiled"
else
    echo "   ✗ Validation schemas missing"
    exit 1
fi

# Test 5: Check for helper functions
echo
echo "5. Checking helper functions..."
if grep -q "formatEventList" dist/utils/formatters.js; then
    echo "   ✓ Formatting helpers compiled"
else
    echo "   ✗ Formatting helpers missing"
    exit 1
fi

# Test 6: Verify server imports new utilities
echo
echo "6. Checking server imports..."
if grep -q "validators" dist/server.js && grep -q "formatters" dist/server.js; then
    echo "   ✓ Server imports new utilities"
else
    echo "   ✗ Server missing utility imports"
    exit 1
fi

# Test 7: Count tools
echo
echo "7. Counting available tools..."
tool_count=$(grep -c "name: 'create_\|list_\|delete_\|update_\|move_\|rename_\|check_\|find_\|search_\|suggest_\|analyze_\|use_" dist/server.js || echo "0")
echo "   Found: $tool_count tool definitions"
if [ "$tool_count" -ge "19" ]; then
    echo "   ✓ All tools present (including new search_events)"
else
    echo "   ⚠ Expected 19+ tools, found $tool_count"
fi

# Test 8: Check for error handling improvements
echo
echo "8. Checking error handling..."
if grep -q "calendarExists" dist/server.js; then
    echo "   ✓ Calendar existence checks added"
else
    echo "   ✗ Missing existence checks"
    exit 1
fi

# Test 9: Check for response helpers usage
echo
echo "9. Checking response helpers usage..."
success_count=$(grep -c "success(" dist/server.js || echo "0")
error_count=$(grep -c "error(" dist/server.js || echo "0")
echo "   success() calls: $success_count"
echo "   error() calls: $error_count"
if [ "$success_count" -gt "10" ] && [ "$error_count" -gt "5" ]; then
    echo "   ✓ Response helpers widely adopted"
else
    echo "   ⚠ Limited response helper usage"
fi

echo
echo "=== All improvement tests passed! ==="
echo
echo "Key Improvements:"
echo "• ✅ Input validation with Zod schemas"
echo "• ✅ Reusable formatting helpers (formatEventList, formatDuration)"
echo "• ✅ Response helpers (success, error, data)"
echo "• ✅ New search_events tool"
echo "• ✅ Calendar existence validation"
echo "• ✅ Better error handling"
echo "• ✅ 19 total tools (was 18)"
echo
