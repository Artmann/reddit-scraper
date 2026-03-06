import { scrape } from './src/scraper'

function parseArgs(): { url: string; limit: number } {
  const args = Bun.argv.slice(2)
  let url = ''
  let limit = 100

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]
    if (arg === '--limit' && nextArg) {
      limit = parseInt(nextArg, 10)
      i++
    } else if (arg && !arg.startsWith('--')) {
      url = arg
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
