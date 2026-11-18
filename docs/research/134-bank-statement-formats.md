# Research: bank statement export formats (#134)

Part of map #63 (Budget app: Transactions and Planner, MVP).

**Question.** Which statement export formats do Polish banks and Revolut offer (mBank, PKO BP, ING, Santander, Pekao, Millennium, Revolut)? For each: columns, date and amount formats, encoding, how payee and description are given, whether a row has a stable id usable for deduplication, and whether the file can be parsed in the browser without a backend. Recommend the MVP set.

**Method and source quality.** Banks publish almost nothing about the layout of their retail CSV exports; their help pages only name the formats. Column layouts below therefore come from open-source importers that parse real files (Firefly III import configurations, bank2ynab, You Need A Parser, mankkoo, and several smaller projects), cross-checked where two or more independent projects agree. Where only one source exists, or sources disagree, the claim is marked **unverified**. Some fixtures in the smaller projects are clearly synthetic and were not used as evidence. Nothing here was checked against a file freshly exported by the author of this note: the first implementation ticket should start by collecting one real, anonymised export per bank.

## 1. Formats offered per bank

| Bank | Retail history export | Source |
|---|---|---|
| mBank | "Lista operacji" and "Zestawienie operacji": PDF, HTML, CSV | [mBank help](https://www.mbank.pl/indywidualny/aplikacja-i-serwis/pytania-i-odpowiedzi-serwis/historia-w-serwisie-transakcyjnym/) |
| PKO BP | iPKO "Historia": CSV and PDF (XML/HTML not confirmed) | [totalmoney.pl guide](https://totalmoney.pl/artykuly/wyciag-z-konta-bankowego--jak-go-pobrac), [Freenance PKO](https://freenance.io/integracje/pko/) (third-party) |
| ING | Transaction list: PDF, CSV. Statements: PDF, MT940 | ING Moje ING terms ([ing.pl file](https://www.ing.pl/_fileserver/item/1122959)), as summarised by search; also an XML / MT940/942 export option in another ING document ([ing.pl file](https://www.ing.pl/_fileserver/item/1112275)) |
| Santander | CSV and PDF; at most 3 months per export (**unverified**, third-party only) | [Freenance Santander](https://freenance.io/integracje/santander) |
| Pekao | History as PDF, TXT, CSV | [Pekao24 guide (2021)](https://www.pekao24.pl/_usercontent/_file/Pekao24_przewodnik_16_11_2021.pdf) |
| Millennium | Operations list as PDF, CSV, HTML (third-party); statements also as one MT940 file (official, older guide) | [moneteo.com](https://moneteo.com/artykuly/wyciag-z-konta-bankowego), [Millenet guide](https://www.bankmillennium.pl/documents/10184/104970/Millenet+-+Przewodnik+po+podstawowych+operacjach.pdf/2347de3a-7244-41fb-b539-60ac62a7aee0) |
| Revolut (personal) | Statement per currency account as PDF or "Excel"; the "Excel" option produces a comma-separated `.csv` file (see section 2.7). Business accounts additionally get camt.053 XML and MT940 | [Revolut help, statement per currency](https://help.revolut.com/help/profile-and-plan/managing-my-account/account-statement-per-chosen-currency/), [Revolut Business help](https://help.revolut.com/business/help/managing-my-business/viewing-my-account-statements/how-to-get-a-monthly-statement/) |

Takeaway: **CSV is the one format every bank on the list offers to retail customers.** MT940 is available only from some (ING, Millennium statements) and mostly targets accounting software. No bank on the list offers XLSX for retail history export according to the sources found; XLS(X) support is not needed for the MVP.

## 2. CSV layouts per bank

### 2.1 mBank

- **Layout.** Several lines of bank / customer / filter metadata, a summary block, then a header row beginning `#Data operacji;`. Parsers find the table by searching for that header ([YNAP mbank.ts](https://github.com/leolabs/you-need-a-parser/blob/HEAD/packages/ynap-parsers/src/pl/mbank/mbank.ts), [lunni parsers.py](https://github.com/Kartm/lunni/blob/HEAD/server/api/parsers.py), [jacbar gist](https://gist.github.com/jacbar/1178109)). Real fixture: [YNAP test data](https://github.com/leolabs/you-need-a-parser/blob/HEAD/packages/ynap-parsers/src/pl/mbank/test-data/operations_190710_191010_201910100004038185.csv).
- **Two variants.** "Lista operacji": `#Data operacji;#Opis operacji;#Rachunek;#Kategoria;#Kwota;#Saldo po operacji`. Older "Zestawienie operacji": `#Data księgowania;#Data operacji;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji` ([wydatki banki.js](https://github.com/wydatki-app/wydatki/blob/HEAD/src/parsery/banki.js), [bank2ynab.conf](https://github.com/bank2ynab/bank2ynab/blob/HEAD/bank2ynab/data/bank2ynab.conf)). A parser must map columns by header name, not position.
- **Delimiter** `;`, trailing `;` on every line. **Date** `YYYY-MM-DD` ([Firefly III config](https://github.com/firefly-iii/import-configurations/blob/main/pl/mbank/default.json) uses `Y-m-d`). **Amount** Polish format with space thousands separator, comma decimal and currency suffix, e.g. `-30,00 PLN`, `2 000,00 PLN` (YNAP fixture).
- **Encoding.** Inconsistent across sources: YNAP decodes as windows-1250, lunni reads "Lista operacji" as UTF-8 and the savings export as windows-1250, the wydatki parser says CP1250. Treat as "detect" (see section 4).
- **Payee / description.** In "Lista operacji" the payee is not a separate column; it is inside `#Opis operacji` (YNAP sets `Payee: undefined`), padded with long runs of spaces. Card payments carry the real purchase date in the title (`DATA TRANSAKCJI: YYYY-MM-DD`) ([wydatki banki.js](https://github.com/wydatki-app/wydatki/blob/HEAD/src/parsery/banki.js)). The old variant has `#Nadawca/Odbiorca`.
- **Pending rows** lack fields; one converter recommends exporting completed transactions only ([mbank-to-mt940](https://git.internet-czas-dzialac.pl/icd/mbank-to-mt940)).
- **Stable id:** none. mBank also has a built-in category column (`#Kategoria`).

### 2.2 PKO BP

- **Header** (one row, no preamble): `"Data operacji","Data waluty","Typ transakcji","Kwota","Waluta","Saldo po transakcji","Opis transakcji","","","",""` (anonymised real file: [ai-budget-assistant pko.csv](https://github.com/micode-ai/ai-budget-assistant/blob/HEAD/apps/api/src/modules/import-bank/parsers/__fixtures__/pko.csv)). The bank2ynab comment shows the same leading columns ([bank2ynab.conf](https://github.com/bank2ynab/bank2ynab/blob/HEAD/bank2ynab/data/bank2ynab.conf)); some exports may lack `Saldo po transakcji`, so map by name.
- **Delimiter** `,`, every field quoted. Freenance claims `;` ([Freenance PKO](https://freenance.io/integracje/pko/)); the code sources all use `,` ([lunni](https://github.com/Kartm/lunni/blob/HEAD/server/api/parsers.py), bank2ynab). **Date** `YYYY-MM-DD`. **Amount** signed, **dot** decimal, explicit `+`: `"-64.10"`, `"+6600.00"`.
- **Encoding** windows-1250 ([lunni](https://github.com/Kartm/lunni/blob/HEAD/server/api/parsers.py)).
- **Payee / description.** `Opis transakcji` spills into the unnamed trailing columns as labelled fragments: `Tytuł: …`, `Nazwa odbiorcy: …` / `Nazwa nadawcy: …`, `Rachunek odbiorcy: …`, `Lokalizacja: Adres: … Miasto: …` (card), `Numer karty: …`. The parser has to join the trailing cells and pick fragments by label prefix (same fixture).
- **Stable id:** only for some types, as a `Numer referencyjny: …` / `Operacja: …` fragment inside the description; not usable as a general key.

### 2.3 ING Bank Śląski

- **Layout.** Preamble (`"Lista transakcji"`, document number, user, chosen accounts, date range, sums), then the header row, then data, then a footer line ([actual-importer fixture generator](https://github.com/szymonprz/actual-importer/blob/HEAD/src/parsers/ing/fixtures/create-fixture.ts), [mankkoo pl_ing.py](https://github.com/wkrzywiec/mankkoo/blob/HEAD/services/mankkoo/mankkoo/account/importer/pl_ing.py) removes leading rows and the last row, [bank_stat helper.py](https://github.com/sodelalbert/bank_stat/blob/HEAD/helper.py) searches for the header).
- **Header:** `"Data transakcji";"Data księgowania";"Dane kontrahenta";"Tytuł";"Nr rachunku";"Nazwa banku";"Szczegóły";"Nr transakcji";"Kwota transakcji (waluta rachunku)";"Waluta";"Kwota blokady/zwolnienie blokady";"Waluta";"Kwota płatności w walucie";"Waluta";"Saldo po transakcji";"Waluta"` (note the repeated `Waluta`, so map by position after locating the header, or de-duplicate names).
- **Delimiter** `;`. **Date** `YYYY-MM-DD`. **Amount** comma decimal, signed: `-45,50`. **Encoding** windows-1250 (both mankkoo and actual-importer).
- **Payee / description:** separate `Dane kontrahenta` (padded with spaces) and `Tytuł`; `Szczegóły` holds the type (`TR.KART`, `PRZELEW`). Account numbers are apostrophe-guarded (`'2200…`).
- **Pending card holds** have an empty transaction amount and a value in `Kwota blokady/zwolnienie blokady` ([mankkoo](https://github.com/wkrzywiec/mankkoo/blob/HEAD/services/mankkoo/mankkoo/account/importer/pl_ing.py)). They must be skipped or flagged, or they will be double-counted when the booked row arrives.
- **Stable id: yes**, `Nr transakcji` (apostrophe-guarded). Best dedup key of all banks here (empty for holds; to be confirmed on a real file).

### 2.4 Santander Bank Polska (**partly unverified**)

- **Layout.** No header row. The first line is an account summary that starts with a `YYYY-MM-DD` date (export date) followed by the account number, holder, closing balances and the row count; then one line per transaction ([MySaver santander.ts](https://github.com/Kacper-77c/MySaver/blob/HEAD/src/lib/parsers/santander.ts) and its [fixture](https://github.com/Kacper-77c/MySaver/blob/HEAD/src/lib/parsers/santander.fixture.ts)). Firefly III's Santander config declares `headers: true` with 9 columns, which matches skipping that summary line ([Firefly III config](https://github.com/firefly-iii/import-configurations/blob/main/pl/santander/default.json)).
- **Columns (by position):** booking date, operation date, title, counterparty, counterparty account, amount, balance after, row number, (empty). Firefly maps 2 = date, 3 = description, 4 = opposing name, 5 = opposing IBAN, 6 = amount, consistent with MySaver.
- **Delimiter** `,`; amounts with a comma decimal are therefore quoted: `"-306,44"`. **Date** `DD-MM-YYYY` (Firefly `d-m-Y`, MySaver `dd-MM-yyyy`).
- **Encoding:** unknown; Freenance recommends UTF-8 and mentions windows-1250 files (third-party).
- **Stable id:** none. The last column is a running row number within the export (1, 2, …), not stable across exports.
- A third project ([ksefnik santander.parser.ts](https://github.com/CodeFormers-it/ksefnik/blob/HEAD/packages/core/src/bank/parsers/santander.parser.ts)) assumes a `;` file with a `Data operacji;Data waluty;Tytuł…` header. This conflicts with the two sources above; it may be a different Santander channel (business / credit card) or a guess. Freenance also says the format differs by account type. **Needs a real file.**

### 2.5 Bank Pekao

- **Header** (one row): `Data księgowania;Data waluty;Nadawca / Odbiorca;Adres nadawcy / odbiorcy;Rachunek źródłowy;Rachunek docelowy;Tytułem;Kwota operacji;Waluta;Numer referencyjny;Typ operacji` and, in newer files, `;Kategoria`. Three independent sources agree: [bank2ynab.conf](https://github.com/bank2ynab/bank2ynab/blob/HEAD/bank2ynab/data/bank2ynab.conf), [cashu pekao parse.ts](https://github.com/Utopia-USS/cashu/blob/HEAD/connectors/pekao-csv/parse.ts), [ToExpenseManager test data](https://github.com/Valdermeyder/ToExpenseManager/blob/HEAD/e2e/testDataPekao.csv). Default filename `Lista_operacji_YYYYMMDD_HHMMSS.csv`.
- **Delimiter** `;`. **Date** `DD.MM.YYYY`. **Amount** signed, comma decimal (`9839,29`, `-10`). **Encoding** UTF-8 per cashu, which still falls back to cp1250 / iso-8859-2. **No balance column** (cashu).
- **Payee / description:** separate `Nadawca / Odbiorca` and `Tytułem`; both source and destination account columns, so the counterparty account depends on the sign.
- **Stable id:** `Numer referencyjny` exists but is empty for some rows (BLIK rows in the ToExpenseManager data), so it can only be a preferred key with a fallback.

### 2.6 Bank Millennium

- **Header:** `Numer rachunku/karty,Data transakcji,Data rozliczenia,Rodzaj transakcji,Na konto/Z konta,Odbiorca/Zleceniodawca,Opis,Obciążenia,Uznania,Saldo,Waluta` ([finance-tracking-app formats.md](https://github.com/TheTasak/finance-tracking-app/blob/HEAD/docs/formats.md); same 11 columns in the [Firefly III config](https://github.com/firefly-iii/import-configurations/blob/main/pl/millenium/default.json) and [mankkoo pl_millenium.py](https://github.com/wkrzywiec/mankkoo/blob/HEAD/services/mankkoo/mankkoo/account/importer/pl_millenium.py)).
- **Delimiter** `,`, `""` escaping, newest row first. **Encoding** UTF-8 with BOM. **Date** `YYYY-MM-DD` (Firefly `Y-m-d`). **Amounts** split into `Obciążenia` (debit, already negative) and `Uznania` (credit); amount = whichever is filled.
- **Payee / description:** separate `Odbiorca/Zleceniodawca` and `Opis`; counterparty account in `Na konto/Z konta`. The first column identifies the own account or card, so one file can mix several accounts.
- **Stable id:** none; finance-tracking-app hashes `account|date|amount|description|balance`.

### 2.7 Revolut (personal)

- **Header:** `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance` ([Revolut community thread](https://community.revolut.com/t/since-october-2021-csv-exports-stopped-including-exchange-rate-information/210423), [Firefly III IE config](https://github.com/firefly-iii/import-configurations/blob/main/ie/revolut/default.json) with 10 roles, [wydatki banki.js](https://github.com/wydatki-app/wydatki/blob/HEAD/src/parsery/banki.js)). Default filename `account-statement_YYYY-MM-DD_YYYY-MM-DD_*.csv` ([bank2ynab.conf](https://github.com/bank2ynab/bank2ynab/blob/HEAD/bank2ynab/data/bank2ynab.conf)).
- **Delimiter** `,`. **Date-time** `YYYY-MM-DD HH:MM:SS`. **Amount** signed, dot decimal; `Fee` separate and positive. **Encoding** UTF-8 (all sources read it as such).
- **Payee / description:** only `Description` (merchant name or "Transfer to …"); no counterparty account.
- **State** can be `COMPLETED`, `PENDING`, `REVERTED`, `DECLINED`; parsers keep `COMPLETED` only, and pending rows have an empty `Completed Date` ([ofxstatement-revolut](https://pypi.org/project/ofxstatement-revolut/)). Currency exchanges appear as two rows (one per currency account) and each currency account may be exported as its own file; exchange-rate columns were removed in October 2021 (community thread above).
- A second, multi-block "Account Statement" CSV from the web app also exists, with a different layout (`Date,Description,Category,…`, month-name dates) ([wydatki banki.js](https://github.com/wydatki-app/wydatki/blob/HEAD/src/parsery/banki.js)). MVP should support only the app export.
- **Stable id:** none. `Started Date` has second precision; together with amount and balance it is close to unique.

## 3. MT940 and camt.053

MT940 is the SWIFT end-of-day statement; field `:61:` carries date, amount and bank reference, and field `:86:` carries the details, which Polish banks split into `~NN` sub-fields for title, counterparty name and account (exact sub-field numbers differ by bank and were **not verified** here; see for example the [mBank CompanyNet MT940 spec](https://www.mbank.pl/pdf/msp-korporacje/bankowosc-elektroniczna/mbank-companynet-opis-formatu-pliku-eksportu-wyciagow-dziennych-mt940-v-1.3.pdf)). It gives a reliable bank reference per entry, but only ING and Millennium offer it to retail users here, and only as statements (booked items, per statement period), not as an ad-hoc history range. Parsing is feasible in the browser ([mt940js](https://www.npmjs.com/package/mt940js), 78 kB unpacked, used by [ksefnik](https://github.com/CodeFormers-it/ksefnik/blob/HEAD/packages/core/src/bank/parsers/mt940.parser.ts)), but sub-field conventions differ by bank. camt.053 (ISO 20022 XML) appears only in ING business docs and Revolut Business; it is out of scope for a personal-budget MVP.

## 4. Parsing in the browser

All of the CSV formats above can be parsed client-side; nothing needs a backend.

- **Reading and encoding.** `File.arrayBuffer()` plus `TextDecoder`. The WHATWG Encoding Standard, implemented by all browsers, includes `windows-1250` ([Encoding Standard, names and labels](https://encoding.spec.whatwg.org/#names-and-labels); [MDN TextDecoder](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/TextDecoder)). Simple detection: decode with `new TextDecoder("utf-8", { fatal: true })`, and on a decoding error fall back to `windows-1250`; strip a BOM. This covers every bank above without a library such as jschardet / iconv-lite, which YNAP needed ([read-encoded-file.ts](https://github.com/leolabs/you-need-a-parser/blob/HEAD/packages/ynap-parsers/src/util/read-encoded-file.ts)). A windows-1250 file that happens to be pure ASCII decodes the same either way.
- **CSV splitting.** Quoted fields with embedded delimiters occur (Santander amounts, Millennium descriptions), so a real CSV tokenizer is needed. Papa Parse 5.7.1 is 19.0 kB minified / 6.9 kB gzipped (measured from the [jsDelivr build](https://cdn.jsdelivr.net/npm/papaparse@5.7.1/papaparse.min.js)) and handles quotes, delimiters and header-less files. A ~40-line hand-written RFC 4180 tokenizer is an alternative (as in [ksefnik csv-base.ts](https://github.com/CodeFormers-it/ksefnik/blob/HEAD/packages/core/src/bank/parsers/csv-base.ts)), but note that one splits on newlines first and so breaks on quoted multi-line fields.
- **Preambles.** mBank and ING need "find the header row, then parse from there"; Santander needs "skip the summary line"; mBank and ING need trailing summary / footer lines ignored.
- **Numbers.** Three amount styles: Polish (`1 234,56`, optional currency suffix, possibly non-breaking space), dot-decimal with sign (PKO, Revolut), and split debit/credit columns (Millennium). Convert to integer grosze at parse time.
- **XLSX** (not needed for MVP). SheetJS 0.18.5 from npm is 882 kB minified / 316 kB gzipped (full) or 251 kB / 79 kB (mini build), measured from jsDelivr. The npm `xlsx` package is frozen at 0.18.5; SheetJS now publishes newer versions from its own CDN ([SheetJS installation docs](https://docs.sheetjs.com/docs/getting-started/installation/frameworks)), and 0.18.5 has a known prototype-pollution advisory (CVE-2023-30533, **not re-checked here**). Reason enough to keep XLSX out of the MVP.
- **PDF** is not machine-friendly (layout text, per-bank regexes, as in the wydatki VeloBank parser) and should not be supported.
- **Bank detection.** Every format has a distinctive header or preamble (`#Data operacji;`, `"Lista transakcji"`, `"Data operacji","Data waluty","Typ transakcji"`, `Rachunek źródłowy`, `Numer rachunku/karty`, `Type,Product,Started Date`), so auto-detection by content is reliable; Santander is the only one recognised by shape (first cell a `YYYY-MM-DD` date, then 8–9 columns of `DD-MM-YYYY` rows). Filename patterns are a useful secondary signal (bank2ynab lists them).

## 5. Deduplication

Only ING (`Nr transakcji`) and, partially, Pekao (`Numer referencyjny`) provide a usable per-row id. Users will re-import overlapping date ranges, so the app needs its own key for everyone else. A workable rule, used in similar projects ([finance-tracking-app](https://github.com/TheTasak/finance-tracking-app/blob/HEAD/docs/formats.md), [wydatki](https://github.com/wydatki-app/wydatki/blob/HEAD/src/parsery/banki.js)):

- If the bank gives an id: key = `bank + account + id`.
- Otherwise: key = hash of `bank, account, date, amount (grosze), normalised description, balance-after (when the file has one)` plus an occurrence counter `n` for identical rows within one file, so two genuine identical coffees on the same day stay two rows.
- Balance-after (mBank, PKO, ING, Santander, Millennium, Revolut) makes the key much stronger; Pekao has none, so it relies on the reference number or the counter.
- Pending / blocked rows (ING holds, Revolut `PENDING`, mBank pending) change when booked and must be excluded, otherwise the booked row will not match and the transaction is counted twice.

## Recommendation

1. **Format: CSV only for the MVP.** It is the one format every bank on the list offers to retail users, it is small and parseable in the browser with `TextDecoder` (UTF-8 with windows-1250 fallback) plus Papa Parse (about 7 kB gzipped). Skip XLSX (no bank needs it, large and awkwardly distributed library), PDF (fragile) and MT940 (statement-only, offered by just two of the seven).
2. **Banks for the first release: mBank, ING, PKO BP and Revolut.** They are the most widely used retail banks here plus Revolut, the layouts are confirmed by several independent parsers, and together they cover all the hard cases (preamble, windows-1250, labelled description fragments, timestamps and states). ING also has a real transaction id.
3. **Second wave: Pekao and Millennium.** Both layouts are well confirmed and simple (one header row), so they are cheap to add once the parser framework exists.
4. **Santander last, after a real file.** Sources disagree on its layout and it may differ by account type.
5. **Design implications for the spec:** one parser per bank behind a common interface (detect + parse to `{date, amount in grosze, currency, payee?, description, balanceAfter?, bankRef?}`); map columns by header name where a header exists; skip pending rows; generate the dedup key described in section 5; show the user a preview with counts of new / duplicate / skipped rows before writing anything to Firestore.
6. **Open risks.** (a) All layouts are second-hand; banks change exports without notice (mBank already has two variants). Collect one real anonymised file per bank and keep it as a test fixture before writing each parser. (b) Encodings disagree between sources for mBank and Santander, which the UTF-8/windows-1250 fallback should absorb. (c) Multi-account files (mBank "Lista operacji", Millennium) need an account column mapped to a Flaner account, or a per-import account choice.

### Per-bank summary

| Bank | Format for MVP | Delimiter | Encoding | Date | Amount | Payee column | Stable row id | Confidence | Wave |
|---|---|---|---|---|---|---|---|---|---|
| mBank | CSV, preamble, `#`-prefixed header, 2 variants | `;` | windows-1250 or UTF-8 (detect) | `YYYY-MM-DD` | `-1 234,56 PLN` | inside `#Opis operacji` (old variant: `#Nadawca/Odbiorca`) | no | high | 1 |
| PKO BP | CSV, single header, description spread over unnamed columns | `,` (quoted) | windows-1250 | `YYYY-MM-DD` | `-64.10` / `+6600.00` | labelled fragment `Nazwa odbiorcy:` / `Nazwa nadawcy:` | partial (`Numer referencyjny:` in some rows) | medium-high | 1 |
| ING | CSV, preamble and footer | `;` | windows-1250 | `YYYY-MM-DD` | `-45,50` (holds in a separate column) | `Dane kontrahenta` | **yes**, `Nr transakcji` | high | 1 |
| Revolut | CSV ("Excel" in the app), one file per currency | `,` | UTF-8 | `YYYY-MM-DD HH:MM:SS` | `-12.50`, `Fee` separate | `Description` only | no | high | 1 |
| Pekao | CSV, single header | `;` | UTF-8 (fallback cp1250) | `DD.MM.YYYY` | `-10`, `9839,29` | `Nadawca / Odbiorca` | partial, `Numer referencyjny` sometimes empty | high | 2 |
| Millennium | CSV, single header, BOM, newest first | `,` | UTF-8 BOM | `YYYY-MM-DD` | split `Obciążenia` / `Uznania` | `Odbiorca/Zleceniodawca` | no | high | 2 |
| Santander | CSV, no header, summary first line | `,` (amounts quoted) | unknown | `DD-MM-YYYY` | `"-306,44"` | 4th column | no (row counter only) | **low** | 3 |
