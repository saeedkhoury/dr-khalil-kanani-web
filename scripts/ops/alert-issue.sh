#!/usr/bin/env bash
# Open ONE alert issue per failing check, or comment on the one already open.
# Used only by .github/workflows/scheduled-check.yml. Its only write is to this
# repository's issues; it never touches production.
#
#   bash scripts/ops/alert-issue.sh "<issue title>"
#
# Needs GH_TOKEN, GITHUB_REPOSITORY, GITHUB_SERVER_URL and GITHUB_RUN_ID (all
# set by GitHub Actions). The body is ops-problems.md when the check wrote one.
set -euo pipefail

title="${1:?usage: alert-issue.sh <title>}"
run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"

body_file="$(mktemp)"
{
  if [[ -s ops-problems.md ]]; then cat ops-problems.md; else echo "The check failed before it could write a report."; fi
  echo
  echo "Run: ${run_url}"
  echo
  echo "Runbook: docs/company/04-platform.md → Incident response. Close this issue once the check passes again."
} > "$body_file"

existing="$(gh issue list --repo "$GITHUB_REPOSITORY" --state open --search "\"${title}\" in:title" \
  --json number,title --jq ".[] | select(.title == \"${title}\") | .number" | head -1)"

if [[ -n "$existing" ]]; then
  gh issue comment "$existing" --repo "$GITHUB_REPOSITORY" --body-file "$body_file"
  echo "Commented on open issue #${existing}"
else
  gh issue create --repo "$GITHUB_REPOSITORY" --title "$title" --body-file "$body_file"
fi
