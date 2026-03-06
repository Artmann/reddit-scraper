import { parseHTML } from "linkedom"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"

interface Comment {
  id: string
  url: string
  content: string
  upvotes: number
  date: string
  user: string
}

interface Post {
  id: string
  url: string
  title: string
  content: string
  date: string
  upvotes: number
  user: string
  comments: Comment[]
}

interface PostListItem {
  id: string
  url: string
  title: string
  permalink: string
}

function parseArgs(): { url: string; limit: number } {
  const args = Bun.argv.slice(2)
  let url = ""
  let limit = 100

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10)
      i++
    } else if (!args[i].startsWith("--")) {
      url = args[i]
    }
  }

  if (!url) {
    console.log("Usage: bun run index.ts <subreddit-url> [--limit <number>]")
    console.log('Example: bun run index.ts "https://reddit.com/r/programming/top/" --limit 50')
    process.exit(1)
  }

  return { url, limit }
}

function normalizeUrl(url: string): { baseUrl: string; subreddit: string } {
  const match = url.match(/reddit\.com\/r\/([^/]+)\/?(.*)/)
  if (!match) {
    console.error("Invalid Reddit URL. Expected format: https://reddit.com/r/subreddit/")
    process.exit(1)
  }

  const subreddit = match[1]
  const sortPath = match[2] || ""

  const baseUrl = `https://old.reddit.com/r/${subreddit}/${sortPath}`.replace(/\/$/, "")
  return { baseUrl, subreddit }
}

async function fetchWithTimeout(url: string, timeoutMs = 30000): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPostList(baseUrl: string, limit: number): Promise<PostListItem[]> {
  const posts: PostListItem[] = []
  let after = ""

  while (posts.length < limit) {
    const url = after ? `${baseUrl}?after=${after}` : baseUrl
    console.log(`Fetching post list: ${url}`)

    const html = await fetchWithTimeout(url)
    const { document } = parseHTML(html)

    const things = document.querySelectorAll(".thing.link")
    if (things.length === 0) {
      break
    }

    for (const thing of things) {
      if (posts.length >= limit) break

      const fullname = thing.getAttribute("data-fullname") || ""
      const id = fullname.replace("t3_", "")
      const postUrl = thing.getAttribute("data-url") || ""
      const permalink = thing.getAttribute("data-permalink") || ""
      const titleEl = thing.querySelector(".title a.title")
      const title = titleEl?.textContent?.trim() || ""

      if (id && permalink) {
        posts.push({
          id,
          url: postUrl,
          title,
          permalink: `https://old.reddit.com${permalink}`,
        })
        after = fullname
      }
    }

    if (posts.length < limit) {
      await sleep(2000)
    }
  }

  return posts
}

function parseUpvotes(text: string | null | undefined): number {
  if (!text) return 0
  const cleaned = text.replace(/[^\d-]/g, "")
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? 0 : num
}

async function fetchPost(postItem: PostListItem): Promise<Post> {
  const url = `${postItem.permalink}?limit=500`
  console.log(`  Fetching post: ${postItem.id}`)

  const html = await fetchWithTimeout(url)
  const { document } = parseHTML(html)

  const siteTable = document.querySelector(".sitetable.linklisting .thing")

  const contentEl = document.querySelector(".expando .usertext-body .md")
  const content = contentEl?.textContent?.trim() || ""

  const scoreEl = siteTable?.querySelector(".score.unvoted") || document.querySelector(".score.unvoted")
  const upvotes = parseUpvotes(scoreEl?.textContent)

  const authorEl = siteTable?.querySelector(".author") || document.querySelector(".tagline .author")
  const user = authorEl?.textContent?.trim() || "[deleted]"

  const timeEl = siteTable?.querySelector("time") || document.querySelector(".tagline time")
  const date = timeEl?.getAttribute("datetime") || ""

  const comments = parseComments(document)

  return {
    id: postItem.id,
    url: postItem.url,
    title: postItem.title,
    content,
    date,
    upvotes,
    user,
    comments,
  }
}

function parseComments(document: Document): Comment[] {
  const comments: Comment[] = []
  const commentEls = document.querySelectorAll(".commentarea .comment")

  for (const el of commentEls) {
    const fullname = el.getAttribute("data-fullname") || ""
    const id = fullname.replace("t1_", "")

    const contentEl = el.querySelector(".usertext-body .md")
    const content = contentEl?.textContent?.trim() || ""

    const scoreEl = el.querySelector(".score.unvoted")
    const upvotes = parseUpvotes(scoreEl?.textContent)

    const authorEl = el.querySelector(".author")
    const user = authorEl?.textContent?.trim() || "[deleted]"

    const timeEl = el.querySelector("time")
    const date = timeEl?.getAttribute("datetime") || ""

    const permalinkEl = el.querySelector(".bylink")
    const permalink = permalinkEl?.getAttribute("href") || ""
    const url = permalink.startsWith("http") ? permalink : permalink ? `https://old.reddit.com${permalink}` : ""

    if (id) {
      comments.push({
        id,
        url,
        content,
        upvotes,
        date,
        user,
      })
    }
  }

  return comments
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

async function writeCsv(folder: string, posts: Post[]): Promise<void> {
  const header = "id,title,file_path,upvotes"
  const rows = posts.map((post) => {
    const filePath = `${post.id}.json`
    return [post.id, escapeCsvField(post.title), filePath, post.upvotes.toString()].join(",")
  })

  const csvContent = [header, ...rows].join("\n")
  const csvPath = join(folder, "posts.csv")
  await Bun.write(csvPath, csvContent)
  console.log(`\nWrote ${csvPath}`)
}

async function main() {
  const { url, limit } = parseArgs()
  const { baseUrl, subreddit } = normalizeUrl(url)

  console.log(`\nScraping r/${subreddit}`)
  console.log(`Limit: ${limit} posts`)
  console.log(`Base URL: ${baseUrl}\n`)

  const folder = subreddit
  await mkdir(folder, { recursive: true })

  const postList = await fetchPostList(baseUrl, limit)
  console.log(`\nFound ${postList.length} posts to fetch\n`)

  const posts: Post[] = []

  for (let i = 0; i < postList.length; i++) {
    const postItem = postList[i]
    console.log(`[${i + 1}/${postList.length}] ${postItem.title.slice(0, 50)}...`)

    try {
      const post = await fetchPost(postItem)
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

main().catch(console.error)
