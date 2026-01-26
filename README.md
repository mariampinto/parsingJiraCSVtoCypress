# CSV to Cypress Spec Generator

A simple, standalone CLI tool that converts **Jira-exported test case CSV files** into ready-to-customize **Cypress E2E test skeletons**.

It reads standard Jira test case exports (columns: **Action**, **Data**, **Expected Result**) and generates a clean `.cy.js` file with:

- `describe` / `it` block using the test name  
- Numbered steps as clear comments  
- Multi-line actions split into separate comment lines  
- Optional inclusion of **Expected Result** column as comments  

## Features

- ✅ Handles quoted fields, multi-line cells and typical Jira CSV quirks  
- ✅ Smart filename sanitization (`"User Login Flow"` → `user-login-flow.cy.js`)  
- ✅ Optional subfolder output (`--folder smoke-tests`)  
- ✅ Custom test/suite name via `--name`  
- ✅ `--include-expected-results` to include expected results as code comments  
- ✅ `--include-data` to include data column as code comments  
- ✅ `--dry-run` to preview output without writing files  
- ✅ Automatically looks for files in `./inputs/` folder for convenience  
- ✅ Modern Node.js (ESM + async/await)  
- ✅ Professional CLI with `commander.js` (better help, validation, error messages)

## Requirements

- Node.js ≥ 18

## Installation

```bash
# Clone the repo
git clone https://github.com/mariammpinto/csv-to-cypress-spec.git
cd csv-to-cypress-spec

# Install dependencies
npm install
```

**Note:** The script requires Node.js ≥ 18 and uses ES modules.

## Important: Preparing Your CSV File

The script does NOT connect to Jira or download anything.
You must manually export your test cases and place the CSV file on your filesystem first.

### How to prepare the file

**In Jira:**
1. Go to Issues → Search for your test cases
2. Click Export → Export Excel CSV (all fields)
   - (or Export CSV (current fields) — both usually work)
3. Save the downloaded file.

**Recommended folder structure** (makes usage easiest):

```
csv-to-cypress-spec/
├── script.js                  ← the main script
├── package.json               ← project dependencies
├── inputs/                    ← ← ← place your exported CSVs here
│   ├── login-flow.csv
│   ├── checkout-process.csv
│   └── regression.csv
├── cypress/
│   └── e2e/                   ← generated spec files go here
├── .gitignore
├── LICENSE
└── README.md
```

When the file is inside `./inputs/`, you can run the script using just the filename:

```bash
node script.js --csv login-flow.csv
```

If the file is somewhere else, provide the full or relative path:

```bash
node script.js --csv ../jira-exports/regression.csv
```

**(Recommended) Add inputs/ to .gitignore** to avoid accidentally committing real test data:

```gitignore
inputs/
*.csv
```

## Usage

### Basic example

CSV is in `./inputs/` → just filename:

```bash
node script.js --csv login-flow.csv
# or
npm start -- --csv login-flow.csv
```

### With custom name, folder and expected results

```bash
node script.js \
  --csv regression-suite.csv \
  --name "Full User Onboarding Regression" \
  --folder regression \
  --include-expected-results \
  --include-data \
  --out-dir cypress/e2e
```

### Preview without writing (dry-run)

```bash
node script.js --csv login-flow.csv --dry-run
```

### Get help

```bash
node script.js --help
node script.js --version
```

## All available flags

| Flag | Description | Default | Required? |
|------|-------------|---------|-----------|
| `--csv` | Filename (in `./inputs/`) or path to CSV | — | **Yes** |
| `--name` | Test/suite name (used in describe/it) | CSV filename (no extension) | No |
| `--out-dir` | Base output directory for specs | `cypress/e2e` | No |
| `--folder` | Subfolder inside `--out-dir` | — (flat) | No |
| `--include-expected-results` | Include "Expected Result" as comments | Off | No |
| `--include-data` | Include "Data" column as comments | Off | No |
| `--dry-run` | Preview output without writing files | Off | No |

## More examples

Using path outside `inputs/`:

```bash
node script.js --csv ../test-data/pre-approval.csv --name "Pre-Approval Flow"
```

Quick with expected results and data:

```bash
node script.js --csv checkout.csv --include-expected-results --include-data
```

Test with example file:

```bash
node script.js --csv inputs/example-test-cases.csv --dry-run
```


## Example generated output

**Input CSV excerpt:**

```csv
Action,Data,Expected Result
"Login to the application","username: testuser / password: Pass123!","User is logged in and dashboard is displayed"
"Navigate to Profile page",,"Profile information is shown correctly"
"Click 'Edit Profile' button",,"Edit form appears with current values pre-filled"
```

**Generated file** (`cypress/e2e/user-onboarding.cy.js`):

```javascript
// Auto-generated Cypress spec from test case CSV

describe("Full User Onboarding Regression", () => {
  it("Full User Onboarding Regression", () => {

    // Step 1: Login to the application
    // Expected result:
    // User is logged in and dashboard is displayed

    // Step 2: Navigate to Profile page
    // Expected result:
    // Profile information is shown correctly

    // Step 3: Click 'Edit Profile' button
    // Expected result:
    // Edit form appears with current values pre-filled

  });
});
```

## Tips

- Use `--include-expected-results` during early implementation — it keeps acceptance criteria visible in code
- After generation, replace comments with real Cypress commands (`cy.visit`, `cy.get`, `cy.type`, assertions, etc.)
- Run the script from your project root (or adjust `--out-dir` accordingly)
- Generated files are intentionally minimal — ready for you to fill in selectors and logic

## Contributing

PRs and ideas welcome!

## License

[MIT](LICENSE)
