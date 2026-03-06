export function normalizeUrl(url: string): {
  baseUrl: string
  subreddit: string
} {
  const match = url.match(/reddit\.com\/r\/([^/]+)\/?(.*)/)
  if (!match) {
    throw new Error(
      'Invalid Reddit URL. Expected format: https://reddit.com/r/subreddit/'
    )
  }

  const subreddit = match[1]
  const sortPath = match[2] || ''

  const baseUrl = `https://old.reddit.com/r/${subreddit}/${sortPath}`.replace(
    /\/$/,
    ''
  )
  return { baseUrl, subreddit }
}

export function parseUpvotes(text: string | null | undefined): number {
  if (!text) return 0
  const cleaned = text.replace(/[^\d-]/g, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? 0 : num
}

export function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
