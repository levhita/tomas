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
│   ├── user-workspaces.test.js # User workspace management
│   ├── workspaces.test.js  # Workspace management endpoints
│   └── health.test.js      # Health check endpoint
├── unit/                   # Unit tests for individual modules
│   ├── auth.test.js        # Authentication middleware
│   └── workspace-utils.test.js # Workspace utility functions
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

### Test Workspaces
Predefined workspaces with different configurations:

```javascript
const TEST_WORKSPACES = {
  WORKSPACE1: {
    id: 1,
    name: 'Test Workspace 1',
    description: 'Main testing workspace',
    currency_symbol: '$'
  },
  // ... additional test workspaces
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

## Integration Test Categories

### User Management Tests (`users.test.js`)
- ✅ Authentication (login/logout)
- ✅ User CRUD operations
- ✅ Permission validation
- ✅ Input validation
- ✅ Error handling

### Workspace Management Tests (`workspaces.test.js`)
- ✅ Workspace CRUD operations
- ✅ User access control
- ✅ Search functionality
- ✅ Permission validation
- ✅ Soft deletion

### User-Workspace Management Tests (`user-workspaces.test.js`)
- ✅ Adding users to workspaces
- ✅ Role management (viewer/collaborator/admin)
- ✅ Removing user access
- ✅ Permission validation
- ✅ Workspace statistics

### Health Check Tests (`health.test.js`)
- ✅ System health monitoring
- ✅ Database connectivity
- ✅ Response format validation
- ✅ Uptime tracking

## Unit Test Categories

### Authentication Middleware (`auth.test.js`)
- ✅ JWT token validation
- ✅ Authorization header parsing
- ✅ Token expiration handling
- ✅ Error scenarios

### Workspace Utilities (`workspace-utils.test.js`)
- ✅ Permission checking functions
- ✅ Role validation
- ✅ Database interaction mocking
- ✅ Error handling

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database credentials in .env
./test.sh check

# Verify MySQL service is running
brew services list | grep mysql

# Test direct database connection
mysql -h localhost -u your_user -p your_database
```

#### Permission Errors
```bash
# Ensure test script is executable
chmod +x test.sh

# Check file permissions
ls -la test.sh
```

#### Node Version Compatibility
The test suite requires Node.js 16+ due to Jest compatibility:
```bash
node --version  # Should be 16.0.0 or higher
```

#### Memory Issues
For large test suites, increase Node.js memory limit:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm test
```

### Test Debugging

#### Enable Verbose Logging
```bash
DEBUG=* npm test
```

#### Run Specific Test Files
```bash
# Run single test file
npm test -- users.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should create user"
```

#### Database Inspection
The test database persists during test execution, allowing inspection:
```bash
mysql -h localhost -u your_user -p your_database_test
```

## Continuous Integration

### GitHub Actions Setup

For running tests in CI/CD pipelines, create `.github/workflows/tests.yml`:

```yaml
name: API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    name: Run API Tests
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_root_password
          MYSQL_DATABASE: test
          MYSQL_USER: yamodev
          MYSQL_PASSWORD: yamodev
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping --silent"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: api/package-lock.json

      - name: Install dependencies
        working-directory: ./api
        run: npm ci

      - name: Wait for MySQL to be ready
        run: |
          for i in {1..30}; do
            if mysqladmin ping -h 127.0.0.1 -u yamodev -pyamodev --silent; then
              echo "MySQL is ready"
              break
            fi
            echo "Waiting for MySQL... ($i/30)"
            sleep 2
          done

      - name: Run tests
        working-directory: ./api
        env:
          YAMO_MYSQL_HOST: 127.0.0.1
          YAMO_MYSQL_USER: yamodev
          YAMO_MYSQL_PASSWORD: yamodev
          YAMO_MYSQL_PORT: 3306
          YAMO_MYSQL_DATABASE: test
          YAMO_JWT_SECRET: test-jwt-secret-for-ci
          NODE_ENV: test
        run: npm test

      - name: Run tests with coverage
        working-directory: ./api
        env:
          YAMO_MYSQL_HOST: 127.0.0.1
          YAMO_MYSQL_USER: yamodev
          YAMO_MYSQL_PASSWORD: yamodev
          YAMO_MYSQL_PORT: 3306
          YAMO_MYSQL_DATABASE: test
          YAMO_JWT_SECRET: test-jwt-secret-for-ci
          NODE_ENV: test
        run: npm run test:coverage
```

#### Branch Protection Setup

To require tests to pass before merging:

1. **Go to your GitHub repository settings**
2. **Navigate to "Branches"**
3. **Add a branch protection rule for `main` (and optionally `develop`)**
4. **Enable the following options**:
   - ✅ "Require a pull request before merging"
   - ✅ "Require status checks to pass before merging"
   - ✅ "Require branches to be up to date before merging"
   - ✅ Select "Run API Tests" as a required status check
   - ✅ "Restrict pushes that create files larger than 100 MB"
   - ✅ "Do not allow bypassing the above settings"

#### GitHub Secrets (if needed)

For production environments, you may want to use GitHub Secrets:
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD` 
- `JWT_SECRET`

Add these in your repository settings under "Secrets and variables" → "Actions".

## Performance Considerations

### Test Execution Speed
- Database operations add latency
- Use `beforeAll` for expensive setup when possible
- Reset only necessary data between tests
- Consider test parallelization for large suites

### Resource Management
- Test database is created/destroyed per run
- Connection pools are properly closed
- Memory usage monitored during long test runs

## Best Practices

### Test Organization
1. **Group related tests** in describe blocks
2. **Use descriptive test names** explaining expected behavior
3. **Test both success and failure scenarios**
4. **Validate complete response structure**
5. **Test edge cases and boundary conditions**

### Test Data Management
1. **Use consistent test data** from test-helpers
2. **Reset database state** between tests
3. **Generate unique data** when needed
4. **Avoid hardcoded IDs** where possible

### Assertion Patterns
1. **Validate HTTP status codes** first
2. **Check response structure** before content
3. **Use custom matchers** for common validations
4. **Test error messages** are meaningful

### Error Testing
1. **Test all error conditions**
2. **Validate error response format**
3. **Check appropriate HTTP status codes**
4. **Verify security measures** (auth, permissions)

## Maintenance

### Adding New Tests
1. Create test file in appropriate directory
2. Follow existing patterns and naming conventions
3. Add test data to `test-helpers.js` if needed
4. Update this documentation

### Updating Test Data
1. Modify `db/test_schema.sql` for schema changes
2. Update `test-helpers.js` for new test constants
3. Regenerate test database with `./test.sh setup`

### Performance Monitoring
1. Track test execution time trends
2. Monitor database query performance
3. Review coverage reports regularly
4. Optimize slow tests

## Security Testing

The test suite includes security validations for:
- **Authentication bypass attempts**
- **Authorization privilege escalation**
- **Input validation and sanitization**
- **SQL injection prevention**
- **JWT token security**

## Future Enhancements

Planned improvements for the test suite:
- **Load testing** with multiple concurrent users
- **Performance benchmarking** for API endpoints
- **Contract testing** for API versioning
- **End-to-end testing** integration
- **Mock external service** dependencies
