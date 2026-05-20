# Git Workflow

CareFlow commit messages should use one consistent style so local history,
GitHub PRs, and future changelog work stay easy to scan.

## Commit Message Convention

Use Conventional Commit subjects for all normal commits:

```text
<type>(<scope>): <summary>
```

Rules:

- Use a lowercase type: `feat`, `fix`, `docs`, `style`, `refactor`, `test`,
  `chore`, `build`, `ci`, `perf`, or `revert`.
- Use a lowercase noun scope when it helps: `schedule`, `patients`,
  `documents`, `admin`, `auth`, `frontend`, `backend`, `deps`, or `workflow`.
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

PR titles follow the repository PR template, not the commit subject format:

- Uppercase first letter.
- Verb first.
- No punctuation.

Example PR title:

```text
Refine sidebar collapse behavior
```

The corresponding commit subject should still use the commit convention:

```text
style(sidebar): refine collapse behavior
```

## Source Basis

- Conventional Commits 1.0.0 defines the
  `<type>[optional scope]: <description>` structure and the `feat`, `fix`, and
  breaking-change semantics:
  https://www.conventionalcommits.org/en/v1.0.0/
- Git's `SubmittingPatches` guidance recommends logically separate commits,
  short first lines, no final period, lowercase text after an `area:` prefix,
  and imperative mood:
  https://git-scm.com/docs/SubmittingPatches
