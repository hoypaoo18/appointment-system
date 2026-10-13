# GitHub Pages frontend preview

This workflow publishes the React frontend with public sample data. The Pages
build does not call the API or connect to MySQL. Real authentication and database
writes require a separately hosted backend. Sample role selection opens a
read-only preview and is not authentication.

## Enable deployment

1. Push the source and `.github/workflows/pages.yml` to the repository's `main` branch.
2. A repository admin opens **Settings → Pages → Build and deployment** and selects
   **GitHub Actions** as the source.
3. Open **Actions → Deploy frontend preview to GitHub Pages → Run workflow**.
4. After the build/deploy succeeds, use the URL shown by the deployment job.

For the configured repository, the expected project URL is
`https://hoypaoo18.github.io/appointment-system/`. This is an expected address,
not confirmation that deployment has already completed.

## What is available

- Sample assistant, executive and admin screens.
- Dashboard, appointment lists/details, calendar and appointment history.
- Admin System History using sample audit events and filters.
- A visible preview label. Appointment and account writes are disabled.

Only `dist-pages` is uploaded by the workflow. Database files, `.env` files,
backups, spreadsheets, test evidence and the Node.js server are not uploaded to
Pages. The preview seed contains fictitious sample records, not the database's
current contents.

## Local verification

```powershell
$env:VITE_BASE_PATH = '/appointment-system/'
npm run build:pages
npm run test:pages
```

`npm run build` still produces the normal backend-connected frontend in `dist`.
`npm run build:pages` produces the independent preview in `dist-pages`.

Official workflow reference:
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
