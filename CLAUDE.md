# Claude AI Assistant Guidelines

## IMPORTANT: Pre-Development Checklist

Before making ANY code changes or writing new features, you MUST:

1. **Review TDD.md** - Follow the Test-Driven Development workflow exactly
2. **Review DATABASE.md** - Check for existing schema, types, and patterns
3. **Review PROJECT_PLAN.md** - Ensure work aligns with current phase
4. **Review PROJECT_OVERVIEW.md** - Verify feature requirements

## Mandatory Review Process

### Before Writing Code:
```
1. Check TDD.md → Follow the 6-phase workflow
2. Check DATABASE.md → Use existing types/schemas
3. Check relevant test files → Understand expected behavior
4. Check TODO list → Ensure task is current priority
```

### Before Database Changes:
```
1. Review DATABASE.md for existing schema
2. Update DATABASE.md with new changes
3. Follow migration best practices
4. Document new types and queries
```

## Development Rules

1. **NEVER write implementation before tests** (TDD Phase 1 must complete first)
2. **NEVER modify database without updating DATABASE.md**
3. **ALWAYS follow the 6-phase TDD workflow from TDD.md**
4. **ALWAYS use existing database types from DATABASE.md**

## File Update Protocol

When modifying these files:
- **DATABASE.md** - Update when adding tables, types, or queries
- **PROJECT_PLAN.md** - Check off completed tasks
- **TDD.md** - Reference but never modify
- **PROJECT_OVERVIEW.md** - Reference for requirements

## Workflow Reminders

1. Start each feature by reading TDD.md
2. Create tests first (Phase 1)
3. Validate tests fail (Phase 2)
4. Commit tests (Phase 3)
5. Only then write implementation (Phase 4)
6. Verify quality (Phase 5)
7. Final commit (Phase 6)

## Database Development

- Check DATABASE.md before creating any new tables
- Use consistent naming conventions from existing schema
- Document all new types in DATABASE.md
- Update common queries section with reusable patterns

Remember: TDD.md and DATABASE.md are your primary references before any development work!