/**
 * Commit History Cache
 * Stores extraction results to avoid re-fetching
 */

import Conf from 'conf';
import crypto from 'crypto';
import type { Commit, ContributorStats, Tag } from '../types.js';
import type { ExtractionResult } from '../git/extractor.js';

interface CachedExtraction {
  commits: SerializedCommit[];
  contributors: SerializedContributorStats[];
  fromRef: string;
  toRef: string;
  fromTag?: Tag;
  toTag?: Tag;
  dateRange: {
    start: string;
    end: string;
  };
  cachedAt: string;
}

interface SerializedCommit {
  sha: string;
  shortSha: string;
  message: string;
  body: string;
  author: { name: string; email: string };
  date: string;
  files: { path: string; additions: number; deletions: number; status: string }[];
  additions: number;
  deletions: number;
  parents: string[];
}

interface SerializedContributorStats {
  name: string;
  email: string;
  commitCount: number;
  additions: number;
  deletions: number;
  firstCommit: string;
  lastCommit: string;
  topFiles: string[];
  peakHours: string;
  commonWords: string[];
  coAuthors: string[];
  avgDiffSize: number;
  patterns: {
    lateNightRatio: number;
    testFileRatio: number;
    refactorRatio: number;
    docFileRatio: number;
    avgFilesPerCommit: number;
    avgCommitSize: number;
  };
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class CommitCache {
  private config: Conf<Record<string, CachedExtraction>>;

  constructor() {
    this.config = new Conf<Record<string, CachedExtraction>>({
      projectName: 'code-theater',
      configName: 'commit-cache',
    });
  }

  getCacheKey(repoPath: string, fromRef?: string, toRef?: string): string {
    const data = `${repoPath}:${fromRef || 'HEAD'}:${toRef || 'HEAD'}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  get(repoPath: string, fromRef?: string, toRef?: string): ExtractionResult | null {
    const key = this.getCacheKey(repoPath, fromRef, toRef);
    const cached = this.config.get(key);

    if (!cached) {
      return null;
    }

    // Check TTL
    const cachedAt = new Date(cached.cachedAt);
    if (Date.now() - cachedAt.getTime() > CACHE_TTL_MS) {
      this.config.delete(key);
      return null;
    }

    // Deserialize
    return this.deserialize(cached);
  }

  set(repoPath: string, fromRef: string | undefined, toRef: string | undefined, result: ExtractionResult): void {
    const key = this.getCacheKey(repoPath, fromRef, toRef);
    this.config.set(key, this.serialize(result));
  }

  private serialize(result: ExtractionResult): CachedExtraction {
    return {
      commits: result.commits.map(c => ({
        ...c,
        date: c.date.toISOString(),
      })),
      contributors: result.contributors.map(c => ({
        ...c,
        firstCommit: c.firstCommit.toISOString(),
        lastCommit: c.lastCommit.toISOString(),
      })),
      fromRef: result.fromRef,
      toRef: result.toRef,
      fromTag: result.fromTag,
      toTag: result.toTag,
      dateRange: {
        start: result.dateRange.start.toISOString(),
        end: result.dateRange.end.toISOString(),
      },
      cachedAt: new Date().toISOString(),
    };
  }

  private deserialize(cached: CachedExtraction): ExtractionResult {
    return {
      commits: cached.commits.map(c => ({
        ...c,
        date: new Date(c.date),
      })) as Commit[],
      contributors: cached.contributors.map(c => ({
        ...c,
        firstCommit: new Date(c.firstCommit),
        lastCommit: new Date(c.lastCommit),
      })) as ContributorStats[],
      fromRef: cached.fromRef,
      toRef: cached.toRef,
      fromTag: cached.fromTag,
      toTag: cached.toTag,
      dateRange: {
        start: new Date(cached.dateRange.start),
        end: new Date(cached.dateRange.end),
      },
    };
  }

  clear(): void {
    this.config.clear();
  }
}
