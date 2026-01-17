#!/usr/bin/env node
/**
 * Code Theater - Turn your git history into a dramatic screenplay
 */

import { createProgram } from './cli/index.js';

const program = createProgram();

program.parse(process.argv);

// If no arguments provided, show help
if (process.argv.length === 2) {
  program.help();
}
