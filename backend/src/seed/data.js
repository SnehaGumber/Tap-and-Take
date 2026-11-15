'use strict';

/**
 * Development catalogue images are served from frontend/public/product-images.
 * No third-party image host is required.
 */
const img = (seed, n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    url: `/product-images/product-${seed}-${(i % 3) + 1}.svg`,
    publicId: '',
  }));

const categories = [
  { name: 'Electronics', description: 'Phones, laptops, audio and everyday tech essentials.' },
  { name: 'Fashion', description: 'Clothing, footwear and accessories for every season.' },
  { name: 'Home & Kitchen', description: 'Appliances, cookware and decor for a better home.' },
  { name: 'Beauty & Health', description: 'Skincare, grooming and wellness products.' },
  { name: 'Sports & Outdoors', description: 'Fitness gear, sportswear and outdoor equipment.' },
  { name: 'Books & Stationery', description: 'Bestsellers, study material and desk supplies.' },
];

const sellers = [
  {
    name: 'Aarav Mehta',
    email: 'seller@trendora.dev',
    store: {
      name: 'NovaTech Store',
      description: 'Certified consumer electronics with 12-month replacement warranty.',
      contactPhone: '+1 415 555 0111',
      status: 'approved',
    },
  },
  {
    name: 'Isha Kapoor',
    email: 'seller2@trendora.dev',
    store: {
      name: 'Urban Thread',
      description: 'Everyday fashion built from sustainable fabrics.',
      contactPhone: '+1 415 555 0122',
      status: 'approved',
    },
  },
  {
    name: 'Rohan Verma',
    email: 'seller3@trendora.dev',
    store: {
      name: 'HomeCraft Living',
      description: 'Kitchen and home essentials designed for small apartments.',
      contactPhone: '+1 415 555 0133',
      status: 'approved',
    },
  },
  {
    name: 'Neha Sharma',
    email: 'seller4@trendora.dev',
    store: {
      name: 'PureGlow Wellness',
      description: 'Dermatologist tested skincare and wellness products.',
      contactPhone: '+1 415 555 0144',
      status: 'pending',
    },
  },
];

const customers = [
  { name: 'Priya Nair', email: 'customer@trendora.dev', phone: '+1 415 555 0201' },
  { name: 'Karan Singh', email: 'customer2@trendora.dev', phone: '+1 415 555 0202' },
  { name: 'Meera Iyer', email: 'customer3@trendora.dev', phone: '+1 415 555 0203' },
];

const spec = (pairs) => pairs.map(([key, value]) => ({ key, value }));

/**
 * storeIndex maps to the `sellers` array above.
 */
const products = [
  {
    title: 'Nova Pulse Wireless Noise Cancelling Headphones',
    brand: 'NovaSound',
    category: 'Electronics',
    storeIndex: 0,
    price: 189.99,
    discountPercent: 20,
    stock: 42,
    tags: ['headphones', 'audio', 'wireless'],
    description:
      'Hybrid active noise cancellation, 40 hour battery life and memory foam ear cushions make the Nova Pulse ideal for long commutes and focused work sessions. Includes a hard carry case and USB-C fast charging.',
    specifications: spec([
      ['Driver', '40mm dynamic'],
      ['Battery life', '40 hours (ANC off)'],
      ['Connectivity', 'Bluetooth 5.3, 3.5mm'],
      ['Weight', '248 g'],
    ]),
  },
  {
    title: 'Nova Book Air 14 Thin & Light Laptop (16GB / 512GB)',
    brand: 'NovaTech',
    category: 'Electronics',
    storeIndex: 0,
    price: 899,
    discountPercent: 12,
    stock: 18,
    tags: ['laptop', 'work', 'student'],
    description:
      'A 14 inch 2.8K display, 16GB LPDDR5 memory and a 512GB NVMe SSD in a 1.29kg magnesium alloy body. Backlit keyboard, fingerprint reader and 12 hours of real world battery for students and developers.',
    specifications: spec([
      ['Processor', '8-core, up to 4.6 GHz'],
      ['Memory', '16 GB LPDDR5'],
      ['Storage', '512 GB NVMe SSD'],
      ['Display', '14" 2.8K 120Hz'],
    ]),
  },
  {
    title: 'Nova Watch Fit 2 Smartwatch with AMOLED Display',
    brand: 'NovaTech',
    category: 'Electronics',
    storeIndex: 0,
    price: 129.5,
    discountPercent: 25,
    stock: 65,
    tags: ['smartwatch', 'fitness'],
    description:
      'Track workouts, SpO2, sleep stages and stress with a 1.43 inch AMOLED screen. 5ATM water resistance, 100+ sport modes and 14 day typical battery life with Bluetooth calling support.',
    specifications: spec([
      ['Display', '1.43" AMOLED'],
      ['Battery', '14 days typical'],
      ['Water resistance', '5 ATM'],
      ['Sensors', 'HR, SpO2, accelerometer'],
    ]),
  },
  {
    title: 'Nova Charge 65W GaN Fast Charger (3 Port)',
    brand: 'NovaTech',
    category: 'Electronics',
    storeIndex: 0,
    price: 39.99,
    discountPercent: 10,
    stock: 120,
    tags: ['charger', 'accessory'],
    description:
      'Charge a laptop, phone and earbuds at the same time from one compact GaN adapter. Intelligent power sharing, over-voltage protection and foldable pins for travel.',
    specifications: spec([
      ['Output', '65W total'],
      ['Ports', '2x USB-C, 1x USB-A'],
      ['Protection', 'OVP, OCP, thermal'],
    ]),
  },
  {
    title: 'Nova Beam 1080p Portable Projector',
    brand: 'NovaVision',
    category: 'Electronics',
    storeIndex: 0,
    price: 249,
    discountPercent: 15,
    stock: 12,
    tags: ['projector', 'home cinema'],
    description:
      'Native 1080p resolution, auto keystone correction and built-in stereo speakers turn any wall into a 120 inch screen. Streams directly over Wi-Fi or via HDMI and USB-C.',
    specifications: spec([
      ['Resolution', '1920 x 1080'],
      ['Brightness', '450 ANSI lumens'],
      ['Throw ratio', '1.2:1'],
    ]),
  },
  {
    title: 'Nova Buds Pro True Wireless Earbuds',
    brand: 'NovaSound',
    category: 'Electronics',
    storeIndex: 0,
    price: 79.99,
    discountPercent: 30,
    stock: 88,
    tags: ['earbuds', 'audio'],
    description:
      'Compact earbuds with 11mm drivers, four microphone call clarity and 30 hours of total playback with the charging case. IPX5 sweat resistance for workouts.',
    specifications: spec([
      ['Drivers', '11 mm'],
      ['Playback', '7h + 23h case'],
      ['Rating', 'IPX5'],
    ]),
  },
  {
    title: 'Nova Guard 1080p Wi-Fi Security Camera',
    brand: 'NovaHome',
    category: 'Electronics',
    storeIndex: 0,
    price: 54.99,
    discountPercent: 0,
    stock: 4,
    tags: ['camera', 'security', 'smart home'],
    description:
      'Pan and tilt indoor camera with motion tracking, two way audio and infrared night vision up to 10 metres. Stores footage locally on microSD with no subscription needed.',
    specifications: spec([
      ['Resolution', '1080p'],
      ['Field of view', '355 degrees pan'],
      ['Storage', 'microSD up to 128GB'],
    ]),
  },
  {
    title: 'Nova Mech K2 Hot-Swappable Mechanical Keyboard',
    brand: 'NovaTech',
    category: 'Electronics',
    storeIndex: 0,
    price: 89,
    discountPercent: 18,
    stock: 33,
    tags: ['keyboard', 'gaming', 'developer'],
    description:
      'A 75% layout mechanical keyboard with hot-swappable switches, south facing RGB, gasket mounted plate and tri-mode connectivity for desk setups that switch between work and play.',
    specifications: spec([
      ['Layout', '75% (82 keys)'],
      ['Switches', 'Linear, hot-swappable'],
      ['Connectivity', 'USB-C, BT 5.1, 2.4GHz'],
    ]),
  },
  {
    title: 'Urban Thread Everyday Oversized Cotton T-Shirt',
    brand: 'Urban Thread',
    category: 'Fashion',
    storeIndex: 1,
    price: 24.99,
    discountPercent: 20,
    stock: 150,
    tags: ['tshirt', 'cotton', 'casual'],
    description:
      'Cut from 240 GSM combed cotton with a relaxed drop shoulder fit. Pre-shrunk, bio-washed and finished with reinforced shoulder taping so it keeps its shape after repeated washes.',
    specifications: spec([
      ['Fabric', '100% combed cotton, 240 GSM'],
      ['Fit', 'Oversized'],
      ['Care', 'Machine wash cold'],
    ]),
  },
  {
    title: 'Urban Thread Slim Fit Stretch Denim Jeans',
    brand: 'Urban Thread',
    category: 'Fashion',
    storeIndex: 1,
    price: 59.99,
    discountPercent: 25,
    stock: 74,
    tags: ['jeans', 'denim'],
    description:
      'Mid rise slim fit jeans in 2% elastane stretch denim for all day comfort. Whiskered finish, tapered leg and five pocket styling that works from campus to weekend plans.',
    specifications: spec([
      ['Fabric', '98% cotton, 2% elastane'],
      ['Rise', 'Mid rise'],
      ['Leg', 'Slim tapered'],
    ]),
  },
  {
    title: 'Urban Thread Windcheater Hooded Jacket',
    brand: 'Urban Thread',
    category: 'Fashion',
    storeIndex: 1,
    price: 84.5,
    discountPercent: 15,
    stock: 40,
    tags: ['jacket', 'winter'],
    description:
      'Water repellent shell with taped seams, mesh lining and a packable hood. Zip pockets and adjustable cuffs make it a practical layer for monsoon and early winter travel.',
    specifications: spec([
      ['Shell', 'Recycled polyester'],
      ['Water resistance', '3000 mm'],
      ['Pockets', '3 (2 zip, 1 internal)'],
    ]),
  },
  {
    title: 'Urban Thread Canvas Everyday Sneakers',
    brand: 'Urban Thread',
    category: 'Fashion',
    storeIndex: 1,
    price: 49.99,
    discountPercent: 10,
    stock: 96,
    tags: ['shoes', 'sneakers'],
    description:
      'Low top canvas sneakers on a cushioned EVA midsole with a memory foam insole. Vulcanised rubber outsole gives grip without adding weight.',
    specifications: spec([
      ['Upper', 'Cotton canvas'],
      ['Midsole', 'EVA'],
      ['Closure', 'Lace-up'],
    ]),
  },
  {
    title: 'Urban Thread Leather Bifold Wallet',
    brand: 'Urban Thread',
    category: 'Fashion',
    storeIndex: 1,
    price: 34.99,
    discountPercent: 0,
    stock: 61,
    tags: ['wallet', 'accessory', 'leather'],
    description:
      'Full grain leather bifold with RFID blocking lining, six card slots and a hidden coin pocket. Hand finished edges develop a natural patina over time.',
    specifications: spec([
      ['Material', 'Full grain leather'],
      ['Card slots', '6'],
      ['Protection', 'RFID blocking'],
    ]),
  },
  {
    title: 'Urban Thread Ribbed Knit Cardigan',
    brand: 'Urban Thread',
    category: 'Fashion',
    storeIndex: 1,
    price: 68,
    discountPercent: 22,
    stock: 3,
    tags: ['cardigan', 'knitwear'],
    description:
      'Soft acrylic wool blend cardigan with a ribbed body, drop shoulders and horn effect buttons. Layers easily over shirts and tees through the cooler months.',
    specifications: spec([
      ['Fabric', 'Acrylic wool blend'],
      ['Fit', 'Relaxed'],
      ['Care', 'Hand wash'],
    ]),
  },
  {
    title: 'Urban Thread Weekender Duffle Bag 40L',
    brand: 'Urban Thread',
    category: 'Fashion',
    storeIndex: 1,
    price: 74.99,
    discountPercent: 12,
    stock: 27,
    tags: ['bag', 'travel'],
    description:
      'Cabin friendly 40 litre duffle in water resistant 900D polyester with a separate shoe compartment, trolley sleeve and padded shoulder strap.',
    specifications: spec([
      ['Capacity', '40 L'],
      ['Fabric', '900D polyester'],
      ['Compartments', '4'],
    ]),
  },
  {
    title: 'HomeCraft 5.5L Digital Air Fryer',
    brand: 'HomeCraft',
    category: 'Home & Kitchen',
    storeIndex: 2,
    price: 119.99,
    discountPercent: 25,
    stock: 36,
    tags: ['air fryer', 'kitchen', 'appliance'],
    description:
      'Rapid air circulation cooks with up to 85% less oil. Eight presets, a digital touch panel and a dishwasher safe non-stick basket make weeknight cooking effortless.',
    specifications: spec([
      ['Capacity', '5.5 L'],
      ['Power', '1500 W'],
      ['Presets', '8'],
    ]),
  },
  {
    title: 'HomeCraft Triple Layer Stainless Steel Cookware Set (5 Piece)',
    brand: 'HomeCraft',
    category: 'Home & Kitchen',
    storeIndex: 2,
    price: 159,
    discountPercent: 18,
    stock: 22,
    tags: ['cookware', 'kitchen'],
    description:
      'Tri-ply stainless steel construction with an aluminium core for even heat. Induction and gas compatible with riveted stay-cool handles and tempered glass lids.',
    specifications: spec([
      ['Pieces', '5'],
      ['Material', 'Tri-ply stainless steel'],
      ['Compatibility', 'Induction, gas, electric'],
    ]),
  },
  {
    title: 'HomeCraft Robot Vacuum with Smart Mapping',
    brand: 'HomeCraft',
    category: 'Home & Kitchen',
    storeIndex: 2,
    price: 279,
    discountPercent: 20,
    stock: 9,
    tags: ['vacuum', 'smart home', 'cleaning'],
    description:
      'LiDAR mapping, 2700Pa suction and app controlled no-go zones. Cleans up to 150 square metres per charge and returns to the dock automatically.',
    specifications: spec([
      ['Suction', '2700 Pa'],
      ['Battery', '5200 mAh'],
      ['Navigation', 'LiDAR SLAM'],
    ]),
  },
  {
    title: 'HomeCraft Ceramic Coated Non-Stick Frying Pan 28cm',
    brand: 'HomeCraft',
    category: 'Home & Kitchen',
    storeIndex: 2,
    price: 44.99,
    discountPercent: 10,
    stock: 78,
    tags: ['pan', 'kitchen'],
    description:
      'PFOA free ceramic non-stick coating over a forged aluminium base for fast, even heating. Bakelite handle stays cool and the surface is metal spatula safe.',
    specifications: spec([
      ['Diameter', '28 cm'],
      ['Coating', 'Ceramic, PFOA free'],
      ['Base', 'Forged aluminium'],
    ]),
  },
  {
    title: 'HomeCraft Nordic Study Desk with Cable Management',
    brand: 'HomeCraft',
    category: 'Home & Kitchen',
    storeIndex: 2,
    price: 189,
    discountPercent: 15,
    stock: 14,
    tags: ['desk', 'furniture', 'work from home'],
    description:
      'A 120cm engineered wood desk with a steel frame, integrated cable tray and a side drawer. Levelling feet keep it stable on uneven floors.',
    specifications: spec([
      ['Dimensions', '120 x 60 x 75 cm'],
      ['Load capacity', '80 kg'],
      ['Assembly', 'Required, tools included'],
    ]),
  },
  {
    title: 'HomeCraft Warm White LED Ambient Floor Lamp',
    brand: 'HomeCraft',
    category: 'Home & Kitchen',
    storeIndex: 2,
    price: 69.99,
    discountPercent: 0,
    stock: 45,
    tags: ['lamp', 'lighting', 'decor'],
    description:
      'Dimmable floor lamp with three colour temperatures, a weighted marble base and a linen shade that diffuses light evenly across a living room corner.',
    specifications: spec([
      ['Height', '150 cm'],
      ['Colour temperature', '2700K - 5000K'],
      ['Control', 'Foot dimmer'],
    ]),
  },
  {
    title: 'HomeCraft 1.7L Borosilicate Glass Electric Kettle',
    brand: 'HomeCraft',
    category: 'Home & Kitchen',
    storeIndex: 2,
    price: 39.5,
    discountPercent: 8,
    stock: 92,
    tags: ['kettle', 'kitchen'],
    description:
      'Boils 1.7 litres in under six minutes with auto shut-off and boil dry protection. Borosilicate glass body with a stainless steel base and a cool blue interior light.',
    specifications: spec([
      ['Capacity', '1.7 L'],
      ['Power', '1800 W'],
      ['Safety', 'Auto shut-off, boil dry protection'],
    ]),
  },
  {
    title: 'PureGlow Vitamin C Brightening Face Serum 30ml',
    brand: 'PureGlow',
    category: 'Beauty & Health',
    storeIndex: 3,
    price: 29.99,
    discountPercent: 20,
    stock: 130,
    tags: ['skincare', 'serum'],
    description:
      'A 10% ethyl ascorbic acid serum with ferulic acid and hyaluronic acid to brighten dull skin and reduce the look of dark spots. Lightweight, fragrance free and non-comedogenic.',
    specifications: spec([
      ['Volume', '30 ml'],
      ['Key actives', '10% Vitamin C, Ferulic acid'],
      ['Skin type', 'All, including sensitive'],
    ]),
  },
  {
    title: 'PureGlow Ceramide Repair Moisturiser 50g',
    brand: 'PureGlow',
    category: 'Beauty & Health',
    storeIndex: 3,
    price: 26.5,
    discountPercent: 10,
    stock: 110,
    tags: ['skincare', 'moisturiser'],
    description:
      'A barrier repair cream with three ceramides, squalane and panthenol. Absorbs quickly without a greasy finish and layers well under sunscreen.',
    specifications: spec([
      ['Weight', '50 g'],
      ['Key actives', 'Ceramides, Squalane, Panthenol'],
      ['Fragrance', 'Free'],
    ]),
  },
  {
    title: 'PureGlow Mineral Sunscreen SPF 50 PA++++',
    brand: 'PureGlow',
    category: 'Beauty & Health',
    storeIndex: 3,
    price: 22.99,
    discountPercent: 0,
    stock: 160,
    tags: ['sunscreen', 'skincare'],
    description:
      'Broad spectrum mineral sunscreen with zinc oxide and titanium dioxide, tested to leave no white cast on medium to deep skin tones. Water resistant for 40 minutes.',
    specifications: spec([
      ['SPF', '50 PA++++'],
      ['Filters', 'Zinc oxide, Titanium dioxide'],
      ['Volume', '50 ml'],
    ]),
  },
  {
    title: 'PureGlow Cordless Rechargeable Hair Trimmer',
    brand: 'PureGlow',
    category: 'Beauty & Health',
    storeIndex: 3,
    price: 44.99,
    discountPercent: 15,
    stock: 48,
    tags: ['grooming', 'trimmer'],
    description:
      'Self sharpening titanium blades, 20 length settings and 120 minutes of cordless runtime with a two hour full charge. Fully washable head for easy cleaning.',
    specifications: spec([
      ['Runtime', '120 minutes'],
      ['Settings', '20 lengths (0.5 - 10 mm)'],
      ['Blades', 'Titanium coated'],
    ]),
  },
  {
    title: 'PureGlow Digital Body Composition Weighing Scale',
    brand: 'PureGlow',
    category: 'Beauty & Health',
    storeIndex: 3,
    price: 34.99,
    discountPercent: 12,
    stock: 55,
    tags: ['health', 'fitness'],
    description:
      'Measures weight, BMI, body fat, muscle mass and water percentage through bioelectrical impedance, then syncs to the companion app over Bluetooth.',
    specifications: spec([
      ['Max load', '180 kg'],
      ['Metrics', '13'],
      ['Connectivity', 'Bluetooth 5.0'],
    ]),
  },
  {
    title: 'ActiveCore Anti-Slip Yoga Mat 6mm',
    brand: 'ActiveCore',
    category: 'Sports & Outdoors',
    storeIndex: 1,
    price: 32.99,
    discountPercent: 15,
    stock: 84,
    tags: ['yoga', 'fitness'],
    description:
      'A 6mm TPE mat with dual textured surfaces for grip in both dry and sweaty sessions. Closed cell construction resists moisture and includes a carry strap.',
    specifications: spec([
      ['Thickness', '6 mm'],
      ['Material', 'TPE, latex free'],
      ['Size', '183 x 61 cm'],
    ]),
  },
  {
    title: 'ActiveCore Adjustable Dumbbell Set 20kg',
    brand: 'ActiveCore',
    category: 'Sports & Outdoors',
    storeIndex: 1,
    price: 129,
    discountPercent: 10,
    stock: 19,
    tags: ['gym', 'strength'],
    description:
      'Pair of adjustable dumbbells with knurled chrome handles, secure spin lock collars and rubber encased plates that protect flooring during home workouts.',
    specifications: spec([
      ['Total weight', '20 kg'],
      ['Handle', 'Knurled chrome'],
      ['Plates', 'Rubber encased'],
    ]),
  },
  {
    title: 'ActiveCore Insulated Stainless Steel Bottle 1L',
    brand: 'ActiveCore',
    category: 'Sports & Outdoors',
    storeIndex: 2,
    price: 27.99,
    discountPercent: 0,
    stock: 140,
    tags: ['bottle', 'outdoor'],
    description:
      'Double walled vacuum insulation keeps drinks cold for 24 hours or hot for 12. Food grade 18/8 stainless steel with a leak proof lid and powder coated grip.',
    specifications: spec([
      ['Capacity', '1 L'],
      ['Insulation', 'Double wall vacuum'],
      ['Material', '18/8 stainless steel'],
    ]),
  },
  {
    title: 'ActiveCore Trail Running Shoes with Rock Plate',
    brand: 'ActiveCore',
    category: 'Sports & Outdoors',
    storeIndex: 1,
    price: 94.99,
    discountPercent: 20,
    stock: 31,
    tags: ['running', 'shoes', 'outdoor'],
    description:
      'Aggressive 4mm lugs, a forefoot rock plate and a breathable engineered mesh upper built for mixed terrain. Gusseted tongue keeps debris out on long trails.',
    specifications: spec([
      ['Drop', '8 mm'],
      ['Weight', '285 g (UK 8)'],
      ['Outsole', 'Rubber, 4 mm lugs'],
    ]),
  },
  {
    title: 'ActiveCore 2-Person Waterproof Camping Tent',
    brand: 'ActiveCore',
    category: 'Sports & Outdoors',
    storeIndex: 2,
    price: 149.99,
    discountPercent: 18,
    stock: 2,
    tags: ['camping', 'tent', 'outdoor'],
    description:
      'Double layer dome tent with a 3000mm waterproof rating, taped seams and colour coded poles that pitch in under five minutes. Packs down to 45cm for backpacking.',
    specifications: spec([
      ['Capacity', '2 person'],
      ['Waterproof rating', '3000 mm'],
      ['Packed weight', '2.6 kg'],
    ]),
  },
  {
    title: 'PageTurner Data Structures & Algorithms Made Simple',
    brand: 'PageTurner',
    category: 'Books & Stationery',
    storeIndex: 0,
    price: 34.99,
    discountPercent: 20,
    stock: 70,
    tags: ['book', 'programming', 'interview'],
    description:
      'A placement focused guide covering arrays, linked lists, trees, graphs and dynamic programming with 450 worked problems and complexity analysis for every solution.',
    specifications: spec([
      ['Pages', '712'],
      ['Language', 'English'],
      ['Edition', '4th'],
    ]),
  },
  {
    title: 'PageTurner Hardbound Dotted Notebook A5 (Pack of 2)',
    brand: 'PageTurner',
    category: 'Books & Stationery',
    storeIndex: 2,
    price: 18.99,
    discountPercent: 10,
    stock: 200,
    tags: ['notebook', 'stationery'],
    description:
      'A5 dotted notebooks with 120 GSM fountain pen friendly paper, lay flat binding, an elastic closure and a ribbon bookmark. 192 pages each.',
    specifications: spec([
      ['Paper', '120 GSM, dotted'],
      ['Pages', '192 per book'],
      ['Size', 'A5 (148 x 210 mm)'],
    ]),
  },
  {
    title: 'PageTurner Ergonomic Gel Pen Set (Pack of 10)',
    brand: 'PageTurner',
    category: 'Books & Stationery',
    storeIndex: 2,
    price: 12.99,
    discountPercent: 0,
    stock: 240,
    tags: ['pen', 'stationery'],
    description:
      'Quick drying 0.5mm gel pens with a soft rubber grip and smudge resistant ink. Ten pens per pack in a reusable travel case.',
    specifications: spec([
      ['Tip size', '0.5 mm'],
      ['Ink', 'Quick dry gel'],
      ['Quantity', '10'],
    ]),
  },
  {
    title: 'PageTurner Bamboo Laptop Stand with Adjustable Height',
    brand: 'PageTurner',
    category: 'Books & Stationery',
    storeIndex: 2,
    price: 42.99,
    discountPercent: 12,
    stock: 58,
    tags: ['desk', 'laptop', 'ergonomic'],
    description:
      'Solid bamboo riser with six height settings that lifts your screen to eye level and ventilates the base of the laptop. Fits 11 to 17 inch devices.',
    specifications: spec([
      ['Material', 'Solid bamboo'],
      ['Heights', '6 positions'],
      ['Compatibility', '11" - 17"'],
    ]),
  },
];

const reviewTemplates = [
  { rating: 5, title: 'Exceeded my expectations', comment: 'Delivery was quick and the build quality is genuinely better than I expected at this price. Would buy from this seller again.' },
  { rating: 4, title: 'Great value for money', comment: 'Works exactly as described. Docked one star only because the manual could be clearer, but the product itself is solid.' },
  { rating: 5, title: 'Perfect for daily use', comment: 'I have been using this every day for three weeks with zero issues. Packaging was secure and nothing was damaged in transit.' },
  { rating: 3, title: 'Decent but not perfect', comment: 'Does the job well enough for the price. A couple of small finishing details could be improved, otherwise happy with the purchase.' },
  { rating: 4, title: 'Would recommend', comment: 'Good quality and the seller responded to my query within a day. Fits my requirement nicely and feels durable.' },
];

module.exports = { categories, sellers, customers, products, reviewTemplates, img };
