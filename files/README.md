# PIN3D LAB Website

This is a static website built with HTML, CSS, and JavaScript.

## Publish with GitHub Pages

1. Create a GitHub repository named `pin3d-lap`.
2. Add a remote and push:

   ```powershell
   git remote add origin https://github.com/<your-username>/pin3d-lap.git
   git branch -M main
   git push -u origin main
   ```

3. In GitHub repo settings, enable Pages from the `main` branch and root directory.
4. Your site will be available at `https://<your-username>.github.io/pin3d-lap/`.

## Alternative deployment options

- Netlify Drop: go to `https://app.netlify.com/drop`, then drag and drop this folder to publish instantly.
- Vercel: connect the GitHub repo and deploy as a static site.

## Netlify config

A `netlify.toml` file is included so the site publishes from the project root.

## Shared admin persistence

This site now supports shared product persistence through a Netlify serverless function. To enable global admin saves across all visitors, configure the following environment variables in Netlify:

- `GITHUB_OWNER` — your GitHub username or organization
- `GITHUB_REPO` — repository name for this site
- `GITHUB_BRANCH` — branch to commit updates to (defaults to `main`)
- `GITHUB_TOKEN` — a GitHub personal access token with repo write scope

When configured, admin product and settings changes are saved to `data/store.json` in the repository and deployed automatically.

> Note: shared persistence works when the site is deployed from a connected GitHub repository using Netlify build functions. Drag-and-drop static deploys will not support the serverless persistence backend.
