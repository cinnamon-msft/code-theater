/**
 * Character Pool & Archetype System
 */

import chalk from 'chalk';
import type { CopilotSession } from '@github/copilot-sdk';
import type { ContributorStats, CharacterProfile, ArchetypeTemplate, ArchetypeName } from '../types.js';
import type { TheaterClient } from './client.js';

const MAX_NAMED_CHARACTERS = 10;

export const ARCHETYPES: Record<ArchetypeName, ArchetypeTemplate> = {
  ARCHITECT: {
    name: 'The Architect',
    emoji: '🏛️',
    description: 'Sees the big picture. Makes sweeping changes that reshape the codebase.',
    traits: ['Visionary', 'Bold', 'Sometimes reckless', 'Speaks in abstractions'],
    speechStyle: "Uses architectural metaphors. Talks about 'foundations' and 'structures'.",
    catchphrase: 'We need to think bigger.',
  },
  BUG_HUNTER: {
    name: 'The Bug Hunter',
    emoji: '🔍',
    description: 'Patient detective. Finds the bugs nobody else can see.',
    traits: ['Methodical', 'Skeptical', 'Detail-oriented', 'Quietly triumphant'],
    speechStyle: "Precise. Uses evidence. 'The logs show...' and 'I traced it to...'",
    catchphrase: 'Found it.',
  },
  NIGHT_OWL: {
    name: 'The Night Owl',
    emoji: '🦉',
    description: 'Does their best work when everyone else is asleep.',
    traits: ['Mysterious', 'Intense', 'Coffee-dependent', 'Unexpectedly poetic'],
    speechStyle: 'Slightly dramatic. References the silence of night. Tired but wired.',
    catchphrase: 'The code speaks clearer at 3 AM.',
  },
  REFACTORER: {
    name: 'The Refactorer',
    emoji: '✨',
    description: 'Cannot let ugly code stand. Cleans what others leave behind.',
    traits: ['Perfectionist', 'Compulsive', 'Principled', 'Sometimes annoying'],
    speechStyle: "Talks about 'proper' ways. Names patterns. Sighs at legacy code.",
    catchphrase: 'This could be cleaner.',
  },
  DOCUMENTATION_HERO: {
    name: 'The Documentation Hero',
    emoji: '📚',
    description: 'The unsung hero who makes sure others can understand the code.',
    traits: ['Patient', 'Empathetic', 'Long-term thinker', 'Underappreciated'],
    speechStyle: "Explains things clearly. Asks 'what if someone new reads this?'",
    catchphrase: 'Future us will thank present us.',
  },
  PERFECTIONIST: {
    name: 'The Perfectionist',
    emoji: '💎',
    description: 'Small, perfect commits. Every line considered.',
    traits: ['Careful', 'Anxious', 'High standards', 'Slow but reliable'],
    speechStyle: "Hedges statements. 'I think...' and 'Maybe we should...'",
    catchphrase: 'Let me just fix this one thing first.',
  },
  GENERALIST: {
    name: 'The Journeyman',
    emoji: '🛤️',
    description: 'Versatile contributor who goes where needed.',
    traits: ['Adaptable', 'Reliable', 'Team player', 'Jack of all trades'],
    speechStyle: "Practical. 'Whatever works' attitude. Team-focused language.",
    catchphrase: "I'll take care of it.",
  },
};

export class CharacterPool {
  private namedSessions: Map<string, CopilotSession> = new Map();
  private ensembleSession: CopilotSession | null = null;
  private characterProfiles: Map<string, CharacterProfile> = new Map();
  private client: TheaterClient;

  constructor(client: TheaterClient) {
    this.client = client;
  }

  async initialize(contributors: ContributorStats[]): Promise<void> {
    // Sort by commit count, take top 10
    const sorted = [...contributors].sort((a, b) => b.commitCount - a.commitCount);
    const named = sorted.slice(0, MAX_NAMED_CHARACTERS);
    const ensemble = sorted.slice(MAX_NAMED_CHARACTERS);

    console.log(chalk.cyan('\n🎭 CAST OF CHARACTERS\n'));
    console.log(chalk.cyan('─'.repeat(50)));

    // Create named character sessions
    for (const contributor of named) {
      const profile = this.buildProfile(contributor);
      this.characterProfiles.set(contributor.name, profile);

      const session = await this.client.createCharacterSession(contributor.name, {
        archetype: profile.archetype,
        peakHours: contributor.peakHours,
        topFiles: contributor.topFiles,
        commitStyle: profile.commitStyle,
        traits: profile.traits,
        speechStyle: profile.speechStyle,
        catchphrase: profile.catchphrase,
      });

      this.namedSessions.set(contributor.name, session);

      console.log(`  ${profile.emoji} ${chalk.bold(contributor.name)}`);
      console.log(`     ${chalk.dim(profile.archetype)} · ${contributor.commitCount} commits`);
    }

    // Create ensemble session for minor characters
    if (ensemble.length > 0) {
      console.log(`\n  👥 ${chalk.dim(`Ensemble (${ensemble.length} contributors)`)}`);

      this.ensembleSession = await this.client.createEnsembleSession(
        ensemble.map((c) => c.name)
      );
    }

    console.log(chalk.cyan('─'.repeat(50)));
  }

  getProfile(authorName: string): CharacterProfile | undefined {
    return this.characterProfiles.get(authorName);
  }

  getSession(authorName: string): CopilotSession {
    const named = this.namedSessions.get(authorName);
    if (named) return named;

    if (this.ensembleSession) return this.ensembleSession;

    throw new Error(`No session available for ${authorName}`);
  }

  isNamedCharacter(authorName: string): boolean {
    return this.namedSessions.has(authorName);
  }

  getAllProfiles(): Map<string, CharacterProfile> {
    return this.characterProfiles;
  }

  getNamedCharacters(): string[] {
    return Array.from(this.namedSessions.keys());
  }

  async generateDialogue(
    authorName: string,
    situation: string
  ): Promise<string> {
    const session = this.getSession(authorName);
    const isEnsemble = !this.namedSessions.has(authorName);

    const prompt = isEnsemble
      ? `Speaking as ${authorName} (minor character), respond briefly to: ${situation}`
      : `Respond in character to this situation: ${situation}

Keep your response to 1-3 sentences of dialogue only. No action descriptions.`;

    const response = await session.sendAndWait({ prompt });
    return response?.data?.content || '';
  }

  private buildProfile(contributor: ContributorStats): CharacterProfile {
    const archetype = this.detectArchetype(contributor);
    const commitStyle = this.analyzeCommitStyle(contributor);

    return {
      archetype: archetype.name,
      emoji: archetype.emoji,
      description: archetype.description,
      traits: archetype.traits,
      speechStyle: archetype.speechStyle,
      catchphrase: archetype.catchphrase,
      commitStyle,
      relationships: [],
    };
  }

  private detectArchetype(contributor: ContributorStats): ArchetypeTemplate {
    const patterns = contributor.patterns;

    if (patterns.lateNightRatio > 0.4) {
      return ARCHETYPES.NIGHT_OWL;
    }
    if (patterns.testFileRatio > 0.3) {
      return ARCHETYPES.BUG_HUNTER;
    }
    if (patterns.refactorRatio > 0.25) {
      return ARCHETYPES.REFACTORER;
    }
    if (patterns.docFileRatio > 0.2) {
      return ARCHETYPES.DOCUMENTATION_HERO;
    }
    if (patterns.avgFilesPerCommit > 10) {
      return ARCHETYPES.ARCHITECT;
    }
    if (patterns.avgCommitSize < 20) {
      return ARCHETYPES.PERFECTIONIST;
    }

    return ARCHETYPES.GENERALIST;
  }

  private analyzeCommitStyle(contributor: ContributorStats): string {
    const words = contributor.commonWords;
    const patterns = contributor.patterns;

    const styles: string[] = [];

    if (words.includes('fix') || words.includes('bug')) {
      styles.push('bug-focused');
    }
    if (words.includes('refactor') || words.includes('clean')) {
      styles.push('cleanup-oriented');
    }
    if (words.includes('feat') || words.includes('add')) {
      styles.push('feature-driven');
    }
    if (patterns.avgCommitSize < 30) {
      styles.push('small atomic commits');
    }
    if (patterns.avgCommitSize > 200) {
      styles.push('large sweeping changes');
    }

    return styles.length > 0 ? styles.join(', ') : 'balanced contributor';
  }

  async destroy(): Promise<void> {
    // Sessions are managed by the client
    this.namedSessions.clear();
    this.ensembleSession = null;
    this.characterProfiles.clear();
  }
}
