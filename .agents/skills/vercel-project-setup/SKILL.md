---
name: vercel-project-setup
description: Comprehensive guide and automation patterns for setting up, deploying, configuring, and connecting Micro-Frontends (MFEs) or Host apps to Vercel in the Flaner Nx Monorepo with Module Federation. Make sure to use this skill whenever the user mentions "deploy to vercel", "vercel setup", "new MFE on vercel", "vercel envs", "configure vercel.json", "Vercel freeze", "missing dist directory on vercel", or "module federation vercel deployment".
---

# Vercel Project Setup & Deployment Guide

This skill provides unified instructions and automation patterns for deploying and configuring Micro-Frontends (MFEs) and the main Host (`core`) application on Vercel within the Flaner Nx Monorepo.

---

## 0. Environments (PROD vs DEV)

| | PROD | DEV |
| :--- | :--- | :--- |
| Git branch | `master` (`vercel deploy --prod`) | `develop` (Preview + `vercel alias set`) |
| Host URL | `https://flaner.vercel.app` | `https://flaner-dev.vercel.app` |
| Remote URLs | `https://flaner-<mfe>.vercel.app` | `https://flaner-<mfe>-dev.vercel.app` (aliased by the deploy workflow) |
| Firebase | `flaner-v2` (Vercel **Production** env vars) | `flaner-v2-dev` (Vercel **Preview** env vars) |

- Projects: `flaner` (host, root `packages/core`), `flaner-community`, `flaner-planning`, `flaner-settings`, `flaner-tools`, `flaner-shopping`.
- Every Preview deployment (any PR branch) uses DEV Firebase. Only `develop` has the stable `-dev` domains; a PR preview of the host loads remotes from the `-dev` domains.
- Host Preview vars `VITE_MFE_*_URL` point to the `-dev` domains; Production vars to the prod domains.
- Firebase Auth (Google sign-in) works only on authorized domains: `flaner-dev.vercel.app` is authorized in `flaner-v2-dev`, `flaner.vercel.app` in `flaner-v2`. Random PR preview URLs cannot sign in with Google.
- Flow: `feature/*` → PR to `develop` (check on DEV) → PR `develop` → `master` (release).
- **Deployment Protection is disabled on every project.** The host must fetch remotes cross-origin (a protected remote answers 302 to the Vercel login), and DEV is meant to be shared with testers. Data stays protected by Firebase Auth + security rules.
- **Brand-new project:** deploy `master` to production first. A first deployment from another branch can grab the production `*.vercel.app` domain.
- **Builds run in GitHub Actions, not on Vercel** (issue #107). Vercel Hobby allows 1 concurrent build, so 6 Git builds queued for ~12–15 min. `.github/workflows/deploy-vercel.yml` builds each app on its own runner (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`), so the Vercel slot is held only for the upload:
  - PR to `develop` / `master` → Preview of the affected apps (`nx show projects --affected --type app`); the URL shows in the PR as a GitHub deployment (`preview-<app>` environment).
  - push to `develop` → all apps to Preview, then `vercel alias set` to `flaner-dev` / `flaner-<mfe>-dev.vercel.app` (CLI deploys carry no Git branch, so branch domains don't follow).
  - push to `master` → all apps with `--prod`.
  - **Redeploy:** Actions → *Deploy Vercel* → *Run workflow* (all apps; `master` = PROD, `develop` = DEV domains, other branches = Preview only).
  - Branch protection requires the **Deploy result** job, not `Deploy <app>`: the matrix jobs exist only for affected apps, so an unaffected app's check would never report.
  - Needs repo secret `VERCEL_TOKEN`; org and project IDs are plain values in the workflow (not secret). A new app needs its name in `ALL` and its project ID in the `VERCEL_PROJECT_ID` map.
  - `NX_SKIP_NX_CACHE`: `VITE_*` vars come from Vercel and are not in the Nx task hash, so a cached build could ship another env's values.
  - **Fallback** if the Actions flow breaks: revert the #107 merge commit. It brings back `ignoreCommand` + `scripts/vercel-ignore.sh` and re-enables Git deploys. No dashboard setting was changed for #107 (Root Directory, env vars, domains stay as they were), so the revert alone restores the old flow.
- Env vars can be managed via `vercel api` (REST). In Git Bash set `MSYS_NO_PATHCONV=1`, otherwise `/v9/...` paths get rewritten to Windows paths.

## 1. Architecture & Module Federation Rules on Vercel

In our Vite + Module Federation architecture:
- Each MFE (`settings`, `community`, `planning`, `shopping`) and the main Host container (`core`) are deployed as **independent, separate projects on Vercel**.
- The Host (`core`) dynamically fetches each MFE's `remoteEntry.js` from its production URL at runtime.
- **Deployment sequence:**
  1. Deploy the **MFE Project** first to obtain its live URL (e.g. `https://flaner-planning.vercel.app`).
  2. Configure the **Host (`core`) Project** by setting the corresponding environment variable (e.g. `VITE_MFE_PLANNING_URL`) to that URL (without a trailing slash) and trigger a Redeploy on Core.

---

## 2. Standard `vercel.json` Configuration

Every subproject in `packages/<package-name>` MUST have its own `vercel.json` with the following standard configuration:

```json
{
  "buildCommand": "cd ../.. && npx nx run <PACKAGE_NAME>:build",
  "git": { "deploymentEnabled": false },
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-Requested-With, content-type, Authorization"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Key Rules for `vercel.json`:
1. **Root Location**: Place `vercel.json` inside the root of the specific package (e.g. `packages/planning/vercel.json`), NOT at the root of the monorepo.
2. **Build Command**: Use `cd ../.. && npx nx run <PACKAGE_NAME>:build`. This ensures Nx runs from the monorepo root.
2a. **No Git deploys**: `"git": { "deploymentEnabled": false }` stops Vercel from building on push; `deploy-vercel.yml` deploys instead (section 0). `vercel build` in Actions still reads `buildCommand`, `outputDirectory`, `headers` and `rewrites` from this file. There is no `ignoreCommand` any more: the workflow picks affected apps itself.
3. **CORS Headers**: `Access-Control-Allow-Origin: *` is strictly required for Module Federation remotes so the host can fetch `remoteEntry.js`.
4. **SPA Rewrites**: Always use regular expression `"/(.*)"` mapping to `"/index.html"` to avoid 404s on deep route refreshes. Never enable `"cleanUrls": true`.

---

## 3. Automated CLI Tasks by AI (Preventing CLI Freezes)

> ⚠️ **CRITICAL WARNING ON VERCEL CLI FREEZES:**  
> Running multiple sequential or chained `npx vercel env add` commands in the background terminal will freeze indefinitely waiting for interactive prompts (due to `VITE_` prefix warnings or environment selections).
> **NEVER** run chained interactive commands or spawn parallel CLI tasks for environment variables.

### Safe Bulk Environment Variable Injection Pattern
When setting up environment variables for a Vercel project via CLI, create a temporary `.cjs` script (`add_envs.cjs`) that uses `execSync` with `stdio: 'ignore'`, `--no-sensitive`, `--yes`, and `--non-interactive`.

```javascript
const { execSync } = require('child_process');
const path = require('path');

const targetDir = path.resolve(__dirname, 'packages/<PACKAGE_NAME>');
const coreDir = path.resolve(__dirname, 'packages/core');

const envs = [
  { name: 'VITE_API_KEY', value: '...' },
  { name: 'VITE_AUTH_DOMAIN', value: 'flaner-v2.firebaseapp.com' },
  { name: 'VITE_PROJECT_ID', value: 'flaner-v2' },
  { name: 'VITE_STORAGE_BUCKET', value: 'flaner-v2.firebasestorage.app' },
  { name: 'VITE_MESSAGING_SENDER_ID', value: '477065237058' },
  { name: 'VITE_APP_ID', value: '1:477065237058:web:416d3f0cb0ccdc9bb993db' },
  { name: 'VITE_MEASUREMENT_ID', value: 'G-PY8FZ4R5N7' },
  { name: 'VITE_CLOUDINARY_CLOUD_NAME', value: 'ddls9chw4' },
  { name: 'VITE_APP_NAME', value: 'Flaner' }
];

function addEnv(projectDir, envName, envValue) {
  const environments = ['production', 'preview', 'development'];
  for (const env of environments) {
    try {
      execSync(`npx vercel env add ${envName} ${env} --value "${envValue}" --no-sensitive --yes --non-interactive`, {
        cwd: projectDir,
        stdio: 'ignore'
      });
      console.log(`  ✓ Added ${envName} to ${env}`);
    } catch (e) {
      console.error(`  ✗ Failed to add ${envName} to ${env}:`, e.message);
    }
  }
}

try {
  // 1. Create/link project
  execSync('npx vercel link --yes --project flaner-<PACKAGE_NAME>', { cwd: targetDir, stdio: 'inherit' });

  // 2. Set variables
  for (const item of envs) {
    addEnv(targetDir, item.name, item.value);
  }

  // 3. Update Core Host with new MFE URL
  execSync('npx vercel link --yes --project flaner', { cwd: coreDir, stdio: 'inherit' });
  addEnv(coreDir, 'VITE_MFE_<PACKAGE_NAME_UPPER>_URL', 'https://flaner-<PACKAGE_NAME>.vercel.app');

  console.log('Setup finished successfully!');
} catch (err) {
  console.error('Setup failed:', err);
}
```

**Immediately delete `add_envs.cjs`** after execution (`del add_envs.cjs`) to prevent committing plaintext secrets to Git.

---

## 4. Manual Configuration Required by User in Vercel Dashboard

> 🚨 **Vercel CLI Limitation**: Vercel CLI currently **cannot** configure the **Root Directory** for new subprojects in an Nx monorepo via terminal arguments. It defaults to repository root (`.`), which causes `No Output Directory named "dist" found` build errors.

Always provide the user with these exact steps for the Vercel Dashboard:

```markdown
### 🛠️ Krok po kroku w Vercel Dashboard:

1. **Utwórz / Otwórz projekt w Vercelu**:
   - Wejdź na [Vercel Dashboard](https://vercel.com/dashboard).
   - Otwórz projekt `flaner-<PACKAGE_NAME>` (lub kliknij *Add New... -> Project* i wybierz repozytorium `Marcin-Migdal/Flaner`).

2. **Połącz z Git (jeśli projekt dodano przez CLI)**:
   - W zakładce **Settings ➔ Git**: Połącz repozytorium `Marcin-Migdal/Flaner`.

3. **Ustaw Root Directory (Kluczowe!)**:
   - W zakładce **Settings ➔ General**:
   - W sekcji **Root Directory** kliknij *Edit*, wpisz `packages/<PACKAGE_NAME>` i kliknij **Save**.

4. **Ustaw Build Command**:
   - W sekcji **Build and Development Settings**:
   - Włącz przełącznik **Override** przy **Build Command** i wklej:
     ```bash
     cd ../.. && npx nx run <PACKAGE_NAME>:build
     ```
   - **Output Directory**: Zostaw domyślne `dist`.

5. **Dodaj aplikację do workflow deployu**:
   - W `.github/workflows/deploy-vercel.yml` dopisz `<PACKAGE_NAME>` do `ALL` i Project ID (Settings ➔ General ➔ Project ID) do mapy `VERCEL_PROJECT_ID`.
   - Vercel sam nie buduje z Gita (`git.deploymentEnabled: false` w `vercel.json`), a pierwszy deploy produkcyjny zrób przez *Run workflow* na `master`.

6. **Wdrożenie i Redeploy w Core**:
   - W zakładce **Deployments** kliknij **Redeploy** na najnowszym commicie.
   - W projekcie `flaner` (Core) upewnij się, że w zmiennych środowiskowych istnieje `VITE_MFE_<NAME>_URL` wskazująca na wygenerowaną domenę (np. `https://flaner-<PACKAGE_NAME>.vercel.app`), i wykonaj **Redeploy** w `flaner`.
```

---

## 5. Firebase Authentication Domain Authorization

When deploying a new host domain or staging environment:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication ➔ Settings ➔ Authorized domains**.
3. Add the newly deployed custom domain (e.g. `flaner.vercel.app`, without `https://`).
4. Ensure Google OAuth redirect URI in Google Cloud Console contains:  
   `https://flaner-v2.firebaseapp.com/__/auth/handler`

---

## 6. Troubleshooting & Common Issues

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| `No Output Directory named "dist" found` | Vercel built at repo root instead of `packages/<NAME>` or build command failed | Set **Root Directory** to `packages/<NAME>` in Vercel Project Settings & verify build command is `cd ../.. && npx nx run <NAME>:build`. |
| Instant Build Failure (< 1s) | Monorepo Peer Dependency Mismatches (`ERESOLVE`) | Ensure `package.json` across workspaces have matching versions of `react`, `react-dom`, and `@tanstack/react-query`. |
| CORS error loading `remoteEntry.js` | Missing CORS headers in MFE `vercel.json` | Add `Access-Control-Allow-Origin: *` headers in the remote's `vercel.json`. |
| 404 on page refresh | Missing SPA fallback | Add `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` and remove `"cleanUrls"`. |
| Vercel CLI hanging / freeze | Interactive prompt lock on `vercel env add` | Use the `.cjs` script with `stdio: 'ignore'`, `--no-sensitive`, `--yes`, and `--non-interactive`. |
