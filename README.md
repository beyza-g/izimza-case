# İzİmza — Frontend Case Study

> For the detailed catalog of UX/architecture decisions,
> see [UX_DECISIONS.md](./UX_DECISIONS.md).

## Overview

A rebuild of portal.izimza.com's existing UI, treated as a wireframe, for an
İzometri recruiting case study — modern UI/UX plus a frontend
architecture. Built on Vue 3 + TypeScript (strict); talks to a mock backend
over real HTTP (json-server), authenticates via Auth0 (Authorization Code +
PKCE), manages server state/caching with TanStack Query, and validates forms
with schema-based Vee-Validate + Zod.

## Getting Started

> **Test account — Email:** demo@izimza-case.com
> **Password:** Demo-izimza12@!

> **Timestamping OTP code:** the mock environment never sends a real SMS.
> On the OTP screen, the fixed code for a successful verification is
> **444444**. Any other code triggers the error path, useful for testing
> OTP failure handling.

## Setup

Requires Node `^22.18.0` or `>=24.12.0` (see `engines` in `package.json`) —
alpha/nightly Node builds are not supported and can break the test suite in
surprising ways (e.g. Node's own experimental `localStorage` global shadowing
the jsdom one the app relies on).

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
| ------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/dashboard` | Anasayfa (Home)                        | Stat cards, upload zone, recently archived documents table                                                            |
| `/timestamp` | Zaman Damgala (Timestamp)              | File upload → OTP verification → timestamping result, driven by a single state machine (`idle→ready→otp→result→send`) |
| `/profile`   | Ayarlar · Profil & Güvenlik (Settings) | Profile form (Zod-validated), change-password modal, session management                                               |
| `/callback`  | —                                       | Auth0 PKCE redirect callback; never seen by the user, only used to complete login                                     |

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

Each table below is the "what" for one concern — one line per decision, file
names as the pointer into the code. The prose underneath a table adds only
what the table can't: the reasoning, a tradeoff, or verification evidence.
For the full "why" behind every decision (grouped by user-facing concern
instead of by build chronology), see
[UX_DECISIONS.md](./UX_DECISIONS.md) — this section deliberately doesn't
re-explain decisions that already have a dedicated row there.

### Data layer & mock backend

| # | Problem | Solution |
| --- | --- | --- |
| 1 | Redundant network requests on every navigation | TanStack Query `staleTime`/cache instead of refetch-on-mount |
| 2 | REST-incorrect endpoints (POST used where GET/resource semantics apply) | Resource-oriented `json-server` API design |
| 3 | Response-unwrapping logic duplicated ad hoc across call sites | Centralized once in the axios interceptor (`unwrapResponse`) |
| 4 | An in-memory mock adapter never exercised real HTTP timing or the interceptor's 4xx/5xx branches | Real `json-server` HTTP process, pinned to `^0.17.4` for its `--watch`/`--middlewares` flags |
| 5 | Credit balance lived in two places (`wallet.ts` Pinia store + the account query) — dual source of truth | Removed `wallet.ts`; `useAccount()` (TanStack Query cache) is the single source |
| 6 | Concurrent retry mutations (`retryAllErrors()`) could clobber each other's optimistic credit deduction | Rewritten from concurrent `.forEach` to sequential `for...of` + `await` |
| 7 | Vite's watcher picked up every write `json-server` made to `db.json`, wiping in-progress Timestamp state via HMR | Moved mock files to root-level `mock-data/`, added `server.watch.ignored` in `vite.config.ts` |
| 8 | Random mock failures (`failRate`) made the demo non-deterministic; TanStack retry raced axios's retry-toast | `failRate` zeroed; `retry: false` added to every query |
| 9 | The real app splits its API across inconsistent per-feature subdomains | One base URL, flat and consistently-cased resource naming |

See UX_DECISIONS.md → Architecture for the full reasoning behind #1, #3, #5
(staleTime/retry strategy, the axios interceptor layer, and the
single-source-of-truth call), which aren't re-explained here.

- **Mock backend evolution: hand-rolled axios adapter → a real `json-server`
  process**: the first mock layer faked responses in-memory, so the
  interceptor's error branches and real request timing were never actually
  exercised. `json-server` is pinned to `^0.17.4` specifically because `1.x`
  dropped the `--watch`/`--middlewares` flags this setup relies on.

- **`retryAllErrors()` rewritten to sequential `for...of` + `await`**: firing
  all failed files' retries concurrently let two in-flight retries both read
  the same pre-decrement account-cache snapshot inside `onMutate`, clobbering
  each other's optimistic credit deduction. Verified against a real
  multi-file retry over json-server, confirming a non-overlapping network
  timeline.

- **`db.json`/`mockMiddleware.cjs` moved out of `src/` and excluded from
  Vite's watcher**: moving the files to `mock-data/` alone wasn't enough —
  Vite watches the whole project root, not just `src/` — so
  `server.watch.ignored: ['**/mock-data/**']` had to be added too.

### Auth

| # | Problem | Solution |
| --- | --- | --- |
| 10 | Hand-rolling login/session/token-refresh is out of scope for a UI/UX case and risks reinventing security-critical code | `@auth0/auth0-vue` (Authorization Code + PKCE) |
| 11 | Memory-only Auth0 token cache forced a fresh login on every navigation (third-party cookie restrictions break silent renewal) | `cacheLocation: 'localstorage'` for this demo; noted as a prod tradeoff |

- **Auth0 SPA SDK instead of a hand-rolled auth**: the case is evaluated on
  UI/UX and architecture quality, not on reimplementing password storage or
  session security from scratch. PKCE avoids ever exposing a client secret in
  the browser; `authGuard` (router) and the axios request interceptor are the
  only two integration points the rest of the app needs to know about.

- **`cacheLocation: 'localstorage'`**: chosen because third-party cookie
  restrictions make silent session renewal unreliable in memory-only mode —
  every navigation was forcing a fresh login. In production, memory-only
  caching plus silent iframe renewal via an Auth0 Custom Domain would be
  preferred instead.

### Forms & validation

| # | Problem | Solution |
| --- | --- | --- |
| 12 | `vee-validate`/`zod` were dependencies but unused — Profile and the password modal used hand-rolled reactive validation | Wired real Zod schemas (`toTypedSchema` + `useForm`/`defineField`) into both forms |

Found and fixed during this project's own mandatory-requirements audit.

### Timestamp flow

| # | Problem | Solution |
| --- | --- | --- |
| 13 | Neither the upload loop nor the OTP `verify()` commit loop could be cancelled; a stray `setTimeout` wasn't cleared on unmount either | `AbortController` threaded through both loops into `useTimestampMutation`'s `mutationFn` |
| 14 | A new file upload could silently mix into an in-flight OTP verification batch, producing an inconsistent queue/credit state | New uploads blocked in the upload handlers themselves until the round completes or is abandoned |

See UX_DECISIONS.md → Architecture for #13's full reasoning and its scope —
it only covers this one flow, not every request in the app.

- **New uploads locked during active OTP verification**: enforced in the
  upload handlers themselves, not just visually, since a new file silently
  mixing into an in-flight verification batch would produce an inconsistent
  queue/credit state.

### Document preview & certificates

| # | Problem | Solution |
| --- | --- | --- |
| 15 | Dashboard's "Sign now" card promised drag-and-drop with no processing pipeline of its own (Sign isn't implemented) | Dropped/selected files routed into the working Timestamp queue instead (`useDropzone.ts`) |
| 16 | No way to check a queued file is the right one before spending a credit on it | `FilePreviewSheet.vue` renders the file's own `File` object natively for PDF/PNG |
| 17 | A literal preview for Dashboard/Archive's historical documents would show fake content — no real bytes are stored for them | `DocumentCertificatePanel.vue` — a genuine-metadata certificate plus a downloadable text receipt |

- **Dashboard's "Sign now" card hands off to Timestamp, not a Sign flow**:
  rather than a dead-end drop, the file is handed off (`usePendingUpload.ts`)
  to the one flow that's actually implemented, with a toast shown first
  ("Document added to the Timestamp queue") so the redirect reads as an
  explained outcome, not a silent jump away from the page the user was just
  on.

- **Timestamp's queue gets a real preview; Dashboard/Archive get a
  certificate, not a fake preview**: the queue's `File` objects are real and
  still in the browser's memory, so `FilePreviewSheet.vue` can render actual
  content. Dashboard/Archive's historical documents have no backing file left
  to render (`mock-data/db.json` is metadata-only), so
  `DocumentCertificatePanel.vue` shows genuine metadata instead of faking a
  preview — with an always-visible in-UI notice that this isn't the original
  file, so a viewer understands the limitation without going looking for it.

### Accessibility

| # | Problem | Solution |
| --- | --- | --- |
| 18 | The sidebar's user-card popover had click-outside/close-on-scroll but no Escape-to-close | Added a document-level `keydown` listener closing it on `Escape` |
| 19 | The 6 OTP digit inputs had no `aria-label`, so screen readers announced nothing per digit | Added `aria-label="{n}. hane"` per input |
| 20 | Toast notifications had no live region, so screen reader users weren't informed when one appeared | Added `role="status"` + `aria-live="polite"` to the toast container |

Audited and partially remediated, not a full WCAG pass — full reasoning per
row is in UX_DECISIONS.md → Accessibility. **Known, scoped gap**: neither
hand-rolled overlay (`ChangePasswordModal`, the user popover) uses a
dedicated focus-trap library, so `Tab` can still cycle out to the page behind
them.

### Internationalization

| # | Problem | Solution |
| --- | --- | --- |
| 21 | All UI copy was hardcoded Turkish, with no path to a second language | `vue-i18n` (Composition API mode) with `tr`/`en` message catalogs, locale persisted to `localStorage` |

URL-based locale prefixing (`/en`, `/tr`) was deliberately skipped — no
SSR/SEO surface exists behind auth, so localStorage persistence (mirroring
`useTheme.ts`'s own pattern) is sufficient.

### shadcn-vue migration

| # | Problem | Solution |
| --- | --- | --- |
| 22 | The stated stack was never actually run through `shadcn-vue init` — hand-authored `src/components/ui/*.vue` diverged from the intended library | Installed `shadcn-vue`, scoped to the dropdown-menu/alert-dialog components the archived-documents menu needed |
| 23 | shadcn-vue's CLI (2.8.x) generates Tailwind v4-only syntax, silently producing zero working CSS under this project's v3 | Every generated component hand-ported to v3 syntax; `tw-animate-css` swapped for the real v3 plugin `tailwindcss-animate` |
| 24 | The CLI's icon-library flag installed a second, scoped `@lucide/vue` package alongside the existing `lucide-vue-next` | Deleted the two generated files that needed it, uninstalled `@lucide/vue` |
| 25 | Generated `Button.vue`/`buttonVariants` had its own radius/padding scale, diverging from every hand-built button in the app | Deleted the generated Button; restyled `AlertDialogAction`/`AlertDialogCancel` with the app's own button vocabulary |
| 26 | A pre-existing `oxlint`/`eslint-plugin-oxlint` peer-dependency conflict made every `shadcn-vue add` (and plain `npm install`) fail outright | Added `.npmrc` with `legacy-peer-deps=true` |

- **Installed later, for the row-actions menu, not from day one**: the
  design tokens were already authored in shadcn's own semantic naming
  convention, but the original implementation plan never included a
  `shadcn-vue init` step — a gap between the stated stack and what was
  actually built, not a documented decision to avoid the library.

- **CLI targets Tailwind v4; this project is pinned to v3**: the generated
  components shipped v4-only class syntax (bare `data-open:` variants,
  `w-(--css-var)` arbitrary values, `not-*`/`**:` combinators,
  `outline-hidden`) that v3's compiler can't parse, and the CLI's own
  `tw-animate-css` dependency uses v4-only `@theme`/`@utility` at-rules —
  confirmed via a build where lightningcss logged "Unknown at rule:
  @utility" and `animate-in`/`fade-in-0` never compiled. Fixed by
  hand-porting every class and swapping in `tailwindcss-animate`, verified by
  grepping the production build's CSS for a real `@keyframes enter` rule.

- **`@lucide/vue` pulled in by the CLI, then removed**: kept
  `lucide-vue-next` as the single icon source everywhere, including inside
  the new menu, to avoid two parallel Lucide packages.

- **`.npmrc` with `legacy-peer-deps=true`**: the CLI shells out to a plain
  `npm install` with no flag to pass `--legacy-peer-deps` through; this also
  quietly fixes the same friction for any future plain `npm install` in this
  project.

### Feedback & loading

| # | Problem | Solution |
| --- | --- | --- |
| 27 | Content pops in abruptly after loading, shifting the layout underneath it | `SkeletonBlock.vue` — a shimmer-animated placeholder sized to its eventual content |
| 28 | `Skeleton.vue` violated the `vue/multi-word-component-names` lint rule | Renamed to `SkeletonBlock.vue` |

### Housekeeping

| # | Problem | Solution |
| --- | --- | --- |
| 29 | Console logging left in production | Stripped from the production build |
| 30 | A debug "Hata simüle et" trigger could plausibly leak into a production build | Gated by `import.meta.env.DEV`; verified absent via an actual `npm run build` + `npm run preview` DOM check |
| 31 | A leftover create-vue scaffold Pinia store (`stores/counter.ts`) sat unused | Deleted — confirmed zero imports anywhere |

### Code quality & duplication cleanup

| # | Problem | Solution |
| --- | --- | --- |
| 32 | `formatBytes`/`inferDocType` (`TimestampView.vue`), the archive-usage % calc (`DashboardView.vue`), and orphaned-error cleanup (`TimestampView.vue`) were pure logic buried inline in view components | Extracted to `src/lib/`: `file.ts`, `archiveStats.ts`, `orphanedDocuments.ts` |
| 33 | The password-rule regexes were duplicated verbatim between the Zod schema and the live checklist in `ChangePasswordModal.vue` | Both now import the same regexes/`getPasswordRules()` from `src/lib/passwordRules.ts` |
| 34 | Countdown-timer, OTP-digit-input, and recipient-selection logic were hand-rolled inline in `TimestampView.vue`/`CommitModalContent.vue`, and the phone-input caret-preservation logic inline in `ProfileView.vue` | Extracted to composables: `useCountdown`, `useOtpDigitInput`, `useRecipientSelection`, `usePhoneInputMask` |
| 35 | Dashboard's `downloadDocument()` and Timestamp's `downloadResults()` built near-identical receipt text independently | Shared `buildArchiveReceipt()`/`buildTimestampReceipt()` in `src/lib/receipt.ts` |
| 36 | Dashboard's delete confirmation, Timestamp's clear-queue confirmation, and Timestamp's leave-page confirmation each hand-rolled the same `AlertDialog` markup | `ConfirmDialog.vue` — a shared wrapper over the AlertDialog primitives, used by all three |

- **Extraction, not a rewrite**: every item above was verified to leave component
  behavior and render output unchanged — checked against `type-check`/`lint`/`build`
  plus a manual pass through each affected flow (receipt download, OTP
  countdown/expiry, the password checklist, recipient search, all three
  confirmation dialogs) before and after. Each confirmation site's own
  logic (Dashboard's race-safe delete guard, the leave-confirmation's
  Promise-based flow) was left untouched — only the markup moved into
  `ConfirmDialog.vue`. See UX_DECISIONS.md → Architecture for the full
  reasoning, and for why the *flow orchestration itself*
  (`idle→ready→otp→result→send`) was deliberately left unsplit while these
  narrower pieces were extracted.

### Explicitly deferred / out of scope

- Toast-stacking when several retries fail back-to-back (cosmetic noise,
  flagged but not fixed).
- The `Sign`/`Archive`/`Document Management` nav destinations and three
  unimplemented Profile sub-tabs — visual stubs only, not covered by the
  source design file.
- The full Vitest suite — a deliberate scope call, not an oversight: the
  case brief lists automated tests as optional, and the time budget instead
  went to the mandatory requirements (Auth0, real HTTP, Zod-schema
  validation) and to this project's own consistency audit.
- Splitting `TimestampView.vue`'s 4-state flow into
  `useDocumentQueue()`/`useOtpFlow()` composables — deliberately deferred to
  avoid drawing the wrong abstraction boundaries before the flow's edge
  cases have settled (see UX_DECISIONS.md → Architecture).

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
  (`idle→ready→otp→result→send`) rather than a multi-page wizard. File
  selection itself was deliberately left inline/plain — only the
  credit-consuming, irreversible commit step (OTP → result) was pulled into
  a focused modal. This isn't imitating DocuSign's multi-step wizard; it's
  isolating the one genuinely irreversible moment in the flow.
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
