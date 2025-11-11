# Contributing to Coral.js

Thank you for your interest in contributing to Coral.js! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites
- Node.js 16.x, 18.x, or 20.x
- npm (comes with Node.js)
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/coral.js.git
   cd coral.js
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## Development Workflow

### Before Making Changes

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. Make sure all tests pass:
   ```bash
   npm test
   ```

### Making Changes

1. Write your code following the existing code style
2. Add tests for new functionality
3. Update documentation if needed
4. Ensure all tests pass

### Testing

Run the full test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm install --save-dev nyc  # if not already installed
npx nyc npm test
```

Check for syntax errors:
```bash
find . -name "*.js" -not -path "./node_modules/*" | while read file; do
  node -c "$file" || exit 1
done
```

### Committing Changes

1. Stage your changes:
   ```bash
   git add .
   ```

2. Commit with a descriptive message:
   ```bash
   git commit -m "Add feature: description of what you added"
   ```

   Good commit message examples:
   - `Add tests for normalize.js helper functions`
   - `Fix memory leak in event handler cleanup`
   - `Update documentation for plugin API`
   - `Refactor scope generation for better performance`

3. Push to your fork:
   ```bash
   git push origin your-branch-name
   ```

### Submitting a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template with:
   - Clear description of changes
   - Related issue numbers (if applicable)
   - Testing performed
   - Any breaking changes

5. Wait for CI checks to complete
6. Address any review feedback

## CI/CD Pipeline

All pull requests go through automated checks:

### Required Checks
- **Tests** - Must pass on Node.js 16.x, 18.x, and 20.x
- **Lint** - JavaScript syntax must be valid
- **Build** - Project must build successfully

### Additional Checks
- **Security Audit** - Checks for vulnerable dependencies
- **Code Coverage** - Generates coverage reports
- **PR Analysis** - Provides insights about your changes
- **CodeQL** - Security and quality analysis

## Code Style Guidelines

### JavaScript Style
- Use strict mode: `"use strict";`
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings (except when avoiding escapes)
- Comment complex logic
- Keep functions focused and small

### Test Style
- Use descriptive test names
- Follow the existing test structure
- Test both success and failure cases
- Use `describe` blocks to organize related tests
- Use `beforeEach` for test setup

Example:
```javascript
describe('MyFeature', function() {
  describe('when condition is true', function() {
    it('should do something specific', function() {
      // Test implementation
    });
  });
});
```

## Adding Tests

When adding new functionality:

1. Add unit tests in `tests/unit/` for new modules
2. Add integration tests if the feature spans multiple modules
3. Ensure test coverage for:
   - Happy path (expected behavior)
   - Edge cases
   - Error conditions
   - Boundary conditions

Example test structure:
```javascript
"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;

describe('YourModule', function() {
  var yourModule;

  beforeEach(function() {
    yourModule = require('../../path/to/your/module');
  });

  describe('someFunction', function() {
    it('should handle normal input', function() {
      var result = yourModule.someFunction('input');
      assert.equal(result, 'expected');
    });

    it('should handle edge cases', function() {
      var result = yourModule.someFunction('');
      assert.equal(result, 'default');
    });

    it('should throw error for invalid input', function() {
      assert.throws(function() {
        yourModule.someFunction(null);
      }, /Expected error message/);
    });
  });
});
```

## Documentation

Update documentation when:
- Adding new features
- Changing public APIs
- Adding new configuration options
- Fixing bugs that affect documented behavior

## Questions or Issues?

- Check existing issues before opening a new one
- Provide detailed reproduction steps for bugs
- Include system information (OS, Node version, npm version)
- Add relevant code snippets or error messages

## Code Review Process

1. Automated checks must pass
2. At least one maintainer review required
3. Address all review comments
4. Keep commits clean and atomic
5. Squash commits if requested

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes (for significant contributions)
- Project documentation (for major features)

Thank you for contributing to Coral.js! 🎉
