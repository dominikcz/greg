/**
 * Test helpers — builds a unified processor matching svelte.config.js setup,
 * but outputs plain HTML (no Svelte compilation).
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeCodeGroup from '../rehypeCodeGroup.js';
import { remarkContainers, rehypeContainers } from '../remarkContainers.js';
import { rehypeTocPlaceholder } from '../rehypeToc.js';
import { remarkCodeMeta } from '../remarkCodeMeta.js';

// Single shared processor — created once so shiki's lazy grammar loading
// only happens on first call, not per-test.
let _processor = null;

async function getProcessor(opts = {}) {
	// If custom options are passed, build a one-off processor
	if (opts.containers || opts.toc) {
		return unified()
			.use(remarkParse)
			.use(remarkCodeMeta)
			.use(remarkContainers, opts.containers ?? {})
			.use(remarkRehype, { allowDangerousHtml: true })
			.use(rehypeSlug)
			.use(rehypeAutolinkHeadings, { behavior: 'wrap' })
			.use(rehypeContainers, opts.containers ?? {})
			.use(rehypeCodeGroup)
			.use(rehypeTocPlaceholder, opts.toc ?? {})
			.use(rehypeStringify, { allowDangerousHtml: true });
	}
	if (!_processor) {
		_processor = unified()
			.use(remarkParse)
			.use(remarkCodeMeta)
			.use(remarkContainers)
			.use(remarkRehype, { allowDangerousHtml: true })
			.use(rehypeSlug)
			.use(rehypeAutolinkHeadings, { behavior: 'wrap' })
			.use(rehypeContainers)
			.use(rehypeCodeGroup)
			.use(rehypeTocPlaceholder)
			.use(rehypeStringify, { allowDangerousHtml: true });
	}
	return _processor;
}

export async function process(markdown, opts = {}) {
	const processor = await getProcessor(opts);
	return String(await processor.process(markdown));
}
