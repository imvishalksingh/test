'use strict';

const BOOKS_SECTION = /(^\/\/ folio:books:start\r?\nconst BOOKS = )([\s\S]*?)(;\r?\n\/\/ folio:books:end$)/m;
let projectFiles = null;

function readBookSection(source) {
    const section = source.match(BOOKS_SECTION);
    if (!section) throw new Error('collection.js is missing the Folio book-list markers.');
    const books = JSON.parse(section[2]);
    if (!Array.isArray(books) || books.some(book => !/^\d{13}$/.test(book?.isbn || ''))) {
        throw new Error('collection.js contains an invalid book list.');
    }
    return books;
}

async function connectProjectFolder() {
    const root = await window.showDirectoryPicker({ mode: 'readwrite', id: 'folio-project' });
    try {
        await root.getFileHandle('index.html');
        const assets = await root.getDirectoryHandle('assets');
        const scripts = await assets.getDirectoryHandle('js');
        const images = await assets.getDirectoryHandle('images');
        const collection = await scripts.getFileHandle('collection.js');
        const covers = await images.getDirectoryHandle('covers');
        const books = readBookSection(await (await collection.getFile()).text());
        projectFiles = { name: root.name, collection, covers };
        BOOKS.splice(0, BOOKS.length, ...books);
    } catch {
        throw new Error('Choose the updated Folio folder containing index.html and assets.');
    }
}

async function prepareCoverFile(isbn, cover) {
    const match = cover.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error('Choose a valid cover image.');
    const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const version = Array.from(digest.slice(0, 8), byte => byte.toString(16).padStart(2, '0')).join('');
    return { name: `${isbn}-${version}.jpg`, bytes };
}

async function writeCoverFile(folder, { name, bytes }, created) {
    let handle;
    try {
        handle = await folder.getFileHandle(name);
    } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
        handle = await folder.getFileHandle(name, { create: true });
        created.push(name);
    }
    const writer = await handle.createWritable();
    try {
        await writer.write(bytes);
        await writer.close();
    } catch (error) {
        await writer.abort().catch(() => {});
        throw error;
    }
}

async function writeProjectBooks(changes, { adding = false } = {}) {
    const files = projectFiles;
    if (!files) throw new Error('Connect your Folio project folder first.');
    const writer = await files.collection.createWritable({ mode: 'exclusive' });
    const created = [];
    let books;
    try {
        const source = await (await files.collection.getFile()).text();
        const editions = new Map(readBookSection(source).map(book => [book.isbn, book]));
        const covers = [];
        for (const { cover, ...book } of changes) {
            if (!/^\d{13}$/.test(book.isbn)) throw new Error('Enter a 13-digit ISBN.');
            const existing = editions.get(book.isbn);
            if (adding && existing) throw new Error('This ISBN already exists in the project files. Reconnect the folder to edit it.');
            if (!existing && !book.title) throw new Error('This book is missing from the project files. Reconnect the folder and try again.');
            if (cover) {
                const asset = await prepareCoverFile(book.isbn, cover);
                covers.push(asset);
                book.coverFile = asset.name;
            } else if (!existing && book.coverFile === undefined) {
                book.coverFile = '';
            }
            editions.set(book.isbn, { ...existing, ...book });
        }
        for (const cover of covers) await writeCoverFile(files.covers, cover, created);

        books = [...editions.values()];
        const newline = source.includes('\r\n') ? '\r\n' : '\n';
        const json = JSON.stringify(books, null, 4).replaceAll('\n', newline);
        await writer.write(source.replace(BOOKS_SECTION, (_, start, old, end) => `${start}${json}${end}`));
        await writer.close();
    } catch (error) {
        await writer.abort().catch(() => {});
        await Promise.allSettled(created.map(name => files.covers.removeEntry(name)));
        throw error;
    }

    BOOKS.splice(0, BOOKS.length, ...books);
    const data = readLibrary();
    const saved = new Set(changes.map(book => book.isbn));
    const drafts = data.catalog.filter(book => !saved.has(book.isbn));
    if (drafts.length !== data.catalog.length) {
        data.catalog = drafts;
        saveLibrary(data);
    }
}
