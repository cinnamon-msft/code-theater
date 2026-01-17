/**
 * Compact Animal ASCII Art Portraits
 */

import type { CharacterProfile } from '../types.js';

export interface DetailedPortrait {
  lines: string[];
  width: number;
  height: number;
}

// The Architect - Eagle (visionary, sees big picture)
const EAGLE_PORTRAIT = `
      __
     /o \\
    |    \\
   /      \\___
  /   __       \\
 |   /  \\       |
  \\_/    \\_____/
`.trim().split('\n');

// The Bug Hunter - Fox (clever detective)
const FOX_PORTRAIT = `
   /\\   /\\
  //\\\\_//\\\\
  \\_     _/
   / * * \\
   \\_\\O/_/
     /   \\
    /     \\
`.trim().split('\n');

// The Night Owl - Owl (works late)
const OWL_PORTRAIT = `
   ,_,
  (O,O)
  (   )
  -"-"-
   ^ ^
`.trim().split('\n');

// The Refactorer - Cat (clean, precise)
const CAT_PORTRAIT = `
   /\\_/\\
  ( o.o )
   > ^ <
  /|   |\\
 (_|   |_)
`.trim().split('\n');

// The Documentation Hero - Elephant (never forgets)
const ELEPHANT_PORTRAIT = `
     __
    /  \\~~
   |    |
   | __ |
    \\  /
    (||)
   _/  \\_
`.trim().split('\n');

// The Perfectionist - Bee (meticulous worker)  
const BEE_PORTRAIT = `
     __
    /  \\
   | oo |
  <( -- )>
    \\  /
   ='=='=
`.trim().split('\n');

// The Journeyman - Wolf (pack player, adaptable)
const WOLF_PORTRAIT = `
    /\\  /\\
   /  \\/  \\
  / /\\  /\\ \\
  \\/ (oo) \\/
     <  >
     _/\\_
`.trim().split('\n');

// The Speedster - Cheetah (fast mover)
const CHEETAH_PORTRAIT = `
   .---.
  / o o \\
 (   "   )
  \\  -  /~~
   '---'   \\
     | | |  >
`.trim().split('\n');

// The Guardian - Bear (protective, thorough)
const BEAR_PORTRAIT = `
   _____
  /     \\
 | () () |
 |   ^   |
 |  \\_/  |
  \\_____/
`.trim().split('\n');

// The Innovator - Octopus (multi-tasker, creative)
const OCTOPUS_PORTRAIT = `
    ___
   /o o\\
  |  ^  |
 /|\\|/|\\|\\
( | | | | )
   \\|/|/
`.trim().split('\n');

const PORTRAITS: Record<string, string[]> = {
  'The Architect': EAGLE_PORTRAIT,
  'The Bug Hunter': FOX_PORTRAIT,
  'The Night Owl': OWL_PORTRAIT,
  'The Refactorer': CAT_PORTRAIT,
  'The Documentation Hero': ELEPHANT_PORTRAIT,
  'The Perfectionist': BEE_PORTRAIT,
  'The Journeyman': WOLF_PORTRAIT,
  'The Speedster': CHEETAH_PORTRAIT,
  'The Guardian': BEAR_PORTRAIT,
  'The Innovator': OCTOPUS_PORTRAIT,
};

export function getDetailedPortrait(profile: CharacterProfile): DetailedPortrait {
  const lines = PORTRAITS[profile.archetype] || WOLF_PORTRAIT;
  const width = Math.max(...lines.map(l => l.length));
  
  return {
    lines,
    width,
    height: lines.length,
  };
}

export function renderPortraitWithInfo(
  name: string,
  profile: CharacterProfile,
  stats?: { commits: number; topFiles: string[] }
): string[] {
  const portrait = getDetailedPortrait(profile);
  const output: string[] = [];
  
  const infoLines = [
    '',
    `  ${profile.emoji} ${name}`,
    '  ' + '─'.repeat(25),
    `  ${profile.archetype}`,
    '',
    ...profile.traits.slice(0, 4).map(t => `  • ${t}`),
    '',
  ];
  
  if (stats) {
    infoLines.push(`  📊 ${stats.commits} commits`);
    if (stats.topFiles.length > 0) {
      infoLines.push(`  📁 ${stats.topFiles[0]}`);
    }
    infoLines.push('');
  }
  
  infoLines.push(`  "${profile.catchphrase}"`);
  
  const maxLines = Math.max(portrait.lines.length, infoLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const portraitLine = portrait.lines[i] || ' '.repeat(portrait.width);
    const infoLine = infoLines[i] || '';
    output.push(portraitLine + '    ' + infoLine);
  }
  
  return output;
}
