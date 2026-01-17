/**
 * Scene Density Manager
 * Handles summarization and highlights for large release windows
 */

import type { Commit } from '../types.js';

export type DensityMode = 'full' | 'montage' | 'highlights';

export interface DensityResult {
  mode: DensityMode;
  scenes: SceneGroup[];
  totalCommits: number;
  scenesCount: number;
}

export interface SceneGroup {
  type: 'single' | 'montage' | 'highlight';
  title?: string;
  commits: Commit[];
  isPivotal?: boolean;
}

const FULL_THRESHOLD = 50;
const MONTAGE_THRESHOLD = 200;
const HIGHLIGHTS_COUNT = 25;

export class DensityManager {
  determineDensityMode(
    commitCount: number,
    overrides: { full?: boolean; highlightsOnly?: boolean }
  ): DensityMode {
    if (overrides.full) return 'full';
    if (overrides.highlightsOnly) return 'highlights';

    if (commitCount <= FULL_THRESHOLD) return 'full';
    if (commitCount <= MONTAGE_THRESHOLD) return 'montage';
    return 'highlights';
  }

  async processCommits(
    commits: Commit[],
    mode: DensityMode
  ): Promise<DensityResult> {
    switch (mode) {
      case 'full':
        return this.processFull(commits);
      case 'montage':
        return this.processMontage(commits);
      case 'highlights':
        return this.processHighlights(commits);
    }
  }

  private processFull(commits: Commit[]): DensityResult {
    return {
      mode: 'full',
      scenes: commits.map((commit) => ({
        type: 'single',
        commits: [commit],
      })),
      totalCommits: commits.length,
      scenesCount: commits.length,
    };
  }

  private processMontage(commits: Commit[]): DensityResult {
    const groups = this.groupByTheme(commits);
    const scenes: SceneGroup[] = [];

    for (const group of groups) {
      if (group.commits.length === 1) {
        // Single commit - full scene
        scenes.push({
          type: 'single',
          commits: group.commits,
        });
      } else if (this.containsPivotalCommit(group.commits)) {
        // Group has pivotal commit - montage + highlight
        const pivotal = this.findPivotalCommit(group.commits);
        const others = group.commits.filter((c) => c !== pivotal);

        if (others.length > 0) {
          scenes.push({
            type: 'montage',
            title: group.title,
            commits: others,
          });
        }

        if (pivotal) {
          scenes.push({
            type: 'highlight',
            commits: [pivotal],
            isPivotal: true,
          });
        }
      } else {
        // Regular montage
        scenes.push({
          type: 'montage',
          title: group.title,
          commits: group.commits,
        });
      }
    }

    return {
      mode: 'montage',
      scenes,
      totalCommits: commits.length,
      scenesCount: scenes.length,
    };
  }

  private processHighlights(commits: Commit[]): DensityResult {
    const pivotal = this.findAllPivotalCommits(commits, HIGHLIGHTS_COUNT);
    const scenes: SceneGroup[] = [];

    // Create montage summaries for gaps between highlights
    let lastIndex = 0;
    for (const commit of pivotal) {
      const currentIndex = commits.indexOf(commit);
      
      // Add montage for skipped commits
      if (currentIndex > lastIndex) {
        const skipped = commits.slice(lastIndex, currentIndex);
        if (skipped.length > 0) {
          scenes.push({
            type: 'montage',
            title: this.inferTheme(skipped),
            commits: skipped,
          });
        }
      }

      // Add highlight scene
      scenes.push({
        type: 'highlight',
        commits: [commit],
        isPivotal: true,
      });

      lastIndex = currentIndex + 1;
    }

    // Add remaining commits as montage
    if (lastIndex < commits.length) {
      const remaining = commits.slice(lastIndex);
      if (remaining.length > 0) {
        scenes.push({
          type: 'montage',
          title: this.inferTheme(remaining),
          commits: remaining,
        });
      }
    }

    return {
      mode: 'highlights',
      scenes,
      totalCommits: commits.length,
      scenesCount: scenes.length,
    };
  }

  private groupByTheme(commits: Commit[]): { title: string; commits: Commit[] }[] {
    const groups: Map<string, Commit[]> = new Map();

    for (const commit of commits) {
      const theme = this.inferTheme([commit]);
      if (!groups.has(theme)) {
        groups.set(theme, []);
      }
      groups.get(theme)!.push(commit);
    }

    // Convert to array and maintain chronological order
    const result: { title: string; commits: Commit[] }[] = [];
    let currentGroup: { title: string; commits: Commit[] } | null = null;

    for (const commit of commits) {
      const theme = this.inferTheme([commit]);
      
      if (!currentGroup || currentGroup.title !== theme) {
        if (currentGroup) {
          result.push(currentGroup);
        }
        currentGroup = { title: theme, commits: [commit] };
      } else {
        currentGroup.commits.push(commit);
      }
    }

    if (currentGroup) {
      result.push(currentGroup);
    }

    // Merge small adjacent groups
    return this.mergeSmallGroups(result);
  }

  private mergeSmallGroups(
    groups: { title: string; commits: Commit[] }[]
  ): { title: string; commits: Commit[] }[] {
    const result: { title: string; commits: Commit[] }[] = [];
    let pending: { title: string; commits: Commit[] } | null = null;

    for (const group of groups) {
      if (!pending) {
        pending = group;
        continue;
      }

      if (pending.commits.length < 3 && group.commits.length < 3) {
        // Merge small groups
        pending = {
          title: `${pending.title} & ${group.title}`,
          commits: [...pending.commits, ...group.commits],
        };
      } else {
        result.push(pending);
        pending = group;
      }
    }

    if (pending) {
      result.push(pending);
    }

    return result;
  }

  private inferTheme(commits: Commit[]): string {
    const messages = commits.map((c) => c.message.toLowerCase());
    
    // Check for common patterns
    const patterns = [
      { keywords: ['fix', 'bug', 'issue', 'patch'], theme: 'Bug Fixes' },
      { keywords: ['feat', 'add', 'implement', 'new'], theme: 'New Features' },
      { keywords: ['refactor', 'clean', 'reorganize'], theme: 'Refactoring' },
      { keywords: ['test', 'spec', 'coverage'], theme: 'Testing' },
      { keywords: ['doc', 'readme', 'comment'], theme: 'Documentation' },
      { keywords: ['style', 'format', 'lint'], theme: 'Code Style' },
      { keywords: ['perf', 'optimize', 'speed'], theme: 'Performance' },
      { keywords: ['security', 'auth', 'permission'], theme: 'Security' },
      { keywords: ['deploy', 'release', 'version'], theme: 'Deployment' },
      { keywords: ['config', 'setup', 'install'], theme: 'Configuration' },
    ];

    for (const { keywords, theme } of patterns) {
      if (messages.some((m) => keywords.some((k) => m.includes(k)))) {
        return theme;
      }
    }

    // Look for common file extensions
    const allFiles = commits.flatMap((c) => c.files.map((f) => f.path));
    
    if (allFiles.some((f) => f.includes('test') || f.includes('spec'))) {
      return 'Testing';
    }
    if (allFiles.some((f) => f.endsWith('.md') || f.includes('doc'))) {
      return 'Documentation';
    }

    return 'Development';
  }

  private containsPivotalCommit(commits: Commit[]): boolean {
    return commits.some((c) => this.isPivotal(c));
  }

  private findPivotalCommit(commits: Commit[]): Commit | undefined {
    return commits.find((c) => this.isPivotal(c));
  }

  private findAllPivotalCommits(commits: Commit[], limit: number): Commit[] {
    // Score each commit for "pivotal-ness"
    const scored = commits.map((commit) => ({
      commit,
      score: this.calculatePivotalScore(commit),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top commits, then re-sort chronologically
    const top = scored.slice(0, limit).map((s) => s.commit);
    return top.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private isPivotal(commit: Commit): boolean {
    return this.calculatePivotalScore(commit) >= 5;
  }

  private calculatePivotalScore(commit: Commit): number {
    let score = 0;
    const message = commit.message.toLowerCase();

    // Large changes
    if (commit.additions + commit.deletions > 200) score += 2;
    if (commit.additions + commit.deletions > 500) score += 2;

    // Many files
    if (commit.files.length > 10) score += 2;
    if (commit.files.length > 20) score += 2;

    // Key words in message
    if (message.includes('breaking')) score += 3;
    if (message.includes('major')) score += 2;
    if (message.includes('release')) score += 2;
    if (message.includes('fix') && message.includes('critical')) score += 2;
    if (message.includes('revert')) score += 2;
    if (message.includes('merge')) score += 1;
    if (message.includes('hotfix')) score += 2;
    if (message.includes('security')) score += 2;

    // New features
    if (message.startsWith('feat')) score += 1;

    return score;
  }
}
