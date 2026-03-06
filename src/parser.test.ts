import { test, expect, describe } from 'bun:test'
import { parsePostList, parsePost, parseComments } from './parser'

const mockPostListJson = JSON.stringify({
  kind: 'Listing',
  data: {
    after: 't3_def456',
    children: [
      {
        kind: 't3',
        data: {
          id: 'abc123',
          title: 'Test Post Title',
          url: 'https://example.com/link',
          permalink: '/r/test/comments/abc123/test_post_title/',
          author: 'testuser',
          score: 42,
          selftext: 'Post content here',
          created_utc: 1705322400
        }
      },
      {
        kind: 't3',
        data: {
          id: 'def456',
          title: 'Self Post',
          url: '/r/test/comments/def456/self_post/',
          permalink: '/r/test/comments/def456/self_post/',
          author: 'anotheruser',
          score: 10,
          selftext: 'Self post content',
          created_utc: 1705322500
        }
      }
    ]
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
            id: 'abc123',
            title: 'Test Post Title',
            author: 'testuser',
            score: 42,
            selftext: 'This is the post content.\n\nWith multiple paragraphs.',
            created_utc: 1705322400,
            permalink: '/r/test/comments/abc123/test_post_title/'
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
            id: 'comment1',
            body: 'First comment',
            author: 'commenter1',
            score: 10,
            created_utc: 1705326000,
            permalink: '/r/test/comments/abc123/test/comment1/'
          }
        },
        {
          kind: 't1',
          data: {
            id: 'comment2',
            body: 'Second comment',
            author: 'commenter2',
            score: 5,
            created_utc: 1705329600,
            permalink: '/r/test/comments/abc123/test/comment2/'
          }
        }
      ]
    }
  }
])

const mockDeletedUserJson = JSON.stringify([
  {
    kind: 'Listing',
    data: {
      children: [
        {
          kind: 't3',
          data: {
            id: 'xyz789',
            title: 'Deleted User Post',
            author: '[deleted]',
            score: 100,
            selftext: '',
            created_utc: 1706781600,
            permalink: '/r/test/comments/xyz789/deleted_user_post/'
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
            id: 'deleted1',
            body: 'Comment from deleted user',
            author: '[deleted]',
            score: 3,
            created_utc: 1706785200,
            permalink: '/r/test/comments/xyz789/test/deleted1/'
          }
        }
      ]
    }
  }
])

const mockNestedCommentsJson = JSON.stringify([
  {
    kind: 'Listing',
    data: {
      children: [
        {
          kind: 't3',
          data: {
            id: 'nested123',
            title: 'Nested Comments Post',
            author: 'op',
            score: 50,
            selftext: 'Post with nested comments',
            created_utc: 1705322400,
            permalink: '/r/test/comments/nested123/nested_comments/'
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
            id: 'parent1',
            body: 'Parent comment',
            author: 'user1',
            score: 20,
            created_utc: 1705326000,
            permalink: '/r/test/comments/nested123/test/parent1/',
            replies: {
              kind: 'Listing',
              data: {
                children: [
                  {
                    kind: 't1',
                    data: {
                      id: 'child1',
                      body: 'Child comment',
                      author: 'user2',
                      score: 5,
                      created_utc: 1705329600,
                      permalink: '/r/test/comments/nested123/test/child1/',
                      replies: ''
                    }
                  }
                ]
              }
            }
          }
        }
      ]
    }
  }
])

describe('parsePostList', () => {
  test('extracts posts from JSON', () => {
    const result = parsePostList(mockPostListJson)

    expect(result.posts).toHaveLength(2)
    expect(result.after).toBe('t3_def456')
    expect(result.posts[0]!.id).toBe('abc123')
    expect(result.posts[0]!.title).toBe('Test Post Title')
    expect(result.posts[0]!.url).toBe('https://example.com/link')
    expect(result.posts[0]!.permalink).toBe(
      'https://old.reddit.com/r/test/comments/abc123/test_post_title/'
    )
  })

  test('handles self posts', () => {
    const result = parsePostList(mockPostListJson)

    expect(result.posts[1]!.id).toBe('def456')
    expect(result.posts[1]!.title).toBe('Self Post')
  })

  test('returns empty array for JSON without posts', () => {
    const emptyJson = JSON.stringify({ data: { children: [], after: null } })
    const result = parsePostList(emptyJson)
    expect(result.posts).toHaveLength(0)
    expect(result.after).toBeNull()
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

    const post = parsePost(mockPostJson, postItem)

    expect(post.id).toBe('abc123')
    expect(post.title).toBe('Test Post Title')
    expect(post.upvotes).toBe(42)
    expect(post.user).toBe('testuser')
    expect(post.date).toBe('2024-01-15T12:40:00.000Z')
    expect(post.content).toContain('This is the post content.')
  })

  test('extracts comments', () => {
    const postItem = {
      id: 'abc123',
      url: 'https://example.com/link',
      title: 'Test Post Title',
      permalink: 'https://old.reddit.com/r/test/comments/abc123/test/'
    }

    const post = parsePost(mockPostJson, postItem)

    expect(post.comments).toHaveLength(2)
    expect(post.comments[0]!.content).toBe('First comment')
    expect(post.comments[0]!.upvotes).toBe(10)
    expect(post.comments[0]!.user).toBe('commenter1')
  })

  test('extracts nested comments', () => {
    const postItem = {
      id: 'nested123',
      url: 'https://example.com/link',
      title: 'Nested Comments Post',
      permalink: 'https://old.reddit.com/r/test/comments/nested123/test/'
    }

    const post = parsePost(mockNestedCommentsJson, postItem)

    expect(post.comments).toHaveLength(2)
    expect(post.comments[0]!.content).toBe('Parent comment')
    expect(post.comments[1]!.content).toBe('Child comment')
  })
})

describe('parseComments', () => {
  test('extracts comment data', () => {
    const children = [
      {
        kind: 't1',
        data: {
          id: 'comment1',
          body: 'First comment',
          author: 'commenter1',
          score: 10,
          created_utc: 1705326000,
          permalink: '/r/test/comments/abc123/test/comment1/'
        }
      }
    ]

    const comments = parseComments(children)

    expect(comments).toHaveLength(1)
    expect(comments[0]!.id).toBe('comment1')
    expect(comments[0]!.content).toBe('First comment')
    expect(comments[0]!.upvotes).toBe(10)
    expect(comments[0]!.user).toBe('commenter1')
    expect(comments[0]!.url).toBe(
      'https://old.reddit.com/r/test/comments/abc123/test/comment1/'
    )
  })

  test('handles deleted users', () => {
    const response = JSON.parse(mockDeletedUserJson)
    const children = response[1].data.children

    const comments = parseComments(children)

    expect(comments).toHaveLength(1)
    expect(comments[0]!.user).toBe('[deleted]')
  })

  test('returns empty array when no comments', () => {
    const comments = parseComments([])
    expect(comments).toHaveLength(0)
  })

  test('skips non-comment entries', () => {
    const children = [
      {
        kind: 'more',
        data: { id: 'more1', children: ['a', 'b', 'c'] }
      }
    ]

    const comments = parseComments(children as any)
    expect(comments).toHaveLength(0)
  })
})
