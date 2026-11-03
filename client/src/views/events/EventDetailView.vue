<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EventCover from '../../components/events/EventCover.vue'
import ArtistAvatar from '../../components/events/ArtistAvatar.vue'
import EventDiscussion from '../../components/events/EventDiscussion.vue'
import EventMiniMap from '../../components/events/EventMiniMap.vue'
import DiscoverTour from '../../components/discover/DiscoverTour.vue'
import { bringOnScreen, forgetSeen, hasSettled, isOnScreen, isStill, scrollHasStopped } from '../../utils/tourChecks'
import { useEventsData } from '../../composables/events/useEventsData'
import { useSavedEvents } from '../../composables/events/useSavedEvents'
import { dayLabel, dayLabelYear } from '../../utils/events/date'
import { formatDistance, mapsDirectionsUrl, mapsSearchUrl } from '../../utils/events/geo'
import { toast } from '@/composables/useToast'

const props = defineProps({ id: { type: String, required: true } })

const router = useRouter()
const data = useEventsData()
const { isSaved, toggle } = useSavedEvents()

const tab = ref('details')

onMounted(() => data.load())

const event = computed(() => data.getEvent(props.id))
const saved = computed(() => (event.value ? isSaved(event.value.id) : false))

// Reset UI state when navigating between events (e.g. via "More at …").
watch(() => props.id, () => {
  tab.value = 'details'
  window.scrollTo({ top: 0 })
})

const moreAtVenue = computed(() =>
  event.value
    ? data.events.value
        .filter((e) => e.venueId === event.value.venueId && e.id !== event.value.id && e.dayOffset >= 0)
        .sort((a, b) => a.startsAt - b.startsAt)
        .slice(0, 3)
    : [],
)

const detailTiles = computed(() => {
  const e = event.value
  return [
    { icon: 'bi-calendar-event-fill', tone: 'rose', label: 'Date & time', value: `${dayLabelYear(e.startsAt)} · ${e.timeLabel}` },
    {
      icon: 'bi-ticket-perforated-fill',
      tone: 'amber',
      label: 'Set times',
      lines: e.setTimes.map((s) => `${s.artist.name} ${s.time}`),
    },
    { icon: 'bi-clock-fill', tone: 'violet', label: 'Doors', value: `${e.doorsLabel} · First set ${e.timeLabel}` },
    { icon: 'bi-people-fill', tone: 'blue', label: 'Entry', value: e.entry },
    {
      icon: 'bi-geo-alt-fill',
      tone: 'green',
      label: 'Venue',
      value: `${e.venue.address} · ${formatDistance(e.distanceKm)}`,
      link: { text: 'View on map', href: mapsSearchUrl(e.venue) },
    },
    {
      icon: 'bi-bus-front-fill',
      tone: 'orange',
      label: 'Getting there',
      value: e.venue.transit,
      link: { text: 'Plan route', href: mapsDirectionsUrl(e.venue) },
    },
  ]
})

// ---- the guided tour of this page ----
// Like the Discover guide: the page goes dark and one or two parts are lit up while a card explains them.
// When a step needs the page to scroll, or to switch between Details and Discussions, the spotlight fades out first and
// comes back once the page has stopped moving, so it never flashes or slides across the screen.
const tourOpen = ref(false)

const tourPlan = [
  {
    title: 'The event at a glance',
    text: 'When it starts, its genre and its name. The colours of the cover come from the genre.',
    targets: ['.hero__text'],
  },
  {
    title: 'Tickets, save and share',
    text: "Get tickets from the organiser's site, save the event to find it again later, or share it with friends.",
    targets: ['.hero__actions'],
  },
  {
    title: 'Details and discussions',
    text: 'Switch between everything about the event and the discussion with other fans.',
    targets: ['.event-tabs'],
  },
  {
    title: "Who's playing",
    text: 'The line-up, with the headliner first. Click an artist to open their page.',
    targets: ['.lineup'],
  },
  {
    title: 'Times, entry and getting there',
    text: 'Doors and set times, how to get in, the venue, and the nearest public transport. The links open the route in your maps app.',
    targets: ['.tiles'],
  },
  {
    title: 'Find it on the map',
    text: 'The venue on a small map. Open it on the Events map to see it among everything else on.',
    targets: ['.mini-map'],
  },
  {
    title: 'More at this venue',
    text: 'Other events coming up at the same place, and a link to all of them.',
    targets: ['.event-layout__side > .event-section'],
  },
  {
    tab: 'discussions',
    title: 'Join the discussion',
    text: 'Ask a question, find people to go with, or say what you thought of the show.',
    targets: ['.discussion'],
  },
  {
    title: 'Come back anytime',
    text: 'Reopen this guide anytime with the Guide button.',
    targets: ['.event-guide-btn'],
  },
]

const tourSteps = tourPlan.map((step) => ({
  title: step.title,
  text: step.text,
  target: () => step.targets,
  // the page changes when the tab has to change, or when the parts are not on the screen yet (the page scrolls to them)
  changes: () => (step.tab || 'details') !== tab.value || step.targets.some((target) => !isOnScreen(target)),
  // lit up once the page has stopped scrolling, the tab has finished appearing, and the part has stopped moving
  ready: () => {
    const settled = scrollHasStopped() && hasSettled('.event-layout__main')
    return step.targets.map((target) => settled && isStill(target))
  },
}))

function startTour() {
  tab.value = 'details'
  forgetSeen()
  const main = document.querySelector('.app-main')
  if (main) main.scrollTop = 0
  tourOpen.value = true
}

function onTourStep(number) {
  const step = tourPlan[number]
  tab.value = step.tab || 'details'
  // wait for the tab to be drawn, then scroll its part onto the screen
  requestAnimationFrame(() => requestAnimationFrame(() => step.targets.forEach(bringOnScreen)))
}

function endTour() {
  tourOpen.value = false
  tab.value = 'details'
}

function back() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'events-map' })
}

function onSave() {
  toast(toggle(event.value.id) ? 'Event saved' : 'Removed from saved events')
}

async function onShare() {
  const e = event.value
  const url = window.location.href
  try {
    if (navigator.share) {
      await navigator.share({ title: e.heroTitle, text: `${e.heroTitle} on Riffle`, url })
      return
    }
    await navigator.clipboard.writeText(url)
    toast('Link copied to clipboard')
  } catch (err) {
    if (err?.name !== 'AbortError') toast('Could not share this event')
  }
}
</script>

<template>
  <div class="container-xxl event-page">
    <!-- loading -->
    <div v-if="data.loading.value && !event" class="event-page__state">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading event…</span></div>
    </div>

    <!-- not found -->
    <div v-else-if="!event" class="event-page__state">
      <i class="bi bi-calendar-x fs-1 text-secondary"></i>
      <h1 class="h4 mt-2">We couldn't find that event</h1>
      <p class="text-secondary">It may have ended or the link is out of date.</p>
      <button class="btn btn-riffle" @click="back">Back to Events</button>
    </div>

    <template v-else>
      <!-- Hero -->
      <section class="hero" :style="{ '--genre': event.genre.color }">
        <EventCover class="hero__cover" :palette="event.palette" :seed="event.id" />
        <div class="hero__scrim"></div>

        <div class="hero__inner">
          <div class="hero__top">
            <button type="button" class="hero__back" @click="back"><i class="bi bi-arrow-left"></i> Back to Events</button>
            <button type="button" class="event-guide-btn" :class="{ 'is-on': tourOpen }" @click="startTour">
              <i class="bi bi-compass"></i> Guide
            </button>
          </div>

          <div class="hero__bottom">
            <div class="hero__text">
              <div class="hero__chips">
                <span class="hero__chip">{{ dayLabel(event.startsAt).toUpperCase() }} · {{ event.timeLabel }}</span>
                <span class="hero__chip hero__chip--genre"><i class="dot"></i>{{ event.genre.label.toUpperCase() }}</span>
              </div>
              <h1 class="hero__title">{{ event.heroTitle }}</h1>
            </div>

            <div class="hero__actions">
              <a class="btn hero__btn hero__btn--primary" :href="event.ticketUrl" target="_blank" rel="noopener noreferrer">
                Get tickets <i class="bi bi-arrow-up-right"></i>
              </a>
              <button type="button" class="btn hero__btn" :aria-pressed="saved" @click="onSave">
                <i class="bi" :class="saved ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
                {{ saved ? 'Saved' : 'Save event' }}
              </button>
              <button type="button" class="btn hero__btn" @click="onShare">
                <i class="bi bi-box-arrow-up"></i> Share
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <div class="event-tabs" role="tablist">
        <button
          v-for="t in [{ id: 'details', label: 'Details' }, { id: 'discussions', label: 'Discussions' }]"
          :key="t.id"
          type="button"
          role="tab"
          class="event-tabs__tab"
          :class="{ 'is-active': tab === t.id }"
          :aria-selected="tab === t.id"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="event-layout">
        <!-- Main column -->
        <div class="event-layout__main">
          <template v-if="tab === 'details'">
            <section class="riffle-card event-section">
              <h2 class="event-section__title">About this event</h2>
              <p class="event-about">{{ event.about }}</p>

              <h2 class="event-section__title mt-4">Line-up</h2>
              <ul class="lineup">
                <li v-for="l in event.lineup" :key="l.artist.id" class="lineup__item">
                  <RouterLink :to="{ name: 'artist-detail', params: { id: l.artist.id } }" class="lineup__link">
                    <ArtistAvatar :name="l.artist.name" :hue="l.artist.hue" :size="62" />
                    <span>
                      <strong>{{ l.artist.name }}</strong>
                      <span class="lineup__role" :class="{ 'is-headliner': l.role === 'Headliner' }">{{ l.role }}</span>
                    </span>
                  </RouterLink>
                </li>
              </ul>

              <h2 class="event-section__title mt-4">Event details</h2>
              <div class="tiles">
                <div v-for="t in detailTiles" :key="t.label" class="tile">
                  <span class="tile__icon" :class="`tone-${t.tone}`"><i class="bi" :class="t.icon"></i></span>
                  <div class="tile__text">
                    <span class="tile__label">{{ t.label }}</span>
                    <template v-if="t.lines">
                      <span v-for="line in t.lines" :key="line" class="tile__value">{{ line }}</span>
                    </template>
                    <span v-else class="tile__value">{{ t.value }}</span>
                    <a v-if="t.link" :href="t.link.href" target="_blank" rel="noopener noreferrer" class="tile__link">
                      {{ t.link.text }} <i class="bi bi-arrow-up-right"></i>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <EventDiscussion v-else :event-id="event.id" />
        </div>

        <!-- Side column -->
        <aside class="event-layout__side">
          <EventMiniMap :venue="event.venue" :color="event.genre.hex" :link-to="{ name: 'events-map', query: { focus: event.id } }" />

          <section class="riffle-card event-section">
            <div class="side-head">
              <h2 class="event-section__title m-0">More at {{ event.venue.fullName }}</h2>
              <span class="side-head__icon tone-violet"><i class="bi bi-megaphone-fill"></i></span>
            </div>

            <ul v-if="moreAtVenue.length" class="more-list">
              <li v-for="m in moreAtVenue" :key="m.id">
                <RouterLink :to="{ name: 'event-detail', params: { id: m.id } }" class="more-item">
                  <span class="more-item__thumb"><EventCover :palette="m.palette" :seed="m.id" /></span>
                  <span>
                    <small>{{ dayLabel(m.startsAt) }}</small>
                    <strong>{{ m.title === `${m.headliner.name} at ${m.venue.listName}` ? m.headliner.name : m.title }}</strong>
                  </span>
                </RouterLink>
              </li>
            </ul>
            <p v-else class="text-secondary small mt-3 mb-0">Nothing else scheduled here yet.</p>

            <RouterLink
              :to="{ name: 'events-list', query: { venue: event.venueId } }"
              class="more-all"
            >
              See all events at {{ event.venue.name }} <i class="bi bi-arrow-right"></i>
            </RouterLink>
          </section>
        </aside>
      </div>

      <!-- the guided tour of this page -->
      <DiscoverTour v-if="tourOpen" label="Event" :steps="tourSteps" @step="onTourStep" @finish="endTour" @skip="endTour" />
    </template>
  </div>
</template>

<style scoped>
.event-page {
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}
.event-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}

/* ---- hero ---- */
.hero {
  position: relative;
  min-height: 290px;
  border-radius: 20px;
  overflow: hidden;
  color: #fff;
  background: #07122e;
}
.hero__cover {
  --crowd-max: 150px;
  position: absolute;
  inset: 0;
}
.hero__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(5, 10, 30, 0.45) 0%, rgba(5, 10, 30, 0) 38%, rgba(5, 10, 30, 0.35) 100%);
}
.hero__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2.5rem;
  min-height: 290px;
  padding: 1.25rem 1.5rem 1.5rem;
}
/* the top of the cover: Back on the left, Guide on the right */
.hero__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.event-guide-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.15s, transform 0.15s;
}
.event-guide-btn:hover,
.event-guide-btn.is-on {
  background: rgba(255, 255, 255, 0.3);
}
.event-guide-btn:hover {
  transform: translateY(-1px);
}
.hero__back {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
}
.hero__back:hover {
  text-decoration: underline;
}
.hero__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}
.hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}
.hero__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.95rem;
  border-radius: 999px;
  background: rgba(8, 14, 36, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(4px);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.hero__chip--genre {
  background: rgba(9, 60, 52, 0.7);
  border-color: color-mix(in srgb, var(--genre) 70%, transparent);
}
.hero__chip .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre);
  box-shadow: 0 0 8px var(--genre);
}
.hero__title {
  margin: 0;
  color: #fff;
  font-size: clamp(1.7rem, 3.2vw, 2.5rem);
  line-height: 1.12;
}
.hero__text {
  flex: 1 1 420px;
  min-width: 0;
}
.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}
.hero__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(8, 14, 36, 0.45);
  backdrop-filter: blur(4px);
  color: #fff;
  font-weight: 700;
}
.hero__btn:hover {
  background: rgba(8, 14, 36, 0.7);
  color: #fff;
}
.hero__btn--primary {
  background: linear-gradient(135deg, #ff4f6d, #ff5f7a);
  border-color: transparent;
}
.hero__btn--primary:hover {
  background: linear-gradient(135deg, #ff3b5d, #ff4f6d);
}

/* ---- tabs ---- */
.event-tabs {
  display: flex;
  gap: 2rem;
  margin: 1.2rem 0 1.1rem 0.5rem;
  border-bottom: 1px solid var(--riffle-border);
}
.event-tabs__tab {
  position: relative;
  padding: 0.6rem 0.2rem 0.8rem;
  border: 0;
  background: none;
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--riffle-muted);
}
.event-tabs__tab.is-active {
  color: var(--riffle-ink);
  font-weight: 800;
}
.event-tabs__tab.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  border-radius: 3px;
  background: var(--riffle-blue);
}

/* ---- layout ---- */
.event-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
.event-layout__side {
  display: grid;
  gap: 1.25rem;
}
@media (min-width: 992px) {
  .event-layout {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}

.event-section {
  padding: 1.4rem 1.5rem;
}
.event-section__title {
  margin: 0 0 0.6rem;
  font-size: 1.15rem;
}
.event-about {
  margin: 0;
  max-width: 68ch;
  color: var(--riffle-muted);
  line-height: 1.6;
}

/* ---- line-up ---- */
.lineup {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem 1rem;
  margin: 0.6rem 0 0;
  padding: 0;
  list-style: none;
}
.lineup__link {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: var(--riffle-ink);
  text-decoration: none;
}
.lineup__link:hover strong {
  text-decoration: underline;
}
.lineup__link > span:last-child {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}
.lineup__role {
  padding: 0.12rem 0.65rem;
  border-radius: 999px;
  background: #ece9ff;
  color: #6a4fd6;
  font-size: 0.78rem;
  font-weight: 600;
}
.lineup__role.is-headliner {
  background: #dfeaff;
  color: #2d5fd0;
}

/* ---- detail tiles ---- */
.tiles {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}
@media (min-width: 768px) {
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.tile {
  display: flex;
  gap: 0.85rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--riffle-border);
  border-radius: 12px;
  background: #fff;
}
.tile__icon,
.side-head__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  font-size: 1.15rem;
}
.tile__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tile__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--riffle-muted);
}
.tile__value {
  font-weight: 600;
  color: var(--riffle-ink);
  overflow-wrap: anywhere;
}
.tile__link {
  align-self: flex-start;
  font-size: 0.88rem;
  font-weight: 500;
}

.tone-rose {
  background: #ffe6ee;
  color: #ee3d70;
}
.tone-amber {
  background: #fff1d6;
  color: #f29a0d;
}
.tone-violet {
  background: #efe5ff;
  color: #7b3fe0;
}
.tone-blue {
  background: #e1ecff;
  color: #2f6fe5;
}
.tone-green {
  background: #d9f6ec;
  color: #11a37f;
}
.tone-orange {
  background: #ffeadb;
  color: #f2791d;
}

/* ---- sidebar cards ---- */
.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.more-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}
.more-list li + li {
  border-top: 1px solid var(--riffle-border);
}
.more-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.6rem 0;
  color: var(--riffle-ink);
  text-decoration: none;
}
.more-item:hover strong {
  text-decoration: underline;
}
.more-item > span:last-child {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.more-item small {
  color: var(--riffle-muted);
  font-size: 0.82rem;
}
.more-item__thumb {
  flex: none;
  width: 62px;
  height: 46px;
  border-radius: 8px;
  overflow: hidden;
}
.more-item__thumb :deep(.event-cover) {
  width: 100%;
  height: 100%;
}
.more-all {
  display: inline-block;
  margin-top: 0.7rem;
  font-weight: 600;
  font-size: 0.92rem;
}
</style>
