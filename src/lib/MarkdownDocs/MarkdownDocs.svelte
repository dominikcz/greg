<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import DocsNavigation from './DocsNavigation.svelte';
	import SearchModal from './SearchModal.svelte';
	import Spinner from './../spinner/spinner.svelte';
	import { prepareMenu, flattenMenu, getBreadcrumb } from './docsUtils';
	import 'github-markdown-css';
	import './../scss/markdownDocs.scss';
	import { setPortalsContext } from './../portal';
	import { Sun, Moon } from '@lucide/svelte';
	import CarbonAds from '../components/CarbonAds.svelte';
	import Outline from './Outline.svelte';

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
	};

	let { children, rootPath = '/docs', version = '', mainTitle = "Greg", carbonAds, outline = [2, 3] }: Props = $props();

	// Resolve outline to { level, label } shape
	const outlineNorm = $derived.by(() => {
		if (outline === false) return null;
		if (typeof outline === 'object' && !Array.isArray(outline) && ('level' in outline || 'label' in outline)) {
			const o = outline as { level?: OutlineLevel; label?: string };
			return { level: o.level ?? [2, 3] as [number, number], label: o.label ?? 'On this page' };
		}
		return { level: outline as OutlineLevel, label: 'On this page' };
	});

	let mainEl = $state<HTMLElement | undefined>(undefined);

	const allModules = import.meta.glob('/docs/**/*.md');
	// Filter out partials (files starting with __)
	const modules = Object.fromEntries(
		Object.entries(allModules).filter(([k]) => !k.split('/').pop()!.startsWith('__'))
	);

	let menu = $derived(prepareMenu(modules, rootPath));
	let flat = $derived(flattenMenu(menu));

	// Theme toggle
	function getSystemTheme(): 'light' | 'dark' {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	let theme = $state<'light' | 'dark'>(
		(localStorage.getItem('greg-theme') as 'light' | 'dark') ?? getSystemTheme()
	);
	$effect(() => { localStorage.setItem('greg-theme', theme); });

	// Full-text search modal
	let searchOpen = $state(false);

	function openSearch() { searchOpen = true; }
	function closeSearch() { searchOpen = false; }

	function navigateFromSearch(path: string, anchor?: string) {
		navigate(path);
		if (anchor) {
			tick().then(() => setTimeout(() => {
				document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 120));
		}
	}

	// SPA routing — aktualizowany przez navigate() i popstate
	let active = $state(decodeURI(window.location.pathname));

	function navigate(path: string) {
		if (decodeURI(window.location.pathname) === path) return;
		history.pushState(null, '', path);
		active = path;
	}

	function handlePopState() {
		active = decodeURI(window.location.pathname);
	}

	// resolve the module key for the current path
	// active = e.g. '/docs/folder1/test' or '/docs/folder1' or '/docs'
	let activeModule = $derived.by(() => {
		const rel = active.replace(rootPath, '').replace(/^\//, '');
		const candidates = rel
			? [
				`${rootPath}/${rel}.md`,
				`${rootPath}/${rel}/index.md`,
			]
			: [
				`${rootPath}/index.md`,
				`${rootPath}index.md`,
			];
		for (const c of candidates) {
			if (modules[c]) return modules[c];
		}
		return null;
	});

	let isMarkdown = $derived.by(() => {
		const m = flat.find((x: any) => x.link === active);
		return m ? m.type === 'md' : true;
	});

	let title = $derived(getBreadcrumb(active, flat));

	let aside = $state<HTMLElement | undefined>(undefined);
	let splitter = $state<HTMLElement | undefined>(undefined);
	let dragging = false;

	setPortalsContext();

	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			openSearch();
		}
	}

	$effect(() => {
		window.addEventListener('popstate', handlePopState);
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => {
			window.removeEventListener('popstate', handlePopState);
			window.removeEventListener('keydown', handleGlobalKeydown);
		};
	});

	function hndMouseDown() {
		dragging = true;
	}

	function hndMouseMove(e: MouseEvent) {
		if (!dragging || !aside || !splitter) return;
		aside.style.width = e.x - splitter.getBoundingClientRect().width / 2 + 'px';
		e.preventDefault();
	}

	function hndMouseUp() {
		dragging = false;
	}

	function handleCodeGroupClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const tab = target.closest('.rcg-tab');
		if (!(tab instanceof HTMLButtonElement)) return;

		const group = tab.closest('.rehype-code-group');
		if (!(group instanceof HTMLElement)) return;

		const tabs = Array.from(group.querySelectorAll('.rcg-tab'));
		const blocks = Array.from(group.querySelectorAll('.rcg-block'));
		const index = tabs.indexOf(tab);
		if (index < 0 || index >= blocks.length) return;

		tabs.forEach((item) => {
			item.classList.remove('active');
			item.setAttribute('aria-selected', 'false');
		});

		blocks.forEach((block) => {
			block.classList.remove('active');
			block.setAttribute('hidden', 'true');
		});

		tab.classList.add('active');
		tab.setAttribute('aria-selected', 'true');

		const activeBlock = blocks[index];
		activeBlock.classList.add('active');
		activeBlock.removeAttribute('hidden');
	}

	function handleCodeGroupKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (!target.closest('.rcg-tab')) return;
		event.preventDefault();
		handleCodeGroupClick(event as unknown as MouseEvent);
	}

	const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/{2})/i;

	/**
	 * Intercept clicks on <a> tags inside rendered markdown and perform
	 * SPA navigation consistent with VitePress routing rules:
	 *  - relative and absolute internal links → navigate()
	 *  - .md / .html extensions are stripped
	 *  - /path/index → /path (clean URLs)
	 *  - hash-only links (#anchor) → smooth-scroll without navigation
	 *  - external links are left to the browser
	 */
	function handleInternalLinks(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		const anchor = target?.closest('a');
		if (!anchor) return;

		const href = anchor.getAttribute('href');
		if (!href) return;

		// Leave external links and links with any explicit target to the browser
		// (VitePress: {target="_self"} forces a real page load for non-SPA pages)
		if (EXTERNAL_RE.test(href) || anchor.target) return;

		// Hash-only (#section): scroll within the current page
		if (href.startsWith('#')) {
			event.preventDefault();
			document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			return;
		}

		// Split path and hash fragment
		const hashIdx = href.indexOf('#');
		const pathPart = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
		const hashPart = hashIdx >= 0 ? href.slice(hashIdx + 1) : '';

		// Resolve path: absolute stays as-is, relative is resolved against the
		// current page URL so the browser's URL resolution logic handles ../
		let resolvedPath: string;
		if (pathPart.startsWith('/')) {
			resolvedPath = pathPart;
		} else {
			// Use URL API for correct relative-path resolution (handles ./ and ../)
			try {
				resolvedPath = new URL(pathPart, window.location.origin + active).pathname;
			} catch {
				return; // malformed URL, leave to browser
			}
		}

		// VitePress: strip .md and .html extensions
		resolvedPath = resolvedPath.replace(/\.(md|html)$/i, '');

		// VitePress: /path/index → /path (clean URLs for index files)
		resolvedPath = resolvedPath.replace(/\/index$/, '') || rootPath;

		event.preventDefault();
		navigate(resolvedPath);

		if (hashPart) {
			tick().then(() => setTimeout(() => {
				document.getElementById(hashPart)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 120));
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div class="catalog" data-theme={theme} onmousemove={hndMouseMove} onmouseup={hndMouseUp} onclick={handleCodeGroupClick} onkeydown={handleCodeGroupKeydown}>
	<header class="site-header">
		<div class="header-left">
			<a href={rootPath} class="site-title" onclick={(e) => { e.preventDefault(); navigate(rootPath); }}>
				<span class="site-logo" role="img" aria-label="Greg logo"></span>
				{mainTitle}
			</a>
			{#if version}
				<span class="version-badge">v{version}</span>
			{/if}
		</div>
		<div class="header-right">
			<div class="theme-group" role="group" aria-label="Color theme">
				<button
					class="theme-btn"
					class:active={theme === 'light'}
					onclick={() => theme = 'light'}
					type="button"
					aria-label="Light mode"
					aria-pressed={theme === 'light'}
				><Sun size={15} /></button>
				<button
					class="theme-btn"
					class:active={theme === 'dark'}
					onclick={() => theme = 'dark'}
					type="button"
					aria-label="Dark mode"
					aria-pressed={theme === 'dark'}
				><Moon size={15} /></button>
			</div>
			<button class="search-trigger" onclick={openSearch} type="button">
				<svg class="search-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
				<span class="search-trigger-label">Search…</span>
				<span class="search-trigger-hint"><kbd>Ctrl</kbd><kbd>K</kbd></span>
			</button>
		</div>
	</header>

	<div class="catalog-body">
		<aside bind:this={aside}>
			<DocsNavigation menu={menu} {rootPath} {active} {navigate} />
		</aside>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
		<div class="splitter" bind:this={splitter} onmousedown={hndMouseDown}></div>
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
		<main bind:this={mainEl} class:markdown-body={isMarkdown} onclick={handleInternalLinks}>
			{#if activeModule}
				{#await activeModule()}
					<div class="spinner-wrap">
						<Spinner />
					</div>
				{:then mod}
					{@const MdComponent = (mod as any).default}
					<MdComponent />
				{/await}
			{:else if title}
				<h1>{title}</h1>
				{@render children?.()}
			{/if}
		</main>
		<aside class="greg-aside-outline" class:hidden={!outlineNorm && !carbonAds}>
			{#if outlineNorm}
				<Outline
					container={mainEl}
					level={outlineNorm.level}
					label={outlineNorm.label}
					{active}
				/>
			{/if}
			{#if carbonAds}
				<CarbonAds
					code={carbonAds.code}
					placement={carbonAds.placement}
					{active}
				/>
			{/if}
		</aside>
	</div>
	<SearchModal bind:open={searchOpen} onClose={closeSearch} onNavigate={navigateFromSearch} />
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

	/* ── Top Header ─────────────────────────────────── */
	.site-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--greg-header-height);
		padding: 0 1.25rem;
		background-color: var(--greg-header-background);
		border-bottom: 1px solid var(--greg-border-color);
		flex-shrink: 0;
		z-index: 10;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.site-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		color: var(--greg-color);
		text-decoration: none;
		white-space: nowrap;
		letter-spacing: -0.01em;

		.site-logo {
			display: inline-block;
			width: 22px;
			height: 22px;
			flex-shrink: 0;
			background-color: var(--greg-accent);
			mask: url('/greg.svg') center / contain no-repeat;
			-webkit-mask: url('/greg.svg') center / contain no-repeat;
		}

		&:hover {
			color: var(--greg-accent);
		}
	}

	.version-badge {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--greg-menu-section-color);
		background: var(--greg-menu-background);
		border: 1px solid var(--greg-border-color);
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		justify-content: flex-end;
		max-width: 24rem;
	}

	.theme-group {
		display: flex;
		border: 1px solid var(--greg-border-color);
		border-radius: 6px;
		flex-shrink: 0;
	}

	.theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 0;
		padding: 0.38rem 0.5rem;
		color: var(--greg-menu-section-color);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		outline: none;

		&:first-child {
			border-radius: 5px 0 0 5px;
		}

		&:last-child {
			border-radius: 0 5px 5px 0;
		}

		&:focus-visible {
			outline: 2px solid var(--greg-accent);
			outline-offset: 2px;
		}

		&:hover:not(.active) {
			background: var(--greg-menu-hover-background);
			color: var(--greg-color);
		}

		&.active {
			background: var(--greg-accent-light);
			color: var(--greg-accent);
		}
	}

	.search-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.38rem 0.75rem;
		background-color: var(--greg-menu-background);
		border: 1px solid var(--greg-border-color);
		border-radius: 6px;
		color: var(--greg-menu-section-color);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.15s, box-shadow 0.15s;
		font-family: inherit;

		&:hover {
			border-color: var(--greg-accent);
			color: var(--greg-color);
		}

		.search-trigger-icon {
			width: 15px;
			height: 15px;
			flex-shrink: 0;
		}

		.search-trigger-label {
			flex: 1;
			text-align: left;
		}

		.search-trigger-hint {
			display: flex;
			gap: 0.15rem;
			flex-shrink: 0;

			kbd {
				background: var(--greg-background);
				border: 1px solid var(--greg-border-color);
				border-radius: 3px;
				padding: 0.05rem 0.3rem;
				font-size: 0.65rem;
				line-height: 1.5;
				font-family: inherit;
			}
		}
	}

	/* ── Body layout ─────────────────────────────────── */
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
