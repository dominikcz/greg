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
    rootPath: string;
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
};

const EXTERNAL_LINK_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

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
        baseRootPath: string;
        localeRootPath: string;
        localeSegment: string;
    },
): string {
    const value = String(rawLink || "").trim();
    if (!value) return value;
    if (EXTERNAL_LINK_RE.test(value)) return value;
    if (value.startsWith("#") || value.startsWith("?")) return value;

    const { path, suffix } = splitPathAndSuffix(value);
    if (!path) return suffix || value;

    const baseRootPath = normalizeRootPath(args.baseRootPath);
    const localeRootPath = normalizeRootPath(args.localeRootPath);
    const localeSegment = args.localeSegment
        ? normalizeRootPath(args.localeSegment)
        : "";

    if (path === "/") return `${localeRootPath}${suffix}`;

    if (path.startsWith(baseRootPath + "/") || path === baseRootPath) {
        return `${normalizeRootPath(path)}${suffix}`;
    }

    if (
        localeSegment &&
        (path === localeSegment || path.startsWith(localeSegment + "/"))
    ) {
        return `${normalizeRootPath(baseRootPath + path)}${suffix}`;
    }

    if (path.startsWith("/")) {
        return `${normalizeRootPath(localeRootPath + path)}${suffix}`;
    }

    return `${normalizeRootPath(`${localeRootPath}/${path}`)}${suffix}`;
}

function normalizeTopNavLinks(
    nav: TopNavItem[],
    args: {
        baseRootPath: string;
        localeRootPath: string;
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
        baseRootPath: string;
        localeRootPath: string;
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

export function normalizeRootPath(path: string): string {
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
    baseRootPath: string,
    locales: Record<string, LocaleConfig>,
): LocaleEntry[] {
    const base = normalizeRootPath(baseRootPath);
    const rawEntries = Object.entries(locales ?? {});
    if (!rawEntries.length) {
        return [{ key: "/", segment: "", rootPath: base, config: {} }];
    }

    return rawEntries.map(([key, config]) => {
        const segment = keyToLocaleSegment(key);
        const rootPath = normalizeRootPath(segment ? `${base}${segment}` : base);
        return { key: normalizeLocaleKey(key), segment, rootPath, config };
    });
}

export function resolveLocaleForPath(
    activePath: string,
    baseRootPath: string,
    locales: Record<string, LocaleConfig>,
    defaults: ResolveDefaults,
) {
    const cleanPath = normalizeRootPath(activePath || "/");
    const normalizedBaseRootPath = normalizeRootPath(baseRootPath);
    const entries = getLocaleEntries(baseRootPath, locales);
    const matched =
        [...entries]
            .sort((a, b) => b.segment.length - a.segment.length)
            .find(
                (entry) =>
                    cleanPath === entry.rootPath ||
                    cleanPath.startsWith(entry.rootPath + "/"),
            ) ?? entries[0];

    const themeConfig = matched.config.themeConfig ?? {};
    const normalizedNav = normalizeTopNavLinks(themeConfig.nav ?? defaults.nav, {
        baseRootPath: normalizedBaseRootPath,
        localeRootPath: matched.rootPath,
        localeSegment: matched.segment,
    });
    const normalizedSidebar = Array.isArray(themeConfig.sidebar ?? defaults.sidebar)
        ? normalizeSidebarLinks(
              (themeConfig.sidebar ?? defaults.sidebar) as SidebarItem[],
              {
                  baseRootPath: normalizedBaseRootPath,
                  localeRootPath: matched.rootPath,
                  localeSegment: matched.segment,
              },
          )
        : (themeConfig.sidebar ?? defaults.sidebar);
    const searchLocale = resolveSearchLocaleConfig(themeConfig, matched.key);
    return {
        key: matched.key,
        lang: matched.config.lang,
        dir: matched.config.dir,
        rootPath: matched.rootPath,
        allRootPaths: entries.map((entry) => entry.rootPath),
        mainTitle: matched.config.title ?? defaults.mainTitle,
        nav: normalizedNav,
        sidebar: normalizedSidebar,
        outline: themeConfig.outline ?? defaults.outline,
        lastUpdatedText: themeConfig.lastUpdatedText,
        langMenuLabel: themeConfig.langMenuLabel ?? defaults.langMenuLabel,
        sidebarMenuLabel:
            themeConfig.sidebarMenuLabel ?? defaults.sidebarMenuLabel,
        skipToContentLabel:
            themeConfig.skipToContentLabel ?? defaults.skipToContentLabel,
        returnToTopLabel:
            themeConfig.returnToTopLabel ?? defaults.returnToTopLabel,
        darkModeSwitchLabel:
            themeConfig.darkModeSwitchLabel ?? defaults.darkModeSwitchLabel,
        lightModeSwitchTitle:
            themeConfig.lightModeSwitchTitle ?? defaults.lightModeSwitchTitle,
        darkModeSwitchTitle:
            themeConfig.darkModeSwitchTitle ?? defaults.darkModeSwitchTitle,
        docFooter: themeConfig.docFooter ?? defaults.docFooter,
        siteTitle: themeConfig.siteTitle ?? defaults.siteTitle,
        logo: themeConfig.logo ?? defaults.logo,
        socialLinks: themeConfig.socialLinks ?? defaults.socialLinks,
        editLink: themeConfig.editLink ?? defaults.editLink,
        footer: themeConfig.footer ?? defaults.footer,
        aside: themeConfig.aside ?? defaults.aside,
        lastUpdated: themeConfig.lastUpdated ?? defaults.lastUpdated,
        externalLinkIcon:
            themeConfig.externalLinkIcon ?? defaults.externalLinkIcon,
        searchButtonLabel:
            searchLocale?.button?.buttonText ??
            defaults.searchButtonLabel,
        searchModalLabel:
            searchLocale?.button?.buttonAriaLabel ??
            defaults.searchModalLabel,
        searchPlaceholder:
            searchLocale?.modal?.searchBox?.placeholder ??
            defaults.searchPlaceholder,
        searchLoadingText:
            searchLocale?.modal?.loadingScreen?.loadingText ??
            defaults.searchLoadingText,
        searchErrorText:
            searchLocale?.modal?.errorScreen?.titleText ??
            defaults.searchErrorText,
        searchSearchingText:
            defaults.searchSearchingText,
        searchNoResultsText:
            searchLocale?.modal?.noResultsText ??
            defaults.searchNoResultsText,
        searchStartText:
            searchLocale?.modal?.startScreen?.noRecentSearchesText ??
            defaults.searchStartText,
        searchResultsAriaLabel:
            defaults.searchResultsAriaLabel,
        searchNavigateText:
            searchLocale?.modal?.footer?.navigateText ??
            defaults.searchNavigateText,
        searchSelectText:
            searchLocale?.modal?.footer?.selectText ??
            defaults.searchSelectText,
        searchCloseText:
            searchLocale?.modal?.footer?.closeText ??
            defaults.searchCloseText,
        entries,
    };
}

function hasMarkdownForPath(
    frontmatters: Record<string, unknown>,
    rootPath: string,
    routePath: string,
): boolean {
    const rel = routePath.replace(rootPath, "").replace(/^\//, "");
    const candidates = rel
        ? [`${rootPath}/${rel}.md`, `${rootPath}/${rel}/index.md`]
        : [`${rootPath}/index.md`, `${rootPath}index.md`];
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
    activeRootPath: string;
    activeLocaleKey: string;
    frontmatters: Record<string, unknown>;
    preservePath?: boolean;
}) {
    const {
        entries,
        activePath,
        activeRootPath,
        activeLocaleKey,
        frontmatters,
        preservePath = true,
    } = args;
    if (entries.length <= 1) return [];

    const EXTERNAL_LINK_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

    const relPath =
        preservePath &&
        (activePath === activeRootPath ||
            activePath.startsWith(activeRootPath + "/"))
            ? activePath.slice(activeRootPath.length)
            : "";

    return entries.map((entry) => {
        const mappedPath = normalizeRootPath(entry.rootPath + relPath);
        const localeLink =
            typeof entry.config.link === "string"
                ? entry.config.link.trim()
                : "";

        const link = localeLink
            ? EXTERNAL_LINK_RE.test(localeLink)
                ? localeLink
                : normalizeRootPath(localeLink)
            : hasMarkdownForPath(frontmatters, entry.rootPath, mappedPath)
              ? mappedPath
              : entry.rootPath;
        return {
            key: entry.key,
            label: getLocaleLabel(entry),
            link,
            active: entry.key === activeLocaleKey,
        };
    });
}
