# Test-Driven Development (TDD) Workflow

## Overview
This document outlines our strict TDD workflow for implementing features in the Nightclub Booking System. Follow these phases sequentially for every new feature.

## WORKFLOW - Execute these phases sequentially:

### PHASE 1: TEST CREATION (Subagent: Test Writer)
**Role**: Write comprehensive tests based on the input/output pairs
**Constraints**: 
- This is TDD - DO NOT create any implementation code or mock implementations
- Focus only on writing thorough test cases using appropriate testing framework
- Cover edge cases and error conditions
- Write descriptive test names and clear assertions
- Save tests to appropriate test files

**Task**: Create complete test suite for the specified functionality

### PHASE 2: TEST VALIDATION (Subagent: Test Validator)  
**Role**: Validate the tests fail correctly
**Constraints**:
- DO NOT write any implementation code
- DO NOT modify the existing tests
- Only run tests and report results
- Verify failures are due to missing implementation, not test errors

**Task**: Run all tests, confirm they fail as expected, report results

### PHASE 3: COMMIT TESTS
**Task**: Commit the test files with message 'Add tests for [feature] - TDD red phase'

### PHASE 4: IMPLEMENTATION (Subagent: Implementation Developer)
**Role**: Write minimum code to make all tests pass
**Constraints**:
- DO NOT modify any existing tests
- Write only implementation code needed
- Follow test specifications exactly
- Keep iterating until ALL tests pass
- Use clean, maintainable code practices

**Task**: 
1. Analyze failing tests to understand requirements
2. Write implementation code
3. Run tests to check progress  
4. Refactor and fix until all tests pass
5. Continue iterating until 100% test success

### PHASE 5: IMPLEMENTATION VERIFICATION (Subagent: Code Reviewer)
**Role**: Verify implementation quality and prevent overfitting
**Constraints**:
- DO NOT modify implementation or tests
- Focus on code quality and design review
- Check for overfitting to test cases
- Ensure solution is generalizable

**Task**: Analyze and report on:
1. Does implementation solve general problem or just pass specific tests?
2. Is code well-structured and maintainable?
3. Are there obvious edge cases tests might have missed?
4. Does implementation follow good software engineering practices?
5. Would code handle reasonable input variations not explicitly tested?

### PHASE 6: FINAL COMMIT
**Task**: Commit implementation with message 'Implement [feature] - TDD green phase'

## EXECUTION INSTRUCTIONS:
- Execute each phase completely before moving to next
- Each subagent should announce their role when starting
- Show test results after each test run
- Implementation subagent should iterate until all tests pass
- Do not proceed to next phase until current phase is complete
- Maintain clear separation between subagent responsibilities

## Testing Framework Guidelines

### For Unit Tests
```javascript
// Jest example
describe('Feature Name', () => {
  describe('Function Name', () => {
    it('should handle normal case', () => {
      // Arrange
      // Act
      // Assert
    });
    
    it('should handle edge case', () => {
      // Test edge cases
    });
    
    it('should handle error case', () => {
      // Test error conditions
    });
  });
});
```

### For Integration Tests
```javascript
// API route testing example
describe('API: /api/route', () => {
  it('should return 200 for valid request', async () => {
    // Test implementation
  });
  
  it('should return 400 for invalid input', async () => {
    // Test validation
  });
});
```

### For Component Tests
```javascript
// React Testing Library example
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test rendering
  });
  
  it('should handle user interaction', () => {
    // Test interactions
  });
});
```

## Test Coverage Requirements
- Minimum 80% code coverage for unit tests
- All API endpoints must have integration tests
- All interactive components must have component tests
- Critical user journeys must have E2E tests

## Common Test Patterns

### 1. Database Tests
- Use test database or in-memory database
- Clean up after each test
- Test transactions and rollbacks

### 2. API Tests
- Test all HTTP methods
- Test authentication/authorization
- Test input validation
- Test error responses

### 3. Component Tests
- Test rendering with different props
- Test user interactions
- Test loading and error states
- Test accessibility

### 4. E2E Tests
- Test complete user flows
- Test across different browsers
- Test mobile responsiveness
- Test error recovery

## Red-Green-Refactor Cycle
1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

## Best Practices
- One assertion per test when possible
- Use descriptive test names
- Keep tests independent
- Use appropriate setup/teardown
- Mock external dependencies
- Test behavior, not implementation