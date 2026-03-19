import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vitePluginCopyDocs } from '../vitePluginCopyDocs.js';

/**
 * Build the plugin, call configResolved to set the project root, then
 * register the dev-server middleware and return it directly.
 */
function createMiddleware(options, root) {
    const plugin = vitePluginCopyDocs(options);
    plugin.configResolved({ root, build: { outDir: 'dist' }, base: '/' });
    let middleware = null;
    plugin.configureServer({ middlewares: { use(fn) { middleware = fn; } } });
    return middleware;
}

/**
 * Simulate a single GET request through the middleware.
 * Resolves with the captured response, or with `{ passedThrough: true }` when
 * the middleware calls next() without writing a response.
 */
function request(middleware, url) {
    return new Promise((resolve) => {
        const response = { headers: {}, body: null };
        const res = {
            setHeader(name, value) { response.headers[name.toLowerCase()] = value; },
            end(data) { response.body = data; resolve(response); },
        };
        middleware({ url }, res, () => resolve({ passedThrough: true }));
    });
}

/** Convert a response body (Buffer or string) to a UTF-8 string. */
function bodyText(body) {
    return Buffer.isBuffer(body) ? body.toString('utf8') : body;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

describe('vitePluginCopyDocs › configureServer', () => {
    const tempDirs = [];

    afterEach(() => {
        for (const dir of tempDirs.splice(0)) {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    // ── fix: decodeURIComponent in the docs-path handler (line 117) ───────────

    it('serves a file whose name contains Polish characters (percent-encoded URL)', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'docs', 'przewodnik'), { recursive: true });
        // File name with Polish letters: ścieżki.md  (ś = U+015B, ż = U+017C)
        writeFileSync(join(root, 'docs', 'przewodnik', 'ścieżki.md'), '# Ścieżki', 'utf8');

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs' }, root);

        // A browser sends Polish characters percent-encoded in the request URL.
        // %C5%9B = ś, %C5%BCki = żki
        const res = await request(mw, '/docs/przewodnik/%C5%9Bcie%C5%BCki.md');

        expect(res.passedThrough).toBeUndefined();
        expect(res.headers['content-type']).toContain('text/plain');
        expect(bodyText(res.body)).toBe('# Ścieżki');
    });

    it('serves a file inside a directory whose name contains Polish characters', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        // Directory name with Polish letters: ścieżki  (ś = U+015B, ż = U+017C)
        mkdirSync(join(root, 'docs', 'ścieżki'), { recursive: true });
        writeFileSync(join(root, 'docs', 'ścieżki', 'index.md'), '# Start', 'utf8');

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs' }, root);

        // %C5%9B = ś, %C5%BC = ż
        const res = await request(mw, '/docs/%C5%9Bcie%C5%BCki/index.md');

        expect(res.passedThrough).toBeUndefined();
        expect(bodyText(res.body)).toBe('# Start');
    });

    it('serves a file whose path contains multiple Polish-character segments', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        // Both the directory and the file name contain Polish letters.
        // directory: przewodnik, file: właściwości.md  (ł = U+0142, ś = U+015B, ć = U+0107)
        mkdirSync(join(root, 'docs', 'przewodnik'), { recursive: true });
        writeFileSync(
            join(root, 'docs', 'przewodnik', 'właściwości.md'),
            '# Właściwości',
            'utf8',
        );

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs' }, root);

        // właściwości → w%C5%82a%C5%9Bciwo%C5%9Bci
        const res = await request(mw, '/docs/przewodnik/w%C5%82a%C5%9Bciwo%C5%9Bci.md');

        expect(res.passedThrough).toBeUndefined();
        expect(bodyText(res.body)).toBe('# Właściwości');
    });

    // ── regression guard: ASCII paths must still work after the fix ───────────

    it('serves a plain ASCII path correctly', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'docs', 'guide'), { recursive: true });
        writeFileSync(join(root, 'docs', 'guide', 'intro.md'), '# Introduction', 'utf8');

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs' }, root);
        const res = await request(mw, '/docs/guide/intro.md');

        expect(res.passedThrough).toBeUndefined();
        expect(bodyText(res.body)).toBe('# Introduction');
    });

    it('calls next() when the decoded path matches no file', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'docs'), { recursive: true });

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs' }, root);
        const res = await request(mw, '/docs/%C5%9Bcie%C5%BCka-nie-istnieje.md');

        expect(res.passedThrough).toBe(true);
    });

    // ── fix: URIError on malformed percent-encoding ────────────────────────────

    it('calls next() and does not throw when URL contains malformed percent-encoding', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'docs'), { recursive: true });

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs' }, root);
        // %GG is not valid percent-encoding – decodeURIComponent throws URIError
        const res = await request(mw, '/docs/%GGinvalid.md');

        expect(res.passedThrough).toBe(true);
    });

    // ── fix: path traversal protection ────────────────────────────────────────

    it('blocks path traversal attempt via %2F..%2F in docs URL', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'docs'), { recursive: true });
        // Create a sensitive file outside the docs dir
        writeFileSync(join(root, 'secret.md'), '# SECRET', 'utf8');

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs' }, root);
        // Encoded path traversal: /docs/../secret.md → decodes to /docs/../secret.md
        const res = await request(mw, '/docs/%2E%2E%2Fsecret.md');

        // Must NOT serve the file outside docs/
        expect(res.passedThrough).toBe(true);
    });

    // ── fix: staticDirs – decodeURIComponent + path traversal ─────────────────

    it('serves a snippet file with Polish characters (percent-encoded URL)', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'snippets'), { recursive: true });
        writeFileSync(join(root, 'snippets', 'przykład.js'), '// przykład', 'utf8');

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs', staticDirs: ['snippets'] }, root);
        // przykład → przyk%C5%82ad
        const res = await request(mw, '/snippets/przyk%C5%82ad.js');

        expect(res.passedThrough).toBeUndefined();
        expect(res.headers['content-type']).toContain('text/plain');
        expect(bodyText(res.body)).toBe('// przykład');
    });

    it('calls next() and does not throw when staticDirs URL has malformed percent-encoding', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'snippets'), { recursive: true });

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs', staticDirs: ['snippets'] }, root);
        const res = await request(mw, '/snippets/%GGinvalid.js');

        expect(res.passedThrough).toBe(true);
    });

    it('blocks path traversal attempt via %2F..%2F in staticDirs URL', async () => {
        const root = mkdtempSync(join(tmpdir(), 'greg-plugin-'));
        tempDirs.push(root);

        mkdirSync(join(root, 'snippets'), { recursive: true });
        writeFileSync(join(root, 'secret.js'), '// SECRET', 'utf8');

        const mw = createMiddleware({ docsDir: 'docs', srcDir: '/docs', staticDirs: ['snippets'] }, root);
        // Encoded path traversal: /snippets/../secret.js
        const res = await request(mw, '/snippets/%2E%2E%2Fsecret.js');

        expect(res.passedThrough).toBe(true);
    });
});
