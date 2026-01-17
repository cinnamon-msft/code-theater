/**
 * TUI Scene Generator
 * Generates scenes using the single-view theater TUI
 */

import type { CopilotSession } from '@github/copilot-sdk';
import type { Commit, Genre } from '../types.js';
import { TheaterTUI } from '../ascii/theater-tui.js';
import type { AssignedCharacter } from '../ascii/character-library.js';

export interface TUIGeneratorOptions {
  genre: Genre;
  actNumber: number;
}

export class TUISceneGenerator {
  private tui: TheaterTUI;

  constructor() {
    this.tui = new TheaterTUI();
  }

  async generate(
    commits: Commit[],
    directorSession: CopilotSession,
    contributorNames: string[],
    options: TUIGeneratorOptions
  ): Promise<void> {
    // Initialize TUI with random commits and characters
    this.tui.initialize(commits, contributorNames);
    
    const selectedCommits = this.tui.getCommits();
    const characters = this.tui.getCharacters();
    
    // Initial render
    this.tui.setTitle(`CODE THEATER - Act ${options.actNumber}`);
    this.tui.render();
    await this.tui.sleep(1000);

    // Generate scenes for each selected commit
    for (let i = 0; i < selectedCommits.length; i++) {
      const commit = selectedCommits[i];
      this.tui.setScene(i);
      
      // Find character for this commit's author
      const character = this.tui.getCharacterForContributor(commit.author.name) ||
                       characters[i % characters.length];
      
      await this.generateScene(commit, character, directorSession, options, i + 1);
      
      // Pause between scenes
      await this.tui.sleep(2000);
    }

    // Final render
    this.tui.setAction('THE END');
    this.tui.clearDialogue();
    this.tui.render();
    
    // Cleanup
    await this.tui.sleep(1000);
    this.tui.cleanup();
  }

  private async generateScene(
    commit: Commit,
    character: AssignedCharacter,
    directorSession: CopilotSession,
    options: TUIGeneratorOptions,
    sceneNumber: number
  ): Promise<void> {
    // Set action based on commit
    const action = this.generateAction(commit, options.genre);
    this.tui.setAction(action);
    this.tui.render();
    await this.tui.sleep(500);

    // Generate dialogue using AI
    const prompt = `You are writing dialogue for a ${options.genre} screenplay.

CHARACTER:
- Name: ${character.contributorName}
- Role: ${character.persona.role} (${character.persona.description})
- Motivation: ${character.persona.motivation}
- Speaking style: ${character.animal.traits.join(', ')}

COMMIT BEING DRAMATIZED:
- Message: ${commit.message}
- Changes: +${commit.additions}/-${commit.deletions} lines
- Files: ${commit.files.slice(0, 3).map(f => f.path).join(', ')}

Write ONE line of dialogue (max 80 characters) that this character would say about this commit.
Just the dialogue, no character name prefix. Make it dramatic and fitting for ${options.genre}.`;

    try {
      const response = await directorSession.sendAndWait({ prompt });
      const dialogue = response?.data?.content?.trim().replace(/^["']|["']$/g, '') || 
                      character.animal.catchphrase;
      
      this.tui.setDialogue(character.contributorName, dialogue);
      this.tui.render();
    } catch {
      // Fallback to catchphrase
      this.tui.setDialogue(character.contributorName, character.animal.catchphrase);
      this.tui.render();
    }
  }

  private generateAction(commit: Commit, genre: Genre): string {
    const time = this.getTimeOfDay(commit.date);
    const files = commit.files.length;
    
    const actions: Record<Genre, string[]> = {
      drama: [
        `The tension mounts as ${files} files await their fate...`,
        `A crucial moment: the codebase will never be the same.`,
        `In the ${time.toLowerCase()}, a developer makes their move.`,
      ],
      comedy: [
        `${files} files nervously await review. Comedy ensues.`,
        `It's ${time.toLowerCase()} and someone thought this was a good idea.`,
        `The code doesn't know what hit it.`,
      ],
      thriller: [
        `${files} files. One commit. No turning back.`,
        `In the shadows of the ${time.toLowerCase()}, changes lurk.`,
        `The build server holds its breath...`,
      ],
      noir: [
        `${files} files in the dark of ${time.toLowerCase()}...`,
        `The code had seen better days. Much better days.`,
        `Someone had to make the hard choices. Tonight was that night.`,
      ],
    };

    const genreActions = actions[genre] || actions.drama;
    return genreActions[Math.floor(Math.random() * genreActions.length)];
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 17) return 'AFTERNOON';
    if (hour >= 17 && hour < 21) return 'EVENING';
    return 'NIGHT';
  }
}
