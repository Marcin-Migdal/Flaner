# Flaner v2

Nx monorepo (npm workspaces): React 19 + Vite 8 + Module Federation, Firebase (Firestore + Auth), each app deployed separately to Vercel.

| Package | Role | Local port |
| :--- | :--- | :--- |
| `core` | Module Federation host (routing, i18n, service worker) | 4200 |
| `settings` | MFE | 4201 |
| `community` | MFE | 4202 |
| `shopping` | MFE | 4203 |
| `planning` | MFE | 4204 |
| `tools` | MFE (Spooler) | 4205 |
| `shared`, `ui-components`, `test-utils` | libraries (`@flaner/*`) | — |

Project rules, workflows and AI skills live in `.agents/` (see `CLAUDE.md` / `.agents/AGENTS.md`).

---

## 1. Local setup (fresh clone)

### Prerequisites
- **Node** `24.22.1` (`.node-version`) with npm 11.
- **JDK 21** with `JAVA_HOME` set. Required by the Firebase emulators (`dev:emulators`, `test:rules`, `e2e`).
- **Git**. On Windows the scripts are run from PowerShell or Git Bash.
- Optional: Firebase CLI is installed as a dev dependency (`npx firebase ...`); Vercel CLI only for env var management.

### Steps
1. Clone and install:
   ```bash
   git clone https://github.com/Marcin-Migdal/Flaner.git
   cd Flaner
   npm ci
   ```
2. Create `.env` (it is **not** in the repo):
   ```bash
   cp .env.example .env
   ```
   Fill in the values for the **DEV** Firebase project `flaner-v2-dev`:
   - `VITE_API_KEY` … `VITE_MEASUREMENT_ID`: Firebase console → `flaner-v2-dev` → ⚙️ *Project settings* → *General* → *Your apps* → Web app → *SDK setup and configuration* → *Config*.
   - `VITE_CLOUDINARY_CLOUD_NAME`: Cloudinary dashboard → *Cloud name*.
   - Leave `VITE_MFE_*_URL` commented out locally (the host falls back to `localhost:4201-4205`).

   The Firebase web config is public by design (security comes from Auth + Firestore rules), but `.env` stays out of git so DEV / PROD values cannot be mixed up.
3. AI tooling (Claude Code only): recreate the skills junction (PowerShell):
   ```powershell
   New-Item -ItemType Junction -Path .claude\skills -Target .agents\skills
   ```
4. Playwright browser (only for E2E):
   ```bash
   npx playwright install chromium
   ```

### Run
| Command | What it does |
| :--- | :--- |
| `npm run dev:emulators` | **Default for feature work.** All dev servers + Auth/Firestore emulators (`demo-flaner`, data kept in `.emulator-data/`) + rules compiler in watch mode. Overrides the Firebase values from `.env` with the emulator ones and deploys nothing. |
| `npm run dev` | All dev servers against the real **DEV** Firebase (values from `.env`). |

Open `http://localhost:4200`.

### Checks
| Command | What it does |
| :--- | :--- |
| `npx nx run <pkg>:lint --fix` | Lint a touched package |
| `npm run typecheck` | Typecheck all packages |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rules` | Firestore security rules tests on the emulator (JDK 21) |
| `npm run rules:build` / `npm run rules:check` | Compile `firestore.rules` from the spec / fail on drift (never edit `firestore.rules` by hand) |
| `npm run e2e` | Playwright against the emulators; starts emulators + dev servers itself. Needs free ports 4200–4205, 8080, 9099 |

---

## 2. Environments

| | PROD | DEV |
| :--- | :--- | :--- |
| Git branch | `master` | `develop` |
| Host URL | `https://flaner.vercel.app` | `https://flaner-dev.vercel.app` |
| Remotes | `https://flaner-<mfe>.vercel.app` | `https://flaner-<mfe>-dev.vercel.app` |
| Firebase project | `flaner-v2` (`--project prod`) | `flaner-v2-dev` (`--project dev`) |
| Vercel env vars | *Production* | *Preview* (all PR previews use DEV) |

Flow: `feature/*` → PR to `develop` → PR `develop` → `master`. Details: `.agents/workflows/01-feature-workflow.md`, `vercel-project-setup` skill.

---

## 3. Accounts, secrets and access

No secret value is stored in the repo. This is the inventory of everything a new maintainer needs access to, and where each secret lives.

### Firebase (`flaner-v2`, `flaner-v2-dev`)
- **Project members:** Firebase console → ⚙️ *Project settings* → *Users and permissions*. A maintainer needs *Owner* or *Editor* on both projects to deploy manually, manage Auth templates and create service-account keys. Give testers no project access — they only need an app account.
- **Authentication:** providers *Email/Password* and *Google* enabled. *Settings → Authorized domains*: `flaner.vercel.app` (PROD), `flaner-dev.vercel.app` (DEV), `localhost`. Random PR preview URLs cannot use Google sign-in.
- **Firestore rules / indexes:** deployed by GitHub Actions (below), not by hand.
- **CI service account** (one per project): Google Cloud console → *IAM & Admin* → *Service accounts*. Roles: *Firebase Rules Admin*, *Cloud Datastore Index Admin*, *Service Usage Consumer*. Its JSON key is stored only as the GitHub secret `FIREBASE_SERVICE_ACCOUNT` (see below).
- **Admin SDK key for local scripts** (`dev:wipe`, `backfill-usernames`): a personal, short-lived key kept outside the repo — see `.agents/docs/admin-scripts.md` (incl. revoking it afterwards).

### GitHub (`Marcin-Migdal/Flaner`)
| Where | Name | Value |
| :--- | :--- | :--- |
| *Settings → Environments → `firebase-dev`* | secret `FIREBASE_SERVICE_ACCOUNT` | CI service-account JSON of `flaner-v2-dev` |
| *Settings → Environments → `firebase-prod`* | secret `FIREBASE_SERVICE_ACCOUNT` | CI service-account JSON of `flaner-v2` |

- Used by `.github/workflows/deploy-firestore.yml` (push to `develop` → DEV, `master` → PROD, manual run on a feature branch → DEV). Without the secret the deploy step is skipped with a warning.
- `.github/workflows/ci.yml` needs no secrets (it runs against the `demo-flaner` emulator).
- Rotating a key: create a new key for the service account, paste the JSON into the environment secret, delete the old key in Google Cloud.

### Vercel
Six projects, each with *Root Directory* `packages/<pkg>` and *Build Command* `cd ../.. && npx nx run <pkg>:build` (setup steps: `vercel-project-setup` skill):
`flaner` (core), `flaner-community`, `flaner-planning`, `flaner-settings`, `flaner-shopping`, `flaner-tools`.

Environment variables (*Project → Settings → Environment Variables*), set on **every** project:

| Variable | Production | Preview |
| :--- | :--- | :--- |
| `VITE_API_KEY`, `VITE_AUTH_DOMAIN`, `VITE_PROJECT_ID`, `VITE_STORAGE_BUCKET`, `VITE_MESSAGING_SENDER_ID`, `VITE_APP_ID`, `VITE_MEASUREMENT_ID` | `flaner-v2` web config | `flaner-v2-dev` web config |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | same |

Additionally on the host project `flaner` only:

| Variable | Production | Preview |
| :--- | :--- | :--- |
| `VITE_MFE_SETTINGS_URL`, `VITE_MFE_COMMUNITY_URL`, `VITE_MFE_PLANNING_URL`, `VITE_MFE_SHOPPING_URL`, `VITE_MFE_TOOLS_URL` | `https://flaner-<mfe>.vercel.app` | `https://flaner-<mfe>-dev.vercel.app` |

- No trailing slash in URLs. A changed variable takes effect only after a redeploy.
- Deployment Protection is disabled on all projects (the host loads remotes cross-origin).
- Vercel team members: *Team → Settings → Members*.

### Cloudinary
- Account owner manages the cloud; the app needs only the **cloud name** (no API secret in the client).
- Unsigned upload presets used by the app: `flaner_avatars`, `flaner_product_icons` (*Settings → Upload → Upload presets*). Both must exist and be *Unsigned*.

---

## 4. Troubleshooting
`.agents/docs/troubleshooting.md`.
