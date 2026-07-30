---
name: firestore-rules-manager
description: Compiler skill for firestore.rules. Make sure to use this skill whenever you have updated the database schemas or security rules in the .agents/skills/firestore-rules-manager/docs/ folder. Trigger this when the user mentions "update rules", "compile firestore rules", or after modifying any file in the firestore-schema documentation.
---

# Firestore Rules Manager Skill

This skill acts as an automated compiler. Its sole purpose is to read the declarative documentation from `.agents/skills/firestore-rules-manager/docs/` and generate a perfectly valid, up-to-date `firestore.rules` file at the root of the project.

## Execution Steps

Whenever you are triggered to update the `firestore.rules`:

1. **Read the Schema Source of Truth**:
   - Use `list_dir` on `.agents/skills/firestore-rules-manager/docs/` to find all current schema files.
   - Use `view_file` to read `_global.md` (for helper functions) and `_relationships.md` (for context).
   - Use `view_file` to read all individual collection files (e.g., `users.md`, `groups.md`, etc.).

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
   - Use `write_to_file` (with Overwrite: true) to completely replace the contents of `firestore.rules` at the root of the project.
   - Do NOT try to use `replace_file_content` to surgically edit the existing `firestore.rules`. The schema folder is the source of truth, and `firestore.rules` is just a build output.

## Best Practices for Rules Compilation
- **Security First**: Ensure no `allow read, write: if true;` or similar insecure rules are generated unless explicitly documented in the schema.
- **Syntax Check**: Ensure all brackets `{}` and parentheses `()` are closed properly.
- **Collection Groups**: If a schema defines a rule for a collection group (e.g., `match /{path=**}/members/{memberDocId}`), place it clearly at the top or bottom of the collection match blocks, avoiding nesting it where it doesn't belong.
