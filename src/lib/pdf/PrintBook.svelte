<script lang="ts">
    /**
     * PrintBook — the print route (`/__pdf/<book>`).
     *
     * Renders all pages of a PDF book into one document with the same Markdown
     * pipeline as the site (target 'pdf'), then post-processes the whole book
     * (heading levels, numbering, links, TOC, page CSS) and signals readiness via
     * `window.__GREG_PDF__` for `greg pdf`. Opened in a browser it is a live preview.
     */
    import { onMount, tick, untrack } from "svelte";
    import gregConfig from "virtual:greg-config";
    import MarkdownRenderer from "../MarkdownDocs/MarkdownRenderer.svelte";
    import { pathConfig, withBase } from "../MarkdownDocs/common";
    import {
        bookRoutePath,
        bookSrcDir,
        getBookConfig,
        listBookIds,
        readPdfFrontmatter,
        resolveBook,
    } from "./resolveBook.js";
    import { rehypePdfChapter } from "./rehypePdfChapter.js";
    import {
        buildPageCss,
        bookTokens,
        replaceTokens,
        slotsUseToken,
        PLAIN_PAGE,
        COVER_PAGE,
    } from "./pageCss.js";
    import {
        applyHeadingShift,
        applyTocPageNumbers,
        collectTocEntries,
        detectManualNumbers,
        detectManualToc,
        detectOverflow,
        headingNumber,
        headingText,
        normalizeRoute,
        renderToc,
        rewriteLinks,
        waitForImages,
    } from "./printDom.js";
    import {
        buildRefTargets,
        computePageNumbers,
        createRefResolver,
        normalizeNumbering,
        rehypeNumbering,
    } from "../MarkdownDocs/numbering.js";
    import "./print.scss";

    type Props = {
        bookId: string;
        /** Docs root prefix of the active locale (frontmatter key prefix), e.g. '/' or '/docs'. */
        srcDir: string;
        menu: any[];
        frontmatters: Record<string, any>;
        mermaidTheme?: string;
        mermaidThemes?: Record<string, Record<string, unknown>>;
        shikiExtraLangs?: string[];
    };

    let {
        bookId,
        srcDir,
        menu,
        frontmatters,
        mermaidTheme,
        mermaidThemes,
        shikiExtraLangs = [],
    }: Props = $props();

    type Warning = { code: string; message: string };
    type Chapter = {
        key: string;
        kind: "page";
        entry: any;
        chapterId: string;
        fileUrl: string;
        markdown: string | null;
        error?: string;
    };
    type Part = { key: string; kind: "part"; entry: any; partId: string };

    const config = gregConfig as any;
    // The book definition and its manifest are fixed for the lifetime of the route
    // (markdown/config changes trigger a full reload in dev).
    const book = untrack(() => getBookConfig(config.pdf, bookId, config));
    const manifest = untrack(() =>
        book ? resolveBook({ book, frontmatters, menu, srcDir }) : null,
    );
    const docsPrefix = untrack(() => withBase(srcDir));
    const numbering = book ? normalizeNumbering(book.numbering) : null;
    const pageNumbers = manifest && numbering ? computePageNumbers(manifest.entries, numbering.depth) : new Map();
    const refTargets = buildRefTargets(manifest?.entries ?? [], pageNumbers);
    const lang = document.documentElement.lang || "en";
    const isPl = lang.toLowerCase().startsWith("pl");

    let items = $state<Array<Chapter | Part>>([]);
    let cover = $state<{ markdown: string; fileUrl: string } | null>(null);
    let backCover = $state<{ markdown: string; fileUrl: string } | null>(null);
    let status = $state<"loading" | "rendering" | "finishing" | "ready" | "error">("loading");
    let errorText = $state("");
    let warnings = $state<Warning[]>([]);
    let showWarnings = $state(false);
    let showManifest = $state(false);
    let pageCss = $state("");
    let rootEl = $state<HTMLElement | undefined>();
    let tocEl = $state<HTMLElement | undefined>();

    const pending = new Set<string>();
    let finalized = false;
    const startedAt = performance.now();

    function setSignal(extra: Record<string, unknown>) {
        const w = window as any;
        w.__GREG_PDF__ = { ...(w.__GREG_PDF__ ?? {}), ...extra };
    }

    function chapterIdFor(relPath: string, used: Set<string>) {
        const base =
            "c-" +
            (relPath
                .replace(/\.md$/i, "")
                .replace(/[^\p{L}\p{N}]+/gu, "-")
                .replace(/^-+|-+$/g, "")
                .toLowerCase() || "page");
        let id = base;
        for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
        used.add(id);
        return id;
    }

    function docsUrl(relPath: string) {
        const root = srcDir === "/" ? "" : srcDir.replace(/\/+$/, "");
        return withBase(`${root}/${relPath.replace(/^\.?\/+/, "")}`);
    }

    async function fetchText(url: string) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
        return res.text();
    }

    async function mapLimit<T, R>(list: T[], limit: number, fn: (item: T) => Promise<R>) {
        const out: R[] = new Array(list.length);
        let next = 0;
        const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
            while (next < list.length) {
                const index = next++;
                out[index] = await fn(list[index]);
            }
        });
        await Promise.all(workers);
        return out;
    }

    function chapterPlugins(chapterId: string, fileUrl: string, mdKey?: string) {
        return [
            {
                name: "rehype-numbering",
                plugin: rehypeNumbering,
                options: {
                    pageNumber: mdKey ? pageNumbers.get(mdKey) : undefined,
                    numbering,
                    resolveRef: createRefResolver({ fileUrl, base: pathConfig.base, targets: refTargets }),
                },
            },
            {
                name: "rehype-pdf-chapter",
                plugin: rehypePdfChapter,
                options: { chapterId, fileUrl },
            },
        ];
    }

    function markRendered(key: string) {
        if (!pending.has(key)) return;
        pending.delete(key);
        if (!pending.size) void finalize();
    }

    async function load() {
        if (!book || !manifest) {
            status = "error";
            errorText = isPl
                ? `Nieznany dokument PDF „${bookId}”. Dostępne: ${listBookIds(config.pdf).join(", ")}.`
                : `Unknown PDF book "${bookId}". Available: ${listBookIds(config.pdf).join(", ")}.`;
            setSignal({ ready: true, error: errorText });
            return;
        }
        document.title = book.title;
        warnings = [...manifest.warnings];
        if (book.locale && bookSrcDir(book, config) !== (srcDir.replace(/\/+$/, "") || "/")) {
            warnings.push({
                code: "PDF_LOCALE_MISMATCH",
                message: `Book "${bookId}" uses locale ${book.locale}; open ${bookRoutePath(bookId, book, config)} to print it.`,
            });
        }

        const used = new Set<string>();
        const built: Array<Chapter | Part> = manifest.entries.map((entry: any, index: number) =>
            entry.kind === "part"
                ? { key: `part-${index}`, kind: "part", entry, partId: `p-${index + 1}` }
                : {
                      key: entry.mdKey,
                      kind: "page",
                      entry,
                      chapterId: chapterIdFor(entry.relPath, used),
                      fileUrl: withBase(entry.mdKey),
                      markdown: null,
                  },
        );

        const tokens = bookTokens(book);
        const coverPath = typeof book.cover === "string" && book.cover ? book.cover : "";
        const backCoverPath = typeof book.backCover === "string" && book.backCover ? book.backCover : "";
        const fetchCover = (path: string, label: string) =>
            path
                ? fetchText(docsUrl(path)).catch((error) => {
                      warnings.push({ code: "PDF_MISSING_PAGE", message: `${label} ${path}: ${error.message}` });
                      return null;
                  })
                : Promise.resolve(null);
        const [coverMarkdown, backCoverMarkdown] = await Promise.all([
            fetchCover(coverPath, "Cover"),
            fetchCover(backCoverPath, "Back cover"),
            mapLimit(built.filter((item): item is Chapter => item.kind === "page"), 8, async (chapter) => {
                try {
                    chapter.markdown = await fetchText(chapter.fileUrl);
                } catch (error: any) {
                    chapter.error = error.message;
                    warnings.push({ code: "PDF_MISSING_PAGE", message: `${chapter.entry.relPath}: ${error.message}` });
                }
            }),
        ]);

        for (const item of built) {
            if (item.kind === "page" && item.markdown?.trim()) pending.add(item.key);
        }
        if (coverMarkdown?.trim()) {
            cover = { markdown: replaceTokens(coverMarkdown, tokens), fileUrl: docsUrl(coverPath) };
            pending.add("cover");
        }
        if (backCoverMarkdown?.trim()) {
            backCover = { markdown: replaceTokens(backCoverMarkdown, tokens), fileUrl: docsUrl(backCoverPath) };
            pending.add("back-cover");
        }
        items = built;
        status = "rendering";
        setSignal({ ready: false, status, chapters: built.length });
        if (!pending.size) void finalize();
    }

    function loadStylesheets(urls: string[]) {
        return Promise.all(
            urls.map(
                (href) =>
                    new Promise<void>((resolve) => {
                        const link = document.createElement("link");
                        link.rel = "stylesheet";
                        link.href = href;
                        link.dataset.gregPdf = "true";
                        link.onload = () => resolve();
                        link.onerror = () => {
                            warnings.push({ code: "PDF_MISSING_CSS", message: `Stylesheet ${href} could not be loaded.` });
                            resolve();
                        };
                        document.head.appendChild(link);
                    }),
            ),
        );
    }

    async function finalize() {
        if (finalized || !rootEl || !book) return;
        finalized = true;
        status = "finishing";
        await tick();
        const root = rootEl;
        const found: Warning[] = [];

        const chapters = items
            .filter((item): item is Chapter => item.kind === "page")
            .map((item) => ({
                el: root.querySelector<HTMLElement>(`#${CSS.escape(item.chapterId)}`)!,
                chapterId: item.chapterId,
                entry: item.entry,
            }))
            .filter((c) => c.el);

        for (const details of root.querySelectorAll("details")) details.open = true;

        applyHeadingShift(chapters, book.headingShift);
        if (numbering) detectManualNumbers(chapters, found);
        detectManualToc(chapters, found);

        const routes = new Map<string, string>();
        for (const c of chapters) routes.set(normalizeRoute(c.entry.route, "/"), c.chapterId);
        rewriteLinks(root, chapters, { routes, base: pathConfig.base, book, warnings: found });

        // Named pages: running chapter title ({chapter}) and landscape pages (pdf.landscape).
        const plain: string[] = book.page?.plainPages ?? ["cover", "toc", "part"];
        const chapterPages: Array<{ pageName: string; chapter: string; landscape?: boolean }> = [];
        const useChapterTitle = slotsUseToken(book.page, "chapter");
        let currentName: string | null = null;
        let currentTitle = "";
        for (const c of chapters) {
            if (useChapterTitle && (!currentName || (c.entry.level ?? 1) <= 1)) {
                const heading = c.el.querySelector("h1, h2, h3, h4, h5, h6");
                const number = heading ? headingNumber(heading) : "";
                currentTitle = [number, heading ? headingText(heading) : c.entry.title].filter(Boolean).join(" ");
                currentName = `greg-ch-${chapterPages.filter((p) => !p.landscape).length + 1}`;
                chapterPages.push({ pageName: currentName, chapter: currentTitle });
            }
            if (readPdfFrontmatter(c.entry.frontmatter).landscape === true) {
                const name = `${currentName ?? "greg-page"}-landscape`;
                if (!chapterPages.some((p) => p.pageName === name)) {
                    chapterPages.push({ pageName: name, chapter: currentTitle, landscape: true });
                }
                c.el.style.setProperty("page", name);
            } else if (currentName) {
                c.el.style.setProperty("page", currentName);
            }
        }
        for (const coverEl of root.querySelectorAll<HTMLElement>(".pdf-cover, .pdf-back-cover")) {
            coverEl.style.setProperty("page", plain.includes("cover") ? COVER_PAGE : "auto");
        }
        if (plain.includes("toc")) tocEl?.style.setProperty("page", PLAIN_PAGE);
        if (plain.includes("part")) {
            for (const part of root.querySelectorAll<HTMLElement>(".pdf-part")) part.style.setProperty("page", PLAIN_PAGE);
        }
        pageCss = buildPageCss(book, chapterPages);

        if (book.toc && tocEl) {
            const tocTitle = book.toc.title || (isPl ? "Spis treści" : "Contents");
            renderToc(tocEl, collectTocEntries(root, book.toc.depth), tocTitle);
        }

        const cssFiles = (Array.isArray(book.css) ? book.css : book.css ? [book.css] : []) as string[];
        await loadStylesheets(cssFiles.map(docsUrl));
        const brokenImages = await waitForImages(root);
        for (const src of brokenImages) found.push({ code: "PDF_MISSING_IMAGE", message: `Image ${src} could not be loaded.` });
        await document.fonts?.ready;
        detectOverflow(chapters, found);

        warnings = [...warnings, ...found];
        status = "ready";
        const tocTargets = Array.from(root.querySelectorAll<HTMLElement>(".pdf-toc-page[data-target]")).map(
            (el) => el.dataset.target!,
        );
        const tocEntries = Array.from(root.querySelectorAll<HTMLElement>(".pdf-toc-item a")).map((a) => ({
            target: a.querySelector<HTMLElement>(".pdf-toc-page")?.dataset.target ?? "",
            text: a.querySelector(".pdf-toc-text")?.textContent ?? "",
        }));
        setSignal({
            ready: true,
            status,
            book: {
                id: book.id,
                title: book.title,
                subtitle: book.subtitle ?? "",
                author: book.author ?? "",
                version: book.version ?? "",
                output: book.output ?? "",
                lang,
                toc: book.toc ? { pageNumbers: book.toc.pageNumbers !== false } : false,
            },
            pages: chapters.length,
            excluded: manifest?.excluded ?? [],
            headings: Array.from(root.querySelectorAll<HTMLElement>(".pdf-chapter :is(h1, h2, h3, h4, h5, h6)"))
                .filter((h) => h.id)
                .map((h) => ({ id: h.id, level: Number(h.tagName.slice(1)), text: headingText(h), number: headingNumber(h) })),
            tocTargets,
            tocEntries,
            images: root.querySelectorAll("img").length,
            warnings: $state.snapshot(warnings),
            renderMs: Math.round(performance.now() - startedAt),
            setPageNumbers: (pages: Record<string, number>) => applyTocPageNumbers(root, pages),
        });
    }

    onMount(() => {
        setSignal({ ready: false, status: "loading" });
        void load().catch((error) => {
            status = "error";
            errorText = String(error?.message ?? error);
            setSignal({ ready: true, error: errorText });
        });
    });

    // Page rules go to <head> as text (never as HTML), so headings cannot inject markup.
    $effect(() => {
        if (!pageCss) return;
        const style = document.createElement("style");
        style.dataset.gregPdfPage = "true";
        style.textContent = pageCss;
        document.head.appendChild(style);
        return () => style.remove();
    });

    /**
     * Page breaks around a chapter: `chapterBreak` (level-1 chapters, 'all' pages or
     * 'right' = start on a right-hand page) overridden per page by frontmatter
     * `pdf.break`: 'before' | 'after' | 'avoid' | 'none'.
     */
    function chapterBreaks(entry: any) {
        const mode = book?.chapterBreak;
        const byConfig = mode !== false && ((entry.level ?? 1) <= 1 || mode === "all");
        const requested = readPdfFrontmatter(entry.frontmatter).break;
        const before = requested === "before" || (byConfig && requested !== "none" && requested !== "avoid");
        return {
            before: before && mode !== "right",
            right: before && mode === "right",
            after: requested === "after",
            avoid: requested === "avoid",
        };
    }

    const statusLabel = $derived(
        isPl
            ? { loading: "Wczytywanie…", rendering: "Renderowanie…", finishing: "Składanie…", ready: "Gotowe", error: "Błąd" }[status]
            : { loading: "Loading…", rendering: "Rendering…", finishing: "Assembling…", ready: "Ready", error: "Error" }[status],
    );
</script>

<div class="pdf-toolbar" role="status">
    <strong>{book?.title ?? bookId}</strong>
    <span class="pdf-toolbar-status" data-status={status}>{statusLabel}</span>
    {#if manifest}
        <button type="button" aria-pressed={showManifest} onclick={() => (showManifest = !showManifest)}>
            {isPl ? "Zawartość" : "Contents"}: {manifest.entries.filter((e: any) => e.kind === "page").length}
            {#if manifest.excluded.length}(+{manifest.excluded.length} {isPl ? "wykluczone" : "excluded"}){/if}
        </button>
    {/if}
    {#if warnings.length}
        <button type="button" onclick={() => (showWarnings = !showWarnings)}>
            {isPl ? "Ostrzeżenia" : "Warnings"}: {warnings.length}
        </button>
    {/if}
    {#if status === "ready"}
        <button type="button" onclick={() => window.print()}>{isPl ? "Drukuj" : "Print"}</button>
    {/if}
    {#if showWarnings}
        <ul class="pdf-toolbar-warnings">
            {#each warnings as warning, i (i)}
                <li><code>{warning.code}</code> {warning.message}</li>
            {/each}
        </ul>
    {/if}
</div>

{#if showManifest && manifest}
    <aside class="pdf-manifest" aria-label={isPl ? "Zawartość dokumentu" : "Book contents"}>
        <ol class="pdf-manifest-list">
            {#each items as item (item.key)}
                <li class:pdf-manifest-part={item.kind === "part"} style:padding-left={`${Math.max(0, (item.entry.level ?? 1) - 1)}em`}>
                    {#if item.kind === "part"}
                        <strong>{item.entry.title}</strong>
                    {:else}
                        <a
                            href={`#${item.chapterId}`}
                            onclick={(event) => {
                                event.preventDefault();
                                document.getElementById(item.chapterId)?.scrollIntoView({ block: "start" });
                            }}
                        >
                            {#if pageNumbers.get(item.entry.mdKey)}
                                <span class="pdf-manifest-number">{pageNumbers.get(item.entry.mdKey)?.join(".")}.</span>
                            {/if}
                            {item.entry.title || item.entry.relPath}
                        </a>
                        <small>{item.entry.relPath}{item.error ? ` — ${item.error}` : ""}</small>
                    {/if}
                </li>
            {/each}
        </ol>
        {#if manifest.excluded.length}
            <h3>{isPl ? "Wykluczone" : "Excluded"}</h3>
            <ul class="pdf-manifest-excluded">
                {#each manifest.excluded as excluded (excluded.mdKey)}
                    <li><code>{excluded.mdKey}</code> <small>{excluded.reason}</small></li>
                {/each}
            </ul>
        {/if}
    </aside>
{/if}

<div class="greg greg-print" data-theme="light" bind:this={rootEl}>
    {#if status === "error"}
        <p class="pdf-error">{errorText}</p>
    {:else}
        {#if cover}
            <section class="pdf-cover">
                <MarkdownRenderer
                    markdown={cover.markdown}
                    baseUrl={cover.fileUrl}
                    {docsPrefix}
                    target="pdf"
                    {bookId}
                    {mermaidTheme}
                    {mermaidThemes}
                    {shikiExtraLangs}
                    colorTheme="light"
                    enableImagePreview={false}
                    extraRehypePlugins={chapterPlugins("cover", cover.fileUrl)}
                    onrendered={() => markRendered("cover")}
                />
            </section>
        {/if}
        {#if book?.toc}
            <nav class="pdf-toc" bind:this={tocEl}></nav>
        {/if}
        {#each items as item (item.key)}
            {#if item.kind === "part"}
                <section class="pdf-part" id={item.partId}>
                    <svelte:element this={`h${Math.min(6, Math.max(1, item.entry.level))}`} class="pdf-part-title" id={`${item.partId}--title`}>
                        {item.entry.title}
                    </svelte:element>
                    {#if item.entry.intro}<p class="pdf-part-intro">{item.entry.intro}</p>{/if}
                </section>
            {:else}
                {@const breaks = chapterBreaks(item.entry)}
                <section
                    class="pdf-chapter"
                    class:pdf-break-before={breaks.before}
                    class:pdf-break-right={breaks.right}
                    class:pdf-break-after={breaks.after}
                    class:pdf-break-avoid={breaks.avoid}
                    class:pdf-unnumbered={item.entry.numbered === false}
                    id={item.chapterId}
                    data-level={item.entry.level}
                    data-source={item.entry.relPath}
                >
                    {#if item.markdown?.trim()}
                        <MarkdownRenderer
                            markdown={item.markdown}
                            baseUrl={item.fileUrl}
                            {docsPrefix}
                            target="pdf"
                            {bookId}
                            {mermaidTheme}
                            {mermaidThemes}
                            {shikiExtraLangs}
                            colorTheme="light"
                            enableImagePreview={false}
                            extraRehypePlugins={chapterPlugins(item.chapterId, item.fileUrl, item.entry.mdKey)}
                            onrendered={() => markRendered(item.key)}
                        />
                    {:else if item.error}
                        <p class="pdf-error">{item.error}</p>
                    {/if}
                </section>
            {/if}
        {/each}
        {#if backCover}
            <section class="pdf-back-cover">
                <MarkdownRenderer
                    markdown={backCover.markdown}
                    baseUrl={backCover.fileUrl}
                    {docsPrefix}
                    target="pdf"
                    {bookId}
                    {mermaidTheme}
                    {mermaidThemes}
                    {shikiExtraLangs}
                    colorTheme="light"
                    enableImagePreview={false}
                    extraRehypePlugins={chapterPlugins("back-cover", backCover.fileUrl)}
                    onrendered={() => markRendered("back-cover")}
                />
            </section>
        {/if}
    {/if}
</div>
