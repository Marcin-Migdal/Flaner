# Collection: split_groups

**Path:** `/split_groups/{groupId}`

Grupy rozliczeniowe (moduł Rozliczenia / Splits w MFE `planning`). Wszystkie kwoty przechowywane są jako liczby całkowite w setnych częściach jednostki waluty (np. grosze). Salda są trzymane **osobno dla każdej waluty** (jak w Splitwise) i nigdy nie są mieszane.

## Document Schema
- `id`: string
- `name`: string
- `description`: string
- `defaultCurrency`: string (ISO 4217, waluta domyślna / docelowa przeliczania)
- `lastUsedCurrency`: string (podpowiedź waluty dla kolejnego wydatku / spłaty)
- `createdBy`: string (userId właściciela)
- `participants`: string[] (userId aktywnych uczestników – wyłącznie zarejestrowani użytkownicy)
- `formerParticipants`: string[] (userId usuniętych uczestników – do rozwiązywania profili w historii)
- `balances`: map<currency, map<userId, number>> (saldo netto; `+` = inni są winni tej osobie; każda waluta sumuje się do 0; puste waluty są usuwane)
- `pairBalances`: map<currency, map<string, number>> (salda parami; klucz `uidA__uidB` gdzie `uidA < uidB`; `+` = `uidB` jest winien `uidA`)
- `totalSpent`: map<currency, number>
- `expensesCount`: number
- `settlementsCount`: number
- `simplifyDebts`: boolean (opcjonalnie, domyślnie `false`; włącza uproszczenie długów dla całej grupy)
- `version`: number (licznik wersji grupy do Optimistic Concurrency Control, domyślnie 0, rośnie o 1 przy każdej zmianie finansowej)
- `status`: `'active' | 'deleting'` (`deleting` = trwa usuwanie grupy przez właściciela)
- `createdAt`: number (timestamp)
- `updatedAt`: number (timestamp)

## Subcollection: expenses

**Path:** `/split_groups/{groupId}/expenses/{expenseId}`

- `id`, `groupId`, `title`: string
- `amount`: number
- `currency`: string (ISO 4217)
- `category`: `'food' | 'transport' | 'housing' | 'entertainment' | 'shopping' | 'general'`
- `date`: string (YYYY-MM-DD)
- `paidBy`: string
- `splitType`: `'equally' | 'exact'`
- `splits`: Array<{ userId: string, amount: number }> (suma == `amount`)
- `createdBy`: string, `createdAt`: number, `updatedAt`: number (opcjonalnie)
- `conversion` (opcjonalnie): { `originalCurrency`, `originalAmount`, `originalSplits`, `rate`, `rateDate`, `convertedAt` } – ustawiane przy przeliczeniu po kursie z dnia wydatku (Frankfurter API)

## Subcollection: settlements

**Path:** `/split_groups/{groupId}/settlements/{settlementId}`

- `id`, `groupId`, `payerId`, `receiverId`: string
- `amount`: number, `currency`: string
- `date`: string (YYYY-MM-DD), `note`: string
- `createdBy`: string, `createdAt`: number
- `conversion` (opcjonalnie): { `originalCurrency`, `originalAmount`, `rate`, `rateDate`, `convertedAt` }

## Write Model
Każda operacja finansowa (dodanie / edycja / usunięcie wydatku lub spłaty, przeliczenie waluty) wykonywana jest w `runTransaction`, który jednocześnie zapisuje dokumenty podkolekcji oraz aktualizuje salda i liczniki w dokumencie grupy. Reguły wymuszają tę atomowość (`get()` vs `getAfter()`).

Usuwanie grupy: właściciel ustawia `status = 'deleting'` (tylko przy wyzerowanych saldach – sprawdzane w transakcji), usuwa podkolekcje partiami, a na końcu dokument grupy.

## Rules
- **read (group)**: participant
- **create (group)**: `createdBy` == auth uid, auth uid in `participants`, liczniki 0, `totalSpent` == {}, `status` == 'active', opcjonalnie `version` == 0
- **update (group)**: participant AND `createdBy` unchanged AND `version` nie maleje (`request.resource.data.get('version', 0) >= resource.data.get('version', 0)`) AND participants change allowed AND (owner OR `name`/`description`/`defaultCurrency`/`status` unchanged)
  - participants change allowed: lista rośnie (dodanie) LUB właściciel usuwa dokładnie jedną osobę (nie siebie) LUB użytkownik (nie właściciel) usuwa samego siebie
- **delete (group)**: owner AND `status == 'deleting'`
- **read (expenses/settlements)**: participant
- **create**: participant AND `createdBy` == auth uid AND `groupId` matches AND licznik grupy +1 w tym samym zapisie
- **update**: participant AND `createdBy`/`groupId` unchanged AND licznik bez zmian AND dokument grupy zaktualizowany w tym samym zapisie (edycja / przeliczenie waluty)
- **delete**: participant AND (licznik grupy -1 w tym samym zapisie OR (grupa w stanie `deleting` AND owner))

```javascript
// ==========================================
// GRUPY ROZLICZENIOWE (SPLIT GROUPS)
// ==========================================
match /split_groups/{groupId} {
  function splitGroupPath() {
    return /databases/$(database)/documents/split_groups/$(groupId);
  }

  function isSplitGroupParticipant() {
    return request.auth.uid in get(splitGroupPath()).data.participants;
  }

  function isSplitGroupOwner() {
    return get(splitGroupPath()).data.createdBy == request.auth.uid;
  }

  function isSplitGroupDeleting() {
    return get(splitGroupPath()).data.get('status', 'active') == 'deleting';
  }

  function splitGroupCounterChangedBy(field, delta) {
    return getAfter(splitGroupPath()).data[field] == get(splitGroupPath()).data[field] + delta;
  }

  function splitGroupTouchedInSameWrite() {
    return getAfter(splitGroupPath()).data.get('updatedAt', 0) != get(splitGroupPath()).data.get('updatedAt', 0);
  }

  function splitGroupParticipantsChangeAllowed() {
    let before = resource.data.participants;
    let after = request.resource.data.participants;
    let withoutSelf = before.removeAll([request.auth.uid]);
    return after.hasAll(before) ||
      (resource.data.createdBy == request.auth.uid && before.hasAll(after) &&
        after.size() == before.size() - 1 && resource.data.createdBy in after) ||
      (request.auth.uid != resource.data.createdBy && after.hasAll(withoutSelf) && withoutSelf.hasAll(after));
  }

  function splitGroupOwnerFieldsUnchanged() {
    return request.resource.data.name == resource.data.name &&
      request.resource.data.description == resource.data.description &&
      request.resource.data.defaultCurrency == resource.data.defaultCurrency &&
      request.resource.data.get('status', 'active') == resource.data.get('status', 'active');
  }

  allow read: if isAuthenticated() && request.auth.uid in resource.data.participants;
  allow create: if isAuthenticated() &&
    request.resource.data.createdBy == request.auth.uid &&
    request.auth.uid in request.resource.data.participants &&
    request.resource.data.expensesCount == 0 &&
    request.resource.data.settlementsCount == 0 &&
    request.resource.data.totalSpent == {} &&
    request.resource.data.status == 'active' &&
    request.resource.data.get('version', 0) == 0;
  allow update: if isAuthenticated() &&
    request.auth.uid in resource.data.participants &&
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.get('version', 0) >= resource.data.get('version', 0) &&
    splitGroupParticipantsChangeAllowed() &&
    (resource.data.createdBy == request.auth.uid || splitGroupOwnerFieldsUnchanged());
  allow delete: if isAuthenticated() &&
    resource.data.createdBy == request.auth.uid &&
    resource.data.get('status', 'active') == 'deleting';

  // ------------------------------------------
  // PODKOLEKCJA: WYDATKI (EXPENSES)
  // ------------------------------------------
  match /expenses/{expenseId} {
    allow read: if isAuthenticated() && isSplitGroupParticipant();
    allow create: if isAuthenticated() && isSplitGroupParticipant() &&
      request.resource.data.createdBy == request.auth.uid &&
      request.resource.data.groupId == groupId &&
      splitGroupCounterChangedBy('expensesCount', 1);
    allow update: if isAuthenticated() && isSplitGroupParticipant() &&
      request.resource.data.createdBy == resource.data.createdBy &&
      request.resource.data.groupId == resource.data.groupId &&
      splitGroupCounterChangedBy('expensesCount', 0) &&
      splitGroupTouchedInSameWrite();
    allow delete: if isAuthenticated() && isSplitGroupParticipant() &&
      (splitGroupCounterChangedBy('expensesCount', -1) || (isSplitGroupDeleting() && isSplitGroupOwner()));
  }

  // ------------------------------------------
  // PODKOLEKCJA: SPŁATY (SETTLEMENTS)
  // ------------------------------------------
  match /settlements/{settlementId} {
    allow read: if isAuthenticated() && isSplitGroupParticipant();
    allow create: if isAuthenticated() && isSplitGroupParticipant() &&
      request.resource.data.createdBy == request.auth.uid &&
      request.resource.data.groupId == groupId &&
      splitGroupCounterChangedBy('settlementsCount', 1);
    allow update: if isAuthenticated() && isSplitGroupParticipant() &&
      request.resource.data.createdBy == resource.data.createdBy &&
      request.resource.data.groupId == resource.data.groupId &&
      splitGroupCounterChangedBy('settlementsCount', 0) &&
      splitGroupTouchedInSameWrite();
    allow delete: if isAuthenticated() && isSplitGroupParticipant() &&
      (splitGroupCounterChangedBy('settlementsCount', -1) || (isSplitGroupDeleting() && isSplitGroupOwner()));
  }
}
```
