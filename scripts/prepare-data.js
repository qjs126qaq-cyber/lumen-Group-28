#!/usr/bin/env node
// Public entry point for the privacy-safe data preparation step.
// Run: node scripts/prepare-data.js
// The calculation implementation lives in build-derived.js so it remains
// separate from the future browser-side presentation logic.
require('./build-derived.js');

