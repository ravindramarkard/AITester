# API Test Environment Variables Setup

This guide explains how to configure environment variables for running generated API tests securely without exposing credentials in test files.

## Overview

Generated API tests now use environment variables instead of hardcoded credentials. This provides:
- ✅ Better security - no credentials exposed in test files
- ✅ Flexibility - use different credentials per environment
- ✅ Version control safety - credentials stay out of Git

## Required Environment Variables

### Base Configuration

```bash
# Base API URL
BASE_URL=https://p-tray.dev.g42a.ae
API_URL=https://p-tray.dev.g42a.ae

# API Timeout (milliseconds)
TIMEOUT=30000

# Custom Headers (if needed)
X_SPACE=default
```

### Authentication - Two Options

#### Option 1: Pre-fetched Token (Recommended ⭐)

This is the **fastest and most secure** approach. Fetch your token once through the UI and use it:

```bash
# Use one of these (they're aliases)
API_TOKEN=your-oauth-token-here
OAUTH_TOKEN=your-oauth-token-here
```

**How to get your token:**
1. Go to your Environment configuration in the UI
2. Configure OAuth 2.0 settings
3. Click "Test OAuth Token"
4. Copy the token shown
5. Set it as `API_TOKEN` in your `.env` file

#### Option 2: Dynamic Token Fetching

Tests can fetch tokens automatically during test execution. Set these variables:

```bash
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_TOKEN_URL=https://keycloak.dev.g42a.ae/auth/realms/g42a/protocol/openid-connect/token
OAUTH_SCOPE=openid
OAUTH_GRANT_TYPE=password
OAUTH_USERNAME=your-username
OAUTH_PASSWORD=your-password

# Optional: Custom token endpoint
OAUTH_TOKEN_ENDPOINT=http://localhost:5051/api/environments/test-oauth-token
```

**Note:** Dynamic fetching requires your local server to be running on port 5051.

## Setup Instructions

### 1. Create `.env` file

In your project root, create a `.env` file:

```bash
# Create .env file
touch .env
```

### 2. Add Environment Variables

Edit `.env` and add your configuration. Example:

```bash
# API Configuration
BASE_URL=https://p-tray.dev.g42a.ae
API_URL=https://p-tray.dev.g42a.ae
TIMEOUT=30000
X_SPACE=default

# Authentication (Option 1: Pre-fetched token)
API_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# OR Authentication (Option 2: Dynamic fetching)
# OAUTH_CLIENT_ID=shaheen
# OAUTH_CLIENT_SECRET=4f93f37f-0d79-4533-8519-7dd42492c647
# OAUTH_TOKEN_URL=https://keycloak.dev.g42a.ae/auth/realms/g42a/protocol/openid-connect/token
# OAUTH_SCOPE=openid
# OAUTH_GRANT_TYPE=password
# OAUTH_USERNAME=your-username
# OAUTH_PASSWORD=your-password
```

### 3. Add `.env` to `.gitignore`

Ensure your `.env` file is ignored by Git:

```bash
# Add to .gitignore if not already present
echo ".env" >> .gitignore
```

### 4. Run Your Tests

```bash
# Run a single test
npx playwright test path/to/test.spec.ts

# Run all API tests
npx playwright test tests/api/

# With UI mode
npx playwright test --ui
```

## Playwright Configuration

Ensure your `playwright.config.js` loads environment variables:

```javascript
require('dotenv').config();

module.exports = {
  use: {
    baseURL: process.env.BASE_URL || process.env.API_URL,
    // ... other config
  },
  // ... rest of config
};
```

## Troubleshooting

### 401 Unauthorized Error

If you get 401 errors:

1. **Check token validity**: OAuth tokens expire. Fetch a fresh token.
2. **Verify environment variables**: Ensure `.env` is in the project root and properly formatted.
3. **Check server is running**: If using dynamic fetching, ensure your server is running on the correct port.
4. **Test token manually**: Use the UI's "Test OAuth Token" button to verify credentials.

### Token Not Found Error

If tests fail with "API_TOKEN or OAUTH_TOKEN environment variable is required":

1. Create a `.env` file in the project root
2. Add `API_TOKEN=your-token-here`
3. Restart your test runner

### Server Connection Error

If using dynamic token fetching and getting connection errors:

1. Start your server: `npm run server` or `cd server && npm start`
2. Verify it's running on port 5051
3. Check OAUTH_TOKEN_ENDPOINT is correct in `.env`

## Best Practices

1. **Use pre-fetched tokens** for faster test execution
2. **Rotate tokens regularly** for security
3. **Never commit `.env`** to version control
4. **Use different tokens** for different environments (dev, staging, prod)
5. **Document your OAuth setup** in your team's internal docs

## Example: Complete `.env` File

```bash
# API Configuration
BASE_URL=https://p-tray.dev.g42a.ae
API_URL=https://p-tray.dev.g42a.ae
TIMEOUT=30000
X_SPACE=default

# Pre-fetched OAuth Token (recommended)
API_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJxRzF...
```

## Security Notes

⚠️ **Important Security Reminders:**
- Never commit `.env` files to Git
- Never hardcode credentials in test files
- Rotate tokens regularly
- Use different credentials for production vs. testing environments
- Consider using a secrets manager for CI/CD pipelines

## CI/CD Integration

For CI/CD pipelines, set environment variables through your CI provider:

**GitHub Actions:**
```yaml
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
  BASE_URL: ${{ secrets.BASE_URL }}
```

**GitLab CI:**
```yaml
variables:
  API_TOKEN: $API_TOKEN
  BASE_URL: $BASE_URL
```

Configure secrets in your CI provider's settings, not in the YAML file.

