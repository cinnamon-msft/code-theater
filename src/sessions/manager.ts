/**
 * Session Manager with Expiration Handling and Recap Generation
 */

import Conf from 'conf';
import chalk from 'chalk';
import type { CopilotSession } from '@github/copilot-sdk';
import type { StorySession, StoredNarrative, ContributorStats } from '../types.js';
import type { TheaterClient } from '../ai/client.js';
import { CharacterPool } from '../ai/characters.js';

interface SessionManagerOptions {
  client: TheaterClient;
  repoHash: string;
}

interface SessionResult {
  directorSession: CopilotSession;
  characterPool: CharacterPool;
  isNew: boolean;
  actNumber: number;
}

export class SessionManager {
  private config: Conf<Record<string, StorySession>>;
  private narrativeConfig: Conf<Record<string, StoredNarrative>>;
  private client: TheaterClient;
  private repoHash: string;
  private lastProcessedCommit: string = '';

  constructor(options: SessionManagerOptions) {
    this.client = options.client;
    this.repoHash = options.repoHash;
    
    this.config = new Conf<Record<string, StorySession>>({
      projectName: 'code-theater',
      configName: 'sessions',
    });

    this.narrativeConfig = new Conf<Record<string, StoredNarrative>>({
      projectName: 'code-theater',
      configName: 'narratives',
    });
  }

  async getOrCreateSessions(
    contributors: ContributorStats[],
    options: { continue: boolean; forget: boolean; genre: string }
  ): Promise<SessionResult> {
    if (options.forget) {
      await this.clearSessions();
      return this.createFreshSessions(contributors, options.genre);
    }

    if (!options.continue) {
      return this.createFreshSessions(contributors, options.genre);
    }

    // Attempt to resume existing sessions
    const stored = this.config.get(this.repoHash);
    if (!stored) {
      console.log(chalk.yellow('No previous story found. Starting fresh.'));
      return this.createFreshSessions(contributors, options.genre);
    }

    try {
      // Try resuming director session
      const directorSession = await this.client.resumeSession(stored.directorSessionId);
      
      // Create character pool (can't resume these easily, but seed with context)
      const characterPool = new CharacterPool(this.client);
      await characterPool.initialize(contributors);

      console.log(chalk.green(`✓ Resuming story from Act ${stored.actCount}`));

      return {
        directorSession,
        characterPool,
        isNew: false,
        actNumber: stored.actCount + 1,
      };
    } catch (error) {
      // Session expired or unavailable - graceful fallback
      console.log(chalk.yellow('⚠ Previous sessions expired. Generating recap...'));

      return this.createWithRecap(contributors, options.genre);
    }
  }

  private async createFreshSessions(
    contributors: ContributorStats[],
    genre: string
  ): Promise<SessionResult> {
    const directorSession = await this.client.createDirectorSession(genre);
    
    const characterPool = new CharacterPool(this.client);
    await characterPool.initialize(contributors);

    // Save session info
    this.config.set(this.repoHash, {
      directorSessionId: (directorSession as any).sessionId || 'unknown',
      characterSessionIds: {},
      lastGenerated: new Date().toISOString(),
      actCount: 1,
      repoPath: this.repoHash,
    });

    return {
      directorSession,
      characterPool,
      isNew: true,
      actNumber: 1,
    };
  }

  private async createWithRecap(
    contributors: ContributorStats[],
    genre: string
  ): Promise<SessionResult> {
    const narrative = this.narrativeConfig.get(this.repoHash);

    // Display recap to user
    if (narrative) {
      await this.displayPreviouslyOn(narrative);
    }

    // Generate recap context for the director
    const recapContext = narrative ? this.buildRecapContext(narrative) : '';

    // Create fresh director session with recap
    const directorSession = await this.client.createDirectorSession(genre);
    
    // If we have a recap, send it as context
    if (recapContext) {
      await directorSession.sendAndWait({
        prompt: `Here is the story so far. Use this context to maintain continuity:

${recapContext}

Acknowledge that you understand the previous acts and are ready to continue the story.`,
      });
    }

    const characterPool = new CharacterPool(this.client);
    await characterPool.initialize(contributors);

    const actNumber = narrative ? narrative.actNumber + 1 : 1;

    // Save new session info
    this.config.set(this.repoHash, {
      directorSessionId: (directorSession as any).sessionId || 'unknown',
      characterSessionIds: {},
      lastGenerated: new Date().toISOString(),
      actCount: actNumber,
      repoPath: this.repoHash,
    });

    return {
      directorSession,
      characterPool,
      isNew: false,
      actNumber,
    };
  }

  private buildRecapContext(narrative: StoredNarrative): string {
    return `
═══════════════════════════════════════════════════════════════
                    STORY SO FAR (Acts I-${this.toRoman(narrative.actNumber)})
═══════════════════════════════════════════════════════════════

SUMMARY:
${narrative.summary}

KEY EVENTS:
${narrative.keyEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}

CHARACTER STATES:
${Object.entries(narrative.characterStates)
      .map(([char, state]) => `• ${char}: ${state}`)
      .join('\n')}

LAST COMMIT: ${narrative.lastCommitSha}
═══════════════════════════════════════════════════════════════`;
  }

  private async displayPreviouslyOn(narrative: StoredNarrative): Promise<void> {
    console.log();
    console.log(chalk.dim('─'.repeat(60)));
    console.log();
    console.log(chalk.bold.italic('  Previously on CODE THEATER...'));
    console.log();

    // Display last few key events
    for (const event of narrative.keyEvents.slice(-3)) {
      await this.typewriter(chalk.dim(`    "${event}"`), 15);
      await this.sleep(300);
    }

    console.log();
    console.log(chalk.dim('─'.repeat(60)));
    console.log();
    await this.sleep(500);
  }

  private async typewriter(text: string, delay: number): Promise<void> {
    for (const char of text) {
      process.stdout.write(char);
      await this.sleep(delay);
    }
    console.log();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async saveActSummary(
    actNumber: number,
    directorSession: CopilotSession,
    lastCommitSha: string
  ): Promise<void> {
    this.lastProcessedCommit = lastCommitSha;

    try {
      // Ask director to summarize the act
      const summaryResponse = await directorSession.sendAndWait({
        prompt: `Summarize this act in 2-3 sentences for a "Previously on..." recap.
Also list 3-5 key plot points and the current state of each main character.

Format your response as JSON:
{
  "summary": "Brief 2-3 sentence summary...",
  "keyEvents": ["Event 1...", "Event 2...", "Event 3..."],
  "characterStates": { "Character Name": "current state/mood", ... }
}

Only output the JSON, no other text.`,
      });

      const content = summaryResponse?.data?.content || '';
      
      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const narrative: StoredNarrative = {
          actNumber,
          summary: parsed.summary || 'The story continues...',
          keyEvents: parsed.keyEvents || [],
          characterStates: parsed.characterStates || {},
          lastCommitSha,
          generatedAt: new Date().toISOString(),
        };

        this.narrativeConfig.set(this.repoHash, narrative);
        
        // Update session act count
        const session = this.config.get(this.repoHash);
        if (session) {
          this.config.set(this.repoHash, {
            ...session,
            actCount: actNumber,
            lastGenerated: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.log(chalk.dim('Could not save act summary'));
    }
  }

  async clearSessions(): Promise<void> {
    this.config.delete(this.repoHash);
    this.narrativeConfig.delete(this.repoHash);
    console.log(chalk.dim('Cleared previous sessions'));
  }

  static async listAllSessions(): Promise<{ repoHash: string; session: StorySession }[]> {
    const config = new Conf<Record<string, StorySession>>({
      projectName: 'code-theater',
      configName: 'sessions',
    });

    const all = config.store;
    return Object.entries(all).map(([repoHash, session]) => ({
      repoHash,
      session,
    }));
  }

  static async clearAllSessions(): Promise<void> {
    const config = new Conf<Record<string, StorySession>>({
      projectName: 'code-theater',
      configName: 'sessions',
    });
    const narrativeConfig = new Conf<Record<string, StoredNarrative>>({
      projectName: 'code-theater',
      configName: 'narratives',
    });

    config.clear();
    narrativeConfig.clear();
  }

  private toRoman(num: number): string {
    const romans = [
      { value: 10, numeral: 'X' },
      { value: 9, numeral: 'IX' },
      { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' },
      { value: 1, numeral: 'I' },
    ];

    let result = '';
    let remaining = num;

    for (const { value, numeral } of romans) {
      while (remaining >= value) {
        result += numeral;
        remaining -= value;
      }
    }

    return result;
  }
}
