'use strict';

const STORAGE_KEY = 'folio-library.v1';
const LOAN_LIMIT = 5;
const LOAN_DAYS = 21;
let storageAvailable = true;
let memory = { activeCard: null, cards: [], activity: [], catalog: [], events: [] };

function readLibrary() {
    if (storageAvailable) {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (stored && Array.isArray(stored.cards) && Array.isArray(stored.activity)) {
                memory = {
                    ...stored,
                    catalog: Array.isArray(stored.catalog) ? stored.catalog : [],
                    events: Array.isArray(stored.events) ? stored.events : []
                };
            } else {
                memory = { activeCard: null, cards: [], activity: [], catalog: [], events: [] };
            }
        } catch {
            storageAvailable = false;
        }
    }
    return memory;
}

function saveLibrary(data) {
    memory = data;
    if (storageAvailable) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            storageAvailable = false;
        }
    }
}

function activeCard(data) {
    return data.cards.find(card => card.id === data.activeCard);
}

function openCard(name, create) {
    const data = readLibrary();
    const id = name.trim().toLowerCase();
    let card = data.cards.find(item => item.id === id);

    if (!id || name.length > 60) throw new Error('Enter a name up to 60 characters long.');
    if (!card && !create) throw new Error('That library card is unavailable.');
    if (!card) {
        card = { id, name: name.trim(), loans: [], saved: [], bookings: [] };
        data.cards.push(card);
        logActivity(data, card, 'create-card');
    } else {
        logActivity(data, card, 'open-card');
    }
    data.activeCard = card.id;
    saveLibrary(data);
}

function closeCard() {
    const data = readLibrary();
    const card = activeCard(data);
    if (card) logActivity(data, card, 'sign-out');
    data.activeCard = null;
    saveLibrary(data);
}

function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function localDate(key) {
    return new Date(`${key}T00:00:00`);
}

function loanCount(isbn, data) {
    return data.cards.filter(card => card.loans.some(loan => loan.isbn === isbn)).length;
}

function availableCopies(book, data) {
    return Math.max(0, book.copies - loanCount(book.isbn, data));
}

function findBook(data, isbn) {
    return data.catalog.find(book => book.isbn === isbn) || BOOKS.find(book => book.isbn === isbn);
}

function catalogBooks(data, includeArchived = false) {
    const editions = new Map(BOOKS.map(book => [book.isbn, book]));
    for (const book of data.catalog) editions.set(book.isbn, book);
    return [...editions.values()].filter(book => includeArchived || !book.archived);
}

function prepareBook(fields, editingIsbn = '') {
    const data = readLibrary();
    const isbn = String(fields.isbn || '').trim();
    const title = String(fields.title || '').trim();
    const author = String(fields.author || '').trim();
    const category = String(fields.category || '');
    const year = Number(fields.year);
    const copies = Number(fields.copies);
    const description = String(fields.description || '').trim();
    const previous = findBook(data, isbn);
    const cover = fields.cover || previous?.cover;

    if (!/^\d{13}$/.test(isbn)) throw new Error('Enter a 13-digit ISBN.');
    if (!title || !author || title.length > 120 || author.length > 100) throw new Error('Enter a title and author.');
    if (!BOOKS.some(book => book.category === category)) throw new Error('Choose a category.');
    if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('Enter a publication year.');
    if (String(fields.copies ?? '').trim() === '' || !Number.isInteger(copies) || copies < 0 || copies > 999) {
        throw new Error('Enter a copy count from 0 to 999.');
    }
    if (description.length > 600) throw new Error('Keep the description within 600 characters.');
    if (cover && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(cover)) throw new Error('Choose a valid cover image.');
    if (editingIsbn && (editingIsbn !== isbn || !previous)) throw new Error('That edition cannot be edited.');
    if (!editingIsbn && previous) throw new Error('That ISBN is already in the catalog.');
    if (copies < loanCount(isbn, data)) throw new Error('Copy count cannot be lower than the number of active loans.');

    const book = { isbn, title, author, category, year, copies, description, tone: previous?.tone || 'sage', archived: Boolean(previous?.archived) };
    if (cover) book.cover = cover;
    return book;
}

function filterBooks(data, { query, category, available, sort }) {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const books = catalogBooks(data).filter(book => {
        const searchable = `${book.title} ${book.author} ${book.isbn}`.toLowerCase();
        return words.every(word => searchable.includes(word))
            && (!category || book.category === category)
            && (!available || availableCopies(book, data) > 0);
    });
    if (sort === 'title') books.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'recent') books.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
    return books;
}

function addLibraryEvent(fields, now = new Date()) {
    const title = String(fields.title || '').trim();
    const room = String(fields.room || '').trim();
    const type = String(fields.type || 'Library event').trim();
    const description = String(fields.description || '').trim();
    const date = String(fields.date || '');
    const time = String(fields.time || '');
    const capacity = Number(fields.capacity);
    const start = new Date(`${date}T${time}:00`);

    if (!title || !room || title.length > 100 || room.length > 70) throw new Error('Enter an event name and room.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || dateKey(start) !== date || start <= now) {
        throw new Error('Choose a future date and time.');
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 999) throw new Error('Enter a capacity from 1 to 999.');
    if (description.length > 400 || type.length > 40) throw new Error('Keep event details within the field limits.');

    const data = readLibrary();
    data.events.push({ id: `event-${data.events.length + 1}`, title, room, type, description, capacity, date, time });
    saveLibrary(data);
}

function upcomingEvents(data, now = new Date()) {
    const weekly = PROGRAMS.map(program => {
        const offset = (program.day - now.getDay() + 7) % 7;
        const date = addDays(now, offset);
        date.setHours(program.hour, program.minute, 0, 0);
        return { ...program, date: date <= now ? addDays(date, 7) : date };
    });
    const scheduled = (data.events || []).map(event => ({ ...event, date: new Date(`${event.date}T${event.time}:00`) }));
    return [...weekly, ...scheduled].filter(event => event.date > now).map(event => {
        const key = `${event.id}/${dateKey(event.date)}`;
        const booked = data.cards.filter(card => card.bookings.includes(key)).length;
        return { ...event, key, remaining: event.capacity - booked };
    }).sort((a, b) => a.date - b.date);
}

function changeLoan(action, isbn, now = new Date(), cardId) {
    const data = readLibrary();
    const card = cardId === undefined ? activeCard(data) : data.cards.find(item => item.id === cardId);
    const book = findBook(data, isbn);
    if (!card || !book) throw new Error('Open a library card and choose a book.');

    const loan = card.loans.find(item => item.isbn === isbn);
    if (action === 'borrow') {
        if (book.archived) throw new Error('This edition is archived.');
        if (loan) throw new Error('You already have this book on loan.');
        if (card.loans.length >= LOAN_LIMIT) throw new Error('Return a book before borrowing another.');
        if (!availableCopies(book, data)) throw new Error('All copies are on loan.');
        card.loans.push({ isbn, due: dateKey(addDays(now, LOAN_DAYS)), renewed: false });
    } else if (action === 'renew') {
        if (!loan || loan.renewed || loan.due < dateKey(now)) throw new Error('This loan is no longer renewable.');
        loan.due = dateKey(addDays(localDate(loan.due), LOAN_DAYS));
        loan.renewed = true;
    } else if (action === 'return') {
        if (!loan) throw new Error('This book has already been returned.');
        card.loans = card.loans.filter(item => item.isbn !== isbn);
    }
    logActivity(data, card, action, { isbn });
    saveLibrary(data);
}

function changeReadingList(action, isbn) {
    const data = readLibrary();
    const card = activeCard(data);
    if (!card || !findBook(data, isbn)) throw new Error('Open a library card and choose a book.');

    if (action === 'save' && !card.saved.includes(isbn)) card.saved.push(isbn);
    if (action === 'remove') card.saved = card.saved.filter(item => item !== isbn);
    logActivity(data, card, action, { isbn });
    saveLibrary(data);
}

function changeBooking(action, key, cardId) {
    const data = readLibrary();
    const card = cardId === undefined ? activeCard(data) : data.cards.find(item => item.id === cardId);
    const event = upcomingEvents(data).find(item => item.key === key);
    if (!card || !event) throw new Error('This event is unavailable. Check the calendar.');

    if (action === 'book' && !card.bookings.includes(key)) {
        if (event.remaining < 1) throw new Error('All spots are booked.');
        card.bookings.push(key);
    }
    if (action === 'cancel') card.bookings = card.bookings.filter(item => item !== key);
    logActivity(data, card, action, { event: key });
    saveLibrary(data);
}

function logActivity(data, card, action, details = {}) {
    data.activity.push({ card: card.id, time: new Date().toISOString(), action, ...details });
    data.activity = data.activity.slice(-100);
}
