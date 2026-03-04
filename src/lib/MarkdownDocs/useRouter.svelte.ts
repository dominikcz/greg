import { tick } from 'svelte';
import { flattenMenu, getBreadcrumb } from './docsUtils';

type FlatItem = { label: string; link: string; type: string };

/**
 * SPA router rune for MarkdownDocs.
 * Manages the active URL, module resolution and popstate handling.
 *
 * `knownPaths` is a set of known markdown file paths (e.g. from the frontmatter
 * virtual module). Values are ignored – only keys are used for existence checks.
 */
function normalizePath(raw: string): string {
	return decodeURI(raw).replace(/\/$/, '') || '/';
}

export function useRouter(
	knownPaths: Record<string, unknown>,
	getRootPath: () => string,
) {
	let active = $state(normalizePath(window.location.pathname));

	function navigate(path: string) {
		if (normalizePath(window.location.pathname) === path) return;
		history.pushState(null, '', path);
		active = path;
	}

	function handlePopState() {
		active = normalizePath(window.location.pathname);
	}

	$effect(() => {
		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	});

	/** Resolved .md file path for the active route, or null if unknown. */
	const activeMarkdownPath = $derived.by(() => {
		const rootPath = getRootPath();
		const rel = active.replace(rootPath, '').replace(/^\//, '');
		const candidates = rel
			? [`${rootPath}/${rel}.md`, `${rootPath}/${rel}/index.md`]
			: [`${rootPath}/index.md`, `${rootPath}index.md`];
		for (const c of candidates) {
			if (c in knownPaths) return c;
		}
		return null;
	});

	return {
		get active() { return active; },
		/** Resolved .md path suitable for fetch('/docs/guide/page.md'). */
		get activeMarkdownPath() { return activeMarkdownPath; },
		navigate,
		/** Navigate and after content loads scroll to anchor. */
		navigateWithAnchor(path: string, anchor?: string) {
			navigate(path);
			if (anchor) {
				tick().then(() => setTimeout(() => {
					document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}, 120));
			}
		},
		/** Returns true when active path corresponds to a markdown page. */
		isMarkdown(flat: FlatItem[]) {
			const m = flat.find((x: FlatItem) => x.link === active);
			return m ? m.type === 'md' : true;
		},
		title(flat: FlatItem[]) {
			return getBreadcrumb(active, flat);
		},
	};
}
