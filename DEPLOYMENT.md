# Cloudflare Pages Deployment

Cloudflare Pages is the supported production target. The Vite build copies
`worker.js` to `dist/_worker.js`; Pages runs that file in Advanced Mode to serve
the application and proxy the required Weixin and Hortor API requests.

## Prerequisites

- A Cloudflare account with access to Workers & Pages.
- Access to the GitHub repository `seacity-laffey/xyzw_auto_helper`.
- Node.js and pnpm for local preview or direct deployment.

No application environment variables are currently required.

## Recommended: Git Integration

1. Open Cloudflare Dashboard, then go to **Workers & Pages**.
2. Create a Pages application and import
   `seacity-laffey/xyzw_auto_helper` from GitHub.
3. Configure the build:
   - Production branch: `main`, or `refactor/dev` while the redesign remains on
     that branch.
   - Build command: `pnpm run build`.
   - Build output directory: `dist`.
   - Root directory: `/`.
4. Save and deploy. Subsequent pushes to the production branch deploy
   automatically; other branches receive preview deployments.

The generated `dist/_worker.js` must be present in the build output. Without it,
the static UI can load, but the browser API proxy will not work.

## Local Cloudflare Preview

Run the Pages runtime locally instead of Vite's static preview:

```bash
pnpm run preview:cloudflare
```

The default local address is `http://localhost:8787`. This command builds the
project first and then starts Wrangler Pages with the generated Worker.

## Direct Deployment

Use direct deployment only for an existing Pages project or when Git integration
is intentionally not required. Cloudflare does not allow a Direct Upload project
to be converted to Git integration later.

Authenticate once:

```bash
pnpm dlx wrangler@4.120.1 login
```

Build and deploy the current Git branch:

```bash
pnpm run deploy:cloudflare
```

For an explicit preview branch:

```bash
pnpm run deploy:cloudflare --branch=refactor/dev
```

Wrangler reads the project name and output directory from `wrangler.toml`. On
first use, confirm that `xyzw-web-helper` is the intended Cloudflare Pages
project. Do not commit API tokens; CI credentials belong in the provider's
secret store.

## Verification

After deployment:

1. Open the deployment URL and navigate directly to an application route to
   verify SPA fallback.
2. Confirm an OPTIONS request to `/api/weixin` returns CORS headers.
3. Exercise token import against a non-production test account to verify the
   Worker proxy.
4. Use the Pages **Deployments** screen to roll back if any check fails.

## Windows Desktop

The Electron application packages the helper and game assets as a Windows x64
ZIP. Extract the entire archive and run `XYZWHelper.exe`; Node.js, Docker and
Cloudflare Worker are not required at runtime. See the
[desktop guide](desktop/README.md) for building, migration and scheduled tasks.

## Legacy Paths

- `docker/` is a static Nginx compatibility deployment. It does not execute the
  Cloudflare Worker or provide the API proxy, so proxy-dependent features are
  unavailable there. Build and start it with `docker/install.sh` on Unix-like
  systems or `docker/install.cmd` on Windows; the default address is
  `http://localhost:8080`.
- `server/` is not deployable. Only a historical `requirements.txt` remains;
  the Flask application referenced by older documentation is absent.
