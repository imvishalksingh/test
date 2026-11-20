'use strict';

// Edit this file to change the catalog, events, or opening hours.
// folio:books:start
const BOOKS = [
    {
        "isbn": "9780593321201",
        "title": "Tomorrow, and Tomorrow, and Tomorrow",
        "author": "Gabrielle Zevin",
        "category": "Fiction",
        "year": 2022,
        "copies": 4,
        "tone": "rose",
        "description": "Two childhood friends build video games together. Over three decades, the worlds they create become a way to talk about all the things they cannot say to each other."
    },
    {
        "isbn": "9780525559474",
        "title": "The Midnight Library",
        "author": "Matt Haig",
        "category": "Fantasy",
        "year": 2020,
        "copies": 3,
        "tone": "blue",
        "description": "Between life and death, Nora Seed finds a library whose books contain the lives she might have lived. Each return to the shelves asks her what makes a life worth choosing."
    },
    {
        "isbn": "9781571313560",
        "title": "Braiding Sweetgrass",
        "author": "Robin Wall Kimmerer",
        "category": "Nonfiction",
        "year": 2013,
        "copies": 4,
        "tone": "sage",
        "description": "A botanist and member of the Citizen Potawatomi Nation brings Indigenous knowledge and plant science together in essays on reciprocity, restoration, and paying attention."
    },
    {
        "isbn": "9780385547345",
        "title": "The Wager",
        "author": "David Grann",
        "category": "Nonfiction",
        "year": 2023,
        "copies": 3,
        "tone": "sand",
        "description": "After a British warship wrecks in 1741, rival groups of survivors tell radically different stories. Grann follows the wreck, the mutiny, and the people who tried to write the last word."
    },
    {
        "isbn": "9781984880987",
        "title": "The Thursday Murder Club",
        "author": "Richard Osman",
        "category": "Mystery",
        "year": 2020,
        "copies": 3,
        "tone": "lilac",
        "description": "Four friends in a retirement village spend Thursdays puzzling over cold cases. Then a death on their doorstep gives them a fresh case of their own."
    },
    {
        "isbn": "9780593652886",
        "title": "The Creative Act",
        "author": "Rick Rubin",
        "category": "Nonfiction",
        "year": 2023,
        "copies": 2,
        "tone": "sand",
        "description": "A record producer reflects on attention, experimentation, and the day-to-day habits that make room for creative work."
    },
    {
        "isbn": "9780525657743",
        "title": "Crying in H Mart",
        "author": "Michelle Zauner",
        "category": "Nonfiction",
        "year": 2021,
        "copies": 3,
        "tone": "rose",
        "description": "After the death of her mother, the musician behind Japanese Breakfast turns to Korean food to reckon with grief, memory, and the shape of their relationship."
    },
    {
        "isbn": "9780143127741",
        "title": "The Boys in the Boat",
        "author": "Daniel James Brown",
        "category": "Nonfiction",
        "year": 2013,
        "copies": 2,
        "tone": "blue",
        "description": "Nine young American rowers come together at the University of Washington and find themselves racing for a medal at the 1936 Berlin Olympics."
    },
    {
        "isbn": "9781250236210",
        "title": "The House in the Cerulean Sea",
        "author": "TJ Klune",
        "category": "Fantasy",
        "year": 2020,
        "copies": 2,
        "tone": "sage",
        "description": "A caseworker visits an island orphanage and meets six children whose unusual talents make him reconsider the rules he has spent his life enforcing."
    },
    {
        "isbn": "9780802162175",
        "title": "The Heaven & Earth Grocery Store",
        "author": "James McBride",
        "category": "Fiction",
        "year": 2023,
        "copies": 2,
        "tone": "sand",
        "description": "The discovery of a skeleton opens a story about the Jewish and Black neighbors of Chicken Hill, Pennsylvania, and the ways they looked after one another."
    },
    {
        "isbn": "9780525562023",
        "title": "An American Marriage",
        "author": "Tayari Jones",
        "category": "Fiction",
        "year": 2018,
        "copies": 2,
        "tone": "lilac",
        "description": "A wrongful conviction separates newlyweds Celestial and Roy. Their letters trace what happens to a marriage under the weight of years apart."
    },
    {
        "isbn": "9780063204157",
        "title": "The Sentence",
        "author": "Louise Erdrich",
        "category": "Fiction",
        "year": 2021,
        "copies": 2,
        "tone": "sage",
        "description": "At an independent bookshop in Minneapolis, a bookseller tries to make sense of the customer who keeps visiting after her death."
    },
    {
        "isbn": "9780062963505",
        "title": "The Adventures of Amina al-Sirafi",
        "author": "Shannon Chakraborty",
        "category": "Fantasy",
        "year": 2023,
        "copies": 2,
        "tone": "blue",
        "description": "A retired pirate captain accepts one more job across the Indian Ocean. Bringing her old crew back together proves to be the easy part."
    },
    {
        "isbn": "9780593356159",
        "title": "The Maid",
        "author": "Nita Prose",
        "category": "Mystery",
        "year": 2022,
        "copies": 2,
        "tone": "rose",
        "description": "A meticulous hotel maid discovers a dead guest and finds herself at the center of an investigation. Her eye for detail may be the thing that gets her out of it."
    },
    {
        "isbn": "9780735211292",
        "title": "Atomic Habits",
        "author": "James Clear",
        "category": "Nonfiction",
        "year": 2018,
        "copies": 2,
        "tone": "sand",
        "description": "A practical guide to setting up routines, changing environments, and making small behaviors easier to repeat."
    },
    {
        "isbn": "9780062409164",
        "title": "The Hate U Give",
        "author": "Angie Thomas",
        "category": "Young adult",
        "year": 2017,
        "copies": 2,
        "tone": "lilac",
        "description": "After witnessing the police shooting of her childhood friend, sixteen-year-old Starr Carter has to decide how to speak about what happened."
    }
];
// folio:books:end

const PROGRAMS = [
    {
        "id": "slow-reading",
        "title": "The Slow Reading Club",
        "type": "Book club",
        "day": 4,
        "hour": 17,
        "minute": 30,
        "room": "The reading room",
        "capacity": 14,
        "description": "Bring a book. We’ll read for an hour, then put the kettle on."
    },
    {
        "id": "storytime",
        "title": "Saturday Storytime",
        "type": "For families",
        "day": 6,
        "hour": 10,
        "minute": 30,
        "room": "Children’s corner",
        "capacity": 20,
        "description": "Picture books and songs for ages 3–7 and their grown-ups."
    },
    {
        "id": "repair",
        "title": "The Book Repair Table",
        "type": "Workshop",
        "day": 2,
        "hour": 16,
        "minute": 0,
        "room": "The workroom",
        "capacity": 10,
        "description": "Bring a paperback and learn to mend a torn page or loose cover."
    }
];

const HOURS = [
    { day: "Sunday", opens: 12, closes: 16 },
    { day: "Monday", opens: 10, closes: 19 },
    { day: "Tuesday", opens: 10, closes: 19 },
    { day: "Wednesday", opens: 10, closes: 19 },
    { day: "Thursday", opens: 10, closes: 19 },
    { day: "Friday", opens: 10, closes: 18 },
    { day: "Saturday", opens: 10, closes: 18 }
];
