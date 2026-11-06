# Firebase Auth email templates

Firebase console → Authentication → Templates. DEV (`flaner-v2-dev`) and PROD (`flaner-v2`) both use the **default templates**.

## Why no custom template

Free (Spark) plan only: no SMTP provider, emails are sent from `noreply@<project>.firebaseapp.com`. Saving any template change (even just the sender name or subject) fails with:

> Email template updates are currently unavailable for this project. For assistance with template changes, contact Firebase Support.

So the message text and look stay Firebase's defaults: English only, greeting `Hello ,` (email sign-ups have no Auth display name), `%APP_NAME%` = the project's public-facing name.

## Language

The app sets `auth.languageCode` to the login page language before sending (`AuthContext` → `sendVerificationEmail`). With the default template this localises Firebase's hosted action page that the link opens, not the email itself.

## Email address verification

Sent after an email/password sign-up and on "Resend email" from the login page. The link's continue URL is `<origin>/login`, where the app lets the user in once verified (#38).
