// A small, seeded, bundled-in-code text corpus for the "Naive Bayes and text classification" lab,
// in English and in Indonesian. Pure functions, reproducible per seed, tested in textdata.test.js.
//
// SYNTHETIC DATA. Every message is generated from word banks and templates written for this
// course. It is NOT real customer data, contains no real person, order or company, and says
// nothing about how real customers write. Real messages are messier, longer and less balanced;
// the corpus is only realistic enough for a bag-of-words classifier to learn something from.
//
// API
//   makeCorpus({ language = 'en', docsPerClass = 60, seed = 1, ambiguity = 0.14, typos = 0.07 })
//       -> { language, classes, keys, docs, labels, ambiguous, typo }
//     Three classes of short customer messages: billing, delivery, technical problem.
//       classes    the class names in the corpus language (see classNames), the same order always.
//       keys       the language-independent class keys, ['billing', 'delivery', 'technical'].
//       docs       docsPerClass messages per class, 3 * docsPerClass in all, shuffled.
//       labels     labels[i] is the class name (an entry of `classes`) of docs[i].
//       ambiguous  ambiguous[i] is true when docs[i] mixes two classes: its main complaint (the
//                  first clause, which sets the label) is followed by a clause from another class.
//                  A bag-of-words model sees words of both classes, so these are the hard ones.
//       typo       typo[i] is true when one word of docs[i] has a typing mistake (a swapped,
//                  dropped or doubled letter) and so may be missing from the training vocabulary.
//     `ambiguity` and `typos` are the share of messages (0 to 1) that are ambiguous or carry a
//     typo. With the defaults a Naive Bayes model on bag-of-words counts scores about 85 to 95
//     percent on fresh messages, not 100: the ambiguous messages are the reason.
//     Different seeds give different messages of the same kind; the same seed always gives the
//     same corpus. Both languages produce the same structure and the same class order.
//
//   LANGUAGES                  ['en', 'id'].
//   CLASS_KEYS                 ['billing', 'delivery', 'technical'].
//   classNames(language)       the three class names in that language, in key order
//                              ('billing', 'delivery', 'technical problem' or 'tagihan',
//                              'pengiriman', 'masalah teknis').
//   className(language, key)   one class name; also accepts a class name and returns it.
//   classWords(language, cls)  the word bank of a class (key or name): the words that mark it.
//                              Words in two banks (order, account, update, ...) are on purpose:
//                              they are the controlled overlap.
//   exampleWords(language, cls, n = 5)
//                              n words of the class, distinctive ones first (a word that is in no
//                              other bank), then overlapping ones if the bank runs out.
//   overlapWords(language)     the words that are in the bank of two or more classes.
//   tokenize(text)             lowercase words (letters and apostrophes) of a message, in order.
//
// Indonesian follows docs/glossary-id.md: semi-formal, "saya" for the writer, technical words
// kept in English where the glossary keeps them (login, password, error, update, refund,
// invoice, crash, server, website, ...), everyday words in Indonesian.

import { rng, shuffle } from './rng.js';

export const LANGUAGES = ['en', 'id'];
export const CLASS_KEYS = ['billing', 'delivery', 'technical'];

const NAMES = {
  en: { billing: 'billing', delivery: 'delivery', technical: 'technical problem' },
  id: { billing: 'tagihan', delivery: 'pengiriman', technical: 'masalah teknis' },
};

// The word bank of each class. Every word is used by the clauses below (a test checks it).
const WORDS = {
  en: {
    billing: ['invoice', 'charge', 'refund', 'payment', 'bill', 'receipt', 'subscription',
      'credit card', 'price', 'fee', 'discount', 'balance', 'order', 'account'],
    delivery: ['package', 'parcel', 'delivery', 'courier', 'tracking number', 'address',
      'shipment', 'driver', 'warehouse', 'shipping', 'item', 'order', 'update', 'delay'],
    technical: ['app', 'login', 'password', 'error', 'screen', 'website', 'page',
      'notification', 'button', 'crashes', 'server', 'verification code', 'update', 'account'],
  },
  id: {
    billing: ['tagihan', 'invoice', 'biaya', 'refund', 'pembayaran', 'struk', 'langganan',
      'kartu kredit', 'harga', 'diskon', 'saldo', 'pesanan', 'akun'],
    delivery: ['paket', 'kurir', 'pengiriman', 'alamat', 'nomor resi', 'gudang', 'ongkir',
      'barang', 'keterlambatan', 'pesanan', 'update'],
    technical: ['aplikasi', 'login', 'password', 'error', 'layar', 'website', 'halaman',
      'notifikasi', 'tombol', 'crash', 'server', 'kode verifikasi', 'update', 'akun'],
  },
};

// Clauses: one complaint each. {a|b|c} picks one alternative, so a clause is several messages.
const CLAUSES = {
  en: {
    billing: [
      'I was {charged|billed} twice for my {order|subscription|invoice}',
      'there is a {charge|fee} on my {credit card|bill|receipt} that I do not recognize',
      'I still have not received my {refund} for the cancelled {subscription|order}',
      'the {price|fee} on my {invoice|bill|receipt} is higher than what I was quoted',
      'my {payment} went through but my {account|balance} still shows the old amount',
      'the {discount} was not applied to my {order|invoice|bill}',
      'I cancelled my {subscription} but I was still {charged|billed}',
      'I need a corrected {invoice|receipt} for my {payment|order}',
      'please explain the extra {fee|charge} added to my {bill|account}',
      'my {credit card} was {charged|billed} the wrong {price|fee}',
    ],
    delivery: [
      'my {package|parcel|shipment} has not arrived yet',
      'the {courier|driver} says the {delivery|package} was made but nobody came',
      'the {tracking number} shows no {update} for days',
      'I received the wrong {item|parcel} in my {order|shipment}',
      'the {parcel|package} arrived damaged',
      'please change the {address} on my {order|shipment} before the {courier|driver} comes',
      'my {order|shipment} is stuck at the {warehouse} with a long {delay}',
      'the {courier|driver} left my {package|parcel} at the wrong {address}',
      'there is no {update} on my {delivery} since it left the {warehouse}',
      'the {shipping} cost for my {order|parcel} was higher than quoted',
      'the {tracking number} for my {parcel|shipment} does not work',
      'my {order} is marked as delivered but I found no {package|parcel}',
    ],
    technical: [
      'the {app|website} {crashes|freezes} every time I open it',
      'I cannot {login} to my {account|app}',
      'I keep getting an {error} on the {page|screen} after I enter my {password}',
      'the {page|website} will not load and shows an {error}',
      'the {button} does nothing when I tap it on the {screen|page}',
      'after the {update} the {app} lost all my settings',
      'I never got the {verification code|notification} for my {login|account}',
      'my {password} reset does not work and the {website|page} shows an {error}',
      'the {server} is down and the {app|website} {crashes|freezes} on every {page|screen}',
      'the {screen} freezes after the {update}',
    ],
  },
  id: {
    billing: [
      'saya ditagih dua kali untuk {pesanan|langganan|invoice} saya',
      'ada {biaya|tagihan} di {kartu kredit|invoice|struk} saya yang tidak saya kenali',
      '{refund} untuk {langganan|pesanan} yang saya batalkan belum saya terima',
      '{harga|biaya} di {invoice|tagihan|struk} saya lebih tinggi dari yang dijanjikan',
      '{pembayaran} saya sudah berhasil, tetapi {saldo|akun} saya belum berubah',
      '{diskon} tidak diterapkan pada {pesanan|invoice|tagihan} saya',
      'saya sudah membatalkan {langganan}, tetapi saya masih ditagih',
      'saya membutuhkan {invoice|struk} yang benar untuk {pembayaran|pesanan} saya',
      'mohon jelaskan {biaya|tagihan} tambahan di {akun|kartu kredit} saya',
      '{kartu kredit} saya ditagih dengan {harga|biaya} yang salah',
    ],
    delivery: [
      '{paket|barang} saya belum sampai',
      '{kurir} menyatakan {paket|barang} sudah diantar, tetapi tidak ada yang datang',
      '{nomor resi} saya tidak menunjukkan {update} selama berhari-hari',
      'saya menerima {barang} yang salah dari {pesanan|pengiriman} saya',
      '{paket} saya tiba dalam keadaan rusak',
      'mohon ubah {alamat} {pesanan|pengiriman} saya sebelum {kurir} datang',
      '{pesanan} saya tertahan di {gudang} dan ada {keterlambatan} yang lama',
      '{kurir} meninggalkan {paket|barang} saya di {alamat} yang salah',
      'tidak ada {update} pada {pengiriman} saya sejak keluar dari {gudang}',
      '{ongkir} untuk {pesanan|pengiriman} saya lebih mahal dari yang tertera',
      '{nomor resi} untuk {paket|pesanan} saya tidak dapat dilacak',
    ],
    technical: [
      '{aplikasi|website} terus {crash} setiap kali saya buka',
      'saya tidak dapat {login} ke {akun|aplikasi} saya',
      'muncul {error} terus di {halaman|layar} setelah saya memasukkan {password}',
      '{halaman|website} tidak mau memuat dan menampilkan {error}',
      '{tombol} di {layar|halaman} tidak berfungsi saat saya tekan',
      'setelah {update}, {aplikasi} saya kehilangan semua pengaturan',
      'saya tidak menerima {kode verifikasi|notifikasi} untuk {login|akun} saya',
      'reset {password} saya gagal dan {website|halaman} menampilkan {error}',
      '{server} sedang bermasalah dan {aplikasi|website} {crash} di setiap {halaman|layar}',
      '{layar} membeku setelah {update}',
    ],
  },
};

// Shared wording that carries no class information: every class uses all of it equally.
const FRAME = {
  en: {
    openers: ['Hi,', 'Hello,', 'Hi team,', 'Good morning,', '', ''],
    closers: ['Please help.', 'Thanks.', 'Can you check?', 'Thank you.', 'This is the second time I am writing.', '', ''],
    times: ['since yesterday', 'this week', 'since Monday', 'today'],
    joins: ['and', 'and also', 'plus'],
  },
  id: {
    openers: ['Halo,', 'Hai tim,', 'Selamat pagi,', 'Permisi,', '', ''],
    closers: ['Mohon bantuannya.', 'Terima kasih.', 'Mohon dicek.', 'Ini kedua kalinya saya menulis.', '', ''],
    times: ['sejak kemarin', 'minggu ini', 'sejak hari Senin', 'hari ini'],
    joins: ['dan', 'serta', 'dan juga'],
  },
};

function checkLanguage(language) {
  if (!LANGUAGES.includes(language)) {
    throw new RangeError(`language must be one of ${LANGUAGES.join(', ')}, got ${language}`);
  }
}

// Accepts a class key or the class name in this language; returns the key.
function keyOf(language, cls) {
  checkLanguage(language);
  if (CLASS_KEYS.includes(cls)) return cls;
  const key = CLASS_KEYS.find(k => NAMES[language][k] === cls);
  if (!key) throw new RangeError(`unknown class ${cls}`);
  return key;
}

export const classNames = language => {
  checkLanguage(language);
  return CLASS_KEYS.map(k => NAMES[language][k]);
};

export const className = (language, cls) => NAMES[language][keyOf(language, cls)];

export const classWords = (language, cls) => WORDS[language][keyOf(language, cls)].slice();

export function overlapWords(language) {
  checkLanguage(language);
  const count = new Map();
  for (const k of CLASS_KEYS) for (const w of WORDS[language][k]) count.set(w, (count.get(w) || 0) + 1);
  return [...count].filter(([, c]) => c > 1).map(([w]) => w);
}

export function exampleWords(language, cls, n = 5) {
  const key = keyOf(language, cls);
  const shared = new Set(overlapWords(language));
  const bank = WORDS[language][key];
  return [...bank.filter(w => !shared.has(w)), ...bank.filter(w => shared.has(w))].slice(0, n);
}

export const tokenize = text => (String(text).toLowerCase().match(/[\p{L}']+/gu) || []);

const pick = (items, random) => items[Math.floor(random() * items.length)];
const expand = (clause, random) => clause.replace(/\{([^{}]+)\}/g, (_, g) => pick(g.split('|'), random));

// One typing mistake in one word of five letters or more: swap two inner letters, drop one,
// or double one. Returns the text unchanged when no word is long enough.
function addTypo(text, random) {
  const parts = text.split(/(\p{L}+)/u);
  const slots = [];
  parts.forEach((p, i) => { if (i % 2 === 1 && p.length >= 5) slots.push(i); });
  if (!slots.length) return { text, changed: false };
  const i = pick(slots, random);
  const w = parts[i];
  const at = 1 + Math.floor(random() * (w.length - 3)); // an inner position, 1 .. length - 3
  const kind = Math.floor(random() * 3);
  if (kind === 0) parts[i] = w.slice(0, at) + w[at + 1] + w[at] + w.slice(at + 2);
  else if (kind === 1) parts[i] = w.slice(0, at) + w.slice(at + 1);
  else parts[i] = w.slice(0, at + 1) + w[at] + w.slice(at + 1);
  return { text: parts.join(''), changed: parts[i] !== w };
}

function makeMessage(language, key, ambiguous, random) {
  const clauses = CLAUSES[language];
  const frame = FRAME[language];
  const own = () => expand(pick(clauses[key], random), random);
  const others = CLASS_KEYS.filter(k => k !== key);

  let body = own();
  if (ambiguous) {
    // The label stays with the first clause; the second clause comes from another class.
    body += ` ${pick(frame.joins, random)} ${expand(pick(clauses[pick(others, random)], random), random)}`;
  } else if (random() < 0.3) {
    body += ` ${pick(frame.joins, random)} ${own()}`; // a second complaint of the same class
  }
  if (random() < 0.4) body += ` ${pick(frame.times, random)}`;

  const opener = pick(frame.openers, random);
  const closer = pick(frame.closers, random);
  let text = `${opener ? `${opener} ` : ''}${body}.${closer ? ` ${closer}` : ''}`;
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}

export function makeCorpus({ language = 'en', docsPerClass = 60, seed = 1, ambiguity = 0.14, typos = 0.07 } = {}) {
  checkLanguage(language);
  if (!Number.isInteger(docsPerClass) || docsPerClass < 1) throw new RangeError('docsPerClass must be a positive integer');
  for (const [name, v] of [['ambiguity', ambiguity], ['typos', typos]]) {
    if (!(v >= 0 && v <= 1)) throw new RangeError(`${name} must be between 0 and 1`);
  }
  const random = rng(seed * 7919 + (language === 'id' ? 104729 : 1));
  const items = [];
  for (const key of CLASS_KEYS) {
    // Exact counts, not coin flips, so every class has the same share of ambiguous messages.
    const nAmbiguous = Math.round(ambiguity * docsPerClass);
    const nTypo = Math.round(typos * docsPerClass);
    const amb = shuffle(Array.from({ length: docsPerClass }, (_, i) => i < nAmbiguous), random);
    const typ = shuffle(Array.from({ length: docsPerClass }, (_, i) => i < nTypo), random);
    for (let i = 0; i < docsPerClass; i++) {
      let text = makeMessage(language, key, amb[i], random);
      let typoed = false;
      if (typ[i]) ({ text, changed: typoed } = addTypo(text, random));
      items.push({ text, label: NAMES[language][key], ambiguous: amb[i], typo: typoed });
    }
  }
  const order = shuffle(items, random);
  return {
    language,
    classes: classNames(language),
    keys: CLASS_KEYS.slice(),
    docs: order.map(o => o.text),
    labels: order.map(o => o.label),
    ambiguous: order.map(o => o.ambiguous),
    typo: order.map(o => o.typo),
  };
}
