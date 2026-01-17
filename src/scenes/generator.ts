/**
 * Scene Generator
 * Orchestrates the generation of dramatic scenes from commits
 */

import chalk from 'chalk';
import type { CopilotSession } from '@github/copilot-sdk';
import type { Commit, Scene, SceneType, Genre } from '../types.js';
import { AsciiRenderer } from '../ascii/renderer.js';
import { StreamingRenderer, parseScreenplay } from '../ascii/streaming.js';
import { CharacterPool } from '../ai/characters.js';
import { DensityManager, type DensityResult, type SceneGroup } from './density.js';
import { getDetailedPortrait } from '../ascii/portraits.js';

export interface GeneratorOptions {
  genre: Genre;
  streaming: boolean;
  actNumber: number;
}

export class SceneGenerator {
  private renderer: AsciiRenderer;
  private streamingRenderer: StreamingRenderer;
  private densityManager: DensityManager;
  private characterPool: CharacterPool | null = null;

  constructor() {
    this.renderer = new AsciiRenderer();
    this.streamingRenderer = new StreamingRenderer(this.renderer);
    this.densityManager = new DensityManager();
  }

  async generate(
    commits: Commit[],
    directorSession: CopilotSession,
    characterPool: CharacterPool,
    options: GeneratorOptions & { full?: boolean; highlightsOnly?: boolean }
  ): Promise<void> {
    // Determine density mode
    const mode = this.densityManager.determineDensityMode(commits.length, {
      full: options.full,
      highlightsOnly: options.highlightsOnly,
    });

    console.log(chalk.dim(`\nGenerating ${mode} mode (${commits.length} commits)\n`));

    // Store character pool for rendering
    this.characterPool = characterPool;

    // Process commits into scene groups
    const result = await this.densityManager.processCommits(commits, mode);

    // Render title
    this.renderer.renderTitle('CODE THEATER');

    // Generate opening
    await this.generateOpening(directorSession, commits, options);

    // Generate scenes
    let sceneNumber = 1;
    for (const group of result.scenes) {
      await this.generateSceneGroup(
        group,
        sceneNumber,
        directorSession,
        characterPool,
        options
      );
      sceneNumber++;
    }

    // Generate act break
    await this.generateActBreak(directorSession, options.actNumber, commits);
  }

  private async generateOpening(
    directorSession: CopilotSession,
    commits: Commit[],
    options: GeneratorOptions
  ): Promise<void> {
    const firstCommit = commits[0];
    const lastCommit = commits[commits.length - 1];
    const uniqueAuthors = new Set(commits.map((c) => c.author.name));

    const prompt = `Generate a dramatic opening for Act ${options.actNumber} of our ${options.genre} screenplay.

CONTEXT:
- Time period: ${firstCommit.date.toLocaleDateString()} to ${lastCommit.date.toLocaleDateString()}
- Total commits: ${commits.length}
- Contributors: ${Array.from(uniqueAuthors).join(', ')}

Generate a brief opening sequence that:
1. Sets the scene (INT/EXT, location, time)
2. Establishes the mood
3. Introduces what's at stake

Keep it to 5-10 lines. Use proper screenplay format.`;

    console.log(chalk.dim('Generating opening...'));

    const response = await directorSession.sendAndWait({ prompt });
    const content = response?.data?.content || '';

    // Parse and render with portraits
    this.renderScreenplayContent(content);
  }

  private async generateSceneGroup(
    group: SceneGroup,
    sceneNumber: number,
    directorSession: CopilotSession,
    characterPool: CharacterPool,
    options: GeneratorOptions
  ): Promise<void> {
    switch (group.type) {
      case 'single':
        await this.generateSingleScene(
          group.commits[0],
          sceneNumber,
          directorSession,
          characterPool,
          options
        );
        break;

      case 'montage':
        await this.generateMontageScene(
          group,
          sceneNumber,
          directorSession,
          options
        );
        break;

      case 'highlight':
        await this.generateHighlightScene(
          group.commits[0],
          sceneNumber,
          directorSession,
          characterPool,
          options
        );
        break;
    }
  }

  private async generateSingleScene(
    commit: Commit,
    sceneNumber: number,
    directorSession: CopilotSession,
    characterPool: CharacterPool,
    options: GeneratorOptions
  ): Promise<void> {
    const author = commit.author.name;
    const profile = characterPool.getProfile(author);
    const isNamed = characterPool.isNamedCharacter(author);

    const timeOfDay = this.getTimeOfDay(commit.date);
    const filesChanged = commit.files.slice(0, 5).map((f) => f.path).join(', ');

    const prompt = `Generate Scene ${sceneNumber} for this commit:

COMMIT DETAILS:
- SHA: ${commit.shortSha}
- Author: ${author}${profile ? ` (${profile.archetype})` : ''}
- Date: ${commit.date.toLocaleString()}
- Message: ${commit.message}
- Files: ${filesChanged || 'various files'}
- Changes: +${commit.additions}/-${commit.deletions}

${profile ? `CHARACTER NOTES:
- Archetype: ${profile.archetype}
- Traits: ${profile.traits.join(', ')}
- Catchphrase: "${profile.catchphrase}"
- Speech style: ${profile.speechStyle}` : ''}

GENRE: ${options.genre}

Generate a scene in screenplay format that:
1. Has a scene heading (INT./EXT., location based on time: ${timeOfDay})
2. Shows the character working on this change
3. Includes 2-3 lines of dialogue that reflect their personality
4. Captures the essence of what they're doing

Keep it concise - about 10-15 lines total.`;

    this.renderer.renderProgress(sceneNumber, 0, `Scene ${sceneNumber}...`);

    const response = await directorSession.sendAndWait({ prompt });
    const content = response?.data?.content || '';

    this.renderer.clearProgress();

    // Always use renderScreenplayContent for ASCII portraits
    this.renderScreenplayContent(content);
  }

  private async generateMontageScene(
    group: SceneGroup,
    sceneNumber: number,
    directorSession: CopilotSession,
    options: GeneratorOptions
  ): Promise<void> {
    // Render visual montage
    this.renderer.renderMontage(
      group.title || 'Development Montage',
      group.commits
    );

    // Generate brief narration
    const commitSummary = group.commits
      .slice(0, 5)
      .map((c) => `- ${c.author.name}: ${c.message}`)
      .join('\n');

    const prompt = `Write a brief narrator voice-over for this montage sequence:

TITLE: ${group.title || 'Development Montage'}
COMMITS (${group.commits.length} total):
${commitSummary}${group.commits.length > 5 ? `\n... and ${group.commits.length - 5} more` : ''}

TIME SPAN: ${group.commits[0].date.toLocaleDateString()} to ${group.commits[group.commits.length - 1].date.toLocaleDateString()}

Write 2-3 sentences of narration in ${options.genre} style that captures the essence of this period of development. Start with "NARRATOR (V.O.)"`;

    const response = await directorSession.sendAndWait({ prompt });
    const content = response?.data?.content || '';

    this.renderScreenplayContent(content);
  }

  private async generateHighlightScene(
    commit: Commit,
    sceneNumber: number,
    directorSession: CopilotSession,
    characterPool: CharacterPool,
    options: GeneratorOptions
  ): Promise<void> {
    console.log(chalk.bold.yellow(`\n▼ PIVOTAL MOMENT ▼\n`));

    // This is a key moment - generate with more detail
    await this.generateSingleScene(
      commit,
      sceneNumber,
      directorSession,
      characterPool,
      { ...options, streaming: true }
    );
  }

  private async generateActBreak(
    directorSession: CopilotSession,
    actNumber: number,
    commits: Commit[]
  ): Promise<void> {
    const prompt = `We've reached the end of Act ${actNumber}.

Summary of this act:
- ${commits.length} commits
- Key contributors: ${Array.from(new Set(commits.map((c) => c.author.name))).slice(0, 5).join(', ')}
- Time span: ${commits[0].date.toLocaleDateString()} to ${commits[commits.length - 1].date.toLocaleDateString()}

Write a brief (1-2 sentences) dramatic cliffhanger or teaser for the next act.`;

    const response = await directorSession.sendAndWait({ prompt });
    const subtitle = response?.data?.content?.replace(/["\n]/g, ' ').trim() || '';

    this.renderer.renderActBreak(actNumber, subtitle.substring(0, 80));
  }

  private renderScreenplayContent(content: string): void {
    const elements = parseScreenplay(content);
    let currentCharacter: string | null = null;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      switch (element.type) {
        case 'scene-heading':
          console.log();
          console.log(chalk.yellow('═'.repeat(60)));
          console.log(chalk.bold.yellow(element.content));
          console.log(chalk.yellow('═'.repeat(60)));
          console.log();
          break;

        case 'action':
          console.log('  ' + chalk.white(element.content));
          break;

        case 'character':
          currentCharacter = element.content.replace(/\s*\(.*\)$/, '').trim();
          // Check if next element is dialogue to show portrait
          const nextElement = elements[i + 1];
          const dialogueAhead = nextElement && 
            (nextElement.type === 'dialogue' || nextElement.type === 'parenthetical');
          
          if (dialogueAhead && this.characterPool) {
            this.renderCharacterWithPortrait(currentCharacter);
          } else {
            console.log();
            console.log(' '.repeat(25) + chalk.bold.cyan(element.content));
          }
          break;

        case 'parenthetical':
          console.log(' '.repeat(20) + chalk.dim(`(${element.content})`));
          break;

        case 'dialogue':
          this.renderDialogueWithBubble(element.content, currentCharacter);
          break;

        case 'transition':
          console.log();
          console.log(' '.repeat(50) + chalk.italic(element.content));
          console.log();
          break;
      }
    }
  }

  private renderCharacterWithPortrait(characterName: string): void {
    if (!this.characterPool) {
      console.log();
      console.log(' '.repeat(25) + chalk.bold.cyan(characterName));
      return;
    }

    // Find the character profile (try exact match, then partial)
    let profile = this.characterPool.getProfile(characterName);
    
    if (!profile) {
      // Try to find partial match
      for (const name of this.characterPool.getNamedCharacters()) {
        if (name.toLowerCase().includes(characterName.toLowerCase()) ||
            characterName.toLowerCase().includes(name.split(' ')[0].toLowerCase())) {
          profile = this.characterPool.getProfile(name);
          break;
        }
      }
    }

    if (profile) {
      const portrait = getDetailedPortrait(profile);
      console.log();
      console.log(chalk.cyan('┌' + '─'.repeat(40) + '┐'));
      
      // Show first 8 lines of portrait with name
      const portraitLines = portrait.lines.slice(0, 8);
      for (let i = 0; i < portraitLines.length; i++) {
        const line = portraitLines[i].substring(0, 38);
        if (i === 2) {
          console.log(chalk.cyan('│') + line.padEnd(40) + chalk.cyan('│'));
        } else {
          console.log(chalk.cyan('│') + line.padEnd(40) + chalk.cyan('│'));
        }
      }
      
      console.log(chalk.cyan('│') + ' '.repeat(40) + chalk.cyan('│'));
      console.log(chalk.cyan('│') + chalk.bold.cyan(` ${profile.emoji} ${characterName}`.padEnd(40)) + chalk.cyan('│'));
      console.log(chalk.cyan('│') + chalk.dim(` ${profile.archetype}`.padEnd(40)) + chalk.cyan('│'));
      console.log(chalk.cyan('└' + '─'.repeat(40) + '┘'));
    } else {
      console.log();
      console.log(' '.repeat(25) + chalk.bold.cyan(characterName));
    }
  }

  private renderDialogueWithBubble(dialogue: string, characterName: string | null): void {
    const maxWidth = 50;
    const words = dialogue.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxWidth) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Render speech bubble
    const bubbleWidth = Math.max(...lines.map(l => l.length), 10) + 4;
    
    console.log(' '.repeat(10) + '╭' + '─'.repeat(bubbleWidth) + '╮');
    for (const line of lines) {
      console.log(' '.repeat(10) + '│ ' + line.padEnd(bubbleWidth - 2) + ' │');
    }
    console.log(' '.repeat(10) + '╰' + '─'.repeat(bubbleWidth) + '╯');
    console.log(' '.repeat(10) + '  ╲');
    console.log(' '.repeat(10) + '   ╲');
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 17) return 'AFTERNOON';
    if (hour >= 17 && hour < 21) return 'EVENING';
    return 'NIGHT';
  }
}
