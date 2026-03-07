#!/usr/bin/env node
/**
 * greg init
 *
 * Interactive initializer — creates the minimal files needed to start a
 * new documentation project with Greg.
 *
 * Usage:
 *   npx @dominikcz/greg init
 *   greg init
 */
import * as p from '@clack/prompts';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── ANSI helpers (used for file-creation log lines) ───────────────────────────
const g = (s) => `\x1b[32m${s}\x1b[0m`;  // green
const y = (s) => `\x1b[33m${s}\x1b[0m`;  // yellow
const c = (s) => `\x1b[36m${s}\x1b[0m`;  // cyan
const b = (s) => `\x1b[1m${s}\x1b[0m`;   // bold
const d = (s) => `\x1b[2m${s}\x1b[0m`;   // dim

function orCancel(value) {
    if (p.isCancel(value)) { p.cancel('Cancelled.'); process.exit(0); }
    return value;
}

// ── Template loader ───────────────────────────────────────────────────────────
function tpl(relPath, vars = {}) {
    const full = join(__dirname, 'templates', relPath);
    let content = readFileSync(full, 'utf-8');
    for (const [k, v] of Object.entries(vars)) {
        content = content.split(`{{${k}}}`).join(v);
    }
    return content;
}

// ── File writer ───────────────────────────────────────────────────────────────
const cwd = process.cwd();

function ensure(relPath, content) {
    const full = join(cwd, relPath);
    if (existsSync(full)) {
        console.log(`  ${y('~')} ${relPath}  ${d('(skipped – already exists)')}`);
        return;
    }
    const dir = dirname(full);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(full, content, 'utf-8');
    console.log(`  ${g('+')} ${relPath}`);
}

// ── Package manager detector ────────────────────────────────────────────────
function detectPm() {
    if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
    return 'npm';
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
    p.intro(`${b(c(' Greg '))}  Documentation Setup`);

    const docsPath   = orCancel(await p.text({ message: 'Docs path', initialValue: './docs' }));
    const title      = orCancel(await p.text({ message: 'Site title', initialValue: 'My Docs' }));
    const desc       = orCancel(await p.text({ message: 'Site description', initialValue: 'Documentation' }));
    const useTS      = orCancel(await p.confirm({ message: 'Use TypeScript for configuration?', initialValue: true }));
    const addScripts = orCancel(await p.confirm({ message: 'Add greg scripts to package.json?', initialValue: true }));
    const docsType   = orCancel(await p.select({
        message: 'Documentation contents',
        options: [
            { value: '1', label: 'Empty project',                hint: 'blank docs folder with a starter page' },
            { value: '2', label: 'Sample documentation',         hint: 'starter template with examples' },
            { value: '3', label: 'Generated fake documentation', hint: 'random Markdown files via fakeDocsGenerator' },
        ],
    }));

    let fakeFilesLimit = 10000;
    if (docsType === '3') {
        const raw = orCancel(await p.text({ message: 'Number of files to generate', initialValue: '10000' }));
        fakeFilesLimit = parseInt(raw, 10) || 10000;
    }

    // ── Derive values ─────────────────────────────────────────────────────────
    const docsDir  = docsPath.replace(/^\.\//, '').replace(/\/$/, '');
    const rootPath = '/' + docsDir;
    const ext      = useTS ? 'ts' : 'js';
    const vars     = { TITLE: title, DESCRIPTION: desc, DOCS_DIR: docsDir, ROOT_PATH: rootPath, EXT: ext };

    p.log.step('Creating files…');

    // ── Core scaffold ─────────────────────────────────────────────────────────
    ensure('index.html',           tpl('index.html', vars));
    ensure(`src/main.${ext}`,      tpl('src/main.js'));           // same content for .js and .ts
    ensure('src/App.svelte',       tpl('src/App.svelte'));
    ensure('src/app.css',          tpl('src/app.css'));
    ensure(`vite.config.${ext}`,   tpl('vite.config.js', vars)); // same content for .js and .ts
    ensure('svelte.config.js',     tpl('svelte.config.js'));     // always .js — vite-plugin-svelte requires it
    ensure(`greg.config.${ext}`,   tpl(useTS ? 'greg.config.ts' : 'greg.config.js', vars));

    if (useTS) {
        ensure('tsconfig.json', tpl('tsconfig.json'));
    }

    // ── Docs ──────────────────────────────────────────────────────────────────
    if (docsType === '1') {
        ensure(`${docsDir}/index.md`, `# Welcome to ${title}\n\nStart writing your documentation here.\n`);
    } else if (docsType === '2') {
        // Mini sample docs from templates
        const templateDocsDir = join(__dirname, 'templates', 'docs');
        copyTemplateDir(templateDocsDir, docsDir, vars);
    } else {
        // Fake docs via fakeDocsGenerator
        const generatorScript = join(__dirname, '../fakeDocsGenerator/generate_docs.js');
        if (!existsSync(generatorScript)) {
            console.log(`  ${y('!')} fakeDocsGenerator not found at ${generatorScript}`);
        } else {
            p.log.step('Running fake docs generator…');
            await new Promise((resolve, reject) => {
                const child = fork(generatorScript, [
                    '--output', join(cwd, docsDir),
                    '--files-limit', String(fakeFilesLimit),
                ], { stdio: 'inherit' });
                child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Generator exited with code ${code}`)));
            });
        }
    }

    // ── package.json scripts + devDependencies ────────────────────────────────
    // @dominikcz/greg is written to devDependencies directly (never via npm install)
    // so that local `npm link` and future registry installs both work correctly.
    const { version: gregVersion } = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
    {
        const pkgPath = join(cwd, 'package.json');
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                let changed = false;
                if (addScripts) {
                    pkg.scripts ??= {};
                    for (const [k, v] of [['dev', 'greg dev'], ['build', 'greg build'], ['preview', 'greg preview']]) {
                        if (!pkg.scripts[k]) { pkg.scripts[k] = v; changed = true; }
                    }
                }
                pkg.devDependencies ??= {};
                if (!pkg.devDependencies['@dominikcz/greg']) {
                    pkg.devDependencies['@dominikcz/greg'] = `^${gregVersion}`;
                    changed = true;
                }
                if (changed) {
                    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
                    p.log.success('package.json  ' + d('(updated)'));
                } else {
                    p.log.warn('package.json  ' + d('(already up to date, skipped)'));
                }
            } catch {
                p.log.warn('Could not update package.json');
            }
        } else {
            const pkg = {
                name: 'my-docs',
                version: '0.0.1',
                type: 'module',
                ...(addScripts ? { scripts: { dev: 'greg dev', build: 'greg build', preview: 'greg preview' } } : {}),
                devDependencies: { '@dominikcz/greg': `^${gregVersion}` },
            };
            writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
            console.log(`  ${g('+')} package.json`);
        }
    }

    // ── Install dependencies ──────────────────────────────────────────────────
    // @dominikcz/greg is already in package.json devDependencies — install only peer deps.
    const peerDepsArr = [
        '@sveltejs/vite-plugin-svelte',
        'svelte',
        'vite',
        ...(useTS ? ['typescript'] : []),
    ];
    const pm = detectPm();
    const installArgs = pm === 'npm'
        ? ['install', '--save-dev', ...peerDepsArr]
        : ['add', '-D', ...peerDepsArr];

    const installNow = orCancel(await p.confirm({ message: 'Install dependencies now?', initialValue: true }));

    if (installNow) {
        p.log.step(`Running ${pm} ${installArgs[0]}…`);
        const result = spawnSync(pm, installArgs, { cwd, stdio: 'inherit', shell: true });
        if (result.status !== 0) {
            p.log.warn('Installation failed. Run manually:');
            console.log(`  ${c(`${pm} ${installArgs.join(' ')}`)}`);
        }

        // Try to link @dominikcz/greg for local development (fails silently when not needed)
        if (!existsSync(join(cwd, 'node_modules/@dominikcz/greg'))) {
            const linkResult = spawnSync('npm', ['link', '@dominikcz/greg'], { cwd, stdio: 'pipe', shell: true });
            if (linkResult.status !== 0) {
                p.log.warn('@dominikcz/greg not found locally. Run after publishing or linking:');
                console.log(`  ${c('npm link @dominikcz/greg')}  ${d('(local dev)')}`);
                console.log(`  ${c('npm install')}  ${d('(after publishing)')}`);
            }
        }
    }

    p.outro(
        installNow
            ? `${b(g('Done!'))}  Start your project:\n\n  ${c('npm run dev')}`
            : `${b(g('Done!'))}  Next steps:\n\n  ${c(`${pm} ${installArgs.join(' ')}`)}\n  ${c('npm run dev')}`
    );
}

// ── Recursive template dir copy (applies variable substitution) ──────────────
function copyTemplateDir(srcDir, destRel, vars) {
    for (const entry of readdirSync(srcDir)) {
        const srcPath = join(srcDir, entry);
        if (statSync(srcPath).isDirectory()) {
            copyTemplateDir(srcPath, join(destRel, entry), vars);
        } else {
            let content = readFileSync(srcPath, 'utf-8');
            for (const [k, v] of Object.entries(vars)) {
                content = content.split(`{{${k}}}`).join(v);
            }
            ensure(join(destRel, entry), content);
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
