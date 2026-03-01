import { tick } from 'svelte';
import { flattenMenu, getBreadcrumb } from './docsUtils';

type FlatItem = { label: string; link: string; type: string };

/**
 * SPA router rune for MarkdownDocs.
 * Manages the active URL, module resolution and popstate handling.
 */
export function useRouter(
	modules: Record<string, () => Promise<unknown>>,
	getRootPath: () => string,
) {
	let active = $state(decodeURI(window.location.pathname));

	function navigate(path: string) {
		if (decodeURI(window.location.pathname) === path) return;
		history.pushState(null, '', path);
		active = path;
	}

	function handlePopState() {
		active = decodeURI(window.location.pathname);
	}

	$effect(() => {
		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	});

	const activeModule = $derived.by(() => {
		const rootPath = getRootPath();
		const rel = active.replace(rootPath, '').replace(/^\//, '');
		const candidates = rel
			? [`${rootPath}/${rel}.md`, `${rootPath}/${rel}/index.md`]
			: [`${rootPath}/index.md`, `${rootPath}index.md`];
		for (const c of candidates) {
			if (modules[c]) return modules[c];
		}
		return null;
	});

	return {
		get active() { return active; },
		get activeModule() { return activeModule; },
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
