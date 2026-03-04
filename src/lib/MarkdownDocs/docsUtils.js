function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Sort items by optional `order` field first (lower = earlier), then
 * alphabetically by label as a tie-breaker.
 * Items without `order` sort after items that have one.
 */
function sortItems(items) {
    items.sort((a, b) => {
        const oa = a._order ?? Infinity;
        const ob = b._order ?? Infinity;
        if (oa !== ob) return oa - ob;
        return a.label.localeCompare(b.label);
    });
    for (const item of items) {
        if (item.children?.length) sortItems(item.children);
    }
}

/**
 * Build the navigation tree from the modules map.
 *
 * @param {Record<string,() => Promise<unknown>>} modules  - lazy glob map
 * @param {string}  base          - root path prefix, e.g. '/docs'
 * @param {Record<string, { title?: string; order?: number; [k: string]: unknown }>} [frontmatters]
 *   - eager-loaded frontmatter keyed by the same file paths as `modules`.
 *   - `title` overrides the label derived from the file/folder name.
 *   - `order` controls the sort position within a level (lower = earlier).
 */
export function prepareMenu(modules, base, frontmatters = {}) {
    const paths = Object.keys(modules);
    const root = [];

    // Sort so index.md files are processed first — they define the folder nodes
    const sorted = [...paths].sort((a, b) => {
        const aIdx = a.endsWith('index.md') ? 0 : 1;
        const bIdx = b.endsWith('index.md') ? 0 : 1;
        return aIdx - bIdx;
    });

    for (const filePath of sorted) {
        const fm = frontmatters[filePath] ?? {};
        // filePath like: /docs/folder1/test.md  (base = '/docs')
        const relativePath = filePath.startsWith(base) ? filePath.slice(base.length) : filePath;
        // parts: ['folder1', 'test.md'] or ['index.md'] or ['folder1', 'index.md']
        const parts = relativePath.replace(/^\//, '').split('/').filter(Boolean);

        let currentLevel = root;

        for (let idx = 0; idx < parts.length; idx++) {
            const part = parts[idx];
            const isLast = idx === parts.length - 1;

            if (isLast) {
                if (part === 'index.md') {
                    // index.md → represents the parent folder (or root if idx === 0)
                    const folderParts = parts.slice(0, idx);
                    const link = folderParts.length ? base + '/' + folderParts.join('/') : base;
                    const rawLabel = folderParts.length
                        ? folderParts[folderParts.length - 1]
                        : base.split('/').filter(Boolean).pop() ?? 'Home';

                    let node = currentLevel.find(c => c.link === link);
                    if (!node) {
                        node = {
                            label: fm.title ?? capitalize(rawLabel),
                            link,
                            children: [],
                            type: 'md',
                            _order: fm.order,
                        };
                        currentLevel.push(node);
                    } else {
                        // Upgrade type if the node was pre-created as a folder
                        node.type = 'md';
                        // Apply frontmatter overrides (index.md processed first, so this wins)
                        if (fm.title != null) node.label = fm.title;
                        if (fm.order != null) node._order = fm.order;
                    }
                } else {
                    // Regular .md file — leaf node
                    const fileName = part.replace(/\.md$/, '');
                    const link = base + '/' + parts.slice(0, idx).concat(fileName).join('/');
                    if (!currentLevel.find(c => c.link === link)) {
                        currentLevel.push({
                            label: fm.title ?? capitalize(fileName),
                            link,
                            children: [],
                            type: 'md',
                            _order: fm.order,
                        });
                    }
                }
            } else {
                // Folder segment — find or create the node and descend
                const folderLink = base + '/' + parts.slice(0, idx + 1).join('/');
                let child = currentLevel.find(c => c.link === folderLink);
                if (!child) {
                    child = { label: capitalize(part), link: folderLink, children: [], type: 'folder' };
                    currentLevel.push(child);
                }
                currentLevel = child.children;
            }
        }
    }

    sortItems(root);
    return root;
}

export function flattenMenu(menu) {
    const result = [];

    function flattenItem(item) {
        result.push({ label: item.label, link: item.link, type: item.type });
        for (const child of item.children ?? []) flattenItem(child);
    }

    for (const item of menu) flattenItem(item);

    return result;
}

export function getBreadcrumb(active, flat) {
    // exact match first
    const exact = flat.find(x => x.link === active);
    if (exact) return exact.label;

    // fallback: reconstruct from path segments
    const parts = active.replace(/^\//, '').split('/').filter(Boolean);
    if (!parts.length) return '';
    const last = parts[parts.length - 1];
    return last.charAt(0).toUpperCase() + last.slice(1);
}

