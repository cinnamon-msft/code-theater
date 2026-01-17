/**
 * Core types for Code Theater
 */

// Git types
export interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  body: string;
  author: Author;
  date: Date;
  files: FileChange[];
  additions: number;
  deletions: number;
  parents: string[];
}

export interface Author {
  name: string;
  email: string;
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  previousPath?: string;
}

export interface Tag {
  name: string;
  sha: string;
  date: Date;
  message?: string;
}

export interface ContributorStats {
  name: string;
  email: string;
  commitCount: number;
  additions: number;
  deletions: number;
  firstCommit: Date;
  lastCommit: Date;
  topFiles: string[];
  peakHours: string;
  commonWords: string[];
  coAuthors: string[];
  avgDiffSize: number;
  patterns: ContributorPatterns;
}

export interface ContributorPatterns {
  lateNightRatio: number;
  testFileRatio: number;
  refactorRatio: number;
  docFileRatio: number;
  avgFilesPerCommit: number;
  avgCommitSize: number;
}

// Scene types
export interface Scene {
  id: string;
  type: SceneType;
  commit?: Commit;
  commits?: Commit[];  // For montage scenes
  heading: string;
  location: string;
  timeOfDay: string;
  action: string[];
  dialogue: DialogueLine[];
  stageDirections: string[];
  asciiArt?: string;
}

export type SceneType = 
  | 'opening'
  | 'standard'
  | 'conflict'
  | 'climax'
  | 'resolution'
  | 'montage'
  | 'act-break';

export interface DialogueLine {
  character: string;
  text: string;
  parenthetical?: string;
}

// Character types
export interface CharacterProfile {
  archetype: string;
  emoji: string;
  description: string;
  traits: string[];
  speechStyle: string;
  catchphrase: string;
  commitStyle: string;
  relationships: string[];
}

export type ArchetypeName =
  | 'ARCHITECT'
  | 'BUG_HUNTER'
  | 'NIGHT_OWL'
  | 'REFACTORER'
  | 'DOCUMENTATION_HERO'
  | 'PERFECTIONIST'
  | 'GENERALIST'
  | 'SPEEDSTER'
  | 'GUARDIAN'
  | 'INNOVATOR';

export interface ArchetypeTemplate {
  name: string;
  emoji: string;
  description: string;
  traits: string[];
  speechStyle: string;
  catchphrase: string;
}

// Session types
export interface StorySession {
  directorSessionId: string;
  characterSessionIds: Record<string, string>;
  lastGenerated: string;
  actCount: number;
  repoPath: string;
}

export interface StoredNarrative {
  actNumber: number;
  summary: string;
  keyEvents: string[];
  characterStates: Record<string, string>;
  lastCommitSha: string;
  generatedAt: string;
}

// Config types
export interface GenerateOptions {
  repo: string;
  from?: string;
  to?: string;
  genre: Genre;
  continue: boolean;
  forget: boolean;
  full: boolean;
  highlightsOnly: boolean;
  toolBudget: number;
  copilotCli?: string;
  export?: string;
}

export type Genre = 'drama' | 'comedy' | 'thriller' | 'noir';

// Tool system types
export interface ThrottleConfig {
  maxCallsPerScene: number;
  maxCallsPerMinute: number;
  costPerTool: Record<string, number>;
  budgetPerScene: number;
}

export interface ThrottleStats {
  callsUsed: number;
  callsRemaining: number;
  budgetUsed: number;
  budgetRemaining: number;
}

// ASCII Rendering types
export interface RenderContext {
  terminalWidth: number;
  terminalHeight: number;
  colorSupport: 'none' | 'basic' | '256' | 'truecolor';
}

export interface Portrait {
  lines: string[];
  width: number;
  height: number;
}

export interface SceneBackdrop {
  lines: string[];
  width: number;
  height: number;
}
