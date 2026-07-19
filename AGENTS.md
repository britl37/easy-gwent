# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript npm workspace for a browser Gwent clone. Main packages:

- `packages/data`: card definitions, text, shared types, and faction lists.
- `packages/engine`: pure rules, state transitions, scoring, setup, and protocol types.
- `packages/ai`: AI heuristics.
- `packages/client`: React + Vite UI, screens, components, helpers, and CSS.
- `packages/server`: HTTP/WebSocket server, auth, rooms, stats, and SQLite access.

Tests are colocated in `packages/*/test/**/*.test.ts`. Card art is fetched into `assets/cards/` and is not committed; card text JSON is committed in `packages/data/src/card-text.json`. Utility scripts live in `scripts/`.

## Build, Test, and Development Commands

- `npm install`: install workspace dependencies.
- `npm test`: run all Vitest tests matching `packages/*/test/**/*.test.ts`.
- `npm run dev:server`: run the server on `127.0.0.1:8787` with `tsx watch`.
- `npm run dev`: run the Vite client, usually on port `5173`.
- `npm run build`: fetch missing card images, then build packages.
- `npm run build:code`: build packages without fetching images.
- `npm run fetch-assets`: populate `assets/cards/` from `scripts/asset-manifest.json`.
- `npm run build-card-text`: refresh committed card text data when needed.

## Coding Style & Naming Conventions

Use strict TypeScript with ES modules. Import workspaces as `@gwent/engine` and include `.ts` extensions for local relative imports. Prefer pure functions in `engine`; keep browser/server side effects in `client` or `server`. Existing files use two-space indentation, single quotes, semicolons, `camelCase` functions/variables, `PascalCase` React components, and uppercase constants for fixed lists.

## Testing Guidelines

Vitest is the test runner. Add focused tests beside the package you change, using `*.test.ts` names. Engine and data changes should usually include regression coverage; card-data snapshots live under `packages/data/test/__snapshots__/`. Run `npm test` before submitting changes, and run package builds when touching exported types or integration paths.

## Commit & Pull Request Guidelines

Recent commits use concise imperative subjects, often with details after a colon, for example `Fix deck editor traps: auto-save drafts...`. Keep commits focused on one behavior change.

Pull requests should describe gameplay/UI/server impact, list tests run, and call out asset or data regeneration commands. Include screenshots for visible client changes and mention deployment or SQLite migration considerations for server changes.

## Security & Configuration Tips

Do not commit fetched card images, local databases, logs, secrets, or production config. Treat `server.log` and SQLite files as local artifacts. Keep generated data changes reviewable by separating them from unrelated code edits.

## VPS Operations

The production VPS also runs a WireGuard server. Deployment, maintenance, firewall, networking, package, and service-management actions must not interrupt WireGuard connectivity. Before changing system services, ports, firewall rules, routing, kernel/network packages, or reboot behavior, verify the impact on WireGuard and preserve access for connected users.
