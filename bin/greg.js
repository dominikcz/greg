#!/usr/bin/env node
/**
 * greg CLI
 *
 * Usage:
 *   greg dev                    Start the Vite development server
 *   greg build                  Build for production
 *   greg preview                Preview the production build
 *   greg search-server          Start the standalone search server (production)
 *   greg --version              Print the Greg version
 *   greg --help                 Show this help message
 */
import { spawnSync, fork } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const [,, command, ...args] = process.argv;

function help() {
    console.log(`
  greg v${pkg.version}

  Usage: greg <command> [options]

  Commands:
    dev            Start the Vite development server
    build          Build the project for production
    preview        Preview the production build
    search-server  Start the standalone search API server (production)
                   Options: --index <path>  --port <number>  --host <addr>
                            --url   <path>  (endpoint path, default /api/search)

  Options:
    --version   Show version number
    --help      Show this help message
`);
}

function run(cmd, extraArgs = []) {
    const result = spawnSync(cmd, extraArgs, {
        stdio: 'inherit',
        shell: true,
        // Ensure the local node_modules/.bin is on the PATH so that
        // the project-local vite binary is preferred.
        env: {
            ...process.env,
            PATH: resolve(__dirname, '../node_modules/.bin') +
                (process.platform === 'win32' ? ';' : ':') +
                (process.env.PATH ?? ''),
        },
    });
    process.exit(result.status ?? 0);
}

switch (command) {
    case 'dev':
        run('vite', args);
        break;
    case 'build':
        run('vite build', args);
        break;
    case 'preview':
        run('vite preview', args);
        break;
    case 'search-server': {
        // Run the standalone search server directly in this process
        // (no shell needed — it’s a Node.js script in the package).
        const serverScript = resolve(__dirname, '../src/lib/MarkdownDocs/searchServer.js');
        const child = fork(serverScript, args, { stdio: 'inherit' });
        child.on('exit', code => process.exit(code ?? 0));
        break;
    }
    case '--version':
    case '-v':
        console.log(pkg.version);
        break;
    case '--help':
    case '-h':
    case undefined:
        help();
        break;
    default:
        console.error(`  Unknown command: ${command}\n`);
        help();
        process.exit(1);
}
