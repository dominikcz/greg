#!/usr/bin/env node
/**
 * greg init
 *
 * Interactive initializer - creates the minimal files needed to start a
 * new documentation project with Greg.
 *
 * Usage:
 *   npx @dominikcz/greg init
 *   greg init
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- ANSI helpers ----------------------------------------------------------------------------------------------------------------------------
const g  = (s) => `\x1b[32m${s}\x1b[0m`;   // green
const y  = (s) => `\x1b[33m${s}\x1b[0m`;   // yellow
const c  = (s) => `\x1b[36m${s}\x1b[0m`;   // cyan
const b  = (s) => `\x1b[1m${s}\x1b[0m`;    // bold
const d  = (s) => `\x1b[2m${s}\x1b[0m`;    // dim

// ---- Prompts --------------------------------------------------------------------------------------------------------------------------------------
const rl = createInterface({ input, output });

async function ask(label, defaultVal = '') {
    const hint = defaultVal ? d(` (${defaultVal})`) : '';
    const answer = await rl.question(`  ${label}${hint}: `);
    return answer.trim() || defaultVal;
}

async function askYN(label, defaultYes = true) {
    const hint = d(defaultYes ? ' (Y/n)' : ' (y/N)');
    const raw = (await rl.question(`  ${label}${hint}: `)).trim().toLowerCase();
    return !raw ? defaultYes : raw === 'y' || raw === 'yes';
}

async function askChoice(label, choices) {
    console.log(`  ${label}`);
    choices.forEach(([key, desc]) => console.log(`    ${c(key)}) ${desc}`));
    while (true) {
        const raw = (await rl.question(`  Your choice: `)).trim();
        if (choices.some(([k]) => k === raw)) return raw;
        console.log(`  ${y('?')} Please enter one of: ${choices.map(([k]) => k).join(', ')}`);
    }
}

// ---- Template loader ----------------------------------------------------------------------------------------------------------------------
function tpl(relPath, vars = {}) {
    const full = join(__dirname, 'templates', relPath);
    let content = readFileSync(full, 'utf-8');
    for (const [k, v] of Object.entries(vars)) {
        content = content.split(`{{${k}}}`).join(v);
    }
    return content;
}

// ---- File writer ------------------------------------------------------------------------------------------------------------------------------
const cwd = process.cwd();

function ensure(relPath, content) {
    const full = join(cwd, relPath);
    if (existsSync(full)) {
        console.log(`  ${y('~')} ${relPath}  ${d('(skipped â€“ already exists)')}`);
        return;
    }
    const dir = dirname(full);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(full, content, 'utf-8');
    console.log(`  ${g('+')} ${relPath}`);
}

// ---- Recursive copy ------------------------------------------------------------------------------------------------------------------------
const SKIP_DIRS = new Set(['fake-docs']);

function copyDir(src, destRel) {
    const entries = readdirSync(src);
    for (const entry of entries) {
        if (SKIP_DIRS.has(entry)) continue;
        const srcPath  = join(src, entry);
        const destPath = join(cwd, destRel, entry);
        const stat = statSync(srcPath);
        if (stat.isDirectory()) {
            if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
            copyDir(srcPath, join(destRel, entry));
        } else {
            if (existsSync(destPath)) {
                console.log(`  ${y('~')} ${join(destRel, entry)}  ${d('(skipped)')}`);
            } else {
                copyFileSync(srcPath, destPath);
                console.log(`  ${g('+')} ${join(destRel, entry)}`);
            }
        }
    }
}

// ---- main --------------------------------------------------------------------------------------------------------------------------------------------
async function main() {
    console.log();
    console.log(`  ${b(c('Greg'))}  Documentation Setup`);
    console.log();

    // ---- Questions --------------------------------------------------------------------------------------------------------------------------
    const docsPath   = await ask('Docs path', './docs');
    const title      = await ask('Site title', 'My Docs');
    const desc       = await ask('Site description', 'Documentation');
    const useTS      = await askYN('Use TypeScript for configuration?', true);
    const addScripts = await askYN('Add greg scripts to package.json?', true);

    console.log();
    const docsType = await askChoice('Documentation contents:', [
        ['1', 'Empty project (blank docs folder)'],
        ['2', `Sample documentation  ${d("(copies greg's own docs)")}`],
        ['3', `Generated fake documentation  ${d('(fakeDocsGenerator)')}`],
    ]);

    let fakeFilesLimit = 10000;
    if (docsType === '3') {
        const raw = await ask('Number of files to generate', '10000');
        fakeFilesLimit = parseInt(raw, 10) || 10000;
    }

    rl.close();

    // ---- Derive values ------------------------------------------------------------------------------------------------------------------
    const docsDir  = docsPath.replace(/^\.\//, '').replace(/\/$/, '');
    const rootPath = '/' + docsDir;
    const ext      = useTS ? 'ts' : 'js';
    const vars     = { TITLE: title, DESCRIPTION: desc, DOCS_DIR: docsDir, ROOT_PATH: rootPath, EXT: ext };

    console.log();
    console.log(`  ${b('Creating filesâ€¦')}`);
    console.log();

    // ---- Core scaffold ------------------------------------------------------------------------------------------------------------------
    ensure('index.html',             tpl('index.html', vars));
    ensure(`src/main.${ext}`,        tpl('src/main.js'));           // same content for .js and .ts
    ensure('src/App.svelte',         tpl('src/App.svelte'));
    ensure('src/app.css',            tpl('src/app.css'));
    ensure(`vite.config.${ext}`,     tpl('vite.config.js', vars)); // same content for .js and .ts
    ensure(`svelte.config.${ext}`,   tpl('svelte.config.js'));
    ensure(`greg.config.${ext}`,     tpl(useTS ? 'greg.config.ts' : 'greg.config.js', vars));

    if (useTS) {
        ensure('tsconfig.json', tpl('tsconfig.json'));
    }

    // ---- Docs ------------------------------------------------------------------------------------------------------------------------------------
    if (docsType === '1') {
        // Empty project - minimal starter pages
        ensure(`${docsDir}/index.md`,           tpl('docs/index.md', vars));
        ensure(`${docsDir}/getting-started.md`, tpl('docs/getting-started.md', vars));
    } else if (docsType === '2') {
        // Sample docs - copy greg's own docs (excluding fake-docs)
        const srcDocs = join(__dirname, '../docs');
        if (!existsSync(srcDocs)) {
            console.log(`  ${y('!')} Could not find sample docs at ${srcDocs}`);
        } else {
            if (!existsSync(join(cwd, docsDir))) mkdirSync(join(cwd, docsDir), { recursive: true });
            copyDir(srcDocs, docsDir);
        }
    } else {
        // Fake docs - run fakeDocsGenerator as a child process
        const generatorScript = join(__dirname, '../fakeDocsGenerator/generate_docs.js');
        if (!existsSync(generatorScript)) {
            console.log(`  ${y('!')} fakeDocsGenerator not found at ${generatorScript}`);
        } else {
            console.log();
            console.log(`  ${b('Running fake docs generatorâ€¦')}`);
            console.log();
            await new Promise((resolve, reject) => {
                const child = fork(generatorScript, [
                    '--output', join(cwd, docsDir),
                    '--files-limit', String(fakeFilesLimit),
                ], { stdio: 'inherit' });
                child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Generator exited with code ${code}`)));
            });
        }
    }

    // ---- package.json scripts ----------------------------------------------------------------------------------------------------
    if (addScripts) {
        const pkgPath = join(cwd, 'package.json');
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                pkg.scripts ??= {};
                let changed = false;
                for (const [k, v] of [['dev', 'greg dev'], ['build', 'greg build'], ['preview', 'greg preview']]) {
                    if (!pkg.scripts[k]) { pkg.scripts[k] = v; changed = true; }
                }
                if (changed) {
                    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
                    console.log(`  ${g('~')} package.json  ${d('(scripts added)')}`);
                } else {
                    console.log(`  ${y('~')} package.json  ${d('(scripts already present, skipped)')}`);
                }
            } catch {
                console.warn(`  ${y('!')} Could not update package.json`);
            }
        } else {
            const pkg = {
                name: 'my-docs',
                version: '0.0.1',
                type: 'module',
                scripts: { dev: 'greg dev', build: 'greg build', preview: 'greg preview' },
            };
            writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
            console.log(`  ${g('+')} package.json`);
        }
    }

    // ---- Next steps ------------------------------------------------------------------------------------------------------------------------
    const devDeps = [
        '@dominikcz/greg',
        '@sveltejs/vite-plugin-svelte',
        'svelte',
        'vite',
        ...(useTS ? ['typescript'] : []),
    ].join(' ');

    console.log();
    console.log(`  ${b(g('Done!'))}  Install dependencies and start:\n`);
    console.log(`    ${c('npm install --save-dev')} ${devDeps}`);
    console.log(`    ${c('npm run dev')}`);
    console.log();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
