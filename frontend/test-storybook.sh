#!/bin/bash

# Script to run tests for all Storybook components
# Usage: ./test-storybook.sh [component_name]

# Set variables
TEST_CONFIG="vitest.interactions.config.js"
TEST_DIR="src/components"

# Function to find components with stories
find_components_with_stories() {
  # Find all story files
  find $TEST_DIR -name "*.stories.ts" -o -name "*.stories.js" | sort
}

# Run specific component test or all tests
if [ -n "$1" ]; then
  # Run tests for a specific component
  echo "Running tests for component: $1"
  npx vitest run --config $TEST_CONFIG $1
else
  # Run all tests
  echo "Running tests for all components with stories"
  npx vitest run --config $TEST_CONFIG
fi
