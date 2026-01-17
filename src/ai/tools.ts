/**
 * AI Tool System with Throttling
 * Provides tools for AI to explore the repository
 */

import { z, ZodSchema } from 'zod';
import chalk from 'chalk';
import type { GitService } from '../git/services.js';
import type { ThrottleConfig, ThrottleStats } from '../types.js';

// Tool handler type - returns any result
type ToolHandler = (params: any) => Promise<any>;

// Tool definition structure matching SDK expectations
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ZodSchema<any>;
  handler: ToolHandler;
}

const DEFAULT_THROTTLE: ThrottleConfig = {
  maxCallsPerScene: 15,
  maxCallsPerMinute: 30,
  costPerTool: {
    get_file_at_commit: 1,
    get_contributor_history: 2,
    find_related_commits: 2,
    get_blame_context: 1,
    search_codebase: 3,
    get_branch_drama: 2,
    analyze_complexity: 3,
    get_commit_neighborhood: 1,
    get_file_evolution: 2,
    get_day_in_the_life: 2,
  },
  budgetPerScene: 20,
};

export class ThrottledToolSystem {
  private callCount = 0;
  private costUsed = 0;
  private callTimestamps: number[] = [];
  private git: GitService;
  private config: ThrottleConfig;

  constructor(git: GitService, config: Partial<ThrottleConfig> = {}) {
    this.git = git;
    this.config = { ...DEFAULT_THROTTLE, ...config };
  }

  createTools(): ToolDefinition[] {
    const tools = this.defineTools();
    return tools.map((tool) => ({
      ...tool,
      handler: this.wrapWithThrottle(tool.name, tool.handler),
    }));
  }

  private defineTools(): ToolDefinition[] {
    return [
      {
        name: 'get_file_at_commit',
        description: 'Read a file\'s contents as it existed at a specific commit. Use this to understand what code looked like before/after changes.',
        parameters: z.object({
          path: z.string().describe('File path relative to repo root'),
          sha: z.string().describe('Commit SHA to read from'),
        }),
        handler: async (params: any) => {
          const content = await this.git.show(`${params.sha}:${params.path}`);
          return { content: content.substring(0, 5000) }; // Limit size
        },
      },

      {
        name: 'get_contributor_history',
        description: 'Get comprehensive analysis of a contributor: commit patterns, peak hours, favorite files, common words in messages.',
        parameters: z.object({
          author: z.string().describe('Author name or email'),
        }),
        handler: async (params: any) => {
          const stats = await this.git.getAuthorStats(params.author);
          if (!stats) {
            return { error: `No commits found for author: ${params.author}` };
          }
          return {
            name: stats.name,
            commitCount: stats.commitCount,
            peakHours: stats.peakHours,
            topFiles: stats.topFiles,
            commonWords: stats.commonWords,
            firstCommit: stats.firstCommit.toISOString(),
            lastCommit: stats.lastCommit.toISOString(),
            avgDiffSize: Math.round(stats.avgDiffSize),
            patterns: stats.patterns,
          };
        },
      },

      {
        name: 'find_related_commits',
        description: 'Find other commits that touched the same files as a given commit. Useful for finding subplot connections.',
        parameters: z.object({
          sha: z.string().describe('The commit SHA to find relations for'),
          limit: z.number().default(10).describe('Max related commits to return'),
        }),
        handler: async (params: any) => {
          const related = await this.git.findRelatedCommits(params.sha, params.limit || 10);
          return related.map((c) => ({
            sha: c.shortSha,
            message: c.message,
            author: c.author.name,
            date: c.date.toISOString(),
          }));
        },
      },

      {
        name: 'get_blame_context',
        description: 'Get git blame for lines around a specific location. Shows who wrote surrounding code and when.',
        parameters: z.object({
          file: z.string().describe('File path'),
          line: z.number().describe('Center line number'),
          context: z.number().default(10).describe('Lines of context above/below'),
        }),
        handler: async (params: any) => {
          const context = params.context || 10;
          const blame = await this.git.blameRange(params.file, params.line - context, params.line + context);
          return { blame };
        },
      },

      {
        name: 'search_codebase',
        description: 'Search the codebase for patterns. Find TODOs, FIXMEs, specific function names, or any text pattern.',
        parameters: z.object({
          query: z.string().describe('Search pattern'),
          filePattern: z.string().optional().describe('Glob pattern to filter files'),
        }),
        handler: async (params: any) => {
          const results = await this.git.grep(params.query, params.filePattern);
          return { matches: results };
        },
      },

      {
        name: 'get_branch_drama',
        description: 'Analyze the relationship between two branches: merge history, conflicts, divergence points.',
        parameters: z.object({
          branch1: z.string(),
          branch2: z.string(),
        }),
        handler: async (params: any) => {
          return await this.git.analyzeBranches(params.branch1, params.branch2);
        },
      },

      {
        name: 'get_commit_neighborhood',
        description: 'Get commits immediately before and after a given commit for narrative context.',
        parameters: z.object({
          sha: z.string(),
          before: z.number().default(3),
          after: z.number().default(3),
        }),
        handler: async (params: any) => {
          const before = params.before || 3;
          const after = params.after || 3;
          const neighbors = await this.git.getNeighborCommits(params.sha, before, after);
          return {
            before: neighbors.before.map((c) => ({
              sha: c.shortSha,
              message: c.message,
              author: c.author.name,
            })),
            after: neighbors.after.map((c) => ({
              sha: c.shortSha,
              message: c.message,
              author: c.author.name,
            })),
          };
        },
      },

      {
        name: 'get_file_evolution',
        description: 'Track how a file changed over time: additions, deletions, renames, major rewrites.',
        parameters: z.object({
          path: z.string().describe('File path (follows renames)'),
          limit: z.number().default(20),
        }),
        handler: async (params: any) => {
          const limit = params.limit || 20;
          const history = await this.git.fileHistory(params.path, limit);
          return history.map((c) => ({
            sha: c.shortSha,
            message: c.message,
            author: c.author.name,
            date: c.date.toISOString(),
            changes: `+${c.additions}/-${c.deletions}`,
          }));
        },
      },

      {
        name: 'get_day_in_the_life',
        description: 'Get all commits from a specific date to recreate a day\'s narrative.',
        parameters: z.object({
          date: z.string().describe('Date in YYYY-MM-DD format'),
        }),
        handler: async (params: any) => {
          const commits = await this.git.getCommitsByDate(params.date);
          return commits.map((c) => ({
            sha: c.shortSha,
            message: c.message,
            author: c.author.name,
            time: c.date.toLocaleTimeString(),
            files: c.files.length,
          }));
        },
      },

      {
        name: 'get_commit_diff',
        description: 'Get the full diff for a specific commit to understand exactly what changed.',
        parameters: z.object({
          sha: z.string().describe('Commit SHA'),
        }),
        handler: async (params: any) => {
          const diff = await this.git.getDiff(params.sha);
          // Limit diff size to prevent overwhelming context
          return { diff: diff.substring(0, 8000) };
        },
      },
    ];
  }

  private wrapWithThrottle(
    toolName: string,
    handler: ToolHandler
  ): ToolHandler {
    return async (params: any) => {
      // Check call count limit
      if (this.callCount >= this.config.maxCallsPerScene) {
        return {
          success: false,
          error: 'Tool call limit reached for this scene. Work with available context.',
          suggestion: 'Focus on generating the scene with information already gathered.',
        };
      }

      // Check cost budget
      const toolCost = this.config.costPerTool[toolName] || 1;
      if (this.costUsed + toolCost > this.config.budgetPerScene) {
        return {
          success: false,
          error: 'Exploration budget exhausted for this scene.',
          remainingBudget: this.config.budgetPerScene - this.costUsed,
          suggestion: 'Generate scene with current context.',
        };
      }

      // Check rate limit (calls per minute)
      const now = Date.now();
      this.callTimestamps = this.callTimestamps.filter((t) => now - t < 60000);
      if (this.callTimestamps.length >= this.config.maxCallsPerMinute) {
        const waitTime = 60000 - (now - this.callTimestamps[0]);
        await this.sleep(waitTime);
      }

      // Execute tool
      this.callCount++;
      this.costUsed += toolCost;
      this.callTimestamps.push(Date.now());

      console.log(
        chalk.dim(`  🔧 ${toolName} (${this.callCount}/${this.config.maxCallsPerScene})`)
      );

      try {
        const result = await handler(params);
        if (result && typeof result === 'object') {
          return { success: true, ...result };
        }
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  resetForNewScene(): void {
    this.callCount = 0;
    this.costUsed = 0;
  }

  getStats(): ThrottleStats {
    return {
      callsUsed: this.callCount,
      callsRemaining: this.config.maxCallsPerScene - this.callCount,
      budgetUsed: this.costUsed,
      budgetRemaining: this.config.budgetPerScene - this.costUsed,
    };
  }

  updateBudget(budget: number): void {
    this.config.budgetPerScene = budget;
  }
}

/**
 * Get system message with exploration guidelines
 */
export function getDirectorSystemMessage(config: ThrottleConfig): string {
  return `You are a masterful screenplay director creating dramatic narratives from git history.

## YOUR ROLE

Transform commit history into compelling theatrical scenes with:
- Vivid scene headings (INT./EXT., location, time of day)
- Dramatic action lines describing what happens
- Character dialogue that reveals personality
- Stage directions and parentheticals for emotional beats

## EXPLORATION GUIDELINES

You have tools to explore the repository. Use them wisely:

- Budget: ~${config.maxCallsPerScene} tool calls per scene
- Total cost budget: ${config.budgetPerScene} units per scene
- Strategy: Gather key context first, then generate

TOOL COSTS:
- Cheap (1 unit): get_file_at_commit, get_blame_context, get_commit_neighborhood
- Medium (2 units): get_contributor_history, find_related_commits, get_file_evolution
- Expensive (3 units): search_codebase, analyze_complexity

RECOMMENDED WORKFLOW:
1. get_contributor_history for main characters (1-2 calls)
2. get_commit_neighborhood for context (1 call)
3. get_file_at_commit for key changes (2-3 calls)
4. Generate the scene with gathered context

AVOID: Exhaustive exploration, repeated similar queries, searching entire codebase.
FOCUS: Targeted investigation for dramatic details.

## OUTPUT FORMAT

Write in proper screenplay format:

SCENE HEADING
INT. LOCATION - TIME

Action lines describe what we see.

CHARACTER NAME
(parenthetical)
Dialogue goes here.

Use this format consistently for all scenes.`;
}
