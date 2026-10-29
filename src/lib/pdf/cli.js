/**
 * `greg pdf` — generates PDF books from the docs.
 *
 *   greg pdf [book…] [options]
 *
 * Flow: build the site (or use the dev server / an existing build), open
 * `/__pdf/<book>` in headless Chromium (system Edge/Chrome through playwright-core),
 * wait for the print route to signal readiness, print. When the TOC shows page
 * numbers, a first print is inspected to find the page of every TOC target, the
 * numbers are injected and the book is printed again (layout is already done,
 * so the second pass is cheap).
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { loadGregConfig } from '../MarkdownDocs/loadGregConfig.js';
import { collectFrontmatters } from '../MarkdownDocs/vitePluginFrontmatter.js';
import { prepareMenu, parseSidebarConfig } from '../MarkdownDocs/docsUtils.js';
import { DEFAULT_OUTPUT_BASE_DIR } from '../MarkdownDocs/versioningDefaults.js';
import { bookRoutePath, formatManifest, getBookConfig, listBookIds, resolveBook } from './resolveBook.js';
import { anchorPageNumbers, closePdf, countPages, openPdf, readOutline } from './pdfInspect.js';
import { computePageNumbers, normalizeNumbering } from '../MarkdownDocs/numbering.js';

const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (text, code) => (USE_COLOR ? `\x1b[${code}m${text}\x1b[0m` : text);
const info = (msg) => console.log(`${color('[greg:pdf]', '1;36')} ${msg}`);
const warn = (msg) => console.warn(`${color('[greg:pdf]', '1;33')} ${msg}`);
const fail = (msg) => console.error(`${color('[greg:pdf]', '1;31')} ${msg}`);

const MIN_CHROMIUM = 131;
const ERROR_CODES = new Set(['PDF_LINK_OUTSIDE_BOOK_ERROR']);

export const PDF_HELP = `
  greg pdf [book…] [options]   Generate PDF books (pdf.books in greg.config)

    --list               Print the resolved content of each book and exit
    --dev                Print from a dev server (no production build)
    --no-build           Use the existing build output (skip vite build)
    --out <dir>          Output directory (overrides book.output)
    --browser <name>     msedge | chrome | chromium | path to the executable
    --compare <file.pdf> Compare the text content with a reference PDF (report next to the output)
    --strict             Exit with an error when any warning is reported
    --open               Open the generated PDF
    --timeout <seconds>  Max time to wait for the print route (default 180)
`;

function parseArgs(argv) {
    const opts = { books: [], build: true, dev: false, list: false, strict: false, open: false, timeout: 180 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const value = () => argv[++i];
        if (a === '--list') opts.list = true;
        else if (a === '--dev') opts.dev = true;
        else if (a === '--no-build') opts.build = false;
        else if (a === '--strict') opts.strict = true;
        else if (a === '--open') opts.open = true;
        else if (a === '--out') opts.out = value();
        else if (a === '--browser') opts.browser = value();
        else if (a === '--compare') opts.compare = value();
        else if (a === '--compare-skip') opts.compareSkip = value();
        else if (a === '--timeout') opts.timeout = Number(value()) || opts.timeout;
        else if (a === '--help' || a === '-h') opts.help = true;
        else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
        else opts.books.push(a);
    }
    return opts;
}

function normalizeSrcDir(value) {
    const cleaned = String(value ?? '').trim().replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
    return cleaned ? `/${cleaned}` : '/';
}

/** Same data the site computes for a locale: frontmatter map + sidebar tree. */
export function loadDocsModel(config, root = process.cwd(), locale = '/') {
    const docsDir = config.srcDir ?? 'docs';
    const docsBase = Object.prototype.hasOwnProperty.call(config, 'docsBase') ? config.docsBase : '';
    const baseDir = normalizeSrcDir(docsBase);
    const localeKey = locale && locale !== '/' ? locale : '/';
    const srcDir = localeKey === '/' ? baseDir : normalizeSrcDir(`${docsBase}/${localeKey}`);
    const all = collectFrontmatters({ root, docsDir, srcDir: baseDir });
    // Only this locale's pages: other locale subtrees are dropped for the root locale.
    const otherLocales = Object.keys(config.locales ?? {})
        .filter((key) => key !== '/' && key !== '' && key !== localeKey)
        .map((key) => normalizeSrcDir(`${docsBase}/${key}`));
    const frontmatters = Object.fromEntries(
        Object.entries(all).filter(([key]) =>
            (srcDir === '/' || key.startsWith(srcDir + '/'))
            && !otherLocales.some((prefix) => key.startsWith(prefix + '/'))),
    );
    const sidebar = config.locales?.[localeKey]?.themeConfig?.sidebar
        ?? (localeKey === '/' ? config.sidebar : undefined)
        ?? 'auto';
    const menu = Array.isArray(sidebar)
        ? (parseSidebarConfig(sidebar, frontmatters, srcDir) ?? prepareMenu(frontmatters, srcDir, frontmatters))
        : prepareMenu(frontmatters, srcDir, frontmatters);
    return { frontmatters, menu, srcDir };
}

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

async function startServer(opts, root) {
    const vite = await import('vite');
    const port = await freePort();
    if (opts.dev) {
        info('starting dev server…');
        const server = await vite.createServer({
            root,
            logLevel: 'warn',
            server: { host: '127.0.0.1', port, strictPort: true, open: false, hmr: false },
        });
        await server.listen();
        return { url: server.resolvedUrls.local[0], close: () => server.close() };
    }
    if (opts.build) {
        info('building site…');
        const started = Date.now();
        await vite.build({ root, logLevel: 'warn' });
        info(`build done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    }
    const server = await vite.preview({
        root,
        logLevel: 'warn',
        preview: { host: '127.0.0.1', port, strictPort: true, open: false },
    });
    return {
        url: server.resolvedUrls.local[0],
        close: () => new Promise((resolve) => server.httpServer.close(() => resolve())),
    };
}

async function launchBrowser(preferred) {
    let playwright;
    try {
        playwright = await import('playwright-core');
    } catch {
        throw new Error('playwright-core is required for greg pdf. Install it with: npm i -D playwright-core');
    }
    const requested = preferred || process.env.GREG_PDF_BROWSER;
    const attempts = requested
        ? [requested]
        : ['msedge', 'chrome', 'chromium'];
    const errors = [];
    for (const candidate of attempts) {
        try {
            const isPath = /[\\/]/.test(candidate) || candidate.endsWith('.exe');
            const options = isPath
                ? { executablePath: candidate }
                : candidate === 'chromium' ? {} : { channel: candidate };
            const browser = await playwright.chromium.launch(options);
            const major = Number(String(browser.version()).split('.')[0]);
            if (major && major < MIN_CHROMIUM) {
                await browser.close();
                errors.push(`${candidate}: version ${browser.version()} < ${MIN_CHROMIUM}`);
                continue;
            }
            return { browser, name: candidate, version: browser.version() };
        } catch (error) {
            errors.push(`${candidate}: ${String(error.message).split('\n')[0]}`);
        }
    }
    throw new Error(
        `No usable Chromium-based browser (>= ${MIN_CHROMIUM}) found.\n  ${errors.join('\n  ')}\n` +
        '  Install Edge/Chrome, pass --browser <path>, or run: npx playwright install chromium',
    );
}

function resolveOutput(book, config, opts, root) {
    const fileName = `${book.id}.pdf`;
    if (opts.out) return path.resolve(root, opts.out, book.output ? path.basename(book.output) : fileName);
    if (book.output) return path.resolve(root, String(book.output).replace(/\{version\}/g, book.version ?? ''));
    const outDir = String(config.outDir || DEFAULT_OUTPUT_BASE_DIR).trim() || DEFAULT_OUTPUT_BASE_DIR;
    return path.resolve(root, outDir, 'pdf', fileName);
}

const PDF_OPTIONS = {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    outline: true,
    tagged: true,
};

const normalizeTitle = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Cross-check TOC page numbers with the PDF bookmarks (Chromium builds both from the
 * same headings, but link destinations are affected by a fragmentation bug the
 * bookmarks are not). Entries are matched in document order by heading text; a
 * mismatch is corrected in place. Returns descriptions of corrected entries.
 */
export async function reconcileWithOutline(doc, tocEntries, pages) {
    if (!tocEntries.length) return [];
    const outline = await readOutline(doc);
    const fixed = [];
    let cursor = 0;
    for (const entry of tocEntries) {
        const text = normalizeTitle(entry.text);
        if (!text || !entry.target) continue;
        let found = -1;
        for (let i = cursor; i < outline.length; i++) {
            if (normalizeTitle(outline[i].title).includes(text)) {
                found = i;
                break;
            }
        }
        if (found === -1) continue;
        cursor = found + 1;
        const page = outline[found].page;
        if (page && pages[entry.target] !== page) {
            fixed.push(`"${entry.text}" ${pages[entry.target] ?? '?'} → ${page}`);
            pages[entry.target] = page;
        }
    }
    return fixed;
}

async function printBook(context, baseUrl, routePath, opts) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const timings = {};
    let t = Date.now();
    const url = new URL(routePath.replace(/^\/+/, ''), baseUrl).href;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
        await page.waitForFunction(() => window.__GREG_PDF__?.ready === true, null, { timeout: opts.timeout * 1000 });
    } catch {
        const state = await page.evaluate(() => window.__GREG_PDF__ ?? null).catch(() => null);
        throw new Error(`Print route did not become ready within ${opts.timeout}s (state: ${JSON.stringify(state)}).` +
            (consoleErrors.length ? `\n  ${consoleErrors.slice(0, 5).join('\n  ')}` : ''));
    }
    const signal = await page.evaluate(() => {
        const { setPageNumbers, ...rest } = window.__GREG_PDF__;
        return rest;
    });
    if (signal.error) throw new Error(signal.error);
    timings.render = Date.now() - t;

    t = Date.now();
    let buffer = await page.pdf(PDF_OPTIONS);
    timings.pass1 = Date.now() - t;
    let pageCount = null;
    let tocNumbers = 0;

    if (signal.book?.toc?.pageNumbers && signal.tocTargets?.length) {
        t = Date.now();
        const firstDoc = await openPdf(buffer);
        const firstCount = firstDoc.numPages;
        const pages = await anchorPageNumbers(firstDoc, signal.tocTargets);
        const fixed = await reconcileWithOutline(firstDoc, signal.tocEntries ?? [], pages);
        await closePdf(firstDoc);
        if (fixed.length) {
            signal.warnings.push({
                code: 'PDF_TOC_PAGE_MISMATCH',
                message: `${fixed.length} TOC entries pointed to a different page than their bookmark (corrected): ${fixed.slice(0, 5).join('; ')}`,
            });
        }
        tocNumbers = await page.evaluate((map) => window.__GREG_PDF__.setPageNumbers(map), pages);
        timings.inspect = Date.now() - t;
        t = Date.now();
        buffer = await page.pdf(PDF_OPTIONS);
        timings.pass2 = Date.now() - t;
        pageCount = await countPages(buffer);
        if (pageCount !== firstCount) {
            signal.warnings.push({
                code: 'PDF_TOC_REFLOW',
                message: `Page count changed after adding TOC numbers (${firstCount} → ${pageCount}); TOC numbers may be off.`,
            });
        }
    }
    await page.close();
    if (pageCount == null) pageCount = await countPages(buffer).catch(() => null);
    return { buffer, signal, timings, pageCount, tocNumbers, consoleErrors };
}

function summarizeWarnings(warnings) {
    const byCode = new Map();
    for (const w of warnings) {
        if (!byCode.has(w.code)) byCode.set(w.code, []);
        byCode.get(w.code).push(w.message);
    }
    return byCode;
}

function openFile(file) {
    const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '""', file] : [file];
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}

export async function runPdfCommand(argv, { root = process.cwd() } = {}) {
    let opts;
    try {
        opts = parseArgs(argv);
    } catch (error) {
        fail(error.message);
        console.log(PDF_HELP);
        return 1;
    }
    if (opts.help) {
        console.log(PDF_HELP);
        return 0;
    }

    const config = await loadGregConfig(root);
    const knownIds = listBookIds(config.pdf);
    const bookIds = opts.books.length ? opts.books : knownIds;
    const unknown = bookIds.filter((id) => !getBookConfig(config.pdf, id, config));
    if (unknown.length) {
        fail(`Unknown book(s): ${unknown.join(', ')}. Available: ${knownIds.join(', ')}`);
        return 1;
    }

    if (opts.list) {
        for (const id of bookIds) {
            const book = getBookConfig(config.pdf, id, config);
            const manifest = resolveBook({ book, ...loadDocsModel(config, root, book.locale) });
            const numbering = normalizeNumbering(book.numbering);
            const numbers = numbering ? computePageNumbers(manifest.entries, numbering.depth) : null;
            console.log(formatManifest(id, manifest, numbers));
            console.log('');
        }
        return 0;
    }

    const started = Date.now();
    let server;
    let browserHandle;
    let exitCode = 0;
    try {
        [server, browserHandle] = await Promise.all([startServer(opts, root), launchBrowser(opts.browser)]);
        info(`browser: ${browserHandle.name} ${browserHandle.version}`);
        const context = await browserHandle.browser.newContext({ colorScheme: 'light' });
        for (const id of bookIds) {
            const book = getBookConfig(config.pdf, id, config);
            const output = resolveOutput(book, config, opts, root);
            info(`printing "${id}"…`);
            const result = await printBook(context, server.url, bookRoutePath(id, book, config), opts);
            fs.mkdirSync(path.dirname(output), { recursive: true });
            fs.writeFileSync(output, result.buffer);

            const warnings = [
                ...result.signal.warnings,
                ...result.consoleErrors.map((message) => ({ code: 'PDF_BROWSER_ERROR', message })),
            ];
            const t = result.timings;
            info(`${color('✓', '32')} ${path.relative(root, output)} — ${result.pageCount ?? '?'} pages from ${result.signal.pages} source pages` +
                ` (render ${t.render}ms, print ${t.pass1}ms${t.pass2 != null ? ` + inspect ${t.inspect}ms + print ${t.pass2}ms` : ''})`);
            if (result.signal.book?.toc?.pageNumbers) info(`  TOC: ${result.tocNumbers}/${result.signal.tocTargets.length} entries with page numbers`);
            for (const [code, messages] of summarizeWarnings(warnings)) {
                warn(`  ${code} (${messages.length})`);
                for (const message of messages.slice(0, 10)) console.warn(`    - ${message}`);
                if (messages.length > 10) console.warn(`    … ${messages.length - 10} more`);
            }
            if (warnings.some((w) => ERROR_CODES.has(w.code)) || (opts.strict && warnings.length)) exitCode = 1;

            if (opts.compare) {
                const { comparePdfs } = await import('./compare.js');
                const reportPath = output.replace(/\.pdf$/i, '') + '.compare.md';
                const summary = await comparePdfs({
                    reference: path.resolve(root, opts.compare),
                    candidate: output,
                    headings: result.signal.headings,
                    skip: opts.compareSkip,
                    reportPath,
                });
                info(`  compare: ${summary.text} → ${path.relative(root, reportPath)}`);
                if (opts.strict && summary.differences > 0) exitCode = 1;
            }
            if (opts.open) openFile(output);
        }
        await context.close();
    } catch (error) {
        fail(error.message);
        exitCode = 1;
    } finally {
        await browserHandle?.browser.close().catch(() => {});
        await Promise.resolve(server?.close()).catch(() => {});
    }
    info(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return exitCode;
}
