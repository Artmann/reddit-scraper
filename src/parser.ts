import type { Comment, Post, PostListItem } from './types'

interface RedditPostData {
  author: string
  created_utc: number
  id: string
  permalink: string
  score: number
  selftext: string
  title: string
  url: string
}

interface RedditCommentData {
  author: string
  body: string
  created_utc: number
  id: string
  permalink: string
  replies?: { data?: { children?: RedditCommentChild[] } } | ''
  score: number
}

interface RedditPostChild {
  data: RedditPostData
  kind: string
}

interface RedditCommentChild {
  data: RedditCommentData
  kind: string
}

interface RedditListingResponse {
  data: {
    after: string | null
    children: RedditPostChild[]
  }
}

type RedditPostResponse = [
  { data: { children: [{ data: RedditPostData }] } },
  { data: { children: RedditCommentChild[] } }
]

export function parseComments(children: RedditCommentChild[]): Comment[] {
  const comments: Comment[] = []

  for (const child of children) {
    if (child.kind !== 't1') continue

    const data = child.data
    const date = new Date(data.created_utc * 1000).toISOString()

    comments.push({
      content: data.body || '',
      date,
      id: data.id,
      upvotes: data.score || 0,
      url: data.permalink ? `https://old.reddit.com${data.permalink}` : '',
      user: data.author || '[deleted]'
    })

    if (
      data.replies &&
      typeof data.replies === 'object' &&
      data.replies.data?.children
    ) {
      comments.push(...parseComments(data.replies.data.children))
    }
  }

  return comments
}

export function parsePost(json: string, postItem: PostListItem): Post {
  const response = JSON.parse(json) as RedditPostResponse
  const postData = response[0].data.children[0]?.data
  const commentsData = response[1].data.children || []

  const date = postData?.created_utc
    ? new Date(postData.created_utc * 1000).toISOString()
    : ''

  return {
    comments: parseComments(commentsData),
    content: postData?.selftext || '',
    date,
    id: postItem.id,
    title: postItem.title,
    upvotes: postData?.score || 0,
    url: postItem.url,
    user: postData?.author || '[deleted]'
  }
}

export interface ParsePostListResult {
  after: string | null
  posts: PostListItem[]
}

export function parsePostList(json: string): ParsePostListResult {
  const response = JSON.parse(json) as RedditListingResponse
  const posts: PostListItem[] = []

  for (const child of response.data.children) {
    if (child.kind !== 't3') continue

    const data = child.data
    posts.push({
      id: data.id,
      permalink: `https://old.reddit.com${data.permalink}`,
      title: data.title,
      url: data.url
    })
  }

  return {
    after: response.data.after,
    posts
  }
}
