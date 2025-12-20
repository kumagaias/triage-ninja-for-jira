#!/bin/bash

# Pre-push hook to check for secrets using gitleaks
# This script prevents pushing commits that contain sensitive information

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Running gitleaks security check...${NC}"

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo -e "${RED}❌ Error: gitleaks is not installed${NC}"
    echo ""
    echo "Please install gitleaks:"
    echo "  macOS:   brew install gitleaks"
    echo "  Linux:   https://github.com/gitleaks/gitleaks#installing"
    echo ""
    exit 1
fi

# Get the remote name and URL
remote="$1"
url="$2"

# Read stdin to get the list of commits being pushed
while read local_ref local_sha remote_ref remote_sha
do
    if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
        # Branch is being deleted, skip checks
        continue
    fi

    if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
        # New branch, check all commits
        range="$local_sha"
    else
        # Existing branch, check new commits only
        range="$remote_sha..$local_sha"
    fi

    # Run gitleaks on the commit range
    echo -e "${YELLOW}Checking commits: $range${NC}"
    
    if gitleaks detect --log-opts="$range" --verbose --no-git 2>&1 | tee /tmp/gitleaks-output.txt; then
        echo -e "${GREEN}✅ No secrets detected${NC}"
    else
        echo -e "${RED}❌ Secrets detected!${NC}"
        echo ""
        echo -e "${RED}Gitleaks found potential secrets in your commits.${NC}"
        echo -e "${RED}Please review the output above and remove any sensitive information.${NC}"
        echo ""
        echo "Common fixes:"
        echo "  1. Remove secrets from code and use environment variables"
        echo "  2. Add sensitive files to .gitignore"
        echo "  3. If already committed, use: git filter-branch or BFG Repo-Cleaner"
        echo "  4. Rotate any exposed credentials immediately"
        echo ""
        echo "To bypass this check (NOT RECOMMENDED):"
        echo "  git push --no-verify"
        echo ""
        exit 1
    fi
done

echo -e "${GREEN}✅ Security check passed${NC}"
exit 0
