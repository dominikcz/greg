#!/usr/bin/env node
/**
 * scripts/build-versions.js
 *
 * Build multiple documentation versions using one of two strategies:
 * - branches (default): extract docs snapshots from git refs
 * - folders: read docs directly from configured directories
 *
 * Produces output under `dist/versions/<version>` by default and writes
 * `dist/versions/versions.json` manifest.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROJECT_ROOT = process.cwd();

function parseArgs(argv) {
    const out = {
        strategy: '',
        cleanCache: false,
        cleanOutput: false,
        passthrough: [],
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--strategy' && argv[i + 1]) {
            out.strategy = String(argv[++i]);
            continue;
        }
        if (arg === '--clean-cache') {
            out.cleanCache = true;
            continue;
        }
        if (arg === '--clean-output') {
            out.cleanOutput = true;
            continue;
        }
        out.passthrough.push(arg);
    }

    return out;
}

function normalizeRootPath(value, fallback = '/docs') {
    const cleaned = String(value || fallback).trim().replace(/^\/+|\/+$/g, '');
    return '/' + (cleaned || 'docs');
}

function normalizePathPrefix(value, fallback = '/versions') {
    const cleaned = String(value || fallback).trim().replace(/^\/+|\/+$/g, '');
    return '/' + (cleaned || 'versions');
}

function sanitizeSegment(value, fallback = 'item') {
    const cleaned = String(value || '').trim();
    const safe = cleaned.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return safe || fallback;
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function removeDir(dirPath) {
    fs.rmSync(dirPath, { recursive: true, force: true });
}

function copyDir(src, dst) {
    removeDir(dst);
    ensureDir(path.dirname(dst));
    fs.cpSync(src, dst, { recursive: true, force: true });
}

function resolveGregConfigPath() {
    const tsPath = path.join(PROJECT_ROOT, 'greg.config.ts');
    const jsPath = path.join(PROJECT_ROOT, 'greg.config.js');
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

function runCommand(command, args, options = {}) {
    const result = spawnSync(command, args, {
        stdio: options.stdio ?? 'pipe',
        encoding: options.encoding,
        shell: options.shell ?? false,
        env: options.env ?? process.env,
        maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
        cwd: options.cwd ?? PROJECT_ROOT,
    });

    const status = result.status ?? 0;
    if (!options.allowFailure && status !== 0) {
        const details = (result.stderr || result.stdout || '').toString().trim();
        throw new Error(details || `${command} failed with exit code ${status}`);
    }
    return result;
}

function git(args, options = {}) {
    return runCommand('git', args, {
        ...options,
        shell: false,
        encoding: options.encoding ?? 'utf8',
    });
}

function getCurrentBranch() {
    const out = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    return String(out.stdout || '').trim();
}

function getBranchSha(refName) {
    const out = git(['rev-parse', refName]);
    return String(out.stdout || '').trim();
}

function ensureBranchDocsSnapshot(args) {
    const { branch, sha, docsDir, branchCacheDir } = args;
    const docsRel = String(docsDir || 'docs').replace(/^\/+|\/+$/g, '') || 'docs';
    const branchKey = sanitizeSegment(branch, 'branch');
    const cacheRoot = path.resolve(PROJECT_ROOT, branchCacheDir, 'sources', branchKey, sha);
    const marker = path.join(cacheRoot, '.snapshot-ok');
    const docsSnapshotDir = path.join(cacheRoot, docsRel);

    if (fs.existsSync(marker) && fs.existsSync(docsSnapshotDir)) {
        return { docsDir: docsSnapshotDir, cacheHit: true };
    }

    removeDir(cacheRoot);
    ensureDir(cacheRoot);

    const listed = git(['ls-tree', '-r', '--name-only', sha, '--', docsRel]);
    const files = String(listed.stdout || '')
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean)
        .filter((rel) => rel.endsWith('.md') || rel.startsWith(docsRel + '/'));

    if (files.length === 0) {
        throw new Error(`No files found for '${docsRel}' in ref '${branch}' (${sha.slice(0, 8)}).`);
    }

    for (const rel of files) {
        const blob = spawnSync('git', ['show', `${sha}:${rel}`], {
            cwd: PROJECT_ROOT,
            shell: false,
            encoding: null,
            maxBuffer: 64 * 1024 * 1024,
        });
        if ((blob.status ?? 0) !== 0) continue;

        const outPath = path.join(cacheRoot, rel);
        ensureDir(path.dirname(outPath));
        fs.writeFileSync(outPath, blob.stdout);
    }

    fs.writeFileSync(marker, new Date().toISOString() + '\n', 'utf8');
    return { docsDir: docsSnapshotDir, cacheHit: false };
}

function runViteBuild(args) {
    const { docsDir, rootPath, outDir, passthrough } = args;
    const env = {
        ...process.env,
        GREG_DOCS_DIR: docsDir,
        GREG_ROOT_PATH: rootPath,
        PATH:
            path.resolve(PROJECT_ROOT, 'node_modules/.bin') +
            (process.platform === 'win32' ? ';' : ':') +
            (process.env.PATH ?? ''),
    };

    console.log(`[greg] versions: vite build -> ${path.relative(PROJECT_ROOT, outDir)}`);
    runCommand('vite', ['build', '--outDir', outDir, ...passthrough], {
        stdio: 'inherit',
        shell: true,
        env,
    });

    const staticScript = path.resolve(PROJECT_ROOT, 'scripts/generate-static.js');
    runCommand(process.execPath, [
        staticScript,
        '--docsDir', docsDir,
        '--rootPath', rootPath,
        '--distDir', outDir,
    ], {
        stdio: 'inherit',
        shell: false,
        env,
    });
}

function resolveFolderEntries(versioning, globalRootPath) {
    if (Array.isArray(versioning.folders) && versioning.folders.length > 0) {
        return versioning.folders.map((entry, index) => {
            const version = resolveVersionId(entry, `versioning.folders[${index}]`);
            return {
                version,
                title: entry.title ? String(entry.title) : version,
                docsDir: path.resolve(PROJECT_ROOT, String(entry.dir)),
                rootPath: normalizeRootPath(entry.rootPath, globalRootPath),
            };
        });
    }

    const foldersDir = path.resolve(PROJECT_ROOT, versioning.foldersDir || 'versions');
    if (!fs.existsSync(foldersDir)) return [];

    const entries = fs.readdirSync(foldersDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => {
            const docsDir = path.join(foldersDir, d.name, 'docs');
            return {
                version: d.name,
                title: d.name,
                docsDir,
                rootPath: normalizeRootPath(globalRootPath, '/docs'),
            };
        })
        .filter((entry) => fs.existsSync(entry.docsDir));

    return entries;
}

function resolveBranchEntries(versioning, globalRootPath) {
    const branchSources = Array.isArray(versioning.branches) ? versioning.branches : [];
    if (branchSources.length > 0) {
        return branchSources.map((entry, index) => {
            const version = resolveVersionId(entry, `versioning.branches[${index}]`);
            return {
                version,
                title: entry.title ? String(entry.title) : version,
                branch: String(entry.branch),
                docsDir: String(entry.docsDir || 'docs'),
                rootPath: normalizeRootPath(entry.rootPath, globalRootPath),
            };
        });
    }

    const current = getCurrentBranch();
    return [{
        version: 'latest',
        title: 'latest',
        branch: current,
        docsDir: 'docs',
        rootPath: normalizeRootPath(globalRootPath, '/docs'),
    }];
}

function resolveVersionId(entry, context) {
    const raw = entry?.version;
    const value = String(raw ?? '').trim();
    if (!value) {
        throw new Error(`Missing version id in ${context}. Use 'version'.`);
    }
    return value;
}

function assertNoKeys(obj, forbiddenKeys, context) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of forbiddenKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            throw new Error(`Unsupported key '${context}.${key}'. Remove it and use the current versioning schema.`);
        }
    }
}

function validateEntry(entry, context, mode) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new Error(`${context} must be an object.`);
    }

    assertNoKeys(entry, ['id', 'label', 'current'], context);

    const version = String(entry.version ?? '').trim();
    if (!version) {
        throw new Error(`${context}.version is required.`);
    }

    if (mode === 'branches') {
        const branch = String(entry.branch ?? '').trim();
        if (!branch) {
            throw new Error(`${context}.branch is required for branch strategy.`);
        }
    }

    if (mode === 'folders') {
        const dir = String(entry.dir ?? '').trim();
        if (!dir) {
            throw new Error(`${context}.dir is required for folder strategy.`);
        }
    }
}

function validateVersioningConfig(versioning, strategy) {
    if (!versioning || typeof versioning !== 'object' || Array.isArray(versioning)) {
        throw new Error('versioning config must be an object.');
    }

    assertNoKeys(versioning, ['current'], 'versioning');

    if (versioning.default != null && !String(versioning.default).trim()) {
        throw new Error('versioning.default cannot be empty.');
    }

    if (versioning.aliases != null) {
        if (typeof versioning.aliases !== 'object' || Array.isArray(versioning.aliases)) {
            throw new Error('versioning.aliases must be an object map of alias -> version.');
        }
        for (const [alias, target] of Object.entries(versioning.aliases)) {
            if (!String(alias).trim() || !String(target ?? '').trim()) {
                throw new Error('versioning.aliases cannot contain empty alias names or targets.');
            }
        }
    }

    if (strategy === 'branches' && Array.isArray(versioning.branches)) {
        versioning.branches.forEach((entry, index) => validateEntry(entry, `versioning.branches[${index}]`, 'branches'));
    }

    if (strategy === 'folders' && Array.isArray(versioning.folders)) {
        versioning.folders.forEach((entry, index) => validateEntry(entry, `versioning.folders[${index}]`, 'folders'));
    }
}

function buildAliasMap(aliasConfig, versions) {
    if (!aliasConfig || typeof aliasConfig !== 'object' || Array.isArray(aliasConfig)) {
        return {};
    }

    const versionIds = new Set(versions.map((v) => v.version));
    const aliases = {};

    for (const [aliasName, rawTarget] of Object.entries(aliasConfig)) {
        const alias = String(aliasName || '').trim();
        const target = String(rawTarget || '').trim();
        if (!alias || !target) continue;

        if (!versionIds.has(target)) {
            throw new Error(`Alias '${alias}' points to '${target}', but no matching version exists.`);
        }
        aliases[alias] = target;
    }

    return aliases;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const config = await loadGregConfig();
    const versioning = config.versioning ?? {};

    const strategy = args.strategy || versioning.strategy || 'branches';
    validateVersioningConfig(versioning, strategy);
    const globalRootPath = normalizeRootPath(config.rootPath, '/docs');
    const versionPathPrefix = normalizePathPrefix(versioning.pathPrefix, '/versions');
    const outputRoot = path.resolve(PROJECT_ROOT, versioning.outDir || 'dist/versions');
    const workRoot = path.resolve(PROJECT_ROOT, '.greg/version-build');
    const branchCacheDir = path.resolve(PROJECT_ROOT, versioning.branchCacheDir || '.greg/version-cache');

    if (args.cleanCache) removeDir(branchCacheDir);
    if (args.cleanOutput) removeDir(outputRoot);

    ensureDir(outputRoot);
    ensureDir(workRoot);
    ensureDir(branchCacheDir);

    const manifest = {
        default: versioning.default || null,
        versions: [],
        aliases: {},
    };

    if (strategy === 'folders') {
        const entries = resolveFolderEntries(versioning, globalRootPath);
        if (entries.length === 0) {
            throw new Error('No folder versions configured. Set versioning.folders or create versioning.foldersDir children.');
        }

        for (const entry of entries) {
            if (!fs.existsSync(entry.docsDir)) {
                throw new Error(`Folder docs source not found for version '${entry.version}': ${entry.docsDir}`);
            }

            const tempOut = path.join(workRoot, sanitizeSegment(entry.version));
            removeDir(tempOut);
            ensureDir(tempOut);

            console.log(`[greg] versions: building '${entry.version}' from folder ${path.relative(PROJECT_ROOT, entry.docsDir)}`);
            runViteBuild({
                docsDir: entry.docsDir,
                rootPath: entry.rootPath,
                outDir: tempOut,
                passthrough: args.passthrough,
            });

            const targetOut = path.join(outputRoot, entry.version);
            copyDir(tempOut, targetOut);

            manifest.versions.push({
                version: entry.version,
                title: entry.title,
                path: `${versionPathPrefix}/${entry.version}/`,
            });
        }
    } else if (strategy === 'branches') {
        const entries = resolveBranchEntries(versioning, globalRootPath);
        if (entries.length === 0) {
            throw new Error('No branch versions configured. Set versioning.branches in greg.config.*');
        }

        for (const entry of entries) {
            const sha = getBranchSha(entry.branch);
            const snapshot = ensureBranchDocsSnapshot({
                branch: entry.branch,
                sha,
                docsDir: entry.docsDir,
                branchCacheDir,
            });

            const buildCache = path.join(branchCacheDir, 'builds', sanitizeSegment(entry.version), sha);
            const hasBuildCache = fs.existsSync(path.join(buildCache, 'index.html'));

            if (!hasBuildCache) {
                console.log(`[greg] versions: building '${entry.version}' from ${entry.branch} (${sha.slice(0, 8)})`);
                runViteBuild({
                    docsDir: snapshot.docsDir,
                    rootPath: entry.rootPath,
                    outDir: buildCache,
                    passthrough: args.passthrough,
                });
            } else {
                console.log(`[greg] versions: cache hit '${entry.version}' from ${entry.branch} (${sha.slice(0, 8)})`);
            }

            const targetOut = path.join(outputRoot, entry.version);
            copyDir(buildCache, targetOut);

            manifest.versions.push({
                version: entry.version,
                title: entry.title,
                path: `${versionPathPrefix}/${entry.version}/`,
            });
        }
    } else {
        throw new Error(`Unsupported versioning strategy '${strategy}'. Use 'branches' or 'folders'.`);
    }

    const seen = new Set();
    for (const version of manifest.versions) {
        if (seen.has(version.version)) {
            throw new Error(`Duplicate version id '${version.version}' in versioning config.`);
        }
        seen.add(version.version);
    }

    manifest.aliases = buildAliasMap(versioning.aliases, manifest.versions);

    if (!manifest.default && manifest.versions.length > 0) {
        manifest.default = manifest.versions[0].version;
    }

    if (manifest.default && !seen.has(manifest.default) && !(manifest.default in manifest.aliases)) {
        throw new Error(`Default version '${manifest.default}' does not match any version or alias.`);
    }

    const manifestPath = path.join(outputRoot, 'versions.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

    console.log(`[greg] versions: done -> ${path.relative(PROJECT_ROOT, outputRoot)}`);
    console.log(`[greg] versions: manifest -> ${path.relative(PROJECT_ROOT, manifestPath)}`);
}

main().catch((error) => {
    console.error('[greg] versions failed:', error.message || error);
    process.exit(1);
});
