import { visit } from 'unist-util-visit';

const TITLE_RE = /\[([^\]]+)\]/;

export function remarkCodeMeta() {
	return (tree) => {
		visit(tree, 'code', (node) => {
			const lang = String(node.lang ?? '').trim().toLowerCase();
			const meta = String(node.meta ?? '');
			const titleMatch = meta.match(TITLE_RE);
			const title = titleMatch?.[1]?.trim() ?? '';

			node.data = node.data ?? {};
			node.data.hProperties = {
				...(node.data.hProperties ?? {}),
				...(lang ? { 'data-code-lang': lang } : {}),
				...(title ? { 'data-code-title': title } : {}),
			};
		});
	};
}
