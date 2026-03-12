type TopNavItem = {
    text: string;
    link?: string;
    target?: string;
    items?: TopNavItem[];
};

type ThemeableImage =
    | string
    | { src: string; alt?: string }
    | { light: string; dark: string; alt?: string };

type SocialLinkItem = {
    icon: string | { svg: string };
    link: string;
    ariaLabel?: string;
};

type OutlineLevel = false | number | [number, number] | "deep";
type OutlineOption = OutlineLevel | { level?: OutlineLevel; label?: string };

type BadgeSpec = string | { text: string; type?: string };

type SidebarItem = {
    text: string;
    link?: string;
    items?: SidebarItem[];
    auto?: string;
    badge?: BadgeSpec;
};

export type LocaleThemeConfig = {
    nav?: TopNavItem[];
    sidebar?: "auto" | SidebarItem[];
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
    aside?: boolean | "left";
    lastUpdated?: {
        text?: string;
        formatOptions?: Intl.DateTimeFormatOptions & { forceLocale?: boolean };
    };
    externalLinkIcon?: boolean;
    search?: {
        locales?: Record<
            string,
            {
                button?: {
                    buttonText?: string;
                    buttonAriaLabel?: string;
                };
                modal?: {
                    displayDetails?: string;
                    resetButtonTitle?: string;
                    backButtonTitle?: string;
                    noResultsText?: string;
                    footer?: {
                        selectText?: string;
                        navigateText?: string;
                        closeText?: string;
                    };
                    searchBox?: {
                        placeholder?: string;
                        resetButtonTitle?: string;
                        resetButtonAriaLabel?: string;
                        cancelButtonText?: string;
                        cancelButtonAriaLabel?: string;
                    };
                    startScreen?: {
                        recentSearchesTitle?: string;
                        noRecentSearchesText?: string;
                        saveRecentSearchButtonTitle?: string;
                        removeRecentSearchButtonTitle?: string;
                        favoriteSearchesTitle?: string;
                        removeFavoriteSearchButtonTitle?: string;
                    };
                    errorScreen?: {
                        titleText?: string;
                        helpText?: string;
                    };
                    loadingScreen?: {
                        loadingText?: string;
                    };
                    ai?: {
                        tabLabel?: string;
                        placeholder?: string;
                        startText?: string;
                        loadingText?: string;
                        errorText?: string;
                        sourcesLabel?: string;
                    };
                };
            }
        >;
    };
};

export type LocaleConfig = {
    lang?: string;
    dir?: "ltr" | "rtl";
    title?: string;
    description?: string;
    label?: string;
    link?: string;
    themeConfig?: LocaleThemeConfig;
    [key: string]: unknown;
};

export type LocaleEntry = {
    key: string;
    segment: string;
    srcDir: string;
    config: LocaleConfig;
};

type ResolveDefaults = {
    mainTitle: string;
    nav: TopNavItem[];
    sidebar: "auto" | SidebarItem[];
    outline: OutlineOption | boolean;
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
    aside?: boolean | "left";
    lastUpdated?: {
        text?: string;
        formatOptions?: Intl.DateTimeFormatOptions & { forceLocale?: boolean };
    };
    externalLinkIcon?: boolean;
    searchButtonLabel?: string;
    searchModalLabel?: string;
    searchPlaceholder?: string;
    searchLoadingText?: string;
    searchErrorText?: string;
    searchSearchingText?: string;
    searchNoResultsText?: string;
    searchStartText?: string;
    searchResultsAriaLabel?: string;
    searchNavigateText?: string;
    searchSelectText?: string;
    searchCloseText?: string;
    aiTabLabel?: string;
    aiPlaceholder?: string;
    aiLoadingText?: string;
    aiErrorText?: string;
    aiStartText?: string;
    aiSourcesLabel?: string;
    aiClearChatLabel?: string;
    aiSendLabel?: string;
};

const EXTERNAL_LINK_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

// ── Built-in locale strings ──────────────────────────────────────────────────
// Provides default UI translations per language tag so users don't need to
// repeat common strings in their greg.config.js.
// Keys: lowercase BCP-47 language tag (full e.g. "en-us" or base e.g. "en").
// Lookup order: full tag → base tag → empty (falls through to defaults).
//
// Structure mirrors LocaleThemeConfig. The `search` key holds the per-locale
// search config (button + modal) without the `locales[key]` wrapping — that
// wrapping is injected dynamically in getBuiltInThemeConfig() using the actual
// locale key, so the data stays key-agnostic.

type SearchLocaleModal = {
    noResultsText?: string;
    footer?: {
        selectText?: string;
        navigateText?: string;
        closeText?: string;
    };
    searchBox?: { placeholder?: string };
    startScreen?: { noRecentSearchesText?: string };
    errorScreen?: { titleText?: string };
    loadingScreen?: { loadingText?: string };
    /** Greg-specific: "Searching…" status text. */
    searchingText?: string;
    /** Greg-specific: aria-label for the results list. */
    resultsAriaLabel?: string;
    ai?: {
        tabLabel?: string;
        placeholder?: string;
        startText?: string;
        loadingText?: string;
        errorText?: string;
        sourcesLabel?: string;
        clearChatLabel?: string;
        sendLabel?: string;
    };
};

type SearchLocaleEntry = {
    button?: { buttonText?: string; buttonAriaLabel?: string };
    modal?: SearchLocaleModal;
};

/** LocaleThemeConfig shape, but with `search` stored one level shallower
 *  (the locale key is unknown at definition time and injected on retrieval). */
type BuiltInLocaleThemeConfig = Omit<LocaleThemeConfig, "search"> & {
    search?: SearchLocaleEntry;
};

const BUILT_IN_LOCALE_STRINGS: Record<string, BuiltInLocaleThemeConfig> = {
    en: {
        langMenuLabel: "Change language",
        sidebarMenuLabel: "Menu",
        skipToContentLabel: "Skip to content",
        returnToTopLabel: "Back to top",
        darkModeSwitchLabel: "Appearance",
        lightModeSwitchTitle: "Switch to light theme",
        darkModeSwitchTitle: "Switch to dark theme",
        lastUpdatedText: "Last updated:",
        docFooter: { prev: "Previous page", next: "Next page" },
        search: {
            button: { buttonText: "Search...", buttonAriaLabel: "Search" },
            modal: {
                searchBox: { placeholder: "Search docs..." },
                loadingScreen: { loadingText: "Loading index..." },
                errorScreen: { titleText: "Failed to load search index." },
                noResultsText: "No results for",
                startScreen: { noRecentSearchesText: "Start typing to search across all documentation." },
                footer: { navigateText: "navigate", selectText: "open", closeText: "close" },
                searchingText: "Searching...",
                resultsAriaLabel: "Search results",
                ai: {
                    tabLabel: "Ask AI",
                    placeholder: "Ask a question about the docs\u2026",
                    loadingText: "Thinking\u2026",
                    errorText: "Something went wrong. Please try again.",
                    startText: "Ask me anything about this documentation. My answers are based exclusively on the docs.",
                    sourcesLabel: "Sources",
                    clearChatLabel: "Clear chat",
                    sendLabel: "Send",
                },
            },
        },
    },
    pl: {
        langMenuLabel: "Zmień język",
        sidebarMenuLabel: "Menu",
        skipToContentLabel: "Przejdź do treści",
        returnToTopLabel: "Wróć do góry",
        darkModeSwitchLabel: "Wygląd",
        lightModeSwitchTitle: "Przełącz na jasny motyw",
        darkModeSwitchTitle: "Przełącz na ciemny motyw",
        lastUpdatedText: "Ostatnia aktualizacja:",
        docFooter: { prev: "Poprzednia strona", next: "Następna strona" },
        search: {
            button: { buttonText: "Szukaj...", buttonAriaLabel: "Wyszukiwarka" },
            modal: {
                searchBox: { placeholder: "Szukaj w dokumentacji..." },
                loadingScreen: { loadingText: "Wczytywanie indeksu..." },
                errorScreen: { titleText: "Nie udało się wczytać indeksu wyszukiwania." },
                noResultsText: "Brak wyników dla",
                startScreen: { noRecentSearchesText: "Zacznij pisać, aby przeszukać całą dokumentację." },
                footer: { navigateText: "nawiguj", selectText: "otwórz", closeText: "zamknij" },
                searchingText: "Szukam...",
                resultsAriaLabel: "Wyniki wyszukiwania",
                ai: {
                    tabLabel: "Zapytaj AI",
                    placeholder: "Zadaj pytanie o dokumentację\u2026",
                    loadingText: "Myślę\u2026",
                    errorText: "Coś poszło nie tak. Spróbuj ponownie.",
                    startText: "Zapytaj mnie o cokolwiek z tej dokumentacji. Moje odpowiedzi bazują wyłącznie na dokumentacji.",
                    sourcesLabel: "Źródła",
                    clearChatLabel: "Wyczyść czat",
                    sendLabel: "Wyślij",
                },
            },
        },
    },
};

/** Returns built-in locale strings as a proper LocaleThemeConfig, with the
 *  search locale entry nested under the given localeKey. */
function getBuiltInThemeConfig(lang?: string, localeKey = "/"): LocaleThemeConfig {
    if (!lang) return {};
    const normalized = lang.toLowerCase();
    const base = normalized.split("-")[0];
    const data = BUILT_IN_LOCALE_STRINGS[normalized] ?? BUILT_IN_LOCALE_STRINGS[base];
    if (!data) return {};
    const { search, ...rest } = data;
    if (!search) return rest;
    return { ...rest, search: { locales: { [localeKey]: search } } };
}

/** Deep-merges `override` into `base` (explicit values win). Arrays are
 *  replaced wholesale; plain objects are merged recursively. */
function deepMerge<T>(base: T, override: T): T {
    if (override === undefined || override === null) return base;
    if (base === undefined || base === null) return override;
    if (typeof override !== "object" || typeof base !== "object") return override;
    if (Array.isArray(override) || Array.isArray(base)) {
        return (Array.isArray(override) ? override : base) as T;
    }
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(override as Record<string, unknown>)) {
        const ov = (override as Record<string, unknown>)[key];
        if (ov === undefined) continue;
        result[key] = deepMerge(result[key], ov);
    }
    return result as T;
}

function splitPathAndSuffix(raw: string): { path: string; suffix: string } {
    const value = String(raw || "").trim();
    const hashIndex = value.indexOf("#");
    const queryIndex = value.indexOf("?");
    const firstSuffixIndex =
        hashIndex === -1
            ? queryIndex
            : queryIndex === -1
              ? hashIndex
              : Math.min(hashIndex, queryIndex);

    if (firstSuffixIndex === -1) {
        return { path: value, suffix: "" };
    }

    return {
        path: value.slice(0, firstSuffixIndex),
        suffix: value.slice(firstSuffixIndex),
    };
}

function resolveThemeLink(
    rawLink: string,
    args: {
        baseSrcDir: string;
        localeSrcDir: string;
        localeSegment: string;
    },
): string {
    const value = String(rawLink || "").trim();
    if (!value) return value;
    if (EXTERNAL_LINK_RE.test(value)) return value;
    if (value.startsWith("#") || value.startsWith("?")) return value;

    const { path, suffix } = splitPathAndSuffix(value);
    if (!path) return suffix || value;

    const baseSrcDir = normalizeSrcDir(args.baseSrcDir);
    const localeSrcDir = normalizeSrcDir(args.localeSrcDir);
    const localeSegment = args.localeSegment
        ? normalizeSrcDir(args.localeSegment)
        : "";

    if (path === "/") return `${localeSrcDir}${suffix}`;

    if (path.startsWith(baseSrcDir + "/") || path === baseSrcDir) {
        return `${normalizeSrcDir(path)}${suffix}`;
    }

    if (
        localeSegment &&
        (path === localeSegment || path.startsWith(localeSegment + "/"))
    ) {
        return `${normalizeSrcDir(baseSrcDir + path)}${suffix}`;
    }

    if (path.startsWith("/")) {
        return `${normalizeSrcDir(localeSrcDir + path)}${suffix}`;
    }

    return `${normalizeSrcDir(`${localeSrcDir}/${path}`)}${suffix}`;
}

function normalizeTopNavLinks(
    nav: TopNavItem[],
    args: {
        baseSrcDir: string;
        localeSrcDir: string;
        localeSegment: string;
    },
): TopNavItem[] {
    return (nav ?? []).map((item) => ({
        ...item,
        link:
            typeof item.link === "string"
                ? resolveThemeLink(item.link, args)
                : item.link,
        items: item.items ? normalizeTopNavLinks(item.items, args) : item.items,
    }));
}

function normalizeSidebarLinks(
    sidebar: SidebarItem[],
    args: {
        baseSrcDir: string;
        localeSrcDir: string;
        localeSegment: string;
    },
): SidebarItem[] {
    return (sidebar ?? []).map((item) => ({
        ...item,
        link:
            typeof item.link === "string"
                ? resolveThemeLink(item.link, args)
                : item.link,
        items: item.items
            ? normalizeSidebarLinks(item.items, args)
            : item.items,
    }));
}

function resolveSearchLocaleConfig(
    themeConfig: LocaleThemeConfig,
    localeKey: string,
) {
    const localesMap = themeConfig.search?.locales ?? {};
    const normalized = normalizeLocaleKey(localeKey);
    const trimmed = normalized.replace(/^\/+|\/+$/g, "");
    const candidateKeys =
        normalized === "/"
            ? ["/", "root"]
            : [normalized, normalized.replace(/\/$/, ""), trimmed];

    for (const key of candidateKeys) {
        const value = localesMap[key];
        if (value) return value;
    }

    return undefined;
}

export function normalizeSrcDir(path: string): string {
    const value = String(path || "").trim();
    if (!value || value === "/") return "/";
    return "/" + value.replace(/^\/+|\/+$/g, "");
}

export function normalizeLocaleKey(key: string): string {
    const value = String(key || "").trim();
    if (!value || value === "root" || value === "/") return "/";
    const withSlashes = `/${value.replace(/^\/+|\/+$/g, "")}/`;
    return withSlashes === "//" ? "/" : withSlashes;
}

export function keyToLocaleSegment(key: string): string {
    const normalized = normalizeLocaleKey(key);
    if (normalized === "/") return "";
    return normalized.replace(/\/$/, "");
}

export function getLocaleEntries(
    baseSrcDir: string,
    locales: Record<string, LocaleConfig>,
): LocaleEntry[] {
    const base = normalizeSrcDir(baseSrcDir);
    const rawEntries = Object.entries(locales ?? {});
    if (!rawEntries.length) {
        return [{ key: "/", segment: "", srcDir: base, config: {} }];
    }

    return rawEntries.map(([key, config]) => {
        const segment = keyToLocaleSegment(key);
        const srcDir = normalizeSrcDir(segment ? `${base}${segment}` : base);
        return { key: normalizeLocaleKey(key), segment, srcDir, config };
    });
}

export function resolveLocaleForPath(
    activePath: string,
    baseSrcDir: string,
    locales: Record<string, LocaleConfig>,
    defaults: ResolveDefaults,
) {
    const cleanPath = normalizeSrcDir(activePath || "/");
    const normalizedBaseSrcDir = normalizeSrcDir(baseSrcDir);
    const entries = getLocaleEntries(baseSrcDir, locales);
    const matched =
        [...entries]
            .sort((a, b) => b.segment.length - a.segment.length)
            .find(
                (entry) =>
                    cleanPath === entry.srcDir ||
                    cleanPath.startsWith(entry.srcDir + "/") ||
                    (entry.segment && (
                        cleanPath === entry.segment ||
                        cleanPath.startsWith(entry.segment + "/")
                    )),
            ) ?? entries[0];

    const themeConfig = matched.config.themeConfig ?? {};
    const normalizedNav = normalizeTopNavLinks(themeConfig.nav ?? defaults.nav, {
        baseSrcDir: normalizedBaseSrcDir,
        localeSrcDir: matched.srcDir,
        localeSegment: matched.segment,
    });
    const normalizedSidebar = Array.isArray(themeConfig.sidebar ?? defaults.sidebar)
        ? normalizeSidebarLinks(
              (themeConfig.sidebar ?? defaults.sidebar) as SidebarItem[],
              {
                  baseSrcDir: normalizedBaseSrcDir,
                  localeSrcDir: matched.srcDir,
                  localeSegment: matched.segment,
              },
          )
        : (themeConfig.sidebar ?? defaults.sidebar);
    // Deep-merge built-in defaults under explicit themeConfig — explicit always wins.
    const builtInThemeConfig = getBuiltInThemeConfig(matched.config.lang, matched.key);
    const mergedThemeConfig = deepMerge(builtInThemeConfig, themeConfig);
    const searchLocale = resolveSearchLocaleConfig(mergedThemeConfig, matched.key);
    // Narrow to SearchLocaleModal so we can access Greg-specific extensions
    // (searchingText, resultsAriaLabel) without type errors.
    const modal = searchLocale?.modal as (SearchLocaleModal | undefined);
    return {
        key: matched.key,
        lang: matched.config.lang,
        dir: matched.config.dir,
        srcDir: matched.srcDir,
        allSrcDirs: entries.map((entry) => entry.srcDir),
        mainTitle: matched.config.title ?? defaults.mainTitle,
        nav: normalizedNav,
        sidebar: normalizedSidebar,
        outline: mergedThemeConfig.outline ?? defaults.outline,
        lastUpdatedText: mergedThemeConfig.lastUpdatedText,
        langMenuLabel: mergedThemeConfig.langMenuLabel ?? defaults.langMenuLabel,
        sidebarMenuLabel: mergedThemeConfig.sidebarMenuLabel ?? defaults.sidebarMenuLabel,
        skipToContentLabel: mergedThemeConfig.skipToContentLabel ?? defaults.skipToContentLabel,
        returnToTopLabel: mergedThemeConfig.returnToTopLabel ?? defaults.returnToTopLabel,
        darkModeSwitchLabel: mergedThemeConfig.darkModeSwitchLabel ?? defaults.darkModeSwitchLabel,
        lightModeSwitchTitle: mergedThemeConfig.lightModeSwitchTitle ?? defaults.lightModeSwitchTitle,
        darkModeSwitchTitle: mergedThemeConfig.darkModeSwitchTitle ?? defaults.darkModeSwitchTitle,
        docFooter: mergedThemeConfig.docFooter ?? defaults.docFooter,
        siteTitle: mergedThemeConfig.siteTitle ?? defaults.siteTitle,
        logo: mergedThemeConfig.logo ?? defaults.logo,
        socialLinks: mergedThemeConfig.socialLinks ?? defaults.socialLinks,
        editLink: mergedThemeConfig.editLink ?? defaults.editLink,
        footer: mergedThemeConfig.footer ?? defaults.footer,
        aside: mergedThemeConfig.aside ?? defaults.aside,
        lastUpdated: mergedThemeConfig.lastUpdated ?? defaults.lastUpdated,
        externalLinkIcon: mergedThemeConfig.externalLinkIcon ?? defaults.externalLinkIcon,
        searchButtonLabel: searchLocale?.button?.buttonText ?? defaults.searchButtonLabel,
        searchModalLabel: searchLocale?.button?.buttonAriaLabel ?? defaults.searchModalLabel,
        searchPlaceholder: modal?.searchBox?.placeholder ?? defaults.searchPlaceholder,
        searchLoadingText: modal?.loadingScreen?.loadingText ?? defaults.searchLoadingText,
        searchErrorText: modal?.errorScreen?.titleText ?? defaults.searchErrorText,
        searchSearchingText: modal?.searchingText ?? defaults.searchSearchingText,
        searchNoResultsText: modal?.noResultsText ?? defaults.searchNoResultsText,
        searchStartText: modal?.startScreen?.noRecentSearchesText ?? defaults.searchStartText,
        searchResultsAriaLabel: modal?.resultsAriaLabel ?? defaults.searchResultsAriaLabel,
        searchNavigateText: modal?.footer?.navigateText ?? defaults.searchNavigateText,
        searchSelectText: modal?.footer?.selectText ?? defaults.searchSelectText,
        searchCloseText: modal?.footer?.closeText ?? defaults.searchCloseText,
        aiTabLabel: modal?.ai?.tabLabel ?? defaults.aiTabLabel,
        aiPlaceholder: modal?.ai?.placeholder ?? defaults.aiPlaceholder,
        aiLoadingText: modal?.ai?.loadingText ?? defaults.aiLoadingText,
        aiErrorText: modal?.ai?.errorText ?? defaults.aiErrorText,
        aiStartText: modal?.ai?.startText ?? defaults.aiStartText,
        aiSourcesLabel: modal?.ai?.sourcesLabel ?? defaults.aiSourcesLabel,
        aiClearChatLabel: modal?.ai?.clearChatLabel ?? defaults.aiClearChatLabel,
        aiSendLabel: modal?.ai?.sendLabel ?? defaults.aiSendLabel,
        entries,
    };
}

function hasMarkdownForPath(
    frontmatters: Record<string, unknown>,
    srcDir: string,
    routePath: string,
): boolean {
    const rel = routePath.replace(srcDir, "").replace(/^\//, "");
    const candidates = rel
        ? (srcDir === "/"
            ? [`/${rel}.md`, `/${rel}/index.md`]
            : [`${srcDir}/${rel}.md`, `${srcDir}/${rel}/index.md`])
        : (srcDir === "/"
            ? [`/index.md`]
            : [`${srcDir}/index.md`, `${srcDir}index.md`]);
    return candidates.some((candidate) => candidate in frontmatters);
}

function getLocaleLabel(entry: LocaleEntry): string {
    if (entry.config.label) return entry.config.label;
    if (entry.config.lang) return entry.config.lang;
    if (entry.key === "/") return "Default";
    return entry.key.replace(/^\/+|\/+$/g, "").toUpperCase();
}

export function getLocaleSwitchItems(args: {
    entries: LocaleEntry[];
    activePath: string;
    activeSrcDir: string;
    activeLocaleKey: string;
    frontmatters: Record<string, unknown>;
    preservePath?: boolean;
}) {
    const {
        entries,
        activePath,
        activeSrcDir,
        activeLocaleKey,
        frontmatters,
        preservePath = true,
    } = args;
    if (entries.length <= 1) return [];

    const EXTERNAL_LINK_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

    const relPath =
        preservePath &&
        (activePath === activeSrcDir ||
            (activeSrcDir === "/"
                ? activePath.startsWith("/")
                : activePath.startsWith(activeSrcDir + "/")))
            ? (activeSrcDir === "/"
                ? (activePath === "/" ? "" : activePath)
                : activePath.slice(activeSrcDir.length))
            : "";

    return entries.map((entry) => {
        const mappedPath = normalizeSrcDir(entry.srcDir + relPath);
        const localeLink =
            typeof entry.config.link === "string"
                ? entry.config.link.trim()
                : "";

        let link: string = localeLink
            ? EXTERNAL_LINK_RE.test(localeLink)
                ? localeLink
                : normalizeSrcDir(localeLink)
            : hasMarkdownForPath(frontmatters, entry.srcDir, mappedPath)
              ? mappedPath
              : entry.srcDir;
        // For non-root locales without an explicit link, strip the docsBase prefix
        // so the language switcher navigates to the locale-segment root (e.g. '/pl')
        // rather than the docsBase-prefixed path (e.g. '/documentation/pl').
        if (!localeLink && entry.segment) {
            const base = entry.srcDir.slice(0, entry.srcDir.length - entry.segment.length);
            if (base && (link === base || link.startsWith(base + "/"))) {
                link = link.slice(base.length) || "/";
            }
        }
        return {
            key: entry.key,
            label: getLocaleLabel(entry),
            link,
            active: entry.key === activeLocaleKey,
        };
    });
}
