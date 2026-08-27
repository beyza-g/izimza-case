# İzİmza — Frontend Case Study

A rebuild of portal.izimza.com's existing UI, treated as a wireframe, for an
İzometri recruiting case study — modern UI/UX plus a senior-level frontend
architecture. Built on Vue 3 + TypeScript (strict); talks to a mock backend
over real HTTP (json-server), authenticates via Auth0 (Authorization Code +
PKCE), manages server state/caching with TanStack Query, and validates forms
with schema-based Vee-Validate + Zod.

## Setup

Requires Node 22+.

```sh
npm install
cp .env.example .env
```

The values in `.env.example` are public identifiers for an Auth0 PKCE SPA
(domain + client id) — no client secret involved, so they're safe to commit.

### Development

The app talks to a real mock backend over HTTP (`json-server`), not a fake
adapter — two processes need to run side by side:

```sh
npm run mock-server   # json-server, serving mock-data/db.json on :3001
npm run dev           # Vite dev server
```

### Other scripts

```sh
npm run build        # type-check + production build
npm run preview      # serve the production build locally
npm run lint         # oxlint + eslint (--fix)
npm run format       # prettier
npm run type-check   # vue-tsc --build
```

## Pages / Routes

| Route        | Page                                   | Content                                                                                                               |
| ------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/dashboard` | Anasayfa (Home)                        | Stat cards, upload zone, recently archived documents table                                                            |
| `/timestamp` | Zaman Damgala (Timestamp)              | File upload → OTP verification → timestamping result, driven by a single state machine (`idle→ready→otp→result→send`) |
| `/profile`   | Ayarlar · Profil & Güvenlik (Settings) | Profile form (Zod-validated), change-password modal, session management                                               |
| `/callback`  | —                                      | Auth0 PKCE redirect callback; never seen by the user, only used to complete login                                     |

Every route except `/callback` is marked `meta.requiresAuth: true` and
protected in `router.beforeEach` via `@auth0/auth0-vue`'s `authGuard`
(`src/router/index.ts`).

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Architecture decisions

### Problem → solution

| #   | Problem                                                                                                                                                                                                                                                         | Solution                                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Console logging left in production                                                                                                                                                                                                                              | Stripped from the production build                                                                                                                                                                                                                                     |
| 2   | Redundant network requests on every navigation                                                                                                                                                                                                                  | TanStack Query `staleTime`/cache instead of refetch-on-mount                                                                                                                                                                                                           |
| 3   | REST-incorrect endpoints (POST used where GET/resource semantics apply)                                                                                                                                                                                         | Resource-oriented `json-server` API design                                                                                                                                                                                                                             |
| 4   | Response-unwrapping logic duplicated ad hoc across call sites                                                                                                                                                                                                   | Centralized once in the axios interceptor (`unwrapResponse`)                                                                                                                                                                                                           |
| 5   | Hand-rolling login/session/token-refresh is out of scope for a UI/UX case and risks reinventing security-critical code                                                                                                                                          | `@auth0/auth0-vue` (Authorization Code + PKCE); `authGuard` + the axios request interceptor are the only two integration points the rest of the app touches                                                                                                            |
| 6   | Memory-only Auth0 token cache forced a fresh login on every navigation (third-party cookie restrictions break silent renewal)                                                                                                                                   | `cacheLocation: 'localstorage'` for this demo; noted as a prod tradeoff — memory-only + Custom Domain silent renewal would be preferred there                                                                                                                          |
| 7   | An in-memory mock adapter never actually exercised the interceptor's 4xx/5xx branches, real request timing, or the Network tab                                                                                                                                  | Replaced with a real `json-server` HTTP process (`mock-data/db.json` + a custom middleware for deterministic 422/500 routes); pinned to `json-server@^0.17.4` since 1.x dropped the `--watch`/`--middlewares` flags this relies on                                     |
| 8   | Credit balance lived in two places (a `wallet.ts` Pinia store and the account query response) — a dual-source-of-truth that goes stale after a mutation                                                                                                         | Removed `wallet.ts`; `useAccount()` (TanStack Query cache) is the single source for server-derived numbers, Pinia reserved for client-only state (auth, theme)                                                                                                         |
| 9   | Concurrent retry mutations (`retryAllErrors()`) could both read the same pre-decrement account-cache snapshot inside `onMutate` and clobber each other's optimistic credit deduction                                                                            | Rewritten from concurrent `.forEach` to sequential `for...of` + `await`; verified against a real multi-file retry over json-server                                                                                                                                     |
| 10  | Vite's file watcher picked up every real write `json-server` made to `db.json`, triggering an HMR reload that silently wiped in-progress `TimestampView` state (upload queue, current step)                                                                     | Moved `db.json`/`mockMiddleware.cjs` to a root-level `mock-data/` dir and added `server.watch.ignored: ['**/mock-data/**']` to `vite.config.ts`                                                                                                                        |
| 11  | Neither the upload loop nor the OTP `verify()` commit loop could be cancelled — navigating away left requests running in the background, and a stray `setTimeout` wasn't cleared on unmount                                                                     | `AbortController` threaded through both loops and into `useTimestampMutation`'s `mutationFn`; the axios interceptor treats `axios.isCancel(error)` as a silent reject, not a network-error toast                                                                       |
| 12  | A new file upload could silently mix into an in-flight OTP verification batch, producing an inconsistent queue/credit state                                                                                                                                     | New uploads blocked in the upload handlers themselves once "Zaman damgala" is clicked, until the round completes or is abandoned                                                                                                                                       |
| 13  | Organic random mock failures (`failRate`) made the timestamp demo flow non-deterministic; TanStack Query's own retry raced with axios's retry-toast, producing duplicate retry attempts; `Skeleton.vue` violated the `vue/multi-word-component-names` lint rule | `failRate` zeroed (errors now only via the explicit debug trigger); `retry: false` added to every query; renamed to `SkeletonBlock.vue`                                                                                                                                |
| 14  | `vee-validate` and `zod` were project dependencies but zero files actually imported them — Profile and the password-change modal used hand-rolled reactive validation instead                                                                                   | Wired real Zod schemas (`toTypedSchema` + `useForm`/`defineField`) into both forms; found and fixed during this project's own mandatory-requirements audit                                                                                                             |
| 15  | The stated stack (see project notes, and the design tokens' own shadcn-style naming) never actually went through a `shadcn-vue init` — hand-authored `src/components/ui/*.vue` diverged from the intended library                                               | Installed `shadcn-vue`, scoped to the dropdown-menu/alert-dialog components the archived-documents action menu needed                                                                                                                                                  |
| 16  | shadcn-vue's CLI (2.8.x) generates Tailwind v4-only syntax (`data-open:`, `w-(--css-var)`, `not-*`/`**:`, `outline-hidden`) and v4-only CSS imports (`@theme`/`@utility`) that silently produced zero working CSS under this project's Tailwind v3              | Every generated component's classes hand-ported to v3 bracket syntax; `tw-animate-css` swapped for the real v3 plugin `tailwindcss-animate`; verified via a production build's compiled `@keyframes enter`/`animate-in` CSS                                            |
| 17  | The CLI's icon-library flag installed a second, scoped `@lucide/vue` package alongside the project's existing `lucide-vue-next`                                                                                                                                 | Deleted the two generated files that needed it, uninstalled `@lucide/vue`, kept `lucide-vue-next` as the single icon source                                                                                                                                            |
| 18  | Generated `Button.vue`/`buttonVariants` had its own radius/padding scale, diverging visually from every hand-built button already in the app                                                                                                                    | Deleted the generated Button component; restyled `AlertDialogAction`/`AlertDialogCancel` with the app's existing button vocabulary                                                                                                                                     |
| 19  | A pre-existing `oxlint`/`eslint-plugin-oxlint` peer-dependency conflict made every `shadcn-vue add` (and any plain `npm install`) fail outright                                                                                                                 | Added `.npmrc` with `legacy-peer-deps=true`                                                                                                                                                                                                                            |
| 20  | A debug "Hata simüle et" trigger could plausibly leak into a production build and read as unfinished to an evaluator                                                                                                                                            | Gated by `import.meta.env.DEV`; verified absent via an actual `npm run build` + `npm run preview` DOM check                                                                                                                                                            |
| 21  | The floating user-card popover (`AppUserCard`/`AppUserPopover`) had click-outside/close-on-scroll but no Escape-to-close                                                                                                                                        | Added a document-level `keydown` listener closing the popover on `Escape`                                                                                                                                                                                              |
| 22  | The 6 OTP digit inputs had no `aria-label`, so screen readers announced nothing per digit                                                                                                                                                                       | Added `aria-label="{n}. hane"` per input                                                                                                                                                                                                                               |
| 23  | Toast notifications had no live region, so screen reader users weren't informed when one appeared                                                                                                                                                               | Added `role="status"` + `aria-live="polite"` to the toast container                                                                                                                                                                                                    |
| 24  | A leftover create-vue scaffold Pinia store (`stores/counter.ts`) sat unused in the codebase                                                                                                                                                                     | Deleted — confirmed zero imports anywhere                                                                                                                                                                                                                              |
| 25  | All UI copy was hardcoded Turkish, with no path to a second language                                                                                                                                                                                            | `vue-i18n` (Composition API mode) with `tr`/`en` message catalogs, `locale` persisted to `localStorage` mirroring `useTheme.ts`'s own pattern; status-badge/nav labels moved to key-based display mappings kept separate from the `documents.ts` anti-corruption layer |

The rest of this section covers the most consequential of these in more depth.

- **Internationalization (vue-i18n, localStorage-persisted, no URL prefixing)**:
  URL-based locale prefixing (`/en`, `/tr`) deliberately skipped — no SSR/SEO
  surface exists behind auth, localStorage persistence is sufficient.

- **Anti-patterns identified in the current portal.izimza.com, mapped to fixes**:
  audited the existing product before rebuilding it and treated four concrete
  anti-patterns as the spine of the architecture rather than as an afterthought —
  console logging left in production (stripped from the build), redundant
  network requests on every navigation (TanStack Query `staleTime`/cache instead
  of refetch-on-mount), REST-incorrect endpoints (POST used where GET/resource
  semantics apply) replaced by a properly resource-oriented json-server API, and
  inconsistent ad hoc response-unwrapping scattered across call sites,
  centralized into one axios interceptor (`unwrapResponse` in `http.ts`).

- **Auth0 SPA SDK (Authorization Code + PKCE) instead of a hand-rolled auth**:
  `@auth0/auth0-vue` was used instead of building custom login/session/token-
  refresh logic, since the case is evaluated on UI/UX and architecture quality,
  not on reimplementing password storage or session security from scratch. PKCE
  avoids ever exposing a client secret in the browser, and offloads MFA/session/
  refresh concerns to a battle-tested provider — the router guard (`authGuard`)
  and axios's request interceptor are the only two integration points the rest
  of the app needs to know about.

- **Auth0 `cacheLocation: 'localstorage'`**: chosen for this demo/case
  environment because third-party cookie restrictions make silent session
  renewal unreliable in memory-only mode — every navigation was forcing a
  fresh login. In production, memory-only caching plus silent iframe renewal
  via an Auth0 Custom Domain would be preferred instead.

- **Mock backend evolution: hand-rolled axios adapter → a real `json-server`
  process**: the first mock layer intercepted requests in-memory and faked
  responses, which meant the interceptor's 4xx/5xx branches, the Network tab,
  and real request/response timing were never actually exercised — undermining
  the point of demonstrating the data-layer architecture at all. Switched to a
  genuine `json-server` HTTP process (`mock-data/db.json` + a small custom
  middleware for deterministic `422`/`500` routes) so every request in the app
  is real HTTP; `json-server` is pinned to `^0.17.4` specifically because `1.x`
  dropped the `--watch`/`--middlewares` CLI flags this setup relies on.

- **Removed the separate `wallet.ts` Pinia store — `useAccount()` is now the
  single source of truth for credit balance**: credits used to live in both a
  client-side Pinia store and the account query response, which is exactly the
  dual-source-of-truth shape that goes stale after a mutation. Server-derived
  numbers like remaining credits now live exclusively in the TanStack Query
  cache; Pinia is reserved for genuinely client-only state (auth, theme).

- **`retryAllErrors()` rewritten from concurrent `.forEach` to sequential
  `for...of` + `await`**: the original implementation fired all failed files'
  retry mutations concurrently, so two in-flight retries could both read the
  same pre-decrement account-cache snapshot inside `onMutate` and clobber each
  other's optimistic credit deduction. Verified against a real multi-file retry
  scenario over json-server, confirming a non-overlapping network timeline.

- **Moved `db.json`/`mockMiddleware.cjs` out of `src/` and excluded them from
  Vite's watcher**: every real write `json-server` made to `db.json` was being
  picked up by Vite's file watcher, triggering an HMR reload of
  `TimestampView.vue` that silently wiped in-progress local state (upload
  queue, current panel step) mid-flow. Moving the files to a root-level
  `mock-data/` directory alone wasn't enough — Vite watches the whole project
  root, not just `src/` — so `server.watch.ignored: ['**/mock-data/**']` had to
  be added to `vite.config.ts` as well.

- **AbortController wiring for the upload and OTP-verification loops**: neither
  the file-upload loop nor `verify()`'s sequential commit loop in
  `TimestampView.vue` could be cancelled — navigating away mid-flow left
  requests running to completion in the background with no way to stop them,
  and a stray `setTimeout` in `finishAndReset` wasn't cleared on unmount
  either. Threaded an `AbortController` through both loops and into
  `useTimestampMutation`'s `mutationFn`, and taught the axios response
  interceptor to treat `axios.isCancel(error)` as a silent reject instead of a
  network-error toast, since a deliberate cancellation isn't a failure.

- **New uploads locked during active OTP verification**: once "Zaman damgala"
  is clicked, new file uploads are blocked until the round either completes
  (`result`) or is abandoned (`Vazgeç`) — enforced in the upload handlers
  themselves, not just visually, since a new file silently mixing into an
  in-flight verification batch would produce an inconsistent queue/credit
  state.

- **Small fixes made along the way, not explicitly requested**: zeroed the mock
  API's random `failRate` (organic, non-deterministic failures on the
  timestamp button made the demo flow unreliable — errors are now only
  reproducible via the explicit debug trigger); added `retry: false` to every
  TanStack Query so it wouldn't silently retry underneath axios's own
  retry-toast, which was producing duplicate retry attempts; and renamed
  `Skeleton.vue` → `SkeletonBlock.vue` to satisfy the
  `vue/multi-word-component-names` lint rule.

- **Accessibility — audited and partially remediated, not a full WCAG pass**:
  focus-on-open plus Escape-to-close already existed on `ChangePasswordModal`;
  `AlertDialog`/`DropdownMenu` get Escape, focus-trapping, and outside-click
  for free from reka-ui's built-in `DismissableLayer`/`FocusScope`
  primitives; the OTP bottom sheet already had `role="dialog"`,
  `aria-modal="true"`, and Escape-to-close. A consistency audit of this
  project found and fixed three remaining gaps: the sidebar's user-card
  popover (`AppUserCard`/`AppUserPopover`) had click-outside and
  close-on-scroll but no Escape handling (added a document-level `keydown`
  listener); the six OTP digit inputs had no `aria-label` for screen readers
  (added `aria-label="{n}. hane"` per input); and toast notifications had no
  live region (added `role="status"` + `aria-live="polite"`). What's still
  genuinely missing: neither hand-rolled overlay (`ChangePasswordModal`, the
  user popover) has a dedicated focus-trap library, so `Tab` can still cycle
  out to the page behind them — this is a known, scoped gap, not a full WCAG
  audit.

- **Explicitly deferred / out of scope**: toast-stacking when several retries
  fail back-to-back (cosmetic noise, flagged but not fixed); the
  `İmzala`/`Arşiv`/`Doküman Yönetimi` nav destinations and three unimplemented
  Profile sub-tabs (visual stubs only — not covered by the source design
  file); and the full Vitest suite — this is a deliberate scope call, not an
  oversight: the case brief lists automated tests as optional, and the time
  budget instead went to the mandatory requirements (Auth0, real HTTP,
  Zod-schema validation) and to this project's own consistency audit.

- **shadcn-vue installed later, for the row-actions menu, not from day one**: CLAUDE.md
  named "Tailwind + Shadcn Vue" as the intended stack and `src/assets/main.css`'s
  design tokens were already authored in shadcn's own semantic naming convention
  (`background`/`card`/`primary`/`border`/`ring`, etc.), but the original
  implementation plan for this project never included a `shadcn-vue init` step —
  it went straight to hand-authoring `src/components/ui/*.vue` files styled
  directly off the Claude Design canvas's literal values. That reads as a gap
  between the stated stack and what was actually planned, not a documented
  decision to avoid the library. `shadcn-vue` was installed now, scoped to the
  dropdown-menu/alert-dialog components the archived-documents action menu
  needed, rather than retrofitted across already-working hand-built components.

- **shadcn-vue's newest CLI (2.8.x) targets Tailwind v4; this project is pinned
  to v3**: the generated `dropdown-menu`/`alert-dialog` components shipped with
  Tailwind v4-only class syntax (bare `data-open:` variants, `w-(--css-var)`
  parenthesis arbitrary values, `not-*`/`**:` combinators, `outline-hidden`) that
  Tailwind v3's compiler can't parse — and the CLI's own `@import
"shadcn-vue/tailwind.css"` plus its default `tw-animate-css` dependency are
  both v4-only (`@theme`/`@utility` at-rules), which silently produced zero
  working CSS under v3 (confirmed via a build with `tw-animate-css`: lightningcss
  logged "Unknown at rule: @utility" and the `animate-in`/`fade-in-0` classes
  never compiled). Every generated component's classes were hand-ported to v3
  bracket syntax, and the animation dependency was swapped for
  `tailwindcss-animate` — the actual Tailwind v3 plugin `tw-animate-css` was
  built to replace — verified by grepping the production build's CSS for a real
  `@keyframes enter` rule and a compiled `animate-in[data-state=open]` selector.

- **`@lucide/vue` was pulled in by the CLI, then removed**: the icon-library flag
  passed to `shadcn-vue init` made it install the newer scoped `@lucide/vue`
  package for the generated components' internal icons, which would have meant
  two parallel Lucide packages in the project. Deleted the two unused generated
  files that needed it (`DropdownMenuCheckboxItem`, `DropdownMenuSubTrigger`) and
  uninstalled the package instead, keeping `lucide-vue-next` as the single icon
  source everywhere, including inside the new menu.

- **Generated `Button.vue`/`buttonVariants` dropped in favor of this app's own
  button classes**: `AlertDialogAction`/`AlertDialogCancel` shipped wired to a
  generic shadcn Button component with its own default radius/padding scale,
  which would have visually diverged from every hand-built button already in the
  app (`rounded-[10px]`/`rounded-[11px]`, `bg-accent`/`bg-destructive`). Deleted
  the generated Button component and restyled Action/Cancel directly with the
  app's existing button vocabulary instead.

- **Added a `.npmrc` with `legacy-peer-deps=true`**: the project's pre-existing
  `oxlint`/`eslint-plugin-oxlint` peer-dependency conflict made every
  `shadcn-vue add` invocation fail outright, since the CLI shells out to a plain
  `npm install` with no flag to pass `--legacy-peer-deps` through. This also
  quietly fixes the same friction for any future plain `npm install` in this
  project, not just shadcn-vue's.

## Design notes

- **"NES doğrulandı" badge** (Profile page): this trust signal does not exist in the
  real/current app. It was added deliberately during the design pass as a
  differentiator specific to the Turkish e-signature market (Nitelikli Elektronik
  Sertifika), not an incidental label. Keep it, but treat any change to its wording
  or placement as a product decision, not a copy fix.

## Competitive positioning

Three e-signature/document-collaboration products were used as informal
reference points while making UI/UX calls, not as a formal study:

- **DocuSign** — enterprise-grade, dense information architecture, strong
  audit-trail/compliance framing, but a single-document signing flow that's
  multi-step and intimidating for a first-time user. The timestamping flow
  here is deliberately flatter: one state machine in a single panel
  (`idle→ready→otp→result→send`) rather than a multi-page wizard.
- **PandaDoc** — a more modern, colorful UI with strong document templating,
  but a dashboard that's often cluttered with upsell/notification CTAs. The
  dashboard here shows only real state (stats + recent activity), with no
  promotional surface competing for attention.
- **Yousign** — closer to the European/KVKK-adjacent compliance market, a
  simpler UI, but table-heavy screens that force horizontal scrolling on
  mobile. The documents table here collapses columns responsively instead
  (the date column hides below `md`, the remaining columns narrow) rather
  than scrolling sideways.

These three roughly frame the axes this rebuild aimed at: "enterprise trust"
(DocuSign), "modern/approachable tone" (PandaDoc), and "simplicity/compliance"
(Yousign) — the "NES doğrulandı" badge above is one concrete outcome of that
positioning.

// Dosya seçimi bilinçli olarak inline/yalın
bırakıldı; sadece kontör tüketen ve geri alınamaz commit adımı (OTP →
sonuç) odaklanmış bir modal'a taşındı — bu, DocuSign'ın çok adımlı akışını
taklit etmiyor, sadece geri dönüşü olmayan anı kasıtlı olarak izole
ediyor.
