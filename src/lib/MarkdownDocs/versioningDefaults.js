export const DEFAULT_SITE_BASE = '/';
export const DEFAULT_OUTPUT_BASE_DIR = 'dist';
export const DEFAULT_VERSIONS_DIR_NAME = '__versions';
export const LEGACY_VERSIONS_DIR_NAME = 'versions';

export const DEFAULT_OUTPUT_ROOT = `${DEFAULT_OUTPUT_BASE_DIR}/${DEFAULT_VERSIONS_DIR_NAME}`;
export const DEFAULT_PATH_PREFIX = `/${DEFAULT_VERSIONS_DIR_NAME}`;

export function normalizeBasePath(value, fallback = DEFAULT_SITE_BASE) {
	const raw = String(value ?? fallback).trim();
	if (!raw || raw === '/') return '/';
	const cleaned = raw.replace(/^\/+|\/+$/g, '');
	return `/${cleaned}/`;
}

export function buildDefaultVersionPathPrefix(basePath) {
	const normalizedBase = normalizeBasePath(basePath);
	if (normalizedBase === '/') return DEFAULT_PATH_PREFIX;
	return `${normalizedBase.replace(/\/$/, '')}/${DEFAULT_VERSIONS_DIR_NAME}`;
}
