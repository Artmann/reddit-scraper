import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test'
import { fetchPostListFromUrl, fetchPostDetails } from './scraper'

const mockPostListJson = JSON.stringify({
  kind: 'Listing',
  data: {
    after: 't3_post2',
    children: [
      {
        kind: 't3',
        data: {
          id: 'post1',
          title: 'First Post',
          url: 'https://example.com/1',
          permalink: '/r/test/comments/post1/first_post/',
          author: 'poster1',
          score: 50,
          selftext: '',
          created_utc: 1709283600
        }
      },
      {
        kind: 't3',
        data: {
          id: 'post2',
          title: 'Second Post',
          url: 'https://example.com/2',
          permalink: '/r/test/comments/post2/second_post/',
          author: 'poster2',
          score: 30,
          selftext: '',
          created_utc: 1709287200
        }
      }
    ]
  }
})

const mockEmptyListJson = JSON.stringify({
  kind: 'Listing',
  data: {
    after: null,
    children: []
  }
})

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

describe('fetchPostListFromUrl', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches and parses post list', async () => {
    let callCount = 0
    globalThis.fetch = mock(() => {
      callCount++
      const json = callCount === 1 ? mockPostListJson : mockEmptyListJson
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(json)
      } as Response)
    }) as unknown as typeof fetch

    const posts = await fetchPostListFromUrl(
      'https://old.reddit.com/r/test',
      10
    )

    expect(posts).toHaveLength(2)
    expect(posts[0]!.id).toBe('post1')
    expect(posts[0]!.title).toBe('First Post')
    expect(posts[1]!.id).toBe('post2')
  })

  test('respects limit', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockPostListJson)
      } as Response)
    ) as unknown as typeof fetch

    const posts = await fetchPostListFromUrl('https://old.reddit.com/r/test', 1)

    expect(posts).toHaveLength(1)
    expect(posts[0]!.id).toBe('post1')
  })

  test('calls fetch with correct URL', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockPostListJson)
      } as Response)
    ) as unknown as typeof fetch

    await fetchPostListFromUrl('https://old.reddit.com/r/test', 2)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://old.reddit.com/r/test.json',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.any(String)
        })
      })
    )
  })
})

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
