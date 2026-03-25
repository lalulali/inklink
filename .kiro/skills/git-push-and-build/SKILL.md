---
name: git-push-and-build
description: Runs build, updates README, commits and pushes changes to git
---

# Git Push and Build Skill

## Purpose
This skill handles the complete workflow of building, documenting, committing, and pushing changes to git.

## Instructions

When activated, perform the following steps in order:

### 1. Run Build
Execute `npm run build` to compile the project. If the build fails with errors, report the errors to the user and do NOT proceed with commit/push.

### 2. Check for README Updates
Review the root `README.md` file. If the recent changes warrant documentation updates (new features, configuration changes, setup instructions, etc.), update the README to reflect the latest development.

### 3. Stage Changes
Stage all modified files including the updated README:
```bash
git add -A
```

### 4. Commit Changes
Create a commit with a descriptive message following conventional commit format:
- Use `feat:`, `fix:`, `docs:`, `chore:`, etc. as the type
- Keep the subject line under 50 characters
- Add a body if the changes are substantial

### 5. Push to Remote
Push the commit to the remote repository:
```bash
git push
```

## Error Handling
- If build fails: Report errors and stop
- If git operations fail: Report the error and suggest solutions
- If README update is needed but unclear: Ask the user what to document

## Notes
- Only proceed with commit/push if the build succeeds
- Ensure the commit message is clear and descriptive
- Consider using `git status` to review what will be committed