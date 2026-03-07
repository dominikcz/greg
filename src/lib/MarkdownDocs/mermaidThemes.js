/**
 * mermaidThemes.js
 *
 * Built-in Mermaid diagram theme definitions.
 * Each entry maps to a `MermaidConfig` object accepted by `mermaid.initialize()`.
 *
 * Colours inside `themeCSS` use CSS custom-property tokens (--mmd-*)
 * defined in markdownDocs.scss, so diagrams react to Greg's light/dark
 * mode via the CSS cascade — no JS re-render required for colour changes.
 *
 * `themeVariables` are baked into the SVG at render-time.
 * MarkdownRenderer swaps between `material` (light) and `material-dark`
 * when `colorTheme` changes, triggering a full SVG re-render so that
 * background and internal mermaid colour math are also correct.
 *
 * Material theme design inspired by https://github.com/gotoailab/modern_mermaid
 */

// ── Shared Material themeCSS ─────────────────────────────────────────────────
// Used by both `material` (light) and `material-dark`.
// All colour values are CSS variable references resolved at paint-time.

const MATERIAL_CSS = `
    /* ── Flowchart nodes ──────────────────────────────────── */
    .node rect, .node circle, .node polygon {
        fill:   var(--mmd-node-bg) !important;
        stroke: none               !important;
        rx: 4px !important; ry: 4px !important;
        filter: var(--mmd-shadow-sm);
    }
    .node .label {
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
        font-weight: 500;
        fill: var(--mmd-text) !important;
        font-size: 14px;
    }
    .edgePath .path {
        stroke: var(--mmd-line) !important; stroke-width: 2px !important;
        stroke-linecap: round;
    }
    .arrowheadPath { fill: var(--mmd-line) !important; stroke: var(--mmd-line) !important; }
    .edgeLabel {
        background-color: var(--mmd-node-bg) !important;
        color: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
        font-weight: 500; font-size: 13px;
    }

    /* ── Sequence diagram ─────────────────────────────────── */
    .actor rect, g.actor rect, rect.actor {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
        rx: 4px !important; ry: 4px !important;
        filter: var(--mmd-shadow-sm) !important;
    }
    .actor { fill: var(--mmd-node-bg) !important; stroke: none !important; }
    g.actor { filter: var(--mmd-shadow-sm); }
    .actor text {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 500;
    }
    .actor-line {
        stroke: var(--mmd-actor-line) !important; stroke-width: 2px !important;
        stroke-dasharray: 4 4 !important;
    }
    .activation0, .activation1, .activation2,
    rect.activation0, rect.activation1, rect.activation2 {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
        filter: var(--mmd-shadow-sm) !important;
    }
    .messageLine0, .messageLine1 {
        stroke: var(--mmd-line) !important; stroke-width: 2px !important;
    }
    .messageText {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
        font-weight: 500; font-size: 13px;
    }
    #arrowhead path, .arrowheadPath {
        fill: var(--mmd-line) !important; stroke: var(--mmd-line) !important;
    }

    /* Note boxes */
    .note, rect.note, g.note rect {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
        rx: 4px !important; ry: 4px !important;
        filter: var(--mmd-shadow-md) !important;
    }
    .noteText, text.noteText {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 500;
    }

    /* Loop / Alt / Opt boxes */
    .labelBox {
        fill: var(--mmd-node-bg) !important; stroke: var(--mmd-border) !important;
        stroke-width: 1px !important; rx: 4px !important; ry: 4px !important;
    }
    .labelText, .loopText, text.labelText, text.loopText {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 500;
    }
    .loopLine { stroke: var(--mmd-actor-line) !important; stroke-width: 2px !important; }

    /* ── Cluster / Subgraph ───────────────────────────────── */
    .cluster rect {
        fill: var(--mmd-node-bg) !important; stroke: var(--mmd-border) !important;
        stroke-width: 1px !important; rx: 8px !important; ry: 8px !important;
        filter: var(--mmd-shadow-sm);
    }
    .cluster text {
        fill: var(--mmd-text-sub) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
        font-weight: 500; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;
    }

    /* ── Class diagram ────────────────────────────────────── */
    .classGroup rect, g.classGroup rect,
    g[id*="classid"] rect, g[id^="classid"] rect,
    svg[aria-roledescription="classDiagram"] g.classGroup rect {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
        rx: 4px !important; ry: 4px !important;
        filter: var(--mmd-shadow-sm) !important;
    }
    .classLabel .label, .classLabel text, .class-label text {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 500;
    }
    .relationshipLine, .relation { stroke: var(--mmd-line) !important; stroke-width: 2px !important; }
    .divider { stroke: var(--mmd-border) !important; stroke-width: 1px !important; }

    /* ── State diagram ────────────────────────────────────── */
    g[id*="state-"] rect, g[id^="state-"] rect, g.stateGroup rect,
    .statediagram-state rect, .statediagram-state .state-inner, g[class*="state"] rect,
    svg[aria-roledescription="statediagram"] g rect:not(circle):not([id*="start"]):not([id*="end"]) {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
        rx: 4px !important; ry: 4px !important;
        filter: var(--mmd-shadow-sm) !important;
    }
    .start-state circle, .end-state circle, circle[id*="start"], circle[id*="end"] {
        fill: var(--mmd-accent-1) !important; stroke: none !important;
        filter: var(--mmd-shadow-acc1);
    }
    .statediagram-state circle { stroke: none !important; }
    .stateLabel text, .statediagram-state text, .state-note text {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 500;
    }
    .transition, path.transition { stroke: var(--mmd-line) !important; stroke-width: 2px !important; }
    g.stateGroup.statediagram-cluster rect {
        fill: var(--mmd-node-bg) !important; stroke: var(--mmd-border) !important;
        stroke-width: 1px !important; rx: 8px !important; ry: 8px !important;
    }

    /* ── ER diagram ───────────────────────────────────────── */
    .er.entityBox, .entityBox, g[id*="entity-"] rect, g[id^="entity"] rect,
    svg[aria-roledescription="er"] .entityBox, svg[aria-roledescription="er"] g rect {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
        rx: 4px !important; ry: 4px !important;
        filter: var(--mmd-shadow-sm) !important;
    }
    .er .attributeBoxEven, .er .attributeBoxOdd {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
    }

    /* ── Gantt chart ──────────────────────────────────────── */
    .titleText, text.titleText {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
        font-weight: 500; text-transform: uppercase; letter-spacing: 1.25px;
    }
    .sectionTitle, text.sectionTitle {
        fill: var(--mmd-text-sub) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 500;
    }
    .taskText, .taskTextOutsideRight, .taskTextOutsideLeft, text.taskText {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 400;
    }
    .task0, .task1, .task2, .task3, rect.task, rect[class*="task"],
    svg[aria-roledescription="gantt"] rect.task, g.task rect {
        stroke: none !important; rx: 4px !important;
        filter: var(--mmd-shadow-sm) !important;
    }
    .taskText0, .taskText1, .taskText2, .taskText3 { fill: var(--mmd-text) !important; }
    .grid .tick line { stroke: var(--mmd-border) !important; }
    .grid path        { stroke: none              !important; }

    /* ── Pie chart ────────────────────────────────────────── */
    .pieCircle, circle.pieCircle { stroke: none !important; }
    .pieTitleText, text.pieTitleText {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
        font-weight: 500; text-transform: uppercase; letter-spacing: 1.25px;
    }
    .legendText, text.legendText, text.legend {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif; font-weight: 400;
    }
    .slice, path.slice, svg[aria-roledescription="pie"] path {
        stroke: var(--mmd-canvas) !important; stroke-width: 2px !important;
        filter: var(--mmd-shadow-sm) !important;
    }
    .pieChart .slice0 { fill: var(--mmd-accent-1) !important; }
    .pieChart .slice1 { fill: var(--mmd-accent-2) !important; }
    .pieChart .slice2 { fill: var(--mmd-accent-3) !important; }
    .pieChart .slice3 { fill: var(--mmd-accent-4) !important; }
    .pieChart .slice4 { fill: var(--mmd-accent-5) !important; }
    .pieChart .slice5 { fill: var(--mmd-accent-6) !important; }

    /* ── Journey diagram ──────────────────────────────────── */
    .section0, .section1, .section2 {
        fill: var(--mmd-node-bg) !important; stroke: none !important;
        rx: 4px !important; filter: var(--mmd-shadow-sm);
    }
    .journey-section rect { rx: 4px !important; }

    /* ── XYChart ──────────────────────────────────────────── */
    .line-plot-0 path { stroke: var(--mmd-accent-1) !important; stroke-width: 3px !important; stroke-linecap: round; }
    .line-plot-1 path { stroke: var(--mmd-accent-2) !important; stroke-width: 3px !important; stroke-linecap: round; }
    .line-plot-2 path { stroke: var(--mmd-accent-3) !important; stroke-width: 3px !important; stroke-linecap: round; }
    .bar-plot-0 rect { fill: var(--mmd-accent-1) !important; stroke: none !important; rx: 4px !important; filter: var(--mmd-shadow-sm); }
    .bar-plot-1 rect { fill: var(--mmd-accent-2) !important; stroke: none !important; rx: 4px !important; filter: var(--mmd-shadow-sm); }
    .bar-plot-2 rect { fill: var(--mmd-accent-3) !important; stroke: none !important; rx: 4px !important; filter: var(--mmd-shadow-sm); }
    .ticks path { stroke: var(--mmd-border) !important; }
    .chart-title text {
        fill: var(--mmd-text) !important; font-weight: 500 !important; font-size: 18px !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
        text-transform: uppercase; letter-spacing: 1.25px;
    }
    .left-axis .label text, .bottom-axis .label text {
        fill: var(--mmd-text-sub) !important; font-size: 13px !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
    }
    .left-axis .title text, .bottom-axis .title text {
        fill: var(--mmd-text) !important; font-size: 14px !important; font-weight: 500;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
    }
    .legend text {
        fill: var(--mmd-text) !important; font-size: 13px !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
    }

    /* ── Global text fallback ─────────────────────────────── */
    text {
        fill: var(--mmd-text) !important;
        font-family: "Roboto","Noto Sans SC",-apple-system,sans-serif;
    }
`;

// ── Theme registry ────────────────────────────────────────────────────────────

/** @type {Record<string, import('mermaid').MermaidConfig>} */
export const MERMAID_THEMES = {
    /**
     * Material Design – light variant.
     * White card surfaces, Roboto typography.
     * Colours resolved from --mmd-* CSS tokens at paint-time.
     */
    material: {
        theme: 'base',
        themeVariables: {
            background: '#ffffff',
            primaryColor: '#ffffff',
            primaryTextColor: 'rgba(0, 0, 0, 0.87)',
            primaryBorderColor: '#e0e0e0',
            lineColor: '#757575',
            secondaryColor: '#ffffff',
            tertiaryColor: '#ffffff',
            fontFamily: '"Roboto", "Noto Sans SC", -apple-system, sans-serif',
            fontSize: '14px',
        },
        themeCSS: MATERIAL_CSS,
    },

    /**
     * Material Design – dark variant.
     * Deep-navy surfaces (#2d2d44), elevated accent palette.
     * themeCSS is identical to `material`; colours adapt automatically via
     * --mmd-* tokens redefined under .greg[data-theme="dark"].
     */
    'material-dark': {
        theme: 'base',
        themeVariables: {
            darkMode: true,
            background: '#1e1e2e',
            primaryColor: '#2d2d44',
            primaryTextColor: 'rgba(255, 255, 255, 0.87)',
            primaryBorderColor: '#3e3e5a',
            lineColor: '#9090b8',
            secondaryColor: '#2d2d44',
            tertiaryColor: '#2d2d44',
            fontFamily: '"Roboto", "Noto Sans SC", -apple-system, sans-serif',
            fontSize: '14px',
        },
        themeCSS: MATERIAL_CSS,
    },
};

/** The theme key used when no explicit theme is requested. */
export const DEFAULT_MERMAID_THEME = 'material';

/**
 * Returns the best available theme key for the requested colour scheme.
 *
 * When `colorTheme === 'dark'`, tries `baseTheme + '-dark'` first.
 * Falls back to `baseTheme` if the dark variant is not present in `themes`.
 *
 * @param {string}                   baseTheme  - e.g. 'material'
 * @param {'light'|'dark'|undefined} colorTheme
 * @param {Record<string,unknown>}   themes     - the merged theme map
 * @returns {string}
 */
export function getColorSchemeTheme(baseTheme, colorTheme, themes) {
    if (colorTheme === 'dark') {
        const darkKey = `${baseTheme}-dark`;
        if (darkKey in themes) return darkKey;
    }
    return baseTheme;
}
