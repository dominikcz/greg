import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

function parseFlexPattern(value) {
    const raw = String(value ?? '').trim();
    if (!raw.startsWith('[[') || !raw.endsWith(']]')) return null;

    const inner = raw.slice(2, -2).trim();
    if (!inner) return [];
    if (/^toc$/i.test(inner)) return null;

    return parseLineItems(inner);
}

function parseLineItems(inner) {
    if (!inner.includes('\n')) return null;

    const parts = inner
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/,$/, '').trim())
        .filter(Boolean);

    return parts.length ? parts : null;
}

function parseMarkdownFragment(fragment, parser) {
    const tree = parser.parse(fragment);
    return Array.isArray(tree?.children) ? tree.children : [];
}

function createFlexItemNode(children) {
    return {
        type: 'flexRowItem',
        data: {
            hName: 'div',
            hProperties: { className: ['markdown-flex-item'] },
        },
        children,
    };
}

function createFlexRowNode(items, parser) {
    return {
        type: 'flexRowBlock',
        data: {
            hName: 'div',
            hProperties: { className: ['markdown-flex-row'] },
        },
        children: items.map((item) =>
            createFlexItemNode(parseMarkdownFragment(item, parser)),
        ),
    };
}

export function remarkFlexRow() {
    const parser = unified().use(remarkParse).use(remarkGfm);

    return (tree, file) => {
        const source = typeof file?.value === 'string' ? file.value : '';

        visit(tree, 'paragraph', (node, index, parent) => {
            if (!parent || index == null) return;

            let raw = '';
            const start = node?.position?.start?.offset;
            const end = node?.position?.end?.offset;

            if (typeof start === 'number' && typeof end === 'number' && end >= start) {
                raw = source.slice(start, end);
            } else {
                raw = (node.children ?? [])
                    .map((child) => child?.value ?? '')
                    .join('');
            }

            const parsedItems = parseFlexPattern(raw);
            if (!parsedItems || parsedItems.length === 0) return;

            parent.children[index] = createFlexRowNode(parsedItems, parser);
        });
    };
}
