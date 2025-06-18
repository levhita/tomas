#!/bin/bash

# API Test Runner Script
# 
# This script provides convenient commands for running different types of tests
# with proper environment setup and database configuration.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        print_warning "Please copy .env.example to .env and configure your database settings."
        exit 1
    fi
    print_success ".env file found"
}

# Check if required environment variables are set
check_env_vars() {
    source .env
    
    required_vars=("YAMO_MYSQL_HOST" "YAMO_MYSQL_USER" "YAMO_MYSQL_PASSWORD" "YAMO_MYSQL_DATABASE" "YAMO_JWT_SECRET")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Check database connection
check_database() {
    print_status "Checking database connection..."
    
    source .env
    
    # Test database connection
    mysql -h"$YAMO_MYSQL_HOST" -P"$YAMO_MYSQL_PORT" -u"$YAMO_MYSQL_USER" -p"$YAMO_MYSQL_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database"
        print_warning "Please check your database configuration in .env file"
        exit 1
    fi
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Run all tests
run_all_tests() {
    print_status "Running all tests..."
    npm test
}

# Run integration tests only
run_integration_tests() {
    print_status "Running integration tests..."
    npm run test:integration
}

# Run unit tests only
run_unit_tests() {
    print_status "Running unit tests..."
    npm run test:unit
}

# Run tests with coverage
run_coverage() {
    print_status "Running tests with coverage..."
    npm run test:coverage
}

# Run tests in watch mode
run_watch() {
    print_status "Running tests in watch mode..."
    npm run test:watch
}

# Setup test environment
setup() {
    print_status "Setting up test environment..."
    check_env
    check_env_vars
    install_deps
    check_database
    print_success "Test environment setup complete!"
}

# Main script logic
case "$1" in
    "setup")
        setup
        ;;
    "all"|"")
        check_env
        check_env_vars
        check_database
        run_all_tests
        ;;
    "integration")
        check_env
        check_env_vars
        check_database
        run_integration_tests
        ;;
    "unit")
        run_unit_tests
        ;;
    "coverage")
        check_env
        check_env_vars
        check_database
        run_coverage
        ;;
    "watch")
        check_env
        check_env_vars
        check_database
        run_watch
        ;;
    "deps")
        install_deps
        ;;
    "check")
        check_env
        check_env_vars
        check_database
        ;;
    *)
        echo "Usage: $0 {setup|all|integration|unit|coverage|watch|deps|check}"
        echo ""
        echo "Commands:"
        echo "  setup       - Complete test environment setup"
        echo "  all         - Run all tests (default)"
        echo "  integration - Run integration tests only"
        echo "  unit        - Run unit tests only"
        echo "  coverage    - Run tests with coverage report"
        echo "  watch       - Run tests in watch mode"
        echo "  deps        - Install dependencies only"
        echo "  check       - Check environment and database connection"
        exit 1
        ;;
esac
