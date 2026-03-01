/**
 * remarkGlobalComponents
 *
 * Injects a <script> block into every processed Markdown file that
 * auto-imports all Greg UI components (Badge, Button, Hero, …).
 *
 * If the file already has a <script> block at or near the top, the
 * import statement is merged into it instead of adding a second block.
 *
 * The import path uses the `$components` Vite alias which must be
 * configured in vite.config.js → resolve.alias.
 */

const COMPONENTS_IMPORT =
  `import { Badge, Button, Image, Link, Feature, Features, Hero, ` +
  `SocialLink, SocialLinks, TeamMember, TeamMembers, ` +
  `TeamPage, TeamPageTitle, TeamPageSection } from '$components/index.js';`;

const SCRIPT_OPEN_RE  = /^<script(\b[^>]*)>/i;
const SCRIPT_CLOSE_RE = /<\/script\s*>/i;

/**
 * Return the index of the first `html` node whose value begins with
 * a <script> tag, searching only the first few nodes.
 */
function findScriptNodeIndex(children) {
  for (let i = 0; i < Math.min(children.length, 4); i++) {
    const node = children[i];
    if (node.type === 'html' && SCRIPT_OPEN_RE.test(node.value.trimStart())) {
      return i;
    }
  }
  return -1;
}

/**
 * The remark plugin function.
 */
export function remarkGlobalComponents() {
  return (tree) => {
    const { children } = tree;
    const idx = findScriptNodeIndex(children);

    if (idx !== -1) {
      // Merge: inject the import after the opening <script …> tag
      const node = children[idx];
      node.value = node.value.replace(
        SCRIPT_OPEN_RE,
        (match) => `${match}\n  ${COMPONENTS_IMPORT}`,
      );
    } else {
      // Prepend a fresh <script> block
      children.unshift({
        type: 'html',
        value: `<script>\n  ${COMPONENTS_IMPORT}\n</script>`,
      });
    }
  };
}
