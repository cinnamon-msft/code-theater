/**
 * Copilot SDK Client Wrapper
 */

import { CopilotClient, CopilotSession } from '@github/copilot-sdk';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs';
import type { ThrottleConfig } from '../types.js';
import { ThrottledToolSystem, getDirectorSystemMessage } from './tools.js';
import type { GitService } from '../git/services.js';

export interface ClientOptions {
  git: GitService;
  toolBudget?: number;
  cliPath?: string;
}

interface CopilotCliConfig {
  cliPath: string;
  cliArgs?: string[];
}

/**
 * Find the Copilot CLI configuration on different systems
 * On Windows, we need to use node directly since spawn doesn't handle .cmd/.bat files
 */
function findCopilotCliConfig(): CopilotCliConfig | undefined {
  const home = os.homedir();
  const isWindows = os.platform() === 'win32';

  // First, check for npm-installed copilot (works cross-platform with node)
  const npmLoaderPaths = [
    path.join(home, 'AppData', 'Roaming', 'npm', 'node_modules', '@github', 'copilot', 'npm-loader.js'),
    path.join(home, '.npm-global', 'lib', 'node_modules', '@github', 'copilot', 'npm-loader.js'),
    '/usr/local/lib/node_modules/@github/copilot/npm-loader.js',
    '/usr/lib/node_modules/@github/copilot/npm-loader.js',
  ];

  for (const loaderPath of npmLoaderPaths) {
    if (fs.existsSync(loaderPath)) {
      return {
        cliPath: process.execPath, // Use current node executable
        cliArgs: [loaderPath],
      };
    }
  }

  // On non-Windows, we can use the VS Code extension directly
  if (!isWindows) {
    const possiblePaths = [
      // macOS
      path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'github.copilot-chat', 'copilotCli', 'copilot'),
      path.join(home, 'Library', 'Application Support', 'Code - Insiders', 'User', 'globalStorage', 'github.copilot-chat', 'copilotCli', 'copilot'),
      // Linux
      path.join(home, '.config', 'Code', 'User', 'globalStorage', 'github.copilot-chat', 'copilotCli', 'copilot'),
      path.join(home, '.config', 'Code - Insiders', 'User', 'globalStorage', 'github.copilot-chat', 'copilotCli', 'copilot'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return { cliPath: p };
      }
    }
  }

  return undefined;
}

export class TheaterClient {
  private client: CopilotClient;
  private toolSystem: ThrottledToolSystem;
  private isStarted = false;

  constructor(private options: ClientOptions) {
    if (options.cliPath) {
      console.log(chalk.dim(`Using Copilot CLI: ${options.cliPath}`));
      this.client = new CopilotClient({ cliPath: options.cliPath });
    } else {
      const config = findCopilotCliConfig();
      
      if (config) {
        if (config.cliArgs) {
          console.log(chalk.dim(`Using Copilot via node: ${config.cliArgs[0]}`));
        } else {
          console.log(chalk.dim(`Using Copilot CLI: ${config.cliPath}`));
        }
        this.client = new CopilotClient({
          cliPath: config.cliPath,
          cliArgs: config.cliArgs,
        });
      } else {
        console.log(chalk.dim('Using Copilot CLI from PATH'));
        this.client = new CopilotClient();
      }
    }
    
    this.toolSystem = new ThrottledToolSystem(options.git, {
      budgetPerScene: options.toolBudget || 20,
    });
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    
    console.log(chalk.dim('Starting Copilot client...'));
    await this.client.start();
    this.isStarted = true;
    console.log(chalk.green('✓ Copilot client started'));
  }

  async stop(): Promise<void> {
    if (!this.isStarted) return;
    await this.client.stop();
    this.isStarted = false;
  }

  async createDirectorSession(genre: string = 'drama'): Promise<CopilotSession> {
    const tools = this.toolSystem.createTools();
    const throttleConfig: ThrottleConfig = {
      maxCallsPerScene: 15,
      maxCallsPerMinute: 30,
      costPerTool: {},
      budgetPerScene: this.options.toolBudget || 20,
    };

    const genrePrompt = this.getGenrePrompt(genre);

    const session = await this.client.createSession({
      model: 'gpt-5',
      tools: tools as any,
      systemMessage: {
        content: `${getDirectorSystemMessage(throttleConfig)}

## GENRE: ${genre.toUpperCase()}

${genrePrompt}`,
      },
    });

    return session;
  }

  async createCharacterSession(
    characterName: string,
    profile: {
      archetype: string;
      peakHours: string;
      topFiles: string[];
      commitStyle: string;
      traits: string[];
      speechStyle: string;
      catchphrase: string;
    }
  ): Promise<CopilotSession> {
    const tools = this.toolSystem.createTools();

    const session = await this.client.createSession({
      model: 'gpt-5',
      tools: tools as any,
      systemMessage: {
        content: `You are ${characterName}, a developer character in this drama.

═══════════════════════════════════════════════════════
                  CHARACTER PROFILE
═══════════════════════════════════════════════════════

ARCHETYPE: ${profile.archetype}

CODING IDENTITY:
• Peak hours: ${profile.peakHours}
• Primary domain: ${profile.topFiles.slice(0, 3).join(', ')}
• Commit style: ${profile.commitStyle}

PERSONALITY TRAITS:
${profile.traits.map((t) => `• ${t}`).join('\n')}

SPEECH PATTERNS:
• ${profile.speechStyle}
• Catchphrase: "${profile.catchphrase}"

═══════════════════════════════════════════════════════

Always respond in character. Your dialogue reflects your coding personality
and emotional investment in the codebase.

When generating dialogue:
- Stay true to your archetype
- Use your characteristic speech patterns
- Reference your areas of the codebase when relevant
- Express emotions appropriate to the situation`,
      },
    });

    return session;
  }

  async createEnsembleSession(contributorNames: string[]): Promise<CopilotSession> {
    const session = await this.client.createSession({
      model: 'gpt-5',
      systemMessage: {
        content: `You play multiple minor characters in this story.

When asked to speak as a character, adopt an appropriate voice based on their
limited presence in the codebase. These are supporting roles - keep dialogue brief
and functional.

Contributors in ensemble: ${contributorNames.join(', ')}

For each character:
- Infer personality from their name and the context provided
- Keep dialogue concise (1-2 sentences typically)
- Support the main characters' narrative arcs`,
      },
    });

    return session;
  }

  async resumeSession(sessionId: string): Promise<CopilotSession> {
    return this.client.resumeSession(sessionId);
  }

  async listSessions(): Promise<{ sessionId: string }[]> {
    return this.client.listSessions();
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.client.deleteSession(sessionId);
  }

  resetToolsForNewScene(): void {
    this.toolSystem.resetForNewScene();
  }

  getToolStats() {
    return this.toolSystem.getStats();
  }

  private getGenrePrompt(genre: string): string {
    switch (genre) {
      case 'comedy':
        return `Write with wit and humor. Find the absurdity in debugging sessions,
the comedy in merge conflicts, and the slapstick potential of production incidents.
Use comedic timing, witty banter, and situational humor.`;

      case 'thriller':
        return `Build tension and suspense. Every commit could be the one that brings
down production. Hotfixes are races against time. Unknown bugs lurk in the shadows.
Use short, punchy sentences. Create a sense of urgency and dread.`;

      case 'noir':
        return `Write in a dark, atmospheric style. The codebase is a city at night,
full of shadows and secrets. Developers are detectives hunting bugs through
rain-soaked streets of legacy code. Use metaphor heavily. First-person narration
encouraged.`;

      case 'drama':
      default:
        return `Focus on the human element. The struggles, triumphs, and relationships
between developers. Late nights and hard decisions. The weight of technical debt
and the satisfaction of clean code. Treat every commit as a chapter in someone's
professional journey.`;
    }
  }
}
