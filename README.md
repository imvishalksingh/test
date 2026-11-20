# Folio Public Library

A static library website built with HTML, CSS, and vanilla JavaScript.

## Run it

1. Extract the project folder.
2. Double-click `index.html` to open it in your browser.

Keep `index.html` beside the `assets` folder. Use the same browser and file location to reopen your demo data.

## Project structure

```text
folio-library/
├── index.html                 Page layout and HTML templates
├── .nojekyll                  Publishes these files directly on GitHub Pages
├── assets/
│   ├── css/site.css           Styling and responsive layout
│   ├── js/
│   │   ├── collection.js      Books, weekly events, and opening hours
│   │   ├── library.js         Browser storage and library rules
│   │   ├── project-files.js   Writes catalog entries and covers to the chosen folder
│   │   ├── admin.js           Catalog, lending, reader, and event screens
│   │   └── site.js            Page navigation and interactions
│   ├── images/                Logo, photos, and book covers
│   └── fonts/                 Webfonts and license files
└── README.md
```

## Explain it to faculty

1. **Open a page.** Links like `#catalog` and `#account` tell `site.js` which HTML template to show. The website stays in `index.html`.
2. **Search for a book.** JavaScript filters the array in `collection.js` by title, author, or ISBN, then fills the book cards on screen. Category, sorting, and availability filters use the same list.
3. **Borrow a book.** `library.js` checks available copies and the five-book limit, adds a 21-day due date, and saves the updated card in the browser. My Library shows the new loan.

For a short demo, create a card with a sample name, search for *The Midnight Library*, save it, borrow it, and open **Account → My Library**. Refresh to show that the loan persists, then renew or return it. You can also book an event and download the card’s activity log.

## Admin panel

Open your local `index.html`, then add `#admin` to the end of the browser address. To save catalog changes for GitHub Pages, connect the local folder you use for your GitHub repository.

- **Catalog** adds books, uploads a cover from your computer, edits details and copy counts, and archives or restores editions. Archived books stay visible on existing loans and reading lists.
- **Loans** shows due dates and lets you check out, renew, or return a book for a reader. It uses the same lending rules as My Library.
- **Readers** shows local cards with their loan, saved-book, and booking counts.
- **Events** adds a dated event with a room and capacity, shows upcoming reservations, and lets you cancel a reservation for a reader.

For a faculty demo, borrow a book as a reader, then return it from **Admin → Loans**. Open the catalog again to show the restored copy count.

### Save books to the project folder

1. Open the extracted `index.html#admin` page in desktop Chrome or Edge.
2. In **Catalog**, click **Connect project folder**, select the same `folio-library` folder that contains `index.html`, and allow editing.
3. Add or edit a book. Its entry goes into `assets/js/collection.js`, and an uploaded cover goes into `assets/images/covers/` as a JPG. Reconnect the folder after reopening the admin page.

If this browser has books or edits from an older version, **Save earlier browser changes** writes them and their covers to the folder. The `folio:books` markers in `collection.js` tell the editor which section to write.

## Where data is saved

Books and weekly events are in `collection.js`. Added events, cards, loans, reading lists, bookings, and recent activity use `localStorage` under `folio-library.v1`. Cards and the admin panel are a local demo. Anyone using the same browser profile can open them. **Download activity** in My Library saves a JSON Lines file for the current card.

## Deploy on GitHub Pages

1. Create a GitHub repository such as `folio-library`. On GitHub Free, use a public repository for GitHub Pages. [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
2. Upload the **contents** of the extracted `folio-library` folder to `main`. Keep `index.html`, `.nojekyll`, and `assets/` together at the repository root. [Upload files to GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
3. In **Settings → Pages**, set **Source** to **Deploy from a branch**, choose **`main`** and **`/ (root)`**, then click **Save**. When deployment finishes, use **Visit site**. For a repository called `folio-library`, the address normally looks like `https://YOUR-USERNAME.github.io/folio-library/`. [Configure the publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### Publish catalog changes

1. Open `index.html#admin` from your local repository checkout and connect that folder. Add or edit a book. For older browser-only books, use **Save earlier browser changes**.
2. Commit the updated `assets/js/collection.js` and any new JPG files under `assets/images/covers/` together, then push to `main`. With GitHub Desktop, use **Commit to main** and **Push origin**. [Commit and push in GitHub Desktop](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop)
3. Once Pages finishes deploying, visitors can see the new catalog on other browsers and devices. Refresh the site to check the update.

Reader cards, loans, and bookings are demo data stored in each browser. Test those features on the hosted URL with a sample card.

## Artwork and type

- The Folio logo, reading-room photo, and reading-club photo were generated for this project.
- The stacks photo is by Janko Ferlič on [Unsplash](https://unsplash.com/photos/library-with-books-wooden-shelves-sfL_QOnmy00).
- Jacket artwork belongs to its respective rights holders. Covers are sourced from [Open Library](https://openlibrary.org/dev/docs/api/covers).
- DM Sans and Instrument Serif use the SIL Open Font License. The licenses are in `assets/fonts/`.
