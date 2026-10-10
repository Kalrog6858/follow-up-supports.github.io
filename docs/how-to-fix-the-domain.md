# How to fix "the website shows a 404 / won't load"

This is what went wrong with followupsupports.ca in October 2026, how it was fixed,
and how to check it yourself if it ever happens again.

---

## 1. How the website works (the big picture)

Three pieces have to line up for someone to see the site:

| Piece | Where it lives | What it does | Analogy |
|---|---|---|---|
| **The files** (HTML, CSS, JS) | GitHub repo `Kalrog6858/follow-up-supports.github.io` | The actual website | The house |
| **GitHub Pages** | Repo → Settings → Pages | Puts the files online and adds the padlock (HTTPS certificate) | The landlord who opens the door |
| **DNS** | CanSpace (where the domain was bought) | Turns the name `followupsupports.ca` into GitHub's server addresses | The phone book / street address |

If **any one** of these is wrong, the site breaks, even when the files are perfect.

---

## 2. What was wrong

At CanSpace, the domain had four **A records**. An A record means "this name lives at this numeric
address (IP address)." GitHub Pages needs exactly these four:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

One of them had been typed as `185.199.110.135`. The last digits were swapped. That address isn't GitHub.

Because of that one typo:
1. GitHub couldn't confirm that the domain fully pointed to it.
2. So it couldn't renew the security certificate (the padlock 🔒).
3. Without a certificate, GitHub stopped serving the domain, and visitors got a **404** or a security error.

**Lesson:** a 404 doesn't always mean your files are missing. It can mean the domain isn't connected properly.

---

## 3. How it was fixed (the steps)

### Step A: Fix the record at CanSpace (only needed if DNS is wrong)
1. canspace.ca → **Client Login** → **Domains** → **My Domains** → `followupsupports.ca` → **Manage** → **DNS Management**.
2. Look at the rows where **Name = `@`** and **Type = `A`**. There should be exactly four, matching the list above.
3. Click the ✏️ pencil on any wrong row, fix the value, and **Save**.
4. Don't touch the MX (email), NS (locked) or TXT rows.

### Step B: Make GitHub re-check and issue a new certificate
1. github.com/Kalrog6858/follow-up-supports.github.io → **Settings** → **Pages**.
2. Under **Custom domain**, click **Remove**. Then type `followupsupports.ca` again and click **Save**.
3. Wait for the green **"DNS check successful."**
4. Wait for the certificate (usually 15–60 minutes). Then tick **Enforce HTTPS**.

### Step C: Be patient
DNS changes spread slowly. Internet providers (Rogers, Bell, etc.) keep a saved copy for the
**TTL** time shown at CanSpace (14400 seconds = 4 hours). During that time, the site may work
on mobile data but not on your home Wi-Fi. That's normal.

---

## 4. Checklist: "the site is down, what do I check?"

Go in this order:

1. **Is it just me?** Try your phone on mobile data (Wi-Fi off). If it works there, it's a
   saved-copy/DNS delay. Wait a few hours.
2. **GitHub → Settings → Pages.** Does it say *"Your site is live"*? Is the custom domain still
   `followupsupports.ca`? Is there a red DNS error?
3. **Is the `CNAME` file still in the repo?** It must contain only `followupsupports.ca`.
   If someone deletes it, the custom domain disconnects.
4. **Did the last change break the build?** Click the **Actions** tab in the repo. A red ❌ means the
   last publish failed. Click it to see why.
5. **Check DNS from anywhere:** go to https://dnschecker.org, type `followupsupports.ca`,
   choose **A**, and confirm all results show the four `185.199.xxx.153` addresses.
   For `www.followupsupports.ca`, choose **CNAME**. It should show `kalrog6858.github.io`.
6. Still stuck? Fix any wrong DNS record (Step A), then do the remove/re-add trick (Step B).

---

## 5. The correct settings (keep these safe)

**CanSpace DNS:**
| Name | Type | Value |
|---|---|---|
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |
| www | CNAME | kalrog6858.github.io. |

**GitHub → Settings → Pages:**
- Source: *Deploy from a branch* → `main` → `/ (root)`
- Custom domain: `followupsupports.ca`
- Enforce HTTPS: ✅

**Remember:** you only ever need CanSpace for DNS problems or to renew the domain each year.
All normal website editing happens in GitHub.
