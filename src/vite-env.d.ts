/// <reference types="vite/client" />

declare module 'virtual:greg-frontmatter' {
    type HeroAction = { theme?: 'brand' | 'alt'; text: string; link: string; target?: string; rel?: string };
    type FeatureItem = { icon?: string | { src: string; alt?: string }; title: string; details?: string };
    type BadgeSpec = string | { text: string; type?: string };
    type OutlineLevel = false | number | [number, number] | 'deep';
    type OutlineOption = OutlineLevel | { level?: OutlineLevel; label?: string };
    type FrontmatterEntry = {
        title?: string;
        order?: number;
        layout?: 'doc' | 'home' | 'page';
        hero?: {
            name?: string;
            text?: string;
            tagline?: string;
            image?: unknown;
            actions?: HeroAction[];
        };
        features?: FeatureItem[];
        /** Per-page outline level. `false` disables the outline for this page. */
        outline?: OutlineOption | boolean;
        /** Badge shown next to the page name in the sidebar. */
        badge?: BadgeSpec;
        /** Override the auto-generated Previous page link. `false` hides it. */
        prev?: false | { text: string; link: string };
        /** Override the auto-generated Next page link. `false` hides it. */
        next?: false | { text: string; link: string };
        /** ISO 8601 timestamp of the file's last modification (set by vitePluginFrontmatter). */
        _mtime?: string;
        [key: string]: unknown;
    };
    const frontmatters: Record<string, FrontmatterEntry>;
    export default frontmatters;
}

declare module 'virtual:greg-config' {
    type OutlineLevel = false | number | [number, number] | 'deep';
    type OutlineOption = OutlineLevel | { level?: OutlineLevel; label?: string };
    type SidebarItem = { text: string; link?: string; items?: SidebarItem[]; auto?: string; badge?: string | { text: string; type?: string } };
    type LocaleThemeConfig = {
        nav?: NavItem[];
        sidebar?: 'auto' | SidebarItem[];
        outline?: OutlineOption | boolean;
        lastUpdatedText?: string;
        langMenuLabel?: string;
        sidebarMenuLabel?: string;
        skipToContentLabel?: string;
        returnToTopLabel?: string;
        darkModeSwitchLabel?: string;
        lightModeSwitchTitle?: string;
        darkModeSwitchTitle?: string;
        docFooter?: {
            prev?: string | false;
            next?: string | false;
        };
        siteTitle?: string | false;
        logo?: string | { src: string; alt?: string } | { light: string; dark: string; alt?: string };
        socialLinks?: { icon: string | { svg: string }; link: string; ariaLabel?: string }[];
        editLink?: { pattern: string; text?: string };
        footer?: { message?: string; copyright?: string };
        aside?: boolean | 'left';
        lastUpdated?: {
            text?: string;
            formatOptions?: Intl.DateTimeFormatOptions & { forceLocale?: boolean };
        };
        externalLinkIcon?: boolean;
    };
    type LocaleConfig = {
        lang?: string;
        dir?: 'ltr' | 'rtl';
        title?: string;
        description?: string;
        label?: string;
        link?: string;
        themeConfig?: LocaleThemeConfig;
        [key: string]: unknown;
    };
    type NavItem = {
        text: string;
        link?: string;
        target?: string;
        items?: NavItem[];
    };
    type GregConfig = {
        rootPath?: string;
        version?: string;
        mainTitle?: string;
        outline?: OutlineOption | boolean;
        mermaidTheme?: string;
        carbonAds?: { code: string; placement: string };
        breadcrumb?: boolean;
        backToTop?: boolean;
        /** `true` = show with default format; object = `{ text?, locale?, formatOptions? }` for full control. */
        lastModified?: boolean | { text?: string; locale?: string; formatOptions?: Intl.DateTimeFormatOptions };
        i18nRouting?: boolean;
        langMenuLabel?: string;
        sidebarMenuLabel?: string;
        skipToContentLabel?: string;
        returnToTopLabel?: string;
        darkModeSwitchLabel?: string;
        lightModeSwitchTitle?: string;
        darkModeSwitchTitle?: string;
        docFooter?: {
            prev?: string | false;
            next?: string | false;
        };
        siteTitle?: string | false;
        logo?: string | { src: string; alt?: string } | { light: string; dark: string; alt?: string };
        socialLinks?: { icon: string | { svg: string }; link: string; ariaLabel?: string }[];
        editLink?: { pattern: string; text?: string };
        footer?: { message?: string; copyright?: string };
        aside?: boolean | 'left';
        lastUpdated?: {
            text?: string;
            formatOptions?: Intl.DateTimeFormatOptions & { forceLocale?: boolean };
        };
        externalLinkIcon?: boolean;
        locales?: Record<string, LocaleConfig>;
        sidebar?: 'auto' | SidebarItem[];
        [key: string]: unknown;
    };
    const config: GregConfig;
    export default config;
}
