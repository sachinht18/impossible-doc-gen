# Deployment And Publishing

This project should be treated as a server-rendered Next.js app with API routes, not as a static GitHub Pages site.

## 1. Publish This Folder As Its Own Git Repository

This machine currently has `git` rooted at `/Users/sachinh`, not at this project folder. Create an isolated repository inside this directory before pushing anything:

```bash
cd /Users/sachinh/Impossible_Doc_Gen
git init
git branch -M main
git add .
git commit -m "chore: initialize repository"
```

## 2. Fix GitHub CLI Authentication If Needed

If `gh auth status` reports an invalid token or no active session, re-authenticate before creating the remote:

```bash
gh auth login -h github.com
```

After login succeeds:

```bash
gh auth status
```

If your local shell cannot reach `api.github.com`, the repository creation step will fail even with valid auth. In that case, create the repository in the GitHub web UI and then run the push commands locally from a machine with outbound GitHub access.

## 3. Create And Push The GitHub Repository

Create a private repository by default, then push:

```bash
gh repo create impossible-doc-gen --private --source=. --remote=origin --push
```

If you want it public instead:

```bash
gh repo create impossible-doc-gen --public --source=. --remote=origin --push
```

## 4. Recommended Repository Settings

- Keep branch protection on `main`.
- Require the GitHub Actions CI workflow to pass before merge.
- Add a license before switching the repo to public if you want reuse rights to be clear.
- Enable Dependabot security updates.

## 5. Deploy From GitHub To Vercel

This app is a good fit for Vercel because it uses Next.js API routes and server-side LLM calls.

Recommended setup:

1. Import the GitHub repository into Vercel.
2. Set `OPENAI_API_KEY` as an environment variable in Vercel.
3. Keep the `/api/generate` route on the Node.js runtime.
4. Verify `/api/health` after the first deployment.

## 6. Post-Deploy Validation

Run these checks after the first push and after the first deployment:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Then verify:

- the app home page loads
- `/api/health` returns `status: "ok"`
- `/api/generate` works with a valid `OPENAI_API_KEY`
