import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Messages are sample conversations for now (there is no chat backend yet).
// What you send, edit, unsend or react to is saved in this browser.
// Nobody replies automatically: the other side only says what is already written below.
const STORAGE_KEY = 'riffle.messages.v1'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// [from, text] pairs; the last message is placed `ago` before now and the rest a few minutes apart
const seedConversations = [
  {
    id: 'fallingislands',
    name: 'FallingIslands',
    role: 'Artist',
    hue: 215,
    image: '/images/Artists/fallingislands.svg',
    to: '/artists/fallingislands',
    ago: 2 * HOUR,
    seen: true,
    lines: [
      ['them', 'Hey! Saw you RSVP’d for BattleBox on Saturday 🙌'],
      ['me', 'Yes!! Can’t wait to hear the new EP live.'],
      ['them', 'We’re bringing the full analogue rig down into the bunker. Come say hi after the set, we’ll be by the merch table.'],
      ['me', 'Will do! Any chance you’ll play Low Tide?'],
      ['them', 'It’s the closer 😉'],
      ['me', 'Perfect. See you there, bringing a couple of friends from the forum too.'],
    ],
  },
  {
    id: 'rosa-park',
    name: 'Rosa Park',
    role: 'Friend',
    hue: 340,
    ago: 5 * HOUR,
    unread: true,
    lines: [
      ['them', 'Are you going to BattleBox on Saturday?'],
      ['me', 'Yep, got my ticket this morning'],
      ['them', 'Want to split a Grab from the east side after? The last set ends late.'],
    ],
  },
  {
    id: 'joel-tan',
    name: 'Joel Tan',
    role: 'Friend',
    hue: 205,
    ago: 1 * DAY,
    lines: [
      ['them', 'Sent you the playlist 🎧 lots of Singapore synthwave on it'],
      ['me', 'Amazing, adding it now'],
    ],
  },
  {
    id: 'mei-xuan',
    name: 'Mei Xuan',
    role: 'Friend',
    hue: 160,
    ago: 2 * DAY,
    lines: [
      ['me', 'Is there a cloakroom at BattleBox?'],
      ['them', 'Yes, on the left when you go in. The queue is long after 9 though, go early!'],
    ],
  },
  {
    id: 'lullaboy',
    name: 'Lullaboy',
    role: 'Artist',
    hue: 270,
    image: '/images/Artists/lullaboy.svg',
    to: '/artists/lullaboy',
    ago: 3 * DAY,
    lines: [['them', 'New single drops Friday! Thanks for always showing up to the shows ✨']],
  },
  {
    id: 'battlebox',
    name: 'BattleBox Fort Canning',
    role: 'Venue',
    hue: 30,
    to: '/events/fallingislands-battlebox',
    ago: 5 * DAY,
    lines: [['them', 'Your ticket for FallingIslands @ BattleBox Fort Canning is confirmed. Doors open 7:30 PM. Please bring photo ID (18+).']],
  },
  {
    id: 'riffle',
    name: 'Riffle',
    role: 'Team',
    hue: 330,
    to: '/discover',
    ago: 7 * DAY,
    lines: [['them', 'Welcome to Riffle! Your web of artists is ready. Every dot is an artist playing in Singapore.']],
  },
]

// turn the seed data above into real conversations with message ids and times
function buildSeed() {
  const now = Date.now()
  const conversations = []

  for (const seed of seedConversations) {
    const messages = []
    const lastAt = now - seed.ago

    for (let i = 0; i < seed.lines.length; i++) {
      const stepsFromEnd = seed.lines.length - 1 - i
      messages.push({
        id: seed.id + '-' + i,
        from: seed.lines[i][0],
        text: seed.lines[i][1],
        at: lastAt - stepsFromEnd * 4 * MINUTE,
        replyTo: null,
        reaction: '',
        edited: false,
        deleted: false,
        seen: seed.seen === true && i === seed.lines.length - 1,
      })
    }

    conversations.push({
      id: seed.id,
      name: seed.name,
      role: seed.role,
      hue: seed.hue,
      image: seed.image || '',
      to: seed.to || '',
      unread: seed.unread === true,
      messages,
    })
  }

  return conversations
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(saved) && saved.length > 0) return saved
  } catch {
    // fall through to the sample conversations
  }
  return buildSeed()
}

export const useMessagesStore = defineStore('messages', () => {
  const conversations = ref(load())

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.value))
    } catch {
      // storage full: the chat still works until the page is closed
    }
  }

  function findConversation(id) {
    return conversations.value.find(conversation => conversation.id === id) || null
  }

  // newest conversation first
  const sortedConversations = computed(() => {
    const list = [...conversations.value]
    list.sort((a, b) => lastActivity(b) - lastActivity(a))
    return list
  })

  const unreadCount = computed(() => conversations.value.filter(conversation => conversation.unread).length)

  function lastActivity(conversation) {
    const last = conversation.messages[conversation.messages.length - 1]
    return last ? last.at : 0
  }

  function markRead(id) {
    const conversation = findConversation(id)
    if (conversation && conversation.unread) {
      conversation.unread = false
      save()
    }
  }

  function send(id, text, replyTo) {
    const conversation = findConversation(id)
    const cleanText = text.trim()
    if (!conversation || !cleanText) return

    conversation.messages.push({
      id: id + '-' + Date.now(),
      from: 'me',
      text: cleanText,
      at: Date.now(),
      replyTo: replyTo || null,
      reaction: '',
      edited: false,
      deleted: false,
      seen: false,
    })
    save()
  }

  function edit(id, messageId, text) {
    const conversation = findConversation(id)
    const message = conversation && conversation.messages.find(m => m.id === messageId)
    const cleanText = text.trim()
    if (!message || !cleanText || cleanText === message.text) return

    message.text = cleanText
    message.edited = true
    save()
  }

  function unsend(id, messageId) {
    const conversation = findConversation(id)
    const message = conversation && conversation.messages.find(m => m.id === messageId)
    if (!message) return

    message.deleted = true
    message.text = ''
    message.reaction = ''
    save()
  }

  // tapping the same emoji again removes it
  function react(id, messageId, emoji) {
    const conversation = findConversation(id)
    const message = conversation && conversation.messages.find(m => m.id === messageId)
    if (!message) return

    message.reaction = message.reaction === emoji ? '' : emoji
    save()
  }

  return { conversations, sortedConversations, unreadCount, findConversation, markRead, send, edit, unsend, react }
})
