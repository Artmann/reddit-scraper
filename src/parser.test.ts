import { test, expect, describe } from 'bun:test'
import { parseHTML } from 'linkedom'
import { parsePostList, parsePost, parseComments } from './parser'

const mockSubredditHtml = `
<html>
<body>
  <div class="thing link" data-fullname="t3_abc123" data-url="https://example.com/link" data-permalink="/r/test/comments/abc123/test_post_title/">
    <p class="title"><a class="title" href="/r/test/comments/abc123/test_post_title/">Test Post Title</a></p>
  </div>
  <div class="thing link" data-fullname="t3_def456" data-url="/r/test/comments/def456/self_post/" data-permalink="/r/test/comments/def456/self_post/">
    <p class="title"><a class="title" href="/r/test/comments/def456/self_post/">Self Post</a></p>
  </div>
</body>
</html>
`

const mockPostHtml = `
<html>
<body>
  <div class="sitetable linklisting">
    <div class="thing" data-fullname="t3_abc123">
      <span class="score unvoted">42 points</span>
      <span class="tagline">
        submitted by <a class="author" href="/user/testuser">testuser</a>
        <time datetime="2024-01-15T12:30:00+00:00">January 15, 2024</time>
      </span>
    </div>
  </div>
  <div class="expando">
    <div class="usertext-body">
      <div class="md">
        <p>This is the post content.</p>
        <p>With multiple paragraphs.</p>
      </div>
    </div>
  </div>
  <div class="commentarea">
    <div class="comment" data-fullname="t1_comment1">
      <div class="usertext-body">
        <div class="md"><p>First comment</p></div>
      </div>
      <span class="score unvoted">10 points</span>
      <a class="author" href="/user/commenter1">commenter1</a>
      <time datetime="2024-01-15T13:00:00+00:00">1 hour ago</time>
      <a class="bylink" href="/r/test/comments/abc123/test/comment1/">permalink</a>
    </div>
    <div class="comment" data-fullname="t1_comment2">
      <div class="usertext-body">
        <div class="md"><p>Second comment</p></div>
      </div>
      <span class="score unvoted">5 points</span>
      <a class="author" href="/user/commenter2">commenter2</a>
      <time datetime="2024-01-15T14:00:00+00:00">2 hours ago</time>
      <a class="bylink" href="/r/test/comments/abc123/test/comment2/">permalink</a>
    </div>
  </div>
</body>
</html>
`

const mockDeletedUserHtml = `
<html>
<body>
  <div class="sitetable linklisting">
    <div class="thing" data-fullname="t3_xyz789">
      <span class="score unvoted">100 points</span>
      <span class="tagline">
        <time datetime="2024-02-01T10:00:00+00:00">February 1, 2024</time>
      </span>
    </div>
  </div>
  <div class="commentarea">
    <div class="comment" data-fullname="t1_deleted1">
      <div class="usertext-body">
        <div class="md"><p>Comment from deleted user</p></div>
      </div>
      <span class="score unvoted">3 points</span>
      <time datetime="2024-02-01T11:00:00+00:00">1 hour ago</time>
      <a class="bylink" href="/r/test/comments/xyz789/test/deleted1/">permalink</a>
    </div>
  </div>
</body>
</html>
`

describe('parsePostList', () => {
  test('extracts posts from subreddit HTML', () => {
    const posts = parsePostList(mockSubredditHtml)

    expect(posts).toHaveLength(2)
    expect(posts[0]!.id).toBe('abc123')
    expect(posts[0]!.title).toBe('Test Post Title')
    expect(posts[0]!.url).toBe('https://example.com/link')
    expect(posts[0]!.permalink).toBe(
      'https://old.reddit.com/r/test/comments/abc123/test_post_title/'
    )
  })

  test('handles self posts', () => {
    const posts = parsePostList(mockSubredditHtml)

    expect(posts[1]!.id).toBe('def456')
    expect(posts[1]!.title).toBe('Self Post')
  })

  test('returns empty array for HTML without posts', () => {
    const posts = parsePostList('<html><body></body></html>')
    expect(posts).toHaveLength(0)
  })
})

describe('parsePost', () => {
  test('extracts post details', () => {
    const postItem = {
      id: 'abc123',
      url: 'https://example.com/link',
      title: 'Test Post Title',
      permalink: 'https://old.reddit.com/r/test/comments/abc123/test/'
    }

    const post = parsePost(mockPostHtml, postItem)

    expect(post.id).toBe('abc123')
    expect(post.title).toBe('Test Post Title')
    expect(post.upvotes).toBe(42)
    expect(post.user).toBe('testuser')
    expect(post.date).toBe('2024-01-15T12:30:00+00:00')
    expect(post.content).toContain('This is the post content.')
  })

  test('extracts comments', () => {
    const postItem = {
      id: 'abc123',
      url: 'https://example.com/link',
      title: 'Test Post Title',
      permalink: 'https://old.reddit.com/r/test/comments/abc123/test/'
    }

    const post = parsePost(mockPostHtml, postItem)

    expect(post.comments).toHaveLength(2)
    expect(post.comments[0]!.content).toBe('First comment')
    expect(post.comments[0]!.upvotes).toBe(10)
    expect(post.comments[0]!.user).toBe('commenter1')
  })
})

describe('parseComments', () => {
  test('extracts comment data', () => {
    const { document } = parseHTML(mockPostHtml)
    const comments = parseComments(document)

    expect(comments).toHaveLength(2)
    expect(comments[0]!.id).toBe('comment1')
    expect(comments[0]!.content).toBe('First comment')
    expect(comments[0]!.upvotes).toBe(10)
    expect(comments[0]!.user).toBe('commenter1')
    expect(comments[0]!.url).toBe(
      'https://old.reddit.com/r/test/comments/abc123/test/comment1/'
    )
  })

  test('handles deleted users', () => {
    const { document } = parseHTML(mockDeletedUserHtml)
    const comments = parseComments(document)

    expect(comments).toHaveLength(1)
    expect(comments[0]!.user).toBe('[deleted]')
  })

  test('returns empty array when no comments', () => {
    const { document } = parseHTML(
      "<html><body><div class='commentarea'></div></body></html>"
    )
    const comments = parseComments(document)
    expect(comments).toHaveLength(0)
  })
})
