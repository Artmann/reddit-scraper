import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import invariant from 'tiny-invariant'
import type { Post, PostListItem } from './types'
import { normalizeUrl, sleep } from './utils'
import { fetchWithTimeout } from './fetch'
import { parsePostList, parsePost } from './parser'
import { writeCsv } from './csv'

export async function fetchPostDetails(postItem: PostListItem): Promise<Post> {
  const url = `${postItem.permalink}?limit=500`
  console.log(`  Fetching post: ${postItem.id}`)

  const html = await fetchWithTimeout(url)
  return parsePost(html, postItem)
}

export async function fetchPostListFromUrl(
  baseUrl: string,
  limit: number
): Promise<PostListItem[]> {
  const posts: PostListItem[] = []
  let after = ''

  while (posts.length < limit) {
    const url = after ? `${baseUrl}?after=${after}` : baseUrl
    console.log(`Fetching post list: ${url}`)

    const html = await fetchWithTimeout(url)
    const pagePosts = parsePostList(html)

    if (pagePosts.length === 0) {
      break
    }

    for (const post of pagePosts) {
      if (posts.length >= limit) break
      posts.push(post)
      after = `t3_${post.id}`
    }

    if (posts.length < limit) {
      await sleep(2000)
    }
  }

  return posts
}

export async function scrape(url: string, limit: number): Promise<void> {
  const { baseUrl, subreddit } = normalizeUrl(url)

  console.log(`\nScraping r/${subreddit}`)
  console.log(`Limit: ${limit} posts`)
  console.log(`Base URL: ${baseUrl}\n`)

  const folder = subreddit
  await mkdir(folder, { recursive: true })

  const postList = await fetchPostListFromUrl(baseUrl, limit)
  console.log(`\nFound ${postList.length} posts to fetch\n`)

  const posts: Post[] = []

  for (let i = 0; i < postList.length; i++) {
    const postItem = postList[i]
    invariant(postItem, 'Post item not found')
    console.log(
      `[${i + 1}/${postList.length}] ${postItem.title.slice(0, 50)}...`
    )

    try {
      const post = await fetchPostDetails(postItem)
      posts.push(post)

      const filePath = join(folder, `${post.id}.json`)
      await Bun.write(filePath, JSON.stringify(post, null, 2))
    } catch (error) {
      console.error(`  Error fetching post ${postItem.id}:`, error)
    }

    if (i < postList.length - 1) {
      await sleep(1500)
    }
  }

  await writeCsv(folder, posts)

  console.log(`\nDone! Downloaded ${posts.length} posts to ./${folder}/`)
}
