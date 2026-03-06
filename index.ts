import { scrape } from './src/scraper'

function parseArgs(): { url: string; limit: number } {
  const args = Bun.argv.slice(2)
  let url = ''
  let limit = 100

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10)
      i++
    } else if (!args[i].startsWith('--')) {
      url = args[i]
    }
  }

  if (!url) {
    console.log('Usage: bun run index.ts <subreddit-url> [--limit <number>]')
    console.log(
      'Example: bun run index.ts "https://reddit.com/r/programming/top/" --limit 50'
    )
    process.exit(1)
  }

  return { url, limit }
}

const { url, limit } = parseArgs()
scrape(url, limit).catch(console.error)
