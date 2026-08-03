---
name: vercel-project-setup
description: Script and instructions for properly deploying and configuring a new MFE in the Vercel dashboard for the Flaner project.
---

# Instructions for Configuring a New Vercel Project (MFE)

This skill contains the necessary steps to correctly deploy a new Micro-Frontend (MFE) project on Vercel and connect it to the working Flaner monorepo with Module Federation. Use it as a template to avoid previous configuration mistakes (e.g., incorrect Root Directory, Git issues, or forgotten configurations).

## 1. Understanding the Structure and Prerequisites
Before configuring Vercel, ensure that the new MFE (as an AI, you should handle this):
- Has a correct Vite configuration file (`vite.config.ts`) that flawlessly exposes the application via Module Federation.
- Has its own unique dev port and a unique name set.
- In the central project (`packages/core`), the environment variable has been correctly planned in the configuration (e.g., `VITE_MFE_NEWPROJECT_URL`), and the MFE module has been added to `vite.federation.ts` and the relevant routings.

## 2. What You Must Do Automatically (As AI)
When asked to add or deploy an MFE, make sure you have completed these steps for the project BEFORE asking the user to take action:
1. Update the environment files (e.g., `.env`, `.env.example`) in `core` with the new URL variable for this MFE (e.g., `VITE_MFE_COMMUNITY_URL`).
2. Add routing for this MFE in `packages/core/src/App.tsx` and appropriate entries to the side navigation (e.g., `ShellLayout.tsx`, `PageTilesView.tsx`).
3. Add type declarations for the remote module in `.d.ts` inside the `core` project.
4. **Critical:** Ensure that the newly added code and MFE project are added and committed to the Git repository (`git add` / `git commit`). Otherwise, Vercel (and the linked Git itself) will not "see" it!

## 3. Manual Instructions for the User
**WARNING:** After generating the code, ALWAYS copy and print the following list of steps in your final message that the USER must perform manually in the Vercel dashboard. As an AI, you do not have direct access to the user's Vercel account.

Pass **exactly the following text** to the user:

```markdown
### 🛠 What you need to do manually in Vercel:

1. **Create a new project in Vercel and connect it to Git**: 
   - Click "Add New... -> Project" and select the same **Flaner** repository from GitHub.
   - *VERY IMPORTANT*: You must ensure that the GitHub repository linked in Vercel actually contains the files for the new project. Pay attention to this!

2. **Correctly set the Root Directory**:
   - In the **Root Directory** configuration section, click *Edit* and make sure to point it to the correct subdirectory where the project is located, which is: `packages/NAME_OF_YOUR_MFE`.
   - *NOTE*: A common mistake is leaving it as the root directory of the repository - this will prevent Vercel from building the project correctly.

3. **Set the Build Command**:
   - Expand the *Build and Development Settings* section.
   - Toggle the **Override** switch next to *Build Command* and paste the command: `cd ../.. && npx nx run NAME_OF_YOUR_MFE:build`
   - Leave the *Output Directory* at its default value (`dist`).

4. **Environment Variables**:
   - Copy any necessary variables (such as Firebase config: `VITE_API_KEY`, `VITE_PROJECT_ID`, etc.) and add them in the *Environment Variables* settings for this new project on Vercel (if the project requires them).

5. **Configuration in the Main Host (Core)**:
   - After deploying the new MFE, copy its public domain URL (e.g., `https://flaner-mfe.vercel.app`).
   - Go to the `core` project on Vercel (often named with the main name `flaner`).
   - In the *Environment Variables* settings for `core`, add a new variable (e.g., `VITE_MFE_COMMUNITY_URL`) and paste the copied URL as its value (Remember: without a trailing slash `/` at the end!).
   - Perform a **Redeploy** of the `core` project so it pulls the new environment variable and recognizes the newly added project in Module Federation.
```
