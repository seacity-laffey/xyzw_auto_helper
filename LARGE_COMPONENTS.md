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

No business-facing Vue components currently exceed the review thresholds.

Sizes are a snapshot taken on 2026-09-07 and should be refreshed after each
completed extraction.

## Completed Extractions

### Legion-war canvas renderer

- Extracted hex sizing, coordinate projection, node colors and labels,
  background-grid drawing, stronghold labels, and high-DPI canvas setup into
  `legionWarMapRenderer`.
- Kept accessibility timing, Pinia state, WebSocket connection ownership,
  refresh controls, export, and resize lifecycle in `LegionWarMap`.
- Added focused regression tests for size bounds, odd-column projection, and
  the map legend. Removed the component's historical ESLint suppression entry
  and unused store, graph, and compatibility references.
- Reduced `LegionWarMap.vue` from 1,017 lines / 27 KiB to 687 lines / 18 KiB.
  Type checking, targeted lint, 24 regression tests, production build, and an
  isolated browser canvas workflow with three alliance strongholds pass.

### Club-war shared player duel runtime

- Replaced the page-local player lookup, fight-count validation, sequential
  duel execution, progress, result, death statistics, and hero-dialog state
  with `useClubPlayerDuel`.
- Reused `ClubPlayerDuelDialog` and `ClubHeroDetailDialog` without changing
  their data or event contracts. Kept rank loading, club-detail enrichment,
  alliance grouping, manual ordering, and export ownership in `ClubWarRank`.
- Removed the component's historical ESLint suppression entry, including its
  Unicode BOM, and replaced two blocking export alerts with the existing
  message surface.
- Reduced `ClubWarRank.vue` from 1,053 lines / 30 KiB to 862 lines / 24 KiB.
  Type checking, targeted lint, 21 regression tests, production build, and an
  isolated browser workflow covering rank load through player-dialog opening
  pass.

### Game player utility panels

- Extracted the protocol record list, filters, message detail, and observer
  controls into `GameProtocolObserver`, including protocol-specific formatting.
- Extracted local BIN selection, status, actions, and saved-entry presentation
  into `GameBinManager` behind explicit props and intent events.
- Kept iframe ownership, cross-window source validation, observer dispatch,
  input synchronization, local-storage reads, and navigation in `GamePlayer`.
- Moved the remaining page-only layout rules to `GamePlayer.css`. Reduced
  `GamePlayer.vue` from 1,330 lines / 30 KiB to 538 lines / 15 KiB. Type
  checking, targeted lint, 21 regression tests, production build, and isolated
  desktop plus fixed 390 px browser rendering pass.

### Refine helper presentation and normalization

- Extracted hero/equipment selection, slot locking, password controls, action
  controls, and automatic-refine conditions into `RefineHelperPanel` behind
  explicit props and intent events.
- Moved preset-team parsing, hero and slot normalization, quench response
  normalization, quality detection, and target-condition matching into the
  tested `refineHelper` utility.
- Kept WebSocket requests, password verification, lock updates, continuous and
  automatic timers, stop ownership, and equipment mutation in the owning card.
- Reduced `RefineHelperCard.vue` from 1,429 lines / 37 KiB to 640 lines / 18 KiB.
  Desktop and fixed 390 px browser fixtures cover the complete extracted panel,
  and the former file-level ESLint suppressions are no longer needed.

### Pushing-level controls, account selection, and logs

- Extracted the page header and torch controls into `PushingLevelControls`,
  account search/group/selection presentation into `PushingAccountSelector`,
  and filtering plus auto-scroll presentation into `PushingLogPanel`.
- Moved account selection state into `usePushingAccountSelection`, log limits and
  filtering into `usePushingLogs`, and pure response, torch-time, and level
  normalization into `pushingLevelRuntime`.
- Kept WebSocket ownership, reconnects, battle loops, timers, torch requests,
  and teardown in the owning page. Preserved the original header, account,
  control, progress, and log ordering through the controls component slot.
- Reduced `PushingLevels.vue` from 1,727 lines / 43 KiB to 999 lines / 27 KiB,
  below the review threshold. Desktop and 390 px browser fixtures cover all
  extracted panels, including narrow-screen account and control layouts.

### Legacy peach overview and requests

- Confirmed that `PeachInfo.vue` remains the default `style1` view selected by
  `GameStatus`, so it cannot be treated as dead code.
- Extracted the legacy date, club matchup, loading, empty, and table UI into
  `PeachLegacyOverview`, and moved its real-time/history request sequence plus
  image export into `useLegacyPeachBattle`.
- Moved row rendering into `createPeachLegacyColumns`, and reused
  `usePeachDuel`, `ClubPlayerDuelDialog`, and `ClubHeroDetailDialog` for player
  lookup, duel execution, and detail presentation.
- Kept the original WebSocket command ordering and registered the initial
  fetch only after all request callbacks were created. Reduced
  `PeachInfo.vue` from 2,209 lines / 61 KiB to 94 lines / 3 KiB; its four
  focused modules total 866 lines, with no module above 360 lines. Desktop and
  390 px browser fixtures cover the legacy toolbar, matchup, table, and narrow
  viewport overflow.

### Player ranking pages

- Added `PlayerRankingToolbar` and `PlayerRankingTable`, sharing title/date
  controls, loading and empty states, player rows, legacy tags, rank medals,
  player-selection intent, and image-export DOM access.
- Reused `useClubPlayerDuel`, `ClubPlayerDuelDialog`, and
  `ClubHeroDetailDialog` in both Top Rank and Server Rank pages.
- Preserved the distinct `arena_getarearank` and `rank_getserverrank`
  protocols, response normalization, existing 100-row display limit, and
  export filenames in their owning pages.
- Reduced `TopRankListPageCard.vue` from 2,346 lines / 61 KiB to 290 lines /
  8 KiB and `ServerRankListPageCard.vue` from 2,334 lines / 60 KiB to 290 lines
  / 8 KiB. Desktop and 390 px browser fixtures cover both titles, score-column
  meanings, player links, legacy badges, and responsive overflow.

### Top Club controls and shared ranking table

- Extracted the title, query date, export options, and actions into
  `TopClubRankToolbar`.
- Reused `ClubRankingTable` with its new explicit `showScore` contract, keeping
  score columns enabled by default for Gold and Great Route and disabled for
  Top Club.
- Kept area-rank fetching, club-detail loading, workbook export, and image
  export orchestration in the owning page. The table exposes only its export
  DOM element.
- Reduced `TopClubListPageCard.vue` from 1,600 lines / 39 KiB to 375 lines /
  10 KiB, below the large-component review threshold. Desktop and 390 px
  browser fixtures cover the no-score table layout and responsive overflow.

### Top Club player drilldown and duel runtime

- Replaced the page-local player and hero modals with
  `ClubPlayerDuelDialog` and `ClubHeroDetailDialog`.
- Reused `useClubPlayerDuel` for player lookup, hero normalization, fight-count
  validation, sequential duel execution, progress, and result state.
- Preserved the `legion_getarearank` request, club-detail loading, ordering, and
  export workflow in the owning page.
- Fixed image-export style restoration so it no longer references variables
  outside their scope, and replaced blocking export alerts with page messages.
- Reduced `TopClubListPageCard.vue` from 3,150 lines / 81 KiB to 1,600 lines /
  39 KiB. Shared player and duel regression tests, type checking, and targeted
  lint pass.

### Shared club ranking presentation

- Generalized the Gold ranking table as `ClubRankingTable`, with explicit rank
  and score field contracts used by both Gold and Great Route rankings.
- Extracted the Great Route header and actions into `GreatRouteRankToolbar`,
  and its table plus pagination into `GreatRouteRankingTable`.
- Kept island lookup, rank requests, page caching, detail loading, and image
  export in the owning Great Route page. Narrow screens hide the pagination
  quick jumper while retaining page navigation and internal table scrolling.
- Reduced `GreatRouteRankListPageCard.vue` from 1,751 lines / 43 KiB to 506
  lines / 14 KiB, below the large-component review threshold. Desktop and 390
  px browser fixtures cover island metadata, table field mapping, ranking,
  pagination, and responsive overflow.

### Great Route player drilldown and duel runtime

- Replaced the page-local player and hero modals with
  `ClubPlayerDuelDialog` and `ClubHeroDetailDialog`.
- Reused `useClubPlayerDuel` for player lookup, hero normalization, fight-count
  validation, sequential duel execution, progress, and result state.
- Preserved the `saltroad_getwartype` then
  `saltroad_getsaltroadwartotalrank` request order, page cache, club-detail
  loading, pagination, and image export in the owning page.
- Reduced `GreatRouteRankListPageCard.vue` from 3,302 lines / 85 KiB to 1,751
  lines / 43 KiB. Shared player and duel regression tests, type checking, and
  targeted lint pass.

### Gold rank controls and table

- Extracted the header, export controls, and rank-group selector into
  `GoldRankToolbar`, and moved loading, empty, and rank-row presentation into
  `GoldRankTable`.
- Kept rank fetching, club-detail requests, rate-limited workbook export, and
  image export orchestration in the owning page. The table exposes only its
  export DOM element to the parent.
- Corrected grouped rank labels so the second through fifth groups begin at
  101, 201, 301, and 401, while medals remain limited to the global top three.
- Reduced `GoldRankListPageCard.vue` from 1,844 lines / 47 KiB to 532 lines /
  15 KiB, below the large-component review threshold.

### Gold rank player drilldown and duel runtime

- Replaced the page-local player and hero modals with
  `ClubPlayerDuelDialog` and `ClubHeroDetailDialog`.
- Added `useClubPlayerDuel`, composing the existing `clubPlayerInfo` and
  `clubDuelRunner` utilities into one reusable query, validation, progress,
  result, and dialog-state contract for ranking pages.
- Preserved the gold-rank query, group selection, club-detail loading, and
  rate-limited export workflows in the page.
- Reduced `GoldRankListPageCard.vue` from 3,352 lines / 87 KiB to 1,844 lines /
  47 KiB. Shared duel and player-normalization tests, type checking, and
  targeted lint pass.

### Peach opponent analysis and duel runtime

- Reused `ClubPlayerDuelDialog` and `ClubHeroDetailDialog` for opponent details,
  duel progress and results, lineup inspection, and hero details.
- Extracted the date picker and action toolbar into `PeachBattleToolbar`, and
  moved the club matchup plus opponent table presentation into
  `PeachOpponentMatchup` while retaining parent-owned column actions.
- Moved opponent lookup, single-player duel progress, five-round batch
  simulation, retry handling, and dialog state into `usePeachDuel` without
  reordering WebSocket commands.
- Reduced `PeachInfoV2.vue` from 3,487 lines / 91 KiB to 913 lines / 26 KiB,
  below the large-component review threshold. Connected-account query and duel
  workflows still require live WebSocket verification.

### Unlimited lineup presentation, storage, and workflows

- Extracted the current lineup board, saved-lineup manager, equipment-refine
  details, and hero exchange editor into four focused presentation components.
- Kept drag/drop mutation and equipment editing in the owning component;
  children receive normalized view models and emit intent.
- Moved per-role local persistence, rename/delete confirmation, and JSON
  import/export into `useUnlimitedLineupStorage`.
- Moved player and preset-team loading, connection lifecycle handling, and team
  switching into `useUnlimitedLineupData` without changing initialization order.
- Moved saved-lineup capture into `useUnlimitedLineupCapture`, and isolated the
  existing hero, fish, pearl, technology, and weapon command sequence in
  `useUnlimitedLineupApplication`.
- Reduced `UnlimitedLineup.vue` from 3,430 lines / 90 KiB to 927 lines / 25 KiB,
  below the large-component review threshold. Type checking, targeted lint,
  production build, and isolated browser rendering for the board and saved
  manager pass; connected-account workflows still require live WebSocket
  verification.

### Pushing-level progress presentation

- Extracted the per-account progression cards into
  `PushingLevelProgress.vue`, keeping the normalized card contract limited to
  display data and `start`/`stop` intent events.
- Kept WebSocket connections, countdown state, torch refreshes, battle loops,
  selection, and logging in `PushingLevels.vue`; migrated the card-specific
  styles with the presentation.
- Reduced `src/views/PushingLevels.vue` from 1,899 lines / 47 KiB to 1,727
  lines / 43 KiB and removed its now-unused historical lint suppressions.
  Type checking and targeted lint pass; the existing desktop/mobile pushing
  page screenshots remain available for visual regression review.

### Token account collection

- Extracted the shared list/card presentation into
  `TokenAccountCollection.vue` and the row action menu into
  `TokenAccountActions.vue`, preserving the existing connection indicators,
  permanent-token upgrade, edit, copy, delete, and drag-order behavior.
- Moved temporary remark editing state into the collection while keeping token
  sorting, store mutations, imports, and account actions in the owning page.
- Reduced `src/views/TokenImport/index.vue` from 1,016 lines / 35 KiB to 635
  lines / 20 KiB, removing it from this backlog. Desktop and 390 px browser
  checks cover list/card switching, remark saving, drag ordering, edit-dialog
  opening, console errors, and page overflow.

### Token workflow dialogs

- Extracted the four-method Token import workflow into
  `TokenImportDialog.vue`, keeping its method selection local and closing it
  through a single model event from every form variant.
- Extracted Token editing into `TokenEditDialog.vue`. The dialog owns an
  isolated draft and sends validated save intent to the page, while the page
  retains store updates and notifications.
- Reduced `src/views/TokenImport/index.vue` from 1,171 lines / 40 KiB to 1,016
  lines / 35 KiB and removed its stale historical lint suppression entry.
  Desktop and 390 px browser checks cover import-method switching, editing,
  save propagation, console errors, and page overflow.

### Fight PvP presentation

- Extracted opponent identity, club statistics, and the clickable lineup into
  `FightPvpOpponentPanel.vue`; extracted aggregate rates and per-battle rows
  into `FightPvpResultPanel.vue`.
- Replaced the oversized nested-card presentation with compact bordered panels
  and semantic hero buttons while retaining the parent export surface and
  selected-hero event flow.
- Removed the migrated template and all associated dead styles, then fixed the
  remaining template and script lint violations and deleted the component's
  historical suppression entry. Reduced `FightPvP.vue` from 1,412 lines / 35
  KiB to about 600 lines / 16 KiB, removing it from this backlog.
- Desktop and 390 px browser checks cover opponent lookup, hero details, result
  rates, console errors, and page overflow.

### Fight PvP hero detail reuse

- Replaced the component-local Naive UI hero modal with the shared
  `ClubHeroDetailDialog.vue`, retaining hero, fish, pearl, equipment, and holy
  beast details behind the existing selected-hero state.
- Removed the duplicated hero/equipment parser in favor of the tested
  `extractClubHeroInfo` utility, preserving formatted power and pearl
  attachment while adding sparse equipment and legacy response support.
- Removed unused ranking, pagination, modal-prop, and empty lifecycle remnants,
  and made optional club statistics safe when absent. Reduced `FightPvP.vue`
  from 1,863 lines / 47 KiB to 1,412 lines / 35 KiB.
- Desktop and 390 px browser checks cover opponent lookup, hero details, one
  battle result, console errors, and page overflow.

### Club information management

- Extracted the club overview, member table, application review, and member
  detail surfaces into four presentation components with explicit props and
  intent events.
- Moved member sorting, application normalization, overview derivation, and
  display formatting into the tested `src/utils/clubInfoData.js` utility, and
  reused `src/utils/clubPlayerInfo.js` for both batch lineup and member detail
  responses. Legacy hero response fields remain supported.
- Kept WebSocket requests, five-member lineup batches, membership actions,
  sign-in, and image-export orchestration in the owning component. Heavy
  history and weird-tower views now mount only when selected, avoiding hidden
  requests.
- Reduced `ClubInfo.vue` from 2,058 lines / 53 KiB to 397 lines / 14 KiB and
  removed its historical lint suppressions. Desktop and 390 px browser checks
  cover overview rendering, lineup loading, member detail, console errors, and
  page overflow.

### Peach battle records

- Moved event-date selection, date-key formatting, power display, club record
  normalization, totals, and rankings into the tested
  `src/utils/peachBattleRecordData.js` utility.
- Replaced three duplicated report trees with `PeachBattleRecordsReport.vue`
  and the reusable two-sided `PeachBattleClubPanel.vue`. All variants retain
  club metadata, totals, kill/KD/revive/streak rankings, and complete member
  tables.
- Kept the five-step protocol workflow in the owning component, adding stale
  request protection and awaited image export. Reduced
  `PeachBattleRecords.vue` from 2,329 lines / 76 KiB to 292 lines / 10 KiB and
  removed its historical lint suppressions. Desktop and 390 px browser checks
  cover all three variants, request order, totals, rows, and overflow.

### Club monthly battle records

- Moved monthly battle-date calculation, sequential record loading, cross-date
  member aggregation, and per-day stat access into the tested
  `src/utils/clubMonthBattleRecordData.js` utility.
- Extracted the monthly overview and daily matrix into
  `ClubMonthBattleRecordsReport.vue`. Monthly summary variants now reuse
  `ClubBattleRecordsReport.vue` through an explicit week/month label contract.
- Preserved per-battle resurrection totals while adding stale-request
  protection and sequential same-command requests. Reduced
  `ClubMonthBattleRecords.vue` from 1,628 lines / 53 KiB to 244 lines / 8 KiB.
  Desktop and 390 px browser checks cover all three variants, loading
  completion, totals, rows, and overflow.

### Club weekly battle records report

- Extracted both weekly report presentations into
  `ClubBattleRecordsReport.vue` and moved summary, ranking, percentage, and heat
  calculations into the tested `src/utils/clubBattleRecordData.js` utility.
- Kept request lifecycle, date selection, and export orchestration in the owning
  component. Restored the previously inert table-copy export and made image
  export completion precede its success notification.
- Reduced `ClubBattleRecords.vue` from 1,504 lines / 45 KiB to 506 lines / 13
  KiB. The extracted report is 264 lines / 13 KiB; desktop and 390 px browser
  checks cover both report variants, loading completion, rows, and overflow.

### Legacy salt-field ranking removal

- Removed the 3,945-line legacy salt-field ranking implementation after the
  legacy presentation was explicitly retired.
- Promoted the former `ClubWarRankV2.vue` and its stylesheet to the canonical
  `ClubWarRank` names, removed the salt-field style switch, and cleared the
  obsolete `club_warrank_style` preference.
- Historical entries below retain the former V2 name to describe the component
  as it was named when those extractions were completed.

### Unlimited lineup technology dialog

- Extracted the saved-lineup club technology viewer into
  `UnlimitedLineupTechDialog.vue` with a small `open` and `techData` contract.
- Replaced the Naive UI modal with the source-owned shadcn-vue Dialog and moved
  display-only technology constants and styles into the child.
- Desktop and 390 px browser checks verified all six technology groups, the
  responsive two-to-one-column layout, viewport containment, and the close
  event. Reduced `UnlimitedLineup.vue` from 3,510 to 3,430 lines.

### Club rank style ownership

- Moved active data-table, row, alliance, group, and current-club styles into
  `ClubWarRankingTable.vue`, where the scoped selectors now reach the rendered
  Naive DataTable DOM.
- Replaced 1,650 lines of obsolete hand-built table CSS and duplicated responsive
  overrides with a 92-line parent layout/export stylesheet. The retained styles
  use the current neutral theme variables and compact rectangular indicators.
- Reduced the compiled `ClubWarRankV2` CSS from about 54 KiB to 28 KiB and the
  parent component from 2,732 lines / 71 KiB to 1,079 lines / 30 KiB, removing it
  from this backlog. Desktop and 390 px browser checks verified real table
  rendering and internal horizontal scrolling.

### Club rank view derivation

- Consolidated alliance filtering, manual/red-quench/score sorting, edit-order
  snapshots, grouped summary rows, rank maps, alliance counts, and average
  red-quench calculation in `src/utils/clubWarRankData.js`.
- Preserved the special blank-announcement filter and the salt-field average's
  fixed 20-slot denominator, while removing unused expanded-member state.
- Added focused coverage for every sort mode, edit ordering, blank alliances,
  group ordering and averages, rank assignment, counts, and fixed-slot totals.
  Reduced `ClubWarRankV2.vue` from 2,856 to 2,732 lines.

### Club duel execution

- Moved sequential duel requests, battle-response normalization, defeated-hero
  counting, progress events, pacing, and final aggregation into
  `src/utils/clubDuelRunner.js`.
- Preserved the existing request contract and pacing: duels remain sequential,
  invalid responses count as losses, and the 500 ms delay only follows a valid
  battle when another attempt remains.
- Removed unused target and fight-history state. Added focused coverage for
  response normalization, request ordering, mixed-result aggregation, progress,
  pacing, and request-error propagation. Reduced `ClubWarRankV2.vue` from 2,959
  to 2,856 lines.

### Club player information normalization

- Moved equipment socket totals, hero normalization, lineup ordering, pearl
  attachment, and player summary construction into
  `src/utils/clubPlayerInfo.js`.
- Kept the WebSocket request and view state in `ClubWarRankV2.vue`, while
  removing response-dump and per-fight debug logging from the runtime path.
- Added focused coverage for sparse equipment, keyed hero responses, lineup
  ordering, dictionary fallbacks, pearl attachment, legion fallbacks, and
  missing role data. Reduced `ClubWarRankV2.vue` from 3,147 to 2,959 lines.

### Club war rank data normalization

- Consolidated the duplicated live-opponent and historical-rank detail pipelines
  into `src/utils/clubWarRankData.js`.
- Preserved the existing request cadence: clubs load concurrently while member
  role requests remain sequential within each club.
- Centralized missing-detail fallback, top-three leader selection, red-quench and
  holy-beast summaries, alliance assignment, and dominant-alliance ordering.
- Added focused coverage for request ordering, top-three aggregation, error
  fallback, and alliance sorting. Reduced `ClubWarRankV2.vue` from 3,431 to
  3,147 lines.

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
  click forwarding. Reduced `ClubWarRankV2.vue` from 3,791 to 3,431 lines.

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

### Batch recipient lookup

- Extracted recipient ID validation, WebSocket lookup, response normalization,
  error handling, and lookup state into `useBatchRecipientLookup`.
- Initialized the composable after the page-owned `ensureConnection` function so
  the existing setup order remains safe; legacy gift execution still receives
  the same refs through `createTaskDeps`.
- Released the connection slot and short-lived socket opened by a lookup, and
  guarded against a selected account disappearing before the request starts.
- Reduced `BatchDailyTasks.vue` from 1,998 to 1,834 lines. Type checking,
  targeted lint, and production build pass.

### Batch execution runtime

- Split scheduler timing, countdowns, health checks, and lifecycle cleanup into
  `useBatchScheduler`, while scheduled-task validation and dispatch live in
  `useBatchScheduledTaskExecution`.
- Reused the existing batch connection manager instead of maintaining a second
  connection-pool implementation in the view.
- Moved task-factory composition and function-panel action mapping into
  `useBatchTaskModules`; normal daily execution and month-cheer lookup now live
  in `useBatchDailyRunner` and `useBatchWarGuess`.
- Reduced `BatchDailyTasks.vue` from 1,834 lines / 53 KiB to 973 lines / 28 KiB,
  below the large-component review threshold. Type checking, targeted lint, and
  production build pass.

## Non-Business Large Files

These files are intentionally not part of the Vue component backlog:

| Path | Classification | Treatment |
| --- | --- | --- |
| `public/game/**` | Embedded game runtime and assets | Preserve byte-for-byte unless the embedded game loader changes |
| `src/xyzw/index.js` | Bundled protocol/runtime code loaded by `index.html` | Do not hand-format or refactor as application source |
| `src/xyzw/cocos2d-js-min.js` | Minified Cocos runtime loaded by `index.html` | Do not hand-format or refactor as application source |
| `source/*.js` | Unreferenced reverse-engineering/build snapshots | Keep outside the business queue; review separately before any deletion |
| `src/views/bossNames.js` | Large static lookup table | Treat as data; move only when its import boundary is intentionally changed |
