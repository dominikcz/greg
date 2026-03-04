/// <reference types="vite/client" />

declare module 'virtual:greg-frontmatter' {
    type FrontmatterEntry = {
        title?: string;
        order?: number;
        layout?: 'doc' | 'home' | 'page';
        [key: string]: unknown;
    };
    const frontmatters: Record<string, FrontmatterEntry>;
    export default frontmatters;
}
