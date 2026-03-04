/// <reference types="vite/client" />

declare module 'virtual:greg-frontmatter' {
    type HeroAction = { theme?: 'brand' | 'alt'; text: string; link: string; target?: string; rel?: string };
    type FeatureItem = { icon?: string | { src: string; alt?: string }; title: string; details?: string };
    type FrontmatterEntry = {
        title?: string;
        order?: number;
        layout?: 'doc' | 'home' | 'page';
        hero?: {
            name?: string;
            text?: string;
            tagline?: string;
            image?: unknown;
            actions?: HeroAction[];
        };
        features?: FeatureItem[];
        [key: string]: unknown;
    };
    const frontmatters: Record<string, FrontmatterEntry>;
    export default frontmatters;
}
