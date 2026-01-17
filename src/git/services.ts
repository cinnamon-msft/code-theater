/**
 * Git services for repository operations
 */

import { simpleGit, SimpleGit, LogResult, DiffResult } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import type { Commit, Author, FileChange, Tag, ContributorStats, ContributorPatterns } from '../types.js';

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  static async create(repoPath: string): Promise<GitService> {
    const service = new GitService(repoPath);
    await service.validate();
    return service;
  }

  private async validate(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      throw new Error(`Not a git repository: ${this.repoPath}`);
    }
  }

  async getCommits(from?: string, to?: string): Promise<Commit[]> {
    const log = await this.git.log({
      from: from,
      to: to || 'HEAD',
    });

    return Promise.all(log.all.map(async (entry) => this.parseCommit(entry)));
  }

  private async parseCommit(entry: any): Promise<Commit> {
    const files = await this.getCommitFiles(entry.hash);
    const stats = this.calculateStats(files);

    return {
      sha: entry.hash,
      shortSha: entry.hash.substring(0, 7),
      message: entry.message,
      body: entry.body || '',
      author: {
        name: entry.author_name,
        email: entry.author_email,
      },
      date: new Date(entry.date),
      files,
      additions: stats.additions,
      deletions: stats.deletions,
      parents: entry.refs ? entry.refs.split(', ') : [],
    };
  }

  private async getCommitFiles(sha: string): Promise<FileChange[]> {
    try {
      const diff = await this.git.diff([`${sha}^`, sha, '--numstat', '--name-status']);
      return this.parseDiffOutput(diff);
    } catch {
      // First commit has no parent
      const diff = await this.git.diff([sha, '--numstat', '--name-status']);
      return this.parseDiffOutput(diff);
    }
  }

  private parseDiffOutput(output: string): FileChange[] {
    const files: FileChange[] = [];
    const lines = output.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const numstatMatch = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (numstatMatch) {
        const [, adds, dels, filePath] = numstatMatch;
        files.push({
          path: filePath,
          additions: adds === '-' ? 0 : parseInt(adds, 10),
          deletions: dels === '-' ? 0 : parseInt(dels, 10),
          status: 'modified',
        });
      }
    }

    return files;
  }

  private calculateStats(files: FileChange[]): { additions: number; deletions: number } {
    return files.reduce(
      (acc, file) => ({
        additions: acc.additions + file.additions,
        deletions: acc.deletions + file.deletions,
      }),
      { additions: 0, deletions: 0 }
    );
  }

  async getTags(): Promise<Tag[]> {
    const tags = await this.git.tags();
    const result: Tag[] = [];

    for (const tagName of tags.all) {
      try {
        const show = await this.git.show([tagName, '--format=%H|%ai|%s', '-s']);
        const [sha, date, message] = show.trim().split('|');
        result.push({
          name: tagName,
          sha: sha || '',
          date: new Date(date || Date.now()),
          message,
        });
      } catch {
        result.push({
          name: tagName,
          sha: '',
          date: new Date(),
        });
      }
    }

    return result.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getContributorStats(commits: Commit[]): Promise<ContributorStats[]> {
    // Bot accounts to filter out
    const BOT_PATTERNS = [
      /^copilot$/i,
      /copilot\[bot\]/i,
      /\[bot\]$/i,
      /^dependabot/i,
      /^github-actions/i,
      /^renovate/i,
      /^greenkeeper/i,
      /^snyk-bot/i,
      /^semantic-release-bot/i,
      /^web-flow$/i,
      /^noreply@github\.com$/i,
    ];

    const isBot = (name: string, email: string): boolean => 
      BOT_PATTERNS.some(pattern => pattern.test(name) || pattern.test(email));

    const statsMap = new Map<string, {
      name: string;
      email: string;
      commits: Commit[];
    }>();

    for (const commit of commits) {
      // Skip bot accounts
      if (isBot(commit.author.name, commit.author.email)) {
        continue;
      }

      const key = commit.author.email;
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          name: commit.author.name,
          email: commit.author.email,
          commits: [],
        });
      }
      statsMap.get(key)!.commits.push(commit);
    }

    return Array.from(statsMap.values()).map((data) => 
      this.calculateContributorStats(data.name, data.email, data.commits)
    );
  }

  private calculateContributorStats(
    name: string,
    email: string,
    commits: Commit[]
  ): ContributorStats {
    const sortedCommits = [...commits].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Calculate file frequency
    const fileCount = new Map<string, number>();
    for (const commit of commits) {
      for (const file of commit.files) {
        fileCount.set(file.path, (fileCount.get(file.path) || 0) + 1);
      }
    }
    const topFiles = Array.from(fileCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path]) => path);

    // Calculate peak hours
    const hourCount = new Map<number, number>();
    for (const commit of commits) {
      const hour = commit.date.getHours();
      hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
    }
    const peakHour = Array.from(hourCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
    const peakHours = this.formatPeakHours(peakHour);

    // Calculate common words
    const wordCount = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    for (const commit of commits) {
      const words = commit.message.toLowerCase().split(/\W+/);
      for (const word of words) {
        if (word.length > 2 && !stopWords.has(word)) {
          wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
      }
    }
    const commonWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Calculate patterns
    const patterns = this.calculatePatterns(commits);

    // Calculate totals
    const totalAdditions = commits.reduce((sum, c) => sum + c.additions, 0);
    const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);
    const avgDiffSize = commits.length > 0 ? (totalAdditions + totalDeletions) / commits.length : 0;

    // Find co-authors
    const coAuthorSet = new Set<string>();
    for (const commit of commits) {
      const match = commit.body.match(/Co-authored-by:\s*(.+)/gi);
      if (match) {
        for (const line of match) {
          const authorMatch = line.match(/Co-authored-by:\s*([^<]+)/i);
          if (authorMatch) {
            coAuthorSet.add(authorMatch[1].trim());
          }
        }
      }
    }

    return {
      name,
      email,
      commitCount: commits.length,
      additions: totalAdditions,
      deletions: totalDeletions,
      firstCommit: sortedCommits[0].date,
      lastCommit: sortedCommits[sortedCommits.length - 1].date,
      topFiles,
      peakHours,
      commonWords,
      coAuthors: Array.from(coAuthorSet),
      avgDiffSize,
      patterns,
    };
  }

  private calculatePatterns(commits: Commit[]): ContributorPatterns {
    let lateNightCount = 0;
    let testFileCount = 0;
    let refactorCount = 0;
    let docFileCount = 0;
    let totalFiles = 0;

    for (const commit of commits) {
      const hour = commit.date.getHours();
      if (hour >= 22 || hour < 6) {
        lateNightCount++;
      }

      const message = commit.message.toLowerCase();
      if (message.includes('refactor')) {
        refactorCount++;
      }

      for (const file of commit.files) {
        totalFiles++;
        if (file.path.includes('test') || file.path.includes('spec')) {
          testFileCount++;
        }
        if (file.path.includes('doc') || file.path.endsWith('.md')) {
          docFileCount++;
        }
      }
    }

    const totalCommits = commits.length || 1;

    return {
      lateNightRatio: lateNightCount / totalCommits,
      testFileRatio: totalFiles > 0 ? testFileCount / totalFiles : 0,
      refactorRatio: refactorCount / totalCommits,
      docFileRatio: totalFiles > 0 ? docFileCount / totalFiles : 0,
      avgFilesPerCommit: totalFiles / totalCommits,
      avgCommitSize: commits.reduce((sum, c) => sum + c.additions + c.deletions, 0) / totalCommits,
    };
  }

  private formatPeakHours(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const nextHour = (hour + 2) % 24;
    const nextPeriod = nextHour >= 12 ? 'PM' : 'AM';
    const nextDisplayHour = nextHour % 12 || 12;
    return `${displayHour}-${nextDisplayHour} ${period}`;
  }

  // Tool handlers for AI exploration

  async show(ref: string): Promise<string> {
    try {
      return await this.git.show([ref]);
    } catch (error) {
      return `Error: Could not show ${ref}`;
    }
  }

  async getAuthorStats(author: string): Promise<ContributorStats | null> {
    const log = await this.git.log(['--author', author]);
    if (log.all.length === 0) return null;

    const commits = await Promise.all(log.all.map((entry) => this.parseCommit(entry)));
    return this.calculateContributorStats(
      commits[0].author.name,
      commits[0].author.email,
      commits
    );
  }

  async findRelatedCommits(sha: string, limit: number): Promise<Commit[]> {
    // Get files changed in the commit
    const files = await this.getCommitFiles(sha);
    if (files.length === 0) return [];

    // Find other commits that touched these files
    const relatedShas = new Set<string>();
    for (const file of files.slice(0, 3)) {
      try {
        const log = await this.git.log(['--follow', '-n', String(limit), '--', file.path]);
        for (const entry of log.all) {
          if (entry.hash !== sha) {
            relatedShas.add(entry.hash);
          }
        }
      } catch {
        // File might not exist anymore
      }
    }

    const related: Commit[] = [];
    for (const relatedSha of Array.from(relatedShas).slice(0, limit)) {
      try {
        const log = await this.git.log(['-1', relatedSha]);
        if (log.latest) {
          related.push(await this.parseCommit(log.latest));
        }
      } catch {
        // Skip invalid refs
      }
    }

    return related;
  }

  async blameRange(file: string, startLine: number, endLine: number): Promise<string> {
    try {
      const blame = await this.git.raw([
        'blame',
        '-L',
        `${Math.max(1, startLine)},${endLine}`,
        '--',
        file,
      ]);
      return blame;
    } catch {
      return `Could not blame ${file}`;
    }
  }

  async grep(query: string, filePattern?: string): Promise<string[]> {
    try {
      const args = ['grep', '-n', '-I', query];
      if (filePattern) {
        args.push('--', filePattern);
      }
      const result = await this.git.raw(args);
      return result.trim().split('\n').filter(Boolean).slice(0, 20);
    } catch {
      return [];
    }
  }

  async analyzeBranches(branch1: string, branch2: string): Promise<{
    divergePoint: string;
    aheadBehind: { ahead: number; behind: number };
    conflicts?: string[];
  }> {
    try {
      const mergeBase = await this.git.raw(['merge-base', branch1, branch2]);
      const divergePoint = mergeBase.trim();

      const ahead = await this.git.raw(['rev-list', '--count', `${branch2}..${branch1}`]);
      const behind = await this.git.raw(['rev-list', '--count', `${branch1}..${branch2}`]);

      return {
        divergePoint,
        aheadBehind: {
          ahead: parseInt(ahead.trim(), 10),
          behind: parseInt(behind.trim(), 10),
        },
      };
    } catch {
      return {
        divergePoint: '',
        aheadBehind: { ahead: 0, behind: 0 },
      };
    }
  }

  async getNeighborCommits(
    sha: string,
    before: number,
    after: number
  ): Promise<{ before: Commit[]; after: Commit[] }> {
    const beforeCommits: Commit[] = [];
    const afterCommits: Commit[] = [];

    try {
      // Get commits before
      const beforeLog = await this.git.log([`${sha}~${before}..${sha}~1`]);
      for (const entry of beforeLog.all.slice(0, before)) {
        beforeCommits.push(await this.parseCommit(entry));
      }
    } catch {
      // May not have that many ancestors
    }

    try {
      // Get commits after
      const afterLog = await this.git.log([`${sha}..HEAD`, `-n`, String(after)]);
      for (const entry of afterLog.all) {
        afterCommits.push(await this.parseCommit(entry));
      }
    } catch {
      // May be at HEAD
    }

    return { before: beforeCommits, after: afterCommits };
  }

  async fileHistory(filePath: string, limit: number): Promise<Commit[]> {
    try {
      const log = await this.git.log(['--follow', '-n', String(limit), '--', filePath]);
      return Promise.all(log.all.map((entry) => this.parseCommit(entry)));
    } catch {
      return [];
    }
  }

  async getCommitsByDate(date: string): Promise<Commit[]> {
    try {
      const log = await this.git.log([
        '--after', `${date} 00:00:00`,
        '--before', `${date} 23:59:59`,
      ]);
      return Promise.all(log.all.map((entry) => this.parseCommit(entry)));
    } catch {
      return [];
    }
  }

  async getDiff(sha: string): Promise<string> {
    try {
      return await this.git.diff([`${sha}^`, sha]);
    } catch {
      return await this.git.diff([sha]);
    }
  }

  getRepoPath(): string {
    return this.repoPath;
  }
}
