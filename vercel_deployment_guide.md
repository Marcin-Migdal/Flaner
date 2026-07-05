# Instrukcja wdrożenia Flanera na Vercel (Core & Settings)

Ta instrukcja opisuje krok po kroku, jak skonfigurować i wdrożyć dwa pierwsze projekty (**Settings** i **Core**) na Vercelu w architekturze monorepo z Module Federation.

---

## Ważna zasada Module Federation na Vercelu
Każdy podprojekt (MFE) oraz główny kontener (`core`) muszą być zarejestrowane jako **oddzielne projekty na Vercelu**. Dzięki temu mają osobne domeny, a `core` pobiera dynamicznie plik `remoteEntry.js` z domeny produkcyjnej `settings`.

**Wdrażamy w kolejności:**
1. Najpierw **Settings** (MFE) — musimy uzyskać jego adres URL.
2. Potem **Core** (Host) — podamy mu adres Settings w zmiennych środowiskowych.

---

## KROK 1: Wdrożenie projektu `settings` (MFE)

1. Wejdź na [Vercel Dashboard](https://vercel.com/dashboard) i kliknij **Add New...** -> **Project**.
2. Wybierz swoje repozytorium **Flaner** z GitHuba.
3. W ustawieniach konfiguracji projektu zmień następujące opcje:
   - **Project Name:** `flaner-settings` (lub dowolna inna nazwa)
   - **Root Directory:** Kliknij *Edit* i wybierz `packages/settings`.
   - **Framework Preset:** Wybierz **Vite** (lub zostaw **Other**).
4. Rozwiń sekcję **Build and Development Settings**:
   - Zaznacz przełącznik **Override** przy **Build Command**.
   - Wpisz komendę:
     ```bash
     cd ../.. && npx nx run settings:build
     ```
   - **Output Directory:** Zostaw domyślne `dist` (ponieważ buduje się w `packages/settings/dist`).
5. Rozwiń sekcję **Environment Variables** (Zmienne Środowiskowe) i dodaj zmienne z Firebase/Cloudinary (są wymagane przez formularze i akcje w settings):
   - `VITE_API_KEY`
   - `VITE_AUTH_DOMAIN`
   - `VITE_PROJECT_ID`
   - `VITE_STORAGE_BUCKET`
   - `VITE_MESSAGING_SENDER_ID`
   - `VITE_APP_ID`
   - `VITE_MEASUREMENT_ID`
   - `VITE_CLOUDINARY_CLOUD_NAME`
6. Kliknij **Deploy**.

Po zakończeniu wdrożenia skopiuj wygenerowany przez Vercel adres URL (np. `https://flaner-settings.vercel.app`). Będzie on potrzebny w Kroku 2.

---

## KROK 2: Wdrożenie projektu `core` (Host)

1. Wróć do [Vercel Dashboard](https://vercel.com/dashboard) i kliknij **Add New...** -> **Project**.
2. Wybierz to samo repozytorium **Flaner**.
3. W ustawieniach konfiguracji projektu zmień:
   - **Project Name:** `flaner` (lub dowolna inna nazwa)
   - **Root Directory:** Wybierz `packages/core`.
   - **Framework Preset:** Wybierz **Vite** (lub zostaw **Other**).
4. Rozwiń sekcję **Build and Development Settings**:
   - Zaznacz przełącznik **Override** przy **Build Command**.
   - Wpisz komendę:
     ```bash
     cd ../.. && npx nx run core:build
     ```
   - **Output Directory:** Zostaw domyślne `dist` (buduje się w `packages/core/dist`).
5. Rozwiń sekcję **Environment Variables** i dodaj te same zmienne Firebase/Cloudinary co wcześniej:
   - `VITE_API_KEY`
   - `VITE_AUTH_DOMAIN`
   - `VITE_PROJECT_ID`
   - `VITE_STORAGE_BUCKET`
   - `VITE_MESSAGING_SENDER_ID`
   - `VITE_APP_ID`
   - `VITE_MEASUREMENT_ID`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_APP_NAME` (wartość: `Flaner`)
6. **Dodaj zmienną wskazującą na MFE Settings:**
   - **Key:** `VITE_MFE_SETTINGS_URL`
   - **Value:** Wklej adres URL skopiowany z **Kroku 1** (np. `https://flaner-settings-xxxx.vercel.app` - bez ukośnika `/` na końcu!).
7. Kliknij **Deploy**.

Po zakończeniu wdrożenia skopiuj główny adres URL Twojej aplikacji `core` (np. `https://flaner.vercel.app`).

---

## KROK 3: Autoryzacja domeny w Firebase Console

Ponieważ logowanie przez Google Firebase odbywa się w popupie, Firebase wymaga dodania domeny hosta do zaufanych domen:

1. Przejdź do [Firebase Console](https://console.firebase.google.com/).
2. Wybierz swój projekt -> **Authentication** -> zakładka **Settings**.
3. W menu po lewej stronie kliknij **Authorized domains** (Autoryzowane domeny).
4. Kliknij **Add domain** (Dodaj domenę).
5. Wpisz domenę swojej aplikacji `core` wdrożonej w Kroku 2 (np. `flaner.vercel.app` - samą domenę bez `https://` i bez ukośników).
6. Zapisz.

---

## Jak przetestować?
1. Wejdź na wdrożony adres aplikacji `core` (np. `https://flaner.vercel.app`).
2. Zaloguj się przez Google.
3. Po poprawnym zalogowaniu przejdź do zakładki **Ustawienia** (Settings) w nawigacji.
4. Sprawdź w DevTools (klawisz F12, zakładka Network):
   - Aplikacja powinna wykonać request do `https://flaner-settings.vercel.app/remoteEntry.js` i załadować ten moduł dynamicznie.
   - Panel ustawień powinien wyświetlić się poprawnie, a dane powinny być ładowane/zapisywane z/do Firebase.
