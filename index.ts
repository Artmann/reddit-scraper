import { scrape } from './src/scraper'

function parseArgs(): { url: string; limit: number; output: string } {
  const args = Bun.argv.slice(2)
  let url = ''
  let limit = 100
  let output = '.'

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]
    if (arg === '--limit' && nextArg) {
      limit = parseInt(nextArg, 10)
      i++
    } else if ((arg === '--output' || arg === '-o') && nextArg) {
      output = nextArg
      i++
    } else if (arg && !arg.startsWith('-')) {
      url = arg
    }
  }

  if (!url) {
    console.log(
      'Usage: bun run index.ts <subreddit-url> [--limit <number>] [--output <dir>]'
    )
    console.log(
      'Example: bun run index.ts "https://reddit.com/r/programming/top/" --limit 50 --output ./data'
    )
    process.exit(1)
  }

  return { url, limit, output }
}

const { url, limit, output } = parseArgs()
scrape(url, limit, output).catch(console.error)
