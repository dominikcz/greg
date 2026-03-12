import type { ChunkStore } from '../chunkStore.js';
import type { AiProvider } from '../aiProvider.js';
import type { DocChunk, RetrievedChunk } from '../types.js';

/**
 * SQLite-backed chunk store with hybrid BM25 + vector search.
 *
 * Uses:
 *   - FTS5 for full-text BM25 ranking
 *   - sqlite-vec for cosine-similarity vector search (when embeddings are available)
 *   - WAL mode for concurrent reads
 *
 * Dependencies: better-sqlite3, sqlite-vec (both optional peer deps).
 *
 * Usage:
 *   const store = new SqliteStore({ dbPath: 'docs.db' });
 *   // With vector search:
 *   const store = new SqliteStore({ dbPath: 'docs.db', provider, embeddingDimensions: 1536 });
 */

export type SqliteStoreOptions = {
	/** Path to the SQLite database file. Use ':memory:' for in-memory. Default: ':memory:' */
	dbPath?: string;
	/** Embedding dimensions (e.g. 1536 for OpenAI, 768 for nomic-embed-text). Required for vector search. */
	embeddingDimensions?: number;
	/**
	 * AI provider with embed() support — used to compute embeddings during index().
	 * Omit to use BM25-only mode.
	 */
	provider?: AiProvider;
	/**
	 * How many texts to embed in a single API call. Default: 64.
	 * Larger batches are faster but use more memory / may exceed API limits.
	 */
	embeddingBatchSize?: number;
	/**
	 * Weight for BM25 score in hybrid ranking (0–1). Default: 0.3.
	 * Vector score weight = 1 − bm25Weight.
	 * Only relevant when vector search is enabled.
	 */
	bm25Weight?: number;
};

type Database = import('better-sqlite3').Database;

export class SqliteStore implements ChunkStore {
	private db!: Database;
	private readonly dbPath: string;
	private readonly embDim: number;
	private readonly provider?: AiProvider;
	private readonly batchSize: number;
	private readonly bm25Weight: number;
	private chunkCount = 0;
	private vectorEnabled = false;

	constructor(options: SqliteStoreOptions = {}) {
		this.dbPath = options.dbPath ?? ':memory:';
		this.embDim = options.embeddingDimensions ?? 0;
		this.provider = options.provider;
		this.batchSize = options.embeddingBatchSize ?? 64;
		this.bm25Weight = Math.max(0, Math.min(1, options.bm25Weight ?? 0.3));
	}

	// ── Lazy initialization ─────────────────────────────────────────────────

	private async ensureDb(): Promise<Database> {
		if (this.db) return this.db;

		let BetterSqlite3: typeof import('better-sqlite3');
		try {
			BetterSqlite3 = (await import('better-sqlite3')).default;
		} catch {
			throw new Error(
				'[greg-ai] SqliteStore requires "better-sqlite3" package. Install it with: npm install better-sqlite3',
			);
		}

		this.db = new BetterSqlite3(this.dbPath);
		this.db.pragma('journal_mode = WAL');
		this.db.pragma('synchronous = NORMAL');

		// Try loading sqlite-vec extension for vector search
		if (this.embDim > 0) {
			try {
				const sqliteVec = await import('sqlite-vec');
				sqliteVec.load(this.db);
				this.vectorEnabled = true;
			} catch {
				console.warn(
					'[greg-ai] sqlite-vec not available — falling back to BM25-only mode. ' +
					'Install with: npm install sqlite-vec',
				);
			}
		}

		this.createSchema();
		return this.db;
	}

	private createSchema(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS chunks (
				id        INTEGER PRIMARY KEY,
				page_id   TEXT NOT NULL,
				page_title   TEXT NOT NULL,
				section_heading TEXT NOT NULL,
				section_anchor  TEXT NOT NULL,
				content   TEXT NOT NULL
			);

			CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
				page_title,
				section_heading,
				content,
				content='chunks',
				content_rowid='id',
				tokenize='unicode61 remove_diacritics 2'
			);
		`);

		if (this.vectorEnabled && this.embDim > 0) {
			this.db.exec(`
				CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
					embedding float[${this.embDim}]
				);
			`);
		}
	}

	// ── ChunkStore interface ────────────────────────────────────────────────

	async index(chunks: DocChunk[]): Promise<void> {
		const db = await this.ensureDb();

		// Clear existing data
		db.exec('DELETE FROM chunks_fts');
		db.exec('DELETE FROM chunks');
		if (this.vectorEnabled) {
			db.exec('DELETE FROM chunks_vec');
		}

		// Insert chunks with FTS
		const insertChunk = db.prepare(`
			INSERT INTO chunks (id, page_id, page_title, section_heading, section_anchor, content)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		const insertFts = db.prepare(`
			INSERT INTO chunks_fts (rowid, page_title, section_heading, content)
			VALUES (?, ?, ?, ?)
		`);

		const insertAll = db.transaction((rows: DocChunk[]) => {
			for (let i = 0; i < rows.length; i++) {
				const c = rows[i];
				const id = i + 1;
				insertChunk.run(id, c.pageId, c.pageTitle, c.sectionHeading, c.sectionAnchor, c.content);
				insertFts.run(id, c.pageTitle, c.sectionHeading, c.content);
			}
		});
		insertAll(chunks);

		// Compute and store embeddings if provider supports it
		if (this.vectorEnabled && this.provider?.embed) {
			const insertVec = db.prepare(`
				INSERT INTO chunks_vec (rowid, embedding)
				VALUES (?, ?)
			`);

			const texts = chunks.map(
				c => `${c.pageTitle} — ${c.sectionHeading}\n${c.content}`,
			);

			for (let start = 0; start < texts.length; start += this.batchSize) {
				const batch = texts.slice(start, start + this.batchSize);
				const embeddings = await this.provider.embed(batch);

				const insertBatch = db.transaction((embs: number[][], offset: number) => {
					for (let j = 0; j < embs.length; j++) {
						const id = offset + j + 1;
						insertVec.run(id, new Float32Array(embs[j]));
					}
				});
				insertBatch(embeddings, start);
			}
		}

		this.chunkCount = chunks.length;
	}

	async search(query: string, limit = 8): Promise<RetrievedChunk[]> {
		const db = await this.ensureDb();
		if (this.chunkCount === 0) return [];

		const ftsResults = this.searchBm25(db, query, limit);

		if (!this.vectorEnabled || !this.provider?.embed) {
			return ftsResults.slice(0, limit);
		}

		const vecResults = await this.searchVector(db, query, limit);

		return this.mergeResults(ftsResults, vecResults, limit);
	}

	size(): number {
		return this.chunkCount;
	}

	// ── BM25 full-text search ───────────────────────────────────────────────

	private searchBm25(db: Database, query: string, limit: number): RetrievedChunk[] {
		// FTS5 match query — escape double quotes and join terms
		const sanitized = query.replace(/"/g, '""');
		const ftsQuery = sanitized
			.split(/\s+/)
			.filter(t => t.length > 1)
			.map(t => `"${t}"`)
			.join(' OR ');

		if (!ftsQuery) return [];

		const stmt = db.prepare(`
			SELECT
				c.id,
				c.page_id,
				c.page_title,
				c.section_heading,
				c.section_anchor,
				c.content,
				rank * -1 AS score
			FROM chunks_fts
			JOIN chunks c ON c.id = chunks_fts.rowid
			WHERE chunks_fts MATCH ?
			ORDER BY rank
			LIMIT ?
		`);

		const rows = stmt.all(ftsQuery, limit) as Array<{
			id: number;
			page_id: string;
			page_title: string;
			section_heading: string;
			section_anchor: string;
			content: string;
			score: number;
		}>;

		if (rows.length === 0) return [];

		// Normalize scores to 0–1
		const maxScore = Math.max(...rows.map(r => r.score));
		return rows.map(r => ({
			pageId: r.page_id,
			pageTitle: r.page_title,
			sectionHeading: r.section_heading,
			sectionAnchor: r.section_anchor,
			content: r.content,
			score: maxScore > 0 ? r.score / maxScore : 0,
		}));
	}

	// ── Vector search ───────────────────────────────────────────────────────

	private async searchVector(db: Database, query: string, limit: number): Promise<RetrievedChunk[]> {
		if (!this.provider?.embed) return [];

		const [queryEmbedding] = await this.provider.embed([query]);
		if (!queryEmbedding || queryEmbedding.length === 0) return [];

		const stmt = db.prepare(`
			SELECT
				v.rowid AS id,
				v.distance,
				c.page_id,
				c.page_title,
				c.section_heading,
				c.section_anchor,
				c.content
			FROM chunks_vec v
			JOIN chunks c ON c.id = v.rowid
			WHERE v.embedding MATCH ?
			AND k = ?
			ORDER BY v.distance
		`);

		const rows = stmt.all(new Float32Array(queryEmbedding), limit) as Array<{
			id: number;
			distance: number;
			page_id: string;
			page_title: string;
			section_heading: string;
			section_anchor: string;
			content: string;
		}>;

		if (rows.length === 0) return [];

		// Convert cosine distance to similarity score (0–1)
		return rows.map(r => ({
			pageId: r.page_id,
			pageTitle: r.page_title,
			sectionHeading: r.section_heading,
			sectionAnchor: r.section_anchor,
			content: r.content,
			score: Math.max(0, 1 - r.distance),
		}));
	}

	// ── Hybrid merge ────────────────────────────────────────────────────────

	/**
	 * Reciprocal Rank Fusion (RRF) merging of BM25 and vector results.
	 * Each result gets a combined score: bm25Weight * rrf(bm25_rank) + vecWeight * rrf(vec_rank).
	 */
	private mergeResults(
		bm25Results: RetrievedChunk[],
		vecResults: RetrievedChunk[],
		limit: number,
	): RetrievedChunk[] {
		const K = 60; // RRF constant
		const vecWeight = 1 - this.bm25Weight;

		// Build a map of chunk key → merged chunk + score
		const merged = new Map<string, { chunk: RetrievedChunk; score: number }>();

		function chunkKey(c: RetrievedChunk): string {
			return `${c.pageId}#${c.sectionAnchor}#${c.content.slice(0, 80)}`;
		}

		for (let rank = 0; rank < bm25Results.length; rank++) {
			const c = bm25Results[rank];
			const key = chunkKey(c);
			const rrfScore = this.bm25Weight * (1 / (K + rank + 1));
			const existing = merged.get(key);
			if (existing) {
				existing.score += rrfScore;
			} else {
				merged.set(key, { chunk: c, score: rrfScore });
			}
		}

		for (let rank = 0; rank < vecResults.length; rank++) {
			const c = vecResults[rank];
			const key = chunkKey(c);
			const rrfScore = vecWeight * (1 / (K + rank + 1));
			const existing = merged.get(key);
			if (existing) {
				existing.score += rrfScore;
			} else {
				merged.set(key, { chunk: c, score: rrfScore });
			}
		}

		// Sort by merged score, normalize, and return top-limit
		const sorted = [...merged.values()].sort((a, b) => b.score - a.score);
		const maxScore = sorted[0]?.score ?? 1;

		return sorted.slice(0, limit).map(({ chunk, score }) => ({
			...chunk,
			score: maxScore > 0 ? score / maxScore : 0,
		}));
	}

	// ── Cleanup ─────────────────────────────────────────────────────────────

	/** Close the database connection. Call when the server shuts down. */
	close(): void {
		if (this.db) {
			this.db.close();
		}
	}
}
