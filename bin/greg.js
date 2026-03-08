#!/usr/bin/env node
/**
 * greg CLI
 *
 * Usage:
 *   greg init                    Initialise a new documentation project
 *   greg dev                    Start the Vite development server
 *   greg build                  Build for production
 *   greg build:static           Build for production and generate static route files
 *   greg build:markdown         Export resolved markdown files
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

const [, , command, ...args] = process.argv;

function help() {
    console.log(`
  greg v${pkg.version}

  Usage: greg <command> [options]

  Commands:
    init           Initialise a new documentation project (interactive)
    dev            Start the Vite development server
    build          Build the project for production
    build:static   Build and generate static route files
    build:markdown Export resolved markdown files to dist/resolved-markdown
    preview        Preview the production build
    search-server  Start the standalone search API server (production)
                   Options: --index <path>  --port <number>  --host <addr>
                            --url   <path>  (endpoint path, default /api/search)
                            --cors-origin <value>  (default *)
                            --cors-methods <value> (default "GET, OPTIONS")
                            --cors-headers <value> (default "Content-Type")
                            --cors-max-age <value> (default 86400)

  Options:
    --version   Show version number
    --help      Show this help message
`);
}

function run(cmd, extraArgs = [], options = {}) {
    const { exit = true } = options;
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
    const status = result.status ?? 0;
    if (exit) process.exit(status);
    return status;
}

function runNodeScript(scriptPath, extraArgs = [], options = {}) {
    const { exit = true } = options;
    const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
        stdio: 'inherit',
        env: {
            ...process.env,
            PATH: resolve(__dirname, '../node_modules/.bin') +
                (process.platform === 'win32' ? ';' : ':') +
                (process.env.PATH ?? ''),
        },
    });
    const status = result.status ?? 0;
    if (exit) process.exit(status);
    return status;
}

switch (command) {
    case 'init': {
        const initScript = resolve(__dirname, 'init.js');
        const child = fork(initScript, args, { stdio: 'inherit' });
        child.on('exit', code => process.exit(code ?? 0));
        break;
    }
    case 'dev':
        run('vite', args);
        break;
    case 'build':
        run('vite build', args);
        break;
    case 'build:static': {
        const buildStatus = run('vite build', args, { exit: false });
        if (buildStatus !== 0) process.exit(buildStatus);
        const staticScript = resolve(__dirname, '../scripts/generate-static.js');
        runNodeScript(staticScript);
        break;
    }
    case 'build:markdown': {
        const markdownScript = resolve(__dirname, '../scripts/render-markdown.js');
        runNodeScript(markdownScript, args);
        break;
    }
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
