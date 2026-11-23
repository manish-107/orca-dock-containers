# Docker Containers for Orca

Docker containers and images in Orca's right sidebar, like VS Code's Docker view.

- **Containers**, grouped by Compose project, with lone containers under "Individual Containers". Green ▷ running, red ■ stopped, plus Docker's status ("Up 5 hours (healthy)").
- Right-click a container: **View Logs** (opens an Orca terminal with `docker logs -f`), **Inspect**, **Start** / **Stop** / **Restart**, **Remove…**
- **Images**, grouped by repository → tags with their age. Right-click: **Inspect**, **Remove…**

## How it stays light

- The worker talks to the Docker socket with Node's `node:http`. No `docker` process per call, and no runtime dependencies.
- No polling. One `/events` connection pushes changes, and only the changed section reloads.
- A closed section makes no Docker calls. With the panel hidden, the worker gets no calls, so Orca stops it after about 5 minutes.
- No framework in the panel: plain TypeScript and DOM, compiled by Orca when it loads. No build step.

## Layout

```
src/
├── worker.ts              worker entry: wires the Docker client to each feature
├── protocol.ts            requests that belong to no feature (docker.ping)
├── docker/                worker only: socket client, /events watcher, socket lookup, errors
├── features/
│   ├── context.ts         what every feature's worker side receives
│   ├── containers/        types.ts · model.ts · handlers.ts · view.ts · model.test.ts
│   └── images/            same shape
├── ui/                    panel building blocks: section, tree, context menu, confirm, details, notice
└── panel/                 index.html · main.ts (panel entry) · styles.css
```

Each feature folder has:
- `types.ts`: its requests and events
- `model.ts`: plain functions shared by both sides, tested without Docker
- `handlers.ts`: worker side
- `view.ts`: panel side

Rules:
- The panel never imports `docker/` or any `handlers.ts`, because they use Node.
- The worker never imports `view.ts` or `ui/`.
- Features don't import each other.

### Adding a feature

1. Create `src/features/<name>/` with the four files above.
2. Add `register<Name>` to `FEATURES` in `src/worker.ts`.
3. Add `<name>Section()` to `SECTIONS` in `src/panel/main.ts`.

## Develop

```sh
npm install                # dev tools only: typescript, @types/node
npm run typecheck          # tsc -p .
npm test                   # orca plugin test .
npm run validate           # orca plugin validate .
npm run dev                # orca plugin dev watch . : loads into Orca, reloads on save
```

The first load asks for approval: re-run with the `--approve <fingerprint>` Orca prints. The plugin asks for:
- `workspace:read`: to find the focused workspace for log terminals
- `terminal:send`: to open the log terminal

Docker socket lookup: `DOCKER_HOST=unix://…`, then `/var/run/docker.sock`, rootless Docker, Docker Desktop, Colima and OrbStack. TCP and SSH hosts are not supported yet.
