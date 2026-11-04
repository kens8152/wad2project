import { supabase } from '@/services/supabase.js'

const POST_WITH_REPLIES = '*, replies(*)'


export async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_REPLIES)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchPost(id) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, my_vote:post_votes(vote)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createPost({ title, content, tags, username, events = [], artists = [], images = [], song = null }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      tags,
      username,
      event_ids: events,
      artist_ids: artists,
      ...(images.length ? { images } : {}),
      ...(song ? { song } : {}),
    })
    .select(POST_WITH_REPLIES)
    .single()
  if (error) throw error
  return data
}

export async function updatePost(id, changes) {
  const { data, error } = await supabase
    .from('posts')
    .update(changes)
    .eq('id', id)
    .select(POST_WITH_REPLIES)
    .single()
  if (error) throw error
  return data
}

export async function deletePost(id) {
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw error
}


export async function fetchReplies(postId) {
  let res = await supabase
    .from('replies')
    .select('*, my_vote:reply_votes(vote)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (!res.error) return res.data

  console.warn('Replies query with votes failed, retrying without them:', res.error.message)
  res = await supabase.from('replies').select('*').eq('post_id', postId)
  if (res.error) throw res.error
  return res.data.sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1))
}

export async function createReply(postId, { content, username, parentId = null }) {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) throw new Error('Please sign in to reply.')

  const name =
    username ??
    user.user_metadata?.username ??
    user.email?.split('@')[0] ??
    'Anonymous'

  const { data, error } = await supabase
    .from('replies')
    .insert({
      post_id: postId,
      parent_id: parentId,
      user_id: user.id,
      username: name,
      content,
    })
    .select('*')
    .single()
  if (error) throw error

  return { ...data, my_vote: [] }
}

export async function updateReply(id, content) {
  const { data, error } = await supabase
    .from('replies')
    .update({ content })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteReply(id) {
  const { error } = await supabase.from('replies').delete().eq('id', id)
  if (error) throw error
}


export async function fetchTags() {
  const { data, error } = await supabase.from('tags').select('*').order('name')
  if (error) throw error
  return data
}


async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Please sign in to save posts.')
  return data.user.id
}

export async function fetchSavedPostIds() {
  const userId = await currentUserId()
  const { data, error } = await supabase.from('saved_posts').select('post_id').eq('user_id', userId)
  if (error) throw error
  return data.map((r) => r.post_id)
}

export async function savePost(postId) {
  const userId = await currentUserId()
  const { error } = await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId })
  if (error && error.code !== '23505') throw error
}

export async function unsavePost(postId) {
  const userId = await currentUserId()
  const { error } = await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', postId)
  if (error) throw error
}


const POST_IMAGES_BUCKET = 'post-images'

export async function uploadPostImage(file) {
  const userId = await currentUserId()
  const fromName = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
  const ext = fromName || file.type.split('/')[1] || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const bucket = supabase.storage.from(POST_IMAGES_BUCKET)
  const { error } = await bucket.upload(path, file, { contentType: file.type })
  if (error) throw error
  return bucket.getPublicUrl(path).data.publicUrl
}

export async function deletePostImages(urls) {
  const marker = `/object/public/${POST_IMAGES_BUCKET}/`
  const paths = urls.map((url) => url.split(marker)[1]).filter(Boolean)
  if (!paths.length) return
  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).remove(paths)
  if (error) console.warn('Could not delete old post photos:', error.message)
}
