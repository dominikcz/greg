/**
 * remarkCustomAnchors
 *
 * Supports VitePress-style custom heading IDs:
 *   ## My Heading {#custom-id}
 *
 * Strips the `{#id}` suffix from the heading text and sets
 * `node.data.hProperties.id` so rehype-slug leaves it alone.
 */
import { visit } from 'unist-util-visit';

const CUSTOM_ID_RE = /\s*\{#([\w-]+)\}\s*$/;

export function remarkCustomAnchors() {
    return (tree) => {
        visit(tree, 'heading', (node) => {
            if (!node.children?.length) return;

            // The custom id is always at the end — check the last child text node
            const last = node.children[node.children.length - 1];
            if (last?.type !== 'text') return;

            const match = last.value.match(CUSTOM_ID_RE);
            if (!match) return;

            const id = match[1];

            // Strip the {#id} suffix from the text
            last.value = last.value.slice(0, last.value.length - match[0].length);

            // Remove the node entirely if it became empty
            if (last.value === '') {
                node.children.pop();
            }

            // Set the id on the hast element — rehype-slug skips elements with existing id
            node.data ??= {};
            node.data.hProperties ??= {};
            node.data.hProperties.id = id;
        });
    };
}
