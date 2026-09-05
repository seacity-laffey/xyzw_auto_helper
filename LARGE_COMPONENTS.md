# Large Business Component Backlog

This document tracks oversized business-facing Vue components. It deliberately
excludes embedded game runtimes, minified vendor code, generated files, and
static media from the component refactor queue.

## Thresholds

- **Critical:** more than 2,000 lines or 60 KiB.
- **Review:** more than 1,000 lines or 40 KiB.
- Extract by business responsibility, not by an arbitrary line target.
- Presentation components receive data through props and report intent through
  events. Network requests, storage, scheduling, and task execution stay in an
  owning view or composable.
- Every extraction must pass type checking, production build, and a browser
  workflow covering the extracted boundary.

## Current Backlog

| Priority | Component | Size | Main responsibilities | Next boundary |
| --- | --- | ---: | --- | --- |
| P2 | `src/views/BatchDailyTasks.vue` | 1,998 lines / 57 KiB | Scheduler runtime, recipient lookup, and task execution orchestration | Isolate recipient lookup; then move the scheduler loop behind a tested runtime contract |
| P0 | `src/components/Club/ClubWarRankV2.vue` | 3,429 lines / 93 KiB | Ranking queries, member analysis, edit state, exports | Separate request normalization and ranking state orchestration |
| P1 | `src/components/Club/ClubWarRank.vue` | 3,886 lines / 104 KiB | Legacy salt-field ranking presentation and actions | Confirm active style-switch requirements, then share stable data transforms with V2 |
| P1 | `src/components/Cards/Activity/UnlimitedLineup.vue` | 3,510 lines / 92 KiB | Player lookup, lineup analysis, editing, export, multiple dialogs | Extract lookup form, lineup board, and export renderer |
| P1 | `src/components/Club/PeachInfoV2.vue` | 3,487 lines / 91 KiB | Peach event state, opponent analysis, battle actions, history, exports | Extract overview, opponent panel, and battle history |
| P1 | `src/components/Cards/Rank/GoldRankListPageCard.vue` | 3,352 lines / 87 KiB | Ranking fetch, filtering, detail queries, export | Establish a shared ranking-page contract before extracting common controls |
| P1 | `src/components/Club/GreatRouteRankListPageCard.vue` | 3,302 lines / 85 KiB | Ranking fetch, club detail queries, export | Establish a shared ranking-page contract before extracting common controls |
| P1 | `src/components/Cards/Rank/TopClubListPageCard.vue` | 3,150 lines / 81 KiB | Ranking fetch, club detail queries, export | Establish a shared ranking-page contract before extracting common controls |
| P2 | `src/components/Club/PeachBattleRecords.vue` | 2,329 lines / 76 KiB | History aggregation, filtering, table rendering, export | Separate aggregation from table and export presentation |
| P2 | `src/components/Club/ClubInfo.vue` | 2,058 lines / 53 KiB | Club query lifecycle, member operations, lineup lookup, export | Move member query/export state into a club-member composable |
| P2 | `src/components/Club/PeachInfo.vue` | 2,209 lines / 61 KiB | Legacy peach-event presentation and requests | Confirm whether both peach views remain user-selectable before sharing logic |

Sizes are a snapshot taken on 2026-09-05 and should be refreshed after each
completed extraction.

## Completed Extractions

### Club war rank column factory

- Moved the nine Naive DataTable column renderers from `ClubWarRankV2.vue` into
  `src/composables/createClubWarRankColumns.js` behind explicit state, formatter,
  component, and action dependencies.
- Kept ranking edit state, current-club identity, opponent lookup, and lineup
  classification in the parent while removing 360 lines of render functions.
- Fixed the render-function edit controls to use `value` and `onUpdate:value`, so
  rank and alliance changes now write back reliably; also fixed the alliance
  selector's invalid `.value` access on a plain options array.
- Added focused tests for merged group rows, both edit write-back paths, and hero
  click forwarding. Reduced `ClubWarRankV2.vue` from 3,791 to 3,429 lines.

### Club war ranking table states

- Extracted data-table mounting, loading feedback, and empty feedback into
  `src/components/Club/ClubWarRankingTable.vue`.
- Replaced Naive UI spin/empty components and the final vicons usage in
  `ClubWarRankV2.vue` with Lucide-based source-owned states; the complex Naive
  data table remains isolated behind a small presentation contract.
- Kept column renderers, grouped row data, row classification, and image-export
  ownership in the parent.
- Reduced `ClubWarRankV2.vue` from 3,854 to 3,791 lines. Browser coverage verifies
  data, loading, and empty transitions plus desktop/mobile overflow behavior.

### Club war alliance summary

- Extracted the salt-field announcement, fetch timestamp, alliance counts, and
  active-alliance filter into `src/components/Club/ClubWarAllianceSummary.vue`.
- Kept alliance classification and filtering rules in `ClubWarRankV2.vue`; the
  child receives counts and reports only the selected alliance.
- Replaced the oversized legacy colored tabs with compact semantic buttons while
  preserving distinct alliance accents and horizontal mobile navigation.
- Updated the parent's scoped export selectors to cross the component boundary,
  preserving the fixed 1,380 px image export layout.
- Reduced `ClubWarRankV2.vue` from 4,146 to 3,854 lines. Browser coverage verifies
  counts, selection state, event delivery, and mobile overflow behavior.

### Club war ranking toolbar

- Extracted ranking identity, club count, weekend date selection, export options,
  and sorting actions from `ClubWarRankV2.vue` into
  `src/components/Club/ClubWarRankToolbar.vue`.
- Consolidated the duplicate custom calendar and Arco date picker into one
  source-owned weekend calendar, and replaced Naive UI controls and vicons with
  shadcn-vue controls and Lucide icons.
- Kept fetching, edit state transitions, sorting, and export execution in the
  parent behind props and intent events.
- Reduced `ClubWarRankV2.vue` from 4,629 to 4,146 lines. Browser coverage verifies
  disabled weekdays, date and export-option updates, all action events, and
  horizontal layout at desktop and 390 px mobile widths.

### Club player duel dialog

- Extracted opponent identity, duel controls, progress, results, and lineup
  presentation from `ClubWarRankV2.vue` into
  `src/components/Club/ClubPlayerDuelDialog.vue`.
- Kept WebSocket requests, sequential duel execution, result aggregation, and
  selected-hero state in the parent behind explicit props and intent events.
- Replaced the Naive UI modal, avatars, inputs, progress, tags, and buttons in
  this boundary with source-owned shadcn-vue controls and semantic HTML.
- Removed debug-only lineup labels and obsolete parent styles, and reduced
  `ClubWarRankV2.vue` from 5,305 to 4,629 lines.
- Browser coverage verifies count validation, action events, result controls,
  hero selection, and horizontal layout at desktop and 390 px mobile widths.

### Club hero detail dialog

- Extracted the duplicated hero summary, attributes, pearl state, and equipment
  display from `ClubWarRankV2.vue` and `ClubInfo.vue` into
  `src/components/Club/ClubHeroDetailDialog.vue`.
- Replaced the Naive UI modal and descriptions in this boundary with
  source-owned shadcn-vue dialog, badge, and button controls.
- Removed the parent component's unused modal props, emit, close handler, and
  obsolete detail-dialog styles; the parent now owns only selection and open
  state.
- Reduced `ClubWarRankV2.vue` from 5,701 to 5,305 lines and `ClubInfo.vue` from
  2,330 to 2,058 lines. The extracted dialog is intentionally reusable by the
  other ranking views that duplicate this detail presentation.

### Batch task function panel

- Extracted the seven function categories from `BatchDailyTasks.vue` into
  `src/components/Batch/BatchFunctionPanel.vue`.
- Replaced Naive UI tabs, buttons, pop-select, and number input in this surface
  with source-owned shadcn-vue controls and a native select.
- Kept all task functions in the parent and connected them through one typed
  `action` event plus focused model/update events.
- Reduced the parent from 6,433 to 5,942 lines, including removal of dead tab
  styling and 14 zero-reference declarations.
- Browser coverage checks all seven tabs, action counts, numeric input, salt
  pick options, responsive columns, and the `resource -> batch box` event path.

### Batch account and execution panels

- Extracted account selection, sorting, group filters, game launch, and per-token
  settings triggers into `src/components/Batch/BatchAccountPanel.vue`.
- Extracted log filtering, auto-scroll, progress, status totals, and log actions
  into `src/components/Batch/BatchExecutionLog.vue`.
- Kept token selection, task status, logging data, and execution orchestration in
  the parent; the child components communicate only through props and events.
- Reduced `BatchDailyTasks.vue` from 5,942 to 5,655 lines and removed parent-side
  DOM refs and display-only computed state for the execution log.
- Browser coverage verifies select-all, sorting, the account settings event path,
  log filters and visibility, and desktop/mobile overflow behavior.

### Batch task settings editor

- Replaced the duplicated account and template settings forms with
  `src/components/Batch/BatchTaskSettingsDialog.vue`.
- Migrated this shared editor from Naive UI to source-owned shadcn-vue dialog,
  input, switch, label, and button controls plus native selects.
- Kept account-setting persistence and validation in the parent while passing
  immutable settings updates through component events.
- Reduced `BatchDailyTasks.vue` from 5,655 to 5,500 lines and removed the old
  form-only switch styles.
- Browser coverage verifies account setting persistence and the nested
  `template manager -> new template -> save` workflow.

### Batch template management

- Moved template listing, search, editing, account application, reference
  inspection, deletion confirmation, and local persistence into
  `src/components/Batch/BatchTemplateManager.vue`.
- Replaced the four remaining Naive UI template dialogs with source-owned
  shadcn-vue dialogs, controls, and semantic native selects.
- Reduced `BatchDailyTasks.vue` from 5,500 to 4,923 lines; the parent now owns
  only the template-manager open state and notification bridge.
- Browser coverage verifies create, search, apply to all accounts, reference
  aggregation, delete confirmation, persistence, and desktop/mobile layout.

### Batch scheduler manager

- Extracted scheduled-task listing, daily/Cron editing, account and task
  selection, group shortcuts, enable controls, and deletion confirmation into
  `src/components/Batch/BatchSchedulerManager.vue`.
- Kept the shared task array, import/export, countdown timer, scheduler loop,
  dependency checks, and task execution in the parent to preserve runtime
  behavior.
- Replaced the scheduler's Naive UI dialogs and controls with shadcn-vue and
  semantic native time inputs and tabs.
- Reduced `BatchDailyTasks.vue` from 4,923 to 4,264 lines and removed obsolete
  form, Cron preview, selection state, and CSS.
- Browser coverage verifies daily task creation, Cron editing with five-run
  preview, enable persistence, countdown presentation, and confirmed deletion.

### Batch operation dialogs

- Extracted runtime settings, dream purchase selection, resource helpers, month
  cheer, account group management, and legacy gift presentation into six
  focused components under `src/components/Batch/`.
- Replaced the extracted Naive UI modals, data table, upload control, and vicons
  with source-owned shadcn-vue controls, semantic tables and inputs, and Lucide
  icons. `BatchDailyTasks.vue` no longer contains Naive UI template elements.
- Moved group editing into its owning component and replaced browser `confirm()`
  with an inline confirmation state. WebSocket lookup, gift execution, scheduler
  runtime, and task functions remain in the parent.
- Removed roughly 350 lines of scoped styles whose selectors belonged to already
  extracted panels. Activity availability, runtime settings, token sorting,
  embedded-game launching, config transfer, and scheduled-task persistence now
  live in focused composables.
- The parent decreased from 4,268 lines / 122 KiB to 1,998 lines / 57 KiB and no
  longer meets either critical threshold.
- Browser coverage verifies runtime-setting persistence, nested dream settings,
  helper inputs, gift validation state, and the full group create/edit/member/
  delete lifecycle.

## Non-Business Large Files

These files are intentionally not part of the Vue component backlog:

| Path | Classification | Treatment |
| --- | --- | --- |
| `public/game/**` | Embedded game runtime and assets | Preserve byte-for-byte unless the embedded game loader changes |
| `src/xyzw/index.js` | Bundled protocol/runtime code loaded by `index.html` | Do not hand-format or refactor as application source |
| `src/xyzw/cocos2d-js-min.js` | Minified Cocos runtime loaded by `index.html` | Do not hand-format or refactor as application source |
| `source/*.js` | Unreferenced reverse-engineering/build snapshots | Keep outside the business queue; review separately before any deletion |
| `src/views/bossNames.js` | Large static lookup table | Treat as data; move only when its import boundary is intentionally changed |
