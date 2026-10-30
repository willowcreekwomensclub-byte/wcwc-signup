# Start here: maintaining WCWC signup

This repository runs a small, real club website. The people maintaining it may have little technical experience and may give brief or unclear requests. Help them finish the task; do not expect them to know developer terminology.

## The product and its non-negotiable behavior

Willow Creek Women's Community (WCWC) shares this public welcome link:
https://willowcreekwomensclub-byte.github.io/wcwc-signup/

A visitor sees the real WCWC logo and “Welcome to WCWC!”, enters an email, and presses Continue. The backend checks the club Google Contacts label named exactly `2026-27 Members`.

- Matching labeled contact: https://tinyurl.com/wcwc-holidaytea
- No matching labeled contact: https://tinyurl.com/wcwc-register
- Lookup unavailable: show a friendly retry error. NEVER silently treat an outage as a non-member.
- Email comparison ignores case and surrounding whitespace. Any email on a labeled contact is accepted.
- Visitors must not sign in to Google or GitHub or authorize their own Contacts. Owner authorization happens during setup only.

Do not replace the backend lookup with a browser-side membership list, visitor OAuth, a public Sheet, or a hardcoded member. This is convenient routing by a self-reported email, not identity verification or access control for the destination forms.

## Work with the club maintainer

Lead with the practical result in plain English. Say “welcome page,” “member list,” “club Google account,” and “public link.” Translate errors into a concrete next step. Do not make the user diagnose deployment IDs, CORS, OAuth, branch settings, or API scopes.

Read the code, README, current deployment state and this file before asking questions. A short request such as “fix the logo,” “the tea link is wrong,” “members are going to registration,” or “make this work” refers to this system unless evidence suggests otherwise. Make reasonable reversible choices and keep working. Ask one focused question only when an answer changes the actual result or a required access/approval is unavailable. Never request passwords or tokens in chat.

If asked to change “membership year” without a year, inspect the current Contacts labels and ask which season is intended; do not infer the season from today's date. If a destination is unspecified, ask for the new destination rather than inventing one. Do not edit Contacts, send email, submit reservation/registration forms, or change event details unless specifically asked.

Keep necessary progress updates short. Honor requests to be quiet until completion or a blocker. Finish with the usable public link and relevant verification, not a long technical report. If blocked, state exactly what is ready, what is not working, and the one action needed. Never call the project finished merely because an HTML file was generated or the homepage loads.

## Architecture and files

No build tools, npm packages, database, paid hosting, or GitHub Actions workflow authored by us is needed. Keep it simple.

- `docs/index.html`: public page. Logo is a Base64 PNG embedded here, verified against the original club asset. Keep its alt text.
- `docs/styles.css`: responsive styles and visible keyboard focus.
- `docs/app.js`: form validation, hidden iframe POST, response verification, timeout, redirects and Back-button recovery.
- `docs/config.js`: deployed Apps Script `/exec` URL. This URL is public configuration, not a secret. Never use `/dev`.
- `docs/.nojekyll`: static Pages publishing.
- `apps-script/Code.gs`: server-side People API lookup, exact label resolution, full pagination, 5-minute server cache, errors, setup verification.
- `apps-script/Index.html`: the backend response template, NOT the welcome page. In Apps Script create an HTML file named `Index` (capital I); the editor adds `.html`. Lowercase `index` causes “No HTML file named Index was found.”
- `apps-script/appsscript.json`: V8, People advanced service and `contacts.readonly` scope.
- `tests/membership.test.cjs`: dependency-free Node tests using synthetic contacts.
- `README.md`: owner setup, deployment, architecture and manual acceptance checklist.

Pages publishes branch `main`, folder `/docs`. The repository is public. Direct commits to main were explicitly authorized for this setup, with no staging branch required; honor any newer user or repository instructions. Inspect current changes before committing; preserve unrelated work. Do not force-push or delete history.

Apps Script is a separate deployment: pushing GitHub does NOT update Apps Script, and saving its editor does NOT update a versioned web app. Keep local source, GitHub source and the deployed script consistent.

## Deployed system identifiers (verify before changing)

Google account owning contacts and deployment: `willowcreekwomensclub@gmail.com`.
Project name: **WCWC Welcome Membership**.
Project editor:
https://script.google.com/home/projects/1vMQ0lp0YWjou9FIsTcDnpU_iNjPQyp6dnpSw4yNDYBkVF1XydrS0JWiG/edit

Public backend URL:
https://script.google.com/macros/s/AKfycbyEnYlKXD4fMO56s6PjPc2CWw7nx5lOh1sfV-m6MgPIJztK9KP1FD2yhA0ONUXBzgYZ/exec

There is also an older project named **Entry form** in the club browser. Do not accidentally edit or deploy that project. The project above is this website's backend.

Deploy the backend as **Me (club owner)**, access **Anyone**, not “Anyone with Google account.” Prefer updating the existing deployment with a **New version** to keep its URL stable. If a new deployment URL is necessary, also update `docs/config.js` and wait for Pages to publish.

Allowed frontend origin in `Code.gs`: `https://willowcreekwomensclub-byte.github.io` (no path or trailing slash). A custom domain or account move requires changing this and redeploying the backend.

## Why the iframe bridge exists — preserve its safeguards

The GitHub page uses an ordinary form POST to a hidden iframe. Apps Script returns HTML with a `postMessage` to the exact configured Pages origin. The frontend validates a fresh 128-bit request ID, the Google HTTPS message origin, and the two allowed destination URLs before navigating its own window.

This avoids Apps Script CORS and sandbox top-navigation limitations. A naive `fetch()` replacement, `mode: 'no-cors'`, or an automatic top redirect inside Apps Script can break the flow. Do not replace the transport casually. If changing it, prove both routes in a signed-out browser.

The response must retain `XFrameOptionsMode.ALLOWALL` so Pages can embed it. It contains only the decision/error and nonce, never contacts. Escape template JSON as currently implemented. Do not use wildcard postMessage targets, trust arbitrary destination URLs from a message, or drop nonce/origin/destination validation. The submitted origin is a delivery check, NOT authentication. A public service can be queried by others; do not claim it prevents membership enumeration or authenticates users.

## Membership and privacy

Membership records remain in the club's Google Contacts. No member email addresses, names, phone numbers, addresses, exports, test screenshots containing private records, OAuth tokens, credentials or private keys may be committed, included in logs, or put into frontend assets. Use synthetic data in automated tests. For a real-member browser test, use a contact already authorized for this task and do not save its email in test files, commit messages, documentation or screenshots.

The only OAuth scope required is `https://www.googleapis.com/auth/contacts.readonly`. Do not broaden access to Gmail, Drive, Contacts write access, or other scopes to solve an unrelated problem. If authorization is missing, guide the owner through the minimum permission needed. Visitor login is never a workaround.

`verifySetup` is run manually in the script editor by the owner. It reports the label and a count, not contact details. It successfully found 134 distinct member emails during setup on October 29, 2026; this is a historical sanity check, NOT a hardcoded expected count. Counts naturally change and can exceed labeled contacts because a contact can have several emails.

Membership is cached for up to five minutes. Run `clearMembershipCache` in the editor after membership changes if needed; Google propagation may add delay. Do not add contacts just to make a test pass.

## Common requests and diagnosis

**“Someone is a member but goes to registration.”** Check their exact email is attached to a contact with the exact current label in the deploying account. Check alternate email addresses, correct year, cache, and Google propagation. Check `verifySetup` and Executions for failures. Do not publish the list or change everyone to the member destination.

**“It asks people to log in.”** Reproduce signed out. Distinguish the welcome page, backend, and final Google Form. Check backend Execute as Me / Anyone and `/exec`. Check form settings separately. An optional “Sign in to Google to save your progress” link is different from a mandatory login wall. Do not require visitor OAuth.

**“It says getting ready.”** `config.js` is empty, malformed, stale, or hasn't published. Check the served file and latest Pages build. A public backend URL is expected here; no Google API key is needed.

**“It keeps checking / times out.”** Check Apps Script Executions, anonymous `/exec` access, endpoint spelling, exact origin match, latest deployment version, response template case, iframe behavior and browser privacy settings. An API outage must remain an error, not send the person to registration.

**“My change doesn't show.”** Determine whether it was frontend or backend. Inspect GitHub commit/Pages build or Apps Script versioned deployment accordingly. Allow publishing and browser-cache time; use a fresh incognito session. Do not repeatedly create deployments or disable security protections.

**“Change the logo.”** Obtain the intended image, verify it visually, embed it into `docs/index.html` and check mobile display. Do not go back to a Google Drive image URL with unverified permissions.

**“Change the destination.”** Update the backend destination and the frontend destination allowlist together, deploy both, and test both routes. Preserve the club's intended URLs unless explicitly changed. Do not submit the final form as part of routing tests.

**“Change the year.”** Confirm the intended exact label exists in the correct account, update `WCWC.label`, invalidate the cache (change cache key or clear it), redeploy, and test a current member and non-member. Do not rename or relabel contacts without explicit authorization.

## Validation proportional to the change

For backend logic: `node --test tests/*.test.cjs`. No npm install needed. Existing tests cover pagination, matching, alternate emails, errors, invalid requests, cache reuse and template escaping.

For routing/deployment changes, verify the real public URL in a fresh incognito/signed-out window:
1. Page opens with no login, logo visible.
2. Invalid email gives a useful message.
3. Known labeled member reaches Holiday Tea; mixed case and surrounding whitespace still work.
4. Synthetic non-member reaches Registration.
5. No Contacts consent prompt or mandatory login appears for the visitor.
6. Destination forms are accessible; do not submit them.
7. Check mobile layout and keyboard use if the form/styles changed.
8. Verify an error path in a test copy when changing error logic. Do not deliberately break production to test errors.

For small copy/style edits, inspect the changed rendering; avoid inventing unnecessary tests. Tests with mocked APIs do not prove anonymous Google access or real membership routing. Record what actually passed and any untested limits honestly.

## Working through tools

Prefer available authenticated tools or CLIs. The setup was completed via signed-in Chrome because shell GitHub credentials were absent. Public reads can use Git/curl; writes require authorized GitHub access. Never extract browser cookies or tokens. User approval of CLI installation is not approval to expose credentials. If computer use reports stale controls, refresh the UI state before clicking again. Preserve unrelated browser tabs and existing projects.

If a safety/approval tool blocks an action, explain its specific reason and request only the approval it requires. Otherwise act within the user's authorized task without repeatedly asking permission for routine reversible work.
