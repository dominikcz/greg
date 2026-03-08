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

export type GregConfig = {
    /** URL prefix of the docs folder (e.g. '/docs'). Default: '/docs'. */
    rootPath?: string;
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
     * Locale root path is resolved relative to `rootPath`.
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

    /**
     * Sidebar configuration.
     *   'auto'      – generate sidebar from docs folder structure (default)
     *   SidebarItem[] – manual tree, optionally with auto sub-sections
     */
    sidebar?: 'auto' | SidebarItem[];
    [key: string]: unknown;
};
