/**
 * Remote repository handler - clones GitHub URLs to cache
 */

import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';
import chalk from 'chalk';

export class RemoteHandler {
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(os.homedir(), '.code-theater', 'cache');
  }

  async resolve(repoPath: string): Promise<string> {
    // Check if it's a URL
    if (this.isGitUrl(repoPath)) {
      return this.cloneToCache(repoPath);
    }

    // Check if it's a GitHub shorthand (owner/repo)
    if (this.isGitHubShorthand(repoPath)) {
      const url = `https://github.com/${repoPath}.git`;
      return this.cloneToCache(url);
    }

    // Assume it's a local path
    const resolved = path.resolve(repoPath);
    
    try {
      await fs.access(resolved);
      return resolved;
    } catch {
      throw new Error(`Repository not found: ${resolved}`);
    }
  }

  private isGitUrl(str: string): boolean {
    return (
      str.startsWith('https://') ||
      str.startsWith('git@') ||
      str.startsWith('http://') ||
      str.startsWith('git://')
    );
  }

  private isGitHubShorthand(str: string): boolean {
    return /^[\w-]+\/[\w.-]+$/.test(str);
  }

  private async cloneToCache(url: string): Promise<string> {
    await fs.mkdir(this.cacheDir, { recursive: true });

    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const repoName = this.extractRepoName(url);
    const localPath = path.join(this.cacheDir, `${repoName}-${hash}`);

    // Check if already cloned
    try {
      await fs.access(localPath);
      console.log(chalk.dim(`Using cached clone: ${localPath}`));
      
      // Update the repo
      const git = simpleGit(localPath);
      console.log(chalk.dim('Fetching latest changes...'));
      await git.fetch(['--all', '--prune']);
      
      return localPath;
    } catch {
      // Need to clone
    }

    console.log(chalk.cyan(`Cloning ${url}...`));
    
    const git = simpleGit();
    await git.clone(url, localPath, ['--depth', '500', '--no-single-branch']);
    
    console.log(chalk.green(`✓ Cloned to ${localPath}`));
    
    return localPath;
  }

  private extractRepoName(url: string): string {
    // Handle various URL formats
    const match = url.match(/\/([^\/]+?)(\.git)?$/);
    if (match) {
      return match[1].replace(/\.git$/, '');
    }
    return 'repo';
  }

  getRepoHash(repoPath: string): string {
    return crypto.createHash('md5').update(repoPath).digest('hex');
  }
}
