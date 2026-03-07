function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Normalise a raw frontmatter badge value to `{ text, type }` or `undefined`.
 * Accepts a plain string (type defaults to 'tip') or an object.
 */
function normalizeBadge(raw) {
    if (!raw) return undefined;
    if (typeof raw === 'string') return { text: raw, type: 'tip' };
    if (raw.text) return { text: raw.text, type: raw.type ?? 'tip' };
    return undefined;
}

/**
 * Sort items by optional `order` field first (lower = earlier), then
 * alphabetically by label as a tie-breaker.
 * Items without `order` sort after items that have one.
 */
function sortItems(items) {
    items.sort((a, b) => {
        const aIsFolder = Boolean(a._isSection) || (Array.isArray(a.children) && a.children.length > 0);
        const bIsFolder = Boolean(b._isSection) || (Array.isArray(b.children) && b.children.length > 0);

        // Folders are always rendered before files.
        if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;

        const aHasOrder = Number.isFinite(a._order);
        const bHasOrder = Number.isFinite(b._order);

        // Ordered items come before unordered items inside the same bucket.
        if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;

        if (aHasOrder && bHasOrder && a._order !== b._order) {
            return a._order - b._order;
        }

        return a.label.localeCompare(b.label);
    });
    for (const item of items) {
        if (item.children?.length) sortItems(item.children);
    }
}

/**
 * Build the navigation tree from the modules map.
 *
 * @param {Record<string, unknown>} modules  - known paths map (values ignored, only keys used)
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

        // Skip hidden files/dirs (starting with __)
        if (parts.some(p => p.replace(/\.md$/, '').startsWith('__'))) continue;

        let currentLevel = root;
        let lastFolderNode = null; // tracks the most recently entered folder node

        for (let idx = 0; idx < parts.length; idx++) {
            const part = parts[idx];
            const isLast = idx === parts.length - 1;

            if (isLast) {
                if (part === 'index.md') {
                    // index.md → represents the parent folder (or root if idx === 0)
                    // We must NOT look in currentLevel (folder's own children) — we need
                    // the folder node itself, which is lastFolderNode (or root for top-level).
                    const folderParts = parts.slice(0, idx);
                    const link = folderParts.length ? base + '/' + folderParts.join('/') : base;
                    const rawLabel = folderParts.length
                        ? folderParts[folderParts.length - 1]
                        : base.split('/').filter(Boolean).pop() ?? 'Home';

                    let node = lastFolderNode ?? root.find(c => c.link === link);
                    if (!node) {
                        node = {
                            label: fm.title ?? capitalize(rawLabel),
                            link,
                            children: [],
                            type: 'md',
                            _isSection: true,
                            _order: fm.order,
                            badge: normalizeBadge(fm.badge),
                        };
                        currentLevel.push(node);
                    } else {
                        // Upgrade type if the node was pre-created as a folder
                        node.type = 'md';
                        node._isSection = true;
                        // Apply frontmatter overrides (index.md processed first, so this wins)
                        if (fm.title != null) node.label = fm.title;
                        if (fm.order != null) node._order = fm.order;
                        if (fm.badge != null) node.badge = normalizeBadge(fm.badge);
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
                            badge: normalizeBadge(fm.badge),
                        });
                    }
                }
            } else {
                // Folder segment — find or create the node and descend
                const folderLink = base + '/' + parts.slice(0, idx + 1).join('/');
                let child = currentLevel.find(c => c.link === folderLink);
                if (!child) {
                    child = { label: capitalize(part), link: folderLink, children: [], type: 'folder', _isSection: true };
                    currentLevel.push(child);
                }
                lastFolderNode = child;
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
        result.push({ label: item.label, link: item.link, type: item.type, badge: item.badge });
        for (const child of item.children ?? []) flattenItem(child);
    }

    for (const item of menu) flattenItem(item);

    return result;
}

/**
 * Returns the `{ prev, next }` neighbours of `active` within the flattened
 * navigation list (md pages only, in sidebar order).
 *
 * @param {string} active
 * @param {Array<{ label: string; link: string; type?: string }>} flat
 * @returns {{ prev: { label: string; link: string } | null, next: { label: string; link: string } | null }}
 */
export function getPrevNext(active, flat) {
    const pages = flat.filter(x => x.type === 'md');
    const idx = pages.findIndex(x => x.link === active);
    if (idx === -1) return { prev: null, next: null };
    return {
        prev: idx > 0 ? { label: pages[idx - 1].label, link: pages[idx - 1].link } : null,
        next: idx < pages.length - 1 ? { label: pages[idx + 1].label, link: pages[idx + 1].link } : null,
    };
}

/**
 * Returns the ancestor chain from the root of `menu` down to the node
 * whose link matches `active`, inclusive.
 *
 * @param {string} active
 * @param {Array<{ label: string; link: string; children?: Array<any> }>} menu
 * @returns {Array<{ label: string; link: string }>}
 */
export function getBreadcrumbItems(active, menu) {
    function findPath(items, target, path) {
        for (const item of items) {
            const next = [...path, { label: item.label, link: item.link }];
            if (item.link === target) return next;
            if (item.children?.length) {
                const found = findPath(item.children, target, next);
                if (found) return found;
            }
        }
        return null;
    }
    return findPath(menu, active, []) ?? [];
}

/**
 * Converts a declarative sidebar config array to a `TreeViewItem[]` tree.
 * Items with an `auto` path have their children generated from `frontmatters`.
 *
 * @param {Array<{ text?: string; link?: string; items?: Array<any>; auto?: string; badge?: any }>} items
 * @param {Record<string, { title?: string; order?: number; [k: string]: unknown }>} frontmatters
 * @param {string} base  - docs root prefix (e.g. '/docs')
 * @returns {import('./treeViewTypes').TreeViewItem[] | null}
 */
export function parseSidebarConfig(items, frontmatters, base) {
    if (!Array.isArray(items)) return null;

    function convert(item) {
        if (item.auto) {
            // `auto` is relative to `base` (rootPath), e.g. '/guide' → '/docs/guide'
            const autoBase = base + item.auto;
            // Only pass paths that belong to this sub-section so stray paths
            // don't become extra folder segments inside prepareMenu.
            const autoFrontmatters = Object.fromEntries(
                Object.entries(frontmatters).filter(([k]) => k.startsWith(autoBase + '/') || k === autoBase)
            );
            const autoMenu = prepareMenu(autoFrontmatters, autoBase, autoFrontmatters);
            const autoRoot = autoMenu.find(node => node.link === autoBase);
            // prepareMenu(autoBase) returns pages under autoBase on the top level,
            // while autoRoot (index page) is also a top-level node when present.
            // For sidebar sections we need all descendants except the section root itself.
            const children = autoMenu.filter(node => node.link !== autoBase);
            const fallbackLabel = autoRoot?.label
                ?? capitalize(item.auto.split('/').filter(Boolean).pop() ?? 'Section');

            return {
                // Label precedence: sidebar text -> frontmatter title -> folder name.
                label: item.text ?? fallbackLabel,
                link: item.link ?? autoBase,
                badge: normalizeBadge(item.badge),
                children,
                type: (item.link ? 'md' : (autoRoot?.type ?? 'folder')),
            };
        }
        const children = Array.isArray(item.items) ? item.items.map(convert) : [];
        return {
            label: item.text,
            link: item.link ?? '',
            badge: normalizeBadge(item.badge),
            children,
            type: item.link ? 'md' : 'folder',
        };
    }

    return items.map(convert);
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

