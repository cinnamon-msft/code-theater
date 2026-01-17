/**
 * Story-focused Scene Generator
 * Summarizes commits into major themes and creates a cohesive narrative
 */

import type { CopilotSession } from '@github/copilot-sdk';
import type { Commit, Genre } from '../types.js';
import { TheaterTUI } from '../ascii/theater-tui.js';
import type { AssignedCharacter } from '../ascii/character-library.js';

export interface StoryGeneratorOptions {
  genre: Genre;
  actNumber: number;
}

interface StoryTheme {
  title: string;
  description: string;
  commits: Commit[];
  protagonist: string;
}

export class StoryGenerator {
  private tui: TheaterTUI;

  constructor() {
    this.tui = new TheaterTUI();
  }

  async generate(
    commits: Commit[],
    directorSession: CopilotSession,
    contributorNames: string[],
    options: StoryGeneratorOptions
  ): Promise<void> {
    // First, analyze all commits to find major themes
    console.log('\n🎬 Analyzing commit history for major story arcs...\n');
    
    const themes = await this.identifyThemes(commits, directorSession);
    
    // Initialize TUI with theme-based commits
    this.tui.initializeWithThemes(commits, contributorNames, themes);
    
    const characters = this.tui.getCharacters();
    
    // Display prologue
    this.tui.setTitle(`CODE THEATER - Act ${options.actNumber}`);
    this.tui.setAction('PROLOGUE: The story begins...');
    this.tui.render();
    await this.tui.sleep(3000);

    // Generate story based on themes
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      this.tui.setScene(i);
      
      // Find character for protagonist
      const character = this.tui.getCharacterForContributor(theme.protagonist) ||
                       characters[i % characters.length];
      
      await this.generateThemeScene(theme, character, directorSession, options, i + 1);
      
      // Pause between scenes - longer for reading
      await this.tui.sleep(5000);
    }

    // Epilogue
    this.tui.setAction('EPILOGUE: And so the release was shipped...');
    this.tui.clearDialogue();
    this.tui.render();
    await this.tui.sleep(4000);
    
    // Final
    this.tui.setAction('THE END');
    this.tui.render();
    await this.tui.sleep(2000);
    
    this.tui.cleanup();
  }

  private async identifyThemes(
    commits: Commit[],
    directorSession: CopilotSession
  ): Promise<StoryTheme[]> {
    // Group commits by common patterns
    const commitSummary = this.summarizeCommits(commits);
    
    const prompt = `Analyze these commit patterns from a software release and identify the 5 MAJOR story arcs or themes.

COMMIT SUMMARY:
${commitSummary}

TOP AUTHORS: ${this.getTopAuthors(commits).join(', ')}

Respond with exactly 5 themes in this JSON format (no markdown, just JSON):
[
  {"title": "Theme Title", "keywords": ["keyword1", "keyword2"], "protagonist": "Author Name"},
  ...
]

Focus on:
- Major features added
- Important bug fixes
- Refactoring efforts  
- Performance improvements
- Breaking changes

Make the titles dramatic and story-like.`;

    try {
      const response = await directorSession.sendAndWait({ prompt });
      const content = response?.data?.content || '';
      
      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.mapThemesToCommits(parsed, commits);
      }
    } catch (e) {
      // Fallback to automatic theme detection
    }
    
    // Fallback: create themes from commit patterns
    return this.createFallbackThemes(commits);
  }

  private summarizeCommits(commits: Commit[]): string {
    const categories = new Map<string, number>();
    const keywords = new Map<string, number>();
    
    for (const commit of commits) {
      const msg = commit.message.toLowerCase();
      
      // Categorize
      if (msg.includes('fix') || msg.includes('bug')) {
        categories.set('Bug Fixes', (categories.get('Bug Fixes') || 0) + 1);
      }
      if (msg.includes('feat') || msg.includes('add')) {
        categories.set('Features', (categories.get('Features') || 0) + 1);
      }
      if (msg.includes('refactor') || msg.includes('clean')) {
        categories.set('Refactoring', (categories.get('Refactoring') || 0) + 1);
      }
      if (msg.includes('perf') || msg.includes('optim')) {
        categories.set('Performance', (categories.get('Performance') || 0) + 1);
      }
      if (msg.includes('test')) {
        categories.set('Testing', (categories.get('Testing') || 0) + 1);
      }
      if (msg.includes('doc')) {
        categories.set('Documentation', (categories.get('Documentation') || 0) + 1);
      }
      
      // Extract keywords
      const words = msg.split(/\W+/).filter(w => w.length > 4);
      for (const word of words) {
        keywords.set(word, (keywords.get(word) || 0) + 1);
      }
    }
    
    const catSummary = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}: ${count} commits`)
      .join('\n');
    
    const topKeywords = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => `${word} (${count})`)
      .join(', ');
    
    return `Total commits: ${commits.length}

Categories:
${catSummary}

Top keywords: ${topKeywords}`;
  }

  private getTopAuthors(commits: Commit[]): string[] {
    const authorCounts = new Map<string, number>();
    for (const commit of commits) {
      const author = commit.author.name;
      authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
    }
    return Array.from(authorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  private mapThemesToCommits(
    themes: { title: string; keywords: string[]; protagonist: string }[],
    commits: Commit[]
  ): StoryTheme[] {
    return themes.map(theme => {
      // Find commits matching keywords
      const matchingCommits = commits.filter(c => {
        const msg = c.message.toLowerCase();
        return theme.keywords.some(kw => msg.includes(kw.toLowerCase()));
      }).slice(0, 10);
      
      return {
        title: theme.title,
        description: `A story about ${theme.keywords.join(', ')}`,
        commits: matchingCommits.length > 0 ? matchingCommits : commits.slice(0, 5),
        protagonist: theme.protagonist,
      };
    });
  }

  private createFallbackThemes(commits: Commit[]): StoryTheme[] {
    const topAuthors = this.getTopAuthors(commits);
    
    return [
      {
        title: 'The Beginning',
        description: 'Where it all started',
        commits: commits.slice(0, Math.ceil(commits.length / 5)),
        protagonist: topAuthors[0] || 'Unknown',
      },
      {
        title: 'The Challenge',
        description: 'Obstacles appeared',
        commits: commits.filter(c => c.message.toLowerCase().includes('fix')).slice(0, 10),
        protagonist: topAuthors[1] || topAuthors[0] || 'Unknown',
      },
      {
        title: 'The Innovation',
        description: 'New ideas emerged',
        commits: commits.filter(c => c.message.toLowerCase().includes('feat') || c.message.toLowerCase().includes('add')).slice(0, 10),
        protagonist: topAuthors[2] || topAuthors[0] || 'Unknown',
      },
      {
        title: 'The Refinement',
        description: 'Polishing the work',
        commits: commits.filter(c => c.message.toLowerCase().includes('refactor')).slice(0, 10),
        protagonist: topAuthors[3] || topAuthors[0] || 'Unknown',
      },
      {
        title: 'The Resolution',
        description: 'Bringing it all together',
        commits: commits.slice(-Math.ceil(commits.length / 5)),
        protagonist: topAuthors[4] || topAuthors[0] || 'Unknown',
      },
    ];
  }

  private async generateThemeScene(
    theme: StoryTheme,
    character: AssignedCharacter,
    directorSession: CopilotSession,
    options: StoryGeneratorOptions,
    sceneNumber: number
  ): Promise<void> {
    // Set theme as action
    this.tui.setAction(`📖 ${theme.title}: ${theme.description}`);
    this.tui.render();
    await this.tui.sleep(2000);

    // Generate dialogue about the theme
    const commitMessages = theme.commits.slice(0, 5).map(c => c.message).join('\n- ');
    
    const prompt = `You are writing dialogue for a ${options.genre} screenplay about software development.

SCENE: "${theme.title}"
THEME: ${theme.description}

CHARACTER:
- Name: ${character.contributorName}
- Role: ${character.persona.role}
- Personality: ${character.animal.traits.join(', ')}

KEY COMMITS IN THIS CHAPTER:
- ${commitMessages}

Write 2-3 sentences of dramatic dialogue (max 150 characters total) that this character would say about this part of the release. They should reflect on the theme and what was accomplished.
Just the dialogue, no character name prefix.`;

    try {
      const response = await directorSession.sendAndWait({ prompt });
      let dialogue = response?.data?.content?.trim().replace(/^["']|["']$/g, '') || 
                    character.animal.catchphrase;
      
      // Clean up the dialogue
      dialogue = dialogue.replace(/\n/g, ' ').trim();
      
      this.tui.setDialogue(character.contributorName, dialogue);
      this.tui.render();
    } catch {
      this.tui.setDialogue(character.contributorName, character.animal.catchphrase);
      this.tui.render();
    }
  }
}
