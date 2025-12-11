#!/bin/bash

# Security check script for detecting sensitive information
# Uses gitleaks to scan for secrets before commits

set -e

echo "🔐 Running security checks..."

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo "❌ Error: gitleaks is not installed"
    echo ""
    echo "Please install gitleaks:"
    echo "  macOS:   brew install gitleaks"
    echo "  Linux:   https://github.com/gitleaks/gitleaks#installing"
    echo "  Windows: https://github.com/gitleaks/gitleaks#installing"
    exit 1
fi

# Run gitleaks on staged files
echo "Scanning for sensitive information..."

if gitleaks detect --source . --verbose --no-git; then
    echo "✅ No sensitive information detected"
    exit 0
else
    echo ""
    echo "❌ Sensitive information detected!"
    echo ""
    echo "Please remove sensitive information before committing:"
    echo "  1. Remove secrets from detected files"
    echo "  2. Move to environment variables (.env.local)"
    echo "  3. Use AWS Secrets Manager for production"
    echo "  4. Add to .gitignore if needed"
    echo ""
    echo "If already committed:"
    echo "  - Remove from Git history (git filter-branch or BFG Repo-Cleaner)"
    echo "  - Rotate credentials immediately"
    exit 1
fi
