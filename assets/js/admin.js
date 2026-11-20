'use strict';

let projectOperationPending = false;

async function runProjectAction(trigger, task, success) {
    if (projectOperationPending) return;
    projectOperationPending = true;
    trigger.disabled = true;
    try {
        await task();
        render();
        announce(success);
    } catch (error) {
        if (error.name === 'AbortError' && trigger.dataset.slot === 'connect-project') return;
        const messages = {
            NotAllowedError: 'Allow editing for the Folio folder and try again.',
            NotFoundError: 'Reconnect the Folio project folder and try again.',
            NoModificationAllowedError: 'The catalog file is busy. Close its other editor and try again.'
        };
        announce(messages[error.name] || error.message, true);
    } finally {
        projectOperationPending = false;
        trigger.disabled = false;
    }
}

function adminRow(title, details) {
    const row = template('admin-row');
    text(row, 'title', title);
    text(row, 'meta', details);
    return row;
}

async function resizeBookCover(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
        throw new Error('Choose a JPG, PNG, or WebP image up to 8 MB.');
    }

    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const scale = Math.min(1, 360 / image.naturalWidth, 540 / image.naturalHeight);
        const surface = document.createElement('canvas');
        surface.width = Math.max(1, Math.round(image.naturalWidth * scale));
        surface.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = surface.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, surface.width, surface.height);
        context.drawImage(image, 0, 0, surface.width, surface.height);
        return surface.toDataURL('image/jpeg', 0.83);
    } catch {
        throw new Error('This image could not be opened. Choose another cover.');
    } finally {
        URL.revokeObjectURL(url);
    }
}

function showInventory(view, data, params) {
    const search = view.querySelector('#admin-search');
    const inventory = slot(view, 'inventory');
    const books = catalogBooks(data, true);
    const form = view.querySelector('form');
    const editing = findBook(data, params.get('edit'));
    const submit = slot(view, 'save-book');
    const connect = slot(view, 'connect-project');
    const sync = slot(view, 'sync-project');
    const supportsFolders = typeof window.showDirectoryPicker === 'function';
    submit.disabled = !projectFiles;
    for (const field of form.querySelectorAll('input, select, textarea')) field.disabled = !projectFiles;
    connect.disabled = !supportsFolders;
    sync.hidden = data.catalog.length === 0;
    sync.disabled = !projectFiles;
    if (projectFiles) {
        text(view, 'project-status', `Connected to ${projectFiles.name}. Save your books here, then commit and push to update GitHub Pages.`);
        connect.textContent = 'Change folder';
    } else {
        const message = supportsFolders
            ? 'Choose the folder containing the index.html you opened to save books and covers.'
            : 'Open this page in desktop Chrome or Edge to connect the project folder.';
        text(view, 'project-status', message);
    }
    connect.addEventListener('click', () => runProjectAction(connect, connectProjectFolder, 'Project folder connected.'));
    sync.addEventListener('click', () => runProjectAction(sync, () => writeProjectBooks(readLibrary().catalog), 'Earlier changes saved to the project files.'));

    function updateInventory() {
        const query = search.value.trim().toLowerCase();
        const matches = books.filter(book => `${book.title} ${book.author} ${book.isbn}`.toLowerCase().includes(query));
        inventory.replaceChildren();
        slot(view, 'inventory-empty').hidden = matches.length > 0;
        for (const book of matches) {
            const stock = `${availableCopies(book, data)} of ${book.copies} available`;
            const row = adminRow(book.title, `${book.author} · ${book.archived ? 'Archived' : stock}`);
            const actions = slot(row, 'actions');
            actions.append(link('Edit', `#admin/catalog?edit=${book.isbn}`, 'button secondary'));
            const archive = button(book.archived ? 'Restore' : 'Archive', 'quiet-action', event => {
                const draft = readLibrary().catalog.find(item => item.isbn === book.isbn);
                const change = { ...(draft || { isbn: book.isbn }), archived: !book.archived };
                runProjectAction(event.currentTarget, () => writeProjectBooks([change]), book.archived ? 'Book restored in project files.' : 'Book archived in project files.');
            });
            archive.disabled = !projectFiles;
            actions.append(archive);
            inventory.append(row);
        }
    }

    for (const category of new Set(BOOKS.map(book => book.category))) {
        form.elements.category.add(new Option(category, category));
    }
    if (editing) {
        text(view, 'editor-title', 'Edit book');
        text(view, 'save-book', 'Save changes');
        slot(view, 'cancel-edit').hidden = false;
        for (const field of ['isbn', 'title', 'author', 'category', 'year', 'copies', 'description']) {
            form.elements[field].value = editing[field];
        }
        form.elements.isbn.readOnly = true;
        const cover = bookImageSource(editing);
        if (cover) {
            const preview = slot(view, 'cover-preview');
            preview.src = cover;
            preview.hidden = false;
        }
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!projectFiles) return;
        const fields = Object.fromEntries(new FormData(form));
        const file = fields.cover;
        delete fields.cover;
        runProjectAction(submit, async () => {
            if (file?.name) fields.cover = await resizeBookCover(file);
            await writeProjectBooks([prepareBook(fields, editing?.isbn)], { adding: !editing });
            if (editing) location.hash = 'admin/catalog';
        }, editing ? 'Book updated in project files.' : 'Book added to project files.');
    });
    search.addEventListener('input', updateInventory);
    updateInventory();
}

function showAdminLoans(view, data) {
    const list = slot(view, 'loans');
    const form = view.querySelector('form');
    const books = catalogBooks(data).filter(book => availableCopies(book, data) > 0);
    const loans = data.cards.flatMap(card => card.loans.map(loan => ({ card, loan })))
        .sort((a, b) => a.loan.due.localeCompare(b.loan.due));
    const today = dateKey(new Date());
    slot(view, 'loans-empty').hidden = loans.length > 0;

    for (const { card, loan } of loans) {
        const book = findBook(data, loan.isbn);
        const overdue = loan.due < today;
        const row = adminRow(book?.title || loan.isbn, `${card.name} · ${overdue ? 'Overdue since' : 'Due'} ${dueLabel(loan.due)}`);
        row.querySelector('.admin-row').classList.toggle('admin-overdue', overdue);
        const actions = slot(row, 'actions');
        if (!overdue && !loan.renewed) {
            actions.append(button('Renew', 'secondary', () => {
                runAction(() => changeLoan('renew', loan.isbn, new Date(), card.id), 'Loan renewed.');
            }));
        }
        actions.append(button('Return book', 'quiet-action', () => {
            runAction(() => changeLoan('return', loan.isbn, new Date(), card.id), 'Book returned.');
        }));
        list.append(row);
    }

    if (!data.cards.length || !books.length) {
        form.hidden = true;
        const message = slot(view, 'checkout-empty');
        message.hidden = false;
        if (data.cards.length) message.replaceChildren('All copies are on loan or archived.');
    }
    for (const card of data.cards) form.elements.reader.add(new Option(card.name, card.id));
    for (const book of books) form.elements.book.add(new Option(book.title, book.isbn));
    form.addEventListener('submit', event => {
        event.preventDefault();
        runAction(() => changeLoan('borrow', form.elements.book.value, new Date(), form.elements.reader.value), 'Book checked out.');
    });
}

function showAdminReaders(view, data) {
    const list = slot(view, 'readers');
    const events = upcomingEvents(data);
    slot(view, 'readers-empty').hidden = data.cards.length > 0;
    for (const card of data.cards) {
        const bookings = events.filter(event => card.bookings.includes(event.key)).length;
        list.append(adminRow(card.name, `${card.loans.length} on loan · ${card.saved.length} saved · ${bookings} upcoming ${bookings === 1 ? 'booking' : 'bookings'}`));
    }
}

function showAdminEvents(view, data) {
    const events = slot(view, 'events');
    const form = slot(view, 'event-form');
    form.elements.date.min = dateKey(new Date());
    form.addEventListener('submit', event => {
        event.preventDefault();
        const fields = Object.fromEntries(new FormData(form));
        runAction(() => addLibraryEvent(fields), 'Event added to the calendar.');
    });
    for (const event of upcomingEvents(data)) {
        const group = element('section', '', 'admin-event');
        group.append(element('h3', event.title));
        group.append(element('p', `${dateLabel(event.date, { weekday: 'short', month: 'short', day: 'numeric' })} at ${clock(event.date)} · ${event.capacity - event.remaining} of ${event.capacity} spots booked`));

        const readers = data.cards.filter(card => card.bookings.includes(event.key));
        if (readers.length) {
            const list = element('ul', '', 'admin-list');
            for (const card of readers) {
                const row = adminRow(card.name, '');
                slot(row, 'meta').hidden = true;
                slot(row, 'actions').append(button('Cancel booking', 'quiet-action', () => {
                    runAction(() => changeBooking('cancel', event.key, card.id), 'Booking cancelled.');
                }));
                list.append(row);
            }
            group.append(list);
        }
        events.append(group);
    }
}

function showAdmin(view, data, section, params) {
    const pages = { catalog: showInventory, loans: showAdminLoans, readers: showAdminReaders, events: showAdminEvents };
    const key = Object.hasOwn(pages, section) ? section : 'catalog';
    const content = template(`admin-${key}`);
    pages[key](content, data, params);
    view.querySelector(`.admin-tabs a[href="#admin/${key}"]`).setAttribute('aria-current', 'page');
    slot(view, 'admin-section').append(content);
}
