import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

/**
 * Recursively collect all .md files (excluding partials starting with __)
 */
function walkDir(dir, fileList = []) {
    if (!existsSync(dir)) return fileList;
    for (const file of readdirSync(dir)) {
        const filePath = join(dir, file);
        if (statSync(filePath).isDirectory()) {
            walkDir(filePath, fileList);
        } else if (file.endsWith('.md') && !file.startsWith('__') && !file.startsWith('_')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

/**
 * Strip markdown syntax to produce plain searchable text.
 */
function cleanMarkdown(text) {
    return text
        // Remove YAML frontmatter
        .replace(/^---[\s\S]*?---\n?/, '')
        // Remove fenced code blocks (not useful for search)
        .replace(/```[\s\S]*?```/g, '')
        .replace(/~~~[\s\S]*?~~~/g, '')
        // Inline code — keep the inner value
        .replace(/`([^`]+)`/g, '$1')
        // Images — discard
        .replace(/!\[.*?\]\(.*?\)/g, '')
        // Links — keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\[.*?\]/g, '$1')
        // Bold / italic
        .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/___([^_]+)___/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Horizontal rules
        .replace(/^[-*_]{3,}\s*$/gm, '')
        // Blockquotes
        .replace(/^>\s*/gm, '')
        // Tables
        .replace(/\|[-:]+\|[-|: ]*/g, '\n')
        .replace(/\|/g, ' ')
        // Normalise whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Split a markdown document into sections by headings.
 * Returns [{heading, anchor, content}]
 */
function extractSections(markdown) {
    const lines = markdown.split('\n');
    const sections = [];
    let currentHeading = '';
    let currentAnchor = '';
    let currentLines = [];

    const flush = () => {
        const content = cleanMarkdown(currentLines.join('\n')).trim();
        if (content || currentHeading) {
            sections.push({ heading: currentHeading, anchor: currentAnchor, content });
        }
    };

    for (const line of lines) {
        const m = line.match(/^(#{1,6})\s+(.+)/);
        if (m) {
            flush();
            // Strip {#anchor} suffixes
            currentHeading = m[2].replace(/\s*\{[#.][^}]*\}\s*$/, '').trim();
            currentAnchor = currentHeading
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/^-+|-+$/g, '');
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }
    flush();

    return sections.filter(s => s.content || s.heading);
}

/**
 * Build the search index array from all docs in docsDir.
 */
async function buildSearchIndex(docsDir, rootPath) {
    const files = walkDir(docsDir);
    const index = [];

    for (const filePath of files) {
        let content;
        try {
            content = readFileSync(filePath, 'utf-8');
        } catch {
            continue;
        }

        const relPath = relative(docsDir, filePath)
            .replace(/\\/g, '/')
            .replace(/\.md$/, '');

        // Map file path → SPA route
        let routePath;
        if (relPath === 'index') {
            routePath = rootPath;
        } else if (relPath.endsWith('/index')) {
            routePath = rootPath + '/' + relPath.slice(0, -6);
        } else {
            routePath = rootPath + '/' + relPath;
        }

        const sections = extractSections(content);

        // Title: first heading or humanised filename
        const title =
            sections[0]?.heading ||
            relPath.split('/').pop()
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());

        index.push({
            id: routePath,
            title,
            sections: sections.map(({ heading, anchor, content }) => ({
                heading,
                anchor,
                content,
            })),
        });
    }

    return index;
}

/**
 * Vite plugin: serves /search-index.json in dev and emits it as a build asset.
 *
 * @param {object} options
 * @param {string} [options.docsDir='docs']   - directory (relative to project root)
 * @param {string} [options.rootPath='/docs'] - SPA route prefix
 */
export function vitePluginSearchIndex({ docsDir = 'docs', rootPath = '/docs' } = {}) {
    let resolvedDocsDir;

    return {
        name: 'vite-plugin-search-index',

        configResolved(config) {
            resolvedDocsDir = join(config.root, docsDir);
        },

        // Dev-server: answer GET /search-index.json with a freshly built index
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url !== '/search-index.json' || req.method !== 'GET') return next();
                try {
                    const index = await buildSearchIndex(resolvedDocsDir, rootPath);
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    });
                    res.end(JSON.stringify(index));
                } catch (err) {
                    next(err);
                }
            });
        },

        // Production build: emit search-index.json as a static asset
        async generateBundle() {
            const index = await buildSearchIndex(resolvedDocsDir, rootPath);
            this.emitFile({
                type: 'asset',
                fileName: 'search-index.json',
                source: JSON.stringify(index),
            });
        },
    };
}
