<script lang="ts">
import type { Snippet } from 'svelte';
import DocsNavigation from './DocsNavigation.svelte';
import DocsSiteHeader from './DocsSiteHeader.svelte';
import SearchModal from './SearchModal.svelte';
import Spinner from './../spinner/spinner.svelte';
import { prepareMenu, flattenMenu, getPrevNext, getBreadcrumbItems, parseSidebarConfig } from './docsUtils';
import 'github-markdown-css';
import './../scss/markdownDocs.scss';
import { setPortalsContext } from './../portal';
import CarbonAds from '../components/CarbonAds.svelte';
import Outline from './Outline.svelte';
import { useRouter } from './useRouter.svelte';
import { useSplitter } from './useSplitter.svelte';
import { handleCodeGroupClick, handleCodeGroupKeydown } from './codeGroup';
import allFrontmatters from 'virtual:greg-frontmatter';
import MarkdownRenderer from './MarkdownRenderer.svelte';
import LayoutHome from './layouts/LayoutHome.svelte';
import BackToTop from './BackToTop.svelte';
import Breadcrumb from './Breadcrumb.svelte';
import PrevNext from './PrevNext.svelte';
import gregConfig from 'virtual:greg-config';

type CarbonAdsOptions = {
code: string;
placement: string;
};

type OutlineLevel = false | number | [number, number] | 'deep';
type OutlineOption = OutlineLevel | { level?: OutlineLevel; label?: string };

type BadgeSpec = string | { text: string; type?: string };
type SidebarItem = { text: string; link?: string; items?: SidebarItem[]; auto?: string; badge?: BadgeSpec };

type Props = {
rootPath?: string;
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
 * `true`  – uses default format `{ dateStyle: 'medium' }` and browser locale.
 * Object  – `{ text?, locale?, formatOptions? }` for full control.
 */
lastModified?: boolean | { text?: string; locale?: string; formatOptions?: Intl.DateTimeFormatOptions };
/**
 * Sidebar tree configuration.
 * `'auto'` (default) — generated from the docs folder structure.
 * Pass an array of `SidebarItem` objects to define the sidebar manually;
 * items with an `auto` path have their children auto-generated.
 */
sidebar?: 'auto' | SidebarItem[];
/** Top navigation bar items. */
		nav?: { text: string; link?: string; target?: string; items?: { text: string; link?: string; target?: string; items?: { text: string; link?: string; target?: string }[] }[] }[];
/**
 * Custom search provider.
 * `(query: string, limit?: number) => Promise<SearchResult[]>`
 * Overrides greg.config.js › search.provider when set.
 * The function must return objects matching the SearchResult shape:
 * { id, title, titleHtml, sectionTitle, sectionAnchor, excerptHtml, score }
 */
searchProvider?: (query: string, limit?: number) => Promise<any[]>;
};

let { children, rootPath = (gregConfig as any).rootPath ?? '/docs', version = (gregConfig as any).version ?? '', mainTitle = (gregConfig as any).mainTitle ?? 'Greg', carbonAds = (gregConfig as any).carbonAds, outline = (gregConfig as any).outline ?? [2, 3] as [number, number], mermaidTheme = (gregConfig as any).mermaidTheme, mermaidThemes, breadcrumb = (gregConfig as any).breadcrumb ?? false, backToTop = (gregConfig as any).backToTop ?? false, lastModified = (gregConfig as any).lastModified ?? false, sidebar = (gregConfig as any).sidebar ?? 'auto', nav = (gregConfig as any).nav ?? [], searchProvider }: Props = $props();

// -- Outline -----------------------------------------------------------------
function normalizeOutline(o: OutlineOption | boolean | undefined | null): { level: OutlineLevel; label: string } | null {
    if (o === false || o === null || o === undefined) return null;
    if (o === true) return { level: [2, 3] as [number, number], label: 'On this page' };
    if (typeof o === 'object' && !Array.isArray(o) && ('level' in o || 'label' in o)) {
        const oo = o as { level?: OutlineLevel; label?: string };
        return { level: oo.level ?? [2, 3] as [number, number], label: oo.label ?? 'On this page' };
    }
    return { level: o as OutlineLevel, label: 'On this page' };
}

const globalOutlineNorm = $derived(normalizeOutline(outline));

let mainEl = $state<HTMLElement | undefined>(undefined);

// -- Modules -----------------------------------------------------------------
// Frontmatter parsed from raw YAML by vitePluginFrontmatter (virtual module).
// Keyed by Vite-style absolute paths, e.g. '/docs/guide/index.md'.
// Used as the known-paths set for routing (no glob/import needed).
type FrontmatterEntry = {
    title?: string;
    order?: number;
    layout?: 'doc' | 'home' | 'page';
    hero?: Record<string, unknown>;
    features?: unknown[];
    outline?: OutlineOption | boolean;
    badge?: BadgeSpec;
    prev?: false | { text: string; link: string };
    next?: false | { text: string; link: string };
    _mtime?: string;
};
const frontmatters = allFrontmatters as Record<string, FrontmatterEntry>;

let menu = $derived(
    Array.isArray(sidebar)
        ? (parseSidebarConfig(sidebar, frontmatters, rootPath) ?? prepareMenu(frontmatters, rootPath, frontmatters))
        : prepareMenu(frontmatters, rootPath, frontmatters)
);
let flat = $derived(flattenMenu(menu));

// -- Theme -------------------------------------------------------------------
function getSystemTheme(): 'light' | 'dark' {
return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
let theme = $state<'light' | 'dark'>(
(localStorage.getItem('greg-theme') as 'light' | 'dark') ?? getSystemTheme()
);
$effect(() => { localStorage.setItem('greg-theme', theme); });

// -- Search ------------------------------------------------------------------
const searchEnabled = (gregConfig as any)?.search?.provider !== 'none';
let searchOpen = $state(false);

$effect(() => {
    if (!searchEnabled) return;
function handleGlobalKeydown(e: KeyboardEvent) {
if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
e.preventDefault();
searchOpen = true;
}
}
window.addEventListener('keydown', handleGlobalKeydown);
return () => window.removeEventListener('keydown', handleGlobalKeydown);
});

// -- Router ------------------------------------------------------------------
const router = useRouter(frontmatters, () => rootPath);

const title = $derived(router.title(flat));

// -- Content fetch -----------------------------------------------------------
async function fetchMarkdown(mdPath: string): Promise<string> {
    const res = await fetch(mdPath);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${mdPath}`);
    return res.text();
}

// -- Layout ------------------------------------------------------------------
// Resolve the key of the active page in the frontmatter map so we can read
// `layout` (and any other fields) without loading the full module.
const activeKey = $derived.by(() => {
    const rel = router.active.replace(rootPath, '').replace(/^\//, '');
    const candidates: string[] = rel
        ? [`${rootPath}/${rel}.md`, `${rootPath}/${rel}/index.md`]
        : [`${rootPath}/index.md`, `${rootPath}index.md`];
    return candidates.find(c => c in frontmatters) ?? null;
});

const activeFrontmatter = $derived(activeKey ? frontmatters[activeKey] : undefined);
/** True when the URL is inside rootPath but no matching file exists. */
const notFound = $derived(activeKey === null && router.active.startsWith(rootPath));
const activeLayout = $derived<'doc' | 'home' | 'page'>(
    activeFrontmatter?.layout ?? 'doc'
);

/** Page-level outline: reads `outline` from active page frontmatter, falls back to global setting. */
const outlineNorm = $derived(
    activeFrontmatter?.outline !== undefined
        ? normalizeOutline(activeFrontmatter.outline as OutlineOption | boolean)
        : globalOutlineNorm,
);

/** Auto prev/next from sidebar order; overridable per-page via frontmatter. */
const prevNextAuto = $derived(getPrevNext(router.active, flat));
const prevNext = $derived({
    prev: activeFrontmatter?.prev === false ? null
        : (activeFrontmatter?.prev && typeof activeFrontmatter.prev === 'object'
            ? { label: activeFrontmatter.prev.text, link: activeFrontmatter.prev.link }
            : prevNextAuto.prev),
    next: activeFrontmatter?.next === false ? null
        : (activeFrontmatter?.next && typeof activeFrontmatter.next === 'object'
            ? { label: activeFrontmatter.next.text, link: activeFrontmatter.next.link }
            : prevNextAuto.next),
});

/** Breadcrumb path from root to active page. */
const breadcrumbItems = $derived(getBreadcrumbItems(router.active, menu));

/** Whether the left nav sidebar should be visible. */
const showSidebar = $derived(activeLayout === 'doc');
/** Whether the right outline / ads aside should be visible. */
const showOutline  = $derived(activeLayout === 'doc');

// -- Splitter ----------------------------------------------------------------
const sp = useSplitter();

setPortalsContext();

// -- Internal links ----------------------------------------------------------
const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/{2})/i;

function handleInternalLinks(event: MouseEvent) {
const anchor = (event.target as HTMLElement | null)?.closest('a');
if (!anchor) return;

const href = anchor.getAttribute('href');
if (!href || EXTERNAL_RE.test(href) || anchor.target) return;

if (href.startsWith('#')) {
event.preventDefault();
document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
return;
}

const hashIdx  = href.indexOf('#');
const pathPart = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
const hashPart = hashIdx >= 0 ? href.slice(hashIdx + 1) : '';

let resolvedPath: string;
if (pathPart.startsWith('/')) {
resolvedPath = pathPart;
} else {
try {
resolvedPath = new URL(pathPart, window.location.origin + router.active).pathname;
} catch {
return;
}
}

resolvedPath = resolvedPath.replace(/\.(md|html)$/i, '');
resolvedPath = resolvedPath.replace(/\/index$/, '') || rootPath;

event.preventDefault();
router.navigateWithAnchor(resolvedPath, hashPart || undefined);
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div class="catalog" data-theme={theme} onmousemove={sp.onMouseMove} onmouseup={sp.onMouseUp} onclick={handleCodeGroupClick} onkeydown={handleCodeGroupKeydown}>
<DocsSiteHeader
{rootPath}
{mainTitle}
{version}
{nav}
{theme}
onThemeChange={(t) => (theme = t)}
navigate={router.navigate}
onOpenSearch={() => (searchOpen = true)}
/>

<div class="catalog-body">
{#if showSidebar}
<aside bind:this={sp.aside}>
<DocsNavigation menu={menu} {rootPath} active={router.active} navigate={router.navigate} />
</aside>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div class="splitter" bind:this={sp.splitter} onmousedown={sp.onMouseDown}></div>
{/if}
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<main
bind:this={mainEl}
class:layout-home={activeLayout === 'home'}
class:layout-page={activeLayout === 'page'}
onclick={handleInternalLinks}
>
{#if activeLayout === 'home'}
<LayoutHome
    hero={(activeFrontmatter as any)?.hero}
    features={(activeFrontmatter as any)?.features}
/>
{:else if router.activeMarkdownPath}
{#await fetchMarkdown(router.activeMarkdownPath)}
<div class="spinner-wrap">
<Spinner />
</div>
{:then markdown}
    {#if breadcrumb}
        <Breadcrumb items={breadcrumbItems} navigate={router.navigate} {rootPath} />
    {/if}
    <MarkdownRenderer {markdown} baseUrl={router.activeMarkdownPath} docsPrefix={rootPath} {mermaidTheme} {mermaidThemes} colorTheme={theme} />
    {#if lastModified && activeFrontmatter?._mtime}
        {@const lmLabel  = (typeof lastModified === 'object' ? lastModified.text : null) ?? 'Last updated:'}
        {@const lmFmt    = (typeof lastModified === 'object' ? lastModified.formatOptions : null) ?? { dateStyle: 'medium' as const }}
        {@const lmLocale = (typeof lastModified === 'object' ? lastModified.locale : null) ?? navigator.language}
        <p class="doc-last-modified">{lmLabel} {new Intl.DateTimeFormat(lmLocale, lmFmt).format(new Date(activeFrontmatter._mtime))}</p>
    {/if}
    {#if activeLayout === 'doc'}
        <PrevNext prev={prevNext.prev} next={prevNext.next} navigate={router.navigate} />
    {/if}
{:catch}
    <p class="fetch-error">Could not load page.</p>
{/await}
{:else if notFound}
<div class="not-found">
    <p class="not-found-code">404</p>
    <h1>Strona nie znaleziona</h1>
    <p class="not-found-path"><code>{router.active}</code></p>
    <!-- svelte-ignore a11y_invalid_attribute -->
    <a href={rootPath} onclick={(e) => { e.preventDefault(); router.navigate(rootPath); }}>Wróć do dokumentacji</a>
</div>
{:else if title}
<h1>{title}</h1>
{@render children?.()}
{/if}
</main>
<aside class="greg-aside-outline" class:hidden={(!outlineNorm && !carbonAds) || !showOutline}>
{#if outlineNorm && showOutline}
<Outline
container={mainEl}
level={outlineNorm.level}
label={outlineNorm.label}
active={router.active}
/>
{/if}
{#if carbonAds && showOutline}
<CarbonAds
code={carbonAds.code}
placement={carbonAds.placement}
active={router.active}
/>
{/if}
</aside>
</div>
<SearchModal
bind:open={searchOpen}
onClose={() => (searchOpen = false)}
onNavigate={router.navigateWithAnchor}
{searchProvider}
/>
{#if backToTop}
<BackToTop target={mainEl} />
{/if}
</div>

<style lang="scss">
.catalog {
display: flex;
flex-flow: column nowrap;
background-color: var(--greg-background);
color: var(--greg-color);
height: 100vh;
overflow: hidden;
}

/* -- Body layout ---------------------------------------------------------- */
.catalog-body {
display: flex;
flex-flow: row nowrap;
flex: 1;
overflow: hidden;
width: 100%
}

.splitter {
background-color: var(--greg-border-color);
width: 1px;
cursor: col-resize;
flex-shrink: 0;
user-select: none;
transition: background-color 0.15s;

&:hover {
background-color: var(--greg-accent);
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
border-right: 1px solid var(--greg-border-color);

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
        &:hover { text-decoration: underline; }
    }
}
</style>