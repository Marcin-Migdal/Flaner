# Bank statement fixtures

Real bank CSV exports, anonymised, used by the Budget statement-import tests (unit and E2E).

## Millennium (`millennium/`)

Three monthly "Historia transakcji" exports (2026-09 … 2026-11), cut to 30 random rows per month, two accounts in every file.

Kept as exported: UTF-8 with BOM, CRLF line endings, every field quoted, the header, newest-first row order, transaction types, empty cells and the double spaces inside card-purchase descriptions.

Replaced: transaction dates (a random day in the same month per row, settlement and card-description dates moved with it, rows re-sorted newest first), account and counterparty numbers (same shape, random digits, one stable replacement per original number), payees, descriptions (card purchases keep the `<MERCHANT> <CITY> <CC> <YYYY-MM-DD>` shape), amounts, and balances recomputed so each account's balance chain stays consistent across rows and files.

`.gitattributes` marks the CSVs `-text` so Git never rewrites their line endings.
