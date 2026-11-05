<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationsStore } from '@/stores/notifications'
import { toast } from '@/composables/useToast'
import LoginPrompt from '@/components/layout/LoginPrompt.vue'
import ArtistAvatar from '@/components/events/ArtistAvatar.vue'

const router = useRouter()
const userStore = useUserStore()
const notifications = useNotificationsStore()

const tabs = ['All', 'Unread', 'Mentions', 'Events', 'Replies']
const activeTab = ref('All')

// the rows that match the chosen tab
const rows = computed(() => {
  return notifications.list.filter(item => {
    if (activeTab.value === 'All') return true
    if (activeTab.value === 'Unread') return item.unread
    return item.type === activeTab.value
  })
})

// the same name always gets the same colour
function hueFor(name) {
  let total = 0
  for (let i = 0; i < name.length; i++) {
    total = total + name.charCodeAt(i) * (i + 1)
  }
  return total % 360
}

// notifications that are not from a person get an icon instead
function iconFor(type) {
  if (type === 'Events') return 'bi-calendar-event-fill'
  return 'bi-bell-fill'
}

function openNotification(item) {
  notifications.markRead(item.id)
  router.push(item.to)
}

async function markAll() {
  try {
    await notifications.markAllRead()
    toast('All caught up')
  } catch {
    toast('Could not mark them as read, try again')
  }
}

async function removeOne(item) {
  try {
    await notifications.remove(item.id)
  } catch {
    toast('Could not remove it, try again')
  }
}

const hasRead = computed(() => notifications.list.some(item => !item.unread))

async function clearRead() {
  try {
    await notifications.clearRead()
    toast('Cleared read notifications')
  } catch {
    toast('Could not clear them, try again')
  }
}

async function toggle(name) {
  try {
    await notifications.toggleSetting(name)
  } catch {
    toast('Could not save that setting, try again')
  }
}

// a short line under each setting, so it is clear what turns on what
const settingHints = {
  'New gigs near me': 'Gigs added within 10 km of you (uses your location if you allow it)',
  'Forum replies': 'Replies to your posts and comments',
  Mentions: 'When someone tags you with @ and your name, no spaces',
}
</script>

<template>
  <main v-if="userStore.isLoggedIn" class="notifications-page container-xxl">
    <header class="notifications-head">
      <div>
        <h1>Notifications</h1>
        <p>{{ notifications.unreadCount ? notifications.unreadCount + ' unread' : 'You are all caught up' }}</p>
      </div>
      <div class="head-actions">
        <button class="mark-all" type="button" :disabled="!hasRead" @click="clearRead">
          <i class="bi bi-trash3"></i> Clear read
        </button>
        <button class="mark-all" type="button" :disabled="!notifications.unreadCount" @click="markAll">
          <i class="bi bi-check2-all"></i> Mark all as read
        </button>
      </div>
    </header>

    <div class="tab-row" role="tablist" aria-label="Filter notifications">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        role="tab"
        class="tab-pill"
        :class="{ 'is-active': activeTab === tab }"
        :aria-selected="activeTab === tab"
        @click="activeTab = tab"
      >
        {{ tab }}
        <span v-if="tab === 'Unread' && notifications.unreadCount" class="tab-count">{{ notifications.unreadCount }}</span>
      </button>
    </div>

    <div class="row g-4 mt-1">
      <section class="col-12 col-lg-8">
        <ul class="notification-list list-unstyled">
          <li v-if="notifications.loading && !notifications.list.length" class="empty-state">
            <div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading notifications…</span></div>
          </li>
          <li v-else-if="notifications.error && !notifications.list.length" class="empty-state">
            <i class="bi bi-exclamation-triangle"></i>
            <p>{{ notifications.error }}</p>
            <button type="button" class="mark-all mt-2" @click="notifications.refresh()">Try again</button>
          </li>
          <template v-else>
          <li v-for="item in rows" :key="item.id" class="notification-item">
            <button class="notification-row" :class="{ 'is-unread': item.unread }" type="button" @click="openNotification(item)">
              <ArtistAvatar v-if="item.who" :name="item.who" :hue="hueFor(item.who)" :size="42" />
              <span v-else class="notification-icon"><i class="bi" :class="iconFor(item.type)"></i></span>

              <span class="notification-text">
                <span class="notification-line"><b v-if="item.who">{{ item.who }}</b> {{ item.text }}</span>
                <span class="notification-meta">{{ item.time }} · {{ item.type }}</span>
              </span>

              <span v-if="item.unread" class="unread-dot" aria-label="Unread"></span>
              <i v-else class="bi bi-chevron-right row-arrow"></i>
            </button>
            <button class="remove-btn" type="button" aria-label="Remove notification" @click="removeOne(item)">
              <i class="bi bi-x-lg"></i>
            </button>
          </li>
          </template>
          <li v-if="!rows.length && !notifications.loading && !notifications.error" class="empty-state">
            <i class="bi bi-bell-slash"></i>
            <p>Nothing here yet.</p>
          </li>
        </ul>
      </section>

      <aside class="col-12 col-lg-4">
        <section class="settings-card">
          <h2>Notification settings</h2>
          <p>Choose how you want to be notified</p>
          <ul class="list-unstyled">
            <li v-for="name in notifications.settingNames" :key="name" class="setting-row">
              <span class="setting-text">
                {{ name }}
                <small>{{ settingHints[name] }}</small>
              </span>
              <div class="form-check form-switch m-0">
                <input
                  class="form-check-input setting-switch"
                  type="checkbox"
                  role="switch"
                  :checked="notifications.settings[name]"
                  :aria-label="name"
                  @change="toggle(name)"
                />
              </div>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </main>
  <LoginPrompt v-else message="to see your notifications." />
</template>

<style scoped>
.notifications-page {
  padding-top: 1.75rem;
  padding-bottom: 3rem;
}

.notifications-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}
.notifications-head h1 {
  margin: 0;
  font-size: 2rem;
}
.notifications-head p {
  margin: 0.15rem 0 0;
  color: var(--riffle-muted);
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mark-all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-ink);
  font-weight: 700;
  font-size: 0.9rem;
  transition: background 0.15s, border-color 0.15s;
}
.mark-all:hover:not(:disabled) {
  background: var(--riffle-surface-soft);
  border-color: var(--riffle-faint);
}
.mark-all:disabled {
  color: var(--riffle-faint);
}

/* filter pills */
.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-muted);
  font-size: 0.9rem;
  font-weight: 700;
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
}
.tab-pill:hover {
  border-color: var(--riffle-faint);
  color: var(--riffle-ink);
}
.tab-pill.is-active {
  background: #ffe6ee;
  border-color: #ffc9dc;
  color: #c2185b;
}
.tab-count {
  min-width: 20px;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: #c2185b;
  color: #fff;
  font-size: 0.72rem;
  line-height: 20px;
  text-align: center;
}

/* the list */
.notification-list {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface);
  box-shadow: var(--riffle-shadow-sm);
}
.notification-list li + li {
  border-top: 1px solid var(--riffle-border);
}

.notification-item {
  position: relative;
}

.notification-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  padding: 0.9rem 1.1rem;
  border: 0;
  background: transparent;
  text-align: left;
  transition: background 0.15s;
  animation: row-in 0.3s ease backwards;
}
.notification-row:hover {
  background: var(--riffle-surface-soft);
}
.notification-row.is-unread {
  background: #fff8fb;
}
.notification-row.is-unread:hover {
  background: #fff0f6;
}
@keyframes row-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notification-icon {
  flex: none;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ece9ff;
  color: #5b45c9;
  font-size: 1.1rem;
}

.notification-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.notification-line {
  color: var(--riffle-text);
  font-size: 0.95rem;
  line-height: 1.35;
}
.notification-line b {
  color: var(--riffle-ink);
}
.notification-meta {
  margin-top: 0.15rem;
  color: var(--riffle-faint);
  font-size: 0.8rem;
}

.unread-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e0245e;
  box-shadow: 0 0 0 4px rgba(224, 36, 94, 0.15);
}
.row-arrow {
  color: var(--riffle-faint);
}

/* the small × to remove a notification, in the top right corner of its row */
.notification-row {
  padding-right: 3rem;
}
.remove-btn {
  position: absolute;
  top: 50%;
  right: 0.6rem;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  transform: translateY(-50%);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-faint);
  font-size: 0.8rem;
  transition: background 0.15s, color 0.15s;
}
.remove-btn:hover,
.remove-btn:focus-visible {
  background: #fee2e2;
  color: #dc2626;
}
.unread-dot,
.row-arrow {
  margin-right: 0.4rem;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 0.25rem;
  min-height: 260px;
  color: var(--riffle-faint);
}
.empty-state i {
  font-size: 2rem;
}
.empty-state p {
  margin: 0;
}

/* settings card */
.settings-card {
  padding: 1.4rem;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface);
  box-shadow: var(--riffle-shadow-sm);
}
.settings-card h2 {
  margin: 0;
  font-size: 1.1rem;
}
.settings-card > p {
  margin: 0.2rem 0 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--riffle-border);
  color: var(--riffle-muted);
  font-size: 0.9rem;
}
.settings-card ul {
  margin: 1rem 0 0;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0;
  color: var(--riffle-ink);
  font-weight: 600;
  font-size: 0.95rem;
}

.setting-text {
  display: flex;
  flex-direction: column;
  padding-right: 0.75rem;
}
.setting-text small {
  color: var(--riffle-muted);
  font-size: 0.78rem;
  font-weight: 500;
}

/* a clear on / off switch (same look as the Events filters) */
.setting-switch {
  width: 2.7em;
  height: 1.45em;
  margin: 0;
  cursor: pointer;
  border: 2px solid #8f9ab8;
  background-color: #e9edf8;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%236b7694'/%3e%3c/svg%3e");
}
.setting-switch:checked {
  background-color: #7c4dff;
  border-color: #7c4dff;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
}

/* Dark mode: the light boxes become dark, so their text stays readable */
:root[data-theme='dark'] .tab-pill.is-active {
  background: rgba(224, 36, 94, 0.18);
  border-color: rgba(224, 36, 94, 0.45);
  color: #ff8cbd;
}
:root[data-theme='dark'] .notification-row.is-unread {
  background: rgba(224, 36, 94, 0.08);
}
:root[data-theme='dark'] .notification-row.is-unread:hover {
  background: rgba(224, 36, 94, 0.14);
}
:root[data-theme='dark'] .notification-icon {
  background: rgba(124, 77, 255, 0.2);
  color: #cdbfff;
}
:root[data-theme='dark'] .remove-btn:hover,
:root[data-theme='dark'] .remove-btn:focus-visible {
  background: rgba(220, 38, 38, 0.18);
  color: #fca5a5;
}
:root[data-theme='dark'] .setting-switch:not(:checked) {
  border-color: var(--riffle-muted);
  background-color: var(--riffle-surface-soft);
}
</style>
