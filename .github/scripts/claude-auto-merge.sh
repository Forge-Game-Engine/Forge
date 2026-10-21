#!/usr/bin/env bash
# Squash-merges the open pull request whose head is <sha> when Claude made
# it, every check on that commit has passed, it's small enough, and nobody
# had to step in. Prints why it didn't merge otherwise. When dev has moved
# on and dev's branch protection requires branches to be up to date, it
# merges dev into the pull request instead, and the checks that run on the
# new commit bring it back here.
#
#   claude-auto-merge.sh <sha>    used by claude-auto-merge.yml
#
# A pull request merges only when all of these hold:
#   - Claude opened it: its author is claude[bot] (a `claude` label run) or
#     its branch starts with `claude/` (a Claude Code session).
#   - It targets dev from this repository, isn't a draft and doesn't conflict.
#   - It changes fewer than 35 files, at most 20 of them under src/, in at
#     most 2 folders directly under src/ (src/rendering, src/physics, ...).
#   - It doesn't change .github/, .claude/, AGENTS.md, CLAUDE.md or
#     scripts/changelog/. The review and the changelog check run the pull
#     request's own copy of those, so a change to them could weaken the
#     checks that judge it and then merge itself.
#   - Every job in `required_checks` passed on <sha>, and no other check run
#     or commit status on it is pending or failed. Codecov's are left out:
#     coverage is reported, not enforced.
#   - claude-pr-review.yml reviewed the change being merged. It only runs
#     when the pull request opens, so the reviewed commit is the newest one
#     whose `review` check passed. If commits came after it, the pull
#     request's diff against dev must still be the one that commit had, so
#     merging dev in keeps the review, while a fix round's commits don't.
#   - The latest Forge review, posted after that `review` run started,
#     approves, fails no row of its checklist, and has no findings and
#     nothing that needs a manual check.
#   - No person has left a comment, a review comment or a review other than
#     an approval.
#
# Needs GH_TOKEN and GH_REPO (owner/name) in the environment. Any failed
# GitHub call stops the script with an error, so nothing merges on a value
# that couldn't be read.
set -euo pipefail
shopt -s inherit_errexit

sha=$1
max_files=34
max_src_files=20
max_src_folders=2
review_author='claude[bot]'

# The jobs of ci.yml, test-deploy-docs.yml and changelog.yml, which run on
# every commit. Keep this in sync with their job names. claude-pr-review.yml's
# `review` only runs when the pull request opens, so it's checked on the
# reviewed commit instead.
required_checks=(
  setup lint check-types check-spelling build test test-e2e
  Build check-changelog
)

skip() {
  echo "#$pr isn't merged: $1"
}

# Prints a pull request's change from `git diff dev...<commit>`, one file per
# line, without the hunks' line numbers, which merging dev in shifts. A file
# GitHub shows no patch for (binary or too large) is compared by content.
change_of() {
  gh api "repos/$GH_REPO/compare/dev...$1" --jq '.files | sort_by(.filename)[] |
    [.filename, .previous_filename, .status,
      (if .patch then .patch | gsub("@@[^@\\n]*@@"; "@@") else "blob " + .sha end)] | @json'
}

# Returns 0 when every condition above holds for pull request $pr.
can_merge() {
  local details author branch file check status conclusion verdict
  local commit reviewed='' review_started='' reviewed_change head_change
  local -a files src_folders commits
  local src_files=0
  local -A check_results=()

  details=$(gh api "repos/$GH_REPO/pulls/$pr" --jq '[
    .user.login, .head.ref, .head.sha, .head.repo.full_name, .base.ref,
    .draft, (.mergeable | tostring), .mergeable_state
  ] | @tsv')
  IFS=$'\t' read -r author branch head head_repo base draft mergeable merge_state <<< "$details"

  if [ "$author" != "$review_author" ] && [[ $branch != claude/* ]]; then
    skip "Claude didn't open it."
    return 1
  fi

  if [ "$head" != "$sha" ] || [ "$head_repo" != "$GH_REPO" ] || [ "$base" != dev ]; then
    skip "its head isn't $sha on a branch of $GH_REPO targeting dev."
    return 1
  fi

  if [ "$draft" = true ]; then
    skip 'it is a draft.'
    return 1
  fi

  # null means GitHub hasn't worked it out yet.
  if [ "$mergeable" != true ]; then
    skip "it conflicts with dev, or GitHub hasn't checked yet (mergeable: $mergeable)."
    return 1
  fi

  mapfile -t files < <(gh api --paginate "repos/$GH_REPO/pulls/$pr/files" --jq '.[].filename')

  if [ "${#files[@]}" -gt "$max_files" ]; then
    skip "it changes ${#files[@]} files; at most $max_files may change."
    return 1
  fi

  # A file moved out of a folder works on that folder too.
  mapfile -t src_folders < <(
    gh api --paginate "repos/$GH_REPO/pulls/$pr/files" \
      --jq '.[] | .filename, (.previous_filename // empty)' |
      sed -nE 's#^src/([^/]+)/.*#\1#p' | sort -u
  )

  for file in "${files[@]}"; do
    if [[ $file == .github/* || $file == .claude/* || $file == AGENTS.md ||
      $file == CLAUDE.md || $file == scripts/changelog/* ]]; then
      skip "it changes $file."
      return 1
    fi

    if [[ $file == src/* ]]; then
      src_files=$((src_files + 1))
    fi
  done

  if [ "$src_files" -gt "$max_src_files" ]; then
    skip "it changes $src_files files under src/; at most $max_src_files may change."
    return 1
  fi

  if [ "${#src_folders[@]}" -gt "$max_src_folders" ]; then
    skip "it changes ${#src_folders[@]} folders under src/ (${src_folders[*]}); at most $max_src_folders may change."
    return 1
  fi

  # The API returns the latest run of each check by default.
  while IFS=$'\t' read -r check status conclusion; do
    if [ "$status" != completed ]; then
      skip "check \"$check\" is still $status."
      return 1
    fi

    if [[ $conclusion != success && $conclusion != skipped && $conclusion != neutral ]]; then
      skip "check \"$check\" concluded $conclusion."
      return 1
    fi

    check_results[$check]=$conclusion
  done < <(
    gh api --paginate "repos/$GH_REPO/commits/$sha/check-runs" \
      --jq '.check_runs[] | select(.name | startswith("codecov/") | not) |
        [.name, .status, (.conclusion // "")] | @tsv'
  )

  for check in "${required_checks[@]}"; do
    if [ "${check_results[$check]:-}" != success ]; then
      skip "required check \"$check\" hasn't passed on $sha."
      return 1
    fi
  done

  if [ -n "$(gh api "repos/$GH_REPO/commits/$sha/status" --jq '.statuses[] | select(.state != "success" and (.context | startswith("codecov/") | not)) | .context')" ]; then
    skip "a commit status on $sha is pending or failed."
    return 1
  fi

  # A person who reviewed or commented had to step in. An approval only
  # agrees with what's there.
  if [ -n "$(gh api --paginate "repos/$GH_REPO/issues/$pr/comments" --jq '.[] | select(.user.type != "Bot") | .id')" ] ||
    [ -n "$(gh api --paginate "repos/$GH_REPO/pulls/$pr/comments" --jq '.[] | select(.user.type != "Bot") | .id')" ] ||
    [ -n "$(gh api --paginate "repos/$GH_REPO/pulls/$pr/reviews" --jq '.[] | select(.user.type != "Bot" and .state != "APPROVED") | .id')" ]; then
    skip 'a person commented on it or reviewed it.'
    return 1
  fi

  mapfile -t commits < <(gh api --paginate "repos/$GH_REPO/pulls/$pr/commits" --jq '.[].sha')

  for ((i = ${#commits[@]} - 1; i >= 0; i--)); do
    commit=${commits[i]}
    review_started=$(
      gh api "repos/$GH_REPO/commits/$commit/check-runs?check_name=review" \
        --jq '[.check_runs[] | select(.conclusion == "success") | .started_at][0] // ""'
    )

    if [ -n "$review_started" ]; then
      reviewed=$commit
      break
    fi
  done

  if [ -z "$reviewed" ]; then
    skip 'no commit on it has a passed "review" check.'
    return 1
  fi

  if [ "$reviewed" != "$sha" ]; then
    reviewed_change=$(change_of "$reviewed")
    head_change=$(change_of "$sha")

    if [ "$reviewed_change" != "$head_change" ]; then
      skip "its change differs from the reviewed commit $reviewed."
      return 1
    fi
  fi

  # Only a comment posted after that `review` run started reviewed this
  # change. --paginate runs the filter on each page, so take the last match
  # of all. ISO 8601 UTC times compare as strings.
  verdict=$(
    gh api --paginate "repos/$GH_REPO/issues/$pr/comments" \
      --jq ".[] | select(.user.login == \"$review_author\" and
        .created_at >= \"$review_started\" and
        (.body | startswith(\"## Forge review\"))) | .body | @json" |
      tail -n 1
  )

  if [ -z "$verdict" ]; then
    skip "it has no Forge review of $reviewed."
    return 1
  fi

  verdict=$(jq -r . <<< "$verdict")

  if ! grep -qxF '**Verdict:** APPROVE' <<< "$verdict"; then
    skip "the Forge review didn't approve it."
    return 1
  fi

  # A failed checklist row stops the merge too, in case the report's
  # headings change.
  if grep -qE '^\|.*\|[[:space:]]*fail[[:space:]]*\|[[:space:]]*$' <<< "$verdict" ||
    grep -qxE '### (Findings|Needs a manual check)' <<< "$verdict"; then
    skip 'the Forge review failed a check or left findings or a manual check for a person.'
    return 1
  fi

  # dev's branch protection only reports `behind` when it requires an
  # up-to-date branch, so the merge would be refused.
  if [ "$merge_state" = behind ]; then
    gh api -X PUT "repos/$GH_REPO/pulls/$pr/update-branch" -f expected_head_sha="$sha" > /dev/null
    skip "dev has moved on, so dev was merged into it. It merges once the checks pass on the new commit."
    return 1
  fi
}

mapfile -t prs < <(gh api "repos/$GH_REPO/commits/$sha/pulls" --jq '.[] | select(.state == "open") | .number')

if [ "${#prs[@]}" -eq 0 ]; then
  echo "No open pull request has $sha as its head."
  exit 0
fi

for pr in "${prs[@]}"; do
  if can_merge; then
    # Fails instead of merging if someone pushed since the checks ran.
    gh pr merge "$pr" --repo "$GH_REPO" --squash --match-head-commit "$sha"
    echo "#$pr merged."
  fi
done
