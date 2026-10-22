# Japan Quest Log

Next.js app for Daniel's Japan side quests. One Secret GitHub Gist stores the catalogue, five persistent promoted cards, completions, GPS pins, and activity. No database subscription or map API key.

## Run locally

Requirements: Node.js 22 LTS and a GitHub account. Extract this complete project into a new folder. Do not replace your existing Gist with the seed if you already have progress.

1. Create a **Secret Gist** at https://gist.github.com/ with the filename `japan-side-quest.json`. Paste `japan-side-quest.seed.json` into it. Skip this step if you already have a Gist.
2. Create a GitHub token with Gists read/write permission. A fine-grained token with Gists access or a classic token with only the `gist` scope works. Never put this token in client code or the Gist itself.
3. Copy `.env.example` to `.env.local`. Set:

```text
DANIEL_TOKEN=<a-random-UUID-v4>
ADMIN_TOKEN=<a-different-random-UUID-v4>
GITHUB_GIST_ID=<the-id-in-your-gist-URL>
GITHUB_TOKEN=<your-private-GitHub-token>
GIST_FILENAME=japan-side-quest.json
```

Generate the two UUIDs with Node:

```bash
node -e "console.log(require('node:crypto').randomUUID()); console.log(require('node:crypto').randomUUID())"
```

4. From the folder containing `package.json`, run:

```bash
npm install
npm run dev
```

5. Open `http://localhost:3000/<DANIEL_TOKEN>` or the admin UUID. `/` intentionally returns 404.

For a local production test, stop the dev server first:

```bash
npm run build
npm run start
```

The dependencies have been updated from the old project. Run the installation step even if the previous version was already installed. Keep the generated `package-lock.json` in your own repository so later deployments use the same versions.

## Deploy on Vercel

1. Push this project to a GitHub repository. `.gitignore` excludes `.env.local`, dependencies and build output.
2. In Vercel, choose **Add New > Project**, import the repository and select **Next.js**. Set the root directory to the folder that contains `package.json` and use Node.js 22.x.
3. Add all five variables above to the Production environment. For Preview deployments, use a separate test Gist and different UUIDs, or leave Preview unconfigured. A shared Gist means Preview actions change the real game.
4. Deploy. Send Daniel `https://your-project.vercel.app/<DANIEL_TOKEN>` and keep the admin URL private.
5. After changing environment variables, redeploy. Changing the Gist catalogue itself does not require deployment.

GPS works on `localhost` and HTTPS. A phone accessing a plain HTTP LAN address may not be allowed to use GPS; use Vercel HTTPS for that test. Finishing without GPS is always possible.

## Existing games: no reset required

Keep your current environment values and Gist. On the first successful visit, the app keeps the existing active quests and draws enough unused cards to reach five. That migration is saved to the Gist. Reloading or closing the browser does not shuffle or redraw the hand.

The seed is for new games only. There must be enough unused quests to show five. If the pool is exhausted, fewer cards are shown with an explanation. More than five manually marked active cards is treated as a configuration error rather than silently removing them.

## Game behavior

- **Five promoted quests:** stored as `status: "active"`, including their activation times. A promoted completion or confirmed swap fills just the vacant slot. Existing promoted quests are retained.
- **Search:** type at least two characters. Search checks titles, descriptions and tags; it returns up to 30 unfinished matches from the Gist. No region labels appear on cards.
- **Spontaneous completion:** an available or previously swapped quest can be completed directly from search. It awards its points without altering the five promoted quests. If the search result is itself a promoted quest, normal refill applies.
- **Swapped quests:** excluded from automatic draws but still searchable and completable. Each quest earns points only once.
- **GPS:** one optional location request when completing, never background tracking. No camera upload in this version. Location failures never prevent completion.
- **Score:** earned points are snapshotted on completion. The denominator is the sum of points across all existing catalogue entries, including swapped ones.
- **Tabs:** Quests, Karte, Erklärung. Switching views never changes the promoted quests.
- **Theme:** first visit is light. An explicitly chosen theme is remembered locally.
- **Admin:** separate UUID, all statuses and recent history. Catalogue editing remains in the Gist, not an admin CMS.

## Gist maintenance and limits

Edit descriptions and add new quests directly in the Gist. Give every new quest a unique stable `id`, a nonnegative point value and `status: "available"`. Existing completion and status fields must remain intact. Back up the Gist before major changes; GitHub keeps a revision history.

A Secret Gist is **unlisted, not private**. Anyone who obtains its URL can read it. UUID links are bearer credentials. Do not share links or location history publicly; delete coordinates when you no longer want them retained. The app sets no-index metadata and a no-referrer policy, but those are not strong authentication.

Gist writes are whole-file read/modify/write operations, not database transactions. Writes are serialized within one running server instance and repeated completions cannot award points twice. Separate Vercel instances or manual Gist editing can still overwrite simultaneous changes. This setup is intentionally for one player making sequential actions, not multiple concurrent players. Avoid editing the Gist while a save is in progress. A database is needed if robust cross-instance concurrency becomes essential.

## Tests and verification

```bash
npm test
```

The included native Node tests cover persistence, migration from three to five, promotion/refill, search completion without hand changes, swapped-card search, duplicate completion protection, exhausted pools, GPS fallback, route token roles, and mocked Gist read/write behavior.

The project was syntax-checked, its real React components were server-rendered, and the tests were run during delivery. A Next.js production build and live GitHub/Vercel calls could not be run in the offline authoring environment. Run the local build and a test completion using a test Gist before sharing the production link.

## Style system

See `STYLE_SYSTEM.md` for palette, typography, spacing, component rules and motion behavior. `app/globals.css` holds all design tokens; `components/GameArt.js` holds the capsule, bamboo, torii and shared icons.
