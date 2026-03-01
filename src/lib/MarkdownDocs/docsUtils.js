export function prepareMenu(modules, base) {
    const paths = Object.keys(modules).filter(p => !p.split('/').pop().startsWith('__'));
    const root = [];

    // Sort so index.md files are processed first — they define the folder nodes
    const sorted = [...paths].sort((a, b) => {
        const aIdx = a.endsWith('index.md') ? 0 : 1;
        const bIdx = b.endsWith('index.md') ? 0 : 1;
        return aIdx - bIdx;
    });

    sorted.forEach(path => {
        // path like: /docs/folder1/test.md  (base = '/docs')
        const relativePath = path.startsWith(base) ? path.slice(base.length) : path;
        // parts: ['folder1', 'test.md'] or ['index.md'] or ['folder1', 'index.md']
        const parts = relativePath.replace(/^\//, '').split('/').filter(Boolean);

        let currentLevel = root;

        parts.forEach((part, idx) => {
            const isLast = idx === parts.length - 1;
            const isIndex = part === 'index.md';

            if (isLast) {
                if (isIndex) {
                    // index.md → represents the parent folder (or root if idx === 0)
                    const folderParts = parts.slice(0, idx); // folder segments before index.md
                    const link = folderParts.length
                        ? base + '/' + folderParts.join('/')
                        : base;
                    const label = folderParts.length
                        ? folderParts[folderParts.length - 1]
                        : base.split('/').filter(Boolean).pop() ?? 'Home';
                    const labelCap = label.charAt(0).toUpperCase() + label.slice(1);

                    // Find or create the node at currentLevel
                    let node = currentLevel.find(c => c.link === link);
                    if (!node) {
                        node = { label: labelCap, link, children: [], type: 'md' };
                        currentLevel.push(node);
                    } else {
                        // Update type in case it was created as a folder without type
                        node.type = 'md';
                    }
                } else {
                    // Regular .md file — create a leaf node
                    const fileName = part.replace(/\.md$/, '');
                    const label = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                    const link = base + '/' + parts.slice(0, idx).concat(fileName).join('/');

                    const existing = currentLevel.find(c => c.link === link);
                    if (!existing) {
                        currentLevel.push({ label, link, children: [], type: 'md' });
                    }
                }
            } else {
                // Folder segment — find or create the node and descend
                const title = part.charAt(0).toUpperCase() + part.slice(1);
                const folderLink = base + '/' + parts.slice(0, idx + 1).join('/');
                let child = currentLevel.find(c => c.label === title);
                if (!child) {
                    child = { label: title, link: folderLink, children: [], type: 'folder' };
                    currentLevel.push(child);
                }
                currentLevel = child.children;
            }
        });
    });

    return root.sort((a, b) => a.label.localeCompare(b.label));
}

export function flattenMenu(menu) {
    const result = [];

    function flattenItem(item) {
        result.push({
            label: item.label,
            link: item.link,
            type: item.type
        });

        if (item.children && item.children.length > 0) {
            item.children.forEach(child => flattenItem(child));
        }
    }

    menu.forEach(item => flattenItem(item));

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

// export function prepareVitestTree(results) {
//     const root = [];

//     results.forEach(testFile => {
//         testFile.assertionResults.forEach(test => {
//             let currentLevel = root;
//             let idx = test.ancestorTitles.join('/');
//             let child = currentLevel.find(child => child.link === idx);
//             if (!child) {
//                 child = {
//                     label: test.ancestorTitles.toSpliced(-1),
//                     link: idx,
//                     children: []
//                 };
//                 currentLevel.push(child);
//             }
//             currentLevel = child.children;
//         });
//     });

//     return root;
// }

function parseVitestResult(collection) {
    const root = {};

    collection.forEach(item => {
        let currentNode = root;

        item.ancestorTitles.forEach((ancestor, index) => {
            if (!currentNode[ancestor]) {
                currentNode[ancestor] = { label: ancestor, children: [], status: item.status };
            }
            currentNode = currentNode[ancestor].children;
        });

        const existingTitle = currentNode.find(child => child.label === item.title);

        if (!existingTitle) {
            currentNode.push({ label: item.title, children: [], status: item.status });
        }
    });

    function buildFinalStructure(node) {
        return Object.values(node).map(child => {
            return {
                ...child,
                children: buildFinalStructure(child.children)
            };
        });
    }

    return buildFinalStructure(root);
}

export function prepareVitestTree(results) {
    const root = [];

    results.forEach(test => {
        let res = parseVitestResult(test.assertionResults);
        if (res.length) {
            root.push({
                label: test.name.substring(test.name.indexOf('/src/lib')),
                children: res,
                status: test.status,
            })
        }
    });
    return root;
}
