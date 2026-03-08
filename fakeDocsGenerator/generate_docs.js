#!/usr/bin/env node
/**
 * FakeDocGen - Fake documentation generator
 *
 * Creates a folder structure with Markdown files containing random text
 * resembling technical documentation.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

// ── Word lists ────────────────────────────────────────────────────────────────

const WORDS = [
    'application', 'system', 'user', 'configuration', 'installation', 'documentation',
    'function', 'module', 'component', 'interface', 'service', 'database', 'data', 'structure',
    'project', 'version', 'update', 'parameter', 'value', 'option', 'setting',
    'platform', 'environment', 'tool', 'process', 'mechanism', 'architecture',
    'implementation', 'solution', 'method', 'algorithm', 'protocol', 'format',
    'file', 'directory', 'path', 'resource', 'element', 'object', 'class', 'variable',
    'feature', 'capability', 'requirement', 'specification', 'standard', 'rule',
    'procedure', 'operation', 'execution', 'startup', 'behavior', 'action',
    'property', 'attribute', 'access', 'permission', 'security', 'authorization',
    'authentication', 'verification', 'validation', 'control', 'monitoring', 'logging',
    'performance', 'optimization', 'scalability', 'reliability', 'availability',
    'compatibility', 'integration', 'communication', 'synchronization', 'replication',
    'creation', 'editing', 'deletion', 'modification', 'management', 'administration',
    'maintenance', 'support', 'guide', 'instruction', 'reference', 'overview',
];

const CONNECTORS = [
    'and', 'or', 'but', 'however', 'therefore', 'thus', 'because', 'since',
    'when', 'if', 'while', 'during', 'after', 'before', 'according to',
    'based on', 'in order to', 'so that', 'as well as', 'in addition to',
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function sample(arr, n) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Name generators ───────────────────────────────────────────────────────────

function generateFilename(maxLength = 20, existingNames = new Set()) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const numWords = randInt(1, 3);
        const words = sample(WORDS, numWords);
        let name = words.join('-');
        if (name.length > maxLength) name = name.slice(0, maxLength).replace(/-+$/, '');
        const filename = `${name}.md`;
        if (!existingNames.has(filename)) {
            existingNames.add(filename);
            return filename;
        }
    }
    // Fallback
    let counter = 1;
    const base = WORDS[0].slice(0, maxLength - 3);
    while (true) {
        const filename = `${base}-${counter}.md`;
        if (!existingNames.has(filename)) { existingNames.add(filename); return filename; }
        counter++;
    }
}

function generateFoldername(maxLength = 20, existingNames = new Set()) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const numWords = randInt(1, 2);
        const words = sample(WORDS, numWords);
        let name = words.join('-');
        if (name.length > maxLength) name = name.slice(0, maxLength).replace(/-+$/, '');
        if (!existingNames.has(name)) {
            existingNames.add(name);
            return name;
        }
    }
    // Fallback
    let counter = 1;
    const base = WORDS[0].slice(0, maxLength - 3);
    while (true) {
        const name = `${base}-${counter}`;
        if (!existingNames.has(name)) { existingNames.add(name); return name; }
        counter++;
    }
}

// ── Content generators ────────────────────────────────────────────────────────

function generateSentence() {
    const length = randInt(5, 15);
    const words = Array.from({ length }, () => WORDS[Math.floor(Math.random() * WORDS.length)]);
    if (words.length > 3 && Math.random() > 0.5) {
        const pos = randInt(2, words.length - 2);
        words.splice(pos, 0, CONNECTORS[Math.floor(Math.random() * CONNECTORS.length)]);
    }
    return capitalize(words.join(' ')) + '.';
}

function generateParagraph() {
    return Array.from({ length: randInt(3, 8) }, generateSentence).join(' ');
}

function generateMarkdownContent(targetSizeKb) {
    const targetSize = targetSizeKb * 1024;
    const lines = [];
    let currentSize = 0;

    const titleWords = [sample(WORDS, 1)[0], sample(WORDS, 1)[0]];
    const titleText = titleWords.map(capitalize).join(' ');

    const frontmatter = `---\ntitle: ${titleText}\n---`;
    lines.push(frontmatter, '');
    currentSize += frontmatter.length + 2;

    lines.push(`# ${titleText}`, '');
    currentSize += titleText.length + 4;

    let sectionCount = 0;
    while (currentSize < targetSize) {
        if (sectionCount % 3 === 0) {
            const sectionTitle = `## ${capitalize(sample(WORDS, 1)[0])} ${sample(WORDS, 1)[0]}`;
            lines.push(sectionTitle, '');
            currentSize += sectionTitle.length + 2;
        }

        const paragraph = generateParagraph();
        lines.push(paragraph, '');
        currentSize += paragraph.length + 2;
        sectionCount++;

        if (Math.random() > 0.7) {
            const itemCount = randInt(3, 6);
            for (let i = 0; i < itemCount; i++) {
                const item = `- ${generateSentence()}`;
                lines.push(item);
                currentSize += item.length + 1;
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}

// ── Folder builder ────────────────────────────────────────────────────────────

function createFolderRecursive(folderPath, currentDepth, opts, stats) {
    const { maxDepth, minDepth, filesPerFolder, filesSpread, minSizeKb, maxSizeKb, maxFilenameLength, filesLimit, indent = '' } = opts;

    mkdirSync(folderPath, { recursive: true });
    stats.totalFolders++;

    const numFiles = randInt(Math.max(1, filesPerFolder - filesSpread), filesPerFolder + filesSpread);
    const existingNames = new Set();

    for (let j = 0; j < numFiles; j++) {
        if (filesLimit != null && stats.totalFiles >= filesLimit) {
            process.stdout.write(`\n⚠️  File limit reached: ${filesLimit}\n⏹️  Stopping\n`);
            return true; // signal: limit reached
        }

        const fileSizeKb = randInt(minSizeKb, maxSizeKb);
        const filename = generateFilename(maxFilenameLength, existingNames);
        const filePath = join(folderPath, filename);
        const content = generateMarkdownContent(fileSizeKb);
        writeFileSync(filePath, content, 'utf8');
        const actualSizeKb = content.length / 1024;
        stats.totalSize += actualSizeKb;
        stats.totalFiles++;
        process.stdout.write(`${indent}  ✓ ${filename} (${actualSizeKb.toFixed(1)} KB)\n`);
    }

    let shouldDescend = false;
    if (currentDepth < maxDepth) {
        shouldDescend = currentDepth < minDepth || Math.random() > 0.4;
    }

    if (shouldDescend) {
        const numSubfolders = randInt(1, 4);
        const existingSubfolderNames = new Set();

        for (let i = 0; i < numSubfolders; i++) {
            const subfolderName = generateFoldername(maxFilenameLength, existingSubfolderNames);
            const subfolderPath = join(folderPath, subfolderName);
            process.stdout.write(`${indent}📁 ${subfolderName}/\n`);

            const limitReached = createFolderRecursive(
                subfolderPath,
                currentDepth + 1,
                { ...opts, indent: indent + '  ' },
                stats,
            );
            if (limitReached) return true;
        }
    }

    return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function createDocumentationStructure(cfg) {
    const {
        output, numFolders, filesPerFolder, filesSpread,
        minSizeKb, maxSizeKb, minDepth, maxDepth,
        maxFilenameLength, filesLimit,
    } = cfg;

    mkdirSync(output, { recursive: true });

    console.log();
    console.log(' ███████╗ █████╗ ██╗  ██╗███████╗    ██████╗  ██████╗  ██████╗     ██████╗ ███████╗███╗   ██╗');
    console.log(' ██╔════╝██╔══██╗██║ ██╔╝██╔════╝    ██╔══██╗██╔═══██╗██╔════╝    ██╔════╝ ██╔════╝████╗  ██║');
    console.log(' █████╗  ███████║█████╔╝ █████╗      ██║  ██║██║   ██║██║         ██║  ███╗█████╗  ██╔██╗ ██║');
    console.log(' ██╔══╝  ██╔══██║██╔═██╗ ██╔══╝      ██║  ██║██║   ██║██║         ██║   ██║██╔══╝  ██║╚██╗██║');
    console.log(' ██║     ██║  ██║██║  ██╗███████╗    ██████╔╝╚██████╔╝╚██████╗    ╚██████╔╝███████╗██║ ╚████║');
    console.log(' ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚═════╝  ╚═════╝  ╚═════╝     ╚═════╝ ╚══════╝╚═╝  ╚═══╝');
    console.log();
    console.log(`🚀 Output path:      ${output}`);
    console.log(`📁 Top-level folders: ${numFolders}`);
    console.log(`📄 Files per folder:  ${filesPerFolder} (±${filesSpread})`);
    console.log(`💾 File size:         ${minSizeKb}–${maxSizeKb} KB`);
    console.log(`🌳 Nesting depth:     ${minDepth}–${maxDepth}`);
    console.log(`📝 Max name length:   ${maxFilenameLength} chars`);
    if (filesLimit != null) console.log(`🔢 File limit:        ${filesLimit}`);
    console.log();

    const stats = { totalFiles: 0, totalSize: 0, totalFolders: 0 };
    const existingFolderNames = new Set();

    // If filesLimit is provided, treat numFolders as a minimum starting point
    // and keep adding top-level folders until the file limit is reached.
    for (let i = 0; i < numFolders || (filesLimit != null && stats.totalFiles < filesLimit); i++) {
        const folderName = generateFoldername(maxFilenameLength, existingFolderNames);
        const folderPath = join(output, folderName);
        process.stdout.write(`📁 ${folderName}/\n`);

        const limitReached = createFolderRecursive(folderPath, 1, {
            maxDepth, minDepth, filesPerFolder, filesSpread,
            minSizeKb, maxSizeKb, maxFilenameLength, filesLimit, indent: '',
        }, stats);

        if (limitReached) break;
    }

    console.log(`\n✨ Done!`);
    console.log(`📊 Created: ${stats.totalFiles} files in ${stats.totalFolders} folders`);
    console.log(`💽 Total size: ${stats.totalSize.toFixed(1)} KB (${(stats.totalSize / 1024).toFixed(2)} MB)`);
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        output:              { type: 'string',  short: 'o', default: 'docs/fake-docs' },
        folders:             { type: 'string',  short: 'f', default: '100' },
        files:               { type: 'string',  short: 'n', default: '100' },
        'files-spread':      { type: 'string',              default: '2' },
        'min-size':          { type: 'string',              default: '1' },
        'max-size':          { type: 'string',              default: '10' },
        'min-depth':         { type: 'string',              default: '1' },
        'max-depth':         { type: 'string',              default: '1' },
        'max-filename-length': { type: 'string',            default: '20' },
        'files-limit':       { type: 'string',              default: undefined },
    },
});

// Allow: npm run gen:docs -- 100  (single positional = files-limit)
// Allow: npm run gen:docs -- 100 ./docs  (positional 1 = limit, 2 = output)
if (positionals[0] != null && args['files-limit'] == null) {
    args['files-limit'] = positionals[0];
}
if (positionals[1] != null) {
    args.output = positionals[1];
}

const minDepth = parseInt(args['min-depth']);
const maxDepth = parseInt(args['max-depth']);

if (minDepth < 1) { console.error('❌ --min-depth must be >= 1'); process.exit(1); }
if (maxDepth < minDepth) { console.error('❌ --max-depth cannot be less than --min-depth'); process.exit(1); }

createDocumentationStructure({
    output:           args.output,
    numFolders:       parseInt(args.folders),
    filesPerFolder:   parseInt(args.files),
    filesSpread:      parseInt(args['files-spread']),
    minSizeKb:        parseInt(args['min-size']),
    maxSizeKb:        parseInt(args['max-size']),
    minDepth,
    maxDepth,
    maxFilenameLength: parseInt(args['max-filename-length']),
    filesLimit:       args['files-limit'] != null ? parseInt(args['files-limit']) : null,
});
