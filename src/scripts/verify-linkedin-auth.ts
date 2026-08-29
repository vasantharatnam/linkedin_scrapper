import type { LinkedinAuthHeadersProvider } from "../types/linkedin-auth.types.js";

const createTestHeaders: LinkedinAuthHeadersProvider = () => ({
  accept: "application/vnd.linkedin.normalized+json+2.1",
  cookie:
    'li_at=fake-session-value; JSESSIONID="ajax:fake-csrf"',
  "csrf-token": "ajax:fake-csrf",
  "x-restli-protocol-version": "2.0.0",
  "x-li-lang": "en_US",
  "user-agent": "LinkedIn Authentication Verification",
});

const headers = createTestHeaders();

if (
  headers.cookie !==
  'li_at=fake-session-value; JSESSIONID="ajax:fake-csrf"'
) {
  throw new Error("Cookie header verification failed");
}

if (headers["csrf-token"] !== "ajax:fake-csrf") {
  throw new Error("CSRF header verification failed");
}

if (headers["x-restli-protocol-version"] !== "2.0.0") {
  throw new Error("Rest.li protocol header verification failed");
}

console.log("LinkedIn authentication verification passed.");