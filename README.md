# Appointment Scheduling System (Community)

For the GitHub Pages read-only frontend preview, see [GITHUB-PAGES.md](GITHUB-PAGES.md).

An appointment scheduling interface for community services, built with React, TypeScript, and Vite.

The original design is available in [Figma](https://www.figma.com/design/KrGtDy3Se79phOZSScnLGD/Appointment-Scheduling-System--Community-).

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Database and appointments

Requires Node.js 22.13 or later. `npm run dev` starts the UI and local appointment
API together. Keep MySQL running in XAMPP. The app connects to the `appointment`
database at `127.0.0.1:3306` using the settings in `.env`. Copy `.env.example` to
`.env` for another installation and change the credentials if needed. On first
startup, it creates tables for executives, appointments, and activity history,
seeded with the existing demo records. `npm run db:init` also initializes the database without starting the UI.
Existing records are retained on subsequent startups.

Booking, editing, rescheduling, cancellation, and completion save to XAMPP MySQL (MariaDB).
The dashboard, appointment list, calendar, and history read the same saved data.
Server validation rejects invalid inputs, overlapping appointments for the same
executive, stale edits, and changes to closed appointments. Appointment changes
and their activity entries are committed together. Dates use Asia/Manila for
today's date; appointment date/time values represent Manila wall-clock time.

The original demo appointments remain dated September 2026; the UI now uses the
actual current date. Create new appointments to test upcoming schedules.

## Testing

Copy `.env.test.example` to `.env.test` (already configured in this workspace),
then keep XAMPP MySQL running:

```bash
npm run test:setup
npm run dev:test
```

Open [the test app](http://127.0.0.1:5180). It uses the persistent
`appointment_test` database with 5 login accounts, 11 sample appointments,
and audit history. Sample appointment dates are shifted around the setup date.
The test banner and separate session cookie identify and isolate this environment.
Test configuration rejects the main database and remote database hosts.

`npm run test:reset` deletes and recreates **only appointment_test**, restoring
sample records and initial demo passwords. Stop the test server first; a database
lock blocks reset/setup while it runs. Ordinary startup preserves test changes.

Run `npm run test:all` for the database/API suite and browser smoke test, or
`npm test` and `npm run test:e2e` individually. Automated tests use temporary
`appointment_qa_` databases and remove them afterward. The browser check uses
installed Microsoft Edge by default (`TEST_BROWSER_CHANNEL=msedge`). Set it to
`chrome` for installed Chrome. Browser tests run on port 5186.

See [TESTING.md](TESTING.md) for the environment configuration and manual checklist.

View `appointment` in [phpMyAdmin](http://localhost/phpmyadmin). The table
definitions are in `server/schema.sql`. Back up the database using phpMyAdmin
Export. The former SQLite records were migrated and its database file removed;
a record backup is retained locally at `data/sqlite-migration-backup.json`.

`npm run preview` serves a production build with the local API. `npm run api`
starts only the API on `127.0.0.1:3001`; a separately hosted frontend needs a
same-origin `/api` reverse proxy.

## Login accounts

The `appointment.users` table contains the five seeded demo accounts below.
They are real database accounts. Select an account under **Demo accounts**, then
press **Sign In**, or type the email and password directly.

Initial password for all five accounts: `MeridianDemo123!`

| Name | Email | Role |
| --- | --- | --- |
| Sarah Mitchell | sarah.mitchell@meridian.com | Assistant |
| Margaret Chen | margaret.chen@meridian.com | Executive |
| Robert Hargrove | robert.hargrove@meridian.com | Executive |
| Victoria Santos | victoria.santos@meridian.com | Executive |
| James Alderton | j.alderton@meridian.com | Admin |

Passwords are stored as salted scrypt hashes. The `sessions` table stores hashes
of session tokens; the browser receives an HttpOnly cookie valid for eight hours.
Login survives refresh. Logout, password changes, expiry, and account deactivation
end access. Re-running database initialization preserves changed passwords and
account status. A demo account whose password was changed needs its new password.

The API requires login. Assistants can create, edit, reschedule, cancel, and
complete appointments. Executives and admins can view them. Admins can activate
or deactivate other users in Settings; disabled users cannot sign in.
Settings → Account changes the password after verifying the current password.

This remains a local development/testing setup; change the documented demo
passwords and use HTTPS before hosting publicly.

## System audit history

The `appointment.audit_logs` table records sign-in success/failure, blocked login
attempts, logout, password changes, user activation/deactivation, appointment
creation/edit/reschedule/cancellation/completion, denied access, and failed API
requests. Each event stores its timestamp, actor, role, action, result, target
record, and request IP where available. Appointment schedule/status changes
include before/after values. Successful changes and their audit entries are
committed in the same transaction.

Sign in as James Alderton (admin) and open **System History** in the sidebar
(**Audit** in mobile navigation). Search by user, action, or record ID; filter
by action, result, and Manila date range. Results show 50 events per page. Refresh
loads new events. This history is read-only through the app and API, and only
admins can access it.

Existing appointment history is imported once with its original timestamps and
marked as imported. Authentication events begin when audit logging is enabled.
Passwords, password hashes, session tokens, and private appointment notes are
excluded from audit entries. Database administrators still control the database;
the app does not provide a tamper-proof audit archive.
