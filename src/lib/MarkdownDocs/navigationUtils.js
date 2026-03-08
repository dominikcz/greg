/**
 * Toggle a section on any section-row click and navigate to section index
 * when the section has an index page.
 */
export function handleSectionClick(item, key, toggleSection, navigate) {
    const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

    toggleSection(key);
    if (item?.type === 'md' && item?.link) {
        if (item.target === '_blank') {
            window.open(item.link, '_blank', 'noopener,noreferrer');
            return;
        }

        if (EXTERNAL_RE.test(item.link)) {
            window.location.assign(item.link);
            return;
        }

        navigate(item.link);
    }
}
