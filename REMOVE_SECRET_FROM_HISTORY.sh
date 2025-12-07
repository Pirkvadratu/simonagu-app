#!/bin/bash

# Script to remove serviceAccountKey.json from git history
# This will rewrite git history to remove the secret file

echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  Make sure you have a backup!"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 1
fi

# Remove the file from all commits in history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/serviceAccountKey.json" \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "✅ Secret removed from git history!"
echo ""
echo "Next steps:"
echo "1. Verify: git log --all --full-history -- backend/serviceAccountKey.json"
echo "2. Force push: git push origin --force --all"
echo "3. IMPORTANT: Rotate the service account key in Firebase Console!"

