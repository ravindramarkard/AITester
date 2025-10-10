# API Test Generation Security Fixes

## Summary

Fixed security and authentication issues in API test generation to prevent credential exposure and resolve 401 errors.

## Issues Fixed

### 1. ✅ Hardcoded Credentials in Generated Tests
**Problem:** OAuth credentials (clientId, clientSecret, username, password) were hardcoded directly into generated test files.

**Solution:** All generated tests now use environment variables instead:
- `process.env.OAUTH_CLIENT_ID`
- `process.env.OAUTH_CLIENT_SECRET`
- `process.env.OAUTH_USERNAME`
- `process.env.OAUTH_PASSWORD`
- `process.env.API_TOKEN` (preferred)

### 2. ✅ 401 Unauthorized Errors
**Problem:** Tests were failing with 401 errors due to:
- Tokens generated at test creation time expiring before test execution
- Wrong token being sent in Authorization header
- Missing or incorrect token configuration

**Solution:**
- Tests now fetch fresh tokens at runtime OR use pre-configured `API_TOKEN`
- Token fetching logic improved to handle errors gracefully
- Better error messages to help debug authentication issues

### 3. ✅ Token Management
**Problem:** No clear strategy for managing OAuth tokens between test generation and execution.

**Solution:** Two options now available:
1. **Pre-fetched token** (recommended): Set `API_TOKEN` env var with a valid token
2. **Dynamic fetching**: Provide OAuth credentials as env vars, tests fetch token at runtime

## Changes Made

### File: `server/routes/apiTestGenerator.js`

#### 1. Updated `postProcessAPITestCode()` function
- Lines 1820-1888: Removed hardcoded OAuth credentials
- Now generates tests that use environment variables
- Added conditional logic for OAuth vs pre-configured token

**Before:**
```javascript
data: {
  clientId: "shaheen",
  clientSecret: "4f93f37f-0d79-4533-8519-7dd42492c647",
  username: "piyush.safaya",
  password: "piyush1234"
}
```

**After:**
```javascript
data: {
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  username: process.env.OAUTH_USERNAME,
  password: process.env.OAUTH_PASSWORD
}
```

#### 2. Updated `buildAuthorizationHeaders()` function
- Lines 1039-1089: Added check for stored token before fetching new one
- Now prioritizes using existing token from environment config
- Only fetches new token if no token is available

**New Logic:**
```javascript
// First check if a token is already stored
if (auth.token) {
  headers['Authorization'] = `Bearer ${token}`;
  break;
}
// Otherwise, fetch a new token
```

#### 3. Updated `generateIndividualAPITest()` function
- Lines 467-534: Modified to use environment variables for auth headers
- Removes token from hardcoded headers, uses env var instead
- Improves baseURL to use environment variables

**Key Changes:**
- Authorization header now uses: `'Authorization': \`Bearer \${process.env.API_TOKEN || process.env.OAUTH_TOKEN}\``
- baseURL now uses: `process.env.BASE_URL || process.env.API_URL || '${baseUrl}'`

## New Documentation

### Created: `API_TEST_ENV_SETUP.md`
Comprehensive guide for:
- Setting up environment variables
- Two authentication approaches (pre-fetched vs dynamic)
- Troubleshooting 401 errors
- Best practices for token management
- CI/CD integration

## Migration Guide

### For Existing Tests

If you have existing generated API tests with hardcoded credentials:

1. **Regenerate tests** using the API Test Generator UI
2. **Set environment variables** in `.env` file (see `API_TEST_ENV_SETUP.md`)
3. **Delete old test files** with hardcoded credentials

### For New Tests

1. Configure your environment in the UI
2. Test OAuth connection and get a valid token
3. Set `API_TOKEN` in your `.env` file
4. Generate tests - they'll use environment variables automatically

## Environment Variables Reference

### Required (Choose one approach)

**Option 1: Pre-fetched Token (Recommended)**
```bash
API_TOKEN=your-token-here
BASE_URL=https://your-api.com
```

**Option 2: Dynamic Token Fetching**
```bash
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_TOKEN_URL=https://your-oauth-provider.com/token
OAUTH_USERNAME=your-username
OAUTH_PASSWORD=your-password
BASE_URL=https://your-api.com
```

### Optional
```bash
TIMEOUT=30000
X_SPACE=default
OAUTH_SCOPE=openid
OAUTH_GRANT_TYPE=password
OAUTH_TOKEN_ENDPOINT=http://localhost:5051/api/environments/test-oauth-token
```

## Security Improvements

✅ **Before**: Credentials visible in:
- Generated test files
- Version control (if committed)
- Plain text in repository

✅ **After**: Credentials stored in:
- `.env` files (gitignored)
- Environment variables (CI/CD secrets)
- Never in test files or version control

## Testing the Fix

### 1. Generate a new API test
```bash
# Use the UI to generate an API test
# Verify no credentials are hardcoded in the generated file
```

### 2. Set up environment variables
```bash
# Create .env file
echo "API_TOKEN=your-token" > .env
echo "BASE_URL=https://your-api.com" >> .env
```

### 3. Run the test
```bash
npx playwright test path/to/generated-test.spec.ts
```

### Expected Results
- ✅ No 401 errors
- ✅ Token fetched/used from environment
- ✅ Test passes with valid credentials

## Troubleshooting

### Still getting 401 errors?

1. **Verify token is valid**
   ```bash
   # Test token in UI: Environment > Test OAuth Token
   ```

2. **Check environment variables are loaded**
   ```bash
   # Add debug logging in test
   console.log('API_TOKEN:', process.env.API_TOKEN ? 'Set' : 'Not set');
   ```

3. **Ensure .env is in project root**
   ```bash
   ls -la .env  # Should be in project root, not server/
   ```

4. **Check playwright.config.js loads dotenv**
   ```javascript
   require('dotenv').config();
   ```

### Tests can't find environment variables?

1. Install dotenv: `npm install dotenv`
2. Load in config: `require('dotenv').config();`
3. Restart test runner after changing `.env`

## Next Steps

1. ✅ Review generated tests - ensure no credentials are hardcoded
2. ✅ Set up `.env` file with your credentials
3. ✅ Test token fetching in UI before running tests
4. ✅ Regenerate any old tests created before this fix
5. ✅ Document your OAuth setup in team wiki

## Questions?

See `API_TEST_ENV_SETUP.md` for detailed setup instructions and examples.

