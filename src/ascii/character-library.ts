/**
 * Large Character Library
 * Animals and personas for unique character generation
 */

export interface AnimalCharacter {
  name: string;
  emoji: string;
  art: string[];
  traits: string[];
  speechStyle: string;
  catchphrase: string;
}

// Clean, properly aligned ASCII animals
const ANIMALS: AnimalCharacter[] = [
  {
    name: 'The Fox',
    emoji: '🦊',
    art: [
      '   /\\   /\\   ',
      '  (  o o  )  ',
      '  (  =^=  )  ',
      '   -)   (-   ',
    ],
    traits: ['Clever', 'Cunning', 'Quick-witted'],
    speechStyle: 'Sly and calculating',
    catchphrase: 'I knew it all along.',
  },
  {
    name: 'The Owl',
    emoji: '🦉',
    art: [
      '   ,_,   ',
      '  (O,O)  ',
      '  (   )  ',
      '   " "   ',
    ],
    traits: ['Wise', 'Observant', 'Nocturnal'],
    speechStyle: 'Thoughtful and measured',
    catchphrase: 'Patience reveals truth.',
  },
  {
    name: 'The Cat',
    emoji: '🐱',
    art: [
      '  /\\_/\\  ',
      ' ( o.o ) ',
      '  > ^ <  ',
      '   ~~~   ',
    ],
    traits: ['Independent', 'Precise', 'Aloof'],
    speechStyle: 'Dismissive but brilliant',
    catchphrase: 'Obviously.',
  },
  {
    name: 'The Wolf',
    emoji: '🐺',
    art: [
      '   /\\  ',
      '  /  \\ ',
      ' (o  o)',
      '  \\__/ ',
    ],
    traits: ['Loyal', 'Pack-minded', 'Strategic'],
    speechStyle: 'Direct and commanding',
    catchphrase: 'Together we hunt.',
  },
  {
    name: 'The Bear',
    emoji: '🐻',
    art: [
      ' ʕ·ᴥ·ʔ ',
      '  /|  ',
      ' / |  ',
    ],
    traits: ['Strong', 'Protective', 'Methodical'],
    speechStyle: 'Slow but powerful',
    catchphrase: 'Stand your ground.',
  },
  {
    name: 'The Eagle',
    emoji: '🦅',
    art: [
      '   __   ',
      '  /o \\  ',
      ' <    > ',
      '  \\__/  ',
    ],
    traits: ['Visionary', 'Far-sighted', 'Noble'],
    speechStyle: 'Grand and inspiring',
    catchphrase: 'See the bigger picture.',
  },
  {
    name: 'The Rabbit',
    emoji: '🐰',
    art: [
      ' (\\(\\  ',
      ' ( -.-)  ',
      ' o_(")(") ',
    ],
    traits: ['Fast', 'Nervous', 'Detail-oriented'],
    speechStyle: 'Quick and jittery',
    catchphrase: 'Quick quick quick!',
  },
  {
    name: 'The Penguin',
    emoji: '🐧',
    art: [
      '   __   ',
      ' _(. .)_ ',
      '  /)_)\\  ',
      '   " "   ',
    ],
    traits: ['Formal', 'Coordinated', 'Resilient'],
    speechStyle: 'Proper and organized',
    catchphrase: 'Order brings success.',
  },
  {
    name: 'The Octopus',
    emoji: '🐙',
    art: [
      '   ___   ',
      '  (o o)  ',
      ' /|||||\\  ',
    ],
    traits: ['Multi-tasker', 'Flexible', 'Clever'],
    speechStyle: 'Juggling many thoughts',
    catchphrase: 'I can handle this.',
  },
  {
    name: 'The Bee',
    emoji: '🐝',
    art: [
      '  \\_/  ',
      ' -(_)- ',
      '  / \\  ',
    ],
    traits: ['Industrious', 'Focused', 'Team player'],
    speechStyle: 'Busy and efficient',
    catchphrase: 'Work work work!',
  },
  {
    name: 'The Lion',
    emoji: '🦁',
    art: [
      '  \\||||/  ',
      '  ( o o ) ',
      '   \\  /  ',
      '    \\/   ',
    ],
    traits: ['Bold', 'Confident', 'Leader'],
    speechStyle: 'Commanding presence',
    catchphrase: 'Follow my lead.',
  },
  {
    name: 'The Turtle',
    emoji: '🐢',
    art: [
      '    _    ',
      '  _( )_  ',
      ' (_)_(_) ',
    ],
    traits: ['Patient', 'Steady', 'Reliable'],
    speechStyle: 'Slow and deliberate',
    catchphrase: 'Slow and steady wins.',
  },
  {
    name: 'The Mouse',
    emoji: '🐭',
    art: [
      '  ()_()  ',
      '  (o o)  ',
      '  ==*==  ',
    ],
    traits: ['Quiet', 'Observant', 'Resourceful'],
    speechStyle: 'Soft but insightful',
    catchphrase: 'Small details matter.',
  },
  {
    name: 'The Dragon',
    emoji: '🐉',
    art: [
      '   /\\_  ',
      '  ( o>  ',
      '  /|\\   ',
      '   ^ ^  ',
    ],
    traits: ['Powerful', 'Ancient', 'Fearsome'],
    speechStyle: 'Deep and rumbling',
    catchphrase: 'Fire solves everything.',
  },
  {
    name: 'The Shark',
    emoji: '🦈',
    art: [
      '   /\\    ',
      ' _/  \\__ ',
      '<_o    _>',
    ],
    traits: ['Relentless', 'Focused', 'Efficient'],
    speechStyle: 'Sharp and cutting',
    catchphrase: 'Keep moving forward.',
  },
  {
    name: 'The Panda',
    emoji: '🐼',
    art: [
      ' ʕ ●_● ʔ ',
      '  /    \\ ',
      ' ( ---- )',
    ],
    traits: ['Calm', 'Balanced', 'Thoughtful'],
    speechStyle: 'Zen-like wisdom',
    catchphrase: 'Balance in all things.',
  },
  {
    name: 'The Crow',
    emoji: '🪶',
    art: [
      '   _   ',
      '  (o>  ',
      ' //\\\\  ',
      ' V  V  ',
    ],
    traits: ['Cunning', 'Collector', 'Messenger'],
    speechStyle: 'Cryptic hints',
    catchphrase: 'I see what others miss.',
  },
  {
    name: 'The Dolphin',
    emoji: '🐬',
    art: [
      '     __  ',
      ' _--/  \\ ',
      '(  o    )',
    ],
    traits: ['Playful', 'Smart', 'Social'],
    speechStyle: 'Cheerful and quick',
    catchphrase: 'Let us have fun with this!',
  },
  {
    name: 'The Elephant',
    emoji: '🐘',
    art: [
      '   __   ',
      '  /  \\  ',
      ' | oo | ',
      '  \\__/  ',
    ],
    traits: ['Memory', 'Wise', 'Strong'],
    speechStyle: 'Never forgets details',
    catchphrase: 'I remember everything.',
  },
  {
    name: 'The Monkey',
    emoji: '🐒',
    art: [
      '  @@@  ',
      ' (o o) ',
      '  \\_/  ',
      '  -U-  ',
    ],
    traits: ['Curious', 'Agile', 'Mischievous'],
    speechStyle: 'Excitable chatter',
    catchphrase: 'Ooh, what is this?',
  },
];

export interface Persona {
  role: string;
  description: string;
  motivation: string;
}

const PERSONAS: Persona[] = [
  { role: 'The Architect', description: 'Designs the grand structure', motivation: 'Build something lasting' },
  { role: 'The Detective', description: 'Hunts down elusive bugs', motivation: 'Find the truth' },
  { role: 'The Night Owl', description: 'Works when others sleep', motivation: 'Peace and quiet' },
  { role: 'The Cleaner', description: 'Refactors messy code', motivation: 'Perfection in form' },
  { role: 'The Scribe', description: 'Documents everything', motivation: 'Knowledge preserved' },
  { role: 'The Artisan', description: 'Crafts perfect commits', motivation: 'Pride in craft' },
  { role: 'The Nomad', description: 'Goes where needed', motivation: 'Variety and challenge' },
  { role: 'The Speedster', description: 'Ships at lightning pace', motivation: 'Velocity above all' },
  { role: 'The Guardian', description: 'Protects code quality', motivation: 'Safety first' },
  { role: 'The Inventor', description: 'Creates new solutions', motivation: 'Innovation' },
  { role: 'The Mentor', description: 'Guides others', motivation: 'Teach and grow' },
  { role: 'The Fixer', description: 'Solves urgent problems', motivation: 'Be the hero' },
  { role: 'The Pioneer', description: 'Explores new territory', motivation: 'Discovery' },
  { role: 'The Diplomat', description: 'Resolves merge conflicts', motivation: 'Harmony' },
  { role: 'The Optimizer', description: 'Makes everything faster', motivation: 'Peak performance' },
  { role: 'The Curator', description: 'Organizes chaos', motivation: 'Order from chaos' },
  { role: 'The Visionary', description: 'Sees what could be', motivation: 'Transform reality' },
  { role: 'The Debugger', description: 'Traces every issue', motivation: 'Root cause analysis' },
  { role: 'The Integrator', description: 'Connects all pieces', motivation: 'Unity' },
  { role: 'The Rebel', description: 'Breaks conventions', motivation: 'Better ways exist' },
];

export interface AssignedCharacter {
  contributorName: string;
  animal: AnimalCharacter;
  persona: Persona;
}

export function assignCharacters(contributorNames: string[], count: number = 5): AssignedCharacter[] {
  // Shuffle and pick random animals and personas
  const shuffledAnimals = [...ANIMALS].sort(() => Math.random() - 0.5);
  const shuffledPersonas = [...PERSONAS].sort(() => Math.random() - 0.5);
  
  // Take top N contributors
  const selectedContributors = contributorNames.slice(0, count);
  
  return selectedContributors.map((name, i) => ({
    contributorName: name,
    animal: shuffledAnimals[i % shuffledAnimals.length],
    persona: shuffledPersonas[i % shuffledPersonas.length],
  }));
}

export function getRandomAnimals(): AnimalCharacter[] {
  return [...ANIMALS].sort(() => Math.random() - 0.5);
}

export function getRandomPersonas(): Persona[] {
  return [...PERSONAS].sort(() => Math.random() - 0.5);
}
