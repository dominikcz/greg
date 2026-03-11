import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pathConfig, withoutBase } from '../common';

function setConfig(config) {
    Object.assign(pathConfig, config);
}

beforeEach(() => {
    setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });
});

describe('common.withoutBase', () => {
    it('maps {base}/{docsBase}/... to {srcDir}/... when all fields are set', () => {
        setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });

        expect(withoutBase('/greg/documentation/guide/getting-started')).toBe('/documentation/guide/getting-started');
        expect(withoutBase('/greg/documentation')).toBe('/documentation');
    });

    it('keeps old base-strip behavior for paths outside /{base}/{docsBase}', () => {
        setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });

        expect(withoutBase('/greg/guide/getting-started')).toBe('/guide/getting-started');
        expect(withoutBase('/something-else/guide')).toBe('/something-else/guide');
    });

    it('supports base="/" and still maps /{docsBase} to {srcDir}', () => {
        setConfig({ base: '/', srcDir: 'content_docs', docsBase: 'documentation' });

        expect(withoutBase('/documentation/guide/intro')).toBe('/documentation/guide/intro');
        expect(withoutBase('/content_docs/guide/intro')).toBe('/content_docs/guide/intro');
    });

    it('keeps external URLs and relative paths unchanged', () => {
        setConfig({ base: '/greg/', srcDir: 'my_docs', docsBase: 'documentation' });

        expect(withoutBase('https://example.com/docs')).toBe('https://example.com/docs');
        expect(withoutBase('guide/getting-started')).toBe('guide/getting-started');
    });
});
