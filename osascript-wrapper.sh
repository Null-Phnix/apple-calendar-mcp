#!/bin/bash
# Wrapper script to run osascript with proper permissions
# This ensures osascript runs in the authenticated shell context

# Set the command to execute in the current shell environment
# This inherits permissions from the parent terminal
exec /usr/bin/osascript "$@"
