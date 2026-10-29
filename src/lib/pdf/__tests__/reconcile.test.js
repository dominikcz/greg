import { describe, expect, it } from 'vitest';
import { reconcileWithOutline } from '../cli.js';

function fakeDoc(items) {
    return {
        getOutline: async () => items.map(([title, page, children]) => ({
            title,
            dest: [{ page }],
            items: (children ?? []).map(([t, p]) => ({ title: t, dest: [{ page: p }], items: [] })),
        })),
        getDestination: async () => null,
        getPageIndex: async (ref) => ref.page - 1,
    };
}

describe('reconcileWithOutline', () => {
    it('corrects TOC pages that disagree with bookmarks, matching in order', async () => {
        const doc = fakeDoc([
            ['Contents', 3],
            ['1. Introduction1. Introduction', 6],
            ['2. Setup', 7, [['Options', 8]]],
            ['3. Setup', 10, [['Options', 11]]],
        ]);
        const toc = [
            { target: 'greg-toc-1', text: 'Introduction' },
            { target: 'greg-toc-2', text: 'Setup' },
            { target: 'greg-toc-3', text: 'Options' },
            { target: 'greg-toc-4', text: 'Setup' },
            { target: 'greg-toc-5', text: 'Options' },
            { target: 'greg-toc-6', text: 'Missing' },
        ];
        const pages = { 'greg-toc-1': 5, 'greg-toc-2': 7, 'greg-toc-3': 8, 'greg-toc-4': 9, 'greg-toc-5': 11, 'greg-toc-6': 12 };
        const fixed = await reconcileWithOutline(doc, toc, pages);
        expect(pages).toEqual({ 'greg-toc-1': 6, 'greg-toc-2': 7, 'greg-toc-3': 8, 'greg-toc-4': 10, 'greg-toc-5': 11, 'greg-toc-6': 12 });
        expect(fixed).toHaveLength(2);
    });
});
