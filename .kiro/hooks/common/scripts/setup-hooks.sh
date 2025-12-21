#!/bin/bash

# Setup Git hooks for the project
# This script creates symbolic links from .git/hooks to .kiro/hooks/common/scripts

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Setting up Git hooks...${NC}"

# Get the repository root directory
REPO_ROOT=$(git rev-parse --show-toplevel)

# Create symbolic link for pre-push hook
if [ -f "$REPO_ROOT/.git/hooks/pre-push" ] || [ -L "$REPO_ROOT/.git/hooks/pre-push" ]; then
    echo "Removing existing pre-push hook..."
    rm "$REPO_ROOT/.git/hooks/pre-push"
fi

echo "Creating symbolic link for pre-push hook..."
ln -sf ../../.kiro/hooks/common/scripts/pre-push-gitleaks.sh "$REPO_ROOT/.git/hooks/pre-push"

# Verify the link was created
if [ -L "$REPO_ROOT/.git/hooks/pre-push" ]; then
    echo -e "${GREEN}✅ Pre-push hook installed successfully${NC}"
    echo ""
    echo "The hook will run gitleaks before every push to check for secrets."
    echo "To bypass the check (NOT RECOMMENDED): git push --no-verify"
else
    echo "❌ Failed to create symbolic link"
    exit 1
fi

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo ""
    echo -e "${YELLOW}⚠️  Warning: gitleaks is not installed${NC}"
    echo ""
    echo "Please install gitleaks:"
    echo "  macOS:   brew install gitleaks"
    echo "  Linux:   https://github.com/gitleaks/gitleaks#installing"
    echo ""
fi

echo ""
echo -e "${GREEN}✅ Git hooks setup complete${NC}"
