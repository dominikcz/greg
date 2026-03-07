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

export type SidebarItem = {
    text: string;
    link?: string;
    items?: SidebarItem[];
    /** Auto-generate children from this docs sub-path. */
    auto?: string;
    badge?: BadgeSpec;
    collapsed?: boolean;
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
     * Sidebar configuration.
     *   'auto'      – generate sidebar from docs folder structure (default)
     *   SidebarItem[] – manual tree, optionally with auto sub-sections
     */
    sidebar?: 'auto' | SidebarItem[];
    [key: string]: unknown;
};
