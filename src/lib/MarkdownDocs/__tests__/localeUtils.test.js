import { describe, it, expect } from 'vitest';
import {
    getLocaleEntries,
    getLocaleSwitchItems,
    resolveLocaleForPath,
} from '../localeUtils';

describe('localeUtils', () => {
    const locales = {
        '/': {
            lang: 'en-US',
            title: 'Docs',
            themeConfig: {
                nav: [{ text: 'Guide', link: '/docs/guide' }],
                sidebar: [{ text: 'Guide', auto: '/guide' }],
            },
        },
        '/pl/': {
            lang: 'pl-PL',
            label: 'Polski',
            title: 'Dokumentacja',
            themeConfig: {
                nav: [{ text: 'Przewodnik', link: '/docs/pl/guide' }],
                sidebar: [{ text: 'Przewodnik', auto: '/pl/guide' }],
                lastUpdatedText: 'Zaktualizowano:',
                sidebarMenuLabel: 'Menu',
                skipToContentLabel: 'Przejdz do tresci',
                siteTitle: 'Greg PL',
                logo: { light: '/logo-pl-light.svg', dark: '/logo-pl-dark.svg', alt: 'Greg PL' },
                socialLinks: [{ icon: 'github', link: 'https://github.com/example' }],
                editLink: {
                    pattern: 'https://github.com/example/repo/edit/main/docs/:path',
                    text: 'Edytuj strone',
                },
                footer: { message: 'Licencja MIT', copyright: 'Copyright' },
                aside: /** @type {'left'} */ ('left'),
                lastUpdated: { text: 'Aktualizacja', formatOptions: { dateStyle: /** @type {'short'} */ ('short') } },
            },
        },
    };

    const defaults = {
        mainTitle: 'Greg',
        nav: [],
        sidebar: /** @type {'auto'} */ ('auto'),
        outline: /** @type {[number, number]} */ ([2, 3]),
        langMenuLabel: 'Change language',
        returnToTopLabel: 'Back to top',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
        docFooter: { prev: 'Previous', next: 'Next' },
        siteTitle: 'Greg',
        logo: '/logo.svg',
        socialLinks: [],
        aside: true,
    };

    it('builds locale roots under configured srcDir', () => {
        expect(getLocaleEntries('/docs', locales)).toEqual([
            expect.objectContaining({ key: '/', srcDir: '/docs' }),
            expect.objectContaining({ key: '/pl/', srcDir: '/docs/pl' }),
        ]);
    });

    it('resolves the most specific locale and returns locale theme overrides', () => {
        const resolved = resolveLocaleForPath('/docs/pl/guide', '/docs', locales, defaults);
        expect(resolved.key).toBe('/pl/');
        expect(resolved.srcDir).toBe('/docs/pl');
        expect(resolved.mainTitle).toBe('Dokumentacja');
        expect(resolved.lastUpdatedText).toBe('Zaktualizowano:');
        expect(resolved.nav).toEqual([{ text: 'Przewodnik', link: '/docs/pl/guide' }]);
        expect(resolved.langMenuLabel).toBe('Change language');
        expect(resolved.sidebarMenuLabel).toBe('Menu');
        expect(resolved.skipToContentLabel).toBe('Przejdz do tresci');
        expect(resolved.siteTitle).toBe('Greg PL');
        expect(resolved.logo).toEqual({ light: '/logo-pl-light.svg', dark: '/logo-pl-dark.svg', alt: 'Greg PL' });
        expect(resolved.socialLinks).toEqual([{ icon: 'github', link: 'https://github.com/example' }]);
        expect(resolved.editLink).toEqual({
            pattern: 'https://github.com/example/repo/edit/main/docs/:path',
            text: 'Edytuj strone',
        });
        expect(resolved.footer).toEqual({ message: 'Licencja MIT', copyright: 'Copyright' });
        expect(resolved.aside).toBe('left');
        expect(resolved.lastUpdated).toEqual({ text: 'Aktualizacja', formatOptions: { dateStyle: 'short' } });
    });

    it('maps the active path to another locale and falls back to locale root when missing', () => {
        const entries = getLocaleEntries('/docs', locales);
        const frontmatters = {
            '/docs/guide/index.md': {},
            '/docs/pl/index.md': {},
            '/docs/pl/guide/index.md': {},
        };

        const fromPlGuide = getLocaleSwitchItems({
            entries,
            activePath: '/docs/pl/guide',
            activeSrcDir: '/docs/pl',
            activeLocaleKey: '/pl/',
            frontmatters,
        });
        expect(fromPlGuide).toEqual([
            expect.objectContaining({ key: '/', link: '/docs/guide', active: false }),
            expect.objectContaining({ key: '/pl/', link: '/pl/guide', active: true }),
        ]);

        const fromPlReference = getLocaleSwitchItems({
            entries,
            activePath: '/docs/pl/reference',
            activeSrcDir: '/docs/pl',
            activeLocaleKey: '/pl/',
            frontmatters,
        });
        expect(fromPlReference).toEqual([
            expect.objectContaining({ key: '/', link: '/docs', active: false }),
            expect.objectContaining({ key: '/pl/', link: '/pl', active: true }),
        ]);
    });

    it('supports disabling relative locale mapping (i18nRouting=false style)', () => {
        const entries = getLocaleEntries('/docs', locales);
        const frontmatters = {
            '/docs/guide/index.md': {},
            '/docs/pl/index.md': {},
            '/docs/pl/guide/index.md': {},
        };

        const switched = getLocaleSwitchItems({
            entries,
            activePath: '/docs/pl/guide',
            activeSrcDir: '/docs/pl',
            activeLocaleKey: '/pl/',
            frontmatters,
            preservePath: false,
        });

        expect(switched).toEqual([
            expect.objectContaining({ key: '/', link: '/docs', active: false }),
            expect.objectContaining({ key: '/pl/', link: '/pl', active: true }),
        ]);
    });

    it('preserves nested path when switching from root locale to /pl locale', () => {
        const entries = getLocaleEntries('/', {
            '/': { label: 'English' },
            '/pl/': { label: 'Polski' },
        });

        const switched = getLocaleSwitchItems({
            entries,
            activePath: '/guide/versioning',
            activeSrcDir: '/',
            activeLocaleKey: '/',
            frontmatters: {
                '/guide/versioning.md': {},
                '/pl/guide/versioning.md': {},
            },
            preservePath: true,
        });

        expect(switched).toEqual([
            expect.objectContaining({ key: '/', link: '/guide/versioning', active: true }),
            expect.objectContaining({ key: '/pl/', link: '/pl/guide/versioning', active: false }),
        ]);
    });

    it('uses locales[].link when provided (internal and external)', () => {
        const entries = getLocaleEntries('/docs', {
            '/': {
                label: 'English',
                link: '/docs/custom-home',
            },
            '/pl/': {
                label: 'Polski',
                link: 'https://example.com/pl/docs',
            },
        });

        const switched = getLocaleSwitchItems({
            entries,
            activePath: '/docs/guide',
            activeSrcDir: '/docs',
            activeLocaleKey: '/',
            frontmatters: {
                '/docs/guide/index.md': {},
            },
            preservePath: true,
        });

        expect(switched).toEqual([
            expect.objectContaining({
                key: '/',
                link: '/docs/custom-home',
                active: true,
            }),
            expect.objectContaining({
                key: '/pl/',
                link: 'https://example.com/pl/docs',
                active: false,
            }),
        ]);
    });
});
