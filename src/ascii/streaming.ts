/**
 * Streaming ASCII Renderer
 * Handles real-time rendering of AI-generated content
 */

import chalk from 'chalk';
import type { AsciiRenderer } from './renderer.js';

interface StreamingOptions {
  typewriterDelay?: number;
  enableAnimations?: boolean;
}

export class StreamingRenderer {
  private buffer = '';
  private currentElement: 'dialogue' | 'action' | 'scene' | 'character' | null = null;
  private renderer: AsciiRenderer;
  private options: StreamingOptions;
  private currentCharacter = '';
  private currentParenthetical = '';

  constructor(renderer: AsciiRenderer, options: StreamingOptions = {}) {
    this.renderer = renderer;
    this.options = {
      typewriterDelay: options.typewriterDelay ?? 20,
      enableAnimations: options.enableAnimations ?? true,
    };
  }

  async handleDelta(deltaContent: string): Promise<void> {
    this.buffer += deltaContent;

    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      await this.renderLine(line);
    }
  }

  async handleComplete(content: string): Promise<void> {
    // Flush remaining buffer
    if (this.buffer) {
      await this.renderLine(this.buffer);
      this.buffer = '';
    }

    // Reset state
    this.currentElement = null;
    this.currentCharacter = '';
    this.currentParenthetical = '';
  }

  private async renderLine(line: string): Promise<void> {
    const trimmed = line.trim();
    
    if (!trimmed) {
      console.log();
      return;
    }

    // Detect screenplay format elements
    if (this.isSceneHeading(trimmed)) {
      await this.renderSceneHeading(trimmed);
    } else if (this.isCharacterName(trimmed)) {
      this.currentCharacter = trimmed;
      this.currentElement = 'character';
    } else if (this.isParenthetical(trimmed)) {
      this.currentParenthetical = trimmed.slice(1, -1);
    } else if (this.currentElement === 'character' || this.currentCharacter) {
      // This is dialogue
      await this.renderDialogue(trimmed);
      this.currentCharacter = '';
      this.currentParenthetical = '';
      this.currentElement = null;
    } else {
      // Action/description
      await this.renderAction(trimmed);
    }
  }

  private isSceneHeading(line: string): boolean {
    return /^(INT\.|EXT\.|INT\/EXT\.)/.test(line.toUpperCase());
  }

  private isCharacterName(line: string): boolean {
    // Character names are typically all caps and alone on a line
    return /^[A-Z][A-Z\s]+$/.test(line) && line.length < 30;
  }

  private isParenthetical(line: string): boolean {
    return line.startsWith('(') && line.endsWith(')');
  }

  private async renderSceneHeading(line: string): Promise<void> {
    console.log();
    console.log(chalk.yellow('═'.repeat(60)));
    
    if (this.options.enableAnimations) {
      await this.typewriter(chalk.bold.yellow(line), this.options.typewriterDelay!);
    } else {
      console.log(chalk.bold.yellow(line));
    }
    
    console.log(chalk.yellow('═'.repeat(60)));
    console.log();
  }

  private async renderDialogue(text: string): Promise<void> {
    // Character name centered
    console.log();
    const padding = ' '.repeat(Math.max(0, 30 - Math.floor(this.currentCharacter.length / 2)));
    console.log(padding + chalk.bold.cyan(this.currentCharacter));
    
    // Parenthetical if present
    if (this.currentParenthetical) {
      console.log(padding + chalk.dim(`(${this.currentParenthetical})`));
    }
    
    // Dialogue with typewriter effect
    const dialoguePadding = ' '.repeat(20);
    if (this.options.enableAnimations) {
      process.stdout.write(dialoguePadding);
      await this.typewriter(text, this.options.typewriterDelay!);
    } else {
      console.log(dialoguePadding + text);
    }
    
    console.log();
  }

  private async renderAction(text: string): Promise<void> {
    if (this.options.enableAnimations) {
      process.stdout.write('  ');
      await this.typewriter(chalk.dim(text), Math.floor(this.options.typewriterDelay! / 2));
    } else {
      console.log('  ' + chalk.dim(text));
    }
  }

  private async typewriter(text: string, delay: number): Promise<void> {
    for (const char of text) {
      process.stdout.write(char);
      if (delay > 0) {
        await this.sleep(delay);
      }
    }
    console.log();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset(): void {
    this.buffer = '';
    this.currentElement = null;
    this.currentCharacter = '';
    this.currentParenthetical = '';
  }
}

/**
 * Parse screenplay format into structured elements
 */
export interface ScreenplayElement {
  type: 'scene-heading' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition';
  content: string;
  character?: string;
}

export function parseScreenplay(text: string): ScreenplayElement[] {
  const elements: ScreenplayElement[] = [];
  const lines = text.split('\n');
  
  let currentCharacter = '';
  let expectingDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      expectingDialogue = false;
      continue;
    }

    // Scene heading
    if (/^(INT\.|EXT\.|INT\/EXT\.)/.test(trimmed.toUpperCase())) {
      elements.push({ type: 'scene-heading', content: trimmed });
      expectingDialogue = false;
      continue;
    }

    // Transition
    if (/^(CUT TO:|FADE TO:|DISSOLVE TO:|FADE OUT\.|FADE IN:)/.test(trimmed.toUpperCase())) {
      elements.push({ type: 'transition', content: trimmed });
      expectingDialogue = false;
      continue;
    }

    // Character name (all caps, centered indication)
    if (/^[A-Z][A-Z\s'.-]+$/.test(trimmed) && trimmed.length < 30) {
      currentCharacter = trimmed;
      elements.push({ type: 'character', content: trimmed, character: trimmed });
      expectingDialogue = true;
      continue;
    }

    // Parenthetical
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      elements.push({ type: 'parenthetical', content: trimmed.slice(1, -1), character: currentCharacter });
      continue;
    }

    // Dialogue (after character name)
    if (expectingDialogue) {
      elements.push({ type: 'dialogue', content: trimmed, character: currentCharacter });
      continue;
    }

    // Default to action
    elements.push({ type: 'action', content: trimmed });
  }

  return elements;
}
