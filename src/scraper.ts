import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Post, PostListItem } from './types'
import { normalizeUrl, sleep } from './utils'
import { fetchWithTimeout } from './fetch'
import { parsePostList, parsePost } from './parser'
import { writeCsv } from './csv'

const BATCH_SIZE = 5

export async function fetchPostDetails(postItem: PostListItem): Promise<Post> {
  const url = `${postItem.permalink}.json?limit=500`

  const json = await fetchWithTimeout(url)
  return parsePost(json, postItem)
}

async function fetchPostBatch(
  postItems: PostListItem[],
  folder: string
): Promise<Post[]> {
  const results = await Promise.all(
    postItems.map(async (postItem) => {
      try {
        const post = await fetchPostDetails(postItem)
        const filePath = join(folder, `${post.id}.json`)
        await Bun.write(filePath, JSON.stringify(post, null, 2))
        return post
      } catch (error) {
        console.error(`  Error fetching post ${postItem.id}:`, error)
        return null
      }
    })
  )

  return results.filter((post): post is Post => post !== null)
}

export async function scrape(url: string, limit: number): Promise<void> {
  const { baseUrl, subreddit } = normalizeUrl(url)

  console.log(`\nScraping r/${subreddit}`)
  console.log(`Limit: ${limit} posts`)
  console.log(`Base URL: ${baseUrl}\n`)

  const folder = subreddit
  await mkdir(folder, { recursive: true })

  const posts: Post[] = []
  let after: string | null = null
  const isTopSort = baseUrl.includes('/top')
  let totalFetched = 0

  while (posts.length < limit) {
    const params = new URLSearchParams()
    if (after) {
      params.set('after', after)
    }
    if (isTopSort) {
      params.set('t', 'all')
    }
    const queryString = params.toString()
    const listUrl = `${baseUrl}.json${queryString ? `?${queryString}` : ''}`
    console.log(`Fetching post list: ${listUrl}`)

    const json = await fetchWithTimeout(listUrl)
    const result = parsePostList(json)

    if (result.posts.length === 0) {
      break
    }

    const postsToFetch = result.posts.slice(0, limit - posts.length)
    console.log(`\nFetching ${postsToFetch.length} posts in parallel...\n`)

    for (let i = 0; i < postsToFetch.length; i += BATCH_SIZE) {
      const batch = postsToFetch.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(postsToFetch.length / BATCH_SIZE)

      console.log(
        `[Batch ${batchNum}/${totalBatches}] Fetching ${batch.map((p) => p.id).join(', ')}`
      )

      const batchPosts = await fetchPostBatch(batch, folder)
      posts.push(...batchPosts)
      totalFetched += batch.length

      if (i + BATCH_SIZE < postsToFetch.length) {
        await sleep(1000)
      }
    }

    after = result.after

    if (!after || posts.length >= limit) {
      break
    }

    await sleep(2000)
  }

  await writeCsv(folder, posts)

  console.log(`\nDone! Downloaded ${posts.length} posts to ./${folder}/`)
}
