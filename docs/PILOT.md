# Safetytool — pilot guide

## For testers (send this with the link)

Safetytool is a free browser tool for building aviation-safety models (Bowtie, Swiss cheese, SHELL, HFACS, STAMP/STPA, FRAM, Accident Pyramid). No account. Your data stays in your browser; use **บันทึก JSON / Save JSON** to keep a file.

Please try one real task, for example:

1. Open the page. Read the welcome strip. Look at the example (made-up data).
2. **File → New** and build a small model of something you know.
3. **Save JSON**, close the tab, reopen the page and **File → Open** your file.
4. **File → Print / PDF** and look at the result as if for a safety meeting.
5. Tell us how it went (two minutes): the **Give feedback** button in the welcome strip, or the questions in `docs/PILOT-FEEDBACK.md` (copy them into an email or message).

Please do not enter real occurrence data or confidential information during the pilot. This is a thinking and communication aid, not certified safety advice.

## Known limitations (pilot)

* Works in a current desktop browser (Chrome, Edge, Firefox, Safari). Phone layout exists but has not been tested on a real phone.
* Your work is saved in this browser only. Clearing site data erases it. Save a JSON file for anything you care about.
* The **Give feedback** button opens a GitHub form and needs a GitHub account; the plain questions in `docs/PILOT-FEEDBACK.md` need none.
* Evidence attachment is available for Bowtie, Swiss cheese, FRAM and Accident Pyramid only. SHELL, HFACS and STAMP do not have it yet.
* Links between models are kept in this browser; a single saved file does not carry them (use the package export in the **เชื่อมโยง / Links** tab to move them together).
* One open model per model type.

## For the owner: publishing

The app is a static site (no build). It is published from the `main` branch of `github.com/dukperado-hue/Safetytool` with GitHub Pages: `https://dukperado-hue.github.io/Safetytool/`.

The pilot version exists only in the local working tree until it is committed and pushed:

1. Review `git status`, then commit the working tree on `main` (the `.nojekyll` and `sw.js` files are already present).
2. `git push origin main` (if the first push fails with a credential or `sh` error, run it again).
3. Wait about a minute for Pages to rebuild, open the URL in a private window, and run the checklist above once.
4. Issues must be enabled on the repository for the feedback button to work (Settings → General → Features → Issues).
5. Users who already visited an older version may see it from cache once: a normal reload fixes it (the service worker updates in the background).
