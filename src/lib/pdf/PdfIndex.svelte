<script lang="ts">
    /**
     * PdfIndex — `/__pdf`: list of the PDF books defined in greg.config, with
     * their resolved content size and links to the live preview of each book.
     */
    import gregConfig from "virtual:greg-config";
    import { withBase } from "../MarkdownDocs/common";
    import { getBookConfig, listBookIds, resolveBook, PDF_ROUTE_PREFIX } from "./resolveBook.js";
    import "./print.scss";

    type Props = {
        srcDir: string;
        menu: any[];
        frontmatters: Record<string, any>;
    };

    let { srcDir, menu, frontmatters }: Props = $props();

    const config = gregConfig as any;
    const isPl = (document.documentElement.lang || "").toLowerCase().startsWith("pl");
    const t = isPl
        ? { heading: "Publikacje PDF", pages: "stron źródłowych", excluded: "wykluczonych", warnings: "ostrzeżeń", preview: "Podgląd", output: "Plik", cli: "Generowanie", implicit: "Brak sekcji pdf w konfiguracji — dostępny jest domyślny dokument z treścią menu bocznego." }
        : { heading: "PDF books", pages: "source pages", excluded: "excluded", warnings: "warnings", preview: "Preview", output: "Output", cli: "Generate", implicit: "No pdf section in the config — the default book follows the sidebar." };

    const books = $derived(
        listBookIds(config.pdf).map((id) => {
            const book = getBookConfig(config.pdf, id, config)!;
            const manifest = resolveBook({ book, frontmatters, menu, srcDir });
            return {
                id,
                book,
                pages: manifest.entries.filter((e: any) => e.kind === "page").length,
                excluded: manifest.excluded.length,
                warnings: manifest.warnings.length,
                href: withBase(`${PDF_ROUTE_PREFIX}${encodeURIComponent(id)}`),
                output: book.output || `${config.outDir || "dist"}/pdf/${id}.pdf`,
            };
        }),
    );

    $effect(() => {
        document.title = t.heading;
    });
</script>

<div class="greg greg-print pdf-index" data-theme="light">
    <h1>{t.heading}</h1>
    {#if !config.pdf?.books || !Object.keys(config.pdf.books).length}
        <p class="pdf-index-note">{t.implicit}</p>
    {/if}
    <ul class="pdf-index-list">
        {#each books as item (item.id)}
            <li>
                <a class="pdf-index-title" href={item.href}>{item.book.title}</a>
                {#if item.book.subtitle}<span class="pdf-index-subtitle">{item.book.subtitle}</span>{/if}
                <div class="pdf-index-meta">
                    <code>{item.id}</code>
                    {#if item.book.version}<span>v{item.book.version}</span>{/if}
                    <span>{item.pages} {t.pages}</span>
                    {#if item.excluded}<span>{item.excluded} {t.excluded}</span>{/if}
                    {#if item.warnings}<span class="pdf-index-warn">{item.warnings} {t.warnings}</span>{/if}
                </div>
                <div class="pdf-index-meta">
                    <a href={item.href}>{t.preview} →</a>
                    <span>{t.output}: <code>{item.output}</code></span>
                    <span>{t.cli}: <code>npx greg pdf {item.id}</code></span>
                </div>
            </li>
        {/each}
    </ul>
</div>

<style>
    .pdf-index {
        font: 15px/1.5 system-ui, sans-serif;
    }

    .pdf-index h1 {
        margin: 0 0 1rem;
        font-size: 1.6rem;
    }

    .pdf-index-note {
        color: var(--pdf-muted);
    }

    .pdf-index-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .pdf-index-list li {
        padding: 0.9rem 0;
        border-top: 1px solid var(--pdf-rule);
    }

    .pdf-index-title {
        font-size: 1.15rem;
        font-weight: 600;
    }

    .pdf-index-subtitle {
        margin-left: 0.5rem;
        color: var(--pdf-muted);
    }

    .pdf-index-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 1.2rem;
        margin-top: 0.3rem;
        font-size: 0.85rem;
        color: var(--pdf-muted);
    }

    .pdf-index-warn {
        color: #b54708;
    }
</style>
