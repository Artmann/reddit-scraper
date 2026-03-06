import { join } from 'node:path'
import type { Post } from './types'
import { escapeCsvField } from './utils'

export async function writeCsv(folder: string, posts: Post[]): Promise<void> {
  const header = 'id,title,file_path,upvotes'

  const rows = posts.map((post) => {
    const filePath = `${post.id}.json`
    return [
      post.id,
      escapeCsvField(post.title),
      filePath,
      post.upvotes.toString()
    ].join(',')
  })

  const csvContent = [header, ...rows].join('\n')
  const csvPath = join(folder, 'posts.csv')

  await Bun.write(csvPath, csvContent)

  console.log(`\nWrote ${csvPath}`)
}
