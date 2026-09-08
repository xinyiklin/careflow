# Git Workflow

CareFlow branch names, commit messages, and PR titles should use one consistent
style so local history, GitHub PRs, and future changelog work stay easy to
scan.

## Branch Names

Use lowercase kebab-case with a type prefix:

```text
<type>/<short-kebab-task>
```

Supported branch types:

- `feature/` for new product or workflow capabilities.
- `fix/` for bug fixes.
- `refactor/` for behavior-preserving structure changes.
- `deploy/` for deployment or environment branches.

Rules:

- Keep names lowercase.
- Use kebab-case after the slash.
- Make the task specific enough to scan in branch lists.

Examples:

```text
feature/admin-workspace-polish
fix/cors-csrf-domain
refactor/feature-based-architecture
deploy/render
```

## Commit Message Convention

Use Conventional Commit subjects for all normal commits:

```text
<type>: <summary>
```

Rules:

- Use a lowercase type: `feat`, `fix`, `docs`, `style`, `refactor`, `test`,
  `chore`, `build`, `ci`, `perf`, or `revert`.
- Add an optional lowercase noun scope when it helps:
  `<type>(<scope>): <summary>`, such as `schedule`, `patients`, `documents`,
  `admin`, `auth`, `frontend`, `backend`, `deps`, or `workflow`.
- Write the summary in imperative mood: `add`, `fix`, `preserve`, `remove`,
  `split`, not `added`, `fixed`, `preserves`, or `updates`.
- Keep the summary lowercase unless a proper noun, acronym, or code identifier
  requires capitalization.
- Keep the first line short, with about 50 characters as a soft target.
- Do not end the subject with a period.
- Add a body when the why, tradeoff, or verification context will matter later.
- Split unrelated work into separate commits instead of hiding multiple
  intents under one broad subject.

Examples:

```text
feat: add drag-to-reschedule guard
fix: correct CORS header on auth refresh
refactor: move charting into feature module
feat(schedule): add heatmap retry affordance
fix(documents): preserve PDF zoom during resize
docs(workflow): add commit message guidance
refactor(admin): unify workspace shell
chore(deps): repair react-hook-form declarations
```

Avoid mixing styles such as:

```text
Refine sidebar collapse behavior
Feat(schedule): Add filters
updated stuff
```

Breaking changes should follow Conventional Commits:

```text
feat(api)!: require facility id for document uploads

BREAKING CHANGE: document uploads now reject requests without facility scope.
```

## PR Titles

Because CareFlow squash-merges by default (the PR title becomes the squash
commit subject), match the Conventional Commit subject form:

```text
fix: correct CORS header on auth refresh
```

Use plain human-readable sentence case only for PRs that will NOT be
squash-merged:

- Uppercase first letter.
- Verb first.
- No punctuation.

```text
Refine sidebar collapse behavior
```

## PR Workflow

### When to open a PR

When GitHub work is requested, open a PR for every change that touches the repo,
including single-file edits and documentation. Do not commit directly to
`main`. The PR list is the project's portfolio surface and the diff view is a
forced second look at the change.

Coding agents still follow `AGENTS.md`: stay local unless the user explicitly
asks to stage, commit, push, or open a PR.

### Agent push/PR cadence

Coding agents may decide *when* work is push/PR ready (grouping, timing,
base branch). The action itself is not autonomous: before `git push` or
`gh pr create`, the agent surfaces the proposed move (branch, file list,
verification status) and asks the user to proceed or steer to a different
plan. Treat the pause as a planning fork, not a yes/no — the user may
redirect (split the PR, hold for visual review, stack differently, swap
base, drop a change). Approval is an affirmative response in the next turn
("go", "sure", "yes", "proceed"); silence or unrelated follow-up doesn't
count.

On approval, the agent runs the full flow end-to-end: push → open PR →
squash-merge with branch delete (see Merge Strategy below). The user can
shorten the flow per-step in that same approval — "open PR but don't
merge", "push only", "hold the merge", "no auto-merge".

The pause itself can be waived in the original prompt that asks for the
work, with phrases like "push it", "no need to confirm", or "commit and
PR". A waiver applies only to the immediate batch; subsequent pushes need
a fresh nod.

For stacked PRs, follow the rebase sequence in Merge Strategy. If a merge
fails (red CI, branch protection, conflicts), the agent surfaces the
failure and waits for direction; never retries blindly.

### Merge strategy

Default to **squash and merge** so each PR collapses to one commit on `main`.
This keeps the log readable, makes `git revert <sha>` straightforward, and
matches the rest of this doc (PR title becomes the squash commit subject).

```bash
gh pr merge <n> --squash --delete-branch
```

Use **rebase and merge** only when a PR contains 3–8 atomic story commits
that are each independently useful to bisect and contains zero WIP or fixup
noise. This is rare in solo work.

Avoid **merge commits** on solo PRs. A `Merge pull request #N` node adds no
information when the PR is a single coherent change.

For stacked PRs (branch B depends on unmerged branch A), squash-merge A first,
rebase B onto the new `main`, then squash-merge B.

### PR size

Aim for ≤500 lines changed per PR; treat ≤1000 lines as a hard cap. If a PR
grows past ~500 lines, split it. Refactors that enable a feature should ship
as their own PR before the feature PR.

### Verification before opening a PR

CI is a backstop, not the primary check.

Run the minimum gate locally before opening a PR — the full command list lives
in `docs/engineering/testing.md`: affected frontend `lint`/`typecheck`/`build`,
and backend `manage.py check` + `test`. Run only the affected app(s)/subset for
scoped changes, and say what was skipped.

### Self-review

After the verification gate passes, run `/review` on the local diff to catch
issues lint and type checks can't surface: silent failures, test gaps, type
design problems, dead code, and stylistic drift. The skill defaults to a full
sweep across all applicable aspects; narrow it when you want a focused pass:

```bash
/review                    # full sweep (default)
/review code errors        # general code review + error handling
/review tests              # test coverage and quality
```

Findings are returned in chat, grouped by severity. Address critical and
important findings before opening the PR; suggestions are optional.

The `simplify` aspect is intentionally omitted from the default flow. It
applies built-in style defaults (e.g. `function` over arrow, no nested
ternaries, explicit return types) that CareFlow hasn't codified, so it can
suggest churn against the existing house style. Invoke it manually when you
specifically want a polish pass.

For an automated second look once the PR is open, `/code-review` reviews the
PR's diff against project conventions and bug heuristics, with stricter
false-positive filtering than `/review`.

### Safety rules

- Never force-push to `main`. Force-push with `--force-with-lease` is fine on
  feature branches when rewriting history before merge.
- Never bypass pre-commit hooks (`--no-verify`, `--no-gpg-sign`) without an
  explicit reason recorded in the PR body. If a hook fails, fix the underlying
  issue.
- After merging, checkout `main`, run `git pull --ff-only origin main`, and
  confirm the PR's commit landed. `gh pr merge --delete-branch` handles the
  remote feature branch.

## Source Basis

- Conventional Commits 1.0.0 defines the
  `<type>[optional scope]: <description>` structure and the `feat`, `fix`, and
  breaking-change semantics:
  https://www.conventionalcommits.org/en/v1.0.0/
- Git's `SubmittingPatches` guidance recommends logically separate commits,
  short first lines, no final period, lowercase text after an `area:` prefix,
  and imperative mood:
  https://git-scm.com/docs/SubmittingPatches
