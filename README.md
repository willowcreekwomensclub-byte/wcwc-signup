# WCWC welcome page

Public website for Willow Creek Women's Community. Visitors enter an email, the club's Google Contacts are checked on the server, and the visitor is sent to Holiday Tea or Registration. Visitors never authorize Google Contacts.

Expected Pages address after publication: https://willowcreekwomensclub-byte.github.io/wcwc-signup/

## Files

- `docs/index.html`: welcome page, with the verified WCWC PNG embedded as Base64.
- `docs/styles.css`: responsive styling.
- `docs/app.js`: validation, membership request and redirect handling.
- `docs/config.js`: paste the public Apps Script `/exec` URL here.
- `apps-script/Code.gs`: server-only membership logic.
- `apps-script/Index.html`: response bridge used by Apps Script. Create it with capital `I`, named `Index` in the editor. This is different from the lowercase public `docs/index.html`.
- `apps-script/appsscript.json`: read-only Contacts scope, People API service and deployment defaults.
- `tests/membership.test.cjs`: isolated backend logic tests with synthetic contacts.

There is no build step or dependency installation. Never add actual membership records, OAuth tokens, or Google credentials to this repository.

## 1. Configure the club account and membership source

1. Sign in to the Google account that owns the club's Google Contacts. Sharing a Sheet or being a Workspace administrator does not automatically give the script access to another user's contacts.
2. Open https://contacts.google.com/ in that account.
3. Confirm the exact label `2026-27 Members` exists and contains the current members. The hyphen is a normal ASCII hyphen. Each member needs an email address; all email addresses on each labeled contact are accepted.
4. Create a standalone project at https://script.google.com/ (or update the intended existing project after backing it up).
5. Paste `apps-script/Code.gs` into `Code.gs`.
6. Add an **HTML** file named **Index** and paste `apps-script/Index.html` into it. Apps Script adds `.html` automatically. Naming it `index` causes the previous “No HTML file named Index was found” error.
7. Open **Project Settings**, enable **Show appsscript.json manifest file in editor**, then replace its content with `apps-script/appsscript.json`.
8. Confirm **People API** is listed under **Services**. If needed, click **+**, select People API v1, identifier `People`, and Add. For a standard Google Cloud project, also enable the People API in that project's Cloud Console. The default Apps Script Cloud project normally handles enablement when the advanced service is added.
9. Run **verifySetup** from the editor and authorize read-only access to the club account's contacts. This is a one-time owner action. Visitors must never see it. Inspect the execution log: it should show the exact label and a plausible `uniqueMemberEmailCount`, without printing member emails. A missing label or permission error must be fixed before deployment. A zero count is possible for an empty label but should be investigated if members are expected.

The backend scans every page of contacts and labels, compares normalized lowercase emails, and caches membership for five minutes. Run **clearMembershipCache** after changes to refresh sooner; Google itself can take time to propagate edits. Lookup failures produce an error, never a non-member result.

## 2. Deploy the Apps Script backend

1. **Deploy → New deployment → Select type → Web app**.
2. Set **Execute as: Me**, signed in as the club's contact owner.
3. Set **Who has access: Anyone**. Do not choose **Anyone with Google account** or **Only myself**.
4. Deploy and copy the deployed URL ending in **/exec**. Do not use `/dev`, which is only for script editors.
5. Open the `/exec` URL in a private/incognito window with no Google account signed in. It must show “WCWC membership service is available.” If it asks for sign-in, fix access before continuing. This checks anonymous deployment access, not the membership lookup itself.
6. Paste the `/exec` URL between the quotes in `docs/config.js`.

If Workspace policy prevents **Anyone**, this backend cannot meet the no-sign-in requirement under that account. Use an authorized club account that permits anonymous deployment or a different backend. Hosting the frontend on GitHub does not override Google's backend access policy.

When changing Apps Script code later, use **Deploy → Manage deployments → Edit → New version → Deploy** to retain the `/exec` URL. Saving editor changes alone does not update a versioned deployment.

## 3. Publish GitHub Pages

1. Upload this package's contents to https://github.com/willowcreekwomensclub-byte/wcwc-signup (preserve the `docs` and `apps-script` folders).
2. Commit the files to `main`.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, branch **main**, folder **/docs**, and Save.
5. Wait for the Pages build to finish. The website should be at https://willowcreekwomensclub-byte.github.io/wcwc-signup/ . Verify the exact URL shown by GitHub.

GitHub Free supports Pages from public repositories. If this is a private repository and Pages is unavailable, the owner can make the code repository public or use a plan supporting private source repositories. Only the app's code and public logo belong in this repository; the contacts stay in Google. Do not upload private club files while changing visibility.

The allowed origin is already set in `Code.gs` to `https://willowcreekwomensclub-byte.github.io`. If moving to another account or custom domain, update `frontendOrigin` to its HTTPS origin without a path or trailing slash, and deploy a new backend version.

## How the request works

A normal form POST sends the email to an invisible Apps Script iframe. This avoids depending on CORS behavior of Apps Script responses and keeps the submitted email out of query strings. Apps Script checks contacts under the deploying account, then its response HTML sends only a destination or generic error to the exact configured Pages origin using `postMessage`. Pages validates the Google origin, a fresh 128-bit request identifier and an explicit allowlist of the two destination URLs before navigating its own window. This avoids Google sandbox restrictions on automatic top-level redirects.

The response HTML intentionally allows framing and contains no contact list or credentials. The origin field is a routing check, not access control: a public lookup can be queried by other clients. This is email-based routing, not proof the visitor owns the email and not protection for the destination page. The application does not retain submitted email addresses or log them; Google/GitHub may keep normal platform logs. A malicious user can submit guesses and infer membership from the destination. For a small club this implementation uses a short server cache and refresh lock, not a dedicated abuse-prevention service.

## Acceptance checklist — run after both deployments

- [ ] Public Pages URL opens in an incognito window with no Google or GitHub login.
- [ ] Logo displays with Google Drive blocked or signed out (the image is embedded).
- [ ] Empty and malformed email produce a friendly validation message.
- [ ] A known labeled member redirects to https://tinyurl.com/wcwc-holidaytea .
- [ ] That same member in UPPERCASE and with surrounding spaces still works.
- [ ] An alternate email saved on that member's contact also works.
- [ ] A known non-member and a contact without the membership label redirect to https://tinyurl.com/wcwc-register .
- [ ] Both final destination forms themselves work anonymously, if that is required. Their sharing settings are separate from this site.
- [ ] No visitor is asked to authorize Google Contacts.
- [ ] Chrome and Safari/mobile work, including private browsing and common tracking protection settings.
- [ ] Page fits a narrow mobile screen and works with keyboard navigation.
- [ ] A failed backend request shows a retry message, never a registration redirect. Verify with a deliberately invalid endpoint in a local/test copy, not by breaking the production deployment.
- [ ] Returning with browser Back enables another submission.
- [ ] An updated member appears after clearing the backend cache and allowing Google's propagation delay.

## Verification and troubleshooting

Run `node --test tests/*.test.cjs` from this directory. Tests use synthetic contacts and do not access Google. They cover pagination, case and whitespace normalization, multiple email addresses, labeled versus unlabeled contacts, cache reuse, invalid requests, and API/missing-label failure behavior. They are not substitutes for the incognito acceptance tests.

A response timeout usually means anonymous access is misconfigured, the `/exec` URL is wrong, a browser blocks the response iframe, or the backend was not redeployed. Check **Apps Script → Executions**, rerun **verifySetup**, and confirm the two origins match. The website intentionally does not show a Google login prompt inside the hidden frame.

Sources: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [Advanced People service](https://developers.google.com/apps-script/advanced/people), [Contacts pagination](https://developers.google.com/people/api/rest/v1/people.connections/list), [Contact groups](https://developers.google.com/people/api/rest/v1/contactGroups/list), [Apps Script iframe restrictions](https://developers.google.com/apps-script/guides/html/restrictions).
