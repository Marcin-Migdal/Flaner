---
name: translations
description: Architecture guide for setting up decentralized translation namespaces and hooks for each Micro-Frontend (MFE). Make sure to use this skill whenever you need to configure i18next loadPath, manage translation JSON files across multiple apps, or create custom MFE translation hooks like useCommunityTranslations. Trigger this when the user asks about "translation architecture" or "adding translations to a new MFE."
---

# Decentralized Translations (MFE Namespaces) Skill

This skill outlines how to configure decentralized translation files (PL/EN) for each Micro-Frontend (MFE) in a Module Federation setup, using dynamic load paths and custom, MFE-specific translation hooks.

---

## 1. Directory Structure

Each MFE application manages its own translation assets under its respective `public` folder. 
The namespaces MUST correspond to the MFE name (e.g., `settings`, `community`, `shopping`, `scheduling`).

Example for `apps/community`:
```
apps/community/public/locales/
├── en/
│   └── community.json
└── pl/
    └── community.json
```

Example for `apps/core` (Host):
```
apps/core/public/locales/
├── en/
│   └── common.json
└── pl/
    └── common.json
```

---

## 2. Dynamic i18n Configuration in Core

To load the remote translation files correctly at runtime (both in development on different ports, and in production), configure `i18next-http-backend` in the Core host with a dynamic `loadPath` function.

### Implementation:
Create/update `apps/core/src/i18n/i18n.ts`:
```typescript
import i18n from 'i18n';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Dynamic URLs for MFEs from env variables
const MFE_URLS: Record<string, string> = {
  settings: import.meta.env.VITE_MFE_SETTINGS_URL || 'http://localhost:4201',
  community: import.meta.env.VITE_MFE_COMMUNITY_URL || 'http://localhost:4202',
  shopping: import.meta.env.VITE_MFE_SHOPPING_URL || 'http://localhost:4203',
  scheduling: import.meta.env.VITE_MFE_SCHEDULING_URL || 'http://localhost:4204',
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'settings', 'community', 'shopping', 'scheduling'],
    interpolation: { escapeValue: false },
    backend: {
      loadPath: (lngs: string[], namespaces: string[]) => {
        const ns = namespaces[0];
        const mfeUrl = MFE_URLS[ns];
        if (mfeUrl) {
          // Fetch from MFE host
          return `${mfeUrl}/locales/{{lng}}/{{ns}}.json`;
        }
        // Fallback to Core common locales
        return '/locales/{{lng}}/{{ns}}.json';
      },
    },
  });

export default i18n;
```

---

## 3. Custom MFE Translation Hooks

To avoid manual namespace specification in every translation call (e.g. `t('community:friends.add')`), each MFE MUST export a custom translation hook. This hook locks in the default namespace for that remote application.

### Hook Template:
Create `use<MfeName>Translations.ts` (e.g. `apps/community/src/hooks/useCommunityTranslations.ts` or in the shared hooks library):
```typescript
import { useTranslation } from 'react-i18next';

export const useCommunityTranslations = () => {
  return useTranslation('community');
};
```

### Component Usage:
Inside MFE `community` components:
```typescript
import { useCommunityTranslations } from './hooks/useCommunityTranslations';

export const AddFriendButton = () => {
  const { t } = useCommunityTranslations();

  return (
    <button>
      {t('friends.addButton')} {/* Automatically resolves to community:friends.addButton */}
    </button>
  );
};
```

---

## 4. Key Rules for Decoupled Translations
1. **Never import hooks across MFEs**: Do not import `useCommunityTranslations` in the `settings` MFE. Keep them isolated.
2. **Use `common` namespace in Host only**: Keep global app strings (like "Confirm", "Cancel", "Save") in the `common.json` file inside `apps/core/public/locales/`. These can be translated with the default `useTranslation()` hook in Core.
3. **CORS for Development**: In the MFE Webpack/Rspack configurations, ensure that headers are set to allow CORS (`Access-Control-Allow-Origin: *`) so the host can fetch the local MFE JSON files.
