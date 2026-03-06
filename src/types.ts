export interface Comment {
  id: string
  url: string
  content: string
  upvotes: number
  date: string
  user: string
}

export interface Post {
  id: string
  url: string
  title: string
  content: string
  date: string
  upvotes: number
  user: string
  comments: Comment[]
}

export interface PostListItem {
  id: string
  url: string
  title: string
  permalink: string
}
