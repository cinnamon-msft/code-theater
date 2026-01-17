/**
 * Git history extractor with release windowing support
 */

import type { Commit, Tag, ContributorStats, GenerateOptions } from '../types.js';
import { GitService } from './services.js';

export interface ExtractionResult {
  commits: Commit[];
  contributors: ContributorStats[];
  fromRef: string;
  toRef: string;
  fromTag?: Tag;
  toTag?: Tag;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export class GitExtractor {
  private git: GitService;

  constructor(git: GitService) {
    this.git = git;
  }

  async extract(options: Pick<GenerateOptions, 'from' | 'to'>): Promise<ExtractionResult> {
    const tags = await this.git.getTags();
    
    // Resolve refs
    const fromRef = await this.resolveRef(options.from, tags, 'from');
    const toRef = await this.resolveRef(options.to, tags, 'to');

    // Get commits in range
    const commits = await this.git.getCommits(fromRef, toRef);
    
    if (commits.length === 0) {
      throw new Error(`No commits found between ${fromRef} and ${toRef}`);
    }

    // Get contributor stats
    const contributors = await this.git.getContributorStats(commits);

    // Find matching tags
    const fromTag = tags.find(t => t.name === fromRef || t.sha.startsWith(fromRef));
    const toTag = tags.find(t => t.name === toRef || t.sha.startsWith(toRef));

    // Calculate date range
    const sortedCommits = [...commits].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return {
      commits,
      contributors: contributors.sort((a, b) => b.commitCount - a.commitCount),
      fromRef,
      toRef,
      fromTag,
      toTag,
      dateRange: {
        start: sortedCommits[0].date,
        end: sortedCommits[sortedCommits.length - 1].date,
      },
    };
  }

  private async resolveRef(
    ref: string | undefined,
    tags: Tag[],
    position: 'from' | 'to'
  ): Promise<string> {
    if (!ref) {
      if (position === 'to') {
        return 'HEAD';
      }
      // For 'from', use the latest release tag
      const latestTag = tags[0];
      if (latestTag) {
        return latestTag.name;
      }
      throw new Error('No tags found and no --from specified');
    }

    // Special values
    if (ref === 'HEAD') {
      return 'HEAD';
    }

    if (ref === 'latest-release') {
      const latestTag = tags[0];
      if (!latestTag) {
        throw new Error('No release tags found');
      }
      return latestTag.name;
    }

    // Check if it's a tag name
    const tag = tags.find(t => t.name === ref);
    if (tag) {
      return tag.name;
    }

    // Assume it's a SHA or date - let git resolve it
    return ref;
  }

  async listReleases(): Promise<{
    tags: Tag[];
    commitCounts: Map<string, number>;
  }> {
    const tags = await this.git.getTags();
    const commitCounts = new Map<string, number>();

    // Calculate commit counts between consecutive tags
    for (let i = 0; i < tags.length; i++) {
      const currentTag = tags[i];
      const previousTag = tags[i + 1];

      try {
        const commits = await this.git.getCommits(
          previousTag?.name,
          currentTag.name
        );
        commitCounts.set(currentTag.name, commits.length);
      } catch {
        commitCounts.set(currentTag.name, 0);
      }
    }

    return { tags, commitCounts };
  }
}
