# Reddit Scraper

A Reddit subreddit scraper built with Bun and TypeScript. Scrapes posts and
comments from any public subreddit and saves the data as JSON files with a CSV
index.

## Features

- Scrape posts from any public Reddit subreddit
- Extract full post details: title, content, upvotes, author, date
- Scrape all comments on each post (up to 500 per post)
- Save individual posts as JSON files
- Generate a CSV index with post summaries
- Built-in rate limiting to avoid being blocked
- Pagination support for retrieving multiple pages of posts

## Installation

```bash
bun install
```

## Usage

```bash
bun run index.ts <subreddit-url> [--limit <number>]
```

### Examples

```bash
# Scrape top 50 posts from r/programming
bun run index.ts "https://reddit.com/r/programming/top/" --limit 50

# Scrape 100 posts (default limit) from r/typescript
bun run index.ts "https://reddit.com/r/typescript/"

# Works with various Reddit URL formats
bun run index.ts "https://www.reddit.com/r/bun/"
bun run index.ts "https://old.reddit.com/r/node/new/"
```

### Arguments

| Argument           | Description                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `<subreddit-url>`  | Reddit URL to scrape (required). Supports `reddit.com`, `www.reddit.com`, and `old.reddit.com` |
| `--limit <number>` | Maximum number of posts to scrape (default: 100)                                               |

## Output

For each subreddit scraped, creates a directory named after the subreddit
containing:

- **`{postId}.json`** - Individual JSON files with full post data and comments
- **`posts.csv`** - CSV index with columns: `id`, `title`, `file_path`,
  `upvotes`

### JSON Structure

```json
{
  "id": "t3_abc123",
  "title": "Post title",
  "url": "https://example.com/linked-content",
  "permalink": "/r/subreddit/comments/abc123/post_title/",
  "content": "Post body text...",
  "upvotes": 1234,
  "user": "username",
  "date": "2024-01-15T12:00:00.000Z",
  "comments": [
    {
      "id": "t1_xyz789",
      "content": "Comment text...",
      "upvotes": 56,
      "user": "commenter",
      "date": "2024-01-15T13:00:00.000Z",
      "url": "/r/subreddit/comments/abc123/post_title/xyz789/"
    }
  ]
}
```

## Development

```bash
# Run tests
bun test

# Format code
bun run format

# Type check
bun run typecheck
```

## Requirements

- [Bun](https://bun.sh) v1.3.9 or later
