import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { process as processMarkdown } from './helpers.js';

// ─── rehype-slug ───────────────────────────────────────────────────────────────

describe('rehype-slug', () => {
	it('adds id to h1', async () => {
		const html = await processMarkdown('# Hello World');
		expect(html).toContain('id="hello-world"');
	});

	it('adds id to h2', async () => {
		const html = await processMarkdown('## Section One');
		expect(html).toContain('id="section-one"');
	});

	it('adds id to h3', async () => {
		const html = await processMarkdown('### Sub Section');
		expect(html).toContain('id="sub-section"');
	});

	it('slugifies special characters', async () => {
		const html = await processMarkdown('## C++ & Rust');
		// rehype-slug keeps consecutive punctuation: C++ becomes c-- (each + → -)
		expect(html).toMatch(/id="c-[^"]*rust"/);
	});

	it('handles duplicate headings with suffix', async () => {
		const html = await processMarkdown('## Dup\n\n## Dup');
		expect(html).toContain('id="dup"');
		expect(html).toContain('id="dup-1"');
	});
});

// ─── rehype-autolink-headings ──────────────────────────────────────────────────

describe('rehype-autolink-headings (behavior: wrap)', () => {
	it('wraps heading text in an <a> link', async () => {
		const html = await processMarkdown('## My Section');
		// behavior:'wrap' → <h2 id="..."><a href="#...">text</a></h2>
		expect(html).toMatch(/<h2 id="my-section"><a href="#my-section">My Section<\/a><\/h2>/);
	});

	it('link href matches heading id', async () => {
		const html = await processMarkdown('### Deep Link');
		expect(html).toContain('href="#deep-link"');
		expect(html).toContain('id="deep-link"');
	});
});

// ─── [[TOC]] placeholder ───────────────────────────────────────────────────────

describe('rehypeTocPlaceholder — [[TOC]]', () => {
	const md = `
[[TOC]]

## First

### First Sub

## Second
`.trim();

	it('replaces [[TOC]] with nav.table-of-contents', async () => {
		const html = await processMarkdown(md);
		expect(html).toContain('<nav class="table-of-contents">');
	});

	it('uses <ul> by default (not <ol>)', async () => {
		const html = await processMarkdown(md);
		expect(html).toContain('<ul>');
		expect(html).not.toContain('<ol>');
	});

	it('contains links to h2 headings', async () => {
		const html = await processMarkdown(md);
		expect(html).toContain('href="#first"');
		expect(html).toContain('href="#second"');
	});

	it('nests h3 inside h2 <li>', async () => {
		const html = await processMarkdown(md);
		// h3 link must appear after h2 link, inside a nested <ul>
		expect(html).toMatch(/href="#first"[\s\S]*href="#first-sub"/);
	});

	it('does NOT include h1 by default', async () => {
		const html = await processMarkdown('[[TOC]]\n\n# Title\n\n## Section');
		// Extract only the TOC nav block to check it doesn't contain h1 link
		const tocMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/);
		expect(tocMatch).not.toBeNull();
		const toc = tocMatch[0];
		expect(toc).not.toContain('href="#title"');
		expect(toc).toContain('href="#section"');
	});

	it('respects custom level option', async () => {
		const html = await processMarkdown(md, { toc: { level: [3] } });
		const tocMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/);
		expect(tocMatch).not.toBeNull();
		const toc = tocMatch[0];
		expect(toc).toContain('href="#first-sub"');
		expect(toc).not.toContain('href="#first"');
	});

	it('respects custom containerClass', async () => {
		const html = await processMarkdown(md, { toc: { containerClass: 'my-toc' } });
		expect(html).toContain('class="my-toc"');
	});

	it('respects listTag: ol', async () => {
		const html = await processMarkdown(md, { toc: { listTag: 'ol' } });
		expect(html).toContain('<ol>');
	});

	it('applies custom format function', async () => {
		const html = await processMarkdown(md, { toc: { format: (t) => t.toUpperCase() } });
		expect(html).toContain('>FIRST<');
	});

	it('does not replace text that only partially matches [[toc]]', async () => {
		const html = await processMarkdown('See also [[toc]] here\n\n## H');
		expect(html).not.toContain('<nav');
	});

	it('is case-insensitive: [[toc]], [[Toc]], [[TOC]] all work', async () => {
		for (const placeholder of ['[[toc]]', '[[Toc]]', '[[TOC]]']) {
			const html = await processMarkdown(`${placeholder}\n\n## Section`);
			expect(html).toContain('<nav class="table-of-contents">');
		}
	});

	it('renders no TOC when there are no matching headings', async () => {
		const html = await processMarkdown('[[TOC]]\n\nJust text, no headings');
		expect(html).not.toContain('<nav');
	});
});

// ─── Custom Containers ─────────────────────────────────────────────────────────

describe('remarkContainers — ::: info', () => {
	it('renders info container with default title', async () => {
		const html = await processMarkdown('::: info\nContent\n:::');
		expect(html).toContain('class="custom-block info"');
		expect(html).toContain('class="custom-block-title"');
		expect(html).toContain('INFO');
		expect(html).toContain('Content');
		expect(html).not.toContain(':::');
	});

	it('renders info with custom title', async () => {
		const html = await processMarkdown('::: info Custom Title\nBody\n:::');
		expect(html).toContain('Custom Title');
		expect(html).not.toContain('>INFO<');
	});
});

describe('remarkContainers — ::: tip', () => {
	it('renders tip container with default title', async () => {
		const html = await processMarkdown('::: tip\nA tip\n:::');
		expect(html).toContain('class="custom-block tip"');
		expect(html).toContain('TIP');
	});
});

describe('remarkContainers — ::: warning', () => {
	it('renders warning container with default title', async () => {
		const html = await processMarkdown('::: warning\nWatch out\n:::');
		expect(html).toContain('class="custom-block warning"');
		expect(html).toContain('WARNING');
	});
});

describe('remarkContainers — ::: danger', () => {
	it('renders danger container with default title', async () => {
		const html = await processMarkdown('::: danger\nDangerous\n:::');
		expect(html).toContain('class="custom-block danger"');
		expect(html).toContain('DANGER');
	});
});

describe('remarkContainers — ::: details', () => {
	it('renders details as <details> element', async () => {
		const html = await processMarkdown('::: details\nHidden\n:::');
		expect(html).toContain('<details');
		expect(html).toContain('class="custom-block details"');
		expect(html).toContain('<summary');
		expect(html).toContain('class="custom-block-title"');
		expect(html).toContain('Details');
		expect(html).toContain('Hidden');
	});

	it('details without {open} has no open attribute', async () => {
		const html = await processMarkdown('::: details\nHidden\n:::');
		expect(html).not.toContain('open');
	});

	it('details with {open} attribute renders as open', async () => {
		const html = await processMarkdown('::: details Click me {open}\nContent\n:::');
		expect(html).toContain('<details');
		expect(html).toMatch(/open/);
	});

	it('strips {open} from displayed title', async () => {
		const html = await processMarkdown('::: details Click me {open}\nContent\n:::');
		expect(html).not.toContain('{open}');
		expect(html).toContain('Click me');
	});

	it('custom title without {open}', async () => {
		const html = await processMarkdown('::: details My Summary\nBody\n:::');
		expect(html).toContain('My Summary');
		expect(html).not.toContain('Details');
	});
});

describe('remarkContainers — custom labels', () => {
	it('respects infoLabel option', async () => {
		const html = await processMarkdown('::: info\nMsg\n:::', { containers: { infoLabel: 'UWAGA' } });
		expect(html).toContain('UWAGA');
		expect(html).not.toContain('>INFO<');
	});

	it('respects tipLabel option', async () => {
		const html = await processMarkdown('::: tip\nMsg\n:::', { containers: { tipLabel: 'WSKAZÓWKA' } });
		expect(html).toContain('WSKAZÓWKA');
	});
});

describe('remarkContainers — unknown type is ignored', () => {
	it('leaves unknown ::: blocks as-is (not transformed)', async () => {
		const html = await processMarkdown('::: custom-unknown\nContent\n:::');
		expect(html).not.toContain('custom-block');
		expect(html).toContain('custom-unknown');
	});
});

describe('rehype-code-group', () => {
	it('renders ::: code-group labels into tabbed group', async () => {
		const html = await processMarkdown('::: code-group labels=[npm, pnpm]\n\n```bash\nnpm i\n```\n\n```bash\npnpm add\n```\n\n:::');
		expect(html).toContain('rehype-code-group');
		expect(html).toContain('rcg-tab-container');
		expect(html).toContain('>npm<');
		expect(html).toContain('>pnpm<');
		expect(html).toContain('rcg-block');
		expect(html).not.toContain('<head>');
		expect(html).not.toContain('<script');
	});

	it('infers labels from code block language when labels are omitted', async () => {
		const html = await processMarkdown('::: code-group\n\n```javascript\nconsole.log(1)\n```\n\n```typescript\nconst n: number = 1\n```\n\n:::');
		expect(html).toContain('>js<');
		expect(html).toContain('>ts<');
	});

	it('prefers title metadata for labels when available', async () => {
		const html = await processMarkdown('::: code-group\n\n<pre data-code-lang="js" data-code-title="config.js"><code>a</code></pre>\n\n<pre data-code-lang="ts" data-code-title="config.ts"><code>b</code></pre>\n\n:::');
		expect(html).toContain('>config.js<');
		expect(html).toContain('>config.ts<');
	});

	it('uses bracket title from fenced code metastring when labels are omitted', async () => {
		const html = await processMarkdown('::: code-group\n\n```js [config.js]\nexport default {}\n```\n\n```ts [config.ts]\nexport default {}\n```\n\n:::');
		expect(html).toContain('>config.js<');
		expect(html).toContain('>config.ts<');
	});

	it('keeps raw html blocks inside code-group', async () => {
		const html = await processMarkdown('::: code-group labels=[npm, pnpm]\n\n<pre><code>npm i</code></pre>\n\n<pre><code>pnpm add</code></pre>\n\n:::');
		expect(html).toContain('rehype-code-group');
		expect(html).toContain('rcg-block');
		expect(html).toContain('npm i');
		expect(html).toContain('pnpm add');
	});
});

describe('remarkContainers — content', () => {
	it('renders markdown content inside containers', async () => {
		const html = await processMarkdown('::: info\n**bold** and `code`\n:::');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<code>code</code>');
	});

	it('renders code block inside details', async () => {
		const html = await processMarkdown(`::: details Click me {open}\n\`\`\`js\nconsole.log('hi')\n\`\`\`\n:::`);
		expect(html).toContain('<details');
		expect(html).toContain('<code');
	});
});

// ─── docsUtils — __partial filter ─────────────────────────────────────────────

describe('docsUtils — prepareMenu', async () => {
	const { prepareMenu } = await import('../docsUtils.js');

	it('excludes files starting with __', () => {
		const modules = {
			'/docs/index.md': {},
			'/docs/folder1/__partial.md': {},
			'/docs/folder1/index.md': {},
			'/docs/__hidden.md': {},
		};
		const tree = prepareMenu(modules, '/docs');
		const flatten = JSON.stringify(tree);
		expect(flatten).not.toContain('__partial');
		expect(flatten).not.toContain('__hidden');
	});

	it('includes normal files', () => {
		const modules = {
			'/docs/index.md': {},
			'/docs/guide.md': {},
		};
		const tree = prepareMenu(modules, '/docs');
		const flatten = JSON.stringify(tree);
		expect(flatten).toContain('guide');
	});
});

describe('imports — snippets and markdown includes', () => {
	const testFile = path.join(process.cwd(), 'src/lib/MarkdownDocs/__tests__/fixtures/test.md');

	it('imports code snippet with <<< as code block (no markdown parsing inside)', async () => {
		const html = await processMarkdown('<<< ./snippets/sample.md', { filename: testFile });
		expect(html).toContain('class="language-md"');
		expect(html).toContain('Snippet heading');
		expect(html).not.toContain('<h2 id="snippet-heading">');
		expect(html).not.toContain('custom-block info');
	});

	it('supports snippet title from trailing [title]', async () => {
		const html = await processMarkdown('::: code-group\n\n<<< ./snippets/sample.js [sample.js]\n\n<<< ./snippets/sample.js [copy.js]\n\n:::', { filename: testFile });
		expect(html).toContain('>sample.js<');
		expect(html).toContain('>copy.js<');
	});

	it('supports snippet region and line range selection', async () => {
		const html = await processMarkdown('<<< ./snippets/sample.js#demo{1,1}', { filename: testFile });
		expect(html).toContain('region line 1');
		expect(html).not.toContain('region line 2');
	});

	it('supports snippet import with @ alias without slash', async () => {
		const html = await processMarkdown('<<< @docs/markdown/snippet.js#snippet{2,2}', { filename: testFile });
		expect(html).toContain('..');
		expect(html).not.toContain('export default foo');
	});

	it('resolves relative snippet path from /docs/... vfile path', async () => {
		const html = await processMarkdown('<<< ./snippet.js', { filename: '/docs/markdown/includes.md' });
		expect(html).toContain('function foo()');
		expect(html).toContain('export default foo');
	});

	it('resolves relative snippet path from extensionless /docs/... route path', async () => {
		const html = await processMarkdown('<<< ./snippet.js', { filename: '/docs/markdown/includes' });
		expect(html).toContain('function foo()');
		expect(html).toContain('export default foo');
	});

	it('resolves relative snippet path from transformed docs filename', async () => {
		const html = await processMarkdown('<<< ./snippet.js', { filename: '/docs/markdown/includes.md.svelte' });
		expect(html).toContain('function foo()');
		expect(html).toContain('export default foo');
	});

	it('resolves relative snippet path using markdown basename fallback', async () => {
		const html = await processMarkdown('<<< ./snippet.js', {
			imports: {
				sourceRoot: process.cwd(),
				docsDir: 'docs',
			},
			vfile: {
				basename: 'includes.md',
			},
		});
		expect(html).toContain('function foo()');
		expect(html).toContain('export default foo');
	});

	it('resolves relative snippet path using docsDir fallback search', async () => {
		const html = await processMarkdown('<<< ./snippet.js', {
			imports: {
				sourceRoot: process.cwd(),
				docsDir: 'docs',
			},
		});
		expect(html).toContain('function foo()');
		expect(html).toContain('export default foo');
	});

	it('imports markdown via <!--@include: ...--> and processes it as normal markdown', async () => {
		const html = await processMarkdown('<!--@include: ./includes/part.md-->', { filename: testFile });
		expect(html).toContain('<h2 id="included-section">');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('custom-block info');
	});

	it('supports include by heading anchor', async () => {
		const html = await processMarkdown('<!--@include: ./includes/part.md#nested-part-->', { filename: testFile });
		expect(html).toContain('<h3 id="nested-part">');
		expect(html).toContain('Nested content.');
		expect(html).not.toContain('Included section');
	});

	it('resolves relative markdown include path from /docs/... vfile path', async () => {
		const html = await processMarkdown('<!--@include: ./__partial-basic.md-->', { filename: '/docs/markdown/includes.md' });
		expect(html).toContain('<h3 id="configuration">');
		expect(html).toContain('Can be created using <code>.foorc.json</code>.');
	});

	it('supports overriding docsDir for relative imports from virtual absolute paths', async () => {
		const html = await processMarkdown('<<< ./snippet.js', {
			filename: '/markdown/includes.md',
			imports: { sourceRoot: process.cwd(), docsDir: 'docs' },
		});
		expect(html).toContain('function foo()');
		expect(html).toContain('export default foo');
	});

	it('supports markdown include with @ alias without slash', async () => {
		const html = await processMarkdown('<!--@include: @src/lib/MarkdownDocs/__tests__/fixtures/includes/part.md#nested-part-->', { filename: testFile });
		expect(html).toContain('<h3 id="nested-part">');
		expect(html).toContain('Nested content.');
		expect(html).not.toContain('Included section');
	});
});
