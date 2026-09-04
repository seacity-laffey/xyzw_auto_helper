# XYZW Interface Design System

## 1. Direction

XYZW is a local game operations console. Its interface should feel calm, direct,
and dependable. The visual reference is the Hexo NexT family, especially its
restrained typography, monochrome palette, narrow navigation, fine rules, and
low-decoration surfaces. The product must retain the density and efficiency of
an administration tool rather than imitate a blog layout.

The working name for this visual language is **NexT Console**.

## 2. Principles

1. **Content before chrome.** Controls and data are primary. Decoration must not
   compete with operational information.
2. **Structure through rules.** Prefer spacing, alignment, and 1px separators to
   floating cards and large shadows.
3. **Monochrome by default.** Near-black is the action color. Green, amber, red,
   and blue are reserved for semantic state.
4. **Compact, not cramped.** Repeated workflows should be scannable and require
   little pointer travel. Touch targets remain at least 36px high.
5. **One component language.** New and migrated UI uses source-owned
   shadcn-vue components. Naive UI, Arco Design, and UnoCSS are transitional.
6. **Game imagery is data.** Avatars, hero art, and item icons are allowed when
   they identify real game entities. They are not background decoration.

## 3. Technology Boundary

- Framework: Vue 3 and Vite.
- UI source: shadcn-vue, `new-york` style.
- Primitive layer: Reka UI where required by shadcn-vue.
- Styling: Tailwind CSS and semantic CSS variables.
- Icons: `@lucide/vue`.
- Forms and tables: shadcn-vue compositions; TanStack Table may be introduced
  when a table needs sorting, filtering, selection, or virtualization.
- Theme state: the existing `useTheme` composable, normalized to `.dark`.

No new code may import Naive UI, Arco Design, `@vicons`, or UnoCSS. Existing
imports are migrated by page. A package is removed only after its source imports
reach zero and the production build passes.

## 4. Visual Tokens

### Light

| Token | Value | Use |
| --- | --- | --- |
| Background | `#ffffff` | Main workspace |
| Subtle background | `#fafafa` | Sidebar and grouped controls |
| Muted background | `#f5f5f5` | Hover and disabled states |
| Foreground | `#202020` | Primary text and primary actions |
| Muted foreground | `#737373` | Metadata and descriptions |
| Border | `#e5e5e5` | Rules, fields, and panels |
| Strong border | `#d4d4d4` | Active field and table header |
| Success | `#2f7d4a` | Connected and completed |
| Warning | `#9a6700` | Attention and partial results |
| Destructive | `#b42318` | Errors and destructive actions |
| Information | `#315f86` | Neutral informational state |

### Dark

Dark mode uses neutral charcoal surfaces rather than blue-black surfaces.
Primary text is `#ededed`, the workspace is `#171717`, the sidebar is `#141414`,
and borders are `#333333`. Semantic colors remain muted and accessible.

### Shape and Elevation

- Base radius: `4px`.
- Compact control radius: `3px`.
- Dialog radius: `6px`.
- Default panels: no shadow.
- Floating menus and dialogs: one restrained shadow only.
- Do not use gradients, decorative blobs, glass panels, or oversized pills.

## 5. Typography

- Interface: `PingFang SC`, `Microsoft YaHei`, system sans-serif.
- Technical values: `SFMono-Regular`, `Consolas`, system monospace.
- Page title: 20px / 650.
- Section title: 15px / 650.
- Body: 14px / 400.
- Metadata: 12px / 400.
- Large numeric values: 24px / 650, used only for real metrics.
- Letter spacing is always zero.

English eyebrow labels such as `CURRENT ROLE` and decorative version copy are
removed from primary surfaces. English is retained only for protocol names,
identifiers, and established technical terms.

## 6. Spacing and Layout

- Desktop sidebar: 320px fixed width, including the persistent account directory.
- Desktop top bar: 56px height.
- Content width: fluid up to 1440px, with 24px desktop gutters.
- Mobile gutters: 14px.
- Spacing scale: 4, 8, 12, 16, 24, 32px.
- Desktop dashboards may use 2-3 columns when items are directly comparable.
- Settings and tables use full-width bands or bordered panels, not nested cards.

The primary navigation remains on the left for repeated desktop operation. On
mobile it becomes a sheet opened by a familiar menu icon.

## 7. Component Rules

### Buttons

- Primary: near-black fill, white label.
- Secondary: white/transparent fill with a neutral border.
- Ghost: no border, used for low-priority toolbar actions.
- Destructive: red only for actions with destructive consequences.
- Icon-only buttons require an accessible label and tooltip when unfamiliar.

### Panels

- A panel owns one task, one metric group, or one repeated entity.
- Use a 1px border and 4px radius. Hover must not move the panel.
- Avoid panels inside panels. Internal groups use separators.

### Tables

- 40px default row height and a muted header background.
- Numeric values align right; state and short categorical values align center.
- Selection and row actions remain visible without decorative badges.
- Mobile tables either scroll horizontally or switch to a purpose-built list.

### Tabs

- Tabs are an underline navigation row, matching NexT's category navigation.
- Use segmented controls only for mutually exclusive modes inside a tool.
- Long tab rows scroll horizontally on mobile without wrapping.

### Status

- Always combine color with text or an icon.
- A small dot may indicate connection state. It is never the only signal.
- Do not color entire cards for ordinary success states.

## 8. Page Templates

### Application Shell

The sidebar contains the brand, two primary workspaces, a persistent account
directory, and the account-management entry. Account-name clicks change the
focused role and open role details without connecting; checkboxes change the
shared batch selection used by explicit connect/disconnect controls. The top bar
contains the page title, theme control, and focused-role context when relevant.
Borders separate regions; backgrounds remain neutral.

### Account Management

Use a compact toolbar followed by a read-oriented account list. Import actions
live in one dialog/sheet. Connection state and last-used metadata are easy to
scan; opening this page never connects, refreshes, or removes accounts. Game
launch and role entry do not live on this page.

### Role Details

The role context is a compact horizontal strip, not a hero. Identity resources
form a flat summary band. Feature categories use underline tabs. Operational
modules use a consistent panel header, body, and footer action row.

### Batch Tasks

Use the persistent sidebar directory as the default account scope. Keep task
selection and execution/log state visible, and expose the detailed account,
group, sort, game-launch, and per-account settings panel on demand. Long-running
state must remain visible.

### Pushing Levels

Keep the board-like operational layout and reuse the shared sidebar batch
selection. Use fixed-format counters and controls, not marketing cards. Active
runs, failures, and depleted resources are distinct.

## 9. Responsive Behavior

- Breakpoints are content-driven; 900px is the shell transition point.
- Mobile navigation uses a sheet; the page never relies on a miniature sidebar.
- Toolbars wrap by command group. Icon-only actions remain 36x36px.
- Text never overlaps icons, status badges, or adjacent controls.
- Fixed-format exports keep their designed canvas width and do not inherit the
  mobile viewport.

## 10. Accessibility

- Meet WCAG AA contrast for text and controls.
- Maintain visible focus rings.
- Every control is keyboard reachable.
- Dialog focus is trapped and restored by the primitive layer.
- Loading, empty, error, disabled, and partial-result states are explicit.
- Motion respects `prefers-reduced-motion`.

## 11. Migration Plan

### Phase 1: Foundation and Primary Shell

- Add shadcn-vue configuration and shared utility.
- Add Button, Badge, Separator, Dropdown Menu, Sheet, and Tooltip primitives.
- Replace shell controls and establish NexT Console tokens.
- Restyle the single-role page and common operational panels.

### Phase 2: Active Workflows

- Migrate Token Management.
- Migrate Batch Tasks.
- Migrate Pushing Levels.
- Replace active dialogs, forms, tabs, tables, notifications, and progress UI.

### Phase 3: Legacy Removal

- Migrate or remove unrouted legacy views after an explicit inventory review.
- Remove all Naive UI and Arco imports.
- Remove UnoCSS after utility coverage is verified.
- Remove packages and obsolete global overrides.

## 12. Acceptance Criteria

- The shell and all active routes match the NexT Console tokens.
- No new feature imports a transitional UI library.
- Desktop widths of 1280px and 1440px have no overlap or horizontal page scroll.
- Mobile widths of 390px and 430px keep all primary workflows usable.
- Light and dark themes are both readable.
- Production build, targeted tests, lint, and browser screenshots pass after each
  migration phase.

## 13. Implementation Status

### Completed

- Shared neutral tokens, light/dark themes, and legacy token aliases.
- shadcn-vue Button, Badge, Separator, Dropdown Menu, Tooltip, Sheet, Dialog,
  Input, Textarea, Label, Checkbox, and Switch source components.
- Desktop shell, mobile navigation sheet, theme control, persistent account
  directory, and separate focused-role/batch-selection state.
- Single-role context, identity summary, primary tabs, common status panels, and
  club daily battle summary.
- Token Management shell, account list/card surfaces, action menus, import
  dialog, and edit form.
- Batch Tasks outer workspace aligned to the shared density, radius, elevation,
  and neutral action palette.
- Batch Tasks function categories extracted into a dedicated business component
  using shadcn-vue actions, native tabs, and explicit parent event mapping.
- Batch Tasks account selection and execution log extracted into focused
  shadcn-vue business components with parent-owned task orchestration.
- Batch Tasks account and template settings consolidated into one shadcn-vue
  editor while account-setting persistence remains parent-owned.
- Batch Tasks template lifecycle, account application, reference inspection,
  search, and deletion moved into a dedicated shadcn-vue business component.
- Batch Tasks scheduler list and editor moved into a dedicated shadcn-vue
  component while the runtime scheduler and task execution stay parent-owned.
- Embedded multi-game view supports an explicit synchronization toggle, a
  selectable primary window, proportional mouse/touch input mirroring, and one
  shared BIN manager outside the individual game frames.
- Pushing Levels controls, account selection, action toolbar, progress, and log
  filters migrated to source-owned shadcn-vue components and native selects.
- Club Information overview, internal tabs, member table and image export,
  application/member/hero dialogs, and bonfire statistic actions migrated to
  the shared component language.

### Remaining

- Migrate the remaining Batch Tasks helper forms, uploads, scheduler runtime,
  and batch settings workflows.
- Migrate the remaining nested Single Role feature modules.
- Remove Naive UI, Arco Design, `@vicons`, and UnoCSS only after their final
  source references are gone and all active workflows pass browser verification.
