import { tick } from 'svelte';
import { flattenMenu, getBreadcrumb } from './docsUtils';

type FlatItem = { label: string; link: string; type: string };

/**
 * SPA router rune for MarkdownDocs.
 * Manages the active URL, module resolution and popstate handling.
 *
 * `knownPaths` is a set of known markdown file paths (e.g. from the frontmatter
 * virtual module). Values are ignored â€“ only keys are used for existence checks.
 */
function normalizePath(raw: string): string {
	return decodeURI(raw).replace(/\/$/, '') || '/';
}

function normalizeHash(raw?: string): string {
	if (!raw) return '';
	const value = String(raw).trim().replace(/^#/, '');
	return value ? `#${value}` : '';
}

export function buildNavigationUrl(path: string, anchor?: string): string {
	return `${normalizePath(path)}${normalizeHash(anchor)}`;
}

export function isSameNavigationTarget(
	currentPath: string,
	currentHash: string | undefined,
	nextPath: string,
	nextAnchor?: string,
): boolean {
	return normalizePath(currentPath) === normalizePath(nextPath)
		&& normalizeHash(currentHash) === normalizeHash(nextAnchor);
}

export function useRouter(
	knownPaths: Record<string, unknown>,
	getSrcDirForPath: (path: string) => string,
	normalizePathForLookup: (path: string) => string = (path) => path,
) {
	let active = $state(normalizePath(window.location.pathname));

	const lookupActive = $derived.by(() =>
		normalizePath(normalizePathForLookup(active)),
	);

	function navigate(path: string, anchor?: string) {
		if (isSameNavigationTarget(window.location.pathname, window.location.hash || '', path, anchor)) return;
		history.pushState(null, '', buildNavigationUrl(path, anchor));
		active = normalizePath(path);
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
		const srcDir = getSrcDirForPath(lookupActive);
		const rel = lookupActive.replace(srcDir, '').replace(/^\//, '');
		const candidates = rel
			? [`${srcDir}/${rel}.md`, `${srcDir}/${rel}/index.md`]
			: [`${srcDir}/index.md`, `${srcDir}index.md`];
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
			navigate(path, anchor);
			if (anchor) {
				tick().then(() => setTimeout(() => {
					document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}, 120));
			}
		},
		/** Returns true when active path corresponds to a markdown page. */
		isMarkdown(flat: FlatItem[]) {
			const m = flat.find((x: FlatItem) => x.link === lookupActive);
			return m ? m.type === 'md' : true;
		},
		title(flat: FlatItem[]) {
			return getBreadcrumb(lookupActive, flat);
		},
	};
}
