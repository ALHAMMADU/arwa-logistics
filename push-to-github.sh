#!/bin/bash
# ARWA LOGISTICS - Push to GitHub Script
# Usage: ./push-to-github.sh <GITHUB_TOKEN> [REPO_NAME] [GITHUB_USERNAME]
#
# Example:
#   ./push-to-github.sh ghp_xxxxxxxxxxxx arwa-logistics myusername
#
# If no repo name or username is provided, defaults will be used.

set -e

TOKEN="${1:?Error: GitHub Personal Access Token required as first argument}"
REPO_NAME="${2:-arwa-logistics}"
USERNAME="${3:-arwalogistics}"
REPO_URL="https://${TOKEN}@github.com/${USERNAME}/${REPO_NAME}.git"

echo "=============================================="
echo "  ARWA LOGISTICS - GitHub Push Script"
echo "=============================================="
echo "  Repository: ${USERNAME}/${REPO_NAME}"
echo "=============================================="

# Create repository on GitHub using API
echo ""
echo "Creating repository on GitHub..."
HTTP_CODE=$(curl -s -o /tmp/gh-response.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"${REPO_NAME}\",
    \"description\": \"ARWA LOGISTICS - Advanced Shipping & Logistics Management Platform | منصة الشحن واللوجستيات المتقدمة\",
    \"private\": false,
    \"auto_init\": false,
    \"language\": \"TypeScript\"
  }")

if [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Repository created successfully!"
elif [ "$HTTP_CODE" -eq 422 ]; then
  echo "ℹ️  Repository already exists, continuing..."
else
  echo "❌ Failed to create repository (HTTP ${HTTP_CODE})"
  cat /tmp/gh-response.json
  exit 1
fi

# Add remote
echo ""
echo "Adding remote origin..."
if git remote | grep -q "origin"; then
  git remote set-url origin "$REPO_URL"
  echo "✅ Remote URL updated"
else
  git remote add origin "$REPO_URL"
  echo "✅ Remote origin added"
fi

# Push
echo ""
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "=============================================="
echo "  ✅ PUSH COMPLETE!"
echo "  https://github.com/${USERNAME}/${REPO_NAME}"
echo "=============================================="

# Cleanup
rm -f /tmp/gh-response.json
