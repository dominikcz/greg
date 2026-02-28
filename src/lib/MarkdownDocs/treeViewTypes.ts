export interface TreeViewItem {
    label: string;
    link: string;
    status?: string;
    type?: string;
    children: TreeViewItem[];
}
