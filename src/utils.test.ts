import { test, expect, describe } from 'bun:test'
import { normalizeUrl, parseUpvotes, escapeCsvField } from './utils'

describe('normalizeUrl', () => {
  test('handles www.reddit.com', () => {
    const result = normalizeUrl('https://www.reddit.com/r/programming/')
    expect(result.subreddit).toBe('programming')
    expect(result.baseUrl).toBe('https://old.reddit.com/r/programming')
  })

  test('handles old.reddit.com', () => {
    const result = normalizeUrl('https://old.reddit.com/r/typescript/')
    expect(result.subreddit).toBe('typescript')
    expect(result.baseUrl).toBe('https://old.reddit.com/r/typescript')
  })

  test('preserves sort path /top/', () => {
    const result = normalizeUrl('https://reddit.com/r/bun/top/')
    expect(result.subreddit).toBe('bun')
    expect(result.baseUrl).toBe('https://old.reddit.com/r/bun/top')
  })

  test('preserves sort path /new/', () => {
    const result = normalizeUrl('https://reddit.com/r/javascript/new/')
    expect(result.baseUrl).toBe('https://old.reddit.com/r/javascript/new')
  })

  test('handles URL without trailing slash', () => {
    const result = normalizeUrl('https://reddit.com/r/node')
    expect(result.subreddit).toBe('node')
    expect(result.baseUrl).toBe('https://old.reddit.com/r/node')
  })

  test('throws on invalid URL', () => {
    expect(() => normalizeUrl('https://example.com')).toThrow(
      'Invalid Reddit URL'
    )
  })
})

describe('parseUpvotes', () => {
  test("parses '42 points'", () => {
    expect(parseUpvotes('42 points')).toBe(42)
  })

  test("parses '1 point'", () => {
    expect(parseUpvotes('1 point')).toBe(1)
  })

  test('handles negative scores', () => {
    expect(parseUpvotes('-5 points')).toBe(-5)
  })

  test('handles thousands', () => {
    expect(parseUpvotes('1234 points')).toBe(1234)
  })

  test('returns 0 for null', () => {
    expect(parseUpvotes(null)).toBe(0)
  })

  test('returns 0 for undefined', () => {
    expect(parseUpvotes(undefined)).toBe(0)
  })

  test('returns 0 for empty string', () => {
    expect(parseUpvotes('')).toBe(0)
  })

  test('returns 0 for non-numeric text', () => {
    expect(parseUpvotes('score hidden')).toBe(0)
  })
})

describe('escapeCsvField', () => {
  test('returns plain text unchanged', () => {
    expect(escapeCsvField('hello world')).toBe('hello world')
  })

  test('escapes field with comma', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"')
  })

  test('escapes field with quotes', () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""')
  })

  test('escapes field with newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })

  test('handles multiple special characters', () => {
    expect(escapeCsvField('hello, "world"\ntest')).toBe(
      '"hello, ""world""\ntest"'
    )
  })
})
