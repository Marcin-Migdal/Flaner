---
name: firebase-auth-popup-fix
description: Troubleshooting guide for resolving Google Firebase authentication popup failures (signInWithPopup) on deployed staging or production environments. Use this skill when login popup doesn't open, closes instantly, or throws cross-origin/domain-related authentication errors on deployed sites.
---
# Firebase Auth Popup Fix Skill

When deploying an application that uses Google/Firebase Authentication via `signInWithPopup`, it is common for the popup to fail to load, immediately close, or throw errors in production (while working fine on localhost). Use this guide to resolve it.

## 1. Firebase Console (Authorized Domains)

Firebase Auth restricts popup redirects to whitelisted domains for security.
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project and navigate to **Authentication -> Settings**.
3. Under the **Authorized domains** section, verify if your deployed custom domain (e.g. `spooler.vercel.app` or `mycustomdomain.com`) is listed.
4. If not, click **Add domain** and enter your production and staging domains.

---

## 2. Google Cloud Console (OAuth Client IDs)

Google OAuth needs to recognize the Firebase redirect handler domain.
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select the Google Cloud project corresponding to your Firebase project.
3. Go to **APIs & Services -> Credentials**.
4. Under **OAuth 2.0 Client IDs**, edit the **Web client** credential (automatically created by Firebase).
5. In the **Authorized redirect URIs** section, ensure the following URI is present:
   `https://<your-firebase-project-id>.firebaseapp.com/__/auth/handler`
   *(Replace `<your-firebase-project-id>` with your actual Firebase project ID).*

---

## 3. Verify `authDomain` in Firebase Config

Ensure the web app configuration initializes Firebase with the correct `authDomain`.
- By default, it should point to `<project-id>.firebaseapp.com`.
- Do **NOT** change `authDomain` to your custom deployed Vercel domain unless you have set up a custom proxy server on that domain to route Firebase OAuth requests. Firebase uses the default `firebaseapp.com` subdomain to handle popup redirects safely.

Example correct configuration:
```typescript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "my-project-id.firebaseapp.com", // Correct default handler
  projectId: "my-project-id",
  // ...
};
```

---

## 4. Code-Level Fallback to Redirect

Some browsers (especially mobile Safari/Chrome, or users with strict pop-up blockers) will block the pop-up window entirely. Implement a fallback that automatically switches to redirection when popup is blocked.

### Robust Login Pattern:
```typescript
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, type Auth } from 'firebase/auth';

export const loginWithGoogle = async (auth: Auth, provider: GoogleAuthProvider): Promise<void> => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.warn("Popup authentication failed or was blocked. Retrying with redirect...", error);
    
    // Check if error is due to popup blocked/closed
    const isPopupError = 
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request';

    if (isPopupError) {
      await signInWithRedirect(auth, provider);
    } else {
      throw error;
    }
  }
};
```


---
name: vercel-configuration
description: Guidelines for Vercel configuration (vercel.json) in SPA applications, especially in monorepos using Module Federation. Triggers whenever the user mentions Vercel configuration, vercel.json, 404 errors on page refresh, rewrites, redirects, cleanUrls, CORS issues, or deploying multiple apps/remotes on Vercel.
---

# Vercel Configuration Guidelines

This skill provides unified guidelines for writing and troubleshooting `vercel.json` configuration files, particularly for Single Page Applications (SPA), monorepos, and Module Federation.

## Debugging Instant Build Failures

If a Vercel deployment fails instantly (e.g., 0ms or <1s build time) and there are no logs for the build step, it is almost always due to **NPM Peer Dependency conflicts** (`ERESOLVE`). 
* Vercel uses strict `npm install` on the cloud which immediately aborts if peer dependencies (like `react` or `react-i18next`) are mismatched between workspaces in a monorepo. 
* Local environments often hide this if packages were previously installed or if `--legacy-peer-deps` was used. Ensure all package peer dependencies match the root versions exactly.

## SPA Routing & Page Refresh (404 Prevention)

When deploying a Single Page Application (SPA) using client-side routing (React Router, Vue Router, etc.) on Vercel, reloading the page at nested URLs (e.g., `/settings` or `/login`) will cause a **404: NOT_FOUND** error unless rewrites are correctly configured.

### 1. Disable `cleanUrls`
* **Rule**: Set `"cleanUrls": false` or omit it entirely in `vercel.json` for SPAs.
* **Why**: When `"cleanUrls": true` is enabled, Vercel tries to match the path to a physical file (e.g., `/login` maps to `/login.html` or `/login/index.html`). Since SPAs serve everything via `/index.html` and have no physical page files, this causes Vercel to bypass your rewrite rules and immediately return a server-level 404.

### 2. Use the Recommended SPA Catch-All Rewrite
* **Rule**: Use the regular expression `/(.*)` pattern for the catch-all SPA rewrite.
* **Why**: The default Vite/React Router configuration should rewrite all paths back to `/index.html`. Using `/:path*` is prone to failing on deep nested routing in subdirectory contexts.
* **Format**:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Module Federation & CORS Headers

If a project acts as a Remote or Host using Module Federation (e.g., loading `remoteEntry.js` from another domain), Vercel must be configured to allow Cross-Origin resource sharing.

* **Rule**: Configure wildcard CORS headers (`Access-Control-Allow-Origin: *`) specifically on the remote projects.
* **Format**:
```json
{
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
  ]
}
```

**CRITICAL NOTE FOR REMOTE URLs**: Do not assume the Vercel alias URL is exactly `https://[project-name].vercel.app`. Since the `.vercel.app` domain is global, project names might already be taken by other users. If taken, Vercel appends the team name or random characters (e.g. `https://flaner-community-marcinmigdals-projects.vercel.app`). Always ask the user for the actual URL or check via `vercel ls` before injecting it into the host app's environment variables (`VITE_MFE_..._URL`).

---

## Monorepo Project Structure & Vercel CLI Workflows

When using monorepos (such as Nx, Turborepo, or Yarn Workspaces) where each application is deployed as a separate project on Vercel:

1. **Location**: Place the `vercel.json` file inside the **Root Directory of the specific package/application** (e.g., `packages/core/vercel.json`), NOT at the absolute root of the monorepo.
2. **Build Command**: Define the build command relative to the project directory or run commands from the workspace root by stepping out (e.g., `cd ../.. && npx nx run core:build`).

### Creating & Configuring Projects via Vercel CLI
You can create a new project via CLI by navigating to the package directory and running:
```bash
npx vercel link --yes
npx vercel project rename old-name new-name
```
To connect the GitHub repository so deployments happen automatically on push:
```bash
npx vercel git connect https://github.com/org/repo.git --yes
```

### 🚨 Manual Configuration Required by User (Root Directory)
Vercel CLI currently **does not support** setting the `Root Directory` via terminal arguments for new monorepo subprojects. It will default to the repository root (e.g. `.`). 
**Therefore, whenever you create a new Vercel project via CLI, you MUST explicitly instruct the USER to do the following manually:**
1. Log in to Vercel Dashboard and open the new project.
2. Go to **Settings** -> **General** -> **Root Directory**.
3. Change it to the correct path (e.g., `packages/community`) and **Save**.
4. Trigger a **Redeploy** on the latest commit.

---

## CLI Automations & Environment Variables (Preventing CLI Freezes)

When automating Vercel configurations (like adding environment variables in bulk via Vercel CLI), executing single `vercel env add` commands sequentially or in parallel background tasks can easily trigger interactive prompt locks and cause execution freezes.

### Rules for Safe CLI Automations

1. **Avoid Parallel CLI Spawns**: Spawning multiple parallel `vercel env add` commands can trigger API limits or prompt collisions. Always execute them sequentially.
2. **Use Synchronous Execution**: Run commands using synchronous executors (e.g., `child_process.execSync` in Node.js) to guarantee execution order and clean exit states.
3. **Set Non-Interactive Flags**: Always append `--yes` and `--non-interactive` flags to bypass confirm dialogues, warnings (e.g., VITE prefix warnings), and auth prompts.
4. **Link First**: Execute `vercel link --yes --project <project-name>` inside the target subdirectory before adding environment variables, ensuring the CLI is contextually locked to the target Vercel project.
5. **Use `.cjs` Extension**: If the monorepo uses `"type": "module"` in `package.json`, name your temporary script `add_envs.cjs` instead of `.js` so that `require('child_process')` does not throw an ESM error.

### Recommended Bulk Add Pattern (Node.js Script)
Create a temporary `add_envs.cjs` script and run it via `node add_envs.cjs`:

```javascript
const { execSync } = require('child_process');

const envs = [
  { name: 'VITE_API_KEY', value: '...' },
  { name: 'VITE_PROJECT_ID', value: '...' }
];

function addEnv(projectDir, envName, envValue) {
  const environments = ['production', 'preview', 'development'];
  for (const env of environments) {
    try {
      execSync(`npx vercel env add ${envName} ${env} --value "${envValue}" --yes --non-interactive`, {
        cwd: projectDir,
        stdio: 'ignore' // Prevents interactive prompts from freezing execution
      });
      console.log(`  ✓ Added ${envName} to ${env}`);
    } catch (e) {
      console.error(`  ✗ Failed to add ${envName}:`, e.message);
    }
  }
}

// 1. Link project (if not already linked)
// execSync('npx vercel link --yes --project my-vercel-project-name', { cwd: 'packages/my-app', stdio: 'inherit' });

// 2. Set variables
for (const item of envs) {
  addEnv('e:/path/to/packages/my-app', item.name, item.value); // Use absolute paths for cwd safety
}
```
Remove the temporary script immediately after execution using `cmd /c del add_envs.cjs` to avoid committing sensitive plaintext secrets to repository logs.

