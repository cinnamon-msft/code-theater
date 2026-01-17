/**
 * Theater TUI - Single view that updates in place
 */

import chalk from 'chalk';
import type { Commit } from '../types.js';
import { assignCharacters, type AssignedCharacter } from './character-library.js';

// ANSI escape codes for cursor control
const ESC = '\x1b';
const CLEAR_SCREEN = `${ESC}[2J`;
const CURSOR_HOME = `${ESC}[H`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

export interface TheaterState {
  characters: AssignedCharacter[];
  currentScene: number;
  totalScenes: number;
  commits: Commit[];
  dialogue: Map<string, string>;
  action: string;
  title: string;
}

export class TheaterTUI {
  private state: TheaterState;
  private width: number;
  private height: number;

  constructor() {
    this.width = process.stdout.columns || 100;
    this.height = process.stdout.rows || 30;
    this.state = {
      characters: [],
      currentScene: 0,
      totalScenes: 0,
      commits: [],
      dialogue: new Map(),
      action: '',
      title: 'CODE THEATER',
    };
  }

  initialize(commits: Commit[], contributorNames: string[]): void {
    // Pick 5 random commits for the story
    const shuffled = [...commits].sort(() => Math.random() - 0.5);
    this.state.commits = shuffled.slice(0, 5);
    this.state.totalScenes = this.state.commits.length;
    
    // Assign unique characters to contributors
    this.state.characters = assignCharacters(contributorNames, 5);
    
    // Hide cursor for cleaner display
    process.stdout.write(HIDE_CURSOR);
    
    // Handle cleanup on exit
    process.on('SIGINT', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  cleanup(): void {
    process.stdout.write(SHOW_CURSOR);
    process.stdout.write('\n');
  }

  clear(): void {
    process.stdout.write(CLEAR_SCREEN + CURSOR_HOME);
  }

  render(): void {
    this.clear();
    
    const lines: string[] = [];
    
    // Header
    lines.push(this.centerText(chalk.bold.yellow(`╔${'═'.repeat(this.width - 4)}╗`)));
    lines.push(this.centerText(chalk.bold.yellow(`║${this.centerPad(this.state.title, this.width - 4)}║`)));
    lines.push(this.centerText(chalk.bold.yellow(`╚${'═'.repeat(this.width - 4)}╝`)));
    lines.push('');
    
    // Scene info
    const sceneInfo = `Scene ${this.state.currentScene + 1} of ${this.state.totalScenes}`;
    lines.push(this.centerText(chalk.dim(sceneInfo)));
    lines.push('');
    
    // Current commit info
    const commit = this.state.commits[this.state.currentScene];
    if (commit) {
      lines.push(chalk.cyan(`  📝 ${commit.message.substring(0, 60)}${commit.message.length > 60 ? '...' : ''}`));
      lines.push(chalk.dim(`     ${commit.shortSha} · ${commit.date.toLocaleDateString()}`));
      lines.push('');
    }
    
    // Action/narration
    if (this.state.action) {
      lines.push('');
      lines.push(chalk.white(`  ${this.state.action}`));
      lines.push('');
    }
    
    // Characters on stage (show up to 3 side by side)
    const activeChars = this.state.characters.filter(c => this.state.dialogue.has(c.contributorName));
    if (activeChars.length > 0) {
      lines.push(...this.renderCharactersRow(activeChars.slice(0, 3)));
    }
    
    // Divider
    lines.push('');
    lines.push(chalk.dim('─'.repeat(this.width)));
    
    // Cast list at bottom
    lines.push('');
    lines.push(chalk.bold('  CAST:'));
    for (const char of this.state.characters) {
      const hasSpeaking = this.state.dialogue.has(char.contributorName);
      const indicator = hasSpeaking ? chalk.green('●') : chalk.dim('○');
      lines.push(`    ${indicator} ${char.animal.emoji} ${char.contributorName} - ${char.persona.role}`);
    }
    
    // Print all lines
    console.log(lines.join('\n'));
  }

  private renderCharactersRow(characters: AssignedCharacter[]): string[] {
    const lines: string[] = [];
    const charWidth = Math.floor((this.width - 10) / Math.max(characters.length, 1));
    
    // Find max art height
    const maxArtHeight = Math.max(...characters.map(c => c.animal.art.length));
    
    // Render art rows
    for (let row = 0; row < maxArtHeight; row++) {
      let line = '  ';
      for (const char of characters) {
        const artLine = char.animal.art[row] || '';
        line += chalk.cyan(artLine.padEnd(charWidth));
      }
      lines.push(line);
    }
    
    // Character names
    let nameLine = '  ';
    for (const char of characters) {
      const name = `${char.animal.emoji} ${char.contributorName.split(' ')[0]}`;
      nameLine += chalk.bold.cyan(name.padEnd(charWidth));
    }
    lines.push(nameLine);
    
    // Persona line
    let personaLine = '  ';
    for (const char of characters) {
      personaLine += chalk.dim(char.persona.role.padEnd(charWidth));
    }
    lines.push(personaLine);
    
    // Dialogue bubbles
    lines.push('');
    for (const char of characters) {
      const dialogue = this.state.dialogue.get(char.contributorName);
      if (dialogue) {
        lines.push(this.renderSpeechBubble(char.contributorName.split(' ')[0], dialogue));
      }
    }
    
    return lines;
  }

  private renderSpeechBubble(name: string, text: string): string {
    // Show full dialogue, wrap if needed
    const maxLen = this.width - 20;
    const truncated = text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    return `    ${chalk.bold(name)}: "${truncated}"`;
  }

  private centerText(text: string): string {
    const plainText = text.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = Math.max(0, Math.floor((this.width - plainText.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private centerPad(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }

  // State update methods
  setScene(sceneNumber: number): void {
    this.state.currentScene = sceneNumber;
    this.state.dialogue.clear();
    this.state.action = '';
  }

  setAction(action: string): void {
    this.state.action = action;
  }

  setDialogue(contributorName: string, text: string): void {
    this.state.dialogue.set(contributorName, text);
  }

  clearDialogue(): void {
    this.state.dialogue.clear();
  }

  setTitle(title: string): void {
    this.state.title = title;
  }

  getCommits(): Commit[] {
    return this.state.commits;
  }

  getCharacters(): AssignedCharacter[] {
    return this.state.characters;
  }

  getCharacterForContributor(name: string): AssignedCharacter | undefined {
    return this.state.characters.find(c => c.contributorName === name);
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
