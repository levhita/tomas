/**
 * API Test Validation Suite
 * 
 * This script runs comprehensive validation of the entire API test suite
 * and generates a detailed report of test coverage and results.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return colors[color] + text + colors.reset;
}

function printHeader(text) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(` ${text}`, 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan'));
}

function printSection(text) {
  console.log('\n' + colorize(`📋 ${text}`, 'blue'));
  console.log(colorize('-'.repeat(40), 'blue'));
}

function printSuccess(text) {
  console.log(colorize(`✅ ${text}`, 'green'));
}

function printWarning(text) {
  console.log(colorize(`⚠️  ${text}`, 'yellow'));
}

function printError(text) {
  console.log(colorize(`❌ ${text}`, 'red'));
}

function printInfo(text) {
  console.log(colorize(`ℹ️  ${text}`, 'blue'));
}

async function checkEnvironment() {
  printSection('Environment Validation');

  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 16) {
      printSuccess(`Node.js version: ${nodeVersion} ✓`);
    } else {
      printWarning(`Node.js version: ${nodeVersion} (Recommended: 16+)`);
    }

    // Check if .env file exists
    try {
      await fs.access('.env');
      printSuccess('.env file exists ✓');
    } catch {
      printError('.env file not found');
      return false;
    }

    // Check Jest installation
    try {
      execSync('npx jest --version', { stdio: 'pipe' });
      printSuccess('Jest is installed ✓');
    } catch {
      printError('Jest is not installed or not accessible');
      return false;
    }

    // Check MySQL availability
    try {
      require('dotenv').config();
      const mysql = require('mysql2/promise');

      const connection = await mysql.createConnection({
        host: process.env.YAMO_MYSQL_HOST,
        user: process.env.YAMO_MYSQL_USER,
        password: process.env.YAMO_MYSQL_PASSWORD,
        port: process.env.YAMO_MYSQL_PORT
      });

      await connection.execute('SELECT 1');
      await connection.end();
      printSuccess('Database connection successful ✓');
    } catch (error) {
      printError(`Database connection failed: ${error.message}`);
      return false;
    }

    return true;

  } catch (error) {
    printError(`Environment check failed: ${error.message}`);
    return false;
  }
}

async function validateTestStructure() {
  printSection('Test Structure Validation');

  const requiredFiles = [
    'jest.config.js',
    'tests/setup/global-setup.js',
    'tests/setup/global-teardown.js',
    'tests/setup/test-setup.js',
    'tests/utils/test-helpers.js',
    'tests/integration/users.test.js',
    'tests/integration/user-workspaces.test.js',
    'tests/integration/workspaces.test.js',
    'tests/integration/health.test.js',
    'tests/unit/auth.test.js',
    'tests/unit/workspace-utils.test.js',
    'db/test_schema.sql'
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    try {
      await fs.access(file);
      printSuccess(`${file} ✓`);
    } catch {
      printError(`${file} ✗`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

async function runTestSuite() {
  printSection('Test Suite Execution');

  return new Promise((resolve) => {
    const testProcess = spawn('npm', ['test'], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    testProcess.on('close', (code) => {
      const lines = output.split('\n');
      const errorLines = errorOutput.split('\n');

      // Parse test results
      const passedTests = lines.filter(line => line.includes('✓')).length;
      const failedTests = lines.filter(line => line.includes('✗')).length;
      const testSuites = lines.filter(line => line.includes('Test Suites:')).pop();
      const tests = lines.filter(line => line.includes('Tests:')).pop();

      console.log('\n' + colorize('Test Results:', 'magenta'));

      if (testSuites) {
        console.log(`  ${testSuites}`);
      }
      if (tests) {
        console.log(`  ${tests}`);
      }

      if (code === 0) {
        printSuccess('All tests passed! 🎉');
      } else {
        printError(`Tests failed with exit code ${code}`);

        // Show error details
        if (errorOutput) {
          console.log('\n' + colorize('Error Details:', 'red'));
          console.log(errorOutput);
        }
      }

      resolve({
        success: code === 0,
        output,
        errorOutput,
        passedTests,
        failedTests
      });
    });
  });
}

async function generateCoverageReport() {
  printSection('Coverage Report Generation');

  try {
    const output = execSync('npm run test:coverage', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Parse coverage summary
    const lines = output.split('\n');
    const coverageLines = lines.filter(line =>
      line.includes('% Stmts') ||
      line.includes('% Branch') ||
      line.includes('% Funcs') ||
      line.includes('% Lines')
    );

    console.log('\n' + colorize('Coverage Summary:', 'magenta'));
    coverageLines.forEach(line => {
      if (line.trim()) {
        console.log(`  ${line.trim()}`);
      }
    });

    // Check if coverage/lcov-report exists
    try {
      await fs.access('coverage/lcov-report/index.html');
      printInfo('HTML coverage report generated: coverage/lcov-report/index.html');
    } catch {
      printWarning('HTML coverage report not found');
    }

    return true;

  } catch (error) {
    printError(`Coverage report generation failed: ${error.message}`);
    return false;
  }
}

async function validateTestData() {
  printSection('Test Data Validation');

  try {
    // Check test schema file
    const schemaContent = await fs.readFile('db/test_schema.sql', 'utf8');

    const requiredTables = ['user', 'workspace', 'workspace_user', 'account', 'category', 'transaction'];
    const requiredTestData = ['superadmin', 'testuser1', 'Test Workspace'];

    let allTablesPresent = true;
    let allTestDataPresent = true;

    // Check for required tables
    for (const table of requiredTables) {
      if (schemaContent.includes(`CREATE TABLE \`${table}\``)) {
        printSuccess(`Table ${table} defined ✓`);
      } else {
        printError(`Table ${table} missing ✗`);
        allTablesPresent = false;
      }
    }

    // Check for test data
    for (const data of requiredTestData) {
      if (schemaContent.includes(data)) {
        printSuccess(`Test data '${data}' present ✓`);
      } else {
        printError(`Test data '${data}' missing ✗`);
        allTestDataPresent = false;
      }
    }

    return allTablesPresent && allTestDataPresent;

  } catch (error) {
    printError(`Test data validation failed: ${error.message}`);
    return false;
  }
}

async function runComprehensiveValidation() {
  printHeader('API Test Suite Comprehensive Validation');

  const results = {
    environment: false,
    structure: false,
    testData: false,
    tests: false,
    coverage: false
  };

  // Run all validation steps
  results.environment = await checkEnvironment();
  results.structure = await validateTestStructure();
  results.testData = await validateTestData();

  if (results.environment && results.structure && results.testData) {
    const testResults = await runTestSuite();
    results.tests = testResults.success;

    if (results.tests) {
      results.coverage = await generateCoverageReport();
    }
  } else {
    printWarning('Skipping test execution due to validation failures');
  }

  // Final summary
  printHeader('Validation Summary');

  const checks = [
    { name: 'Environment Setup', status: results.environment },
    { name: 'Test Structure', status: results.structure },
    { name: 'Test Data', status: results.testData },
    { name: 'Test Execution', status: results.tests },
    { name: 'Coverage Report', status: results.coverage }
  ];

  let allPassed = true;

  checks.forEach(check => {
    if (check.status) {
      printSuccess(check.name);
    } else {
      printError(check.name);
      allPassed = false;
    }
  });

  console.log('\n' + colorize('Overall Status:', 'magenta'));
  if (allPassed) {
    printSuccess('🎉 All validations passed! Test suite is ready for production use.');
  } else {
    printError('❌ Some validations failed. Please review the issues above.');
    process.exit(1);
  }

  // Recommendations
  console.log('\n' + colorize('Recommendations:', 'cyan'));
  console.log('  • Run tests before each commit: npm test');
  console.log('  • Monitor coverage: npm run test:coverage');
  console.log('  • Use watch mode during development: npm run test:watch');
  console.log('  • Review test documentation: tests/README.md');
}

// Run validation if this script is called directly
if (require.main === module) {
  runComprehensiveValidation().catch(error => {
    printError(`Validation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkEnvironment,
  validateTestStructure,
  validateTestData,
  runTestSuite,
  generateCoverageReport,
  runComprehensiveValidation
};
