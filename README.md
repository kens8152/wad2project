# WAD2Project

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Compile and Minify for Production

```sh
pnpm build
```

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
