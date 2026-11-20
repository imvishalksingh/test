'use strict';

const main = document.querySelector('#main');
const notice = document.querySelector('#message');
const nav = document.querySelector('#site-nav');
const menu = document.querySelector('.menu-toggle');
const accountMenu = document.querySelector('.account-menu');
const smallScreen = window.matchMedia('(max-width: 620px)');
let lastCatalog = '#catalog';
let messageTimer;

function template(id) {
    return document.getElementById(id).content.cloneNode(true);
}

function slot(root, name) {
    return root.querySelector(`[data-slot="${name}"]`);
}

function text(root, name, value) {
    slot(root, name).textContent = value;
}

function element(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
}

function link(label, target, style) {
    const node = element('a', label, style);
    node.href = target;
    return node;
}

function button(label, style, onClick) {
    const node = element('button', label, `button ${style}`);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
}

function dateLabel(date, options) {
    return date.toLocaleDateString('en-US', options);
}

function dueLabel(date) {
    return dateLabel(localDate(date), { month: 'short', day: 'numeric', year: 'numeric' });
}

function clock(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function hoursLabel(hours) {
    const time = hour => clock(new Date(2000, 0, 1, hour));
    return `${time(hours.opens)} – ${time(hours.closes)}`;
}

function coverPath(isbn) {
    return `assets/images/covers/${isbn}.jpg`;
}

function bookImageSource(book) {
    if (typeof book.cover === 'string' && book.cover.startsWith('data:image/jpeg;base64,')) return book.cover;
    if (book.coverFile !== undefined) {
        return /^\d{13}-[a-f0-9]{16}\.jpg$/.test(book.coverFile) && book.coverFile.startsWith(`${book.isbn}-`)
            ? `assets/images/covers/${book.coverFile}` : '';
    }
    return BOOKS.some(item => item.isbn === book.isbn) ? coverPath(book.isbn) : '';
}

function showCover(view, book, thumbnail = false) {
    const image = view.querySelector('img');
    const source = bookImageSource(book);
    const fallback = () => {
        const mark = document.createElement('img');
        mark.className = 'folio-mark';
        mark.src = 'assets/images/folio-mark.png';
        mark.alt = '';
        if (thumbnail) {
            image.replaceWith(mark);
        } else {
            const jacket = element('span', '', 'jacket-type');
            jacket.setAttribute('aria-hidden', 'true');
            jacket.append(element('span', book.author), element('strong', book.title), mark);
            image.replaceWith(jacket);
        }
    };
    if (source) {
        image.addEventListener('error', fallback, { once: true });
        image.src = source;
    } else {
        fallback();
    }
}

function bookPath(isbn) {
    return `#book/${isbn}`;
}

function openCardPath(next) {
    return `#profiles?${new URLSearchParams({ next })}`;
}

function announce(message, error = false) {
    clearTimeout(messageTimer);
    notice.replaceChildren(element('p', message, error ? 'notice error' : 'notice'));
    if (!error) messageTimer = setTimeout(() => notice.replaceChildren(), 4800);
}

function runAction(task, message) {
    try {
        task();
        render();
        if (storageAvailable) announce(message);
        else announce(`${message} Browser storage is unavailable. Changes last until you close this page.`, true);
    } catch (error) {
        announce(error.message, true);
    }
}

function availability(view, message, inStock) {
    text(view, 'availability', message);
    view.querySelector('.availability').classList.toggle('in-stock', inStock);
}

function bookCard(book, data) {
    const view = template('book-card');
    slot(view, 'book-link').href = bookPath(book.isbn);
    view.querySelector('.cover-stage').classList.add(book.tone);
    showCover(view, book);
    text(view, 'title', book.title);
    text(view, 'author', book.author);
    text(view, 'category', book.category);
    const inStock = availableCopies(book, data) > 0;
    availability(view, inStock ? 'Available' : 'On loan', inStock);
    return view;
}

function showHome(view, data, card) {
    const now = new Date();
    const hours = HOURS[now.getDay()];
    const open = now.getHours() >= hours.opens && now.getHours() < hours.closes;
    text(view, 'today-hours', hoursLabel(hours));
    const dot = view.querySelector('.hours-dot');
    dot.classList.toggle('now-open', open);
    dot.setAttribute('aria-label', open ? 'Open now' : 'Closed now');
    if (card) {
        slot(view, 'card-link').href = '#account';
        text(view, 'card-title', 'My Library');
        text(view, 'card-note', 'Loans and reading list');
    }
    view.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        const query = event.currentTarget.elements.q.value.trim();
        location.hash = query ? `catalog?${new URLSearchParams({ q: query })}` : 'catalog';
    });
    slot(view, 'book-grid').append(...catalogBooks(data).slice(0, 5).map(book => bookCard(book, data)));
    renderEvents(view, data, card, true);
}

function showCatalog(view, params) {
    const form = view.querySelector('form');
    const { q, sort, available } = form.elements;
    const categories = [...new Set(BOOKS.map(book => book.category))];
    const options = slot(view, 'category-options');
    for (const name of categories) {
        const option = document.createElement('input');
        option.type = 'radio';
        option.name = 'category';
        option.value = name;
        const label = element('label', '', 'category-chip');
        label.append(option, element('span', name));
        options.append(label);
    }
    const category = form.elements.category;
    q.value = (params.get('q') || '').slice(0, 120);
    category.value = categories.includes(params.get('category')) ? params.get('category') : '';
    sort.value = params.get('sort') || '';
    available.checked = params.get('available') === '1';
    const grid = slot(view, 'book-grid');
    const empty = slot(view, 'catalog-empty');
    const count = slot(view, 'result-count');

    function refresh() {
        const filters = { query: q.value, category: category.value, sort: sort.value, available: available.checked };
        const data = readLibrary();
        const books = filterBooks(data, filters);
        grid.replaceChildren(...books.map(book => bookCard(book, data)));
        empty.hidden = books.length > 0;
        count.textContent = `${books.length} ${books.length === 1 ? 'book' : 'books'}`;

        const address = new URLSearchParams();
        if (q.value.trim()) address.set('q', q.value.trim());
        if (category.value) address.set('category', category.value);
        if (sort.value) address.set('sort', sort.value);
        if (available.checked) address.set('available', '1');
        lastCatalog = address.size ? `#catalog?${address}` : '#catalog';
        if (location.hash !== lastCatalog) {
            try { history.replaceState(null, '', lastCatalog); } catch { /* Filters still work in the current page. */ }
        }
    }

    form.addEventListener('submit', event => { event.preventDefault(); refresh(); });
    form.addEventListener('input', refresh);
    slot(view, 'clear-filters').addEventListener('click', () => { form.reset(); refresh(); q.focus(); });
    refresh();
}

function showBook(view, book, data, card) {
    for (const key of ['title', 'author', 'description', 'year', 'isbn', 'category']) text(view, key, book[key]);
    slot(view, 'description').hidden = !book.description;
    slot(view, 'category').href = `#catalog?${new URLSearchParams({ category: book.category })}`;
    view.querySelector('.back-link').href = lastCatalog;
    view.querySelector('.cover-stage').classList.add(book.tone);
    showCover(view, book);
    const remaining = availableCopies(book, data);
    const loan = card?.loans.find(item => item.isbn === book.isbn);
    const actions = slot(view, 'book-actions');
    if (loan) {
        availability(view, `On your card · Due ${dueLabel(loan.due)}`, true);
        actions.append(link('Manage loan', '#account', 'button primary'));
    } else if (book.archived) {
        availability(view, 'This edition is archived', false);
    } else {
        availability(view, remaining ? `${remaining} of ${book.copies} copies available` : 'All copies are on loan', remaining > 0);
        if (remaining && card) {
            actions.append(button(`Borrow for ${LOAN_DAYS} days`, 'primary', () => runAction(() => changeLoan('borrow', book.isbn), 'Book borrowed.')));
        }
    }
    if (card && (!book.archived || card.saved.includes(book.isbn))) {
        const saved = card.saved.includes(book.isbn);
        const label = saved ? 'Remove from list' : 'Save to reading list';
        actions.append(button(label, 'secondary', () => runAction(() => changeReadingList(saved ? 'remove' : 'save', book.isbn), saved ? 'Removed from your list.' : 'Saved to your list.')));
    } else if (!card && !book.archived) {
        actions.append(link('Open a library card', openCardPath(`book/${book.isbn}`), 'button primary'));
    }
}

function dateTile(view, date) {
    view.querySelector('time').dateTime = date.toISOString();
    text(view, 'month', dateLabel(date, { month: 'short' }));
    text(view, 'day', String(date.getDate()).padStart(2, '0'));
}

function renderEvents(view, data, card, summary = false) {
    const list = slot(view, 'events');
    const events = upcomingEvents(data);
    const visible = summary ? events.filter(event => event.date <= addDays(new Date(), 7)).slice(0, 3) : events;
    for (const event of visible) {
        const row = template('event-row');
        row.querySelector('li').id = event.id;
        dateTile(row, event.date);
        text(row, 'title', event.title);
        text(row, 'event-kind', event.type);
        text(row, 'event-meta', `${dateLabel(event.date, { weekday: 'long' })}, ${clock(event.date)} · ${event.room}`);
        const actions = slot(row, 'event-actions');
        if (summary) {
            const name = slot(row, 'title');
            name.replaceWith(element('h3', event.title));
            slot(row, 'event-copy').hidden = true;
            const next = link('→', `#events/${event.id}`, 'event-forward');
            next.setAttribute('aria-label', `Details for ${event.title}`);
            actions.replaceWith(next);
        } else {
            text(row, 'event-copy', event.description);
            slot(row, 'event-copy').hidden = !event.description;
            const booked = card?.bookings.includes(event.key);
            text(row, 'event-slots', booked ? 'Your spot is booked' : event.remaining ? `${event.remaining} spots left` : 'Fully booked');
            if (booked) {
                actions.append(button('Cancel booking', 'secondary', () => runAction(() => changeBooking('cancel', event.key), 'Booking cancelled.')));
            } else if (event.remaining && card) {
                actions.append(button('Book a spot', 'primary', () => runAction(() => changeBooking('book', event.key), 'Your spot is booked.')));
            } else if (event.remaining) {
                actions.append(link('Open a card to book', openCardPath(`events/${event.id}`), 'button secondary'));
            }
        }
        list.append(row);
    }
}

function showVisit(view, card) {
    const today = new Date().getDay();
    const table = slot(view, 'hours');
    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
        const hours = HOURS[day];
        const row = document.createElement('tr');
        const name = element('th', hours.day);
        name.scope = 'row';
        if (day === today) {
            row.className = 'today';
            name.append(element('small', 'Today'));
        }
        row.append(name, element('td', hoursLabel(hours)));
        table.append(row);
    }
    if (card) {
        slot(view, 'card-link').href = '#account';
        text(view, 'card-link', 'Open My Library');
    }
}

function showProfiles(view, data, params) {
    const next = params.get('next') || 'account';
    const profiles = slot(view, 'profile-list');
    function selectCard(name, create) {
        try {
            openCard(name, create);
            location.hash = next;
            if (!storageAvailable) announce('Browser storage is unavailable. Changes last until you close this page.', true);
        } catch (error) {
            announce(error.message, true);
        }
    }
    for (const card of data.cards) profiles.append(button(card.name, 'secondary', () => selectCard(card.name, false)));
    view.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        selectCard(event.currentTarget.elements.name.value, true);
    });
}

function accountBook(book) {
    const row = template('account-item');
    text(row, 'title', book.title);
    slot(row, 'title').href = bookPath(book.isbn);
    showCover(row, book, true);
    return row;
}

function showAccount(view, data, card) {
    text(view, 'member-name', card.name);
    text(view, 'loan-count', `${card.loans.length} of ${LOAN_LIMIT} on loan`);
    slot(view, 'loans-empty').hidden = card.loans.length > 0;
    slot(view, 'saved-empty').hidden = card.saved.length > 0;
    const events = upcomingEvents(data).filter(event => card.bookings.includes(event.key));
    slot(view, 'bookings-empty').hidden = events.length > 0;

    const loans = [...card.loans].sort((a, b) => a.due.localeCompare(b.due));
    for (const loan of loans) {
        const book = findBook(data, loan.isbn);
        if (!book) continue;
        const row = accountBook(book);
        const overdue = loan.due < dateKey(new Date());
        const meta = slot(row, 'meta');
        meta.className = overdue ? 'due-date overdue' : 'due-date';
        const due = element('time', dueLabel(loan.due));
        due.dateTime = loan.due;
        meta.append(overdue ? 'Overdue since ' : 'Due ', due);
        const actions = slot(row, 'actions');
        if (!overdue && !loan.renewed) {
            actions.append(button('Renew', 'secondary', () => runAction(() => changeLoan('renew', book.isbn), 'Loan renewed.')));
        }
        actions.append(button('Return book', 'quiet-action', () => runAction(() => changeLoan('return', book.isbn), 'Book returned.')));
        slot(view, 'loans').append(row);
    }
    for (const book of catalogBooks(data, true).filter(item => card.saved.includes(item.isbn))) {
        const row = accountBook(book);
        text(row, 'meta', book.author);
        slot(row, 'actions').append(button('Remove', 'quiet-action', () => runAction(() => changeReadingList('remove', book.isbn), 'Removed from your list.')));
        slot(view, 'saved').append(row);
    }
    for (const event of events) {
        const row = template('account-item');
        const tile = element('div', '', 'event-date');
        tile.setAttribute('aria-hidden', 'true');
        tile.append(element('span', dateLabel(event.date, { month: 'short' })), element('strong', event.date.getDate()));
        row.querySelector('.book-thumbnail').replaceWith(tile);
        text(row, 'title', event.title);
        slot(row, 'title').href = `#events/${event.id}`;
        text(row, 'meta', `${dateLabel(event.date, { weekday: 'short', month: 'short', day: 'numeric' })}, ${clock(event.date)}`);
        slot(row, 'actions').append(button('Cancel booking', 'quiet-action', () => runAction(() => changeBooking('cancel', event.key), 'Booking cancelled.')));
        slot(view, 'bookings').append(row);
    }

    const activity = link('Download activity', '#account', 'text-link activity-export');
    activity.download = 'folio-activity.jsonl';
    activity.addEventListener('click', () => {
        const entries = data.activity.filter(entry => entry.card === card.id).map(({ time, action, isbn, event }) => JSON.stringify({ time, action, isbn, event }));
        const url = URL.createObjectURL(new Blob([`${entries.join('\n')}\n`], { type: 'application/x-ndjson' }));
        activity.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    view.querySelector('.account-area').append(activity);
}

function setMenu(open) {
    menu.hidden = !smallScreen.matches;
    nav.hidden = smallScreen.matches && !open;
    menu.setAttribute('aria-expanded', String(open));
}

function render(moveFocus = false) {
    const [path, query] = (location.hash.slice(1) || 'home').split('?');
    const [section, id] = path.split('/');
    const data = readLibrary();
    const card = activeCard(data);
    const params = new URLSearchParams(query);
    const book = section === 'book' ? findBook(data, id) : null;
    let page = section;
    if (page === 'account' && !card) page = 'profiles';
    if ((page === 'book' && !book) || !document.getElementById(`view-${page}`)) page = 'missing';
    const view = template(`view-${page}`);

    if (page === 'home') showHome(view, data, card);
    if (page === 'catalog') showCatalog(view, params);
    if (page === 'book') showBook(view, book, data, card);
    if (page === 'events') renderEvents(view, data, card);
    if (page === 'visit') showVisit(view, card);
    if (page === 'profiles') showProfiles(view, data, params);
    if (page === 'account') showAccount(view, data, card);
    if (page === 'admin') showAdmin(view, data, id, params);

    main.replaceChildren(view);
    const heading = main.querySelector('h1');
    document.title = page === 'home' ? 'Folio Public Library' : `${heading.textContent} | Folio Public Library`;
    accountMenu.open = false;
    accountMenu.hidden = !card;
    document.querySelector('#open-card').hidden = Boolean(card);
    setMenu(false);
    for (const item of nav.querySelectorAll('a')) {
        if (item.hash === `#${page === 'book' ? 'catalog' : page}`) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    }
    if (moveFocus) {
        let target = id && ['visit', 'events'].includes(page) ? document.getElementById(id) : heading;
        if (page === 'admin' && id === 'catalog' && params.has('edit')) target = document.getElementById('book-editor');
        const sectionStart = target || heading;
        sectionStart.tabIndex = -1;
        sectionStart.classList.add('route-focus');
        sectionStart.focus({ preventScroll: true });
        if (sectionStart !== heading) sectionStart.scrollIntoView();
        else window.scrollTo(0, 0);
    }
}

menu.addEventListener('click', () => setMenu(nav.hidden));
smallScreen.addEventListener('change', () => setMenu(false));
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); });
document.querySelector('#close-card').addEventListener('click', () => { closeCard(); location.hash = 'home'; render(); announce('Signed out.'); });
document.addEventListener('click', event => { if (accountMenu.open && !accountMenu.contains(event.target)) accountMenu.open = false; });
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (accountMenu.open) { accountMenu.open = false; accountMenu.querySelector('summary').focus(); }
    else if (smallScreen.matches && !nav.hidden) { setMenu(false); menu.focus(); }
});
window.addEventListener('hashchange', () => render(true));
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) render(); });
render(Boolean(location.hash));
