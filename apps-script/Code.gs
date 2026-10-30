/** WCWC private membership lookup. Deploy as the club owner, access: Anyone. */
const WCWC = Object.freeze({
  label: '2026-27 Members',
  frontendOrigin: 'https://willowcreekwomensclub-byte.github.io',
  memberUrl: 'https://tinyurl.com/wcwc-holidaytea',
  registrationUrl: 'https://tinyurl.com/wcwc-register',
  cacheKey: 'wcwc-members-v1',
  cacheSeconds: 300
});

function doGet() {
  return HtmlService.createHtmlOutput('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WCWC membership service</title><p>WCWC membership service is available. Open the welcome page to continue.</p></html>');
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  // This origin check is for response delivery, not authentication or rate limiting.
  if (p.origin !== WCWC.frontendOrigin || !/^[a-f0-9]{32}$/.test(p.requestId || '')) {
    return HtmlService.createHtmlOutput('Invalid request. Please use the WCWC welcome page.');
  }
  const result = { type: 'wcwc-result', requestId: p.requestId, ok: false };
  const email = normalizeEmail_(p.email);
  if (!validEmail_(email)) {
    result.error = 'invalid_email';
  } else {
    try {
      const members = getMemberEmails_();
      result.ok = true;
      result.destination = members.includes(email) ? WCWC.memberUrl : WCWC.registrationUrl;
    } catch (error) {
      // No submitted email, contact data, or tokens in application logs.
      console.error('WCWC membership lookup failed. Run verifySetup in the editor.');
      result.error = 'lookup_unavailable';
    }
  }
  const template = HtmlService.createTemplateFromFile('Index');
  template.payload = safeJson_(result);
  template.targetOrigin = safeJson_(WCWC.frontendOrigin);
  // Required to embed this non-interactive response in the Pages site.
  return template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function normalizeEmail_(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function validEmail_(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function safeJson_(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
function getMemberEmails_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(WCWC.cacheKey);
  if (cached) return JSON.parse(cached);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Membership refresh is busy.');
  try {
    const second = cache.get(WCWC.cacheKey);
    if (second) return JSON.parse(second);
    const emails = readMemberEmails_();
    const serialized = JSON.stringify(emails);
    // Script cache has a 100 KB/item limit; allow room for multibyte UTF-8.
    if (Utilities.newBlob(serialized).getBytes().length < 95000) {
      cache.put(WCWC.cacheKey, serialized, WCWC.cacheSeconds);
    }
    return emails;
  } finally {
    lock.releaseLock();
  }
}
function readMemberEmails_() {
  const matches = [];
  let pageToken;
  do {
    const options = { pageSize: 1000, groupFields: 'name,groupType,metadata' };
    if (pageToken) options.pageToken = pageToken;
    const page = People.ContactGroups.list(options);
    (page.contactGroups || []).forEach(group => {
      if (group.name === WCWC.label && !(group.metadata && group.metadata.deleted)) matches.push(group.resourceName);
    });
    pageToken = page.nextPageToken;
  } while (pageToken);
  if (matches.length !== 1) throw new Error('Expected exactly one Google Contacts label named ' + WCWC.label + '. Found ' + matches.length + '. Check the account that owns this script.');
  const groupName = matches[0];
  const emails = new Set();
  pageToken = undefined;
  do {
    const options = {
      personFields: 'emailAddresses,memberships',
      sources: ['READ_SOURCE_TYPE_CONTACT'],
      pageSize: 1000
    };
    if (pageToken) options.pageToken = pageToken;
    const page = People.People.Connections.list('people/me', options);
    (page.connections || []).forEach(person => {
      const member = (person.memberships || []).some(m => m.contactGroupMembership && m.contactGroupMembership.contactGroupResourceName === groupName);
      if (member) (person.emailAddresses || []).forEach(item => {
        const email = normalizeEmail_(item.value);
        if (validEmail_(email)) emails.add(email);
      });
    });
    pageToken = page.nextPageToken;
  } while (pageToken);
  return Array.from(emails);
}
/** Run manually in the editor as the club owner. Never returns contact details. */
function verifySetup() {
  const emails = readMemberEmails_();
  const summary = { label: WCWC.label, uniqueMemberEmailCount: emails.length, frontendOrigin: WCWC.frontendOrigin };
  console.log(JSON.stringify(summary));
  return summary;
}
/** Run manually after changing members if you do not want to wait five minutes. */
function clearMembershipCache() {
  CacheService.getScriptCache().remove(WCWC.cacheKey);
}
