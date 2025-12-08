# DOM Analysis Integration with Playwright Crawler

## Overview
The browser action mode now performs automatic DOM analysis using Playwright Crawler to discover all available elements on the page before generating test code. This ensures the LLM generates accurate, working selectors based on actual page elements.

## How It Works

### 1. **Page Crawling**
When browser action mode is activated, the system:
- Launches a browser instance
- Navigates to the target URL
- Uses `document.querySelectorAll` through Playwright to discover all interactive elements
- Extracts comprehensive element information

### 2. **Element Discovery**
The DOM analyzer discovers and catalogs:

#### **Buttons**
- Text content
- Attributes (id, name, class, data-testid, type)
- Generated selector recommendations

#### **Input Fields**
- Input type (text, password, email, etc.)
- Placeholder text
- Name and ID attributes
- Associated labels
- Generated selector recommendations

#### **Links**
- Link text
- href attributes
- All available attributes
- Generated selector recommendations

#### **Select Dropdowns**
- Name and ID attributes
- Available options
- Generated selector recommendations

### 3. **Selector Generation**
For each element, the analyzer generates multiple selector options in order of preference:
1. `[data-testid="..."]` - Most reliable
2. `#id` - ID selector
3. `[name="..."]` - Name attribute
4. `.class` - Class selector
5. `[placeholder="..."]` - Placeholder text
6. `text=...` or `button:has-text("...")` - Text content
7. `:nth-child(n)` - Position-based (fallback)

### 4. **LLM Integration**
The DOM analysis results are passed to the LLM with:
- Complete list of discovered buttons with their text content
- All input fields with types, placeholders, and names
- Available links with text and hrefs
- Select dropdowns with their attributes
- Recommended selectors for each element

The LLM uses this information to generate accurate Playwright code with selectors that match the actual page structure.

## Implementation Details

### DOM Analyzer Service
Location: `server/services/DOMAnalyzer.js`

Key features:
- Playwright-based browser automation
- `document.querySelectorAll` for element discovery
- Self-healing selector capabilities
- Intelligent selector scoring and ranking
- Form field mapping (labels to inputs)
- Caching and persistence

### Integration Point
Location: `server/routes/codeGeneration.js` - `processLLMWithRealtimeBrowser()`

```javascript
// DOM analysis is performed automatically
const domAnalyzer = new DOMAnalyzer();
const domAnalysisResult = await domAnalyzer.analyzePage(baseUrl, {
  timeout: 15000,
  waitUntil: 'domcontentloaded',
  retries: 1
});

// Results are passed to LLM prompt
const llmPrompt = `
  ...
  ## DOM Analysis Results - Discovered Elements:
  ${domElementsSection}
  ...
`;
```

## Benefits

### 1. **Accurate Selectors**
- No more guessing or hardcoded selectors
- Uses actual page structure
- Reduces test flakiness

### 2. **Self-Healing Tests**
- DOM analyzer maintains a cache of working selectors
- Automatically tries alternative selectors if primary fails
- Persists successful selectors for future runs

### 3. **Better LLM Code Generation**
- LLM sees actual element information
- Generates code that works on first try
- Uses best practices (getByRole, getByLabel, etc.)

### 4. **Comprehensive Coverage**
- Discovers all interactive elements
- Provides multiple selector options
- Handles dynamic content

## Example Output

### Console Log
```
🔍 Starting DOM analysis using Playwright Crawler...
✅ DOM analysis completed:
   - Found 47 interactive elements
   - Page title: Login Page
   - Form fields: 3
📋 Sample elements discovered:
   1. button: Login
   2. input: username (placeholder: Enter username)
   3. input: password (placeholder: Enter password)
   4. link: Forgot Password?
   5. button: Create Account
```

### DOM Analysis Result Structure
```javascript
{
  url: "https://example.com",
  timestamp: "2025-11-25T10:30:00.000Z",
  pageTitle: "Login Page",
  elements: [
    {
      type: "input",
      tagName: "input",
      index: 0,
      attributes: {
        type: "text",
        name: "username",
        placeholder: "Enter username",
        id: "username-field",
        class: "form-input"
      },
      text: "Enter username",
      selectors: [
        "#username-field",
        "[name=\"username\"]",
        ".form-input",
        "input[type=\"text\"]",
        "[placeholder=\"Enter username\"]",
        "input:nth-child(1)"
      ]
    },
    {
      type: "button",
      tagName: "button",
      index: 0,
      attributes: {
        type: "submit",
        class: "btn btn-primary",
        id: "login-btn"
      },
      text: "Login",
      selectors: [
        "#login-btn",
        ".btn.btn-primary",
        "button[type=\"submit\"]",
        "text=Login",
        "button:has-text(\"Login\")",
        "button:nth-child(1)"
      ]
    }
  ],
  formFields: [
    {
      label: "Username",
      name: "username",
      id: "username-field",
      placeholder: "Enter username",
      type: "text"
    },
    {
      label: "Password",
      name: "password",
      id: "password-field",
      placeholder: "Enter password",
      type: "password"
    }
  ],
  totalElements: 47
}
```

## Configuration

### Environment Variables

```bash
# DOM Analyzer timeout (default: 15000ms)
PLAYWRIGHT_ANALYZER_TIMEOUT_MS=15000

# Wait strategy (default: load)
# Options: load, domcontentloaded, networkidle, commit
PLAYWRIGHT_NAV_WAIT_UNTIL=load

# Number of retries (default: 1)
PLAYWRIGHT_ANALYZER_RETRIES=1

# Enable self-healing (default: true)
HEALING_ENABLED=true

# Persist healed selectors (default: true)
HEALING_PERSIST=true
```

### Timeout Strategy
The DOM analyzer uses an optimized timeout strategy:
1. **First attempt**: Uses specified waitUntil strategy (default: load)
2. **Fallback attempts**: Tries 'domcontentloaded', then 'networkidle'
3. **Final fallback**: Downloads HTML snapshot and analyzes static content

This ensures analysis completes even for slow or problematic pages.

## Self-Healing Selectors

### How It Works
1. **Cache**: Successful selectors are cached in memory for the session
2. **Persistence**: Selectors are saved to `.self-heal/selectors.json`
3. **Retrieval**: On subsequent runs, persisted selectors are tried first
4. **Fallback**: If persisted selector fails, generates new candidates

### Selector Scoring
Each candidate selector is scored based on:
- **Uniqueness**: Prefers selectors that match only one element
- **Priority**: Semantic selectors (getByRole, getByLabel) score higher
- **Reliability**: ID and data-testid selectors score highest

## Usage

### Browser Action Mode
DOM analysis runs automatically when using browser action mode:

```javascript
// In frontend, when generating test with browser-action mode
POST /api/code-generation/generate-llm-playwright
{
  "promptContent": "Test login with valid credentials",
  "testName": "Valid Login Test",
  "executionMode": "browser-action",
  "environment": { ... },
  "baseUrl": "https://example.com"
}
```

### Standalone DOM Analysis
You can also perform standalone DOM analysis:

```javascript
POST /api/dom-analyzer/analyze
{
  "url": "https://example.com",
  "steps": [
    { "action": "click", "target": "login button" },
    { "action": "fill", "target": "username", "value": "admin" }
  ]
}
```

## Troubleshooting

### Issue: DOM analysis timeout
**Solution**: Increase timeout or change waitUntil strategy
```bash
PLAYWRIGHT_ANALYZER_TIMEOUT_MS=30000
PLAYWRIGHT_NAV_WAIT_UNTIL=domcontentloaded
```

### Issue: No elements discovered
**Possible causes**:
1. Page requires authentication
2. Elements loaded via JavaScript after initial load
3. Page behind CORS or other restrictions

**Solutions**:
- Use user journey analysis with login steps
- Increase timeout
- Check page accessibility

### Issue: Selectors not working in generated tests
**Possible causes**:
1. Dynamic IDs or classes
2. Elements rendered conditionally
3. Shadow DOM elements

**Solutions**:
- Enable self-healing: `HEALING_ENABLED=true`
- Use semantic selectors (getByRole, getByLabel)
- Update to latest version (improved selector generation)

## API Reference

### DOMAnalyzer.analyzePage(url, options)
Analyzes a single page and returns element information.

**Parameters**:
- `url` (string): Target URL
- `options` (object):
  - `timeout` (number): Navigation timeout in ms (default: 15000)
  - `waitUntil` (string): Wait strategy (default: 'load')
  - `retries` (number): Retry attempts (default: 1)

**Returns**: Promise<AnalysisResult>

### DOMAnalyzer.analyzeUserJourney(baseUrl, steps, options)
Analyzes multiple pages following user steps.

**Parameters**:
- `baseUrl` (string): Starting URL
- `steps` (array): Array of step objects
- `options` (object): Same as analyzePage

**Returns**: Promise<JourneyAnalysisResult>

### DOMAnalyzer.extractElements()
Extracts all interactive elements from current page.

**Returns**: Promise<Element[]>

## Future Enhancements

### Planned Features
1. **AI-powered selector recommendation**: Use ML to predict best selectors
2. **Visual element mapping**: Screenshot annotation with element positions
3. **Shadow DOM support**: Deep analysis of Shadow DOM trees
4. **Accessibility tree analysis**: Extract ARIA attributes and roles
5. **Performance metrics**: Track element load times and interactions
6. **Multi-page flows**: Automatic journey discovery
7. **Element change detection**: Compare DOM across test runs
8. **Smart waits**: Automatic detection of loading states

### Experimental Features
- Real-time element highlighting in browser
- Visual selector builder
- Element interaction replay
- Network request correlation

## Contributing
To contribute improvements to DOM analysis:

1. Add new element types in `extractElements()`
2. Enhance selector generation in `generateSelectorCandidates()`
3. Improve scoring algorithm in `scoreCandidates()`
4. Add new self-healing strategies in `resolveAndAct()`

## Related Files
- `server/services/DOMAnalyzer.js` - Core analyzer
- `server/routes/domAnalyzer.js` - API routes
- `server/routes/codeGeneration.js` - Integration point
- `.self-heal/selectors.json` - Persisted selectors

## License
Same as parent project.

