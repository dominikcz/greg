<script lang="ts">
    import { tick, type Snippet } from "svelte";
    import DocsNavigation from "./DocsNavigation.svelte";
    import DocsSiteHeader from "./DocsSiteHeader.svelte";
    import SearchModal from "./SearchModal.svelte";
    import Spinner from "./../spinner/spinner.svelte";
    import {
        prepareMenu,
        flattenMenu,
        getPrevNext,
        getBreadcrumbItems,
        parseSidebarConfig,
    } from "./docsUtils";
    import "./../scss/greg.scss";
    import { setPortalsContext } from "./../portal";
    import CarbonAds from "../components/CarbonAds.svelte";
    import Outline from "./Outline.svelte";
    import { useRouter } from "./useRouter.svelte";
    import { useSplitter } from "./useSplitter.svelte";
    import { handleCodeGroupClick, handleCodeGroupKeydown } from "./codeGroup";
    import allFrontmatters from "virtual:greg-frontmatter";
    import MarkdownRenderer from "./MarkdownRenderer.svelte";
    import LayoutHome from "./layouts/LayoutHome.svelte";
    import BackToTop from "./BackToTop.svelte";
    import Breadcrumb from "./Breadcrumb.svelte";
    import PrevNext from "./PrevNext.svelte";
    import VersionOutdatedNotice from "./VersionOutdatedNotice.svelte";
    import { EllipsisVertical } from "@lucide/svelte";
    import gregConfig from "virtual:greg-config";
    import {
        type LocaleConfig,
        getLocaleEntries,
        getLocaleSwitchItems,
        normalizeLocaleKey,
        resolveLocaleForPath,
    } from "./localeUtils";
    import { withBase, withoutBase, normalizePath as normalizeSrcDir } from "./common";
    import {
        buildDefaultVersionPathPrefix,
        DEFAULT_PATH_PREFIX,
        DEFAULT_VERSIONS_DIR_NAME,
    } from "./versioningDefaults.js";

    type CarbonAdsOptions = {
        code: string;
        placement: string;
    };

    type OutlineLevel = false | number | [number, number] | "deep";
    type OutlineOption =
        | OutlineLevel
        | { level?: OutlineLevel; label?: string };

    type BadgeSpec = string | { text: string; type?: string };
    type ThemeableImage =
        | string
        | { src: string; alt?: string }
        | { light: string; dark: string; alt?: string };
    type SocialLinkItem = {
        icon: string | { svg: string };
        link: string;
        ariaLabel?: string;
    };
    type SidebarItem = {
        text: string;
        link?: string;
        items?: SidebarItem[];
        auto?: string;
        badge?: BadgeSpec;
    };

    type TopNavItem = {
        text: string;
        link?: string;
        target?: string;
        items?: {
            text: string;
            link?: string;
            target?: string;
            items?: { text: string; link?: string; target?: string }[];
        }[];
    };

    type Props = {
        srcDir?: string;
        docsBase?: string;
        children?: Snippet;
        version?: string;
        mainTitle?: string;
        carbonAds?: CarbonAdsOptions;
        /** VitePress-compatible outline option. false = disabled, [2,3] = default. */
        outline?: OutlineOption | boolean;
        /**
         * Key of the active Mermaid diagram theme.
         * Built-in values: `'material'` (default).
         */
        mermaidTheme?: string;
        /**
         * Extra (or override) Mermaid theme configs keyed by theme name.
         * Merged on top of the built-in themes inside MarkdownRenderer.
         */
        mermaidThemes?: Record<string, Record<string, unknown>>;
        /** Show breadcrumb navigation above content (doc layout only). */
        breadcrumb?: boolean;
        /** Show Back To Top button. */
        backToTop?: boolean;
        /** Show the file's last-modified date below content (doc layout only).
         * `true`  ďż˝ uses default format `{ dateStyle: 'medium' }` and browser locale.
         * Object  ďż˝ `{ text?, locale?, formatOptions? }` for full control.
         */
        lastModified?:
            | boolean
            | {
                  text?: string;
                  locale?: string;
                  formatOptions?: Intl.DateTimeFormatOptions;
              };
        /**
         * Sidebar tree configuration.
         * `'auto'` (default) ďż˝ generated from the docs folder structure.
         * Pass an array of `SidebarItem` objects to define the sidebar manually;
         * items with an `auto` path have their children auto-generated.
         */
        sidebar?: "auto" | SidebarItem[];
        /** Top navigation bar items. */
        nav?: TopNavItem[];
        /** VitePress-compatible i18n routing behavior for locale switcher. */
        i18nRouting?: boolean;
        /** VitePress-compatible language switcher aria-label. */
        langMenuLabel?: string;
        /** VitePress-compatible mobile sidebar menu label. */
        sidebarMenuLabel?: string;
        /** VitePress-compatible skip-to-content label. */
        skipToContentLabel?: string;
        /** VitePress-compatible back-to-top aria-label. */
        returnToTopLabel?: string;
        /** VitePress-compatible appearance switcher label. */
        darkModeSwitchLabel?: string;
        /** VitePress-compatible title for light mode button. */
        lightModeSwitchTitle?: string;
        /** VitePress-compatible title for dark mode button. */
        darkModeSwitchTitle?: string;
        /** VitePress-compatible previous/next labels. */
        docFooter?: {
            prev?: string | false;
            next?: string | false;
        };
        externalLinkIcon?: boolean;
        siteTitle?: string | false;
        logo?: ThemeableImage;
        socialLinks?: SocialLinkItem[];
        editLink?: { pattern: string; text?: string };
        footer?: { message?: string; copyright?: string };
        aside?: boolean | "left";
        lastUpdated?: {
            text?: string;
            formatOptions?: Intl.DateTimeFormatOptions & { forceLocale?: boolean };
        };
        /**
         * Custom search provider.
         * `(query: string, limit?: number) => Promise<SearchResult[]>`
         * Overrides greg.config.js ďż˝ search.provider when set.
         * The function must return objects matching the SearchResult shape:
         * { id, title, titleHtml, sectionTitle, sectionTitleHtml?, sectionAnchor, excerptHtml, score }
         */
        searchProvider?: (query: string, limit?: number) => Promise<any[]>;
    };

    type VersionManifestEntry = {
        version: string;
        title?: string;
        path?: string;
    };

    type VersionManifest = {
        default?: string | null;
        versions?: VersionManifestEntry[];
        aliases?: Record<string, string>;
    };

    type VersioningUiConfig = {
        versionMenuLabel?: string;
        manifestUnavailableText?: string;
        showManifestUnavailableStatus?: boolean;
        outdatedVersionMessage?: string;
        outdatedVersionActionLabel?: string;
    };

    type VersioningLocaleUiConfig = Omit<
        VersioningUiConfig,
        "showManifestUnavailableStatus"
    >;

    type VersioningLocaleConfig = {
        ui?: VersioningLocaleUiConfig;
    };

    let {
        children,
        srcDir: configuredSrcDir = normalizeSrcDir(
            Object.prototype.hasOwnProperty.call((gregConfig as any), "docsBase")
                ? (gregConfig as any).docsBase
                : "",
        ),
        version: globalVersion = (gregConfig as any).version ?? "",
        mainTitle: globalMainTitle = (gregConfig as any).mainTitle ?? "Greg",
        carbonAds = (gregConfig as any).carbonAds,
        outline: globalOutline =
            (gregConfig as any).outline ?? ([2, 3] as [number, number]),
        mermaidTheme = (gregConfig as any).mermaidTheme,
        mermaidThemes,
        breadcrumb = (gregConfig as any).breadcrumb ?? false,
        backToTop = (gregConfig as any).backToTop ?? false,
        lastModified: globalLastModified = (gregConfig as any).lastModified ?? false,
        sidebar: globalSidebar = (gregConfig as any).sidebar ?? "auto",
        nav: globalNav = (gregConfig as any).nav ?? [],
        i18nRouting = (gregConfig as any).i18nRouting ?? true,
        langMenuLabel: globalLangMenuLabel =
            (gregConfig as any).langMenuLabel ?? "Change language",
        sidebarMenuLabel: globalSidebarMenuLabel =
            (gregConfig as any).sidebarMenuLabel ?? "Menu",
        skipToContentLabel: globalSkipToContentLabel =
            (gregConfig as any).skipToContentLabel ?? "Skip to content",
        returnToTopLabel: globalReturnToTopLabel =
            (gregConfig as any).returnToTopLabel ?? "Back to top",
        darkModeSwitchLabel: globalDarkModeSwitchLabel =
            (gregConfig as any).darkModeSwitchLabel ?? "Appearance",
        lightModeSwitchTitle: globalLightModeSwitchTitle =
            (gregConfig as any).lightModeSwitchTitle ?? "Switch to light theme",
        darkModeSwitchTitle: globalDarkModeSwitchTitle =
            (gregConfig as any).darkModeSwitchTitle ?? "Switch to dark theme",
        docFooter: globalDocFooter =
            (gregConfig as any).docFooter ??
            ({ prev: "Previous", next: "Next" } as {
                prev?: string | false;
                next?: string | false;
            }),
        externalLinkIcon: globalExternalLinkIcon =
            (gregConfig as any).externalLinkIcon ?? false,
        siteTitle: globalSiteTitle = (gregConfig as any).siteTitle,
        logo: globalLogo = (gregConfig as any).logo,
        socialLinks: globalSocialLinks =
            ((gregConfig as any).socialLinks ?? []) as SocialLinkItem[],
        editLink: globalEditLink = (gregConfig as any).editLink,
        footer: globalFooter = (gregConfig as any).footer,
        aside: globalAside = (gregConfig as any).aside ?? true,
        lastUpdated: globalLastUpdated = (gregConfig as any).lastUpdated,
        searchProvider,
    }: Props = $props();

    const configLocales = ((gregConfig as any).locales ?? {}) as Record<
        string,
        LocaleConfig
    >;
    // Locale entries are precomputed here (before the router) so they can be
    // used in normalizePathForLookup to translate segment-based URLs to srcDir paths.
    const localeEntries = $derived(getLocaleEntries(configuredSrcDir, configLocales));
    const versioningConfig = ((gregConfig as any).versioning ?? null) as
        | {
              ui?: VersioningUiConfig;
              locales?: Record<string, VersioningLocaleConfig>;
              pathPrefix?: string;
                            branches?: Array<unknown>;
                            folders?: Array<unknown>;
                            foldersDir?: string;
          }
        | null;
    const globalVersioningUi = (versioningConfig?.ui ?? {}) as VersioningUiConfig;


    function getLocalizedVersioningUi(
        localesMap: Record<string, VersioningLocaleConfig> | undefined,
        localeKey: string,
    ): VersioningUiConfig {
        if (!localesMap) return {};
        const normalized = normalizeLocaleKey(localeKey);
        const noTrailing = normalized.replace(/\/$/, "");
        const trimmed = normalized.replace(/^\/+|\/+$/g, "");
        const candidates = [normalized, noTrailing, trimmed].filter(Boolean);
        for (const key of candidates) {
            const found = localesMap[key];
            if (found?.ui) return found.ui;
        }
        return {};
    }

    function normalizeVersionPrefix(value: string | undefined): string {
        const fallbackPrefix = buildDefaultVersionPathPrefix((gregConfig as any).base);
        const cleaned = String(value || fallbackPrefix || DEFAULT_PATH_PREFIX)
            .trim()
            .replace(/^\/+|\/+$/g, "");
        return "/" + (cleaned || DEFAULT_VERSIONS_DIR_NAME);
    }

    function findActiveVersion(pathname: string, prefix: string): string | null {
        if (pathname === prefix || !pathname.startsWith(prefix + "/")) return null;
        const rest = pathname.slice(prefix.length + 1);
        const segment = rest.split("/")[0];
        return segment || null;
    }

    function stripVersionPrefixFromPath(pathname: string, prefix: string): string {
        const normalizedPath = normalizeSrcDir(pathname);
        const activeVersion = findActiveVersion(normalizedPath, prefix);
        if (!activeVersion) return normalizedPath;

        const versionRoot = `${prefix}/${activeVersion}`;
        const suffix = normalizedPath.slice(versionRoot.length);
        return normalizeSrcDir(suffix || "/");
    }

    let versionManifest = $state<VersionManifest | null>(null);
    let manifestVersionOptions = $state<{ version: string; title: string; path: string }[]>([]);
    let versionManifestLoadError = $state(false);
    const versionPathPrefix = normalizeVersionPrefix(versioningConfig?.pathPrefix);
    const hasVersionDefinitions = $derived.by(() => {
        if (!versioningConfig) return false;
        const hasBranches =
            Array.isArray(versioningConfig.branches) &&
            versioningConfig.branches.length > 0;
        const hasFolders =
            Array.isArray(versioningConfig.folders) &&
            versioningConfig.folders.length > 0;
        const hasFoldersDir =
            typeof versioningConfig.foldersDir === "string" &&
            versioningConfig.foldersDir.trim().length > 0;
        return hasBranches || hasFolders || hasFoldersDir;
    });
    function formatOutdatedMessage(
        currentTitle: string,
        defaultTitle: string,
        template: string,
    ): string {
        if (!template) {
            return `You are viewing an older documentation version (${currentTitle}). ${defaultTitle} is currently recommended.`;
        }
        return template
            .replaceAll("{current}", currentTitle)
            .replaceAll("{default}", defaultTitle);
    }

    $effect(() => {
        let cancelled = false;

        if (!hasVersionDefinitions) {
            versionManifest = null;
            manifestVersionOptions = [];
            versionManifestLoadError = false;
            return () => {
                cancelled = true;
            };
        }

        const manifestUrl = withBase(`${versionPathPrefix}/versions.json`);

        fetch(manifestUrl)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Unable to load ${manifestUrl}: ${res.status}`);
                }
                return res.json() as Promise<VersionManifest>;
            })
            .then((data) => {
                if (cancelled) return;
                versionManifest = data;
                versionManifestLoadError = false;
                const versions = Array.isArray(data.versions) ? data.versions : [];
                manifestVersionOptions = versions
                    .map((entry) => {
                        const version = String(entry.version || "").trim();
                        if (!version) return null;
                        const title = String(entry.title || version);
                        const rawPath = String(entry.path || `${versionPathPrefix}/${version}/`);
                        const path = normalizeSrcDir(rawPath);
                        return { version, title, path };
                    })
                    .filter((entry): entry is { version: string; title: string; path: string } => Boolean(entry));
            })
            .catch(() => {
                if (cancelled) return;
                versionManifest = null;
                manifestVersionOptions = [];
                versionManifestLoadError = true;
                console.warn(`[greg] Could not load ${manifestUrl}.`);
            });

        return () => {
            cancelled = true;
        };
    });

    function navigateToVersion(version: string) {
        const next = manifestVersionOptions.find((entry) => entry.version === version);
        if (!next) return;

        const currentPath = withoutBase(window.location.pathname);
        const currentVersion = findActiveVersion(currentPath, versionPathPrefix);
        const isDefaultTarget =
            Boolean(resolvedDefaultVersion) && version === resolvedDefaultVersion;
        const search = window.location.search || "";
        const hash = window.location.hash || "";

        let targetPath = next.path;

        if (currentVersion) {
            const currentPrefix = `${versionPathPrefix}/${currentVersion}`;
            const suffix =
                currentPath === currentPrefix
                    ? ""
                    : currentPath.startsWith(currentPrefix + "/")
                      ? currentPath.slice(currentPrefix.length)
                      : "";
            if (isDefaultTarget) {
                targetPath = suffix ? normalizeSrcDir(suffix) : "/";
            } else {
                targetPath = normalizeSrcDir(next.path + suffix);
            }
        } else if (
            currentPath === currentSrcDir ||
            currentPath.startsWith(currentSrcDir + "/")
        ) {
            if (isDefaultTarget) {
                targetPath = currentPath;
            } else {
                const suffix = currentPath.slice(currentSrcDir.length);
                targetPath = normalizeSrcDir(next.path + currentSrcDir + suffix);
            }
        }

        window.location.assign(`${withBase(targetPath)}${search}${hash}`);
    }

    // -- Outline -----------------------------------------------------------------
    function normalizeOutline(
        o: OutlineOption | boolean | undefined | null,
    ): { level: OutlineLevel; label: string } | null {
        if (o === false || o === null || o === undefined) return null;
        if (o === true)
            return { level: [2, 3] as [number, number], label: "On this page" };
        if (
            typeof o === "object" &&
            !Array.isArray(o) &&
            ("level" in o || "label" in o)
        ) {
            const oo = o as { level?: OutlineLevel; label?: string };
            return {
                level: oo.level ?? ([2, 3] as [number, number]),
                label: oo.label ?? "On this page",
            };
        }
        return { level: o as OutlineLevel, label: "On this page" };
    }

    let mainEl = $state<HTMLElement | undefined>(undefined);

    // -- Modules -----------------------------------------------------------------
    // Frontmatter parsed from raw YAML by vitePluginFrontmatter (virtual module).
    // Keyed by Vite-style absolute paths, e.g. '/docs/guide/index.md'.
    // Used as the known-paths set for routing (no glob/import needed).
    type FrontmatterEntry = {
        title?: string;
        order?: number;
        layout?: "doc" | "home" | "page";
        renderer?: "runtime" | "mdsvex";
        hero?: Record<string, unknown>;
        features?: unknown[];
        outline?: OutlineOption | boolean;
        badge?: BadgeSpec;
        prev?: false | { text: string; link: string };
        next?: false | { text: string; link: string };
        _mtime?: string;
    };
    const frontmatters = allFrontmatters as Record<string, FrontmatterEntry>;

    // -- Theme -------------------------------------------------------------------
    function getSystemTheme(): "light" | "dark" {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    const THEME_KEY = "greg-theme";
    const THEME_SOURCE_KEY = "greg-theme-source";

    const storedTheme = localStorage.getItem(THEME_KEY);
    const storedSource = localStorage.getItem(THEME_SOURCE_KEY);
    const initialThemeSource: "system" | "manual" =
        storedSource === "manual" ? "manual" : "system";

    let themeSource = $state<"system" | "manual">(initialThemeSource);

    let theme = $state<"light" | "dark">(
        initialThemeSource === "manual" &&
            (storedTheme === "light" || storedTheme === "dark")
            ? storedTheme
            : getSystemTheme(),
    );
    let lastSystemPrefersDark = $state(getSystemTheme() === "dark");

    function setThemeManually(next: "light" | "dark") {
        themeSource = "manual";
        theme = next;
    }

    $effect(() => {
        if (themeSource === "manual") {
            localStorage.setItem(THEME_SOURCE_KEY, "manual");
            localStorage.setItem(THEME_KEY, theme);
            return;
        }

        localStorage.removeItem(THEME_SOURCE_KEY);
        localStorage.removeItem(THEME_KEY);
    });

    $effect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");

        const syncFromSystemPreference = (force: boolean) => {
            const currentPrefersDark = mq.matches;
            const changed = currentPrefersDark !== lastSystemPrefersDark;

            if (changed) {
                lastSystemPrefersDark = currentPrefersDark;
                const next = currentPrefersDark ? "dark" : "light";
                themeSource = "system";
                theme = next;
                return;
            }

            // Keep following system only when currently in system mode.
            if (force && themeSource === "system") {
                theme = currentPrefersDark ? "dark" : "light";
            }
        };

        const handleSystemPreferenceEvent = () => {
            syncFromSystemPreference(false);
        };

        syncFromSystemPreference(true);

        mq.addEventListener("change", handleSystemPreferenceEvent);
        window.addEventListener("focus", handleSystemPreferenceEvent);
        document.addEventListener(
            "visibilitychange",
            handleSystemPreferenceEvent,
        );

        return () => {
            mq.removeEventListener("change", handleSystemPreferenceEvent);
            window.removeEventListener("focus", handleSystemPreferenceEvent);
            document.removeEventListener(
                "visibilitychange",
                handleSystemPreferenceEvent,
            );
        };
    });

    $effect(() => {
        const href = withBase(theme === "dark" ? "/favicon-dark.svg?v=5" : "/favicon-light.svg?v=5");

        let el = document.querySelector(
            'link[data-greg-favicon="true"]',
        ) as HTMLLinkElement | null;

        if (!el) {
            el = document.createElement("link");
            el.rel = "icon";
            el.type = "image/svg+xml";
            el.setAttribute("data-greg-favicon", "true");
            document.head.appendChild(el);
        }

        if (el.href !== new URL(href, window.location.origin).href) {
            el.href = href;
        }
    });

    // -- Search ------------------------------------------------------------------
    const searchEnabled = $derived(
        Boolean(searchProvider) ||
            (gregConfig as any)?.search?.provider !== "none",
    );
    let searchOpen = $state(false);

    $effect(() => {
        if (!searchEnabled) return;
        function handleGlobalKeydown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                searchOpen = true;
            }
        }
        window.addEventListener("keydown", handleGlobalKeydown);
        return () => window.removeEventListener("keydown", handleGlobalKeydown);
    });

    // -- Router ------------------------------------------------------------------
    const router = useRouter(frontmatters, (path) =>
        resolveLocaleForPath(
            stripVersionPrefixFromPath(
                withoutBase(path),
                versionPathPrefix,
            ),
            configuredSrcDir,
            configLocales,
            {
            mainTitle: globalMainTitle,
            nav: globalNav,
            sidebar: globalSidebar,
            outline: globalOutline,
            langMenuLabel: globalLangMenuLabel,
            sidebarMenuLabel: globalSidebarMenuLabel,
            skipToContentLabel: globalSkipToContentLabel,
            returnToTopLabel: globalReturnToTopLabel,
            darkModeSwitchLabel: globalDarkModeSwitchLabel,
            lightModeSwitchTitle: globalLightModeSwitchTitle,
            darkModeSwitchTitle: globalDarkModeSwitchTitle,
            searchButtonLabel: "Search...",
            searchModalLabel: "Search",
            searchPlaceholder: "Search docs...",
            searchLoadingText: "Loading index...",
            searchErrorText: "Failed to load search index.",
            searchSearchingText: "Searching...",
            searchNoResultsText: "No results for",
            searchStartText:
                "Start typing to search across all documentation.",
            searchResultsAriaLabel: "Search results",
            searchNavigateText: "navigate",
            searchSelectText: "open",
            searchCloseText: "close",
            aiTabLabel: "Ask AI",
            aiPlaceholder: "Ask a question about the docs\u2026",
            aiLoadingText: "Thinking\u2026",
            aiErrorText: "Something went wrong. Please try again.",
            aiStartText: "Ask me anything about this documentation. My answers are based exclusively on the docs.",
            aiSourcesLabel: "Sources",
            aiClearChatLabel: "Clear chat",
            aiSendLabel: "Send",
            docFooter: globalDocFooter,
            externalLinkIcon: globalExternalLinkIcon,
            siteTitle: globalSiteTitle,
            logo: globalLogo,
            socialLinks: globalSocialLinks,
            editLink: globalEditLink,
            footer: globalFooter,
            aside: globalAside,
            lastUpdated: globalLastUpdated,
        }).srcDir,
        (path) => {
            const spaPath = stripVersionPrefixFromPath(
                withoutBase(path),
                versionPathPrefix,
            );
            // Translate segment-based locale URLs to their srcDir-prefixed equivalent
            // for content lookup. e.g. '/pl/guide' → '/documentation/pl/guide'.
            const entry = localeEntries.find(
                (e) => e.segment && (spaPath === e.segment || spaPath.startsWith(e.segment + "/"))
            );
            if (entry) return normalizeSrcDir(entry.srcDir + spaPath.slice(entry.segment.length));
            return spaPath;
        },
    );

    const routePath = $derived(
        stripVersionPrefixFromPath(
            withoutBase(router.active),
            versionPathPrefix,
        ),
    );
    const localeContext = $derived(
        resolveLocaleForPath(routePath, configuredSrcDir, configLocales, {
            mainTitle: globalMainTitle,
            nav: globalNav,
            sidebar: globalSidebar,
            outline: globalOutline,
            langMenuLabel: globalLangMenuLabel,
            sidebarMenuLabel: globalSidebarMenuLabel,
            skipToContentLabel: globalSkipToContentLabel,
            returnToTopLabel: globalReturnToTopLabel,
            darkModeSwitchLabel: globalDarkModeSwitchLabel,
            lightModeSwitchTitle: globalLightModeSwitchTitle,
            darkModeSwitchTitle: globalDarkModeSwitchTitle,
            searchButtonLabel: "Search...",
            searchModalLabel: "Search",
            searchPlaceholder: "Search docs...",
            searchLoadingText: "Loading index...",
            searchErrorText: "Failed to load search index.",
            searchSearchingText: "Searching...",
            searchNoResultsText: "No results for",
            searchStartText:
                "Start typing to search across all documentation.",
            searchResultsAriaLabel: "Search results",
            searchNavigateText: "navigate",
            searchSelectText: "open",
            searchCloseText: "close",
            aiTabLabel: "Ask AI",
            aiPlaceholder: "Ask a question about the docs\u2026",
            aiLoadingText: "Thinking\u2026",
            aiErrorText: "Something went wrong. Please try again.",
            aiStartText: "Ask me anything about this documentation. My answers are based exclusively on the docs.",
            aiSourcesLabel: "Sources",
            aiClearChatLabel: "Clear chat",
            aiSendLabel: "Send",
            docFooter: globalDocFooter,
            externalLinkIcon: globalExternalLinkIcon,
            siteTitle: globalSiteTitle,
            logo: globalLogo,
            socialLinks: globalSocialLinks,
            editLink: globalEditLink,
            footer: globalFooter,
            aside: globalAside,
            lastUpdated: globalLastUpdated,
        }),
    );
    const currentSrcDir = $derived(localeContext.srcDir);
    function applyCurrentVersionPrefix(pathname: string): string {
        const normalizedPath = normalizeSrcDir(pathname);
        const currentPath = withoutBase(window.location.pathname);
        const currentVersion = findActiveVersion(currentPath, versionPathPrefix);
        if (!currentVersion) return normalizedPath;

        if (
            normalizedPath === currentSrcDir ||
            normalizedPath.startsWith(currentSrcDir + "/")
        ) {
            return normalizeSrcDir(
                `${versionPathPrefix}/${currentVersion}${normalizedPath}`,
            );
        }

        return normalizedPath;
    }

    function navigateInternal(path: string) {
        router.navigate(withBase(applyCurrentVersionPrefix(path)));
    }

    function navigateInternalWithAnchor(path: string, anchor?: string) {
        router.navigateWithAnchor(
            withBase(applyCurrentVersionPrefix(path)),
            anchor,
        );
    }

    const SEARCH_HIGHLIGHT_STORAGE_KEY = "greg-search-highlight";

    function clearSearchHighlights(container: HTMLElement) {
        const marks = container.querySelectorAll("mark[data-greg-search-highlight='true']");
        for (const mark of marks) {
            const parent = mark.parentNode;
            if (!parent) continue;
            parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
            parent.normalize();
        }
    }

    function escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function extractSearchTerms(phrase: string): string[] {
        return Array.from(
            new Set(
                phrase
                    .split(/\s+/)
                    .map((token) => token.trim())
                    .filter((token) => token.length >= 2),
            ),
        );
    }

    function highlightSearchTerms(container: HTMLElement, phrase: string): number {
        const terms = extractSearchTerms(phrase);
        if (terms.length === 0) return 0;

        const pattern = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
        const loweredTerms = terms.map((term) => term.toLowerCase());
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (
                    parent.closest(
                        "script,style,code,pre,kbd,samp,var,mark[data-greg-search-highlight='true']",
                    )
                ) {
                    return NodeFilter.FILTER_REJECT;
                }
                const text = String(node.textContent || "").toLowerCase();
                if (!text) return NodeFilter.FILTER_REJECT;
                return loweredTerms.some((term) => text.includes(term))
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            },
        });

        const textNodes: Text[] = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode as Text);
        }

        let count = 0;
        for (const textNode of textNodes) {
            const text = textNode.textContent || "";
            pattern.lastIndex = 0;
            if (!pattern.test(text)) continue;
            pattern.lastIndex = 0;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(text)) !== null) {
                const index = match.index;
                if (index > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(text.slice(lastIndex, index)),
                    );
                }

                const mark = document.createElement("mark");
                mark.setAttribute("data-greg-search-highlight", "true");
                mark.textContent = match[0];
                fragment.appendChild(mark);
                count++;
                lastIndex = index + match[0].length;
            }

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            textNode.parentNode?.replaceChild(fragment, textNode);
        }

        return count;
    }

    function applyPendingSearchHighlights() {
        if (!mainEl) return;

        let raw = "";
        try {
            raw = sessionStorage.getItem(SEARCH_HIGHLIGHT_STORAGE_KEY) || "";
        } catch {
            return;
        }
        if (!raw) return;

        let parsed: { query?: string; path?: string; timestamp?: number } | null = null;
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = null;
        }
        if (!parsed?.query) return;

        clearSearchHighlights(mainEl);
        const matches = highlightSearchTerms(mainEl, parsed.query);

        if (matches > 0) {
            const first = mainEl.querySelector(
                "mark[data-greg-search-highlight='true']",
            ) as HTMLElement | null;
            first?.scrollIntoView({ block: "center", behavior: "smooth" });
            try {
                sessionStorage.removeItem(SEARCH_HIGHLIGHT_STORAGE_KEY);
            } catch {
                // Ignore storage errors.
            }
        }
    }

    function hasPendingSearchHighlightForRoute(): boolean {
        let raw = "";
        try {
            raw = sessionStorage.getItem(SEARCH_HIGHLIGHT_STORAGE_KEY) || "";
        } catch {
            return false;
        }
        if (!raw) return false;

        try {
            const parsed = JSON.parse(raw) as { query?: string };
            return Boolean(parsed?.query);
        } catch {
            return false;
        }
    }

    $effect(() => {
        const activePath = routePath;
        if (!activePath) return;
        if (!hasPendingSearchHighlightForRoute()) return;

        let cancelled = false;
        const timers: number[] = [];
        const start = Date.now();
        const schedule = async () => {
            await tick();
            const run = () => {
                if (cancelled) return;
                applyPendingSearchHighlights();
                if (!hasPendingSearchHighlightForRoute()) return;
                if (Date.now() - start > 6000) return;
                const id = window.setTimeout(run, 250);
                timers.push(id);
            };
            run();
        };

        schedule();
        return () => {
            cancelled = true;
            for (const id of timers) window.clearTimeout(id);
        };
    });

    $effect(() => {
        const handler = () => {
            let cancelled = false;
            const timers: number[] = [];
            const start = Date.now();
            const run = async () => {
                await tick();
                if (cancelled) return;
                applyPendingSearchHighlights();
                if (!hasPendingSearchHighlightForRoute()) return;
                if (Date.now() - start > 6000) return;
                const id = window.setTimeout(run, 250);
                timers.push(id);
            };
            run();

            return () => {
                cancelled = true;
                for (const id of timers) window.clearTimeout(id);
            };
        };

        const listener = () => {
            const cleanup = handler();
            if (cleanup) window.setTimeout(cleanup, 6500);
        };

        window.addEventListener("greg-search-highlight-request", listener);
        return () =>
            window.removeEventListener(
                "greg-search-highlight-request",
                listener,
            );
    });

    function navigateHome(path: string) {
        const currentPath = withoutBase(window.location.pathname);
        const currentVersion = findActiveVersion(currentPath, versionPathPrefix);
        if (currentVersion) {
            window.location.assign(withBase(path));
            return;
        }
        navigateInternal(path);
    }
    const localizedVersioningUi = $derived(
        getLocalizedVersioningUi(versioningConfig?.locales, localeContext.key),
    );
    const resolvedVersioningUi = $derived({
        ...globalVersioningUi,
        ...localizedVersioningUi,
    });
    const versionMenuLabel = $derived(
        String(resolvedVersioningUi.versionMenuLabel || "Version"),
    );
    const manifestUnavailableText = $derived(
        String(
            resolvedVersioningUi.manifestUnavailableText ||
                "Version selector unavailable",
        ).trim(),
    );
    const showManifestUnavailableStatus = $derived(
        globalVersioningUi.showManifestUnavailableStatus !== false,
    );
    const outdatedVersionActionLabel = $derived(
        String(resolvedVersioningUi.outdatedVersionActionLabel || "Go to latest"),
    );
    const outdatedVersionMessageTemplate = $derived(
        String(resolvedVersioningUi.outdatedVersionMessage || "").trim(),
    );
    const activeDocsVersion = $derived(
        findActiveVersion(
            withoutBase(window.location.pathname),
            versionPathPrefix,
        ),
    );
    const resolvedDefaultVersion = $derived.by(() => {
        if (!versionManifest) return null;
        const raw = String(versionManifest.default || "").trim();
        if (!raw) return null;
        const aliasTarget = versionManifest.aliases?.[raw];
        return String(aliasTarget || raw).trim() || null;
    });
    const defaultVersionEntry = $derived(
        manifestVersionOptions.find((entry) => entry.version === resolvedDefaultVersion) ?? null,
    );
    const activeVersionEntry = $derived(
        manifestVersionOptions.find((entry) => entry.version === activeDocsVersion) ?? null,
    );
    const activeMarkdownFetchPath = $derived.by(() => {
        const mdPath = router.activeMarkdownPath;
        if (!mdPath) return null;
        if (!activeDocsVersion) return withBase(mdPath);
        return withBase(`${versionPathPrefix}/${activeDocsVersion}${mdPath}`);
    });
    const showOutdatedVersionNotice = $derived(
        Boolean(
            activeDocsVersion &&
                resolvedDefaultVersion &&
                activeDocsVersion !== resolvedDefaultVersion,
        ),
    );
    const versionStatusText = $derived(
        versionManifestLoadError &&
            hasVersionDefinitions &&
            showManifestUnavailableStatus
            ? manifestUnavailableText
            : "",
    );
    const mainTitle = $derived(localeContext.mainTitle);
    const nav = $derived(localeContext.nav);
    const sidebar = $derived(localeContext.sidebar);
    const outline = $derived(localeContext.outline);
    const version = $derived(globalVersion);
    const localeFrontmatters = $derived.by(() => {
        const currentIndexKey = currentSrcDir === "/"
            ? "/index.md"
            : currentSrcDir + "/index.md";
        const currentPrefix = currentSrcDir === "/"
            ? "/"
            : currentSrcDir + "/";
        const inLocale = Object.fromEntries(
            Object.entries(frontmatters).filter(([key]) => {
                if (
                    key !== currentIndexKey &&
                    !key.startsWith(currentPrefix)
                ) {
                    return false;
                }
                // Root locale should not include localized subtrees (e.g. /docs/pl/*).
                if (currentSrcDir === normalizeSrcDir(configuredSrcDir)) {
                    const otherLocaleRoots = localeContext.allSrcDirs.filter(
                        (rp) => rp !== currentSrcDir,
                    );
                    if (
                        otherLocaleRoots.some(
                            (rp) =>
                                key === (rp === "/" ? "/index.md" : rp + "/index.md") ||
                                key.startsWith(rp === "/" ? "/" : rp + "/"),
                        )
                    ) {
                        return false;
                    }
                }
                return true;
            }),
        );
        return inLocale;
    });
    const menu = $derived.by(() => {
        return Array.isArray(sidebar)
            ? (parseSidebarConfig(
                  sidebar,
                  localeFrontmatters,
                  currentSrcDir,
              ) ??
                  prepareMenu(
                      localeFrontmatters,
                      currentSrcDir,
                      localeFrontmatters,
                  ))
            : prepareMenu(
                  localeFrontmatters,
                  currentSrcDir,
                  localeFrontmatters,
              );
    });
    const flat = $derived(flattenMenu(menu));
    const localeSwitchItems = $derived(
        getLocaleSwitchItems({
            entries: localeContext.entries,
            activePath: routePath,
            activeSrcDir: currentSrcDir,
            activeLocaleKey: localeContext.key,
            frontmatters,
            preservePath: i18nRouting,
        }),
    );
    const hasRootLocale = $derived(
        localeContext.entries.some((entry) => entry.key === "/"),
    );
    const baseDocsRoot = $derived(normalizeSrcDir(configuredSrcDir));
    const defaultLocaleRoot = $derived(
        localeContext.entries[0]?.srcDir ?? baseDocsRoot,
    );

    // If every locale is namespaced (e.g. /en/, /pl/), redirect `/` and the
    // base docs root (e.g. /docs) to the first configured locale root.
    $effect(() => {
        if (hasRootLocale) return;
        if (routePath !== "/" && routePath !== baseDocsRoot) return;
        if (routePath === defaultLocaleRoot) return;
        navigateInternal(defaultLocaleRoot);
    });

    const langMenuLabel = $derived(
        localeContext.langMenuLabel ?? "Change language",
    );
    const sidebarMenuLabel = $derived(
        localeContext.sidebarMenuLabel ?? "Menu",
    );
    const skipToContentLabel = $derived(
        localeContext.skipToContentLabel ?? "Skip to content",
    );
    const returnToTopLabel = $derived(
        localeContext.returnToTopLabel ?? "Back to top",
    );
    const darkModeSwitchLabel = $derived(
        localeContext.darkModeSwitchLabel ?? "Appearance",
    );
    const lightModeSwitchTitle = $derived(
        localeContext.lightModeSwitchTitle ?? "Switch to light theme",
    );
    const darkModeSwitchTitle = $derived(
        localeContext.darkModeSwitchTitle ?? "Switch to dark theme",
    );
    const searchButtonLabel = $derived(
        localeContext.searchButtonLabel ?? "Search...",
    );
    const searchModalLabel = $derived(
        localeContext.searchModalLabel ?? "Search",
    );
    const searchPlaceholder = $derived(
        localeContext.searchPlaceholder ?? "Search docs...",
    );
    const searchLoadingText = $derived(
        localeContext.searchLoadingText ?? "Loading index...",
    );
    const searchErrorText = $derived(
        localeContext.searchErrorText ?? "Failed to load search index.",
    );
    const searchSearchingText = $derived(
        localeContext.searchSearchingText ?? "Searching...",
    );
    const searchNoResultsText = $derived(
        localeContext.searchNoResultsText ?? "No results for",
    );
    const searchStartText = $derived(
        localeContext.searchStartText ??
            "Start typing to search across all documentation.",
    );
    const searchResultsAriaLabel = $derived(
        localeContext.searchResultsAriaLabel ?? "Search results",
    );
    const searchNavigateText = $derived(
        localeContext.searchNavigateText ?? "navigate",
    );
    const searchSelectText = $derived(
        localeContext.searchSelectText ?? "open",
    );
    const searchCloseText = $derived(
        localeContext.searchCloseText ?? "close",
    );
    const aiTabLabel = $derived(
        localeContext.aiTabLabel ?? "Ask AI",
    );
    const aiPlaceholder = $derived(
        localeContext.aiPlaceholder ?? "Ask a question about the docs\u2026",
    );
    const aiLoadingText = $derived(
        localeContext.aiLoadingText ?? "Thinking\u2026",
    );
    const aiErrorText = $derived(
        localeContext.aiErrorText ?? "Something went wrong. Please try again.",
    );
    const aiStartText = $derived(
        localeContext.aiStartText ?? "Ask me anything about this documentation. My answers are based exclusively on the docs.",
    );
    const aiSourcesLabel = $derived(
        localeContext.aiSourcesLabel ?? "Sources",
    );
    const aiClearChatLabel = $derived(
        localeContext.aiClearChatLabel ?? "Clear chat",
    );
    const aiSendLabel = $derived(
        localeContext.aiSendLabel ?? "Send",
    );
    const docFooterPrevLabel = $derived(
        localeContext.docFooter?.prev ?? "Previous",
    );
    const docFooterNextLabel = $derived(
        localeContext.docFooter?.next ?? "Next",
    );
    const siteTitle = $derived(
        localeContext.siteTitle === undefined
            ? mainTitle
            : localeContext.siteTitle,
    );
    const logo = $derived(localeContext.logo);
    const socialLinks = $derived(localeContext.socialLinks ?? []);
    const editLink = $derived(localeContext.editLink);
    const footer = $derived(localeContext.footer);
    const asideMode = $derived(localeContext.aside ?? true);
    const externalLinkIcon = $derived(localeContext.externalLinkIcon ?? false);

    const lastModified = $derived.by(() => {
        const hasVisibilityToggle = Boolean(globalLastModified);
        const hasLastUpdatedConfig =
            Boolean(globalLastUpdated) ||
            Boolean(localeContext.lastUpdated) ||
            Boolean(localeContext.lastUpdatedText);

        if (!hasVisibilityToggle && !hasLastUpdatedConfig) return false;

        const base =
            (typeof globalLastModified === "object"
                ? globalLastModified
                : globalLastUpdated) ?? {};

        if (typeof globalLastModified === "object" || globalLastUpdated) {
            return {
                ...base,
                formatOptions:
                    localeContext.lastUpdated?.formatOptions ??
                    base.formatOptions,
                text:
                    localeContext.lastUpdated?.text ??
                    localeContext.lastUpdatedText ??
                    base.text,
            };
        }
        if (localeContext.lastUpdated || localeContext.lastUpdatedText) {
            return {
                text:
                    localeContext.lastUpdated?.text ??
                    localeContext.lastUpdatedText,
                formatOptions: localeContext.lastUpdated?.formatOptions,
            };
        }
        return true;
    });

    function resolveLastModifiedFormat(
        value: unknown,
    ): Intl.DateTimeFormatOptions {
        const source =
            value && typeof value === "object" && "formatOptions" in value
                ? (value as any).formatOptions
                : null;
        if (!source || typeof source !== "object") {
            return { dateStyle: "medium" };
        }
        const { forceLocale: _forceLocale, ...rest } = source as any;
        return Object.keys(rest).length ? rest : { dateStyle: "medium" };
    }

    function resolveLastModifiedLocale(value: unknown): string {
        const source =
            value && typeof value === "object" && "formatOptions" in value
                ? (value as any).formatOptions
                : null;
        const forceLocale =
            Boolean(source && typeof source === "object" && (source as any).forceLocale);
        const explicitLocale =
            value && typeof value === "object" && "locale" in value
                ? (value as any).locale
                : null;

        if (explicitLocale) return explicitLocale;
        if (forceLocale && localeContext.lang) return localeContext.lang;
        return navigator.language;
    }

    $effect(() => {
        if (!localeContext.lang) return;
        document.documentElement.lang = localeContext.lang;
    });

    $effect(() => {
        if (!localeContext.dir) return;
        document.documentElement.dir = localeContext.dir;
    });

    type CompiledMarkdownModule = {
        default: any;
    };

    // Keep this list explicit: only selected pages are compiled as Svelte modules.
    const compiledMarkdownModules = import.meta.glob(
        [
            "/docs/reference/home-page.md",
            "/docs/pl/reference/home-page.md",
            "/docs/reference/team-page.md",
            "/docs/pl/reference/team-page.md",
            "/docs/test.md",
        ],
    ) as Record<
        string,
        () => Promise<CompiledMarkdownModule>
    >;

    const hasCompiledMarkdownModule = $derived.by(() => {
        const mdPath = router.activeMarkdownPath;
        if (!mdPath) return false;
        if (compiledMarkdownModules[mdPath]) return true;
        return Object.keys(compiledMarkdownModules).some(
            (key) => key.endsWith(mdPath) || mdPath.endsWith(key),
        );
    });

    function resolveCompiledLoader(mdPath: string) {
        const exact = compiledMarkdownModules[mdPath];
        if (exact) return exact;

        const fallbackKey = Object.keys(compiledMarkdownModules).find(
            (key) => key.endsWith(mdPath) || mdPath.endsWith(key),
        );
        return fallbackKey ? compiledMarkdownModules[fallbackKey] : undefined;
    }

    async function loadCompiledMarkdown(mdPath: string) {
        const loader = resolveCompiledLoader(mdPath);
        if (!loader) return null;
        try {
            return await loader();
        } catch (err) {
            console.error("[greg] Failed to load compiled markdown module", {
                mdPath,
                err,
            });
            return null;
        }
    }

    const title = $derived(router.title(flat));

    // -- Content fetch -----------------------------------------------------------
    async function fetchMarkdown(mdPath: string): Promise<string> {
        const res = await fetch(mdPath);
        if (!res.ok)
            throw new Error(`${res.status} ${res.statusText} ďż˝ ${mdPath}`);
        return res.text();
    }

    // -- Layout ------------------------------------------------------------------
    // Resolve the key of the active page in the frontmatter map so we can read
    // `layout` (and any other fields) without loading the full module.
    const activeKey = $derived.by(() => {
        const rel = routePath
            .replace(currentSrcDir, "")
            .replace(/^\//, "");
        const candidates: string[] = rel
            ? (
                  currentSrcDir === "/"
                      ? [
                            `/${rel}.md`,
                            `/${rel}/index.md`,
                        ]
                      : [
                            `${currentSrcDir}/${rel}.md`,
                            `${currentSrcDir}/${rel}/index.md`,
                        ]
              )
            : (currentSrcDir === "/"
                ? [`/index.md`]
                : [`${currentSrcDir}/index.md`, `${currentSrcDir}index.md`]);
        return candidates.find((c) => c in frontmatters) ?? null;
    });

    const activeFrontmatter = $derived(
        activeKey ? frontmatters[activeKey] : undefined,
    );

    /** Apply withBase to a hero image src string or themed-image object. */
    function applyBaseToImage(image: unknown): unknown {
        if (!image) return image;
        if (typeof image === "string") return withBase(image);
        const img = image as Record<string, unknown>;
        if ("light" in img || "dark" in img) {
            return {
                ...img,
                light: typeof img.light === "string" ? withBase(img.light) : img.light,
                dark: typeof img.dark === "string" ? withBase(img.dark) : img.dark,
            };
        }
        if ("src" in img) return { ...img, src: typeof img.src === "string" ? withBase(img.src as string) : img.src };
        return image;
    }

    /** Resolve a frontmatter link so bare absolute paths get the currentSrcDir prefix. */
    const resolvedHero = $derived.by(() => {
        const hero = (activeFrontmatter as any)?.hero;
        if (!hero) return undefined;
        return {
            ...hero,
            image: applyBaseToImage(hero.image),
            actions: hero.actions?.map((a: { link: string; [k: string]: unknown }) => ({
                ...a,
                link: (() => {
                    const link: string = a.link ?? "";
                    if (!link || !link.startsWith("/")) return link;
                    if (link === currentSrcDir || link.startsWith(currentSrcDir + "/")) return link;
                    return normalizeSrcDir(currentSrcDir + link);
                })(),
            })),
        };
    });

    const resolvedFeatures = $derived(
        (activeFrontmatter as any)?.features?.map((f: { icon?: unknown; link?: string; [k: string]: unknown }) => ({
            ...f,
            icon: f.icon ? applyBaseToImage(f.icon) : f.icon,
            link: (() => {
                const link = f.link ?? "";
                if (!link || !link.startsWith("/")) return f.link;
                if (link === currentSrcDir || link.startsWith(currentSrcDir + "/")) return link;
                return normalizeSrcDir(currentSrcDir + link);
            })(),
        }))
    );

    /** True when the URL is inside the current locale root path but no matching file exists. */
    const notFound = $derived(activeKey === null && routePath.startsWith(currentSrcDir));
    const notFoundUi = $derived.by(() => {
        const isPl =
            localeContext.key === "/pl/" ||
            String(localeContext.lang || "").toLowerCase().startsWith("pl");

        if (isPl) {
            return {
                title: "Strona nie znaleziona",
                description: "Nie znaleziono strony dla podanego adresu.",
                backLabel: "Wroc do dokumentacji",
            };
        }

        return {
            title: "Page not found",
            description: "We could not find a page for this address.",
            backLabel: "Back to documentation",
        };
    });
    const activeLayout = $derived<"doc" | "home" | "page">(
        activeFrontmatter?.layout ?? "doc",
    );
    const useCompiledRenderer = $derived(
        activeFrontmatter?.renderer === "mdsvex" || hasCompiledMarkdownModule,
    );

    /** Page-level outline: reads `outline` from active page frontmatter, falls back to global setting. */
    const outlineNorm = $derived(
        activeFrontmatter?.outline !== undefined
            ? normalizeOutline(
                  activeFrontmatter.outline as OutlineOption | boolean,
              )
            : normalizeOutline(outline),
    );

    /** Auto prev/next from sidebar order; overridable per-page via frontmatter. */
    const prevNextAuto = $derived(getPrevNext(routePath, flat));
    const prevNext = $derived({
        prev:
            activeFrontmatter?.prev === false
                ? null
                : activeFrontmatter?.prev &&
                    typeof activeFrontmatter.prev === "object"
                  ? {
                        label: activeFrontmatter.prev.text,
                        link: activeFrontmatter.prev.link,
                    }
                  : prevNextAuto.prev,
        next:
            activeFrontmatter?.next === false
                ? null
                : activeFrontmatter?.next &&
                    typeof activeFrontmatter.next === "object"
                  ? {
                        label: activeFrontmatter.next.text,
                        link: activeFrontmatter.next.link,
                    }
                  : prevNextAuto.next,
    });

    /** Breadcrumb path from root to active page. */
    const breadcrumbItems = $derived(getBreadcrumbItems(routePath, menu));

    /** Whether the left nav sidebar should be visible. */
    const showSidebar = $derived(activeLayout === "doc");
    /** Whether the right outline / ads aside should be visible. */
    const showOutline = $derived(activeLayout === "doc" && asideMode !== false);

    // -- Splitter ----------------------------------------------------------------
    const sp = useSplitter();

    setPortalsContext();

    // -- Internal links ----------------------------------------------------------
    const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/{2})/i;

    function handleInternalLinks(event: MouseEvent) {
        const anchor = (event.target as HTMLElement | null)?.closest("a");
        if (!anchor) return;

        const href = anchor.getAttribute("href");
        if (!href) return;

        const explicitTarget = anchor.getAttribute("target");
        if (explicitTarget && explicitTarget !== "_self") {
            event.preventDefault();
            const destination = anchor.href || href;
            if (explicitTarget === "_blank") {
                window.open(destination, "_blank", "noopener,noreferrer");
            } else {
                window.open(destination, explicitTarget);
            }
            return;
        }

        if (EXTERNAL_RE.test(href)) return;

        if (href.startsWith("#")) {
            event.preventDefault();
            navigateInternalWithAnchor(routePath, href.slice(1));
            return;
        }

        const hashIdx = href.indexOf("#");
        const pathPart = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
        const hashPart = hashIdx >= 0 ? href.slice(hashIdx + 1) : "";
        const pathWithoutBase = withoutBase(pathPart);

        const cleanSrcDir = currentSrcDir.replace(/\/+$/, "");

        let resolvedPath: string;
        if (pathWithoutBase.startsWith("/")) {
            // In markdown docs, leading "/" is docs-root relative (srcDir),
            // matching include semantics.
            if (
                pathWithoutBase === cleanSrcDir ||
                pathWithoutBase.startsWith(cleanSrcDir + "/")
            ) {
                resolvedPath = pathWithoutBase;
            } else {
                resolvedPath = cleanSrcDir + pathWithoutBase;
            }
        } else {
            try {
                // Resolve relative links against the current markdown file directory,
                // not the route path (which may not end with "/").
                const mdPath =
                    router.activeMarkdownPath ?? `${routePath}.md`;
                const mdDir = mdPath.slice(0, mdPath.lastIndexOf("/") + 1);
                resolvedPath = new URL(pathPart, window.location.origin + mdDir)
                    .pathname;
            } catch {
                return;
            }
        }

        resolvedPath = resolvedPath.replace(/\.(md|html)$/i, "");
        resolvedPath =
            resolvedPath.replace(/\/index$/, "") || currentSrcDir;

        event.preventDefault();
        navigateInternalWithAnchor(resolvedPath, hashPart || undefined);
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div
    class="greg"
    data-theme={theme}
    data-external-link-icon={externalLinkIcon ? "true" : "false"}
    onmousemove={sp.onMouseMove}
    onmouseup={sp.onMouseUp}
    onclick={handleCodeGroupClick}
    onkeydown={handleCodeGroupKeydown}
>
    <a class="skip-link" href="#greg-main-content">{skipToContentLabel}</a>
    <DocsSiteHeader
        srcDir={currentSrcDir}
        {siteTitle}
        {logo}
        {socialLinks}
        {mainTitle}
        {version}
        {nav}
        locales={localeSwitchItems}
        {langMenuLabel}
        {theme}
        {darkModeSwitchLabel}
        {lightModeSwitchTitle}
        {darkModeSwitchTitle}
        {searchButtonLabel}
        showSearch={searchEnabled}
        versionOptions={manifestVersionOptions}
        activeVersion={activeDocsVersion}
        {versionMenuLabel}
        {versionStatusText}
        onVersionChange={navigateToVersion}
        onThemeChange={(t) => setThemeManually(t)}
        navigate={navigateInternal}
        {navigateHome}
        onOpenSearch={() => (searchOpen = true)}
    />

    {#if showOutdatedVersionNotice && defaultVersionEntry && activeVersionEntry}
        <VersionOutdatedNotice
            currentTitle={activeVersionEntry.title}
            defaultTitle={defaultVersionEntry.title}
            message={formatOutdatedMessage(
                activeVersionEntry.title,
                defaultVersionEntry.title,
                outdatedVersionMessageTemplate,
            )}
            actionLabel={outdatedVersionActionLabel}
            onGoToDefault={() => navigateToVersion(defaultVersionEntry.version)}
        />
    {/if}

    <div class="greg-body" class:aside-left={asideMode === "left"}>
        {#if showSidebar}
            <aside bind:this={sp.aside}>
                <DocsNavigation
                    {menu}
                    srcDir={currentSrcDir}
                    ariaLabel={sidebarMenuLabel}
                    active={routePath}
                    navigate={navigateInternal}
                />
            </aside>
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
            <div
                class="splitter"
                bind:this={sp.splitter}
                onmousedown={sp.onMouseDown}
            >
                <span class="splitter-handle" aria-hidden="true">
                    <EllipsisVertical size={18} />
                </span>
            </div>
        {/if}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
        <main
            id="greg-main-content"
            bind:this={mainEl}
            class:layout-home={activeLayout === "home"}
            class:layout-page={activeLayout === "page"}
            onclick={handleInternalLinks}
            tabindex="-1"
        >
            {#if activeLayout === "home"}
                <LayoutHome
                    hero={resolvedHero}
                    features={resolvedFeatures}
                />
            {:else if router.activeMarkdownPath}
                {#if useCompiledRenderer}
                    {#await loadCompiledMarkdown(router.activeMarkdownPath)}
                        <div class="spinner-wrap">
                            <Spinner />
                        </div>
                    {:then compiledModule}
                        {#if compiledModule}
                            {#if breadcrumb}
                                <Breadcrumb
                                    items={breadcrumbItems}
                                    navigate={navigateInternal}
                                    srcDir={currentSrcDir}
                                />
                            {/if}
                            {@const CompiledPage = compiledModule.default}
                            <div class="markdown-renderer markdown-body">
                                <CompiledPage />
                            </div>
                            {#if lastModified && activeFrontmatter?._mtime}
                                {@const lmLabel =
                                    (typeof lastModified === "object"
                                        ? lastModified.text
                                        : null) ?? "Last updated:"}
                                {@const lmFmt =
                                    resolveLastModifiedFormat(lastModified)}
                                {@const lmLocale =
                                    resolveLastModifiedLocale(lastModified)}
                                <p class="doc-last-modified">
                                    {lmLabel}
                                    {new Intl.DateTimeFormat(
                                        lmLocale,
                                        lmFmt,
                                    ).format(new Date(activeFrontmatter._mtime))}
                                </p>
                            {/if}
                            {#if activeLayout === "doc"}
                                <PrevNext
                                    prev={prevNext.prev}
                                    next={prevNext.next}
                                    prevLabel={docFooterPrevLabel || undefined}
                                    nextLabel={docFooterNextLabel || undefined}
                                    navigate={navigateInternal}
                                />
                            {/if}
                        {:else}
                            <p class="fetch-error">Could not load page.</p>
                        {/if}
                    {:catch}
                        <p class="fetch-error">Could not load page.</p>
                    {/await}
                {:else}
                    {#await fetchMarkdown(activeMarkdownFetchPath || router.activeMarkdownPath)}
                        <div class="spinner-wrap">
                            <Spinner />
                        </div>
                    {:then markdown}
                        {#if breadcrumb}
                            <Breadcrumb
                                items={breadcrumbItems}
                                navigate={navigateInternal}
                                srcDir={currentSrcDir}
                            />
                        {/if}
                        <MarkdownRenderer
                            {markdown}
                            baseUrl={activeMarkdownFetchPath || router.activeMarkdownPath}
                            docsPrefix={withBase(currentSrcDir)}
                            {mermaidTheme}
                            {mermaidThemes}
                            colorTheme={theme}
                        />
                        {#if lastModified && activeFrontmatter?._mtime}
                            {@const lmLabel =
                                (typeof lastModified === "object"
                                    ? lastModified.text
                                    : null) ?? "Last updated:"}
                            {@const lmFmt =
                                resolveLastModifiedFormat(lastModified)}
                            {@const lmLocale =
                                resolveLastModifiedLocale(lastModified)}
                            <p class="doc-last-modified">
                                {lmLabel}
                                {new Intl.DateTimeFormat(lmLocale, lmFmt).format(
                                    new Date(activeFrontmatter._mtime),
                                )}
                            </p>
                        {/if}
                        {#if
                            editLink?.pattern &&
                            router.activeMarkdownPath &&
                            activeLayout === "doc"
                        }
                            {@const editPath = router.activeMarkdownPath
                                .replace(normalizeSrcDir(configuredSrcDir), "")
                                .replace(/^\//, "")}
                            <p class="doc-edit-link">
                                <a
                                    href={editLink.pattern.replace(
                                        /:path/g,
                                        editPath,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >{editLink.text ?? "Edit this page"}</a>
                            </p>
                        {/if}
                        {#if
                            editLink?.pattern &&
                            router.activeMarkdownPath &&
                            activeLayout === "doc"
                        }
                            {@const editPath = router.activeMarkdownPath
                                .replace(normalizeSrcDir(configuredSrcDir), "")
                                .replace(/^\//, "")}
                            <p class="doc-edit-link">
                                <a
                                    href={editLink.pattern.replace(
                                        /:path/g,
                                        editPath,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >{editLink.text ?? "Edit this page"}</a>
                            </p>
                        {/if}
                        {#if activeLayout === "doc"}
                            <PrevNext
                                prev={prevNext.prev}
                                next={prevNext.next}
                                prevLabel={docFooterPrevLabel || undefined}
                                nextLabel={docFooterNextLabel || undefined}
                                navigate={navigateInternal}
                            />
                        {/if}
                    {:catch}
                        <p class="fetch-error">Could not load page.</p>
                    {/await}
                {/if}
            {:else if notFound}
                <div class="not-found">
                    <p class="not-found-code">404</p>
                    <h1>{notFoundUi.title}</h1>
                    <p>{notFoundUi.description}</p>
                    <p class="not-found-path"><code>{router.active}</code></p>
                    <!-- svelte-ignore a11y_invalid_attribute -->
                    <a
                        href={withBase(currentSrcDir)}
                        onclick={(e) => {
                            e.preventDefault();
                            navigateInternal(currentSrcDir);
                        }}>{notFoundUi.backLabel}</a
                    >
                </div>
            {:else if title}
                <h1>{title}</h1>
                {@render children?.()}
            {/if}
        </main>
        <aside
            class="greg-aside-outline"
            class:hidden={(!outlineNorm && !carbonAds) || !showOutline || asideMode === false}
        >
            {#if outlineNorm && showOutline}
                <Outline
                    container={mainEl}
                    level={outlineNorm.level}
                    label={outlineNorm.label}
                    active={routePath}
                />
            {/if}
            {#if carbonAds && showOutline}
                <CarbonAds
                    code={carbonAds.code}
                    placement={carbonAds.placement}
                    active={routePath}
                />
            {/if}
        </aside>
    </div>
    {#if
        !showSidebar &&
        (footer?.message || footer?.copyright)
    }
        <footer class="doc-footer">
            {#if footer?.message}<p>{footer.message}</p>{/if}
            {#if footer?.copyright}<p>{footer.copyright}</p>{/if}
        </footer>
    {/if}
    {#if searchEnabled}
        <SearchModal
            bind:open={searchOpen}
            onClose={() => (searchOpen = false)}
            onNavigate={navigateInternalWithAnchor}
            localeSrcDir={currentSrcDir}
            allLocaleSrcDirs={localeContext.allSrcDirs}
            baseSrcDir={normalizeSrcDir(configuredSrcDir)}
            {searchModalLabel}
            {searchPlaceholder}
            {searchLoadingText}
            {searchErrorText}
            {searchSearchingText}
            {searchNoResultsText}
            {searchStartText}
            {searchResultsAriaLabel}
            {searchNavigateText}
            {searchSelectText}
            {searchCloseText}
            {aiTabLabel}
            {aiPlaceholder}
            {aiLoadingText}
            {aiErrorText}
            {aiStartText}
            {aiSourcesLabel}
            {aiClearChatLabel}
            {aiSendLabel}
            {searchProvider}
        />
    {/if}
    {#if backToTop}
        <BackToTop target={mainEl} label={returnToTopLabel} />
    {/if}
</div>

<style lang="scss">
    .skip-link {
        position: absolute;
        left: 0.75rem;
        top: 0.5rem;
        z-index: 1000;
        padding: 0.4rem 0.6rem;
        border-radius: 0.4rem;
        border: 1px solid var(--greg-border-color);
        background: var(--greg-header-background);
        color: var(--greg-color);
        text-decoration: none;
        transform: translateY(-150%);
        transition: transform 0.15s ease;
    }

    .skip-link:focus-visible {
        transform: translateY(0);
        outline: 2px solid var(--greg-accent);
        outline-offset: 2px;
    }

    .greg {
        display: flex;
        flex-flow: column nowrap;
        background-color: var(--greg-background);
        color: var(--greg-color);
        height: 100vh;
        overflow: hidden;
    }

    /* -- Body layout ---------------------------------------------------------- */
    .greg-body {
        display: flex;
        flex-flow: row nowrap;
        flex: 1;
        overflow: hidden;
        width: 100%;

        &.aside-left {
            .greg-aside-outline {
                order: 1;
                border-left: none;
                border-right: 1px solid var(--greg-border-color);
            }

            main {
                order: 2;
            }
        }
    }

    .splitter {
        background-color: transparent;
        border-left: 1px solid var(--greg-border-color);
        width: 7px;
        height: 100%;
        cursor: col-resize;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        transition: background-color 0.15s;

        .splitter-handle {
            width: 7px;
            height: 32px;
            color: var(--greg-splitter-handler-color);
            background-color: var(--greg-splitter-handler-background);
            border-radius: 0 7px 7px 0;
            transition: color 0.15s;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;

            :global(svg) {
                display: block;
                margin: 0 auto;
                flex-shrink: 0;
                padding: 0;
            }

        }

        &:hover {
            border-color: var(--greg-splitter-active-border);

            .splitter-handle {
                background-color: var(--greg-splitter-active-handler-background);
                color: var(--greg-splitter-active-handler-color);
            }
        }
    }

    aside {
        width: 16rem;
        background-color: var(--greg-menu-background);
        padding: 1rem 0.75rem;
        display: flex;
        flex-flow: column nowrap;
        gap: 0.4rem;
        flex-shrink: 0;
        overflow-y: auto;

        &.greg-aside-outline {
            width: 280px;
            border-right: none;
            border-left: 1px solid var(--greg-border-color);
            padding: 1rem;
            overflow-y: auto;
        }

        &.hidden {
            display: none;
        }
    }

    main {
        background-color: var(--greg-main-background);
        padding: 2rem 3rem;
        width: 100%;
        display: flex;
        flex-flow: column nowrap;
        gap: 0.5em;
        justify-content: flex-start;
        overflow-y: auto;

        h1 {
            font-size: 1.8rem;
            font-weight: 700;
            border-bottom: 1px solid var(--greg-border-color);
            padding-bottom: 0.5rem;
            margin-bottom: 0.5rem;
            color: var(--greg-color);
        }
    }

    .spinner-wrap {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;

        :global(.loader::before),
        :global(.loader::after) {
            box-shadow: 0 0 0 3px var(--greg-accent) inset;
            filter: drop-shadow(40px 40px 0 var(--greg-accent));
        }
        :global(.loader::after) {
            filter: drop-shadow(-40px 40px 0 var(--greg-accent));
        }
    }

    .doc-last-modified {
        font-size: 0.8rem;
        color: var(--greg-menu-section-color);
        margin-top: 1.5rem;
    }

    .doc-edit-link {
        font-size: 0.85rem;
        margin: 0.25rem 0 0;

        a {
            color: var(--greg-accent);
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    .doc-footer {
        border-top: 1px solid var(--greg-border-color);
        padding: 1rem 2rem;
        color: var(--greg-menu-section-color);
        font-size: 0.85rem;

        p {
            margin: 0.2rem 0;
        }
    }

    .not-found {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        text-align: center;
        padding: 4rem 2rem;

        .not-found-code {
            font-size: 6rem;
            font-weight: 700;
            line-height: 1;
            color: var(--greg-accent);
            margin: 0;
        }

        h1 {
            font-size: 1.5rem;
            margin: 0 0 0.5rem;
        }

        .not-found-path {
            color: var(--greg-menu-section-color);
            font-size: 0.9rem;
            margin: 0 0 1.5rem;
        }

        a {
            color: var(--greg-accent);
            font-weight: 500;
            text-decoration: none;
            &:hover {
                text-decoration: underline;
            }
        }
    }
</style>
