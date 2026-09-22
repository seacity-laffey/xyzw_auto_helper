# Repository Branch Conventions

## Branch Roles

- `upstream/main` is the original project's update source.
- `main` is this fork's upstream synchronization branch. Keep project-specific
  development and release changes out of it.
- `refactor/dev` is this project's primary development branch for custom features,
  fixes, and releases. Its name does not make it a temporary refactoring branch.

## Synchronization and Merge Direction

- The intended update direction is `upstream/main` -> `main` -> `refactor/dev`.
- Bring upstream changes into `refactor/dev` only when an integration is requested,
  preserving this project's custom behavior and verifying affected functionality.
- Do not merge `refactor/dev` into `main` or use `main` as the default target for
  project-specific pull requests unless the user explicitly changes this policy.
- A request to check for upstream updates authorizes inspection and fetching,
  not merging, rebasing, or pushing.

## Working Practices

- Check the current branch and working tree before editing or performing Git
  operations. Do not switch branches with unrelated changes without preserving
  them safely.
- Use `refactor/dev` as the base and integration target for project-specific work.
  If using a task branch, branch from and target `refactor/dev`.
- Do not rename branches, change the remote default branch, or rewrite branch
  history without explicit user authorization.
- Report synchronization status for `main` separately from development status for
  `refactor/dev`; an up-to-date `main` does not include all project customizations.
