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
| P0 | `src/views/BatchDailyTasks.vue` | 4,255 lines / 122 KiB | Scheduler runtime, batch settings, helper dialogs, and task execution orchestration | Move scheduler runtime into a composable; then extract batch settings |
| P0 | `src/components/Club/ClubWarRankV2.vue` | 5,701 lines / 151 KiB | Ranking query, map/detail presentation, member analysis, exports, dialogs | Separate ranking summary, detail table, and export sheet before moving request state |
| P1 | `src/components/Club/ClubWarRank.vue` | 3,886 lines / 104 KiB | Legacy salt-field ranking presentation and actions | Confirm active style-switch requirements, then share stable data transforms with V2 |
| P1 | `src/components/Cards/Activity/UnlimitedLineup.vue` | 3,510 lines / 92 KiB | Player lookup, lineup analysis, editing, export, multiple dialogs | Extract lookup form, lineup board, and export renderer |
| P1 | `src/components/Club/PeachInfoV2.vue` | 3,487 lines / 91 KiB | Peach event state, opponent analysis, battle actions, history, exports | Extract overview, opponent panel, and battle history |
| P1 | `src/components/Cards/Rank/GoldRankListPageCard.vue` | 3,352 lines / 87 KiB | Ranking fetch, filtering, detail queries, export | Establish a shared ranking-page contract before extracting common controls |
| P1 | `src/components/Club/GreatRouteRankListPageCard.vue` | 3,302 lines / 85 KiB | Ranking fetch, club detail queries, export | Establish a shared ranking-page contract before extracting common controls |
| P1 | `src/components/Cards/Rank/TopClubListPageCard.vue` | 3,150 lines / 81 KiB | Ranking fetch, club detail queries, export | Establish a shared ranking-page contract before extracting common controls |
| P2 | `src/components/Club/PeachBattleRecords.vue` | 2,329 lines / 76 KiB | History aggregation, filtering, table rendering, export | Separate aggregation from table and export presentation |
| P2 | `src/components/Club/ClubInfo.vue` | 2,330 lines / 61 KiB | Club query lifecycle, member operations, lineup lookup, export | Move member query/export state into a club-member composable |
| P2 | `src/components/Club/PeachInfo.vue` | 2,209 lines / 61 KiB | Legacy peach-event presentation and requests | Confirm whether both peach views remain user-selectable before sharing logic |

Sizes are a snapshot taken on 2026-09-04 and should be refreshed after each
completed extraction.

## Completed Extractions

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

## Non-Business Large Files

These files are intentionally not part of the Vue component backlog:

| Path | Classification | Treatment |
| --- | --- | --- |
| `public/game/**` | Embedded game runtime and assets | Preserve byte-for-byte unless the embedded game loader changes |
| `src/xyzw/index.js` | Bundled protocol/runtime code loaded by `index.html` | Do not hand-format or refactor as application source |
| `src/xyzw/cocos2d-js-min.js` | Minified Cocos runtime loaded by `index.html` | Do not hand-format or refactor as application source |
| `source/*.js` | Unreferenced reverse-engineering/build snapshots | Keep outside the business queue; review separately before any deletion |
| `src/views/bossNames.js` | Large static lookup table | Treat as data; move only when its import boundary is intentionally changed |
