#!/usr/bin/env node
/**
 * CSV to Cypress E2E spec generator
 * Converts Jira-style test case CSVs (columns: Action, Data, Expected Result)
 * into a basic Cypress test skeleton with steps documented as comments.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('csv-to-cypress')
  .description('Convert Jira-exported test case CSV files into Cypress E2E test skeletons')
  .version('1.0.0')
  .requiredOption('--csv <path>', 'Path to input CSV file (or filename if in ./inputs/)')
  .option('--out-dir <dir>', 'Base output directory', 'cypress/e2e')
  .option('--folder <folder>', 'Subfolder inside out-dir')
  .option('--name <name>', 'Test/suite name (defaults to CSV filename)')
  .option('--include-expected-results', 'Include "Expected Result" as comments')
  .option('--include-data', 'Include "Data" column as comments')
  .option('--dry-run', 'Show what would be generated without writing files')
  .parse(process.argv);

const opts = program.opts();

// ============================================================================
// File & Path Helpers
// ============================================================================

async function resolveInputFile(csvArg) {
  if (!csvArg) throw new Error('Missing --csv <path>');

  let resolved = csvArg;
  if (await fileExists(resolved)) return resolved;

  // Optional: look in a local "inputs" folder
  const fallback = path.join('inputs', csvArg);
  if (await fileExists(fallback)) return fallback;

  throw new Error(`CSV file not found: ${csvArg}`);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function getOutputFolder({ outDir = 'cypress/e2e', folder }) {
  if (!folder) return outDir;
  return path.join(outDir, folder);
}

// ============================================================================
// CSV Parsing
// ============================================================================

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1] ?? '';

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
  }

  fields.push(field.trim());
  return fields;
}

async function readTestSteps(filePath, options = {}) {
  const { includeExpected = false, includeData = false } = options;
  
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());

  if (lines.length < 1) {
    throw new Error('Empty CSV file');
  }

  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());

  const idxAction = header.findIndex(h => /action/i.test(h));
  const idxData = includeData ? header.findIndex(h => /^data$/i.test(h)) : -1;
  const idxExpected = includeExpected
    ? header.findIndex(h => /expected|result/i.test(h))
    : -1;

  if (idxAction < 0) {
    throw new Error(
      "CSV must contain an 'Action' column. Found columns: " + header.join(', ')
    );
  }

  const steps = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const action = cols[idxAction]?.trim();

    if (!action) continue;

    const step = { action };

    if (includeData && idxData >= 0) {
      const data = cols[idxData]?.trim();
      if (data) step.data = data;
    }

    if (includeExpected && idxExpected >= 0) {
      const expected = cols[idxExpected]?.trim();
      if (expected) step.expected = expected;
    }

    steps.push(step);
  }

  if (steps.length === 0) {
    throw new Error('No steps with non-empty Action found in CSV');
  }

  return steps;
}

// ============================================================================
// Spec Generation 
// ============================================================================

function generateCypressSpec({ name, steps, includeExpected, includeData }) {
  const indent = '  ';
  const lines = [
    '// Auto-generated Cypress spec from test case CSV',
    '// → Replace comments with real commands + assertions',
    '',
    `describe("${escapeString(name)}", () => {`,
    `${indent}it("${escapeString(name)}", () => {`,
  ];

  steps.forEach((step, i) => {
    lines.push('');
    const firstActionLine = step.action.split('\n')[0].trim();
    lines.push(`${indent.repeat(2)}// Step ${i + 1}: ${firstActionLine}`);

    // Multi-line action → extra lines as comments
    const actionRest = step.action.split('\n').slice(1);
    actionRest.forEach(l => {
      const trimmed = l.trim();
      if (trimmed) {
        lines.push(`${indent.repeat(2)}// ${trimmed}`);
      }
    });

    // Data column (when requested)
    if (includeData && step.data) {
      lines.push(`${indent.repeat(2)}// Data: ${step.data.split('\n')[0].trim()}`);
      const dataRest = step.data.split('\n').slice(1);
      dataRest.forEach(l => {
        const trimmed = l.trim();
        if (trimmed) {
          lines.push(`${indent.repeat(2)}// ${trimmed}`);
        }
      });
    }

    // Expected result (when requested)
    if (includeExpected && step.expected) {
      const firstExpectedLine = step.expected.split('\n')[0].trim();
      lines.push(`${indent.repeat(2)}// Expected result: ${firstExpectedLine}`);
      const expectedRest = step.expected.split('\n').slice(1);
      expectedRest.forEach(l => {
        const trimmed = l.trim();
        if (trimmed) {
          lines.push(`${indent.repeat(2)}// ${trimmed}`);
        }
      });
    }
  });

  lines.push(`${indent}});`);
  lines.push('});');

  return lines.join('\n');
}

function escapeString(str) {
  return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    const csvPath = await resolveInputFile(opts.csv);
    const steps = await readTestSteps(csvPath, {
      includeExpected: !!opts.includeExpectedResults,
      includeData: !!opts.includeData,
    });

    const testName =
      opts.name || path.basename(csvPath, path.extname(csvPath));
    const safeFileName =
      testName
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() + '.cy.js';

    const outFolder = getOutputFolder({
      outDir: opts.outDir,
      folder: opts.folder,
    });

    const outPath = path.join(outFolder, safeFileName);

    const content = generateCypressSpec({
      name: testName,
      steps,
      includeExpected: !!opts.includeExpectedResults,
      includeData: !!opts.includeData,
    });

    if (opts.dryRun) {
      console.log('\n=== DRY RUN MODE ===\n');
      console.log(`Would generate: ${outPath}`);
      console.log(`Steps: ${steps.length}`);
      console.log('\n=== Generated Content Preview ===\n');
      console.log(content);
      return;
    }

    await fs.mkdir(outFolder, { recursive: true });

    if (await fileExists(outPath)) {
      console.warn(`⚠️  Overwriting existing file: ${outPath}`);
    }

    await fs.writeFile(outPath, content, 'utf-8');

    console.log(`\n✅ Generated Cypress spec:`);
    console.log(`   → ${outPath}`);
    console.log(`   (${steps.length} steps)`);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    if (err.stack && process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(err.stack);
    }
    process.exitCode = 1;
  }
}

main();