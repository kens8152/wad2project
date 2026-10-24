import { supabase } from '@/services/supabase.js'


const POST_WITH_REPLIES = '*, replies(*)'

// ---------- Posts ----------

export async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_REPLIES)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createPost({ title, content, tags, username }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ title, content, tags, username }) 
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

// ---------- Replies ----------

export async function createReply(postId, { content, username }) {
  const { data, error } = await supabase
    .from('replies')
    .insert({ post_id: postId, content, username })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteReply(id) {
  const { error } = await supabase.from('replies').delete().eq('id', id)
  if (error) throw error
}

// ---------- Tags ----------

export async function fetchTags() {
  const { data, error } = await supabase.from('tags').select('*').order('name')
  if (error) throw error
  return data
}

// ---------- Saved posts ----------

// Ids of the posts the signed-in user has saved (empty if signed out)
export async function fetchSavedPostIds() {
  const { data, error } = await supabase.from('saved_posts').select('post_id')
  if (error) throw error
  return data.map((r) => r.post_id)
}

export async function savePost(postId) {
  const { error } = await supabase.from('saved_posts').insert({ post_id: postId })
  if (error) throw error
}

export async function unsavePost(postId) {
  const { error } = await supabase.from('saved_posts').delete().eq('post_id', postId)
  if (error) throw error
}