/**
 * Filesystem-backed download cache.
 *
 * Phase 1 of the ingestion pipeline keeps this minimal: every download is
 * keyed by URL and stored under `scripts/data/raw/`. Re-runs reuse the cached
 * copy. The plan calls for an upgrade to DuckDB + ETag-keyed entries once
 * we're pulling multi-GB datasets monthly; for the median_price proof of
 * concept a plain file is enough.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface CacheOptions {
  /** Cache root, typically `scripts/data/raw`. */
  rootDir: string
}

function keyFor(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 16)
}

export class DownloadCache {
  constructor(private readonly opts: CacheOptions) {
    mkdirSync(opts.rootDir, { recursive: true })
  }

  pathFor(url: string, suffix = ''): string {
    return join(this.opts.rootDir, `${keyFor(url)}${suffix}`)
  }

  has(url: string, suffix = ''): boolean {
    return existsSync(this.pathFor(url, suffix))
  }

  read(url: string, suffix = ''): Buffer {
    return readFileSync(this.pathFor(url, suffix))
  }

  write(url: string, body: Buffer | string, suffix = ''): string {
    const p = this.pathFor(url, suffix)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, body)
    return p
  }
}
