<script lang="ts">
	import type { Snippet } from 'svelte';
	import DocsNavigation from './DocsNavigation.svelte';
	import { prepareMenu, flattenMenu, getBreadcrumb } from './docsUtils';
	import 'github-markdown-css';
	import './../scss/markdownDocs.scss';
	import { Slot, setPortalsContext } from './../portal';

	type Props = {
		rootPath: string;
		modules: Record<string, () => Promise<any>>;
		children?: Snippet;
		properties?: Snippet;
		version: string;
		mainTitle?: string;
	};

	let { children, modules, rootPath = '/', properties, version = '', mainTitle = "Greg"}: Props = $props();
	let menu = $derived(prepareMenu(modules, rootPath));

	let filter = $state('');
	let filterMenu = $derived(menu.filter((x: any) => x.label.toLowerCase().includes(filter.toLowerCase())));
	let flat = $derived(flattenMenu(menu));

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

	let aside: HTMLElement;
	let splitter: HTMLElement;
	let dragging = false;
	let moveX: number;

	setPortalsContext();

	$effect(() => {
		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	});

	function hndMouseDown(e: MouseEvent) {
		dragging = true;
	}

	function hndMouseMove(e: MouseEvent) {
		moveX = e.x;
		if (dragging) {
			aside.style.width = moveX - splitter.getBoundingClientRect().width / 2 + 'px';
			e.preventDefault();
		}
	}

	function hndMouseUp(e: MouseEvent) {
		dragging = false;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div class="catalog" onmousemove={hndMouseMove} onmouseup={hndMouseUp}>
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
			<input class="search-input" type="text" placeholder="Search…" bind:value={filter} />
		</div>
	</header>

	<div class="catalog-body">
		<aside bind:this={aside}>
			<DocsNavigation menu={filterMenu} {rootPath} {active} {navigate} />
		</aside>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
		<div class="splitter" bind:this={splitter} onmousedown={hndMouseDown}></div>
		<main class:markdown-body={isMarkdown}>
			{#if activeModule}
				{#await activeModule() then mod}
					{@const MdComponent = mod.default}
					<MdComponent />
				{/await}
			{:else if title}
				<h1>{title}</h1>
				{@render children?.()}
			{/if}
		</main>
		<aside class="properties">
			{@render properties?.()}
			<Slot name="properties" />
		</aside>
	</div>
</div>

<style lang="scss">
	.catalog {
		display: flex;
		flex-flow: column nowrap;
		background-color: var(--catalog-background);
		color: var(--catalog-color);
		height: 100vh;
		overflow: hidden;
	}

	/* ── Top Header ─────────────────────────────────── */
	.site-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--catalog-header-height);
		padding: 0 1.25rem;
		background-color: var(--catalog-header-background);
		border-bottom: 1px solid var(--catalog-border-color);
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
		color: var(--catalog-color);
		text-decoration: none;
		white-space: nowrap;
		letter-spacing: -0.01em;

		.site-logo {
			display: inline-block;
			width: 22px;
			height: 22px;
			flex-shrink: 0;
			background-color: var(--catalog-accent);
			mask: url('/greg.svg') center / contain no-repeat;
			-webkit-mask: url('/greg.svg') center / contain no-repeat;
		}

		&:hover {
			color: var(--catalog-accent);
		}
	}

	.version-badge {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--catalog-menu-section-color);
		background: var(--catalog-menu-background);
		border: 1px solid var(--catalog-border-color);
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

	.search-input {
		width: 100%;
		padding: 0.4rem 0.75rem;
		background-color: var(--catalog-menu-background);
		border: 1px solid var(--catalog-border-color);
		border-radius: 6px;
		color: var(--catalog-color);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;

		&::placeholder {
			color: var(--catalog-menu-section-color);
		}

		&:focus {
			border-color: var(--catalog-accent);
			box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.15);
		}
	}

	/* ── Body layout ─────────────────────────────────── */
	.catalog-body {
		display: flex;
		flex-flow: row nowrap;
		flex: 1;
		overflow: hidden;
	}

	.splitter {
		background-color: var(--catalog-border-color);
		width: 1px;
		cursor: col-resize;
		flex-shrink: 0;
		user-select: none;
		transition: background-color 0.15s;

		&:hover {
			background-color: var(--catalog-accent);
		}
	}

	aside {
		width: 16rem;
		background-color: var(--catalog-menu-background);
		padding: 1rem 0.75rem;
		display: flex;
		flex-flow: column nowrap;
		gap: 0.4rem;
		flex-shrink: 0;
		overflow-y: auto;
		border-right: 1px solid var(--catalog-border-color);

		&.properties {
			width: 280px;
			border-right: none;
			border-left: 1px solid var(--catalog-border-color);
			padding: 1rem;
		}
	}

	main {
		background-color: var(--catalog-main-background);
		padding: 2rem 3rem;
		width: 100%;
		display: flex;
		flex-flow: column nowrap;
		gap: 0.5em;
		justify-content: flex-start;
		overflow-y: auto;
		max-width: 860px;

		h1 {
			font-size: 1.8rem;
			font-weight: 700;
			border-bottom: 1px solid var(--catalog-border-color);
			padding-bottom: 0.5rem;
			margin-bottom: 0.5rem;
			color: var(--catalog-color);
		}
	}
</style>
