#!/bin/bash

# Auto Development Flow Script
# Automates: branch creation → development → push → PR → Copilot review → review response

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if we're on main branch
current_branch=$(git symbolic-ref --short HEAD)
if [[ "$current_branch" != "main" ]]; then
    print_error "Please run this script from main branch"
    echo "Current branch: $current_branch"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    print_error "You have uncommitted changes. Please commit or stash them first."
    git status -s
    exit 1
fi

# Get branch type
echo ""
print_step "Select branch type:"
echo "  1) feat   - New feature"
echo "  2) fix    - Bug fix"
echo "  3) test   - Test addition"
echo "  4) refactor - Code refactoring"
read -p "Enter number (1-4): " branch_type_num

case $branch_type_num in
    1) branch_type="feat" ;;
    2) branch_type="fix" ;;
    3) branch_type="test" ;;
    4) branch_type="refactor" ;;
    *)
        print_error "Invalid selection"
        exit 1
        ;;
esac

# Get branch description
read -p "Enter branch description (e.g., 'add-user-authentication'): " branch_desc

if [[ -z "$branch_desc" ]]; then
    print_error "Branch description cannot be empty"
    exit 1
fi

# Create branch name
branch_name="${branch_type}/${branch_desc}"

# Step 1: Create and checkout branch
print_step "Step 1: Creating branch '$branch_name'"
git checkout -b "$branch_name"
print_success "Branch created and checked out"

# Step 2: Development phase
echo ""
print_step "Step 2: Development phase"
print_warning "Develop your feature now. Press ENTER when ready to continue..."
read -p ""

# Check if there are changes
if [[ -z $(git status -s) ]]; then
    print_error "No changes detected. Aborting."
    git checkout main
    git branch -D "$branch_name"
    exit 1
fi

# Step 3: Commit changes
echo ""
print_step "Step 3: Committing changes"
git status -s
echo ""
read -p "Enter commit message: " commit_msg

if [[ -z "$commit_msg" ]]; then
    print_error "Commit message cannot be empty"
    exit 1
fi

git add -A
git commit -m "$commit_msg"
print_success "Changes committed"

# Step 4: Push branch
echo ""
print_step "Step 4: Pushing branch to remote"
git push origin "$branch_name"
print_success "Branch pushed"

# Step 5: Create Pull Request
echo ""
print_step "Step 5: Creating Pull Request"
read -p "Enter PR title (press ENTER to use commit message): " pr_title
if [[ -z "$pr_title" ]]; then
    pr_title="$commit_msg"
fi

read -p "Enter PR description (optional): " pr_desc
if [[ -z "$pr_desc" ]]; then
    pr_desc="Auto-generated PR from development flow script"
fi

pr_url=$(gh pr create --title "$pr_title" --body "$pr_desc" --base main --head "$branch_name")
pr_number=$(echo "$pr_url" | grep -oE '[0-9]+$')
print_success "Pull Request created: $pr_url"

# Step 6: Request Copilot review
echo ""
print_step "Step 6: Requesting GitHub Copilot review"
print_warning "Note: Copilot review is automatically triggered for PRs"
print_warning "Waiting 3 minutes for Copilot to analyze..."

# Wait 3 minutes
for i in {180..1}; do
    printf "\rTime remaining: %02d:%02d" $((i/60)) $((i%60))
    sleep 1
done
echo ""

# Step 7: Check Copilot review comments
echo ""
print_step "Step 7: Checking Copilot review comments"
comments=$(gh pr view "$pr_number" --json comments --jq '.comments[] | select(.author.login == "github-actions[bot]" or .author.login == "copilot") | {author: .author.login, body: .body}')

if [[ -z "$comments" ]]; then
    print_warning "No Copilot comments found yet"
    echo "You can check manually later with: gh pr view $pr_number"
else
    print_success "Copilot comments found:"
    echo "$comments" | jq -r '.body'
fi

# Step 8: Review response options
echo ""
print_step "Step 8: Next steps"
echo "  1) Address Copilot comments now"
echo "  2) Merge PR (if no issues)"
echo "  3) Exit and handle manually"
read -p "Enter number (1-3): " next_step

case $next_step in
    1)
        print_warning "Make your changes, then run:"
        echo "  git add -A"
        echo "  git commit -m 'fix: Address Copilot review comments'"
        echo "  git push origin $branch_name"
        ;;
    2)
        print_step "Merging Pull Request"
        gh pr merge "$pr_number" --squash --delete-branch
        git checkout main
        git pull origin main
        print_success "PR merged and branch deleted"
        ;;
    3)
        print_success "Exiting. You can manage the PR manually."
        echo "PR URL: $pr_url"
        ;;
    *)
        print_error "Invalid selection"
        ;;
esac

echo ""
print_success "Development flow completed!"
echo "Current branch: $(git symbolic-ref --short HEAD)"
