<script lang="ts">
	type OutlineLevel = false | number | [number, number] | 'deep';

	type Props = {
		/** Element to scan for headings. */
		container: HTMLElement | undefined;
		/** Heading levels to include. Mirrors VitePress `outline` option.
		 *  false → disabled, number → single level, [n,m] → range, 'deep' → [2,6] */
		level?: OutlineLevel;
		/** Section label shown above the list. */
		label?: string;
		/** Reacts to navigation changes so re-scan is triggered. */
		active?: string;
	};

	let {
		container,
		level = [2, 3],
		label = 'On this page',
		active = '',
	}: Props = $props();

	type HeadingItem = { id: string; text: string; depth: number };

	let items: HeadingItem[] = $state([]);
	let activeId = $state('');

	// Resolve level setting to [min, max]
	function resolveRange(l: OutlineLevel): [number, number] | null {
		if (l === false) return null;
		if (l === 'deep') return [2, 6];
		if (typeof l === 'number') return [l, l];
		return l;
	}

	const tagSelector = $derived.by(() => {
		const range = resolveRange(level);
		if (!range) return null;
		const tags: string[] = [];
		for (let i = range[0]; i <= range[1]; i++) tags.push(`h${i}`);
		return tags.join(', ');
	});

	// Scan headings out of the container DOM
	function doScan() {
		if (!tagSelector || !container) { items = []; return; }
		const nodes = Array.from(container.querySelectorAll<HTMLElement>(tagSelector));
		items = nodes
			.filter(n => n.id)
			.map(n => ({
				id: n.id,
				text: n.textContent?.trim() ?? '',
				depth: parseInt(n.tagName[1], 10),
			}));
	}

	let scanTimer: ReturnType<typeof setTimeout> | null = null;
	function scheduleScan(delay = 80) {
		if (scanTimer) clearTimeout(scanTimer);
		scanTimer = setTimeout(doScan, delay);
	}

	// Re-scan using a MutationObserver so we catch async content renders.
	// A plain $effect + tick() fires before {#await} resolves; the MO fires
	// after the DOM is actually populated.
	$effect(() => {
		void active;   // reactive dependency — reconnect MO on navigation
		const el = container;
		if (!el) { items = []; return; }

		const mo = new MutationObserver(() => scheduleScan());
		mo.observe(el, { childList: true, subtree: true });

		// Also do an immediate scan in case content is already in the DOM
		scheduleScan(0);

		return () => {
			mo.disconnect();
			if (scanTimer) clearTimeout(scanTimer);
		};
	});

	// IntersectionObserver — highlight the topmost visible heading
	let observer: IntersectionObserver | null = null;
	const visible = new Set<string>();

	function pickActive() {
		if (!items.length) { activeId = ''; return; }
		// Pick the first item (in document order) that is currently visible
		const first = items.find(it => visible.has(it.id));
		activeId = first?.id ?? '';
	}

	$effect(() => {
		observer?.disconnect();
		visible.clear();
		if (!container || !items.length) return;

		observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) visible.add(e.target.id);
					else visible.delete(e.target.id);
				}
				pickActive();
			},
			{ rootMargin: '0px 0px -80% 0px', threshold: 0 }
		);

		for (const { id } of items) {
			const el = container.querySelector(`#${CSS.escape(id)}`);
			if (el) observer.observe(el);
		}

		return () => observer?.disconnect();
	});

	function scrollTo(id: string) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	const minDepth = $derived(items.length ? Math.min(...items.map(i => i.depth)) : 2);
</script>

{#if tagSelector !== null && items.length > 0}
<nav class="outline" aria-label="Page outline">
	<p class="outline-title">{label}</p>
	<ul>
		{#each items as item (item.id)}
			<li style:padding-left="{(item.depth - minDepth) * 0.75}rem">
				<a
					href="#{item.id}"
					class:active={item.id === activeId}
					onclick={(e) => { e.preventDefault(); scrollTo(item.id); }}
				>{item.text}</a>
			</li>
		{/each}
	</ul>
</nav>
{/if}

<style lang="scss">
.outline {
	width: 100%;
	font-size: 0.8125rem;
}

.outline-title {
	font-size: 0.75rem;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--greg-menu-section-color);
	margin: 0 0 0.5rem;
	padding: 0;
}

ul {
	list-style: none;
	margin: 0;
	padding: 0;
}

li {
	line-height: 1.35;
	margin: 0;
}

a {
	display: block;
	padding: 0.25rem 0;
	color: var(--greg-toc-link-color);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	transition: color 0.15s;
	border-left: 2px solid transparent;
	padding-left: 0.6rem;
	margin-left: -0.6rem;

	&:hover {
		color: var(--greg-toc-link-hover);
	}

	&.active {
		color: var(--greg-accent);
		border-left-color: var(--greg-accent);
		font-weight: 500;
	}
}
</style>
