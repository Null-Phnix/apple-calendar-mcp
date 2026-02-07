#!/bin/bash
# This script will trigger a permission dialog for osascript
osascript -e 'tell application "Calendar" to get name of calendars'
