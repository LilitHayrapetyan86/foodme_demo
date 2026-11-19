#!/usr/bin/env bash
# Claude Code status line: shows the STLC step of the feature-testing run, but only
# in a session where /feature-testing-pipeline was triggered. Other sessions get an
# empty line. The pipeline skill writes the line to runs/<T>/status; this only prints it.
input=$(cat) # session JSON from Claude Code; we need transcript_path

transcript=$(printf '%s' "$input" | grep -o '"transcript_path" *: *"[^"]*"' | head -n 1 | sed 's/.*: *"//; s/"$//')
[ -f "$transcript" ] || exit 0

# Triggered by the slash command (user message) or by the Skill tool (assistant tool_use).
# The patterns use unescaped quotes, so text that merely mentions them inside a tool
# result (JSON-escaped there) doesn't count.
slash='"content":"<command-message>feature-testing-pipeline</command-message>'
tool='"name":"Skill","input":{"skill":"feature-testing-pipeline"'
grep -qF -e "$slash" -e "$tool" "$transcript" || exit 0

runs="${CLAUDE_PROJECT_DIR:-$PWD}/agentic-workflows/functional-testing/runs"

# Prefer the ticket passed to the last slash command in this session.
ticket=$(grep -oE "${slash}[^<]*<command-name>[^<]*</command-name>[^<]*<command-args>[^<]*</command-args>" "$transcript" \
  | tail -n 1 | sed 's/.*<command-args>//; s/<\/command-args>.*//; s/^ *//; s/ *$//')

if [ -n "$ticket" ] && [ -f "$runs/$ticket/status" ]; then
  status="$runs/$ticket/status"
else
  status=$(ls -t "$runs"/*/status 2>/dev/null | head -n 1)
fi

if [ -n "$status" ]; then
  head -n 1 "$status"
else
  echo "Feature Testing ${ticket:-} │ starting"
fi
