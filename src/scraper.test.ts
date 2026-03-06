import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test'
import { fetchPostDetails } from './scraper'

const mockPostJson = JSON.stringify([
  {
    kind: 'Listing',
    data: {
      children: [
        {
          kind: 't3',
          data: {
            id: 'post1',
            title: 'First Post',
            author: 'poster',
            score: 99,
            selftext: 'Post body text',
            created_utc: 1709283600,
            permalink: '/r/test/comments/post1/first_post/'
          }
        }
      ]
    }
  },
  {
    kind: 'Listing',
    data: {
      children: [
        {
          kind: 't1',
          data: {
            id: 'c1',
            body: 'A comment',
            author: 'user1',
            score: 5,
            created_utc: 1709287200,
            permalink: '/r/test/comments/post1/first_post/c1/'
          }
        }
      ]
    }
  }
])

describe('fetchPostDetails', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockPostJson)
      } as Response)
    ) as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches and parses post details', async () => {
    const postItem = {
      id: 'post1',
      url: 'https://example.com/1',
      title: 'First Post',
      permalink: 'https://old.reddit.com/r/test/comments/post1/first_post/'
    }

    const post = await fetchPostDetails(postItem)

    expect(post.id).toBe('post1')
    expect(post.title).toBe('First Post')
    expect(post.upvotes).toBe(99)
    expect(post.user).toBe('poster')
    expect(post.content).toBe('Post body text')
    expect(post.comments).toHaveLength(1)
  })

  test('fetches with .json?limit=500 query param', async () => {
    const postItem = {
      id: 'post1',
      url: 'https://example.com/1',
      title: 'First Post',
      permalink: 'https://old.reddit.com/r/test/comments/post1/first_post/'
    }

    await fetchPostDetails(postItem)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://old.reddit.com/r/test/comments/post1/first_post/.json?limit=500',
      expect.any(Object)
    )
  })
})
