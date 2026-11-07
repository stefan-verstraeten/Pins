// Sample data for the map prototype. Invented memories at real places.
// Shape foreshadows the real model: a Place is where; a Pin is one visit (a memory) at a place.

export const PEOPLE = [
  { id: 'stefan', name: 'Stefan', initial: 'S' },
  { id: 'marleen', name: 'Marleen', initial: 'M' },
  { id: 'family', name: 'Family', initial: 'F' },
  { id: 'friends', name: 'Friends', initial: 'Fr' },
  // People outside the family are ordinary entries too: they can be filtered on later.
  { id: 'pjhicks', name: 'PJ Hicks', initial: 'PJ', note: 'Wildlife photographer' },
];

export const KINDS = {
  culture: { label: 'Culture', glyph: '<path d="M4 9.5 12 5l8 4.5M5.5 10v7.5M9.5 10v7.5M14.5 10v7.5M18.5 10v7.5M4 19.5h16"/>' },
  food: { label: 'Food', glyph: '<path d="M8 4v6.5a2 2 0 0 1-2 2M8 4v16M5.5 4v6M10.5 4v6M16 20V4c-2 1.5-2.8 4.5-2.8 7.5H16"/>' },
  architecture: { label: 'Architecture', glyph: '<path d="M5 20V9l7-4 7 4v11M9 20v-6h6v6"/>' },
  nature: { label: 'Nature', glyph: '<path d="M3.5 18.5 9 9.5l3.5 5.5 2.5-3.5 5.5 7z"/>' },
  stay: { label: 'Stay', glyph: '<path d="M4 18V8M4 14h16v4M4 11.5h6a2 2 0 0 1 2 2V14M12 10.5h5.5A2.5 2.5 0 0 1 20 13v1"/>' },
  moment: { label: 'Moment', glyph: '<circle cx="12" cy="12" r="3.2"/>' },
};

export const PLACES = [
  { id: 'mplus', name: 'M+', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3015, lon: 114.1599 },
  { id: 'taikwun', name: 'Tai Kwun', city: 'Hong Kong', country: 'Hong Kong', lat: 22.2817, lon: 114.1540 },
  { id: 'starferry', name: 'Star Ferry', city: 'Hong Kong', country: 'Hong Kong', lat: 22.2937, lon: 114.1686 },
  { id: 'timhowan', name: 'Tim Ho Wan, Sham Shui Po', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3307, lon: 114.1627 },
  { id: 'ryoanji', name: 'Ryōan-ji', city: 'Kyoto', country: 'Japan', lat: 35.0345, lon: 135.7182 },
  { id: 'fushimi', name: 'Fushimi Inari-taisha', city: 'Kyoto', country: 'Japan', lat: 34.9671, lon: 135.7727 },
  { id: 'kikunoi', name: 'Kikunoi Honten', city: 'Kyoto', country: 'Japan', lat: 35.0016, lon: 135.7810 },
  { id: 'chichu', name: 'Chichu Art Museum', city: 'Naoshima', country: 'Japan', lat: 34.4590, lon: 133.9948 },
  { id: 'kenrokuen', name: 'Kenroku-en', city: 'Kanazawa', country: 'Japan', lat: 36.5621, lon: 136.6627 },
  { id: 'tokyo-hotel', name: 'Hoshinoya Tokyo', city: 'Tokyo', country: 'Japan', lat: 35.6869, lon: 139.7656 },
  { id: 'hoian', name: 'Hội An old town', city: 'Hội An', country: 'Vietnam', lat: 15.8770, lon: 108.3270 },
  { id: 'halong', name: 'Hạ Long Bay', city: 'Hạ Long', country: 'Vietnam', lat: 20.9101, lon: 107.1839 },
  { id: 'vanmieu', name: 'Temple of Literature', city: 'Hà Nội', country: 'Vietnam', lat: 21.0285, lon: 105.8355 },
  { id: 'hue', name: 'Imperial City', city: 'Huế', country: 'Vietnam', lat: 16.4698, lon: 107.5786 },
  { id: 'pho', name: 'Phở Hòa Pasteur', city: 'Hồ Chí Minh City', country: 'Vietnam', lat: 10.7880, lon: 106.6900 },
  { id: 'belem', name: 'Torre de Belém', city: 'Lisbon', country: 'Portugal', lat: 38.6916, lon: -9.2160 },
  { id: 'gulbenkian', name: 'Gulbenkian Garden', city: 'Lisbon', country: 'Portugal', lat: 38.7372, lon: -9.1545 },
  { id: 'pasteis', name: 'Pastéis de Belém', city: 'Lisbon', country: 'Portugal', lat: 38.6975, lon: -9.2032 },
  { id: 'louisiana', name: 'Louisiana Museum', city: 'Humlebæk', country: 'Denmark', lat: 55.9690, lon: 12.5430 },
  { id: 'nyhavn', name: 'Nyhavn', city: 'Copenhagen', country: 'Denmark', lat: 55.6798, lon: 12.5912 },
  { id: 'kadeau', name: 'Kadeau', city: 'Copenhagen', country: 'Denmark', lat: 55.6745, lon: 12.5930 },
  { id: 'highline', name: 'The High Line', city: 'New York', country: 'United States', lat: 40.7480, lon: -74.0048 },
  { id: 'guggenheim', name: 'Guggenheim', city: 'New York', country: 'United States', lat: 40.7830, lon: -73.9590 },
  { id: 'momaroof', name: 'A rooftop in Brooklyn', city: 'New York', country: 'United States', lat: 40.7181, lon: -73.9571 },
  { id: 'jokulsarlon', name: 'Jökulsárlón', city: 'Austurland', country: 'Iceland', lat: 64.0784, lon: -16.2306 },
  { id: 'thingvellir', name: 'Þingvellir', city: 'Suðurland', country: 'Iceland', lat: 64.2559, lon: -21.1299 },
  { id: 'pantheon', name: 'Pantheon', city: 'Rome', country: 'Italy', lat: 41.8986, lon: 12.4769 },
  { id: 'trastevere', name: 'Trastevere, late evening', city: 'Rome', country: 'Italy', lat: 41.8897, lon: 12.4700 },
  { id: 'skye', name: 'Old Man of Storr', city: 'Isle of Skye', country: 'Scotland', lat: 57.5070, lon: -6.1830 },
  { id: 'orsay', name: "Musée d'Orsay", city: 'Paris', country: 'France', lat: 48.8600, lon: 2.3266 },
  { id: 'rijks', name: 'Rijksmuseum', city: 'Amsterdam', country: 'Netherlands', lat: 52.3600, lon: 4.8852 },
  { id: 'luxembourg', name: 'Ville Haute', city: 'Luxembourg', country: 'Luxembourg', lat: 49.6116, lon: 6.1319 },
  { id: 'beyeler', name: 'Fondation Beyeler', city: 'Riehen', country: 'Switzerland', lat: 47.5868, lon: 7.6534 },
  { id: 'basel', name: 'Basel Münster', city: 'Basel', country: 'Switzerland', lat: 47.5565, lon: 7.5925 },
  { id: 'francescana', name: 'Osteria Francescana', city: 'Modena', country: 'Italy', lat: 44.6436, lon: 10.9235 },
  { id: 'modena', name: 'Piazza Grande', city: 'Modena', country: 'Italy', lat: 44.6460, lon: 10.9254 },
  { id: 'menton', name: 'Vieille ville', city: 'Menton', country: 'France', lat: 43.7765, lon: 7.5048 },
  { id: 'grasse', name: 'Grasse', city: 'Grasse', country: 'France', lat: 43.6580, lon: 6.9230 },
  { id: 'namiri', name: 'Namiri Plains', city: 'Serengeti', country: 'Tanzania', lat: -2.53, lon: 35.27 },
  { id: 'papes', name: 'Palais des Papes', city: 'Avignon', country: 'France', lat: 43.9508, lon: 4.8075 },
];

export const TRIPS = [
  { id: 'hk25', title: 'Hong Kong', start: '2025-04-12', end: '2025-04-17', with: ['stefan'] },
  { id: 'jp24', title: 'Japan in autumn', start: '2024-10-18', end: '2024-11-02', with: ['stefan', 'marleen'] },
  { id: 'vn26', title: 'Vietnam', start: '2026-02-08', end: '2026-02-26', with: ['stefan', 'marleen'] },
  { id: 'lx23', title: 'Lisbon', start: '2023-05-18', end: '2023-05-22', with: ['stefan', 'marleen', 'family'] },
  { id: 'cph22', title: 'Copenhagen', start: '2022-09-02', end: '2022-09-05', with: ['stefan', 'marleen'] },
  { id: 'ny19', title: 'New York', start: '2019-03-08', end: '2019-03-14', with: ['stefan', 'marleen', 'friends'] },
  { id: 'is18', title: 'Iceland', start: '2018-07-20', end: '2018-07-29', with: ['stefan', 'marleen', 'family'] },
  { id: 'tz23', title: 'Tanzania', start: '2023-02-06', end: '2023-02-17', with: ['stefan', 'marleen'] },
  { id: 'gt26', title: 'Rhine & Riviera', start: '2025-11-29', end: '2025-12-12', with: ['stefan', 'marleen'] },
];

export const COLLECTIONS = [
  { id: 'museums', title: 'Remarkable museums' },
  { id: 'tables', title: 'Memorable tables' },
  { id: 'return', title: 'To return to together' },
];

// kind: primary category (drives the symbol); tags: everything else.
// photo: sample/img/<photo>.jpg, or absent. note: short text; text-led pins have `quote`.
export const PINS = [
  { id: 'p1', place: 'mplus', date: '2025-04-14', kind: 'culture', tags: ['architecture'], trip: 'hk25', by: 'stefan', with: ['stefan'], photo: 'mplus', title: 'M+ on a grey afternoon', note: 'Herzog & de Meuron’s slab over the harbour. The Sigg collection rooms were the surprise.', collections: ['museums', 'return'] },
  { id: 'p2', place: 'taikwun', date: '2025-04-13', kind: 'architecture', tags: ['culture'], trip: 'hk25', by: 'stefan', with: ['stefan'], photo: 'taikwun', title: 'Tai Kwun', note: 'The old police compound, re-made. Evening light in the parade ground.' },
  { id: 'p3', place: 'starferry', date: '2025-04-15', kind: 'moment', tags: [], trip: 'hk25', by: 'stefan', with: ['stefan'], photo: 'starferry', title: 'Crossing at dusk', note: 'Twelve minutes, the best view in the city.' },
  { id: 'p4', place: 'timhowan', date: '2025-04-16', kind: 'food', tags: [], trip: 'hk25', by: 'stefan', with: ['stefan'], title: 'Baked char siu bao', quote: 'Forty minutes in the queue. Worth every one.' },

  { id: 'p5', place: 'ryoanji', date: '2024-10-21', kind: 'culture', tags: ['nature'], trip: 'jp24', by: 'marleen', with: ['stefan', 'marleen'], photo: 'ryoanji', title: 'Fifteen stones', note: 'We sat until the school groups left. You can never see all fifteen at once.', collections: ['return'] },
  { id: 'p6', place: 'fushimi', date: '2024-10-22', kind: 'culture', tags: ['nature'], trip: 'jp24', by: 'stefan', with: ['stefan', 'marleen'], photo: 'fushimi', title: 'Up through the torii at 7 am' },
  { id: 'p7', place: 'kikunoi', date: '2024-10-22', kind: 'food', tags: ['michelin'], trip: 'jp24', by: 'marleen', with: ['stefan', 'marleen'], title: 'Kikunoi', quote: 'Eleven courses of autumn. The matsutake dobin-mushi.', collections: ['tables'] },
  { id: 'p8', place: 'chichu', date: '2024-10-26', kind: 'culture', tags: ['architecture'], trip: 'jp24', by: 'stefan', with: ['stefan', 'marleen'], title: 'Naoshima', note: 'Monet under daylight only. Kusama’s pumpkin on the pier afterwards.', collections: ['museums'] },
  { id: 'p9', place: 'kenrokuen', date: '2024-10-29', kind: 'nature', tags: [], trip: 'jp24', by: 'marleen', with: ['stefan', 'marleen'], photo: 'kenrokuen', title: 'Kenroku-en, first maples' },
  { id: 'p10', place: 'tokyo-hotel', date: '2024-10-31', kind: 'stay', tags: [], trip: 'jp24', by: 'stefan', with: ['stefan', 'marleen'], title: 'Hoshinoya Tokyo', quote: 'A ryokan stacked into a tower. Onsen on the top floor.' },

  { id: 'p11', place: 'hoian', date: '2026-02-14', kind: 'moment', tags: ['architecture'], trip: 'vn26', by: 'marleen', with: ['stefan', 'marleen'], photo: 'hoian', title: 'Lanterns on the Thu Bồn', note: 'Valentine’s Day by accident, full moon by luck.' },
  { id: 'p12', place: 'halong', date: '2026-02-18', kind: 'nature', tags: [], trip: 'vn26', by: 'stefan', with: ['stefan', 'marleen'], photo: 'halong', title: 'A night on the bay' },
  { id: 'p13', place: 'vanmieu', date: '2026-02-20', kind: 'culture', tags: ['architecture'], trip: 'vn26', by: 'stefan', with: ['stefan', 'marleen'], photo: 'vanmieu', title: 'Temple of Literature' },
  { id: 'p14', place: 'hue', date: '2026-02-16', kind: 'architecture', tags: ['culture'], trip: 'vn26', by: 'marleen', with: ['stefan', 'marleen'], photo: 'hue', title: 'The Imperial City in the rain' },
  { id: 'p15', place: 'pho', date: '2026-02-10', kind: 'food', tags: [], trip: 'vn26', by: 'stefan', with: ['stefan', 'marleen'], title: 'Phở at 6 am', quote: 'Herbs by the fistful. The best breakfast of the trip.', collections: ['tables'] },

  { id: 'p16', place: 'belem', date: '2023-05-19', kind: 'architecture', tags: [], trip: 'lx23', by: 'marleen', with: ['stefan', 'marleen', 'family'], photo: 'belem', title: 'Torre de Belém' },
  { id: 'p17', place: 'gulbenkian', date: '2023-05-20', kind: 'culture', tags: ['nature'], trip: 'lx23', by: 'stefan', with: ['stefan', 'marleen', 'family'], photo: 'gulbenkian', title: 'Gulbenkian, and the garden after', collections: ['museums'] },
  { id: 'p18', place: 'pasteis', date: '2023-05-19', kind: 'food', tags: [], trip: 'lx23', by: 'marleen', with: ['stefan', 'marleen', 'family'], title: 'Pastéis, still warm', quote: 'Six each. Nobody argued.' },

  { id: 'p19', place: 'louisiana', date: '2022-09-03', kind: 'culture', tags: ['nature', 'architecture'], trip: 'cph22', by: 'stefan', with: ['stefan', 'marleen'], photo: 'louisiana', title: 'Louisiana', note: 'Giacometti against the Øresund. Lunch on the lawn.', collections: ['museums'] },
  { id: 'p20', place: 'nyhavn', date: '2022-09-02', kind: 'moment', tags: [], trip: 'cph22', by: 'marleen', with: ['stefan', 'marleen'], photo: 'nyhavn', title: 'Nyhavn, first evening' },
  { id: 'p21', place: 'kadeau', date: '2022-09-04', kind: 'food', tags: ['michelin'], trip: 'cph22', by: 'stefan', with: ['stefan', 'marleen'], title: 'Kadeau', quote: 'Bornholm in twenty plates. The smoked cheese with pine.', collections: ['tables'] },

  { id: 'p22', place: 'highline', date: '2019-03-10', kind: 'nature', tags: ['architecture'], trip: 'ny19', by: 'marleen', with: ['stefan', 'marleen', 'friends'], photo: 'highline', title: 'The High Line in March' },
  { id: 'p23', place: 'guggenheim', date: '2019-03-11', kind: 'architecture', tags: ['culture'], trip: 'ny19', by: 'stefan', with: ['stefan', 'marleen'], photo: 'guggenheim', title: 'Up the ramp', collections: ['museums'] },
  { id: 'p24', place: 'momaroof', date: '2019-03-12', kind: 'moment', tags: [], trip: 'ny19', by: 'stefan', with: ['stefan', 'marleen', 'friends'], title: 'Brooklyn, the four of us', quote: 'Manhattan lit up across the river, and nobody wanted to go home.' },

  { id: 'p25', place: 'jokulsarlon', date: '2018-07-25', kind: 'nature', tags: [], trip: 'is18', by: 'marleen', with: ['stefan', 'marleen', 'family'], photo: 'jokulsarlon', title: 'Jökulsárlón' },
  { id: 'p26', place: 'thingvellir', date: '2018-07-21', kind: 'nature', tags: ['culture'], trip: 'is18', by: 'stefan', with: ['stefan', 'marleen', 'family'], photo: 'thingvellir', title: 'Between two continents' },

  { id: 'p27', place: 'pantheon', date: '2017-04-08', kind: 'architecture', tags: ['culture'], by: 'stefan', with: ['stefan', 'marleen'], photo: 'pantheon', title: 'Rain through the oculus', note: 'It really does rain inside.' },
  { id: 'p28', place: 'trastevere', date: '2017-04-09', kind: 'moment', tags: ['food'], by: 'marleen', with: ['stefan', 'marleen'], title: 'Cacio e pepe, midnight', quote: 'The waiter brought a second carafe and wouldn’t let us pay for it.' },
  { id: 'p29', place: 'skye', date: '2021-08-14', kind: 'nature', tags: [], by: 'stefan', with: ['stefan', 'family'], photo: 'skye', title: 'Storr in the cloud' },
  { id: 'p30', place: 'orsay', date: '2020-02-01', kind: 'culture', tags: [], by: 'marleen', with: ['marleen', 'friends'], photo: 'orsay', title: "Behind the clock at Orsay", collections: ['museums'] },
  { id: 'p31', place: 'rijks', date: '2016-11-12', kind: 'culture', tags: [], by: 'stefan', with: ['stefan'], photo: 'rijks', title: 'The Night Watch, alone', note: 'A Tuesday morning, almost empty.', collections: ['return'] },
  { id: 'p32', place: 'rijks', date: '2023-10-07', kind: 'culture', tags: [], by: 'marleen', with: ['stefan', 'marleen'], title: 'Rijksmuseum, together this time', quote: 'Operation Night Watch: restorers working behind the glass.', collections: ['museums'] },

  { id: 'p33', place: 'luxembourg', date: '2025-11-29', kind: 'moment', tags: ['architecture'], trip: 'gt26', by: 'marleen', with: ['stefan', 'marleen'], photo: 'luxembourg', title: 'Luxembourg, first evening' },
  { id: 'p34', place: 'beyeler', date: '2025-12-01', kind: 'culture', tags: ['architecture'], trip: 'gt26', by: 'stefan', with: ['stefan', 'marleen'], photo: 'beyeler', title: 'Fondation Beyeler', collections: ['museums'] },
  { id: 'p35', place: 'basel', date: '2025-11-30', kind: 'architecture', tags: [], trip: 'gt26', by: 'stefan', with: ['stefan', 'marleen'], photo: 'basel', title: 'Basel from the Pfalz' },
  { id: 'p36', place: 'francescana', date: '2025-12-03', kind: 'food', tags: ['michelin'], trip: 'gt26', by: 'stefan', with: ['stefan', 'marleen'], photo: 'modena', title: 'Osteria Francescana', quote: '“Oops! I dropped the lemon tart.”', collections: ['tables'] },
  { id: 'p37', place: 'menton', date: '2025-12-06', kind: 'moment', tags: [], trip: 'gt26', by: 'marleen', with: ['stefan', 'marleen'], photo: 'menton', title: 'Menton in winter sun' },
  { id: 'p38', place: 'grasse', date: '2025-12-08', kind: 'culture', tags: [], trip: 'gt26', by: 'marleen', with: ['stefan', 'marleen'], photo: 'grasse', title: 'A morning of perfume' },
  { id: 'p39', place: 'papes', date: '2025-12-10', kind: 'architecture', tags: ['culture'], trip: 'gt26', by: 'stefan', with: ['stefan', 'marleen'], photo: 'papes', title: 'Palais des Papes' },

  // A story: several paragraphs and photos in one memory. `body` is an ordered list of blocks,
  // so text and pictures can alternate; `photo` is the cover. (Placeholder text: Stefan will write the real one.)
  {
    id: 'p40', place: 'namiri', date: '2023-02-12', kind: 'nature', tags: ['moment', 'wildlife'], trip: 'tz23',
    by: 'stefan', with: ['stefan', 'marleen', 'pjhicks'], photo: 'ser-pride',
    title: 'When Bob Jr. died',
    standfirst: 'The Serengeti’s most famous lion was killed by his rivals while we were at Namiri Plains.',
    body: [
      { p: 'The news reached camp in the late afternoon, passed from vehicle to vehicle over the radio before anyone said it out loud at the fire. Bob Junior, the lion who had held his territory for longer than anyone expected, had been killed by a coalition of younger males.' },
      { p: 'We had been watching lions all week without thinking much about who they were. Suddenly every name the guides used carried a history: brothers, rivals, territories won and lost.' },
      { imgs: ['ser-lion', 'ser-kopje'] },
      { p: 'That evening PJ Hicks, who had photographed Bob Junior for years, sat with us over gin-tonics and talked it through: how a coalition forms, why a long reign always ends like this, and what it would mean for the prides on the plains.' },
      { img: 'ser-plains', caption: 'The plains from camp, the evening the news came.' },
      { p: 'Nature has no sentiment about these things. We did, a little. It is the evening of the whole trip that we talk about most.' },
      { img: 'ser-camp' },
    ],
    collections: ['return'],
  },
];
