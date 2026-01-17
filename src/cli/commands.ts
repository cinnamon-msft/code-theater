/**
 * CLI Commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import type { GenerateOptions, Genre } from '../types.js';
import { GitService, GitExtractor, RemoteHandler } from '../git/index.js';
import { TheaterClient } from '../ai/client.js';
import { SessionManager } from '../sessions/manager.js';
import { SceneGenerator } from '../scenes/generator.js';
import { AsciiRenderer } from '../ascii/renderer.js';
import { renderPortraitWithInfo } from '../ascii/portraits.js';
import { CommitCache } from '../cache/index.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('code-theater')
    .description('🎭 Turn your git history into a dramatic screenplay')
    .version('1.0.0');

  // Generate command
  program
    .command('generate')
    .description('Generate a screenplay from git history')
    .option('-r, --repo <path>', 'Repository path or GitHub URL', '.')
    .option('-f, --from <ref>', 'Start reference (tag, SHA, date, or "latest-release")')
    .option('-t, --to <ref>', 'End reference (tag, SHA, date, or "HEAD")', 'HEAD')
    .option('-g, --genre <genre>', 'Genre: drama, comedy, thriller, noir', 'drama')
    .option('-c, --continue', 'Continue from previous session', false)
    .option('--forget', 'Forget previous sessions and start fresh', false)
    .option('--full', 'Generate scenes for every commit', false)
    .option('--highlights-only', 'Only generate pivotal moments', false)
    .option('--tool-budget <number>', 'AI exploration budget per scene', '20')
    .option('--copilot-cli <path>', 'Path to Copilot CLI executable')
    .option('-e, --export <file>', 'Export to file (strips ANSI codes)')
    .action(async (opts) => {
      const options: GenerateOptions = {
        repo: opts.repo,
        from: opts.from,
        to: opts.to,
        genre: opts.genre as Genre,
        continue: opts.continue,
        forget: opts.forget,
        full: opts.full,
        highlightsOnly: opts.highlightsOnly,
        toolBudget: parseInt(opts.toolBudget, 10),
        copilotCli: opts.copilotCli,
        export: opts.export,
      };

      await runGenerate(options);
    });

  // Releases command
  program
    .command('releases')
    .description('List available releases/tags')
    .option('-r, --repo <path>', 'Repository path or GitHub URL', '.')
    .action(async (opts) => {
      await runListReleases(opts.repo);
    });

  // Characters command
  program
    .command('characters')
    .description('Show character profiles for contributors')
    .option('-r, --repo <path>', 'Repository path or GitHub URL', '.')
    .option('-f, --from <ref>', 'Start reference')
    .option('-t, --to <ref>', 'End reference', 'HEAD')
    .action(async (opts) => {
      await runShowCharacters(opts.repo, opts.from, opts.to);
    });

  // Sessions command
  program
    .command('sessions')
    .description('Manage story sessions')
    .option('-l, --list', 'List all sessions')
    .option('--clear', 'Clear sessions')
    .option('-r, --repo <path>', 'Repository path for clear')
    .option('--clear-all', 'Clear all sessions')
    .action(async (opts) => {
      if (opts.list) {
        await runListSessions();
      } else if (opts.clearAll) {
        await runClearAllSessions();
      } else if (opts.clear && opts.repo) {
        await runClearSession(opts.repo);
      } else {
        console.log('Use --list, --clear --repo <path>, or --clear-all');
      }
    });

  return program;
}

async function runGenerate(options: GenerateOptions): Promise<void> {
  const spinner = ora('Initializing...').start();

  try {
    // Resolve repository
    const remoteHandler = new RemoteHandler();
    const repoPath = await remoteHandler.resolve(options.repo);
    const repoHash = remoteHandler.getRepoHash(repoPath);

    spinner.text = 'Connecting to repository...';

    // Create git service
    const git = await GitService.create(repoPath);
    const extractor = new GitExtractor(git);

    // Check cache first
    const cache = new CommitCache();
    let extraction = cache.get(repoPath, options.from, options.to);

    if (extraction) {
      spinner.succeed(
        `Using cached history: ${extraction.commits.length} commits by ${extraction.contributors.length} contributors`
      );
    } else {
      spinner.text = 'Extracting commit history...';

      // Extract commits
      extraction = await extractor.extract({
        from: options.from,
        to: options.to,
      });

      // Cache the result
      cache.set(repoPath, options.from, options.to, extraction);

      spinner.succeed(
        `Found ${extraction.commits.length} commits by ${extraction.contributors.length} contributors`
      );
    }

    // Create AI client
    const client = new TheaterClient({
      git,
      toolBudget: options.toolBudget,
      cliPath: options.copilotCli,
    });

    await client.start();

    // Create session manager
    const sessionManager = new SessionManager({
      client,
      repoHash,
    });

    // Get or create sessions
    const { directorSession, characterPool, isNew, actNumber } =
      await sessionManager.getOrCreateSessions(extraction.contributors, {
        continue: options.continue,
        forget: options.forget,
        genre: options.genre,
      });

    console.log(
      chalk.cyan(`\n🎬 ${isNew ? 'New story' : 'Continuing story'} - Act ${actNumber}\n`)
    );

    // Generate screenplay
    const generator = new SceneGenerator();
    await generator.generate(
      extraction.commits,
      directorSession,
      characterPool,
      {
        genre: options.genre,
        streaming: true,
        actNumber,
        full: options.full,
        highlightsOnly: options.highlightsOnly,
      }
    );

    // Save act summary for future sessions
    const lastCommit = extraction.commits[extraction.commits.length - 1];
    await sessionManager.saveActSummary(actNumber, directorSession, lastCommit.sha);

    // Cleanup
    await client.stop();

    console.log(chalk.green('\n✓ Screenplay complete!'));
    console.log(chalk.dim('Use --continue to continue the story in a future session.'));
  } catch (error) {
    spinner.fail('Generation failed');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

async function runListReleases(repo: string): Promise<void> {
  const spinner = ora('Loading releases...').start();

  try {
    const remoteHandler = new RemoteHandler();
    const repoPath = await remoteHandler.resolve(repo);
    const git = await GitService.create(repoPath);
    const extractor = new GitExtractor(git);

    const { tags, commitCounts } = await extractor.listReleases();

    spinner.stop();

    if (tags.length === 0) {
      console.log(chalk.yellow('No releases/tags found in this repository.'));
      return;
    }

    console.log(chalk.cyan('\n📦 Available Releases\n'));
    console.log(chalk.cyan('─'.repeat(60)));

    for (const tag of tags.slice(0, 20)) {
      const count = commitCounts.get(tag.name) || 0;
      const bar = '▓'.repeat(Math.min(count / 10, 20)) + '░'.repeat(Math.max(0, 20 - count / 10));
      
      console.log(
        `  ${chalk.bold(tag.name.padEnd(20))} ${chalk.dim(tag.date.toLocaleDateString().padEnd(12))} ${bar} ${count} commits`
      );
    }

    if (tags.length > 20) {
      console.log(chalk.dim(`\n  ... and ${tags.length - 20} more`));
    }

    console.log(chalk.cyan('─'.repeat(60)));
    console.log(
      chalk.dim('\nUse: code-theater generate --from <tag> --to <tag>')
    );
  } catch (error) {
    spinner.fail('Failed to load releases');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  }
}

async function runShowCharacters(repo: string, from?: string, to?: string): Promise<void> {
  const spinner = ora('Analyzing contributors...').start();

  try {
    const remoteHandler = new RemoteHandler();
    const repoPath = await remoteHandler.resolve(repo);
    const git = await GitService.create(repoPath);
    const extractor = new GitExtractor(git);

    const extraction = await extractor.extract({ from, to });

    spinner.stop();

    console.log(chalk.cyan('\n🎭 CHARACTER PROFILES\n'));

    const { CharacterPool, ARCHETYPES } = await import('../ai/characters.js');
    
    for (const contributor of extraction.contributors.slice(0, 10)) {
      const patterns = contributor.patterns;
      
      // Score each archetype based on how well patterns match
      const scores: { archetype: typeof ARCHETYPES.GENERALIST; score: number }[] = [
        { archetype: ARCHETYPES.NIGHT_OWL, score: patterns.lateNightRatio * 10 },
        { archetype: ARCHETYPES.BUG_HUNTER, score: patterns.testFileRatio * 8 },
        { archetype: ARCHETYPES.REFACTORER, score: patterns.refactorRatio * 8 },
        { archetype: ARCHETYPES.DOCUMENTATION_HERO, score: patterns.docFileRatio * 8 },
        { archetype: ARCHETYPES.ARCHITECT, score: Math.min(patterns.avgFilesPerCommit / 5, 3) },
        { archetype: ARCHETYPES.PERFECTIONIST, score: patterns.avgCommitSize < 50 ? (50 - patterns.avgCommitSize) / 25 : 0 },
        { archetype: ARCHETYPES.GENERALIST, score: 0.5 },
      ];

      scores.sort((a, b) => b.score - a.score);
      const archetype = scores[0].archetype;

      const profile = {
        archetype: archetype.name,
        emoji: archetype.emoji,
        description: archetype.description,
        traits: archetype.traits,
        speechStyle: archetype.speechStyle,
        catchphrase: archetype.catchphrase,
        commitStyle: '',
        relationships: [],
      };

      const lines = renderPortraitWithInfo(contributor.name, profile, {
        commits: contributor.commitCount,
        topFiles: contributor.topFiles,
      });

      for (const line of lines) {
        console.log(line);
      }
      
      console.log();
      console.log(chalk.dim('─'.repeat(70)));
      console.log();
    }
  } catch (error) {
    spinner.fail('Failed to analyze contributors');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  }
}

async function runListSessions(): Promise<void> {
  const sessions = await SessionManager.listAllSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('No active story sessions.'));
    return;
  }

  console.log(chalk.cyan('\n📖 Active Story Sessions\n'));

  for (const { repoHash, session } of sessions) {
    console.log(chalk.bold(`  ${repoHash.substring(0, 8)}...`));
    console.log(chalk.dim(`    Acts: ${session.actCount}`));
    console.log(chalk.dim(`    Last: ${new Date(session.lastGenerated).toLocaleString()}`));
    console.log();
  }
}

async function runClearSession(repo: string): Promise<void> {
  const remoteHandler = new RemoteHandler();
  const repoPath = await remoteHandler.resolve(repo);
  const repoHash = remoteHandler.getRepoHash(repoPath);

  // Create a minimal session manager to clear
  const manager = new SessionManager({
    client: null as any, // Won't be used for clearing
    repoHash,
  });

  await manager.clearSessions();
  console.log(chalk.green('✓ Sessions cleared.'));
}

async function runClearAllSessions(): Promise<void> {
  await SessionManager.clearAllSessions();
  console.log(chalk.green('✓ All sessions cleared.'));
}
