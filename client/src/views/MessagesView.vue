<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessagesStore } from '@/stores/messages'
import { toast } from '@/composables/useToast'
import LoginPrompt from '@/components/layout/LoginPrompt.vue'
import ArtistAvatar from '@/components/events/ArtistAvatar.vue'

const route = useRoute()
const userStore = useUserStore()
const messages = useMessagesStore()

const quickReactions = ['❤️', '😂', '😮', '😢', '👍', '🔥']
const emojis = ['😀', '😂', '😍', '🔥', '🙌', '👍', '🎶', '🎧', '✨', '😎', '🥳', '❤️', '👏', '😢', '🙏', '😉']

const currentId = ref('')
const chatOpen = ref(false) // on a phone: the chat is shown instead of the list
const search = ref('')

const draft = ref('')
const replyingTo = ref(null) // the message being answered
const editingId = ref('') // the message being edited
const emojiOpen = ref(false)
const reactionFor = ref('') // the message whose reaction picker is open
const confirmId = ref('') // the message waiting for "Unsend?" confirmation

const current = computed(() => messages.findConversation(currentId.value))

// ---- the list on the left -------------------------------------------------------------
function lastMessage(conversation) {
  return conversation.messages[conversation.messages.length - 1] || null
}

function previewOf(conversation) {
  const last = lastMessage(conversation)
  if (!last) return 'No messages yet'
  if (last.deleted) return 'Message unsent'
  const text = last.text
  return last.from === 'me' ? 'You: ' + text : text
}

const visibleConversations = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return messages.sortedConversations

  return messages.sortedConversations.filter(conversation => {
    const text = conversation.name + ' ' + conversation.messages.map(m => m.text).join(' ')
    return text.toLowerCase().includes(query)
  })
})

// ---- times ----------------------------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000
const GAP = 15 * 60 * 1000 // a new time heading after 15 quiet minutes

function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function timeOf(at) {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function dayLabel(at) {
  if (sameDay(at, Date.now())) return 'Today'
  if (sameDay(at, Date.now() - DAY)) return 'Yesterday'
  return new Date(at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

function listTime(at) {
  return sameDay(at, Date.now()) ? timeOf(at) : dayLabel(at)
}

// ---- the chat on the right ------------------------------------------------------------
// every message, with a heading before it when there was a long quiet gap
const thread = computed(() => {
  if (!current.value) return []

  const rows = []
  let previousAt = 0
  let previousFrom = ''
  for (const message of current.value.messages) {
    const newHeading = message.at - previousAt > GAP
    rows.push({
      message,
      heading: newHeading ? dayLabel(message.at) + ' ' + timeOf(message.at) : '',
      // several messages in a row from the same person sit closer together
      grouped: !newHeading && previousFrom === message.from,
      quote: message.replyTo ? current.value.messages.find(m => m.id === message.replyTo) || null : null,
    })
    previousAt = message.at
    previousFrom = message.from
  }
  return rows
})

function openConversation(id) {
  currentId.value = id
  chatOpen.value = true
  messages.markRead(id)
  cancelCompose()
  scrollToBottom()
}

// wait a moment for the new message to be drawn, then scroll to the bottom
function scrollToBottom() {
  setTimeout(() => {
    const thread = document.getElementById('message-thread')
    if (thread) {
      thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
    }
  }, 50)
}

// open the chat named in the address (?c=joel-tan), or the newest one on a wide screen
function openFromAddress() {
  const wanted = route.query.c
  if (wanted && messages.findConversation(wanted)) {
    openConversation(wanted)
  } else if (!currentId.value && window.innerWidth >= 768 && messages.sortedConversations.length) {
    currentId.value = messages.sortedConversations[0].id
    messages.markRead(currentId.value)
  }
}
onMounted(openFromAddress)
watch(() => route.query.c, openFromAddress)
watch(() => current.value && current.value.messages.length, scrollToBottom)

// ---- writing --------------------------------------------------------------------------
function cancelCompose() {
  draft.value = ''
  replyingTo.value = null
  editingId.value = ''
  emojiOpen.value = false
  reactionFor.value = ''
}

function submit() {
  if (!current.value) return

  if (editingId.value) {
    messages.edit(current.value.id, editingId.value, draft.value)
    cancelCompose()
    return
  }

  if (!draft.value.trim()) return

  messages.send(current.value.id, draft.value, replyingTo.value ? replyingTo.value.id : null)
  cancelCompose()
}

function addEmoji(emoji) {
  draft.value = draft.value + emoji
}

// ---- actions on a message -------------------------------------------------------------
function startReply(message) {
  editingId.value = ''
  replyingTo.value = message
  reactionFor.value = ''
}

function startEdit(message) {
  replyingTo.value = null
  editingId.value = message.id
  draft.value = message.text
  reactionFor.value = ''
}

function react(message, emoji) {
  messages.react(current.value.id, message.id, emoji)
  reactionFor.value = ''
}

function confirmUnsend() {
  messages.unsend(current.value.id, confirmId.value)
  confirmId.value = ''
  toast('Message unsent')
}

function quoteText(message) {
  if (message.deleted) return 'Message unsent'
  return message.text || 'Photo'
}
</script>

<template>
  <main v-if="userStore.isLoggedIn" class="messages-page container-xxl">
    <div class="messages-shell" :class="{ 'show-chat': chatOpen }">
      <!-- conversations -->
      <aside class="conversation-list">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input v-model="search" type="search" placeholder="Search messages" aria-label="Search messages" />
        </div>

        <ul class="list-unstyled">
          <li v-for="conversation in visibleConversations" :key="conversation.id">
            <button
              type="button"
              class="conversation"
              :class="{ 'is-current': conversation.id === currentId }"
              @click="openConversation(conversation.id)"
            >
              <ArtistAvatar :name="conversation.name" :hue="conversation.hue" :image="conversation.image" :size="46" />
              <span class="conversation-text">
                <span class="conversation-top">
                  <span class="conversation-name">{{ conversation.name }}</span>
                  <span class="conversation-time">{{ listTime(lastMessage(conversation).at) }}</span>
                </span>
                <span class="conversation-preview" :class="{ 'is-unread': conversation.unread }">{{ previewOf(conversation) }}</span>
              </span>
              <span v-if="conversation.unread" class="unread-dot" aria-label="Unread"></span>
            </button>
          </li>
          <li v-if="!visibleConversations.length" class="no-results">No conversations found.</li>
        </ul>
      </aside>

      <!-- the open chat -->
      <section v-if="current" class="chat">
        <header class="chat-head">
          <button class="back-button" type="button" aria-label="Back to conversations" @click="chatOpen = false">
            <i class="bi bi-chevron-left"></i>
          </button>
          <ArtistAvatar :name="current.name" :hue="current.hue" :image="current.image" :size="42" />
          <div class="chat-title">
            <strong>{{ current.name }}</strong>
            <span>{{ current.role }}</span>
          </div>
          <RouterLink v-if="current.to" :to="current.to" class="view-profile">View profile</RouterLink>
        </header>

        <div id="message-thread" class="thread" @click="reactionFor = ''">
          <template v-for="row in thread" :key="row.message.id">
            <p v-if="row.heading" class="thread-heading">{{ row.heading }}</p>

            <div class="message-row" :class="[row.message.from === 'me' ? 'is-mine' : 'is-theirs', { 'is-grouped': row.grouped }]">
              <div class="bubble-wrap" tabindex="0">
                <!-- what you can do with a message (shown on hover) -->
                <div v-if="!row.message.deleted" class="message-actions">
                  <button type="button" title="React" aria-label="React" @click.stop="reactionFor = reactionFor === row.message.id ? '' : row.message.id">
                    <i class="bi bi-emoji-smile"></i>
                  </button>
                  <button type="button" title="Reply" aria-label="Reply" @click.stop="startReply(row.message)">
                    <i class="bi bi-reply"></i>
                  </button>
                  <button v-if="row.message.from === 'me' && row.message.text" type="button" title="Edit" aria-label="Edit" @click.stop="startEdit(row.message)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button v-if="row.message.from === 'me'" type="button" title="Unsend" aria-label="Unsend" @click.stop="confirmId = row.message.id">
                    <i class="bi bi-trash3"></i>
                  </button>
                  <span class="message-time">{{ timeOf(row.message.at) }}</span>

                  <div v-if="reactionFor === row.message.id" class="reaction-picker" @click.stop>
                    <button v-for="emoji in quickReactions" :key="emoji" type="button" @click="react(row.message, emoji)">{{ emoji }}</button>
                  </div>
                </div>

                <div class="bubble" :class="{ 'is-deleted': row.message.deleted }">
                  <p v-if="row.quote" class="quote">
                    <i class="bi bi-reply-fill"></i> {{ quoteText(row.quote) }}
                  </p>
                  <span v-if="row.message.deleted">You unsent a message</span>
                  <span v-else-if="row.message.text">{{ row.message.text }}</span>
                  <small v-if="row.message.edited && !row.message.deleted" class="edited">edited</small>
                </div>
                <span v-if="row.message.reaction" class="reaction-badge">{{ row.message.reaction }}</span>
                <span v-if="row.message.seen" class="seen">Seen {{ timeOf(row.message.at + 2 * 60 * 1000) }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- reply / edit hint -->
        <div v-if="replyingTo || editingId" class="compose-hint">
          <span v-if="replyingTo"><i class="bi bi-reply-fill"></i> Replying to: {{ quoteText(replyingTo) }}</span>
          <span v-else><i class="bi bi-pencil-fill"></i> Editing message</span>
          <button type="button" aria-label="Cancel" @click="cancelCompose"><i class="bi bi-x-lg"></i></button>
        </div>

        <form class="composer" @submit.prevent="submit">
          <div class="composer-box">
            <input
              v-model="draft"
              type="text"
              :placeholder="editingId ? 'Edit your message…' : 'Write a message…'"
              aria-label="Write a message"
              autocomplete="off"
              @keydown.esc="cancelCompose"
            />
            <div class="emoji-wrap">
              <button type="button" class="tool-button" aria-label="Add an emoji" @click="emojiOpen = !emojiOpen">
                <i class="bi bi-emoji-smile"></i>
              </button>
              <div v-if="emojiOpen" class="emoji-panel">
                <button v-for="emoji in emojis" :key="emoji" type="button" @click="addEmoji(emoji)">{{ emoji }}</button>
              </div>
            </div>
          </div>
          <button class="send-button" type="submit" :disabled="!draft.trim()" aria-label="Send">
            <i class="bi" :class="editingId ? 'bi-check-lg' : 'bi-arrow-up'"></i>
          </button>
        </form>
      </section>

      <section v-else class="chat chat-empty">
        <i class="bi bi-chat-dots"></i>
        <p>Select a conversation to start chatting.</p>
      </section>
    </div>

    <!-- "Unsend this message?" -->
    <template v-if="confirmId">
      <div class="modal-backdrop fade show"></div>
      <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" aria-label="Unsend message" @click.self="confirmId = ''">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content confirm-box">
            <h2>Unsend message?</h2>
            <p>This message will be removed for you and {{ current && current.name }}.</p>
            <div class="confirm-actions">
              <button type="button" class="btn btn-light" @click="confirmId = ''">Cancel</button>
              <button type="button" class="btn btn-danger" @click="confirmUnsend">Unsend</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </main>
  <LoginPrompt v-else message="to see your messages." />
</template>

<style scoped>
.messages-page {
  flex: 1;
  min-height: 0;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.messages-shell {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  height: calc(100vh - var(--navbar-height) - 3rem);
  min-height: 460px;
  overflow: hidden;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: #fff;
  box-shadow: var(--riffle-shadow-sm);
}

/* ---- conversation list ---- */
.conversation-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--riffle-border);
}
.search-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 1rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  background: #eef0f8;
  color: var(--riffle-muted);
}
.search-box:focus-within {
  box-shadow: 0 0 0 2px var(--riffle-blue);
}
.search-box input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--riffle-ink);
}
.conversation-list ul {
  flex: 1;
  margin: 0;
  overflow-y: auto;
}
.conversation {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  padding: 0.8rem 1rem;
  border: 0;
  background: transparent;
  text-align: left;
  transition: background 0.15s;
}
.conversation:hover {
  background: #f6f7fc;
}
.conversation.is-current {
  background: #eef1fb;
}
.conversation-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.conversation-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.conversation-name {
  overflow: hidden;
  color: var(--riffle-ink);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conversation-time {
  flex: none;
  color: var(--riffle-faint);
  font-size: 0.78rem;
}
.conversation-preview {
  overflow: hidden;
  color: var(--riffle-muted);
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conversation-preview.is-unread {
  color: var(--riffle-ink);
  font-weight: 700;
}
.unread-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e0245e;
}
.no-results {
  padding: 1.5rem 1rem;
  color: var(--riffle-faint);
  text-align: center;
}

/* ---- chat ---- */
.chat {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.chat-empty {
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--riffle-faint);
}
.chat-empty i {
  font-size: 2.5rem;
}
.chat-head {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid var(--riffle-border);
}
.back-button {
  display: none;
  border: 0;
  background: transparent;
  font-size: 1.2rem;
  color: var(--riffle-ink);
}
.chat-title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.chat-title strong {
  color: var(--riffle-ink);
}
.chat-title span {
  color: var(--riffle-muted);
  font-size: 0.85rem;
}
.view-profile {
  padding: 0.45rem 1rem;
  border: 1px solid var(--riffle-border);
  border-radius: 10px;
  color: var(--riffle-ink);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}
.view-profile:hover {
  background: #eef1fb;
}

.thread {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.5rem clamp(1rem, 3vw, 2.25rem) 1rem;
  overflow-y: auto;
}
.thread-heading {
  margin: 1.5rem 0 1rem;
  color: var(--riffle-faint);
  font-size: 0.78rem;
  text-align: center;
}
.thread-heading:first-child {
  margin-top: 0;
}

/* their messages sit on the left, yours on the right, with room between messages */
.message-row {
  display: flex;
  margin-top: 1rem;
  animation: message-in 0.2s ease backwards;
}
.message-row.is-theirs {
  justify-content: flex-start;
}
.message-row.is-mine {
  justify-content: flex-end;
}
/* several messages in a row from the same person sit closer together */
.message-row.is-grouped {
  margin-top: 0.3rem;
}
.thread-heading + .message-row {
  margin-top: 0;
}
@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: min(560px, 72%);
}
.is-mine .bubble-wrap {
  align-items: flex-end;
}
.bubble {
  padding: 0.75rem 1.15rem;
  border-radius: 20px;
  background: #f0eff0;
  color: var(--riffle-ink);
  font-size: 0.95rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.is-mine .bubble {
  background: #1b2037;
  color: #fff;
}
.bubble.is-deleted {
  border: 1px dashed var(--riffle-border);
  background: transparent;
  color: var(--riffle-faint);
  font-style: italic;
}
.quote {
  margin: 0 0 0.4rem;
  padding-left: 0.6rem;
  border-left: 3px solid rgba(128, 128, 160, 0.5);
  font-size: 0.82rem;
  opacity: 0.8;
}
.edited {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.7rem;
  opacity: 0.6;
}
.reaction-badge {
  align-self: flex-start;
  margin: -0.5rem 0 0 0.6rem;
  padding: 0 0.35rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: #fff;
  font-size: 0.85rem;
  box-shadow: var(--riffle-shadow-sm);
}
.is-mine .reaction-badge {
  align-self: flex-end;
  margin: -0.5rem 0.6rem 0 0;
}
.seen {
  margin-top: 0.3rem;
  color: var(--riffle-faint);
  font-size: 0.72rem;
}

/* hover actions */
.message-actions {
  position: absolute;
  top: 50%;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.1rem;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition: opacity 0.15s;
}
.is-theirs .message-actions {
  left: calc(100% + 0.4rem);
}
.is-mine .message-actions {
  right: calc(100% + 0.4rem);
}
.message-row:hover .message-actions,
.message-row:focus-within .message-actions {
  opacity: 1;
  pointer-events: auto;
}
.bubble-wrap:focus {
  outline: none;
}
.message-actions button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
}
.message-actions button:hover {
  background: #eef1fb;
  color: var(--riffle-ink);
}
.message-time {
  padding: 0 0.3rem;
  white-space: nowrap;
  color: var(--riffle-faint);
  font-size: 0.72rem;
}
.reaction-picker {
  position: absolute;
  bottom: 120%;
  left: 0;
  z-index: 5;
  display: flex;
  gap: 0.1rem;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--riffle-shadow);
  animation: pop 0.15s ease;
}
.is-mine .reaction-picker {
  left: auto;
  right: 0;
}
.reaction-picker button {
  width: 32px;
  height: 32px;
  font-size: 1.1rem;
}
@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* writing */
.compose-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0 1.25rem;
  padding: 0.45rem 0.9rem;
  border-radius: 12px 12px 0 0;
  background: #eef1fb;
  color: var(--riffle-muted);
  font-size: 0.85rem;
}
.compose-hint span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.compose-hint button,

.composer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1.25rem 1.1rem;
}
.composer-box {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.6rem 0.35rem 1.1rem;
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
}
.composer-box:focus-within {
  border-color: var(--riffle-blue);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.composer-box > input[type='text'] {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0;
  border: 0;
  outline: none;
  color: var(--riffle-ink);
}
.tool-button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
  font-size: 1.1rem;
}
.tool-button:hover:not(:disabled) {
  background: #eef1fb;
  color: var(--riffle-ink);
}
.tool-button:disabled {
  opacity: 0.4;
}
.emoji-wrap {
  position: relative;
}
.emoji-panel {
  position: absolute;
  right: 0;
  bottom: 120%;
  z-index: 6;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.15rem;
  padding: 0.5rem;
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--riffle-shadow);
  animation: pop 0.15s ease;
}
.emoji-panel button {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  font-size: 1.25rem;
}
.emoji-panel button:hover {
  background: #eef1fb;
}
.send-button {
  flex: none;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: #1b2037;
  color: #fff;
  font-size: 1.2rem;
  transition: background 0.15s, transform 0.15s;
}
.send-button:hover:not(:disabled) {
  background: #2f3a63;
  transform: translateY(-1px);
}
.send-button:disabled {
  background: #ffc9dc;
}

.confirm-box {
  padding: 1.5rem;
  border: 0;
  border-radius: 16px;
}
.confirm-box h2 {
  font-size: 1.15rem;
}
.confirm-box p {
  color: var(--riffle-muted);
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* ---- phones and small tablets: one panel at a time ---- */
@media (max-width: 767.98px) {
  .messages-page {
    padding: 0;
  }
  .messages-shell {
    grid-template-columns: minmax(0, 1fr);
    height: calc(100vh - var(--navbar-height));
    border: 0;
    border-radius: 0;
  }
  .conversation-list {
    border-right: 0;
  }
  .messages-shell:not(.show-chat) .chat {
    display: none;
  }
  .messages-shell.show-chat .conversation-list {
    display: none;
  }
  .back-button {
    display: block;
  }
  /* no hover on a phone: tap a message to show its actions */
  .message-actions {
    top: auto;
    bottom: calc(100% + 0.25rem);
    transform: none;
  }
  .is-theirs .message-actions {
    left: 0;
  }
  .is-mine .message-actions {
    right: 0;
  }
  .message-time {
    display: none;
  }
  .bubble-wrap {
    max-width: 84%;
  }
}
</style>
