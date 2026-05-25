export type BibleBook = {
  id: string;
  name: string;
  nameEn: string;
  chapters: number;
  testament: 'old' | 'new';
  nr: number; // getbible.net 기준 1-66
};

export const BIBLE_BOOKS: BibleBook[] = [
  // 구약
  { id: 'gen', name: '창세기',       nameEn: 'Genesis',          chapters: 50,  testament: 'old', nr: 1  },
  { id: 'exo', name: '출애굽기',     nameEn: 'Exodus',           chapters: 40,  testament: 'old', nr: 2  },
  { id: 'lev', name: '레위기',       nameEn: 'Leviticus',        chapters: 27,  testament: 'old', nr: 3  },
  { id: 'num', name: '민수기',       nameEn: 'Numbers',          chapters: 36,  testament: 'old', nr: 4  },
  { id: 'deu', name: '신명기',       nameEn: 'Deuteronomy',      chapters: 34,  testament: 'old', nr: 5  },
  { id: 'jos', name: '여호수아',     nameEn: 'Joshua',           chapters: 24,  testament: 'old', nr: 6  },
  { id: 'jdg', name: '사사기',       nameEn: 'Judges',           chapters: 21,  testament: 'old', nr: 7  },
  { id: 'rut', name: '룻기',         nameEn: 'Ruth',             chapters: 4,   testament: 'old', nr: 8  },
  { id: '1sa', name: '사무엘상',     nameEn: '1 Samuel',         chapters: 31,  testament: 'old', nr: 9  },
  { id: '2sa', name: '사무엘하',     nameEn: '2 Samuel',         chapters: 24,  testament: 'old', nr: 10 },
  { id: '1ki', name: '열왕기상',     nameEn: '1 Kings',          chapters: 22,  testament: 'old', nr: 11 },
  { id: '2ki', name: '열왕기하',     nameEn: '2 Kings',          chapters: 25,  testament: 'old', nr: 12 },
  { id: '1ch', name: '역대상',       nameEn: '1 Chronicles',     chapters: 29,  testament: 'old', nr: 13 },
  { id: '2ch', name: '역대하',       nameEn: '2 Chronicles',     chapters: 36,  testament: 'old', nr: 14 },
  { id: 'ezr', name: '에스라',       nameEn: 'Ezra',             chapters: 10,  testament: 'old', nr: 15 },
  { id: 'neh', name: '느헤미야',     nameEn: 'Nehemiah',         chapters: 13,  testament: 'old', nr: 16 },
  { id: 'est', name: '에스더',       nameEn: 'Esther',           chapters: 10,  testament: 'old', nr: 17 },
  { id: 'job', name: '욥기',         nameEn: 'Job',              chapters: 42,  testament: 'old', nr: 18 },
  { id: 'psa', name: '시편',         nameEn: 'Psalms',           chapters: 150, testament: 'old', nr: 19 },
  { id: 'pro', name: '잠언',         nameEn: 'Proverbs',         chapters: 31,  testament: 'old', nr: 20 },
  { id: 'ecc', name: '전도서',       nameEn: 'Ecclesiastes',     chapters: 12,  testament: 'old', nr: 21 },
  { id: 'sng', name: '아가',         nameEn: 'Song of Solomon',  chapters: 8,   testament: 'old', nr: 22 },
  { id: 'isa', name: '이사야',       nameEn: 'Isaiah',           chapters: 66,  testament: 'old', nr: 23 },
  { id: 'jer', name: '예레미야',     nameEn: 'Jeremiah',         chapters: 52,  testament: 'old', nr: 24 },
  { id: 'lam', name: '예레미야애가', nameEn: 'Lamentations',     chapters: 5,   testament: 'old', nr: 25 },
  { id: 'ezk', name: '에스겔',       nameEn: 'Ezekiel',          chapters: 48,  testament: 'old', nr: 26 },
  { id: 'dan', name: '다니엘',       nameEn: 'Daniel',           chapters: 12,  testament: 'old', nr: 27 },
  { id: 'hos', name: '호세아',       nameEn: 'Hosea',            chapters: 14,  testament: 'old', nr: 28 },
  { id: 'jol', name: '요엘',         nameEn: 'Joel',             chapters: 3,   testament: 'old', nr: 29 },
  { id: 'amo', name: '아모스',       nameEn: 'Amos',             chapters: 9,   testament: 'old', nr: 30 },
  { id: 'oba', name: '오바댜',       nameEn: 'Obadiah',          chapters: 1,   testament: 'old', nr: 31 },
  { id: 'jon', name: '요나',         nameEn: 'Jonah',            chapters: 4,   testament: 'old', nr: 32 },
  { id: 'mic', name: '미가',         nameEn: 'Micah',            chapters: 7,   testament: 'old', nr: 33 },
  { id: 'nam', name: '나훔',         nameEn: 'Nahum',            chapters: 3,   testament: 'old', nr: 34 },
  { id: 'hab', name: '하박국',       nameEn: 'Habakkuk',         chapters: 3,   testament: 'old', nr: 35 },
  { id: 'zep', name: '스바냐',       nameEn: 'Zephaniah',        chapters: 3,   testament: 'old', nr: 36 },
  { id: 'hag', name: '학개',         nameEn: 'Haggai',           chapters: 2,   testament: 'old', nr: 37 },
  { id: 'zec', name: '스가랴',       nameEn: 'Zechariah',        chapters: 14,  testament: 'old', nr: 38 },
  { id: 'mal', name: '말라기',       nameEn: 'Malachi',          chapters: 4,   testament: 'old', nr: 39 },
  // 신약
  { id: 'mat', name: '마태복음',       nameEn: 'Matthew',          chapters: 28, testament: 'new', nr: 40 },
  { id: 'mrk', name: '마가복음',       nameEn: 'Mark',             chapters: 16, testament: 'new', nr: 41 },
  { id: 'luk', name: '누가복음',       nameEn: 'Luke',             chapters: 24, testament: 'new', nr: 42 },
  { id: 'jhn', name: '요한복음',       nameEn: 'John',             chapters: 21, testament: 'new', nr: 43 },
  { id: 'act', name: '사도행전',       nameEn: 'Acts',             chapters: 28, testament: 'new', nr: 44 },
  { id: 'rom', name: '로마서',         nameEn: 'Romans',           chapters: 16, testament: 'new', nr: 45 },
  { id: '1co', name: '고린도전서',     nameEn: '1 Corinthians',    chapters: 16, testament: 'new', nr: 46 },
  { id: '2co', name: '고린도후서',     nameEn: '2 Corinthians',    chapters: 13, testament: 'new', nr: 47 },
  { id: 'gal', name: '갈라디아서',     nameEn: 'Galatians',        chapters: 6,  testament: 'new', nr: 48 },
  { id: 'eph', name: '에베소서',       nameEn: 'Ephesians',        chapters: 6,  testament: 'new', nr: 49 },
  { id: 'php', name: '빌립보서',       nameEn: 'Philippians',      chapters: 4,  testament: 'new', nr: 50 },
  { id: 'col', name: '골로새서',       nameEn: 'Colossians',       chapters: 4,  testament: 'new', nr: 51 },
  { id: '1th', name: '데살로니가전서', nameEn: '1 Thessalonians',  chapters: 5,  testament: 'new', nr: 52 },
  { id: '2th', name: '데살로니가후서', nameEn: '2 Thessalonians',  chapters: 3,  testament: 'new', nr: 53 },
  { id: '1ti', name: '디모데전서',     nameEn: '1 Timothy',        chapters: 6,  testament: 'new', nr: 54 },
  { id: '2ti', name: '디모데후서',     nameEn: '2 Timothy',        chapters: 4,  testament: 'new', nr: 55 },
  { id: 'tit', name: '디도서',         nameEn: 'Titus',            chapters: 3,  testament: 'new', nr: 56 },
  { id: 'phm', name: '빌레몬서',       nameEn: 'Philemon',         chapters: 1,  testament: 'new', nr: 57 },
  { id: 'heb', name: '히브리서',       nameEn: 'Hebrews',          chapters: 13, testament: 'new', nr: 58 },
  { id: 'jas', name: '야고보서',       nameEn: 'James',            chapters: 5,  testament: 'new', nr: 59 },
  { id: '1pe', name: '베드로전서',     nameEn: '1 Peter',          chapters: 5,  testament: 'new', nr: 60 },
  { id: '2pe', name: '베드로후서',     nameEn: '2 Peter',          chapters: 3,  testament: 'new', nr: 61 },
  { id: '1jn', name: '요한일서',       nameEn: '1 John',           chapters: 5,  testament: 'new', nr: 62 },
  { id: '2jn', name: '요한이서',       nameEn: '2 John',           chapters: 1,  testament: 'new', nr: 63 },
  { id: '3jn', name: '요한삼서',       nameEn: '3 John',           chapters: 1,  testament: 'new', nr: 64 },
  { id: 'jud', name: '유다서',         nameEn: 'Jude',             chapters: 1,  testament: 'new', nr: 65 },
  { id: 'rev', name: '요한계시록',     nameEn: 'Revelation',       chapters: 22, testament: 'new', nr: 66 },
];

export const OLD_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === 'old');
export const NEW_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === 'new');

export const getBookByNr = (nr: number) => BIBLE_BOOKS.find(b => b.nr === nr);
export const getBookById = (id: string) => BIBLE_BOOKS.find(b => b.id === id);
