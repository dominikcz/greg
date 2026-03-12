import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(baseValue, overrideValue) {
    if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
        return overrideValue;
    }

    const result = { ...baseValue };
    for (const [key, overrideEntry] of Object.entries(overrideValue)) {
        const baseEntry = result[key];
        if (isPlainObject(baseEntry) && isPlainObject(overrideEntry)) {
            result[key] = deepMerge(baseEntry, overrideEntry);
            continue;
        }
        result[key] = overrideEntry;
    }

    return result;
}

function normalizeConfig(value) {
    return isPlainObject(value) ? value : {};
}

export function resolveMainGregConfigPath(rootDir = process.cwd()) {
    const tsPath = path.join(rootDir, 'greg.config.ts');
    const jsPath = path.join(rootDir, 'greg.config.js');

    if (fs.existsSync(tsPath)) return tsPath;
    if (fs.existsSync(jsPath)) return jsPath;
    return null;
}

export function resolvePrvGregConfigPath(rootDir = process.cwd()) {
    const prvPath = path.join(rootDir, 'prv', 'greg.config.js');
    return fs.existsSync(prvPath) ? prvPath : null;
}

export function resolveGregConfigPaths(rootDir = process.cwd()) {
    const mainConfigPath = resolveMainGregConfigPath(rootDir);
    const prvConfigPath = resolvePrvGregConfigPath(rootDir);
    return { mainConfigPath, prvConfigPath };
}

export async function loadGregConfigFile(configPath) {
    if (!configPath || !fs.existsSync(configPath)) return {};

    if (configPath.endsWith('.ts')) {
        const { transform } = await import('esbuild');
        const source = fs.readFileSync(configPath, 'utf8');
        const { code } = await transform(source, {
            format: 'esm',
            loader: 'ts',
            target: 'node18',
        });
        const dataUrl = 'data:text/javascript,' + encodeURIComponent(code);
        const mod = await import(dataUrl);
        return normalizeConfig(mod.default);
    }

    const fileUrl = pathToFileURL(configPath).href + '?t=' + Date.now();
    const mod = await import(fileUrl);
    return normalizeConfig(mod.default);
}

export async function loadGregConfig(rootDir = process.cwd()) {
    const { mainConfigPath, prvConfigPath } = resolveGregConfigPaths(rootDir);
    const mainConfig = await loadGregConfigFile(mainConfigPath);

    if (!prvConfigPath) {
        return mainConfig;
    }

    const prvConfig = await loadGregConfigFile(prvConfigPath);
    return deepMerge(mainConfig, prvConfig);
}
