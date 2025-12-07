# 🔒 Security Setup Guide

## ⚠️ Important Security Notice

**Never commit service account keys or API keys to the repository!** They are sensitive credentials that should be kept private.

---

## 🔐 Firebase Service Account Key Setup

### For Backend Scripts (fetchExternalEvents.ts)

1. **Get your Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Save it locally:**
   - Place the file at: `backend/serviceAccountKey.json`
   - **DO NOT** commit this file to git!

3. **Verify it's ignored:**
   - The file is already added to `.gitignore`
   - Run `git status` to verify it's not tracked

---

## 🚨 If You Already Committed a Secret

### Option 1: Remove from Git (Recommended)

1. **Remove the file from git tracking** (keeps local file):
   ```bash
   git rm --cached backend/serviceAccountKey.json
   ```

2. **Commit the removal:**
   ```bash
   git commit -m "Remove service account key from repository"
   ```

3. **Force push** (only if you haven't pushed yet, or use --force-with-lease):
   ```bash
   git push origin main
   ```

### Option 2: Remove from Git History (If already pushed)

⚠️ **Warning**: This rewrites history. Only do this if necessary.

1. **Remove from history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/serviceAccountKey.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Force push:**
   ```bash
   git push origin --force --all
   ```

3. **Rotate the key**: Go to Firebase Console and generate a new key (the old one is compromised)

---

## 🔑 API Keys

### Ticketmaster API Key

The API key in `backend/fetchExternalEvents.ts` should also be moved to environment variables:

**Current (not ideal):**
```typescript
const API_KEY = "8qxbB2ypaVsz6cqrC9WGfzYsK1xvMJ1a";
```

**Better approach:**
```typescript
const API_KEY = process.env.TICKETMASTER_API_KEY || "";
```

Then create a `.env` file (not committed):
```
TICKETMASTER_API_KEY=your_key_here
```

---

## ✅ Security Checklist

- [ ] Service account key is in `.gitignore`
- [ ] Service account key is NOT in git history
- [ ] API keys are in environment variables
- [ ] `.env` files are in `.gitignore`
- [ ] No secrets in commit history

---

## 🆘 Need Help?

If you've already pushed secrets:
1. **Immediately rotate the keys** in the service (Firebase, Ticketmaster, etc.)
2. Remove the secrets from git history (see Option 2 above)
3. Update all services with new keys

---

**Remember**: Once a secret is committed, consider it compromised. Always rotate the keys!

