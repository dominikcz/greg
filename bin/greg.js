#!/usr/bin/env node
/**
 * greg CLI
 *
 * Usage:
 *   greg init                    Initialise a new documentation project
 *   greg dev                    Start the Vite development server
 *   greg build                  Build for production (auto-detects versioning config)
 *   greg build:static           Build for production and generate static route files
 *   greg build:markdown         Export resolved markdown files
 *   greg preview                Preview the production build
 *   greg search-server          Start the standalone search server (production)
 *   greg --version              Print the Greg version
 *   greg --help                 Show this help message
 */
import { spawnSync, fork } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import fs from 'node:fs';
import { DEFAULT_OUTPUT_BASE_DIR } from '../src/lib/MarkdownDocs/versioningDefaults.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR;

const [, , command, ...args] = process.argv;

function color(text, code) {
    return USE_COLOR ? `\x1b[${code}m${text}\x1b[0m` : text;
}

function infoTag() {
    return color('[greg]', '1;36');
}

function warnTag() {
    return color('[greg:warn]', '1;33');
}

function errorTag() {
    return color('[greg:error]', '1;31');
}

function help() {
    console.log(`
  greg v${pkg.version}

  Usage: greg <command> [options]

  Commands:
    init           Initialise a new documentation project (interactive)
    dev            Start the Vite development server
    build          Build for production (auto-detects versioning config)
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
    --single    With 'build': force a single vite build
        --clean-versions With 'build' + versioning: remove versioned output before build
        --rebuild-all With 'build' + versioning: rebuild all versions and skip build cache
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

function printElapsedSeconds(startMs) {
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`\n${infoTag()} ${color(`Done in ${elapsed}s`, '32')}`);
}

function resolveGregConfigPath() {
    const tsPath = resolve(__dirname, '../greg.config.ts');
    const jsPath = resolve(__dirname, '../greg.config.js');
    if (fs.existsSync(tsPath)) return tsPath;
    if (fs.existsSync(jsPath)) return jsPath;
    return null;
}

async function loadTsConfig(configPath) {
    const { transform } = await import('esbuild');
    const source = fs.readFileSync(configPath, 'utf8');
    const { code } = await transform(source, {
        format: 'esm',
        loader: 'ts',
        target: 'node18',
    });
    const dataUrl = 'data:text/javascript,' + encodeURIComponent(code);
    const mod = await import(dataUrl);
    return mod.default ?? {};
}

async function loadGregConfig() {
    const configPath = resolveGregConfigPath();
    if (!configPath) return {};
    if (configPath.endsWith('.ts')) return loadTsConfig(configPath);
    const fileUrl = pathToFileURL(configPath).href + '?t=' + Date.now();
    const mod = await import(fileUrl);
    return mod.default ?? {};
}

async function hasVersioningBuildConfig() {
    try {
        const config = await loadGregConfig();
        const versioning = config?.versioning;
        if (!versioning || typeof versioning !== 'object' || Array.isArray(versioning)) return false;

        const hasBranches = Array.isArray(versioning.branches) && versioning.branches.length > 0;
        const hasFolders = Array.isArray(versioning.folders) && versioning.folders.length > 0;
        const hasFoldersDir = typeof versioning.foldersDir === 'string' && versioning.foldersDir.trim().length > 0;
        return hasBranches || hasFolders || hasFoldersDir;
    } catch (error) {
        console.warn(`${warnTag()} Could not read greg.config.* (${error?.message || error}). Falling back to single build.`);
        return false;
    }
}

function resolveSiteOutDir(config) {
    return String(config?.outDir || DEFAULT_OUTPUT_BASE_DIR).trim() || DEFAULT_OUTPUT_BASE_DIR;
}

function resolveDocsSourceDir(config) {
    return String(config?.srcDir || 'docs').trim() || 'docs';
}

function resolveDocsBase(config) {
    const docsBaseValue = Object.prototype.hasOwnProperty.call(config || {}, 'docsBase')
        ? config.docsBase
        : '';
    const cleaned = String(docsBaseValue ?? '').trim().replace(/^\/+|\/+$/g, '');
    return '/' + cleaned;
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
    case 'build': {
        const startedAt = Date.now();
        const forceSingle = args.includes('--single');
        const passthroughArgs = args.filter((a) => a !== '--single');
        const shouldBuildVersions = !forceSingle && await hasVersioningBuildConfig();

        if (shouldBuildVersions) {
            console.log(`${infoTag()} ${color('versioning config detected. Running multi-version build.', '36')}`);
            const versionsScript = resolve(__dirname, '../scripts/build-versions.js');
            const status = runNodeScript(versionsScript, passthroughArgs, { exit: false });
            printElapsedSeconds(startedAt);
            process.exit(status);
        }

        const status = run('vite build', passthroughArgs, { exit: false });
        printElapsedSeconds(startedAt);
        process.exit(status);
    }
    case 'build:static': {
        const startedAt = Date.now();
        const config = await loadGregConfig();
        const distDir = resolveSiteOutDir(config);
        const docsDir = resolveDocsSourceDir(config);
        const srcDir = resolveDocsBase(config);
        const buildStatus = run('vite build', args, { exit: false });
        if (buildStatus !== 0) {
            printElapsedSeconds(startedAt);
            process.exit(buildStatus);
        }
        const staticScript = resolve(__dirname, '../scripts/generate-static.js');
        const status = runNodeScript(
            staticScript,
            ['--docsDir', docsDir, '--srcDir', srcDir, '--distDir', distDir],
            { exit: false },
        );
        printElapsedSeconds(startedAt);
        process.exit(status);
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
        // (no shell needed - it is a Node.js script in the package).
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
        console.error(`${errorTag()} Unknown command: ${command}\n`);
        help();
        process.exit(1);
}
