/**
 * Model Extractor Utility
 * Extracts model name from Claude Code transcript.
 * Migrated from Python: utils/model_extractor.py
 */

interface TranscriptEntry {
  type: string;
  message?: {
    model?: string;
  };
}

/**
 * Extract model name from transcript by finding most recent assistant message.
 */
export async function getModelFromTranscript(
  transcriptPath: string
): Promise<string> {
  try {
    const file = Bun.file(transcriptPath);
    if (!(await file.exists())) return '';

    const content = await file.text();
    const lines = content.trim().split('\n').reverse();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry: TranscriptEntry = JSON.parse(line);
        if (entry.type === 'assistant' && entry.message?.model) {
          return entry.message.model;
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }
  } catch {
    return '';
  }
  return '';
}

// CLI usage
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: bun model-extractor.ts <transcript_path>');
    process.exit(1);
  }

  const model = await getModelFromTranscript(args[0]);
  console.log(`Model: ${model}`);
}
