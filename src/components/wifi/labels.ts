// Place-type and status wording for the WiFi pages (wifi-city 2 and 10.2). Shared by the server and the client.

export type Fee = 'free' | 'customers' | 'unknown';

export const CAT_LABEL: Record<string, string> = {
  cafe: 'Cafe', coffee: 'Cafe', library: 'Library', restaurant: 'Restaurant', fast_food: 'Fast food',
  bar: 'Bar', pub: 'Pub', biergarten: 'Beer garden', brewery: 'Brewery', distillery: 'Distillery', winery: 'Winery',
  hotel: 'Hotel', motel: 'Motel', hostel: 'Hostel', guest_house: 'Guest house',
  museum: 'Museum', theatre: 'Theater', arts_centre: 'Arts center', community_centre: 'Community center',
  coworking_space: 'Coworking space', college: 'College', university: 'University', school: 'School',
  supermarket: 'Supermarket', bakery: 'Bakery', ice_cream: 'Ice cream shop', fuel: 'Gas station',
  aerodrome: 'Airport', terminal: 'Airport terminal', station: 'Station', clinic: 'Clinic',
  doctors: 'Doctor’s office', dentist: 'Dentist', hospital: 'Hospital', veterinary: 'Vet',
  car_repair: 'Car repair shop', tyres: 'Tire shop', laundry: 'Laundromat', dry_cleaning: 'Dry cleaner',
  townhall: 'City hall', other: 'Other',
  // Every other value present in the data, so no raw OSM word reaches the page (UI-REVIEW-final issue 1).
  alcohol: 'Liquor store', animal_boarding: 'Pet boarding', attraction: 'Attraction', bank: 'Bank',
  beauty: 'Beauty salon', beverages: 'Drinks store', bicycle: 'Bike shop', books: 'Bookstore',
  bus_station: 'Bus station', car: 'Car dealer', casino: 'Casino', chocolate: 'Chocolate shop', cinema: 'Movie theater',
  clothes: 'Clothing store', computer: 'Computer store', conference_centre: 'Conference center',
  department_store: 'Department store', doityourself: 'Hardware store', electronics: 'Electronics store',
  events_venue: 'Event venue', ferry_terminal: 'Ferry terminal', fitness_centre: 'Gym', food_court: 'Food court',
  hackerspace: 'Makerspace', hairdresser: 'Hair salon', hookah_lounge: 'Hookah lounge', indoor_play: 'Play center',
  information: 'Visitor center', landmark: 'Landmark', mall: 'Shopping mall', massage: 'Massage studio',
  medispa: 'Med spa', miniature_golf: 'Mini golf', mobile_phone: 'Phone store', outdoor: 'Outdoor store',
  park: 'Park', pastry: 'Pastry shop', pet: 'Pet store', pharmacy: 'Pharmacy', place_of_worship: 'Place of worship',
  playground: 'Playground', sports_centre: 'Sports center', tea: 'Tea shop', travel_agency: 'Travel agency',
  window_construction: 'Window store',
};

/** Singular, sentence case: "Cafe", "Community center". Unknown OSM values read as words ("Ice rink"). */
export const catLabel = (c: string) =>
  CAT_LABEL[c] ?? c.replace(/_/g, ' ').replace(/centre/g, 'center').replace(/^./, (m) => m.toUpperCase());

export const LODGING = ['hotel', 'motel', 'hostel', 'guest_house'];
export const isLodging = (c: string) => LODGING.includes(c);

/** Cafe and coffee are one group, places to stay are one group; every other category is its own group. */
export const group = (c: string) => (c === 'coffee' ? 'cafe' : isLodging(c) ? 'stay' : c);

/** Lowercase plural for running text: "libraries", "places to stay", "fast-food spots". */
export const catPlural = (c: string, n = 2) => {
  if (c === 'stay') return n === 1 ? 'place to stay' : 'places to stay';
  if (c === 'other') return n === 1 ? 'other place' : 'other places';
  const l = catLabel(c).toLowerCase();
  if (n === 1) return l;
  if (c === 'fast_food') return 'fast-food spots';
  return l.endsWith('y') ? l.slice(0, -1) + 'ies' : l + 's';
};

/** Type-of-place filter groups (wifi-city 10.2), each shown when the city has at least 3. */
export const TYPE_GROUPS = [
  'library', 'cafe', 'restaurant', 'fast_food', 'bar', 'pub', 'brewery', 'stay',
  'supermarket', 'bakery', 'coworking_space', 'community_centre', 'museum',
];

/** Select label for a group: "Libraries", "Places to stay", "Fast food", "Other places". */
export const groupLabel = (g: string) =>
  g === 'fast_food' ? 'Fast food' : catPlural(g).replace(/^./, (m) => m.toUpperCase());

/** The one vocabulary for status (badge, legend, filter, intro, FAQ). */
export const FEE_LABEL: Record<Fee, string> = {
  free: 'Free for everyone',
  customers: 'Customers only',
  unknown: 'Ask staff',
};

/** Badge text: places to stay that keep WiFi for customers show "Customers only (guests)". */
export const badgeText = (fee: Fee, category: string) =>
  fee === 'customers' && isLodging(category) ? 'Customers only (guests)' : FEE_LABEL[fee];
