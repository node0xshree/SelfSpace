# ShelfSpace

ShelfSpace is a small, static resource-booking demo for a college library, lab, rooms, and sports department. It uses plain HTML, CSS, and JavaScript—there is no backend or real login.

## Run it

Open `index.html` in a browser, or use VS Code Live Server. Live Server is a static preview only; it does not add a backend. Data is saved in that browser's local storage.

## Try the demo

- Use **Switch user or role** to choose a sample member or Admin / Staff.
- Browse and filter the catalog, borrow copies, and join a queue for checked-out resources.
- Review renewals, returns, fines, history, and room/lab bookings.
- In Admin / Staff mode, review loans and reports or advance the simulated date to test overdue fines.
- Choose **Reset demo data** to restore the original sample records. Your light/dark preference is kept separately.

The sample uses a four-item active-loan limit, category-based loan periods, a ₹5 daily overdue fine, and up to two renewals. Sample dates are generated relative to the day the demo is reset.

## Publish with GitHub Pages

1. Create a new GitHub repository, or use the repository already connected to this workspace.
2. In VS Code, open **Source Control** and review the changed-file list. Stage only the ShelfSpace files if this workspace also contains other projects.
3. Enter a commit message, commit the staged files, then use **Publish Branch** or **Sync Changes** to push them to GitHub. Review the selected remote and branch before publishing.
4. On GitHub, open the repository's **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select the branch containing your commit (commonly `main`) and the `/(root)` folder, then save.
6. Wait for the Pages deployment to finish. Open the published URL shown on the Pages settings screen and test the catalog and page navigation.

All page, stylesheet, and script links are relative, so the app can be served from a GitHub Pages project subpath.
