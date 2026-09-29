# Plan kontynuacji: moduł Rozliczenia (Splits) — handoff dla Antigravity / Gemini

Stan na 2026-09-24. Praca jest w toku i NIEZACOMMITOWANA. Ten dokument opisuje, co jest zrobione i co dokładnie zostało. Kolejność realizacji: dokończyć waluty (sekcja 3) → B (sekcja 4, prawie gotowe) → C (sekcja 5) → D (sekcja 6) → G (sekcja 7) → weryfikacja i deploy reguł (sekcja 8).

## 0. Kontekst i decyzje (już podjęte, nie zmieniać)

- Moduł nazywa się po angielsku **splits** (rozliczenia ≠ expenses; expenses zostawiamy na przyszły moduł wydatków). URL: `/planning/splits`. Kolekcja Firestore: `split_groups`. Wydatki wewnątrz grupy nadal nazywają się `expenses`, spłaty `settlements`.
- Model walut = darmowy Splitwise + przeliczanie po kursie z dnia wydatku:
  - każdy wydatek i każda spłata ma własne pole `currency`,
  - salda trzymane osobno per waluta (`balances: Record<waluta, Record<userId, kwota>>`, `pairBalances` analogicznie), nigdy nie są mieszane,
  - przycisk „Przelicz na {waluta domyślna}" przelicza WSZYSTKIE obce wpisy po kursie z dnia każdego wpisu (Frankfurter API v2, darmowe, bez klucza, CORS otwarty: `https://api.frankfurter.dev/v2/rates?date=YYYY-MM-DD&base=FROM&quotes=TO` → `[{date, base, quote, rate}]`). Oryginał jest zachowywany w polu `conversion`, więc ponowne przeliczenie nie nawarstwia zaokrągleń.
- Kwoty w setnych częściach jednostki waluty (grosze), liczby całkowite.
- Reguły: tylko właściciel (`createdBy`) edytuje nazwę/opis/walutę domyślną i usuwa grupę; edycja wydatku dozwolona dla każdego uczestnika.

## 1. Pułapka środowiska: kodowanie plików

Część plików była zapisywana jako UTF-16, co daje tysiące błędów `TS1127: Invalid character`. Wszystkie zostały przekonwertowane na UTF-8 bez BOM i `planning` kompiluje się do 6 błędów wymienionych w sekcji 3. W repo jest już `.editorconfig` z `charset = utf-8`. Po każdej edycji, zanim puścisz typecheck, sprawdź czy nowe/edytowane pliki nie są UTF-16 (bajty `FF FE` albo co drugi bajt = 0) i ewentualnie przekonwertuj na UTF-8 bez BOM.

## 2. Co jest już zrobione (nie ruszaj bez potrzeby)

- Rename `expenses` → `splits`: `src/api/splits/`, `src/views/SplitsView/`, hooki `useGetUserSplitGroupsRealtimeQuery`, `useCreateSplitGroupMutation` itd., trasa `splits` w `src/routes.tsx`, klucze `nav.splits` w `packages/core/public/locales/{pl,en}/common.json`, powiadomienie `split_group_invitation` w `packages/core` (types + `NotificationCard`, nawigacja na `/planning/splits#<id>`), sekcja `splits` w `planning.json` (stare klucze; nowych brak — patrz sekcja 3.5).
- Model danych: `src/api/splits/types.ts` (`SplitGroup` z `defaultCurrency`, `lastUsedCurrency`, `formerParticipants`, `balances`/`pairBalances`/`totalSpent` per waluta, `status`, oraz `Expense.conversion` / `Settlement.conversion`).
- Logika: `src/utils/splitBalances.ts` (delty per waluta, `getUserBalances`, `hasOutstandingBalance`, `isGroupSettled`, `getPairwiseDebts`, `getSimplifiedDebts`, `summarizeUserDebts` → kwoty per waluta, `convertAmount`, `convertSplits`), `src/utils/debtSimplification.ts` (`Debt` ma pole `currency`), `src/utils/money.ts` (`SUPPORTED_CURRENCIES` — 34 waluty obsługiwane przez Frankfurter, `formatMoneyList`, `getCurrencyLabel`).
- API: `src/api/exchangeRates/` (`getExchangeRate`) oraz `src/api/splits/endpoints.ts`: `createSplitGroup`, `updateSplitGroup`, `deleteSplitGroup` (flaga `deleting` → batch delete podkolekcji → delete grupy), `addParticipantToGroup`, `removeParticipantFromGroup` (saldo 0, owner nie może wyjść), `createExpense`, `updateExpense` (cofnięcie starej wersji + nałożenie nowej, także przy zmianie waluty), `deleteExpense`, `createSettlement`, `deleteSettlement`, `convertSplitGroupCurrency` (pobiera kursy, potem transakcja z ponownym odczytem dokumentów).
- Reguły: `.agents/skills/firestore-rules-manager/docs/split_groups.md` (źródło prawdy) i wstawiony blok `match /split_groups` w `firestore.rules`. **Niewdrożone** — patrz sekcja 8. Stare dane testowe w kolekcji `expense_groups` są osierocone; trzeba założyć grupy od nowa.
- Hooki mutacji (gotowe): `useUpdateExpenseMutation`, `useUpdateSplitGroupMutation`, `useDeleteSplitGroupMutation`, `useRemoveParticipantFromGroupMutation`, `useConvertSplitGroupCurrencyMutation` — dopisane do `src/hooks/api/mutation/index.ts`.
- Schematy: `src/utils/schemas/split-group-schema.ts` (`getSplitGroupSchema(t, mode)`, pole `defaultCurrency`), `create-expense-schema.ts` i `create-settlement-schema.ts` mają pole `currency`.
- UI gotowe: `SplitGroupCard` (salda per waluta, przyciski edycji/usuwania dla ownera, hover na desktopie), `SplitGroupsList` (przycisk `+` jako ikona obok wyszukiwarki, wariant `brand`), `SplitsView` (modal grupy + potwierdzenie usuwania; niezbilansowana grupa blokowana toastem `toast.attention`), `SplitGroupModal` (tworzenie i edycja, select waluty z `useCurrencyOptions`), `HeroMetricsWidget` (kwoty per waluta), `CurrencyConversionBanner` (baner + potwierdzenie), `BalancesTab` (salda per waluta, długi per waluta), `ActivityFeed` (prop `onEditExpense`), `ExpenseItemCard` (przycisk edycji + linia „przeliczono z …"), `SettlementItemCard` (waluta wpisu + linia przeliczenia), `hooks/useMoneyFormatter.ts`, `hooks/useCurrencyOptions.ts`, `hooks/useSplitGroupMembers.ts` (zwraca też `getMember` i rozwiązuje `formerParticipants`).
- Kolor `brand` ma też przycisk `+` w Terminarzu (`SchedulerEventHeader.tsx`) i „Utwórz grupę" w `community/src/pages/groups/GroupsListView.tsx`.

## 3. Dokończenie walut — 6 błędów kompilacji do usunięcia

### 3.1 Utworzyć `src/views/SplitsView/components/ExpenseModal/ExpenseModal.tsx`

Folder istnieje (`ExpenseModal.styles.ts` ze stylem `amountRow`, `SplitEditor.tsx`, `SplitEditor.styles.ts`), brakuje komponentu. `SplitGroupDashboard` importuje `../ExpenseModal/ExpenseModal` i przekazuje propsy: `open`, `onOpenChange`, `group`, `members`, `expenseToEdit` (Expense | null). Modal obsługuje tworzenie i edycję (wzorzec: `SplitGroupModal.tsx` oraz usunięty `CreateExpenseModal`).

Wymagania:
- `useForm` + `zodResolver(getCreateExpenseSchema(t))`, typ `CreateExpenseFormData` (ma teraz pole `currency`).
- Domyślne wartości: przy tworzeniu `currency = group.lastUsedCurrency`, `paidBy = currentUserId`, `splitType = "equally"`, `splits` = uczestnicy z `included: true`; przy edycji wartości z `expenseToEdit` (kwoty przez `fromMinorUnits`, daty przez `parseISO`; uwaga na `conversion` — edycja bazuje na aktualnych wartościach wpisu, metadane konwersji i tak są odrzucane w `updateExpense`).
- Pole waluty: `FormSelect` z `useCurrencyOptions()` obok kwoty (grid `styles.amountRow`), z `formatOptionLabel` pokazującym sam kod waluty w kontrolce (`context === "value" ? option.value : option.label`) — wzorzec jest w `SplitGroupModal.tsx`.
- Submit: `toMinorUnits` dla kwot, `splitEqually` dla podziału równego, `format(date, "yyyy-MM-dd")`; tworzenie przez `useCreateExpenseMutation`, edycja przez `useUpdateExpenseMutation` (`{ groupId, expenseId, data }`).
- `SplitEditor` czyta walutę z formularza przez `useWatch` — nie przekazuj mu propsa `currency` (został usunięty).

### 3.2 `SettleUpModal.tsx` — dwa błędy

- `group.currency` już nie istnieje → użyj `group.lastUsedCurrency` jako waluty domyślnej.
- `CreateSettlementInput` wymaga `currency`: dodaj pole do `buildDefaultValues`, do `SettleUpDraft` (typ w tym pliku — `SplitGroupDashboard` ustawia już `draft.currency`) oraz do obiektu wysyłanego w `createSettlement`. Select waluty jak w 3.1, z listą `useCurrencyOptions()`.

### 3.3 `SplitEditor.tsx` — drobna poprawka

Linia z `format(value, currency)` może dostać `undefined` zanim formularz się zresetuje. Użyj `currency || DEFAULT_CURRENCY` (import `DEFAULT_CURRENCY` z `utils/money`).

### 3.4 `SplitGroupDashboard.tsx` — błąd `open: any`

Po dodaniu `ExpenseModal` zniknie błąd importu; błąd `Parameter 'open' implicitly has an 'any'` w `onOpenChange={(open) => ...}` też (wynika z brakującego modułu). Sprawdź, że `setExpenseModal(null)` przy `open === false`.

### 3.5 Klucze tłumaczeń do dodania (pl i en, `planning.json`, sekcja `splits`)

Żaden z tych kluczy jeszcze nie istnieje, a kod już ich używa:
- `splits.fields.defaultCurrency` — „Waluta domyślna" / „Default currency"
- `splits.groupModal.editTitle` — „Edytuj rozliczenie" / „Edit split group"
- `splits.actions.edit` — „Edytuj" / „Edit"
- `splits.deleteGroup.title` — „Usunąć rozliczenie?" / „Delete split group?"
- `splits.deleteGroup.description` — z `{{name}}`
- `splits.deleteGroup.blocked` — „Nie można usunąć rozliczenia z nierozliczonymi saldami. Najpierw rozliczcie wszystkie długi." (toast, bez potwierdzenia)
- `splits.conversion.bannerTitle`, `bannerDesc` (`{{currency}}`), `action` (`{{currency}}`), `confirmTitle`, `confirmDesc` (wyjaśnij: kurs z dnia każdego wydatku, oryginalne kwoty zostaną zapamiętane), `confirm`
- `splits.conversion.original` — „przeliczono z {{amount}} · kurs {{rate}} z {{date}}"
- toasty w `toasts.splits`: `groupUpdateSuccess/Error`, `groupDeleteSuccess/Error`, `participantRemoveSuccess/Error`, `expenseUpdateSuccess/Error`, `convertSuccess/Error`

## 4. B — edycja i usuwanie grupy: zostało tylko przetestować

Kod gotowy (`SplitGroupCard`, `SplitsView`, `SplitGroupModal`, `updateSplitGroup`, `deleteSplitGroup`). Do weryfikacji ręcznej: edycja nazwy/opisu/waluty domyślnej, usuwanie grupy z saldem 0, toast przy saldzie ≠ 0, brak przycisków u nie-właściciela. Uwaga do reguł: usuwanie podkolekcji przy `status == 'deleting'` jest dozwolone tylko właścicielowi — kolejność w `deleteSplitGroup` (najpierw transakcja ustawiająca flagę, potem batche, na końcu delete grupy) jest z tym zgodna.

## 5. C — edycja wydatku: zostało tylko UI modala

Backend gotowy (`updateExpense` + `useUpdateExpenseMutation`), `ActivityFeed` i `ExpenseItemCard` mają już przycisk i handler. Brakuje wyłącznie `ExpenseModal.tsx` z sekcji 3.1. Edycja dozwolona dla każdego uczestnika (tak działa Splitwise i tak mówią reguły).

## 6. D — usuwanie uczestnika / opuszczenie grupy

Backend gotowy: `removeParticipantFromGroup` (odrzuca ownera i saldo ≠ 0, dopisuje do `formerParticipants`) + `useRemoveParticipantFromGroupMutation`. Reguły pozwalają: owner usuwa dokładnie jedną osobę (nie siebie), zwykły uczestnik usuwa tylko siebie.

Zostało UI:
- Nowy komponent, np. `SplitGroupMembersPopover`, otwierany kliknięciem w stos awatarów w `SplitGroupHeader` (zostaw `QuickAddParticipantPopover` obok).
- Lista uczestników z profili (`useSplitGroupMembers`). Przy każdej osobie ze saldem ≠ 0 (`hasOutstandingBalance` z `utils/splitBalances`) przycisk nieaktywny z tooltipem.
- Owner widzi „Usuń" przy innych; każdy nie-owner widzi „Opuść rozliczenie" tylko przy sobie. Owner nie może opuścić grupy (przycisku brak, grupę może tylko usunąć).
- Potwierdzenie przez `ConfirmationPopup`. Po opuszczeniu grupy przez siebie nawigacja na `hash: ""`.
- Klucze: `splits.members.remove`, `splits.members.leave`, `splits.members.removeTitle/Desc`, `splits.members.leaveTitle/Desc`, `splits.members.blockedBalance`.

## 7. G — błąd typów w `tools` (istniał wcześniej, niezależny)

`packages/tools/src/components/templates/modals/TemplateFormModal.tsx` (~linia 78): przekazywany jest `UserType | null` tam, gdzie oczekiwany jest `User | null`. Popraw typ parametru/funkcji tak, aby przyjmowała `UserType` (albo zmapuj pola, jeśli funkcja naprawdę potrzebuje typu Firebase `User`). Kryterium: `npx nx run tools:typecheck` bez błędów.

## 8. Weryfikacja i deploy reguł (na końcu)

1. Konwersja kodowania na UTF-8 (sekcja 1).
2. `npx nx run planning:typecheck`, `npx nx run planning:lint`, `npx nx run core:typecheck`, `npx nx run community:typecheck`, `npx nx run tools:typecheck`, potem build `planning` i `core`.
3. Deploy reguł (wymaga akceptacji użytkownika): `npx.cmd firebase-tools deploy --only firestore:rules --project flaner-v2`. Oczekiwane: `released rules firestore.rules to cloud.firestore` i `Deploy complete!`.
4. Test ręczny na 2–3 kontach: wydatek 100 zł po równo, wydatek w EUR z dokładnymi kwotami, spłata w obu walutach, „Przelicz na PLN" (sprawdź kurs i linię „przeliczono z…" w feedzie), edycja wydatku ze zmianą waluty, usunięcie uczestnika z saldem 0 i odmowa przy saldzie ≠ 0, edycja i usunięcie grupy, powiadomienie `split_group_invitation` prowadzące do grupy.

## 9. Świadomie odłożone (nie rób tego teraz)

- Paginacja feedu przy dużych grupach.
- Przeliczanie chronione limitem rozmiaru transakcji: `convertSplitGroupCurrency` rzuca błąd powyżej 450 wpisów naraz — dla małych grup wystarcza, rozbijanie na partie to osobny temat.
- Salda liczy klient; reguły wymuszają tylko atomowość (liczniki i `updatedAt`), nie poprawność kwot.
