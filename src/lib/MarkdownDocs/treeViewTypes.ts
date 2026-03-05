export interface TreeViewItem {
    label: string;
    link: string;
    status?: string;
    /** Optional badge displayed next to the label in the navigation tree. */
    badge?: { text: string; type?: string };
    type?: string;
    children: TreeViewItem[];
}
