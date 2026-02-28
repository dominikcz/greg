export interface TreeViewItem {
    label: string;
    link: string;
    status: string;
    children: [TreeViewItem];
}
