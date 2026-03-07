/**
 * Toggle a section on any section-row click and navigate to section index
 * when the section has an index page.
 */
export function handleSectionClick(item, key, toggleSection, navigate) {
    toggleSection(key);
    if (item?.type === 'md' && item?.link) {
        navigate(item.link);
    }
}
