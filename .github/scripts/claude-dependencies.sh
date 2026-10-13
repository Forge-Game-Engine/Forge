#!/usr/bin/env bash
# Holds `claude`-labeled issues until the issues they depend on have closed.
# An issue's dependencies are the `#N` references on its lines that start
# with "Depends on" (the format the plan-milestone skill writes). An issue
# closed for any reason, including as not planned, counts as done.
#
#   claude-dependencies.sh gate <issue>   used by claude.yml before a label run
#   claude-dependencies.sh unblock        used by claude-unblock.yml
#
# Needs GH_TOKEN and GH_REPO (owner/name) in the environment.
set -euo pipefail

waiting_label='claude-waiting'
declare -A dependency_states=()

# Prints the issue's dependencies that are still open, one number per line.
open_dependencies() {
  local issue=$1 dependency state

  for dependency in $(
    gh api "repos/$GH_REPO/issues/$issue" --jq '.body // ""' |
      grep -iE '^[[:space:]]*depends on' |
      grep -oE '#[0-9]+' | tr -d '#' | sort -un
  ); do
    if [ "$dependency" = "$issue" ]; then
      continue
    fi

    if [ -z "${dependency_states[$dependency]:-}" ]; then
      dependency_states[$dependency]=$(gh api "repos/$GH_REPO/issues/$dependency" --jq .state)
    fi

    state=${dependency_states[$dependency]}

    if [ "$state" = 'open' ]; then
      echo "$dependency"
    fi
  done
}

gate() {
  local issue=$1 open

  open=$(open_dependencies "$issue")

  if [ -z "$open" ]; then
    echo 'blocked=false' >> "$GITHUB_OUTPUT"
    return
  fi

  # Park the issue before checking again, so a dependency that closes in
  # between is either seen here or finds the issue waiting in
  # claude-unblock.yml's scan.
  gh label create "$waiting_label" --force --color c5def5 \
    --description 'Labeled claude; waiting for its dependencies to close'
  gh issue edit "$issue" --remove-label claude --add-label "$waiting_label"
  dependency_states=()
  open=$(open_dependencies "$issue")

  if [ -z "$open" ]; then
    gh issue edit "$issue" --remove-label "$waiting_label"
    echo 'blocked=false' >> "$GITHUB_OUTPUT"
    return
  fi

  gh issue comment "$issue" --body "Waiting for $(sed 's/^/#/' <<< "$open" | paste -sd ' ') to close before starting. This issue is labeled \`$waiting_label\`, and gets the \`claude\` label back once every issue on its \`Depends on\` lines has closed."
  echo 'blocked=true' >> "$GITHUB_OUTPUT"
}

# Re-checks every waiting issue, not only the ones that name the issue that
# just closed: a run cancelled by the concurrency group is caught up by the
# next one.
unblock() {
  local issue

  for issue in $(
    gh api --paginate "repos/$GH_REPO/issues?state=open&labels=$waiting_label&per_page=100" \
      --jq '.[] | select(.pull_request == null) | .number'
  ); do
    if [ -z "$(open_dependencies "$issue")" ]; then
      echo "Unblocking #$issue"
      gh issue edit "$issue" --remove-label "$waiting_label" --add-label claude
    fi
  done
}

"$@"
