# Test environment

See [ENVIRONMENT-COMPARISON.md](ENVIRONMENT-COMPARISON.md) for the developer/test
configuration comparison, exact system test matrix, evidence and coverage gaps.

The main app uses `appointment`. Manual testing uses `appointment_test` on the
same local XAMPP MySQL server. Test accounts, sessions, appointments and audit
history are stored in that separate database.

## Start

1. Start MySQL in XAMPP.
2. On a fresh checkout, run `npm install` and copy `.env.test.example` to `.env.test`.
3. Run `npm run test:setup` to create and seed the test database.
4. Run `npm run dev:test`.
5. Open http://127.0.0.1:5180 and check the **Test environment · sample data** banner.

`dev:test` also initializes the database if needed. Existing test changes survive
server restarts. `TEST_APP_PORT` changes the test app port; port 5173 is reserved
for the main app. The test server binds to the local computer.

## Accounts

Initial password: `MeridianDemo123!`

| Role | Email | Expected access |
| --- | --- | --- |
| Assistant | sarah.mitchell@meridian.com | Manage appointments |
| Executive | margaret.chen@meridian.com | View appointments |
| Executive | robert.hargrove@meridian.com | View appointments |
| Executive | victoria.santos@meridian.com | View appointments |
| Admin | j.alderton@meridian.com | Manage account status and view system history |

The database starts with 11 sample appointments, including three on the setup
date, upcoming meetings, completed/cancelled records, and an appointment with
reschedule history. These dates are refreshed when the database is reset.

## Reset

Stop the test server with Ctrl+C, then run `npm run test:reset`.
This deletes test appointments, accounts, sessions and audit history and restores
the sample data and initial passwords. The command only accepts the exact local
database name `appointment_test`. A MySQL lock blocks it while the test server
or another setup/reset command runs.

## Automated checks

| Command | What it checks |
| --- | --- |
| `npm test` | Persistence, validation, conflicts, concurrency, authentication, roles, audit history, environment guards and session-cookie isolation |
| `npm run test:e2e` | Browser login, booking, refresh persistence, reschedule, logout, password changes, audit filters and mobile navigation |
| `npm run test:all` | Both suites |
| `npm run build` | Production build |

Automated checks create unique `appointment_qa_` databases and remove them on
completion. They do not reset or use the persistent manual-test database.
The browser suite starts its own server at port 5186. Installed Microsoft Edge
is the default browser. `.env.test` can select installed Chrome with
`TEST_BROWSER_CHANNEL=chrome`. The screenshot is saved to
`qa/evidence/system-history.png`.

## Manual checklist

1. **Login:** try an invalid password; then sign in as the assistant. Refresh and
   confirm the session remains active. Sign out and confirm protected data is inaccessible.
2. **Booking:** create a valid appointment. Check Dashboard, Appointments and Schedule;
   refresh and confirm it remains saved.
3. **Validation:** submit missing/invalid client details or a past date. Verify a
   useful error appears and no record is created.
4. **Conflict:** book an overlapping meeting with the same executive. Confirm it
   is rejected. Check that another executive or an adjacent time is allowed.
5. **Changes:** edit, reschedule and cancel appointments. Confirm details and
   appointment history show the changes. Complete a meeting dated today or earlier.
6. **Roles:** sign in as an executive and confirm appointment writes are denied.
7. **Accounts:** as admin, deactivate the assistant; verify login is rejected.
   Reactivate it and verify login works. Change a password in Account settings;
   verify the old password fails and the new one works.
8. **Audit:** as admin, open System History. Confirm login/account/appointment
   events, before/after schedule changes, search and date/action/result filters.
   An assistant must be denied access to system audit history.
9. **Isolation:** open the main app and test app together. Logging in/out in the
   test app should preserve the main-app session. Test records should only appear
   in `appointment_test` in phpMyAdmin.
