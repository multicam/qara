# YouTube Extraction Workflow

Extract content from YouTube videos using yt-dlp for subtitle/transcript extraction, then process with Claude for analysis and summarization.

## When to Activate This Skill
- Extract content from YouTube video
- Get YouTube transcript
- Analyze YouTube video
- Summarize YouTube content
- Process YouTube video text

## The Command

Extract subtitles/transcript from any YouTube video:

```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download -o "%(title)s" "YOUTUBE_URL"
```

Then read the generated `.vtt` or `.srt` file and process with Claude.

## Alternative: WebFetch

For simpler cases, try WebFetch on the YouTube page to extract available description and metadata:

```
WebFetch({ url: "YOUTUBE_URL", prompt: "Extract video description, key topics, and any available transcript" })
```

## Example Usage

```bash
# Download auto-generated subtitles
yt-dlp --write-auto-sub --sub-lang en --skip-download -o "/tmp/%(title)s" "https://www.youtube.com/watch?v=VIDEO_ID"

# Then read and process the subtitle file
```

## How It Works
1. yt-dlp downloads auto-generated subtitles
2. Read the subtitle file (.vtt/.srt)
3. Claude processes and analyzes the content
4. Generate summary, insights, or analysis as requested
