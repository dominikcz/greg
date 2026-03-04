<script lang="ts">
import type { Snippet } from 'svelte';
import DocsNavigation from './DocsNavigation.svelte';
import DocsSiteHeader from './DocsSiteHeader.svelte';
import SearchModal from './SearchModal.svelte';
import Spinner from './../spinner/spinner.svelte';
import { prepareMenu, flattenMenu } from './docsUtils';
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

type CarbonAdsOptions = {
code: string;
placement: string;
};

type OutlineLevel = false | number | [number, number] | 'deep';
type OutlineOption = OutlineLevel | { level?: OutlineLevel; label?: string };

type Props = {
rootPath: string;
children?: Snippet;
version: string;
mainTitle?: string;
carbonAds?: CarbonAdsOptions;
/** VitePress-compatible outline option. false = disabled, [2,3] = default. */
outline?: OutlineOption;
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
};

let { children, rootPath = '/docs', version = '', mainTitle = 'Greg', carbonAds, outline = [2, 3], mermaidTheme, mermaidThemes }: Props = $props();

// -- Outline -----------------------------------------------------------------
const outlineNorm = $derived.by(() => {
if (outline === false) return null;
if (typeof outline === 'object' && !Array.isArray(outline) && ('level' in outline || 'label' in outline)) {
const o = outline as { level?: OutlineLevel; label?: string };
return { level: o.level ?? [2, 3] as [number, number], label: o.label ?? 'On this page' };
}
return { level: outline as OutlineLevel, label: 'On this page' };
});

let mainEl = $state<HTMLElement | undefined>(undefined);

// -- Modules -----------------------------------------------------------------
// Frontmatter parsed from raw YAML by vitePluginFrontmatter (virtual module).
// Keyed by Vite-style absolute paths, e.g. '/docs/guide/index.md'.
// Used as the known-paths set for routing (no glob/import needed).
type FrontmatterEntry = {
    title?: string; order?: number; layout?: 'doc' | 'home' | 'page';
    hero?: Record<string, unknown>; features?: unknown[];
};
const frontmatters = allFrontmatters as Record<string, FrontmatterEntry>;

let menu = $derived(prepareMenu(frontmatters, rootPath, frontmatters));
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
let searchOpen = $state(false);

$effect(() => {
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
const activeLayout = $derived<'doc' | 'home' | 'page'>(
    activeFrontmatter?.layout ?? 'doc'
);

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
    <MarkdownRenderer {markdown} baseUrl={router.activeMarkdownPath} docsPrefix={rootPath} {mermaidTheme} {mermaidThemes} colorTheme={theme} />
{:catch}
    <p class="fetch-error">Could not load page.</p>
{/await}
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
/>
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
</style>