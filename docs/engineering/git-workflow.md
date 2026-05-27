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

PR titles default to human-readable sentence case:

- Uppercase first letter.
- Verb first.
- No punctuation.

Example PR title:

```text
Refine sidebar collapse behavior
```

If the merge strategy uses the PR title as the squash-merge commit subject,
match the commit convention instead so the merged history stays consistent:

```text
fix: correct CORS header on auth refresh
```

## PR Workflow

### When to open a PR

Open a PR for every change that touches the repo, including single-file edits
and documentation. Do not commit directly to `main`. The PR list is the
project's portfolio surface and the diff view is a forced second look at the
change.

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

Run the minimum gate locally before opening a PR. CI is a backstop, not the
primary check.

```bash
# Frontend
cd frontend
npx eslint src
npx tsc --noEmit
npm run build

# Backend
cd backend
./venv/bin/python manage.py check
./venv/bin/python manage.py test
```

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
