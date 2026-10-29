import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkContainers, rehypeContainers } from '../../MarkdownDocs/remarkContainers.js';

async function render(md, options) {
    const file = await unified()
        .use(remarkParse)
        .use(remarkContainers, options)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeContainers)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(md);
    return String(file);
}

const source = [
    'Intro',
    '',
    '::: web-only',
    'Click **Download**.',
    ':::',
    '',
    '::: pdf-only',
    '',
    'Visit the site.',
    '',
    '- item',
    '',
    ':::',
    '',
    '::: pdf-only other',
    'Only in book other.',
    ':::',
    '',
    '::: tip',
    '',
    'Tip body',
    '',
    '::: web-only',
    'Nested web.',
    ':::',
    '',
    ':::',
    '',
    '::: page-break',
    ':::',
    '',
    'Outro',
].join('\n');

describe('remarkContainers — output targets', () => {
    it('keeps web-only content in the site and drops pdf-only / page-break', async () => {
        const html = await render(source);
        expect(html).toContain('Click <strong>Download</strong>.');
        expect(html).toContain('Nested web.');
        expect(html).not.toContain('Visit the site.');
        expect(html).not.toContain('Only in book other.');
        expect(html).not.toContain('pdf-page-break');
        expect(html).not.toContain('container-block');
        expect(html).toContain('custom-block tip');
    });

    it('keeps pdf-only content in PDF, filters by book and emits page breaks', async () => {
        const html = await render(source, { target: 'pdf', bookId: 'manual' });
        expect(html).not.toContain('Download');
        expect(html).not.toContain('Nested web.');
        expect(html).toContain('<p>Visit the site.</p>');
        expect(html).toContain('<li>item</li>');
        expect(html).not.toContain('Only in book other.');
        expect(html).toContain('<div class="pdf-page-break"></div>');
        expect(html).toContain('Tip body');
        expect(html).not.toMatch(/web-only|pdf-only/);
    });

    it('includes book-scoped pdf-only content for the matching book', async () => {
        const html = await render(source, { target: 'pdf', bookId: 'other' });
        expect(html).toContain('Only in book other.');
    });
});
