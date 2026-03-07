import { visit } from 'unist-util-visit';
import { normalizeCodeFenceInfo } from './codeFenceInfo.js';

const TITLE_RE = /\[([^\]]+)\]/;

export function remarkCodeMeta() {
	return (tree) => {
		visit(tree, 'code', (node) => {
			const { lang, meta } = normalizeCodeFenceInfo(node.lang ?? '', node.meta ?? '');
			const titleMatch = meta.match(TITLE_RE);
			const title = titleMatch?.[1]?.trim() ?? '';

			node.data = node.data ?? {};
			node.data.hProperties = {
				...(node.data.hProperties ?? {}),
				...(lang ? { 'data-code-lang': lang } : {}),
				...(meta ? { 'data-code-meta': meta } : {}),
				...(title ? { 'data-code-title': title } : {}),
			};
		});
	};
}
