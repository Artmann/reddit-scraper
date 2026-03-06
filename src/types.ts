export interface Comment {
  content: string
  date: string
  id: string
  upvotes: number
  url: string
  user: string
}

export interface Post {
  comments: Comment[]
  content: string
  date: string
  id: string
  isSelf: boolean
  title: string
  upvotes: number
  url: string
  user: string
}

export interface PostListItem {
  id: string
  permalink: string
  title: string
  url: string
}
