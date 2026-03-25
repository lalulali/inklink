---
title: AI Memory System and Protected Directories
inclusion: manual
---

# AI Memory System

## Core Principle
This project is AI-agnostic. Any AI assistant working on this project must maintain shared memory in `.artifacts/memory.md` to ensure continuity across sessions and different AI systems.

## Shared Memory File

### Location
`.artifacts/memory.md` - The single source of truth for AI memory across all sessions

### Purpose
- Maintain context across different AI sessions
- Share knowledge between different AI assistants
- Track decisions, patterns, and project evolution
- Prevent repeated mistakes or forgotten learnings

### Memory Structure

The memory file follows this structure:

```markdown
# AI Shared Memory

Last Updated: [ISO 8601 timestamp]

## Project Overview
[High-level description of the project, its goals, and current state]

## Key Decisions
[Important architectural, design, or technical decisions made]
- Decision: [What was decided]
- Rationale: [Why it was decided]
- Date: [When it was decided]
- Impact: [What this affects]

## Active Features
[Features currently being developed or recently completed]

## Known Issues
[Bugs, technical debt, or problems to be aware of]

## Patterns and Conventions
[Project-specific patterns that should be followed]

## External Dependencies
[Key libraries, services, APIs being used]

## Environment Setup
[Important setup steps or configuration notes]

## Lessons Learned
[Things that didn't work, mistakes to avoid]

## Future Considerations
[Ideas, improvements, or refactoring to consider later]

## Recent Changes
[Log of significant changes, newest first]
```

## Memory Management Rules

### When to Update Memory
Update `.artifacts/memory.md` when:
- Making architectural decisions
- Discovering important patterns or conventions
- Completing significant features
- Encountering and solving difficult problems
- Learning something that future AI sessions should know
- Changing project structure or organization
- Adding or removing major dependencies
- Identifying technical debt or known issues

### How to Update Memory
1. **Read First**: Always read the current memory before making changes
2. **Append, Don't Replace**: Add new information, preserve existing content
3. **Use Timestamps**: Include ISO 8601 timestamps for dated entries
4. **Be Concise**: Write clear, scannable summaries
5. **Update "Last Updated"**: Always update the timestamp at the top
6. **Categorize Properly**: Put information in the right section

### Memory Update Format
```markdown
## Recent Changes

### [2024-03-22T10:30:00Z] Implemented User Authentication
- Added AWS Cognito integration
- Created auth middleware for API routes
- Decision: Using JWT tokens with 1-hour expiration
- Files: src/api/auth/, src/middleware/auth.ts
- Note: Rate limiting set to 5 login attempts per minute

### [2024-03-21T15:45:00Z] Database Schema Migration
- Added user_preferences table
- Indexed email and created_at columns
- Migration: migrations/003_user_preferences.sql
```

## Protected Directories

### CRITICAL: Never Delete from These Directories
The AI is **STRICTLY FORBIDDEN** from deleting any files or directories within:
- `.artifacts/` - Project memory, documentation, and artifacts
- `.kiro/` - Kiro configuration, steering files, hooks, skills

### Allowed Operations

#### `.artifacts/` Directory
- ✅ **READ**: Always allowed
- ✅ **CREATE**: Can create new files
- ✅ **UPDATE**: Can append to or modify existing files
- ❌ **DELETE**: NEVER delete files or directories
- ❌ **RENAME**: Do not rename existing files
- ❌ **MOVE**: Do not move files out of .artifacts/

#### `.kiro/` Directory
- ✅ **READ**: Always allowed
- ✅ **CREATE**: Can create new steering files, hooks, skills
- ✅ **UPDATE**: Can modify existing files when requested
- ❌ **DELETE**: NEVER delete files or directories
- ❌ **RENAME**: Do not rename existing files without explicit user request
- ❌ **MOVE**: Do not move files out of .kiro/

### Rationale
These directories contain:
- Project memory and context (`.artifacts/memory.md`)
- Product documentation and decisions (`.artifacts/product_documents/`)
- AI feedback and analysis (`.artifacts/ai_feedbacks/`)
- Development standards and patterns (`.kiro/steering/`)
- Automation hooks (`.kiro/hooks/`)
- Reusable skills (`.kiro/skills/`)

Deleting from these directories would:
- Break AI memory continuity
- Lose important project context
- Remove established patterns and standards
- Destroy product documentation
- Break automation workflows

## AI Session Workflow

### At the Start of Every Session
1. **Read Memory**: Read `.artifacts/memory.md` to understand project context
2. **Review Recent Changes**: Check what was done in recent sessions
3. **Understand Decisions**: Review key decisions and their rationale
4. **Check Known Issues**: Be aware of existing problems

### During the Session
1. **Track Important Events**: Note significant decisions or discoveries
2. **Document Patterns**: When you establish a pattern, document it
3. **Record Problems**: If you encounter issues, document them

### At the End of Significant Work
1. **Update Memory**: Add entry to "Recent Changes" section
2. **Document Decisions**: If you made architectural decisions, record them
3. **Update Relevant Sections**: Update "Active Features", "Known Issues", etc.
4. **Update Timestamp**: Change "Last Updated" at the top

## Memory Best Practices

### Write for Future AI Sessions
- Assume the next AI has no context from this conversation
- Be explicit about decisions and rationale
- Include file paths and specific details
- Explain "why" not just "what"

### Keep It Scannable
- Use clear headings and bullet points
- Put most recent information first in "Recent Changes"
- Use consistent formatting
- Keep entries concise but informative

### Include Context
```markdown
❌ Bad: "Fixed the bug"
✅ Good: "Fixed authentication bug where JWT tokens expired immediately. Issue was timezone handling in token generation. Updated src/auth/jwt.ts to use UTC timestamps."

❌ Bad: "Added caching"
✅ Good: "Added Redis caching layer for user profiles. Cache TTL: 5 minutes. Invalidated on profile updates. Reduced DB queries by 80%. Files: src/cache/user-cache.ts"
```

### Document Failures Too
```markdown
## Lessons Learned

### [2024-03-20] Attempted Client-Side Encryption - Reverted
- Tried implementing client-side encryption for user data
- Problem: Significant performance impact on mobile devices
- Decision: Moved to server-side encryption with AWS KMS
- Lesson: Always test performance on target devices early
```

## AI-Agnostic Code Principles

### Self-Documenting Code
- Code should be understandable without AI context
- Comments explain "why" and business logic
- Clear naming conventions
- Comprehensive function documentation

### Explicit Over Implicit
- No "clever" code that requires AI to explain
- Prefer verbose clarity over terse complexity
- Document assumptions and constraints
- Make dependencies explicit

### Standardized Patterns
- Follow established patterns in the codebase
- Document new patterns in memory
- Consistent error handling
- Consistent API response formats

### Comprehensive Documentation
- README covers setup and deployment
- API documentation (OpenAPI/Swagger)
- Architecture diagrams in `.artifacts/`
- Decision records in memory

## Verification Checklist

Before ending a session, verify:
- [ ] `.artifacts/memory.md` has been updated if significant work was done
- [ ] No files deleted from `.artifacts/` or `.kiro/`
- [ ] New patterns or conventions documented
- [ ] Important decisions recorded with rationale
- [ ] Known issues or technical debt noted
- [ ] Recent changes logged with timestamps
- [ ] Code is self-documenting and AI-agnostic

## Emergency Recovery

If memory file is corrupted or lost:
1. Check git history for previous version
2. Reconstruct from git commit messages
3. Review code comments and documentation
4. Check `.artifacts/product_documents/` for context
5. Review `.kiro/steering/` files for established patterns

## Example Memory Entry

```markdown
## Recent Changes

### [2024-03-22T14:20:00Z] Implemented Design System
- Created centralized component library in src/components/
- Established design tokens in src/styles/tokens.ts
- Components: Button, Input, Card, Modal, Navigation
- All components use TypeScript with prop interfaces
- Added Storybook for component documentation
- Decision: Using CSS-in-JS (styled-components) for styling
- Rationale: Better TypeScript integration, dynamic theming support
- Files: src/components/, src/styles/, .storybook/
- Next: Add remaining primitive components (Icon, Text, Badge)

## Key Decisions

### Design System Architecture
- **Decision**: Centralized component library with design tokens
- **Rationale**: Ensure consistency, enable theme switching, reduce duplication
- **Date**: 2024-03-22
- **Impact**: All new features must use shared components
- **Documentation**: .kiro/steering/design-system.md

### Backend Architecture
- **Decision**: Serverless-first with AWS Lambda + API Gateway
- **Rationale**: Auto-scaling, pay-per-use, reduced ops overhead
- **Date**: 2024-03-20
- **Impact**: All APIs built as Lambda functions
- **Documentation**: .kiro/steering/backend-architecture.md
```
