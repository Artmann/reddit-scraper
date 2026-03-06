import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test'
import { fetchPostListFromUrl, fetchPostDetails } from './scraper'

const mockSubredditHtml = `
<html>
<body>
  <div class="thing link" data-fullname="t3_post1" data-url="https://example.com/1" data-permalink="/r/test/comments/post1/first_post/">
    <p class="title"><a class="title">First Post</a></p>
  </div>
  <div class="thing link" data-fullname="t3_post2" data-url="https://example.com/2" data-permalink="/r/test/comments/post2/second_post/">
    <p class="title"><a class="title">Second Post</a></p>
  </div>
</body>
</html>
`

const mockPostHtml = `
<html>
<body>
  <div class="sitetable linklisting">
    <div class="thing" data-fullname="t3_post1">
      <span class="score unvoted">99 points</span>
      <span class="tagline">
        <a class="author">poster</a>
        <time datetime="2024-03-01T09:00:00+00:00">March 1</time>
      </span>
    </div>
  </div>
  <div class="expando">
    <div class="usertext-body"><div class="md"><p>Post body text</p></div></div>
  </div>
  <div class="commentarea">
    <div class="comment" data-fullname="t1_c1">
      <div class="usertext-body"><div class="md"><p>A comment</p></div></div>
      <span class="score unvoted">5 points</span>
      <a class="author">user1</a>
      <time datetime="2024-03-01T10:00:00+00:00">1h</time>
      <a class="bylink" href="/r/test/comments/post1/first_post/c1/">link</a>
    </div>
  </div>
</body>
</html>
`

describe('fetchPostListFromUrl', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches and parses post list', async () => {
    // Return posts on first call, empty on second to stop pagination
    let callCount = 0
    globalThis.fetch = mock(() => {
      callCount++
      const html =
        callCount === 1 ? mockSubredditHtml : '<html><body></body></html>'
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(html)
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
        text: () => Promise.resolve(mockSubredditHtml)
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
        text: () => Promise.resolve(mockSubredditHtml)
      } as Response)
    ) as unknown as typeof fetch

    // Limit to 2 so it doesn't paginate
    await fetchPostListFromUrl('https://old.reddit.com/r/test', 2)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://old.reddit.com/r/test',
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
        text: () => Promise.resolve(mockPostHtml)
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

  test('fetches with ?limit=500 query param', async () => {
    const postItem = {
      id: 'post1',
      url: 'https://example.com/1',
      title: 'First Post',
      permalink: 'https://old.reddit.com/r/test/comments/post1/first_post/'
    }

    await fetchPostDetails(postItem)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://old.reddit.com/r/test/comments/post1/first_post/?limit=500',
      expect.any(Object)
    )
  })
})
