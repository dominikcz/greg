/**
 * TypeScript types for @dominikcz/greg
 */

export type OutlineLevel = false | number | [number, number] | 'deep';
export type OutlineOption = OutlineLevel | { level?: OutlineLevel; label?: string };

export type BadgeSpec = string | { text: string; type?: 'info' | 'tip' | 'warning' | 'danger' | 'custom' };

export type NavItem = {
    text: string;
    link?: string;
    /** Opens the link in a new tab. */
    target?: string;
    /** Nested links rendered as a dropdown menu. */
    items?: NavItem[];
};

export type ThemeableImage =
    | string
    | { src: string; alt?: string }
    | { light: string; dark: string; alt?: string };

export type SocialLinkItem = {
    icon: string | { svg: string };
    link: string;
    ariaLabel?: string;
};

export type SidebarItem = {
    text: string;
    link?: string;
    /** Opens the link in a new tab. */
    target?: string;
    /** Link rel attribute, e.g. 'noopener noreferrer'. */
    rel?: string;
    items?: SidebarItem[];
    /** Auto-generate children from this docs sub-path. */
    auto?: string;
    badge?: BadgeSpec;
    collapsed?: boolean;
};

export type LocaleThemeConfig = {
    nav?: NavItem[];
    sidebar?: 'auto' | SidebarItem[];
    outline?: OutlineOption | boolean;
    /** VitePress-compatible text label for last-modified meta. */
    lastUpdatedText?: string;
    /** VitePress-compatible language switcher aria-label. */
    langMenuLabel?: string;
    /** VitePress-compatible mobile sidebar menu label. */
    sidebarMenuLabel?: string;
    /** VitePress-compatible skip-to-content label. */
    skipToContentLabel?: string;
    /** VitePress-compatible back-to-top aria-label. */
    returnToTopLabel?: string;
    /** VitePress-compatible theme switch group label. */
    darkModeSwitchLabel?: string;
    /** VitePress-compatible light mode toggle title. */
    lightModeSwitchTitle?: string;
    /** VitePress-compatible dark mode toggle title. */
    darkModeSwitchTitle?: string;
    /** VitePress-style search localization map. */
    search?: {
        locales?: Record<
            string,
            {
                button?: {
                    buttonText?: string;
                    buttonAriaLabel?: string;
                };
                modal?: {
                    noResultsText?: string;
                    footer?: {
                        selectText?: string;
                        navigateText?: string;
                        closeText?: string;
                    };
                    searchBox?: {
                        placeholder?: string;
                    };
                    startScreen?: {
                        noRecentSearchesText?: string;
                    };
                    errorScreen?: {
                        titleText?: string;
                    };
                    loadingScreen?: {
                        loadingText?: string;
                    };
                };
            }
        >;
    };
    /** VitePress-compatible labels above prev/next links. */
    docFooter?: {
        prev?: string | false;
        next?: string | false;
    };
    siteTitle?: string | false;
    logo?: ThemeableImage;
    socialLinks?: SocialLinkItem[];
    editLink?: {
        pattern: string;
        text?: string;
    };
    footer?: {
        message?: string;
        copyright?: string;
    };
    aside?: boolean | 'left';
    /** VitePress-compatible full lastUpdated options. */
    lastUpdated?: {
        text?: string;
        formatOptions?: Intl.DateTimeFormatOptions & { forceLocale?: boolean };
    };
    externalLinkIcon?: boolean;
};

export type LocaleConfig = {
    /** e.g. 'en-US', 'pl-PL' */
    lang?: string;
    /** Text direction for locale, e.g. 'ltr' or 'rtl'. */
    dir?: 'ltr' | 'rtl';
    /** Locale-specific site title (mapped to header title). */
    title?: string;
    description?: string;
    label?: string;
    link?: string;
    themeConfig?: LocaleThemeConfig;
    [key: string]: unknown;
};

export type BranchVersionSource = {
    /** Version identifier used in output paths, e.g. 'latest' or '1.2'. */
    version: string;
    /** Git branch or ref name to read docs from. */
    branch: string;
    /** Optional display title in version selectors/UIs. */
    title?: string;
    /** Relative path to docs directory in that branch. Default: 'docs'. */
    docsDir?: string;
    /** Route prefix used while building this version. Default: '/docs'. */
    srcDir?: string;
};

export type FolderVersionSource = {
    /** Version identifier used in output paths, e.g. 'latest' or '1.2'. */
    version: string;
    /** Relative or absolute directory path containing markdown docs sources. */
    dir: string;
    /** Optional display title in version selectors/UIs. */
    title?: string;
    /** Route prefix used while building this version. Default: '/docs'. */
    srcDir?: string;
};

export type GregVersioningConfig = {
    /** Version source strategy. Default: 'branches'. */
    strategy?: 'branches' | 'folders';
    /** Base output directory for built versions. Default: 'dist/__versions'. */
    outDir?: string;
    /** Hosting root for synced default version output. Default: parent directory of `outDir`. */
    hostOutDir?: string;
    /** Default version or alias used by consumers. */
    default?: string;
    /** Optional URL prefix for version pages in manifest. Default: '/__versions'. */
    pathPrefix?: string;
    /** Alias map, e.g. { latest: '2.1', stable: '2.0' }. */
    aliases?: Record<string, string>;
    /** Optional UI labels/messages for version selector and outdated notice. */
    ui?: {
        /** Label shown next to the versions dropdown. */
        versionMenuLabel?: string;
        /** Header fallback text shown when versions.json cannot be loaded. */
        manifestUnavailableText?: string;
        /** Show header fallback status when versions.json cannot be loaded. Default: true. */
        showManifestUnavailableStatus?: boolean;
        /** Outdated notice text. Use placeholders: {current}, {default}. */
        outdatedVersionMessage?: string;
        /** Button label in outdated notice. */
        outdatedVersionActionLabel?: string;
    };
    /** Locale-specific versioning UI overrides, keyed by locale path (e.g. '/', '/pl/'). */
    locales?: Record<
        string,
        {
            ui?: {
                versionMenuLabel?: string;
                manifestUnavailableText?: string;
                outdatedVersionMessage?: string;
                outdatedVersionActionLabel?: string;
            };
        }
    >;
    /** Branch-based version sources. */
    branches?: BranchVersionSource[];
    /** Folder-based version sources. */
    folders?: FolderVersionSource[];
    /**
     * For folder strategy: discover versions under this directory when `folders`
     * is omitted. Each direct child folder is treated as one version id.
     * Default: 'versions'.
     */
    foldersDir?: string;
    /**
     * For branch strategy: cache directory for extracted docs snapshots.
     * Default: '.greg/version-cache'.
     */
    branchCacheDir?: string;
};

export type GregConfig = {
    /** VitePress-compatible base public path (e.g. '/docs/'). Default: '/'. */
    base?: string;
    /** VitePress-compatible build output directory. Default: 'dist'. */
    outDir?: string;
    /** URL prefix of the docs folder (e.g. '/docs'). Default: '/docs'. */
    srcDir?: string;
    /** Version badge shown in the header. Empty string = hidden. */
    version?: string;
    /** Site title shown in the header. */
    mainTitle?: string;
    /**
     * VitePress-compatible outline setting.
     *   false       – disable outline
     *   2           – h2 only
     *   [2, 3]      – h2 and h3 (default)
     *   'deep'      – h2–h6
     *   { level: [2,3], label: 'On this page' }
     */
    outline?: OutlineOption | boolean;
    /** Default mermaid diagram theme. */
    mermaidTheme?: string;
    /** Carbon Ads configuration. */
    carbonAds?: { code: string; placement: string } | null;
    /** Show breadcrumb navigation above content (doc layout only). Default: true. */
    breadcrumb?: boolean;
    /** Show a "Back to top" button. Default: true. */
    backToTop?: boolean;
    /**
     * Show last-modified date below content.
     *   true  – default format, browser locale
     *   object – full control: { text?, locale?, formatOptions? }
     */
    lastModified?: boolean | { text?: string; locale?: string; formatOptions?: Intl.DateTimeFormatOptions };
    /**
     * Top navigation bar items (VitePress-compatible).
     * Rendered between the site title and the search/theme controls.
     */
    nav?: NavItem[];

    /**
     * VitePress-compatible locale map.
     * Example keys: '/', '/pl/', '/de/'.
     * Locale root path is resolved relative to `srcDir`.
     */
    locales?: Record<string, LocaleConfig>;

    /**
     * VitePress-compatible i18n routing behavior.
     * true (default): switch locale while preserving relative page path when possible.
     * false: switch locale to locale root.
     */
    i18nRouting?: boolean;

    /** VitePress-compatible language switcher aria-label. */
    langMenuLabel?: string;
    /** VitePress-compatible mobile sidebar menu label. */
    sidebarMenuLabel?: string;
    /** VitePress-compatible skip-to-content label. */
    skipToContentLabel?: string;
    /** VitePress-compatible back-to-top aria-label. */
    returnToTopLabel?: string;
    /** VitePress-compatible theme switch group label. */
    darkModeSwitchLabel?: string;
    /** VitePress-compatible light mode toggle title. */
    lightModeSwitchTitle?: string;
    /** VitePress-compatible dark mode toggle title. */
    darkModeSwitchTitle?: string;
    /** VitePress-compatible labels above prev/next links. */
    docFooter?: {
        prev?: string | false;
        next?: string | false;
    };
    siteTitle?: string | false;
    logo?: ThemeableImage;
    socialLinks?: SocialLinkItem[];
    editLink?: {
        pattern: string;
        text?: string;
    };
    footer?: {
        message?: string;
        copyright?: string;
    };
    aside?: boolean | 'left';
    /** VitePress-compatible full lastUpdated options. */
    lastUpdated?: {
        text?: string;
        formatOptions?: Intl.DateTimeFormatOptions & { forceLocale?: boolean };
    };
    externalLinkIcon?: boolean;

    /** Search mode and fuzzy matching tuning. */
    search?: {
        /** Search backend mode. */
        provider?: 'server' | 'local' | 'none';
        /** Endpoint used when provider is 'server'. */
        serverUrl?: string;
        /** Fuzzy matching settings for local/dev/prod search backends. */
        fuzzy?: {
            /** Fuse threshold (0..1), lower = stricter. Default: 0.35 */
            threshold?: number;
            /** Minimum contiguous match length. Default: 3 */
            minMatchCharLength?: number;
            /** Ignore match position in text. Default: true */
            ignoreLocation?: boolean;
        };
    };

    /**
     * Sidebar configuration.
     *   'auto'      – generate sidebar from docs folder structure (default)
     *   SidebarItem[] – manual tree, optionally with auto sub-sections
     */
    sidebar?: 'auto' | SidebarItem[];
    /** Multi-version docs build configuration. */
    versioning?: GregVersioningConfig;
    [key: string]: unknown;
};
