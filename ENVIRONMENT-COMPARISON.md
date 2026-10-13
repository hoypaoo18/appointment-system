# Developer environment vs test environment

Prepared on October 13, 2026, from this appointment system's configuration and test source.
“Developer environment” means the main local app started with `npm run dev`.
Both environments run the same appointment, authentication, role, and audit code.

## Configuration comparison

| Item | Developer environment | Test environment |
| --- | --- | --- |
| Purpose | Develop and inspect changes against the main local records | Repeat functional and regression checks using sample records |
| Start command | `npm run dev` | `npm run dev:test` |
| Configuration | `.env` | `.env.test` |
| Browser URL | Vite's displayed URL; default port is 5173 | `http://127.0.0.1:5180/`; strict port, configurable with `TEST_APP_PORT` |
| Database server | Local XAMPP MySQL/MariaDB, `127.0.0.1:3306` | Same local XAMPP server |
| Persistent database | `appointment` | `appointment_test` |
| Tables | `executives`, `appointments`, `activity`, `users`, `sessions`, `audit_logs`, `migrations`, `write_lock` | Same schema in a separate database |
| Records | Existing records; edits are retained | Initially 11 sample appointments and 5 accounts; test edits are retained |
| Appointment seed dates | Original September 2026 dates, plus subsequently saved appointments | Shifted around the setup/reset date; includes three appointments that day |
| Login | Database accounts; existing password/account-status changes are retained | Independently seeded database accounts; initial passwords restored on reset |
| Session cookie | `appointment_session` | `appointment_test_session` |
| Environment indicator | No test banner | “Test environment · sample data” banner |
| Database initialization | `npm run db:init` | `npm run test:setup`; also initialized by `dev:test` |
| Reset | No main-database reset command supplied | `npm run test:reset`; recreates only `appointment_test` |
| Reset during use | Not applicable | Blocked while the test server holds its MySQL lock |
| Database protection | Normal development configuration | Test startup rejects the main database, remote database hosts, and main app port 5173 |
| Automated verification | Shared implementation is checked through isolated test databases | `npm run test:all`: 13 automated tests plus a browser smoke test |

The automated suite creates temporary `appointment_qa_<unique ID>` databases.
It does not run its destructive scenarios against either `appointment` or the
persistent `appointment_test` database. The browser smoke test uses port 5186.

## Exact system test comparison

Use an unused appointment slot and the account's current password when repeating
these checks manually. Fresh test accounts use `MeridianDemo123!`. The fixed
2099 dates below match the automated fixtures; they are not existing main records.

“Passed” below refers to the last verified isolated suite/browser run. Developer
database results are **not separately certified** by that run. Rows marked
“Manual” are additional checks to execute and record in the named environment.

| ID | Exact test and expected result | Developer environment check | Test environment check | Existing verification |
| --- | --- | --- | --- | --- |
| AUTH-01 | Sign in as each of the five accounts with valid credentials. Uppercase email must also work. Public responses must exclude password hashes. | Use current credentials from `appointment.users`. | Use fresh credentials from the separate test users. | Passed: `auth.test.mjs` |
| AUTH-02 | Submit Sarah's email with `bad-password`, then an unknown email. Both must return HTTP 401; the login screen must remain visible. | Check main login with controlled attempts. | Repeat in test login; no main login attempts should be counted. | Passed: auth suite and browser |
| AUTH-03 | Sign in, refresh/reconnect, then log out. Session must persist before logout and become invalid afterward. Set expiry to zero only in a disposable fixture; expired sessions must be rejected. | Refresh/logout via main UI; check `appointment_session`. | Refresh/logout via test UI; check `appointment_test_session`. | Passed: auth suite and browser |
| AUTH-04 | Change password from `MeridianDemo123!` to `NewPassword123!`. Wrong current password is rejected; successful change invalidates old sessions. Restart, then verify old password fails and new password works. | Use a designated developer account and its current password. | Use a test account; reset can restore the initial password afterward. | Passed: auth suite; browser uses `UpdatedBrowser123!` |
| ROLE-01 | POST `/api/appointments` without login returns 401. An executive's request returns 403. Assistant booking succeeds. Submitted `createdBy`/`updatedBy` values must not override the session identity. | Verify using the appropriate main accounts and a designated appointment. | Repeat with test accounts and a sample appointment. | Passed: auth HTTP suite |
| USER-01 | As admin, deactivate Margaret or Sarah. Their session and subsequent login must be rejected. Assistant account-management requests return 403. Admin self-deactivation is rejected. | Use a designated account; restore its active status after the check. | Use test users; reactivate or reset afterward. | Passed: auth suite |
| APT-01 | Create a meeting for exec-1 on `2099-01-15`, `09:00`, 60 minutes. Change purpose to `Updated`; reschedule to `2099-01-16`, `10:00`, 30 minutes; cancel with a reason. Reconnect and verify saved details and ordered activity entries. | Use a designated developer record; verify persistence in `appointment`. | Repeat using `appointment_test`, or use the automated disposable fixture. | Passed: database suite |
| APT-02 | With exec-1 booked `09:00–10:00`, reject a `09:30` overlap; allow a `10:00` adjacent meeting and the same time for exec-2. A conflicting reschedule must leave the original schedule unchanged. | Compare conflict/adjacency behavior using main appointments. | Repeat against sample meetings in the test database. | Passed: database suite |
| APT-03 | Reject empty date, `2099-02-30`, past date `2000-01-01`, time `25:00`, duration `-1`, unknown executive, email `bad`, and phone `abc`. No appointment may be created. | Check validation with a designated form/API request. | Run the same invalid inputs against test data. | Passed: database suite; full UI validation matrix is Manual |
| APT-04 | Reject future completion and an edit with `updatedAt: stale`. Allow completion of a meeting dated today; reject subsequent cancellation of that completed meeting. | Use a designated current/future meeting and stale timestamp. | Use sample meetings or the disposable fixture. | Passed: database suite |
| APT-05 | Submit two simultaneous bookings for exec-1 at the same date/time. Exactly one succeeds; the other returns conflict 409; only one record is saved. | Requires controlled simultaneous developer requests. | Execute on disposable fixtures to keep sample/manual records intact. | Passed: database concurrency test |
| API-01 | Valid booking returns 201. Duplicate slot returns 409. Empty object and JSON `null` return 400. Authenticated GET `/api/state` includes the saved record. | Check main API response codes with a designated appointment. | Same endpoint paths on port 5180; automated fixture has its own server. | Passed: database HTTP suite |
| UI-01 | Type `Database QA Client` without losing focus; book exec-1 on `2099-01-15` at `09:00`. Refresh and find the saved client under Appointments. Reschedule and verify the displayed status becomes Rescheduled. | Repeat via main UI using a unique client name. | Browser suite repeats the flow in test mode using disposable data. | Passed: browser; reschedule is submitted through the API |
| DASH-01 | Book a meeting dated today. Verify Dashboard counts match saved status/date records, and its appointment list includes that meeting after refresh. | Compare Dashboard with main database records. | Compare with test records; initially three meetings are on the setup date. | Manual: no automated assertion of dashboard totals |
| CAL-01 | Create meetings for two dates. Open day/week Schedule; verify each appears on the correct Manila date and time and opens the correct detail record. | Check main calendar against saved main records. | Check test calendar against sample/test bookings. | Manual: calendar placement is not asserted by the current browser suite |
| HIST-01 | Cancel and complete designated appointments. Verify History shows their final status and the detail activity follows the action sequence. | Inspect developer records and appointment activity. | Inspect test records and their independent activity. | Backend sequence Passed; full History UI flow is Manual |
| AUDIT-01 | Enable/reopen audit history twice. Existing activity imports only once. Create/reschedule a meeting; verify actor, target, IP and before/after dates. Force audit storage failure only in a disposable fixture; the appointment change must roll back. | Inspect main audit records; do not inject a storage failure into the main database. | Run failure injection in the disposable audit fixture. | Passed: audit suite |
| AUDIT-02 | Perform successful/failed login, logout, password change, deactivation and denied access. Verify their audit actions. Passwords, hashes, tokens and private notes must be absent from audit entries. | Admin inspects `appointment.audit_logs`. | Admin inspects separate test history; suite inspects disposable logs. | Passed: audit suite |
| AUDIT-03 | Assistant GET `/api/audit-logs` returns 403; unauthenticated request returns 401; admin request succeeds. Filter by failed login and failure result. Seed 55 events in a disposable fixture: pages must contain 50 and 5 distinct events. | Admin checks main search/filter access using existing logs. | Repeat in System History; pagination data comes from the isolated fixture. | Passed: audit suite; search/action filters also Passed in browser |
| MOBILE-01 | As admin, resize to 390×844 and open Audit. System History must be visible with no browser script errors. | Repeat in developer browser viewport. | Browser smoke test checks mobile navigation in test mode. | Passed: browser; full mobile layout review remains Manual |
| ENV-01 | Set test config to `DB_NAME=appointment`, a remote host, or port 5173. Startup/config validation must reject it. | Main app legitimately uses its own main database. | Misconfigured test startup must fail before using main records. | Passed: environment suite |
| ENV-02 | Seed using reference date `2026-10-13`. Expect 11 meetings, exactly three on that date, upcoming meetings, and matching created-event timestamps. | Original developer seed dates remain September 2026. | Shifted seed dates support repeatable current-date testing. | Passed: environment suite |
| ENV-03 | Send a main-app cookie to test `/api/auth/me`; expect user null. A valid test cookie must authenticate. Sign in/out in the test app and verify main record counts do not change. | `appointment_session` remains independent. | `appointment_test_session` is required. | Passed: cookie test and live isolation check |
| ENV-04 | Start the test server, then attempt to acquire the setup/reset lock. It must be refused. After stopping, reset must target only `appointment_test` and reseed it. | No developer reset command exists. | Running-server lock refusal verified; reset implementation uses the fixed test database name. | Lock check Passed; destructive reset was not executed in the last run |
| SET-01 | Change profile fields or preferences, save, refresh and check persistence. | Current profile/preferences save actions are UI placeholders; persistence is not implemented. | Same implementation and limitation applies here. | Coverage gap; do not mark this Passed |

## Automated evidence mapping

| Source | Number of automated tests | Checks represented above |
| --- | --- | --- |
| `server/database.test.mjs` | 5 | Appointment lifecycle, conflicts, validation/status, HTTP responses, concurrent booking |
| `server/auth.test.mjs` | 3 | Real accounts/passwords/sessions, password changes/deactivation, HTTP identity/role checks |
| `server/audit.test.mjs` | 2 | Audit import/transactions/persistence/pagination, authentication/account/access audit and secret exclusion |
| `server/environment.test.mjs` | 3 | Configuration safeguards, shifted seed dates, independent session cookies |
| `qa/database-browser.cjs` | One browser smoke script, separate from the 13 tests | Login, typing/booking, refresh, API reschedule reflected in UI, logout, wrong password, password update, admin audit filters, mobile navigation and test banner |

Last verified results: 13 automated tests passed, browser smoke passed, production
build passed. These results were obtained during environment setup in this chat;
the comparison itself did not rerun tests or mutate either environment.

Run `npm run test:all` to obtain a fresh isolated test result. Record separate
developer/manual outcomes when executing the matrix against the two persistent
apps. Use `npm run build` to verify the shared production build.
