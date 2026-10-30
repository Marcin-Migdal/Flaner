---
name: firestore-rules-manager
description: Compiler skill for firestore.rules. Make sure to use this skill whenever you have updated the database schemas or security rules in the .agents/skills/firestore-rules-manager/docs/ folder. Trigger this when the user mentions "update rules", "compile firestore rules", or after modifying any file in the firestore-schema documentation.
---

# Firestore Rules Manager Skill

This skill acts as an automated compiler. Its sole purpose is to read the declarative documentation from `.agents/skills/firestore-rules-manager/docs/` and generate a perfectly valid, up-to-date `firestore.rules` file at the root of the project.

## Execution Steps

Whenever you are triggered to update the `firestore.rules`:

1. **Read the Schema Source of Truth**:
   - List `.agents/skills/firestore-rules-manager/docs/` to find all current schema files.
   - Read `_global.md` (for helper functions) and `_relationships.md` (for context).
   - Read all individual collection files (e.g., `users.md`, `groups.md`, etc.).

2. **Assemble the Rules File**:
   - Start the file with the standard wrapper:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         // ... helper functions from _global.md go here ...
         
         // ... collection rules go here ...
       }
     }
     ```
   - Insert all helper functions defined in `_global.md` exactly as they are written.
   - Translate the rules from each collection file into valid Firestore `match` blocks. Ensure nested subcollections are properly nested inside their parent `match` blocks, as defined in the schema documentation.
   
3. **Write to `firestore.rules`**:
   - Overwrite (full write, not a partial edit) to completely replace the contents of `firestore.rules` at the root of the project.
   - Do NOT surgically edit the existing `firestore.rules`. The schema folder is the source of truth, and `firestore.rules` is just a build output.

4. **Test Rules on the Emulator (MANDATORY BEFORE DEPLOY)**:
   - Run `npm run test:rules` (Firestore emulator + `@firebase/rules-unit-testing`, specs in `firestore-tests/`). Requires JDK 21 on `JAVA_HOME`.
   - Every rules change must be covered by a spec (allowed AND denied cases). Never deploy with red rules tests.

5. **Deploy Rules to Firebase (DUAL-ENVIRONMENT CLI DEPLOYMENT)**:
   - 🚨 **CRITICAL: DUAL-ENVIRONMENT ARCHITECTURE**: We maintain two environments: **PROD** (`flaner-v2`) and **DEV / E2E** (`flaner-v2-dev`). Any change to security rules MUST be deployed to **BOTH** environments sequentially to maintain complete parity:
     ```bash
     # 1. Deploy to Production
     npx firebase-tools deploy --only firestore:rules --project flaner-v2

     # 2. Deploy to Development / E2E
     npx firebase-tools deploy --only firestore:rules --project flaner-v2-dev
     ```
     *(Note: On Windows PowerShell, use `npx.cmd firebase-tools deploy --only firestore:rules --project <project_id>`)*
     *(`.firebaserc` aliases: `--project prod` = `flaner-v2`, `--project dev` = `flaner-v2-dev`.)*
   - 🚨 **NEVER USE MCP `firebase_deploy`**: Do NOT use the MCP tool `firebase_deploy`, as it returns false-positive success without actually releasing the rules to cloud Firestore.
   - **Verification**: Always inspect the command output for both deployments to ensure each ends with `+ firestore: released rules firestore.rules to cloud.firestore` and `+ Deploy complete!`.

## Best Practices for Rules Compilation
- **Security First**: Ensure no `allow read, write: if true;` or similar insecure rules are generated unless explicitly documented in the schema.
- **Syntax Check**: Ensure all brackets `{}` and parentheses `()` are closed properly.
- **No Evaluation Errors in `||` Chains**: A runtime error (e.g. `get(...).data` on a missing document → `Null value error`) denies the whole rule, even if a later `||` branch would allow it. Helpers that read optional docs must be null-safe (see `getRole` / `hasRolePermission` in `_global.md`).
- **Collection Groups**: If a schema defines a rule for a collection group (e.g., `match /{path=**}/members/{memberDocId}`), place it clearly at the top or bottom of the collection match blocks, avoiding nesting it where it doesn't belong.

