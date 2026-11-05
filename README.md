<div align="center">

# 🎵 Riffle

**Your personalised local artist discovery app**

Discover Singapore's local artists, hear their music, find their gigs and meet the people who love them, all in one place.

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Bootstrap 5](https://img.shields.io/badge/Bootstrap-5.3-7952b3?logo=bootstrap&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-database%20%26%20auth-3ecf8e?logo=supabase&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-state-ffd859?logo=pinia&logoColor=black)

</div>

---

## About Riffle

### The problem

Information about Singapore's local artists, music and events is **scattered across many platforms**. Fans jump between streaming apps, social media, ticketing sites and group chats just to learn who is playing, what they sound like and when their next show is. Local and emerging musicians, in turn, struggle to be seen next to big international acts.

### Our solution

**Riffle** brings local music discovery together in one app. Listeners can explore artists through an interactive web of genres, swipe through personalised artist recommendations with 30-second song previews, browse upcoming gigs on a map, and talk about it all in a community forum. Every artist gets a profile, upcoming events and a place in front of new listeners.

### Our objectives

1. **Simplify music discovery**: one place to find local artists, songs and gigs.
2. **Personalise recommendations**: suggestions shaped by each user's genres, likes and follows.
3. **Centralise and improve music event discovery**: every upcoming gig on one map and list, with filters.
4. **Increase artist visibility**: give local and emerging artists profiles, previews and an audience.
5. **Encourage community engagement**: a forum, messaging and gig-buddy finding for fans.

### Who it is for

| | Local music listeners | Local and emerging artists |
|---|---|---|
| **Who** | Young Singaporeans interested in local music | Musicians who want to showcase their work and reach more listeners |
| **Need** | An easier way to discover artists, songs and upcoming events that match their interests | Greater visibility for their music, profiles and performances |

Riffle works on **smartphones, laptops and desktops**, with a responsive layout that adapts to every screen size, plus a built-in **light and dark mode**.

---

## Features

### 🕸️ Discover
- An interactive **web of artists**: drag, zoom and click through dots grouped by genre.
- Search, genre and mood filters, and **"Recommended for you"** suggestions for signed-in users.
- A guided tour for first-time visitors.

### 🎟️ Events
- Every upcoming gig on an interactive **map** (Leaflet) or as a **list**.
- Filter by genre, date, distance from your live location and venue, and sort the results.
- Event pages with the line-up, a mini map, who's going and a discussion thread.

### 🎤 Artists
- Browse all local artists with search, genre and venue filters and sorting.
- Artist profiles with their genres, upcoming events and **Follow** / **Save** buttons.
- **"I'm feeling lucky"** jumps straight into matchmaking.

### 💘 Artist matchmaking
- A daily batch of artist cards to **Like** or **Skip**, swipe style.
- Each card plays **30-second song previews** (Apple Music previews in a custom player).
- **Save** artists to a bookmark list for later.
- **Match history**: review every swipe, change Like ↔ Skip, or undo.
- A fresh batch of unseen artists every day.

### 💬 Forum
- Post, comment, upvote and save posts, with tags and **trending** topics.
- **Looking for group (LFG)** posts to find gig buddies.
- Link artists, events and songs into posts.

### 👤 Profile and social
- Sign up / log in, with **onboarding** that imports your music taste (optional Spotify connect).
- Profile tabs for followed artists, liked artists, saved artists and match history.
- Direct **messages** and **notifications**.

---

## Tech stack

| Area | Tools |
|---|---|
| Front end | [Vue 3](https://vuejs.org/) (`<script setup>`), [Vue Router](https://router.vuejs.org/), [Pinia](https://pinia.vuejs.org/) |
| Styling | [Bootstrap 5.3](https://getbootstrap.com/), [Bootstrap Icons](https://icons.getbootstrap.com/), Plus Jakarta Sans |
| Build tool | [Vite](https://vite.dev/) |
| Database and auth | [Supabase](https://supabase.com/) (Postgres, Auth, Row Level Security) |
| Maps | [Leaflet](https://leafletjs.com/) with OneMap (Singapore Land Authority) tiles |
| Music data | Apple iTunes Search API (song previews), Spotify Web API (onboarding), Last.fm (genres) |
| Testing | [Vitest](https://vitest.dev/), [Vue Test Utils](https://test-utils.vuejs.org/), [Playwright](https://playwright.dev/) |

---

## Getting started

### Prerequisites

- **Node.js** `22.18+` or `24.12+`
- **pnpm** (`npm install -g pnpm`)

### 1. Clone and install

```sh
git clone <repository-url>
cd wad2project
pnpm install
```

### 2. Set up environment variables

Copy `.env-example` to a new file named `.env` in the project root:

```sh
cp .env-example .env        # Windows Command Prompt: copy .env-example .env
```

That's all. `.env-example` already contains the Riffle Supabase project's URL and **publishable** key, so the app connects to our database with all its artists, events and forum posts. No Supabase account or setup is needed.

> The publishable key is designed to be public: it can only do what the database's Row Level Security rules allow. The secret key is never in this repository.

### 3. Run the app

```sh
pnpm dev        # start the dev server at http://127.0.0.1:5173
pnpm build      # build for production into dist/
pnpm preview    # preview the production build locally
```

---

## Project structure

```text
wad2project/
├── e2e/                    # Playwright end-to-end tests
├── public/                 # Static files served as-is
├── src/
│   ├── assets/styles/      # Global styles (main.css, forum.css)
│   ├── components/         # Reusable components, grouped by feature
│   │   ├── artists/  discover/  events/  forum/  layout/  matchmaking/
│   ├── composables/        # Shared logic (useTheme, useSavedArtists, event filters, ...)
│   ├── data/               # Local data files (events, artist profiles, Discover)
│   ├── router/             # Routes and route guards
│   ├── services/           # Supabase, matchmaking, Spotify, Apple preview and Last.fm calls
│   ├── stores/             # Pinia stores (user, events, messages, notifications)
│   ├── test/               # Shared test setup and fixtures
│   ├── utils/              # Small helper functions
│   ├── views/              # One component per page
│   ├── App.vue
│   └── main.js
├── supabase/
│   ├── schema.sql          # Database tables, access rules, vote trigger and storage bucket (for reference)
│   └── seed.sql            # Starter data: genres, venues, artists, events, forum posts (for reference)
├── .env-example            # Copy to .env: points to the Riffle Supabase project
├── playwright.config.js
└── vite.config.js
```

---

## Testing

Riffle has three layers of automated tests. For a feature-by-feature list of every test file (what it checks and the order to read it in), see [TESTS_GUIDE.md](TESTS_GUIDE.md).

| Layer | Tool | What it checks | Where |
|---|---|---|---|
| Unit | Vitest | Single functions and composables in isolation (dates, distances, artist sorting and filters, artist profiles, following and saving artists, the matchmaking API, the Discover web of artists, dot pictures and guided-tour checks, trending tags, event filters, voting) | `src/**/__tests__/*.spec.js` |
| Component | Vitest + Vue Test Utils | One Vue component on its own: props, user clicks/typing, emitted events, conditional rendering (vote/save buttons, search box, sort menus, artist card, artist filter sidebar, song preview player, the Discover web of dots, login page) | `src/**/__tests__/*.spec.js` |
| Integration | Vitest + Vue Test Utils | Several real pieces working together: Forum home (search + sort + post list), vote buttons + `useVote`, Artists page (sidebar + sort + cards), Matchmaking (swiping, saving, finishing a batch), Match history, Saved artists, Discover (search, genre filters, recommendations, following, the guide), Profile (tabs, unfollowing, liked artists, resetting the taste profile) | `src/**/__tests__/*.integration.spec.js` |
| End-to-end | Playwright | Complete user journeys in a real browser: browsing and searching events, finding and opening artists, matchmaking as a logged-in user (like, skip, save, finish, history), exploring Discover as a guest and as a member, using the Profile page, finding and opening forum posts, navigating the app, dark mode, logging in | `e2e/*.spec.js` |

### One-time setup

```sh
pnpm install
pnpm exec playwright install chromium
```

You also need a `.env` file in the project root (copy `.env-example`) so the dev server can start for the E2E tests.

### Unit, component and integration tests (Vitest)

```sh
pnpm test:unit          # run every Vitest test once
pnpm test               # watch mode: re-runs tests when you save a file (press q to quit)
pnpm test:coverage      # run once and print a coverage report (HTML report in coverage/index.html)
pnpm vitest run src/views/__tests__/LoginView.spec.js   # run a single file
```

### End-to-end tests (Playwright)

```sh
pnpm test:e2e           # starts the dev server if it is not running, then runs every E2E test
pnpm test:e2e:report    # open the HTML report of the last run
pnpm exec playwright test --ui   # step through the tests in Playwright's UI
```

### How the tests are kept repeatable and stable

- **No real database writes.** Unit and component tests replace Supabase with a mock (`vi.mock`). E2E tests intercept every Supabase request with `page.route()` and answer with fixture data from `e2e/support/mockSupabase.js`, so they give the same result every run, need no account, and never change real data. Events and Artists use the app's built-in data files.
- **Logged-in journeys without a real account.** The matchmaking, Discover and Profile E2E tests use `e2e/support/session.js` to place a fake signed-in session in the browser, and `e2e/support/matchmakingBackend.js` to act as an in-memory database (and Apple Music) that remembers swipes and saves for the length of one test.
- **Stable selectors.** Tests find elements the way a user does: by role and accessible name (`getByRole('button', { name: 'Upvote' })`, `getByLabel('Email address')`, `aria-label`), not by CSS classes or HTML structure.
- **Behaviour, not implementation.** Tests check what the user sees or what a component emits, not internal function calls, so refactoring does not break them.
- **No fixed waits.** Playwright's automatic waiting and Vitest's fake timers (for the debounced event search) replace `sleep` calls.
- **Isolated tests.** Each test mounts a fresh component or loads a fresh page; shared filter state is reset in `beforeEach`.

---

## Team

Built for **IS216 Web Application Development II**.

| Member | Main areas |
|---|---|
| Yan Tat | Artist matchmaking, saved artists, match history |
| Kenson | Login, sign up, onboarding, profile |
| Powell Li | Artists pages and artist profiles |
| Aryan Kashikar | Events (map, list, details) and Discover |
| Justin Ong | Forum, navbar, dark mode |

## Acknowledgements

- Song previews from the Apple iTunes Search API.
- Map tiles from OneMap by the Singapore Land Authority.
- Genre data from Last.fm; music taste import via the Spotify Web API.
