import gregConfig from "virtual:greg-config";

const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

function normalizeBase(value: unknown): string {
    const raw = String(value || "/").trim();
    return raw === "/" ? "/" : `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

export const pathConfig = {
    base: normalizeBase((gregConfig as any).base),
    srcDir: String((gregConfig as any).srcDir || "docs").replace(/\/$/, ""),
    docsBase: String((gregConfig as any).docsBase || "docs").replace(/\/$/, ""),
};

export function withBase(path: string): string {
    if (EXTERNAL_RE.test(path) || !path.startsWith("/")) return path;
    return `${pathConfig.base}${path}`.replace(/\/{2,}/g, "/");
}

export function toSourcePath(path: string): string {
    if (EXTERNAL_RE.test(path) || !path.startsWith("/")) return path;
    // we always strip the base
    if (path.startsWith(`${pathConfig.base}`)) {
        path = path.slice(pathConfig.base.length);
    }
    if (path.startsWith(`${pathConfig.docsBase}`)) {
        return path.replace(`${pathConfig.docsBase}`, `${pathConfig.srcDir}`);
    }
    return path;
}

