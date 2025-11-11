# GitHub Actions Workflows

This directory contains CI/CD workflows for the Coral.js project.

## Workflows

### 🔄 CI (ci.yml)
**Triggers:** Push and Pull Requests to main/master/develop branches

Main continuous integration workflow that runs on every push and pull request.

**Jobs:**
- **Test** - Runs tests on Node.js 16.x, 18.x, and 20.x
- **Lint** - Validates JavaScript syntax across all source files
- **Security** - Runs npm audit to check for vulnerabilities
- **Build** - Verifies CLI executable and runs final test suite
- **Coverage** - Generates code coverage reports using nyc
- **Status Check** - Final validation that all required checks passed

**Artifacts:**
- Test results for each Node.js version
- Security audit results
- Code coverage reports

---

### 🔍 Pull Request Checks (pr-checks.yml)
**Triggers:** Pull request events (opened, synchronize, reopened)

Provides detailed analysis and validation of pull requests.

**Jobs:**
- **PR Info** - Displays PR metadata and changed files
- **Test Changes** - Runs full test suite on changed code
- **Validate Commit Messages** - Lists and validates commit messages
- **Size Check** - Analyzes PR size and provides recommendations

**Features:**
- Automatically detects if test files were added for source changes
- Warns about large PRs (>1000 lines)
- Generates detailed summary in PR checks tab

---

### 📦 Dependency Review (dependency-review.yml)
**Triggers:**
- Pull requests that modify package.json or package-lock.json
- Weekly schedule (Mondays at 9 AM UTC)
- Manual trigger via workflow_dispatch

Monitors and reports on project dependencies.

**Jobs:**
- **Dependency Check** - Lists outdated dependencies
- **Security Audit** - Runs npm audit
- **Dependency Tree** - Shows top-level dependency structure

---

### ⏰ Scheduled Tests (scheduled-tests.yml)
**Triggers:**
- Daily schedule (2 AM UTC)
- Manual trigger via workflow_dispatch

Runs comprehensive tests on a schedule to catch time-dependent issues and test cross-platform compatibility.

**Jobs:**
- **Daily Test Run** - Runs full test suite daily
- **Cross-Platform Tests** - Tests on Ubuntu, Windows, and macOS
- **Dependency Freshness** - Tests with latest compatible dependency versions

**Features:**
- Detects flaky tests
- Identifies time-dependent failures
- Validates cross-platform compatibility
- Tests dependency update compatibility

---

## Status Badges

Add these badges to your README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/coral.js/workflows/CI/badge.svg)
![Pull Request Checks](https://github.com/YOUR_USERNAME/coral.js/workflows/Pull%20Request%20Checks/badge.svg)
```

---

## Local Testing

To run the same checks locally before pushing:

```bash
# Run tests
npm test

# Check syntax
find . -name "*.js" -not -path "./node_modules/*" | while read file; do
  node -c "$file" || exit 1
done

# Security audit
npm audit

# Install and run coverage
npm install --save-dev nyc
npx nyc npm test
```

---

## Coverage Reports

Code coverage reports are automatically generated and uploaded as artifacts. To view:

1. Go to the Actions tab
2. Select a CI workflow run
3. Download the `coverage-report` artifact
4. Open `coverage/lcov-report/index.html` in your browser

---

## Configuration

### Node.js Versions
The CI workflow tests against Node.js 16.x, 18.x, and 20.x. Update the matrix in `ci.yml` to test different versions:

```yaml
strategy:
  matrix:
    node-version: [16.x, 18.x, 20.x, 22.x]
```

### Branch Protection
Recommended branch protection rules for main/master:

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - CI / Test
  - CI / Lint
  - CI / Build Verification
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging

---

## Troubleshooting

### Tests Failing in CI but Passing Locally
- Ensure you're using the same Node.js version
- Check for environment-specific issues
- Run `npm ci` instead of `npm install` locally

### Security Audit Failures
- Review the audit results in the artifacts
- Update vulnerable dependencies: `npm audit fix`
- For breaking changes, update manually

### Coverage Not Generating
- Ensure nyc is installed in the CI environment
- Check that tests are actually running
- Verify test output format is compatible with nyc

---

## Contributing

When adding new workflows:

1. Test locally using [act](https://github.com/nektos/act) if possible
2. Document the workflow in this README
3. Ensure appropriate triggers are configured
4. Add status checks to branch protection if critical
