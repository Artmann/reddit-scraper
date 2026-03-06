import { sleep } from './utils'

const MAX_RETRIES = 5

export async function fetchWithTimeout(
  url: string,
  timeoutMs = 30_000
): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    })

    if (response.status === 429) {
      if (attempt === MAX_RETRIES - 1) {
        throw new Error(`HTTP 429: Rate limited after ${MAX_RETRIES} attempts`)
      }
      const retryAfter = response.headers.get('Retry-After')
      const delayMs = retryAfter
        ? Number(retryAfter) * 1000
        : Math.pow(2, attempt) * 5000
      console.log(
        `Rate limited, retrying in ${delayMs / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`
      )
      await sleep(delayMs)
      continue
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.text()
  }

  throw new Error('Unreachable')
}
