# 🔒 How to Fix GitHub Secret Detection Block

## 🚨 Current Situation

GitHub blocked your push because it detected a **Google Cloud Service Account Key** in commit `3099bed` ("first"). Even though we removed the file, it still exists in git history.

---

## ✅ **What I've Already Done:**

1. ✅ Added `backend/serviceAccountKey.json` to `.gitignore`
2. ✅ Removed the file from git tracking
3. ✅ Created a commit to delete the file
4. ✅ Created example template file
5. ✅ Added security documentation

---

## 🔧 **Solution: Remove Secret from Git History**

Since the secret is in an old commit, you have two options:

### **Option 1: Simple Fix (If commits haven't been pushed yet)**

If you haven't pushed these commits to GitHub before, you can safely rewrite history:

```bash
# Remove the secret from ALL commits in history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/serviceAccountKey.json" \
  --prune-empty --tag-name-filter cat -- --all

# Verify it's gone
git log --all --full-history -- backend/serviceAccountKey.json
# (Should return nothing)

# Force push (this rewrites history on GitHub)
git push origin main --force-with-lease
```

### **Option 2: Use BFG Repo-Cleaner (Recommended for large repos)**

BFG is faster and safer than filter-branch:

```bash
# Install BFG (if not installed)
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove the file from history
bfg --delete-files serviceAccountKey.json

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin main --force-with-lease
```

---

## ⚠️ **CRITICAL: Rotate the Service Account Key**

**Before pushing**, you MUST rotate the compromised key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **whatshappeningapp-75e08**
3. Go to **Project Settings** → **Service Accounts**
4. Find the service account: `firebase-adminsdk-fbsvc@whatshappeningapp-75e08.iam.gserviceaccount.com`
5. **Delete the old key** (it's compromised since it was committed)
6. **Generate a new private key**
7. **Save it locally** as `backend/serviceAccountKey.json` (it's now in .gitignore)

---

## 🚀 **Quick Fix Steps**

### Step 1: Backup (optional but recommended)
```bash
cd /Users/simona/Fontys/project2/simonagu-app
git bundle create backup.bundle --all
```

### Step 2: Remove from history
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/serviceAccountKey.json" \
  --prune-empty --tag-name-filter cat -- --all
```

### Step 3: Clean up
```bash
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 4: Verify
```bash
git log --all --full-history -- backend/serviceAccountKey.json
# Should show nothing (or only the deletion commit)
```

### Step 5: Force push
```bash
git push origin main --force-with-lease
```

---

## 📋 **After Fixing**

1. ✅ Rotate the service account key in Firebase
2. ✅ Save new key locally (it's in .gitignore now)
3. ✅ Test that `backend/fetchExternalEvents.ts` still works
4. ✅ Commit and push again

---

## 💡 **Prevention for Future**

- ✅ `.gitignore` now includes service account keys
- ✅ Use environment variables for API keys
- ✅ Never commit files with "secret", "key", "credential", or "private" in names
- ✅ Use `.example.json` files as templates
- ✅ Review files before committing with `git status`

---

## 🆘 **If Something Goes Wrong**

If you need to restore from backup:
```bash
cd /Users/simona/Fontys/project2/simonagu-app
git clone backup.bundle backup-repo
```

Or if you just want to start fresh:
```bash
git reset --hard origin/main  # Reset to remote state
```

---

**Remember**: Always rotate compromised keys immediately! 🔐

