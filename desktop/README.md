# Windows desktop preview

This target embeds the existing Vue/Vite application in Electron. It does not
need Node.js, Vite, Docker, a separate browser, or a Cloudflare Worker at runtime.
Remote game servers and resources still need a network connection.

## Build and run

Toolchain: Node.js 22 LTS, pnpm 10.19.0, Electron 44.2.0 and Electron Forge 7.11.2.
The exact dependency graph is committed in `pnpm-lock.yaml`; `.npmrc` selects the
hoisted layout required by Forge. On a development machine:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm desktop:dev
pnpm desktop:smoke
pnpm exec electron test/desktop-isolation.cjs
pnpm desktop:make:win
```

Electron 44 downloads its runtime on first use. If the official GitHub download
is unavailable, the following optional mirror configuration can be applied to
the current shell only. Do not disable checksum validation:

```sh
# macOS/Linux shell
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_CUSTOM_DIR='{{ version }}'
node node_modules/electron/install.js
pnpm desktop:make:win
```

```powershell
# Windows PowerShell
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_CUSTOM_DIR = '{{ version }}'
node node_modules/electron/install.js
pnpm desktop:make:win
```

`desktop:package:win` assembles the application directory only. `desktop:make:win`
also creates a ZIP under `out/make/zip/win32/x64/`. The directory is
`out/XYZWHelper-win32-x64/`, and its launcher is `XYZWHelper.exe`. Extract the
**entire** ZIP before launching; the EXE depends on the other files alongside it.
All desktop build commands rebuild local assets before assembly. Web commands
remain `pnpm dev` / `pnpm build`; only the web build copies the optional Worker.

This is an unsigned x64 preview. Windows 11 x64 is the initial acceptance target;
minimum Windows version and ARM64 support are not yet certified. macOS can build
a Windows package, but that is not evidence that it runs correctly on Windows.
No installer, signing, updater, hosted CI or Android project is included.

## Isolated game windows and attribution

The helper keeps its existing `xyzw://app` profile. Each desktop game frame gets
a new `xyzw://game-<UUID>` origin registered to its owning helper window. That
origin serves only packaged game assets; helper pages and login proxy routes are
unavailable there. The helper origin no longer serves `/game/` assets. Paths are
normalized before checking this boundary, including repeated/encoded slashes.

The parent sends only the selected frame's prepared BIN after checking the actual
message sender, exact origin and bound account ID. The game bootstrap exposes
that one BIN to the existing loader through an in-memory storage adapter; it
does not copy the helper's account database or write the BIN to game localStorage.
Game code still receives its own login data. The main process registers origins
but never receives the BIN through IPC. Mouse/touch synchronization and protocol
observation use the same validated frame bindings.

Closing a frame revokes its origin and clears its local storage; closing or
reloading its helper window revokes all origins it owns. Reopening a game creates
a fresh origin, so game-local cache and script-tool preferences are temporary.
The helper's accounts, schedules and configuration retain their existing storage.
The desktop BIN manager imports a BIN matching the target account's BIN hash;
refresh transfers the selected BIN again. Clearing the loader's BIN cache requires
confirmation and does not delete accounts from Account Management.

The helper CSP allows packaged scripts only and prevents embedding helper pages.
Game frames are sandboxed against popups/top-level navigation, cannot embed other
frames, and have no Node/preload APIs. Game-only CSP exceptions permit the game's
existing script decoding and inline script tool. These exceptions do not apply
to the helper. Neither storage encryption nor code signing is added in 2.0.1.

About is available at the bottom of the sidebar, including its collapsed and
mobile forms. It contains a short upstream attribution and the upstream repository
link. External links pass through an exact main-process allowlist.
Project `LICENSE`, `NOTICE.txt` and `THIRD_PARTY_NOTICES.txt` are included both in
the application archive and in the release's `resources/` directory, alongside
Electron's separate runtime license files. Regenerate dependency notices after
dependency changes with `node desktop/generate-notices.cjs`; the script reads the
installed production tree without fetching packages. Upstream license supplements
are recorded under `desktop/license-notices/`, including explicit notes where an
upstream package declares a license but supplies no separate license file.

## Storage and migration

Application identity: `com.xyzw.helper`. Origin: `xyzw://app`. Windows data lives
in `%APPDATA%\XYZWHelper`; macOS development data lives in
`~/Library/Application Support/XYZWHelper`. Neither includes the version or EXE
location, so moving/upgrading the extracted application preserves its profile.
Do not delete this directory when upgrading. Close the app before replacing its
application directory. Browser profiles are not imported automatically.

Open Account Management -> Full data backup and migration (`/migration.html`).
This standalone page stops the current window's task runtime; the desktop also
closes its game windows when entering it. Close other browser tabs before using
it on the web. Export from the updated web application, then import in desktop.
The backup contains all localStorage strings and both supported IndexedDB
schemas (`xyzw.tokens`, `xyzw_token_db.kv`, `xyzw_token_db.gameTokens`), preserving
ArrayBuffers, Dates and undefined fields. Existing account-only JSON and BIN
import/export remain available.

Import validates the complete envelope before writes, merges records by key,
and overwrites matching keys after confirmation. It does not remove unrelated
records. The importer keeps an in-memory snapshot and attempts rollback on a
write failure; this is not a cross-database crash-atomic transaction. Export a
backup first. Imports are limited to 64 MB. Backup files contain login credentials
and must be kept private. Reloading Account Management applies imported settings;
enabled schedules become active again at that point.

Chromium file inputs open native file selection dialogs. Existing blob/data-URL
exports (images, protocol JSON and account JSON) use the session's native save
dialog. Download failures are reported without logging the file contents.

## Lifecycle

There is one persistent batch runtime in the main desktop application shell. It
starts with the app and survives navigation, including the full-screen game
route. Additional game windows cannot navigate into another helper scheduler.
The web target retains its existing page-owned lifetime.

- Minimize/obscure: continue timers and network activity while the OS is awake.
- Close the main window (or Application -> Exit on macOS): stop the process and its tasks.
- Close a secondary game window: stop only those frames.
- No tray/background-after-close behavior is promised in this preview.
- Sleep/process exit/shutdown: no execution. A timer gap over 60 seconds, or a
  backwards clock jump, skips the recovery minute; missed slots are not replayed.
- A busy batch delays consideration only within the current minute. Tasks are
  not queued for replay after their minute has passed. Due schedules and their
  selected functions execute serially. Failures are logged; a dispatched slot is
  not retried automatically. Existing connection helpers handle reconnects.
- A running task is never unlocked merely because ten minutes elapsed. A stuck
  network operation must settle or the user must explicitly stop/exit.
- Full reload/backup navigation stops current work. Configured auto-refresh waits
  for the batch runtime to be idle. Other pages' manual operations and remote
  server behavior are outside the scheduler's mutual-exclusion guarantee.

## Scheduling templates and unavailable periods

The scheduler offers three read-only system templates: reset bottles every 420
minutes, claim idle rewards then add idle time every 485 minutes, and claim
legacy fragments every 360 minutes. Fragment claims use the same task as the
one-click action and check the current server state for feature unlock. Templates
create no jobs or account selections automatically. Choose a template, select
accounts and save to create a normal user-managed scheduled task.

All templates initialize weekly unavailable periods to Saturday 19:50–21:00
and Sunday 19:50–20:30, using the machine's local time. Every scheduled task can
configure its own weekly periods, including periods that cross midnight. A run
inside a period moves to five minutes before that period begins. Overlapping
periods are combined; if the adjusted time is also unavailable, it moves earlier.
The task list shows both the actual time and the original time when adjusted.

Fixed intervals retain a persisted minute-aligned anchor from initial activation.
An early run does not shift subsequent planned slots. Missing the early slot
while the app is closed or sleeping does not replay it at the original time.
Unavailable periods prevent starting that scheduled task, including its manual
Run now action, and are checked again before each selected function begins.

## Security and diagnostics

Node integration is off; sandbox, context isolation and web security remain on.
The preload exposes desktop/window-role flags, game-origin allocation/release
and allowlisted About links. All IPC verifies the trusted top-level sender;
there are no filesystem, HTTP or arbitrary IPC methods. Game frames do not
receive the preload bridge.
Only exact login endpoints and methods are forwarded to fixed HTTPS upstreams;
redirects are rejected and upstream cookies are not copied into the local origin.
Filesystem serving is confined to the built assets, with explicit SPA routes.
External popup/navigation and webview creation are denied.

On macOS, Application -> Runtime status records aggregate process CPU/memory and displays
the version and data directory. `desktop.log` records start, sleep/resume,
renderer failures and download result states; it rotates at 2 MiB to
`desktop.log.previous`. It deliberately omits credentials, request URLs and game
console/protocol messages. The Windows build has no application menu bar. Use DevTools interactively when diagnosing a login;
do not share token-bearing console output.

## Verification boundary

The user accepted version 2.0.3 after testing on 2026-09-11. Automated tests cover
reward eligibility, scheduling, storage and game-window isolation. The smoke
commands use fresh temporary profiles and synthetic data, not real accounts;
macOS smoke checks alone do not establish Windows or live game compatibility.
