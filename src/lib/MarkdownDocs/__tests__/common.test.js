import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pathConfig, toSourcePath } from '../common';

function setConfig(config) {
    Object.assign(pathConfig, config);
}

beforeEach(() => {
    setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });
});

describe('common.toSourcePath', () => {
    it('maps {base}/{docsBase}/... to {srcDir}/... when all fields are set', () => {
        setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });

        expect(toSourcePath('/greg/documentation/guide/getting-started')).toBe('my_docs/guide/getting-started');
        expect(toSourcePath('/greg/documentation')).toBe('my_docs');
    });

    it('keeps old base-strip behavior for paths outside /{base}/{docsBase}', () => {
        setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });

        expect(toSourcePath('/greg/guide/getting-started')).toBe('guide/getting-started');
        expect(toSourcePath('/something-else/guide')).toBe('/something-else/guide');
    });

    it('supports base="/" and still maps /{docsBase} to {srcDir}', () => {
        setConfig({ base: '/', srcDir: 'content_docs', docsBase: 'documentation' });

        expect(toSourcePath('/documentation/guide/intro')).toBe('content_docs/guide/intro');
        expect(toSourcePath('/content_docs/guide/intro')).toBe('content_docs/guide/intro');
    });

    it('keeps external URLs and relative paths unchanged', () => {
        setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });

        expect(toSourcePath('https://example.com/docs')).toBe('https://example.com/docs');
        expect(toSourcePath('guide/getting-started')).toBe('guide/getting-started');
    });
});
