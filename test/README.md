# Build Data Encoder Tests

Tests for the build data encoding/decoding system.

## Running Tests

### Browser Console (Recommended)

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open the browser console (F12)

3. Import the test file:
   ```javascript
   import('./test/encoder.test.js')
   ```
   
   The tests will run automatically when imported.

### Standalone HTML Page

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:5173/test/encoder.html` in your browser

   (Note: You may need to create this HTML file if you want a UI-based test runner)

## What the Tests Do

The tests verify:
- Encoding and decoding are lossless (round-trip integrity)
- Custom serialized format is more compact than JSON
- Various build configurations work correctly (empty builds, single nodes, complex builds, etc.)

## Test Output

Each test prints:
- **Custom serialized length**: The compact custom format string length (before base64 encoding)
- **JSON string length**: The JSON representation length for comparison
- **Base64url encoded length**: The final URL-safe encoded length
- **Compression ratios**: How much smaller the custom format is compared to JSON
- **Original and decoded build data**: Full JSON for inspection
- **Custom serialized string**: The actual compact format string
- **Base64url encoded string**: The final encoded string used in URLs

## Test Cases

- Empty build (all zeros)
- Single node level 1
- Multiple nodes, all level 1
- Mixed levels with zeros
- High values
- With owned crystals
- Complex build with many nodes
