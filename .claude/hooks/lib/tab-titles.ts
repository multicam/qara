/**
 * Tab Title Utilities
 * 
 * Shared functions for generating and setting terminal tab titles.
 * Used by stop-hook.ts and potentially other hooks.
 */

/**
 * Common stop words to filter out when generating titles
 */
const STOP_WORDS = new Set([
  'the', 'and', 'but', 'for', 'are', 'with', 'his', 'her', 'this', 'that',
  'you', 'can', 'will', 'have', 'been', 'your', 'from', 'they', 'were',
  'said', 'what', 'them', 'just', 'told', 'how', 'does', 'into', 'about',
  'completed'
]);

/**
 * Irregular past tenses for common dev verbs
 */
const IRREGULAR_PAST: Record<string, string> = {
  write: 'Wrote', make: 'Made', send: 'Sent', build: 'Built',
  run: 'Ran', get: 'Got', set: 'Set', find: 'Found',
  read: 'Read', do: 'Did', go: 'Went', put: 'Put',
};

/**
 * Action verbs to detect (base forms only, no already-past forms)
 */
const ACTION_VERBS = [
  'test', 'rename', 'fix', 'debug', 'research', 'write', 'create', 'make',
  'build', 'implement', 'analyze', 'review', 'update', 'modify', 'generate',
  'develop', 'design', 'deploy', 'configure', 'setup', 'install', 'remove',
  'delete', 'add', 'check', 'verify', 'validate', 'optimize', 'refactor',
  'enhance', 'improve', 'send', 'email', 'help', 'run', 'find', 'set',
];

/**
 * Convert verb to past tense
 */
function toPastTense(verb: string): string {
  const lower = verb.toLowerCase();
  if (IRREGULAR_PAST[lower]) return IRREGULAR_PAST[lower];
  if (lower.endsWith('e')) return verb.charAt(0).toUpperCase() + verb.slice(1) + 'd';
  if (/[bcdfghlmnprstvwz]$/.test(lower) && /[aeiou].$/.test(lower)) {
    // CVC pattern: double final consonant (e.g., "set" -> but handled by irregulars)
    return verb.charAt(0).toUpperCase() + verb.slice(1) + 'ed';
  }
  return verb.charAt(0).toUpperCase() + verb.slice(1) + 'ed';
}

/**
 * Generate 4-word tab title summarizing what was done
 * 
 * @param prompt The user's original prompt
 * @param completedLine Optional COMPLETED line from response
 * @returns 4-word title string
 */
export function generateTabTitle(prompt: string, completedLine?: string): string {
  // If we have a completed line, try to use it for a better summary
  if (completedLine) {
    const cleanCompleted = completedLine
      .replace(/\*+/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/🎯\s*COMPLETED:\s*/gi, '')
      .trim();

    const completedWords = cleanCompleted.split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word.toLowerCase()))
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

    if (completedWords.length >= 2) {
      const summary = completedWords.slice(0, 4);
      while (summary.length < 4) {
        summary.push('Done');
      }
      return summary.slice(0, 4).join(' ');
    }
  }

  // Fall back to parsing the prompt
  const cleanPrompt = prompt.replace(/[^\w\s]/g, ' ').trim();
  const words = cleanPrompt.split(/\s+/).filter(word =>
    word.length > 2 && !STOP_WORDS.has(word.toLowerCase())
  );

  const lowerPrompt = prompt.toLowerCase();
  let titleWords: string[] = [];

  // Check for action verb
  for (const verb of ACTION_VERBS) {
    if (lowerPrompt.includes(verb)) {
      titleWords.push(toPastTense(verb));
      break;
    }
  }

  // Add most meaningful remaining words
  const remainingWords = words
    .filter(word => !ACTION_VERBS.includes(word.toLowerCase()))
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  for (const word of remainingWords) {
    if (titleWords.length < 4) {
      titleWords.push(word);
    } else {
      break;
    }
  }

  if (titleWords.length === 0) titleWords.push('Completed', 'Task');

  return titleWords.slice(0, 4).join(' ');
}

/**
 * Set terminal tab title (works with Kitty, Ghostty, iTerm2, etc.)
 * 
 * @param title The title to set
 */
export function setTerminalTabTitle(title: string): void {
  const term = process.env.TERM || '';

  if (term.includes('ghostty')) {
    process.stderr.write(`\x1b]2;${title}\x07`);
    process.stderr.write(`\x1b]0;${title}\x07`);
    process.stderr.write(`\x1b]7;${title}\x07`);
    process.stderr.write(`\x1b]2;${title}\x1b\\`);
  } else if (term.includes('kitty')) {
    process.stderr.write(`\x1b]0;${title}\x07`);
    process.stderr.write(`\x1b]2;${title}\x07`);
    process.stderr.write(`\x1b]30;${title}\x07`);
  } else {
    // Generic xterm-compatible
    process.stderr.write(`\x1b]0;${title}\x07`);
    process.stderr.write(`\x1b]2;${title}\x07`);
  }
}

