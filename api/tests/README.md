# API Testing Documentation

## Overview

This document provides comprehensive instructions for running and maintaining the API test suite. The testing framework uses Jest and Supertest with real database integration to ensure thorough validation of API functionality.

## Test Architecture

### Test Structure
```
tests/
├── setup/                  # Global test configuration
│   ├── global-setup.js     # Database setup before all tests
│   ├── global-teardown.js  # Database cleanup after all tests
│   └── test-setup.js       # Per-test file setup
├── integration/            # API endpoint integration tests
│   ├── users.test.js       # User management endpoints
│   ├── user-books.test.js # User book management
│   ├── books.test.js  # Book management endpoints
│   └── health.test.js      # Health check endpoint
├── unit/                   # Unit tests for individual modules
│   ├── auth.test.js        # Authentication middleware
│   └── book-utils.test.js # Book utility functions
└── utils/                  # Test utilities and helpers
    └── test-helpers.js     # Common test functions and data
```

### Test Environment Configuration

The test suite uses a separate environment configuration to ensure that tests don't interfere with the main application database.

#### Environment Files

**`.env` (Main Application)**
- Contains the configuration for the main application
- Database: `yamodev`
- Used when running the application normally

**`.env.test` (Test Environment)**
- Contains the configuration for tests
- Database: `test` (separate from main database)
- Used automatically when running tests via Jest

#### How It Works

1. **Jest Configuration**: The test setup automatically loads `.env.test` instead of `.env`
2. **Global Setup**: `tests/setup/global-setup.js` loads the test environment
3. **Test Setup**: `tests/setup/test-setup.js` also loads the test environment
4. **Database Isolation**: Tests use the `test` database, keeping the main `yamodev` database untouched

#### Database Access

The tests use the existing MySQL `test` database that the `yamodev` user already has access to. This avoids permission issues while maintaining complete separation from the main application data.

#### Test Execution Flow

When you run tests with `npm test`, the following happens:

1. Jest loads the test environment from `.env.test`
2. The test database (`test`) is set up with fresh test data
3. Tests run against the isolated test database
4. The test database is cleaned up after tests complete
5. The main application database (`yamodev`) remains completely untouched

#### Benefits

- **Data Safety**: Main application data is never affected by test runs
- **Test Isolation**: Each test run starts with a clean, predictable database state
- **Parallel Development**: Developers can run tests while the main application is running
- **CI/CD Ready**: Tests can run in CI environments without affecting production data

### Test Database

The test suite uses a separate test database that is:
- Created fresh before each test run
- Populated with consistent test data
- Isolated from development/production databases
- Automatically cleaned up after tests complete

## Quick Start

### 1. Environment Setup

Copy the environment configuration:
```bash
cp .env.example .env
```

Configure your `.env` file with database credentials:
```bash
YAMO_MYSQL_HOST=localhost
YAMO_MYSQL_USER=your_user
YAMO_MYSQL_PASSWORD=your_password
YAMO_MYSQL_PORT=3306
YAMO_MYSQL_DATABASE=tomas_dev
YAMO_JWT_SECRET=your-secret-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Tests

#### Using the Test Script (Recommended)
```bash
# Complete setup and run all tests
./test.sh setup

# Run all tests
./test.sh all

# Run only integration tests
./test.sh integration

# Run only unit tests
./test.sh unit

# Run tests with coverage report
./test.sh coverage

# Run tests in watch mode for development
./test.sh watch
```

#### Using NPM Scripts Directly
```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration

# Run unit tests only
npm run test:unit

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Configuration

### Jest Configuration

The Jest configuration (`jest.config.js`) includes:
- **Test Environment**: Node.js environment for API testing
- **Global Setup/Teardown**: Database lifecycle management
- **Test Timeout**: 10 seconds for database operations
- **Coverage Thresholds**: 80% minimum coverage requirement
- **Custom Matchers**: Extended assertions for API testing

### Custom Jest Matchers

The test suite includes custom matchers for common validations:

```javascript
expect(token).toHaveValidJWT();           // Validates JWT format
expect(date).toBeValidDate();             // Validates Date objects
expect(uuid).toBeValidUUID();             // Validates UUID format
```

## Test Data

### Test Users
The test database includes predefined users for different scenarios:

```javascript
const TEST_USERS = {
  SUPERADMIN: {
    username: 'superadmin',
    password: 'password123',
    id: 1,
    superadmin: true
  },
  TESTUSER1: {
    username: 'testuser1', 
    password: 'password123',
    id: 2,
    superadmin: false
  },
  // ... additional test users
};
```

### Test Books
Predefined books with different configurations:

```javascript
const TEST_BOOKS = {
  BOOK1: {
    id: 1,
    name: 'Test Book 1',
    description: 'Main testing book',
    currency_symbol: '$'
  },
  // ... additional test books
};
```

## Writing Tests

### Basic Test Structure

```javascript
const {
  loginUser,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  TEST_USERS
} = require('../utils/test-helpers');

describe('API Endpoint', () => {
  let token;
  
  beforeAll(async () => {
    token = await loginUser(TEST_USERS.SUPERADMIN);
  });
  
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should perform expected behavior', async () => {
    const auth = authenticatedRequest(token);
    const response = await auth.get('/api/endpoint');
    
    validateApiResponse(response, 200);
    expect(response.body).toHaveProperty('expectedProperty');
  });
});
```

### Authentication Patterns

```javascript
// Login and get token
const token = await loginUser(TEST_USERS.SUPERADMIN);

// Create authenticated requests
const auth = authenticatedRequest(token);

// Make authenticated API calls
const response = await auth.get('/api/users');
const createResponse = await auth.post('/api/users').send(userData);
const updateResponse = await auth.put('/api/users/1').send(updateData);
const deleteResponse = await auth.delete('/api/users/1');
```

### Database Reset Pattern

```javascript
beforeEach(async () => {
  await resetDatabase(); // Resets to clean test data state
});
```

## Test Coverage

### Coverage Requirements
- **Branches**: 80% minimum
- **Functions**: 80% minimum  
- **Lines**: 80% minimum
- **Statements**: 80% minimum

### Running Coverage Reports
```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory with:
- HTML report: `coverage/lcov-report/index.html`
- LCOV format: `coverage/lcov.info`
- Text summary in terminal

## Improving Test Coverage

### Current Coverage Status

To check current coverage, run:
```bash
npm run test:coverage
```

### Coverage Improvement Strategy

#### 1. Identify Low Coverage Areas
```bash
# Generate detailed coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

#### 2. Priority Coverage Areas

**Critical Missing Tests (Priority 1):**
- **Categories API** (`src/routes/categories.js`) - Currently ~8% coverage
- **Index Routes** (`src/routes/index.js`) - Currently ~40% coverage

**Enhancement Opportunities (Priority 2):**
- **Book Routes** - Missing advanced features and edge cases
- **Account Routes** - Missing complex balance calculations
- **Transaction Routes** - Missing bulk operations and complex scenarios

#### 3. Adding New Test Files

**Categories Integration Tests**:
```bash
# File: tests/integration/categories.test.js
# Tests: GET, POST, PUT, DELETE /api/categories
# Focus: CRUD operations, permissions, validation
```

**Index Route Tests**:
```bash
# File: tests/integration/index.test.js  
# Tests: Root routes, error handling, middleware
# Focus: Core application functionality
```

#### 4. Enhancing Existing Tests

**Add Missing Test Scenarios**:
```javascript
// Example: Enhanced account tests
describe('Advanced Account Scenarios', () => {
  it('should handle complex balance calculations', async () => {
    // Test credit vs debit account logic
    // Test transaction history impact
    // Test date-range balance queries
  });

  it('should validate account archiving', async () => {
    // Test account soft deletion
    // Test archived account restrictions
  });
});
```

#### 5. Coverage Enforcement

**Local Development**:
```bash
# Set coverage thresholds in jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**GitHub Actions Integration**:
```yaml
# Add to .github/workflows/tests.yml
- name: Run tests with coverage
  run: npm run test:coverage
  
- name: Check coverage thresholds
  run: npm run test:coverage -- --passWithNoTests=false
```

#### 6. Coverage Best Practices

**Focus on Critical Paths**:
```javascript
// Test main business logic flows
it('should process complete transaction workflow', async () => {
  // Create account -> Create transaction -> Update balance -> Generate report
});

// Test error scenarios
it('should handle database connection failures', async () => {
  // Mock database errors and test graceful handling
});

// Test permission boundaries
it('should enforce role-based access correctly', async () => {
  // Test all permission combinations
});
```

**Avoid Coverage Anti-Patterns**:
```javascript
// ❌ Don't write tests just for coverage
it('should call function', () => {
  someFunction(); // No assertions
});

// ✅ Write meaningful tests
it('should return correct calculation result', () => {
  const result = someFunction(input);
  expect(result).toBe(expectedOutput);
  expect(result).toMatchSnapshot();
});
```

#### 7. Coverage Monitoring

**Set Up Coverage Tracking**:
```bash
# Install coverage badge generator
npm install --save-dev coverage-badge-creator

# Generate coverage badges
npx coverage-badge-creator --help
```

**Coverage Reports**:
```bash
# Generate and view detailed reports
npm run test:coverage
open coverage/lcov-report/index.html

# Check specific file coverage
npm run test:coverage -- --collectCoverageFrom="src/routes/categories.js"
```

#### 8. Integration with Development Workflow

**Pre-commit Hooks**:
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:coverage && npm run lint"
    }
  }
}
```

**Watch Mode with Coverage**:
```bash
# Monitor coverage while developing
npm run test:watch -- --coverage --watchAll=false
```

### Target Coverage Goals

**Minimum Acceptable Coverage**: 80%
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

**Ideal Coverage**: 90%+
- Focus on business-critical code paths
- Comprehensive error handling
- Complete API endpoint coverage
- Edge case validation

### Coverage Improvement Checklist

- [ ] **Create missing integration tests**
  - [ ] Categories API tests
  - [ ] Index route tests
  - [ ] Enhanced book tests
  
- [ ] **Add missing unit tests**
  - [ ] Utility function tests
  - [ ] Helper function tests
  - [ ] Validation logic tests
  
- [ ] **Enhance existing tests**
  - [ ] Add error scenario coverage
  - [ ] Add edge case testing
  - [ ] Add performance testing
  
- [ ] **Configure coverage enforcement**
  - [ ] Set Jest coverage thresholds
  - [ ] Add GitHub Actions coverage checks
  - [ ] Set up coverage reporting
  
- [ ] **Monitor and maintain**
  - [ ] Regular coverage audits
  - [ ] Update tests with new features
  - [ ] Refactor tests for maintainability
````
