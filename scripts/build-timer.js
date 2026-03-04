#!/usr/bin/env node
/**
 * Wraps a shell command and prints elapsed time on completion.
 * Usage: node scripts/build-timer.js <command> [args...]
 */
import { spawnSync } from 'node:child_process';

const cmd = process.argv.slice(2).join(' ');
if (!cmd) { console.error('Usage: build-timer.js <command>'); process.exit(1); }

const start = Date.now();
const result = spawnSync(cmd, { stdio: 'inherit', shell: true });
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log(`\n⏱  Done in ${elapsed}s`);
process.exit(result.status ?? 0);
