# Push To GitHUB

Quick steps after you change code and want those changes on **GitHub** (and then Vercel, if connected).

## 1. Open Command Prompt

```cmd
cd /d F:\GalaxRX\GalaxRX Market Place
```

## 2. See what changed (optional but useful)

```cmd
git status
```

- **Modified** / **new** files listed → you have something to commit.
- **nothing to commit, working tree clean** → no file changes since last commit; nothing to push.

## 3. Stage all changes

```cmd
git add -A
```

## 4. Commit with a short message

```cmd
git commit -m "Short description of what you changed"
```

Examples:

- `git commit -m "Fix buyer email notification"`
- `git commit -m "Update sell form labels"`

If Git says **nothing to commit**, you skipped saving files in the editor or there were no real changes.

## 5. Push to GitHub

```cmd
git push
```

First time on a new PC you may be asked to sign in; use your GitHub username and a **Personal Access Token** as the password (not your GitHub account password). If login fails, clear old credentials: **Windows Credential Manager → Windows Credentials → remove `git:https://github.com`**, then `git push` again.

## Personal Access Token (when you need it)

- **You do not need a new token every time you push.** After you enter it once, Windows **Credential Manager** usually saves it; later `git push` / `git pull` won’t ask again.
- **You need a new token** when: the old one **expires**, you **revoke/delete** it on GitHub, you **removed** the saved `git:https://github.com` credential, or you’re on a **different PC**.
- **Longer expiry:** GitHub usually doesn’t “extend” the same secret. **Generate a new token** (or **Regenerate** if offered) and set **Expiration** to the longest you’re allowed (e.g. custom date ~1 year). Org accounts may cap this.
- **After you switch to a new token:** clear the old **`git:https://github.com`** credential (optional but avoids confusion), then run **`git push`** or **`git pull`** once and paste the **new** token when asked.  
- **You do not need to push the whole project again** just because you changed the token. The token only proves who you are to GitHub; your repo and commits are unchanged. **Push again only** when you have **new commits** that aren’t on GitHub yet (`git status` will show work to commit, or `git log origin/main..HEAD` shows unpushed commits).

## 6. Confirm

- Repo: https://github.com/galaxrx/galaxrx-marketplace  
- Or run: `git log -1 --oneline` — latest commit should match what you see on GitHub.

---

## One-liner (when you’re sure everything should be committed)

```cmd
cd /d F:\GalaxRX\GalaxRX Market Place && git add -A && git commit -m "Your message" && git push
```

(`&&` runs the next command only if the previous one succeeded.)

---

## Reminders

- **`node_modules`** and **`.next`** are **not** pushed (they’re in `.gitignore`). That’s correct.
- **`.env`** is **not** pushed — set secrets on **Vercel** (or your host) separately.
- Remote name is **`origin`**, branch is **`main`** (already set from your first push).
