# Greg

TODO:

- komponenty z rehype:
  - [x] TOC
  - [x] Custom Containers 
  - [x] code groups
  - [x] slugs + autolinks
  - [x] shiki
  - [x] include MD: <!--@include: ./__partial.md-->
  - [x] code snippets: <<< @/filepath
- [x] obsługa frontmatter
- [x] obsługa layout w markdown
- [x] nazwy w menu z frontmatter

0.7 ✅
- [x] konfiguracja w jednym dedykowanym pliku greg.config.js (`vitePluginGregConfig`)
- [x] dodatki do frontmatter:
  - [x] sterowanie outline kompatybilne z VitePress (per-page `outline:` frontmatter)
  - [x] badge dla strony (`badge:` frontmatter, pokazywany w nawigacji)
- [x] możliwość nadpisania sidebar w konfiguracji (`sidebar: 'auto' | SidebarItem[]`)
  - domyślnie `'auto'` (istniejące zachowanie)
  - na sztywno lub z automatycznymi fragmentami (`auto:` w pozycji sidebar)
- [x] konfigurowalne parametry (prop lub greg.config.js):
  - [x] pokazywanie breadcrumb w dokumencie (`breadcrumb: true`)
  - [x] back to top (`backToTop: true`)
  - [x] pokazywanie daty ostatniej modyfikacji strony (`lastModified: true`)
- [x] nawigacja prev/next kompatybilna z VitePress (auto + frontmatter `prev:`/`next:`)

0.8
- [x] wyszukiwanie lokalne i po stronie serwera
- [x] pakiet
- [x] obsługa CLI `greg dev`, `greg build`
- [x] komponent steps jak w Starlight

0.9
- [ ] integracja z AI
- [ ] wersja wielojęzyczna
- [ ] wersje dokumentacji

1.0 
- [ ] tryb edycji
- [ ] komentarze
- porządki w kodzie, formatowanie itd. itp.