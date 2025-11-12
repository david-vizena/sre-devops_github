# Linting and Code Quality

This directory contains configuration and documentation for the linting setup. The linting system ensures code quality through three layers of protection: pre-commit hooks (local), GitHub Actions (CI/CD), and branch protection (GitHub).

## Directory Structure

```
linting/
├── README.md           # This file
└── configs/            # Linting configuration files
    ├── .eslintrc.js    # ESLint config (JavaScript/Node.js)
    ├── .golangci.yml   # golangci-lint config (Go)
    ├── .flake8         # flake8 config (Python)
    └── .yamllint.yml   # yamllint config (YAML files)
```

**Note:** `.pre-commit-config.yaml` is at the repository root (required by pre-commit).

## How It Works

### The Three Layers

1. **Pre-commit Hooks** (Local) - Runs before you commit
   - Catches issues early, before pushing to GitHub
   - Blocks commit if linting fails
   - Can automatically fix some issues (like formatting)

2. **GitHub Actions** (Remote) - Runs on every push/PR
   - Runs on GitHub's servers (not your machine)
   - Shows results in pull requests
   - Blocks merges if linting fails (if configured)

3. **Branch Protection** (GitHub) - Requires checks to pass
   - Requires certain checks to pass before merging
   - Prevents bypassing checks (even admins can't merge bad code)
   - Ensures all code in `main` passes quality checks

### Configuration Files

All configuration files are in `linting/configs/`:

- **`.eslintrc.js`** - JavaScript/Node.js rules (unused variables, semicolons, quotes, React rules)
- **`.golangci.yml`** - Go rules (error handling, unused code, formatting, security)
- **`.flake8`** - Python rules (PEP 8 style, line length, unused imports)
- **`.yamllint.yml`** - YAML rules (syntax, formatting, line length)

### How Tools Find Configs

All tools reference configs using `--config` flags:

- **ESLint**: `--config ../../linting/configs/.eslintrc.js` (from applications/)
- **golangci-lint**: `--config=../../linting/configs/.golangci.yml` (from applications/)
- **flake8**: `--config=../../linting/configs/.flake8` (from applications/)
- **yamllint**: `-c linting/configs/.yamllint.yml` (from root)

These flags are set in:
- `package.json` scripts (for local development)
- `.github/workflows/lint.yml` (for CI/CD)
- `.pre-commit-config.yaml` (for pre-commit hooks)

## Quick Start

### 1. Install Pre-commit Hooks (Local)

```bash
pip install pre-commit
pre-commit install
```

This installs Git hooks that run automatically before every commit.

### 2. Run Linters Locally

```bash
# JavaScript (JS Gateway)
cd applications/js-gateway
npm run lint

# JavaScript (React Frontend)
cd applications/react-frontend
npm run lint

# Go
cd applications/go-service
golangci-lint run --config=../../linting/configs/.golangci.yml

# Python
cd applications/python-service
flake8 . --config=../../linting/configs/.flake8
black --check .

# Terraform
cd terraform
terraform fmt -check -recursive
terraform validate

# YAML
yamllint -c linting/configs/.yamllint.yml k8s/
```

### 3. Auto-fix Issues

```bash
# JavaScript
npm run lint:fix

# Go
golangci-lint run --fix --config=../../linting/configs/.golangci.yml

# Python
black .  # Auto-format

# Terraform
terraform fmt -recursive  # Auto-format
```

### 4. Set Up Branch Protection (GitHub)

1. Go to GitHub repository → **Settings** → **Branches**
2. Click **"Add branch protection rule"**
3. Select branch: `main`
4. Enable:
   - ✅ **"Require status checks to pass before merging"**
   - ✅ **"Require branches to be up to date before merging"**
5. Select required checks:
   - `lint-javascript`
   - `lint-go`
   - `lint-python`
   - `lint-terraform`
   - `lint-kubernetes`
   - `lint-helm`
6. Click **"Create"**

## GitHub Actions Workflows

GitHub Actions workflows are in `.github/workflows/`:

- **`.github/workflows/lint.yml`** - Runs all linters on push/PR
- **`.github/workflows/ci.yml`** - Builds Docker images and validates

### How GitHub Actions Works

1. **You push code** to GitHub
2. **GitHub detects the push** and triggers workflows
3. **GitHub Actions runs workflows** in parallel:
   - `lint-javascript` - Runs ESLint on JS Gateway and React Frontend
   - `lint-go` - Runs golangci-lint on Go service
   - `lint-python` - Runs flake8 and black on Python service
   - `lint-terraform` - Runs terraform fmt and validate
   - `lint-kubernetes` - Runs yamllint and kubectl dry-run on K8s manifests
   - `lint-helm` - Runs helm lint on Helm charts
4. **Results show in PR** - ✅ if passed, ❌ if failed
5. **Branch protection checks** - Blocks merge if checks fail

## What Each Linter Does

### ESLint (JavaScript/Node.js)

**Checks:**
- Unused variables
- Missing semicolons
- Code style (indentation, quotes)
- React-specific rules (for frontend)

**Config:** `linting/configs/.eslintrc.js`

**Example:**
```javascript
// Bad code (will fail linting)
var unusedVar = "hello"
console.log("test")

// Good code (will pass linting)
const usedVar = 'hello';
console.log('test');
```

### golangci-lint (Go)

**Checks:**
- Error handling (are errors checked?)
- Unused code (variables, functions)
- Code complexity (is code too complex?)
- Security issues (vulnerable patterns)
- Code formatting (is code formatted correctly?)

**Config:** `linting/configs/.golangci.yml`

**Example:**
```go
// Bad code (will fail linting)
func badFunction() {
    result, err := doSomething()  // Error not checked!
    fmt.Println(result)
}

// Good code (will pass linting)
func goodFunction() error {
    result, err := doSomething()
    if err != nil {
        return err  // Error checked
    }
    fmt.Println(result)
    return nil
}
```

### flake8 (Python)

**Checks:**
- Code style (PEP 8)
- Line length (too long lines)
- Unused imports
- Code complexity
- Syntax errors

**Config:** `linting/configs/.flake8`

**Example:**
```python
# Bad code (will fail linting)
import os  # Unused import
def bad_function(x,y):  # Missing spaces
    very_long_variable_name_that_exceeds_the_maximum_line_length_limit = "test"  # Line too long
    return x+y

# Good code (will pass linting)
def good_function(x, y):
    result = x + y
    return result
```

### Terraform (terraform fmt, validate)

**Checks:**
- Formatting (is code formatted correctly?)
- Syntax (is Terraform syntax valid?)
- Configuration (are resources configured correctly?)

**Example:**
```hcl
# Bad code (will fail linting)
resource "azurerm_resource_group" "main"{
name="my-rg"
location="eastus"
}

# Good code (will pass linting)
resource "azurerm_resource_group" "main" {
  name     = "my-rg"
  location = "eastus"
}
```

### yamllint (YAML files)

**Checks:**
- YAML syntax (is YAML valid?)
- Formatting (indentation, spacing)
- Line length (too long lines)
- Comments (proper comment formatting)

**Config:** `linting/configs/.yamllint.yml`

**Example:**
```yaml
# Bad code (will fail linting)
apiVersion:v1
kind:Deployment
metadata:
name:my-app
spec:
replicas:3

# Good code (will pass linting)
apiVersion: v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
```

### helm lint (Helm Charts)

**Checks:**
- Chart structure (is chart valid?)
- Template syntax (are templates correct?)
- Values validation (are values valid?)

## The Complete Flow

Here's what happens when you make a change:

```
1. You write code
   ↓
2. You stage files (git add .)
   ↓
3. You commit (git commit -m "message")
   ↓
4. Pre-commit hooks run (LOCAL)
   ├─> ESLint runs
   ├─> golangci-lint runs
   ├─> flake8 runs
   └─> terraform fmt runs
   ↓
5. If hooks fail: Commit blocked ❌
   If hooks pass: Commit allowed ✅
   ↓
6. You push (git push)
   ↓
7. GitHub Actions run (REMOTE)
   ├─> Job 1: lint-javascript
   ├─> Job 2: lint-go
   ├─> Job 3: lint-python
   ├─> Job 4: lint-terraform
   ├─> Job 5: lint-kubernetes
   └─> Job 6: lint-helm
   ↓
8. Results show in PR
   ├─> ✅ = Passed
   └─> ❌ = Failed
   ↓
9. You try to merge PR
   ↓
10. Branch protection checks (GITHUB)
    ├─> Are all required checks passing?
    ├─> If NO: Merge blocked ❌
    └─> If YES: Merge allowed ✅
```

## Common Issues

### Pre-commit hooks not running

**Solution:**
```bash
pre-commit install
```

### Config file not found

**Solution:**
- Check path is correct: `linting/configs/.eslintrc.js`
- Check you're in the right directory
- Check config file exists

### Linting fails in CI but works locally

**Solution:**
- Check GitHub Actions logs
- Verify config paths are correct
- Check if dependencies are installed

### Error: "Required status checks must pass"

**Solution:**
- Fix linting errors
- Push fixes to GitHub
- Wait for GitHub Actions to complete
- Merge when all checks pass

## Summary

**Linting** is a **three-layer system** that ensures code quality:

1. **Pre-commit hooks** (local) - Catch issues before committing
2. **GitHub Actions** (remote) - Check code on every push/PR
3. **Branch protection** (GitHub) - Block merges if checks fail

**Configuration files** are in `linting/configs/` for better organization.

**Tools reference configs** using `--config` flags in package.json, GitHub Actions, and pre-commit hooks.

**The goal:** Ensure all code in the repository passes quality checks before it's merged.
