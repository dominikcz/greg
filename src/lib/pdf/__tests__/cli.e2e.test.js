/**
 * End-to-end test of `greg pdf` on a fixture project (fixtures/pdf-project).
 * Slow and needs a Chromium-based browser (Edge/Chrome) — run with `npm run test:pdf`.
 * Skipped when no browser can be launched.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPdfCommand } from '../cli.js';
import { closePdf, extractPageLines, openPdf, readOutline } from '../pdfInspect.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, 'fixtures', 'pdf-project');

async function canLaunchBrowser() {
    try {
        const { chromium } = await import('playwright-core');
        for (const channel of ['msedge', 'chrome']) {
            try {
                const browser = await chromium.launch({ channel });
                await browser.close();
                return true;
            } catch { /* try next */ }
        }
    } catch { /* playwright-core missing */ }
    return false;
}

const browserAvailable = await canLaunchBrowser();

async function inspect(file) {
    const doc = await openPdf(fs.readFileSync(file));
    try {
        const pages = await extractPageLines(doc);
        const sizes = [];
        for (let i = 1; i <= doc.numPages; i++) {
            const [, , w, h] = (await doc.getPage(i)).view;
            sizes.push({ w, h });
        }
        return {
            numPages: doc.numPages,
            pages: pages.map((lines) => lines.map((l) => l.text)),
            headers: pages.map((lines) => lines.find((l) => l.edge)?.text ?? ''),
            text: pages.map((lines) => lines.map((l) => l.text).join('\n')).join('\n'),
            outline: await readOutline(doc),
            sizes,
        };
    } finally {
        await closePdf(doc);
    }
}

describe.runIf(browserAvailable)('greg pdf (end to end)', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'greg-pdf-e2e-'));
    let exitCode;
    let manual;
    let podrecznik;

    beforeAll(async () => {
        // --strict: any warning (missing anchor, TOC/bookmark mismatch, overflow…) fails the run.
        exitCode = await runPdfCommand(['--dev', '--strict', '--out', out], { root: fixture });
        manual = await inspect(path.join(out, 'manual.pdf'));
        podrecznik = await inspect(path.join(out, 'podrecznik.pdf'));
    });

    afterAll(() => {
        fs.rmSync(out, { recursive: true, force: true });
    });

    it('prints every book without warnings', () => {
        expect(exitCode).toBe(0);
        expect(manual.numPages).toBe(7);
    });

    it('selects content: pdf-only in, web-only and pdf: false out', () => {
        expect(manual.text).toContain('PDF_ONLY_MARKER');
        expect(manual.text).not.toContain('WEB_ONLY_MARKER');
        expect(manual.text).not.toContain('SITE_ONLY_MARKER');
    });

    it('renders cover and back cover with tokens', () => {
        expect(manual.pages[0].join(' ')).toContain('COVER_MARKER Acme Cloud 2.1 (2026-01-31)');
        expect(manual.pages.at(-1).join(' ')).toContain('BACK_COVER_MARKER Fixture Manual');
    });

    it('numbers chapters and resolves cross references', () => {
        expect(manual.text).toContain('Setup is described in chapter 2.');
        const titles = manual.outline.map((o) => o.title);
        expect(titles).toEqual(expect.arrayContaining([
            'Contents', '1. Introduction', '1.1. Requirements', '2. Setup', '2.1. Options', '3. Wide tables', 'Revision history',
        ]));
        // Chromium heading-fragmentation bug guard: no doubled bookmark titles.
        expect(titles.some((t) => t.length > 6 && t.slice(0, t.length / 2) === t.slice(t.length / 2))).toBe(false);
    });

    it('prints TOC page numbers that match the bookmarks', () => {
        const toc = manual.pages[1];
        for (const item of manual.outline.filter((o) => o.title !== 'Contents' && o.level <= 2)) {
            const line = toc.find((l) => l.startsWith(item.title.replace(/^(\d+(?:\.\d+)*\.)/, '$1 ').replace(/\s+/g, ' ').trim()) || l.includes(item.title.replace(/^\d+(?:\.\d+)*\.\s*/, '')));
            expect(line, item.title).toBeDefined();
            expect(line.trim().endsWith(` ${item.page}`) || line.trim().endsWith(String(item.page)), `${item.title} → ${item.page}: ${line}`).toBe(true);
        }
    });

    it('prints every code group tab', () => {
        expect(manual.text).toContain('npm install fixture-npm');
        expect(manual.text).toContain('pnpm add fixture-pnpm');
    });

    it('prints pdf.landscape pages on landscape sheets', () => {
        const landscape = manual.pages.findIndex((lines) => lines.some((l) => l.includes('LANDSCAPE_MARKER')));
        expect(landscape).toBeGreaterThan(-1);
        manual.sizes.forEach((size, index) => {
            expect(size.w > size.h, `page ${index + 1}`).toBe(index === landscape);
        });
    });

    it('mirrors running headers on left-hand pages', () => {
        const page = (title) => manual.pages.findIndex((lines) => lines.some((l) => l === title));
        const right = page('1. Introduction');
        const left = page('2. Setup');
        expect(right % 2).toBe(0); // page 3 (index 2): right-hand page
        expect(manual.headers[right]).toMatch(/^Acme Cloud .*1\. Introduction$/);
        expect(manual.headers[left]).toMatch(/^2\. Setup .*Acme Cloud$/);
    });

    it('prints a book from another locale', () => {
        expect(podrecznik.text).toContain('POLISH_MARKER');
        expect(podrecznik.text).toContain('Spis treści');
        expect(podrecznik.outline.map((o) => o.title)).toContain('1. Wstęp');
    });
});
