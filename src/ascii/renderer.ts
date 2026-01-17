/**
 * ASCII Art Renderer - Main rendering system
 */

import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import terminalSize from 'terminal-size';
import type { RenderContext, Portrait, CharacterProfile, Commit } from '../types.js';

export class AsciiRenderer {
  private context: RenderContext;

  constructor() {
    const size = terminalSize();
    this.context = {
      terminalWidth: size?.columns || 80,
      terminalHeight: size?.rows || 24,
      colorSupport: this.detectColorSupport(),
    };
  }

  private detectColorSupport(): 'none' | 'basic' | '256' | 'truecolor' {
    if (process.env.COLORTERM === 'truecolor') return 'truecolor';
    if (process.env.TERM?.includes('256')) return '256';
    if (process.stdout.isTTY) return 'basic';
    return 'none';
  }

  renderTitle(title: string): void {
    const width = Math.min(this.context.terminalWidth, 100);
    
    console.log();
    console.log(chalk.cyan('╔' + '═'.repeat(width - 2) + '╗'));
    console.log(chalk.cyan('║' + ' '.repeat(width - 2) + '║'));
    
    try {
      const figletText = figlet.textSync(title, {
        font: 'Small',
        horizontalLayout: 'default',
      });
      
      const lines = figletText.split('\n');
      for (const line of lines) {
        const padded = this.centerText(line, width - 4);
        console.log(chalk.cyan('║ ') + chalk.bold.yellow(padded) + chalk.cyan(' ║'));
      }
    } catch {
      const padded = this.centerText(title, width - 4);
      console.log(chalk.cyan('║ ') + chalk.bold.yellow(padded) + chalk.cyan(' ║'));
    }
    
    console.log(chalk.cyan('║' + ' '.repeat(width - 2) + '║'));
    console.log(chalk.cyan('╚' + '═'.repeat(width - 2) + '╝'));
    console.log();
  }

  renderSceneHeading(heading: string, location: string, time: string): void {
    const width = Math.min(this.context.terminalWidth, 100);
    
    console.log();
    console.log(chalk.yellow('╔' + '═'.repeat(width - 2) + '╗'));
    
    // Scene number/heading
    const headingLine = ` ${heading} `;
    console.log(chalk.yellow('║') + chalk.bold.white(this.centerText(headingLine, width - 2)) + chalk.yellow('║'));
    
    console.log(chalk.yellow('╠' + '─'.repeat(width - 2) + '╣'));
    
    // Location and time
    const locationTime = `${location} - ${time}`;
    console.log(chalk.yellow('║') + chalk.dim(this.centerText(locationTime, width - 2)) + chalk.yellow('║'));
    
    console.log(chalk.yellow('╚' + '═'.repeat(width - 2) + '╝'));
    console.log();
  }

  renderCharacterPortrait(name: string, profile: CharacterProfile): void {
    const portrait = this.generatePortrait(profile);
    const width = Math.min(this.context.terminalWidth, 80);
    
    console.log();
    
    // Character info box on the right of portrait
    const infoLines = [
      chalk.bold(name),
      chalk.dim('─'.repeat(20)),
      `${profile.emoji} ${profile.archetype}`,
      '',
      ...profile.traits.slice(0, 3).map(t => chalk.dim(`• ${t}`)),
      '',
      chalk.italic(`"${profile.catchphrase}"`),
    ];
    
    // Render portrait with info side by side
    const maxLines = Math.max(portrait.lines.length, infoLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const portraitLine = portrait.lines[i] || ' '.repeat(portrait.width);
      const infoLine = infoLines[i] || '';
      console.log(`  ${portraitLine}    ${infoLine}`);
    }
    
    console.log();
  }

  renderDialogue(characterName: string, text: string, parenthetical?: string): void {
    const width = Math.min(this.context.terminalWidth - 10, 60);
    
    // Character name centered
    console.log();
    console.log(this.centerText(chalk.bold.cyan(characterName.toUpperCase()), this.context.terminalWidth));
    
    // Parenthetical if present
    if (parenthetical) {
      console.log(this.centerText(chalk.dim(`(${parenthetical})`), this.context.terminalWidth));
    }
    
    // Dialogue text wrapped and centered
    const wrappedLines = this.wrapText(text, width);
    for (const line of wrappedLines) {
      console.log(this.centerText(line, this.context.terminalWidth));
    }
    
    console.log();
  }

  renderDialogueWithBubble(characterName: string, text: string, emoji: string = ''): void {
    const width = Math.min(60, this.context.terminalWidth - 20);
    const wrappedLines = this.wrapText(text, width - 4);
    
    const bubbleWidth = Math.max(...wrappedLines.map(l => l.length)) + 4;
    
    console.log();
    
    // Speech bubble
    console.log('    ╭' + '─'.repeat(bubbleWidth) + '╮');
    for (const line of wrappedLines) {
      const padded = line.padEnd(bubbleWidth - 2);
      console.log('    │ ' + padded + ' │');
    }
    console.log('    ╰' + '─'.repeat(Math.floor(bubbleWidth / 2) - 1) + '┬' + '─'.repeat(Math.ceil(bubbleWidth / 2)) + '╯');
    console.log(' '.repeat(Math.floor(bubbleWidth / 2) + 4) + '│');
    console.log(' '.repeat(Math.floor(bubbleWidth / 2) + 3) + '╱');
    
    // Character name
    console.log(`  ${emoji} ${chalk.bold(characterName)}`);
    console.log();
  }

  renderAction(text: string): void {
    const width = Math.min(this.context.terminalWidth - 10, 80);
    const wrappedLines = this.wrapText(text, width);
    
    console.log();
    for (const line of wrappedLines) {
      console.log('  ' + chalk.dim(line));
    }
    console.log();
  }

  renderActBreak(actNumber: number, subtitle?: string): void {
    const width = Math.min(this.context.terminalWidth, 100);
    const romanNumeral = this.toRoman(actNumber);
    
    console.log();
    console.log(chalk.dim('▄'.repeat(width)));
    console.log(chalk.dim('█' + '░'.repeat(width - 2) + '█'));
    console.log(chalk.dim('█') + this.centerText(chalk.bold(`🎭  E N D   O F   A C T   ${romanNumeral}  🎭`), width - 2) + chalk.dim('█'));
    
    if (subtitle) {
      console.log(chalk.dim('█') + ' '.repeat(width - 2) + chalk.dim('█'));
      console.log(chalk.dim('█') + this.centerText(chalk.italic(`"${subtitle}"`), width - 2) + chalk.dim('█'));
    }
    
    console.log(chalk.dim('█' + '░'.repeat(width - 2) + '█'));
    console.log(chalk.dim('▀'.repeat(width)));
    console.log();
  }

  renderMontage(title: string, commits: Commit[]): void {
    const width = Math.min(this.context.terminalWidth, 100);
    
    console.log();
    console.log(chalk.magenta('╔' + '═'.repeat(width - 2) + '╗'));
    console.log(chalk.magenta('║') + this.centerText(chalk.bold(`♪ MONTAGE: ${title.toUpperCase()} ♪`), width - 2) + chalk.magenta('║'));
    console.log(chalk.magenta('║') + ' '.repeat(width - 2) + chalk.magenta('║'));
    
    // Commit timeline
    const boxWidth = 14;
    const commitsPerRow = Math.floor((width - 4) / (boxWidth + 4));
    
    for (let i = 0; i < commits.length; i += commitsPerRow) {
      const rowCommits = commits.slice(i, i + commitsPerRow);
      
      // Top border
      let line1 = '  ';
      for (const _ of rowCommits) {
        line1 += '┌' + '─'.repeat(boxWidth) + '┐   ';
      }
      console.log(chalk.magenta('║') + line1.padEnd(width - 2) + chalk.magenta('║'));
      
      // Content
      let line2 = '  ';
      for (const commit of rowCommits) {
        const msg = commit.message.substring(0, boxWidth - 2);
        line2 += '│ ' + msg.padEnd(boxWidth - 2) + ' │ → ';
      }
      console.log(chalk.magenta('║') + chalk.dim(line2.slice(0, -3).padEnd(width - 2)) + chalk.magenta('║'));
      
      // Author
      let line3 = '  ';
      for (const commit of rowCommits) {
        const author = commit.author.name.substring(0, boxWidth - 2);
        line3 += '│ ' + chalk.cyan(author.padEnd(boxWidth - 2)) + ' │   ';
      }
      console.log(chalk.magenta('║') + line3.padEnd(width - 2) + chalk.magenta('║'));
      
      // Bottom border
      let line4 = '  ';
      for (const _ of rowCommits) {
        line4 += '└' + '─'.repeat(boxWidth) + '┘   ';
      }
      console.log(chalk.magenta('║') + line4.padEnd(width - 2) + chalk.magenta('║'));
    }
    
    console.log(chalk.magenta('║') + ' '.repeat(width - 2) + chalk.magenta('║'));
    console.log(chalk.magenta('║') + this.centerText(chalk.dim(`${commits.length} commits`), width - 2) + chalk.magenta('║'));
    console.log(chalk.magenta('╚' + '═'.repeat(width - 2) + '╝'));
    console.log();
  }

  renderMergeConflict(branch1: string, branch2: string, file: string): void {
    console.log();
    console.log(this.centerText(chalk.red.bold('⚔️  CONFLICT  ⚔️'), this.context.terminalWidth));
    console.log();
    console.log(this.centerText(`${chalk.cyan(branch1)}  ◄═══╦═══►  ${chalk.cyan(branch2)}`, this.context.terminalWidth));
    console.log(this.centerText(chalk.dim('║'), this.context.terminalWidth));
    console.log(this.centerText(chalk.yellow(file), this.context.terminalWidth));
    console.log();
  }

  renderReleaseCelebration(version: string, stats: { commits: number; contributors: number }): void {
    const width = Math.min(this.context.terminalWidth, 80);
    
    console.log();
    console.log(chalk.dim('    *    .  *       .             *'));
    console.log(chalk.dim('*   .        *         .     .  *        *'));
    console.log();
    console.log(this.centerText(chalk.bold.green(`🚀 ${version} RELEASED 🚀`), this.context.terminalWidth));
    console.log();
    console.log(this.centerText(chalk.dim(`${stats.commits} commits · ${stats.contributors} contributors`), this.context.terminalWidth));
    console.log();
    console.log(chalk.dim('*        .        *'));
    console.log();
  }

  renderProgress(current: number, total: number, label: string): void {
    const width = 40;
    const ratio = total > 0 ? current / total : 0;
    const filled = Math.min(Math.floor(ratio * width), width);
    const bar = '▓'.repeat(filled) + '░'.repeat(width - filled);
    
    process.stdout.write(`\r  ${bar} ${current}/${total} ${label}`);
  }

  clearProgress(): void {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }

  private generatePortrait(profile: CharacterProfile): Portrait {
    // Simple ASCII portrait based on archetype
    const portraits: Record<string, string[]> = {
      'The Architect': [
        '       .─────────.',
        '      /  ◉    ◉  \\',
        '     │     __     │',
        '     │    \\__/    │',
        '      \\  ─────  /',
        '       `───────\'',
        '        /│   │\\',
        '       / │   │ \\',
      ],
      'The Bug Hunter': [
        '      ┌─────────┐',
        '     ╱│ ◉     ◉ │╲',
        '    ╱ │    ▽    │ ╲',
        '   ▕  │  ╰───╯  │  ▏',
        '    ╲ │         │ ╱',
        '     ╲└─────────┘╱',
        '        │   │',
        '       ═╧═══╧═',
      ],
      'The Night Owl': [
        '     ╭──◠◡◠──╮',
        '    ╱  ⊙   ⊙  ╲',
        '   │     ▼     │',
        '   │   ╰═══╯   │',
        '    ╲ ░░░░░░░ ╱',
        '     ╰───────╯',
        '      ☾│   │☽',
        '       ╰───╯',
      ],
      'default': [
        '       .─────.',
        '      ( ◉   ◉ )',
        '      │   ▽   │',
        '      │  ───  │',
        '       ╲_____╱',
        '        │   │',
        '       ╱│   │╲',
        '      ╱ │   │ ╲',
      ],
    };

    const lines = portraits[profile.archetype] || portraits['default'];
    const width = Math.max(...lines.map(l => l.length));

    return {
      lines,
      width,
      height: lines.length,
    };
  }

  private centerText(text: string, width: number): string {
    const visibleLength = this.stripAnsi(text).length;
    const padding = Math.max(0, Math.floor((width - visibleLength) / 2));
    return ' '.repeat(padding) + text + ' '.repeat(width - padding - visibleLength);
  }

  private stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  private wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
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
