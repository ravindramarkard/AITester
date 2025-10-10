# Quick Start: Running API Tests Securely

## The Problem (Fixed! ✅)
- OAuth credentials were exposed in generated test files
- Tests failed with 401 errors due to expired tokens
- Security risk: credentials in version control

## The Solution
All API tests now use environment variables for credentials. No sensitive data in test files!

## Setup (2 minutes)

### Step 1: Get Your OAuth Token

1. Open the application UI
2. Go to **Environment Configuration**
3. Configure OAuth 2.0 settings:
   - Client ID
   - Client Secret  
   - Token URL
   - Username/Password
4. Click **"Test OAuth Token"**
5. Copy the token that appears

### Step 2: Create `.env` File

In your project root (not in `server/`):

```bash
# Create .env file
touch .env

# Add your configuration
echo "API_TOKEN=paste-your-token-here" >> .env
echo "BASE_URL=https://p-tray.dev.g42a.ae" >> .env
echo "X_SPACE=default" >> .env
```

Or manually create `.env`:

```bash
# Required
API_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
BASE_URL=https://p-tray.dev.g42a.ae

# Optional
X_SPACE=default
TIMEOUT=30000
```

### Step 3: Run Your Tests

```bash
# Run a single test
npx playwright test server/tests/generated/api-tests/post--api-v1-project-happy-path.spec.ts

# Run all API tests
npx playwright test server/tests/generated/api-tests/

# With UI mode
npx playwright test --ui
```

## Alternative: Dynamic Token Fetching

Instead of using a pre-fetched token, you can have tests fetch tokens automatically:

```bash
# .env file
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_TOKEN_URL=https://keycloak.dev.g42a.ae/auth/realms/g42a/protocol/openid-connect/token
OAUTH_USERNAME=your-username
OAUTH_PASSWORD=your-password
OAUTH_SCOPE=openid
OAUTH_GRANT_TYPE=password
BASE_URL=https://p-tray.dev.g42a.ae
```

**Note:** Requires your server to be running on port 5051.

## Troubleshooting

### ❌ "401 Unauthorized"

**Solution:** Your token expired. Get a fresh one:
1. Go to UI → Environment → Test OAuth Token
2. Copy new token
3. Update `API_TOKEN` in `.env`
4. Run tests again

### ❌ "API_TOKEN environment variable is required"

**Solution:** Environment variables not loaded:
1. Ensure `.env` is in project root (not `server/`)
2. Check `playwright.config.js` has: `require('dotenv').config();`
3. Restart your test runner

### ❌ "Failed to fetch OAuth token"

**Solution:** 
1. Check server is running: `cd server && npm start`
2. Verify port 5051 is available
3. Check OAuth credentials are correct in environment config

## What Changed?

### Before (❌ Insecure)
```typescript
data: {
  clientId: "shaheen",  // ❌ Hardcoded
  clientSecret: "4f93f37f-0d79...",  // ❌ Exposed
  username: "piyush.safaya",  // ❌ In Git
  password: "piyush1234"  // ❌ Security risk
}
```

### After (✅ Secure)
```typescript
data: {
  clientId: process.env.OAUTH_CLIENT_ID,  // ✅ From env
  clientSecret: process.env.OAUTH_CLIENT_SECRET,  // ✅ Secure
  username: process.env.OAUTH_USERNAME,  // ✅ Not in Git
  password: process.env.OAUTH_PASSWORD  // ✅ Safe
}
```

## Files Updated

✅ `server/routes/apiTestGenerator.js` - Generator now uses env vars
✅ `server/tests/generated/api-tests/post--api-v1-project-happy-path.spec.ts` - Example updated
✅ All future generated tests will use env vars automatically

## Best Practices

1. ✅ **Use pre-fetched tokens** for faster tests
2. ✅ **Never commit `.env`** - add to `.gitignore`
3. ✅ **Rotate tokens regularly** - they expire
4. ✅ **Use different tokens** for dev/staging/prod
5. ✅ **Document setup** for your team

## Next Steps

1. ✅ Review your `.env` file is properly configured
2. ✅ Run a test to verify setup
3. ✅ Regenerate old API tests (if any) to use new secure format
4. ✅ Share this guide with your team

## Need More Help?

- **Detailed Setup:** See `API_TEST_ENV_SETUP.md`
- **Security Info:** See `API_TEST_SECURITY_FIXES.md`
- **Troubleshooting:** Check error messages in test output

## Example: Complete Working Setup

```bash
# .env (in project root)
API_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJxRzFsY...
BASE_URL=https://p-tray.dev.g42a.ae
X_SPACE=default
TIMEOUT=30000
```

```bash
# Run test
npx playwright test server/tests/generated/api-tests/post--api-v1-project-happy-path.spec.ts

# Expected output:
# 🔐 Fetching OAuth token...
# ✅ OAuth token fetched successfully
# ✅ Test passed
```

## That's It! 🎉

Your API tests are now secure and working!

