#!/bin/bash
# PAI Validation Test Runner
# Run all PAI validation tests with summary

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$SCRIPT_DIR"

echo "=========================================="
echo "  PAI Validation Test Suite"
echo "=========================================="
echo ""
echo "Running tests from: $TESTS_DIR"
echo ""

# Run all tests
bun test "$TESTS_DIR" "$@"

echo ""
echo "=========================================="
echo "  All PAI validation tests completed!"
echo "=========================================="
