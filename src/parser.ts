import { parseHTML } from 'linkedom'
import type { Comment, Post, PostListItem } from './types'
import { parseUpvotes } from './utils'

export function parsePostList(html: string): PostListItem[] {
  const { document } = parseHTML(html)
  const posts: PostListItem[] = []

  const things = document.querySelectorAll('.thing.link')

  for (const thing of things) {
    const fullname = thing.getAttribute('data-fullname') || ''
    const id = fullname.replace('t3_', '')
    const postUrl = thing.getAttribute('data-url') || ''
    const permalink = thing.getAttribute('data-permalink') || ''
    const titleEl = thing.querySelector('.title a.title')
    const title = titleEl?.textContent?.trim() || ''

    if (id && permalink) {
      posts.push({
        id,
        url: postUrl,
        title,
        permalink: `https://old.reddit.com${permalink}`
      })
    }
  }

  return posts
}

export function parsePost(html: string, postItem: PostListItem): Post {
  const { document } = parseHTML(html)

  const siteTable = document.querySelector('.sitetable.linklisting .thing')

  const contentEl = document.querySelector('.expando .usertext-body .md')
  const content = contentEl?.textContent?.trim() || ''

  const scoreEl =
    siteTable?.querySelector('.score.unvoted') ||
    document.querySelector('.score.unvoted')
  const upvotes = parseUpvotes(scoreEl?.textContent)

  const authorEl =
    siteTable?.querySelector('.author') ||
    document.querySelector('.tagline .author')
  const user = authorEl?.textContent?.trim() || '[deleted]'

  const timeEl =
    siteTable?.querySelector('time') || document.querySelector('.tagline time')
  const date = timeEl?.getAttribute('datetime') || ''

  const comments = parseComments(document)

  return {
    id: postItem.id,
    url: postItem.url,
    title: postItem.title,
    content,
    date,
    upvotes,
    user,
    comments
  }
}

export function parseComments(document: Document): Comment[] {
  const comments: Comment[] = []
  const commentEls = document.querySelectorAll('.commentarea .comment')

  for (const el of commentEls) {
    const fullname = el.getAttribute('data-fullname') || ''
    const id = fullname.replace('t1_', '')

    const contentEl = el.querySelector('.usertext-body .md')
    const content = contentEl?.textContent?.trim() || ''

    const scoreEl = el.querySelector('.score.unvoted')
    const upvotes = parseUpvotes(scoreEl?.textContent)

    const authorEl = el.querySelector('.author')
    const user = authorEl?.textContent?.trim() || '[deleted]'

    const timeEl = el.querySelector('time')
    const date = timeEl?.getAttribute('datetime') || ''

    const permalinkEl = el.querySelector('.bylink')
    const permalink = permalinkEl?.getAttribute('href') || ''
    const url = permalink.startsWith('http')
      ? permalink
      : permalink
        ? `https://old.reddit.com${permalink}`
        : ''

    if (id) {
      comments.push({
        id,
        url,
        content,
        upvotes,
        date,
        user
      })
    }
  }

  return comments
}
