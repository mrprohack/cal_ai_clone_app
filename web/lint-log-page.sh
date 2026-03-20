#!/bin/bash
# Run linting on log page components
# Usage: ./lint-log-page.sh

echo "🔍 Running linting for log page components..."

# Check TypeScript types
echo "✓ Checking TypeScript types..."
npx tsc --noEmit --skipLibCheck app/log/**/*.ts* 2>&1 | grep -E "(error TS)" || echo "✓ No type errors"

# Check React hooks
echo "✓ Checking React hooks..."
npm run lint 2>&1 | grep -E "(hooks exhaustive-deps|react-hooks)" || echo "✓ No hook errors"

# Check for unused variables
echo "✓ Checking for unused variables..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(is declared but|never used)" || echo "✓ No unused variables"

echo "✅ Linting complete!"