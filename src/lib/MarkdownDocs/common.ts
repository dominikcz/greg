import gregConfig from "virtual:greg-config";

const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;
const SLASHES_RE = /\/+/g;

function normalizeBase(value: unknown): string {
    const raw = String(value || "/").trim();
    return raw === "/" ? "/" : `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

export function joinPath(base: string, path: string) {
  return `${base}${path}`.replace(SLASHES_RE, '/')
}

export const pathConfig = {
    base: normalizeBase((gregConfig as any).base),
    srcDir: String((gregConfig as any).srcDir || "docs").replace(SLASHES_RE, '/'),
    docsBase: String((gregConfig as any).docsBase || "docs").replace(SLASHES_RE, '/'),
};

export function withBase(path: string): string {
    if (EXTERNAL_RE.test(path) || !path.startsWith("/")) return path;
    return joinPath(pathConfig.base, path);
}

export function withoutBase(path: string): string {
    if (EXTERNAL_RE.test(path) || !path.startsWith("/")) return path;
    return joinPath('/', path.replace(pathConfig.base, ''));
}

