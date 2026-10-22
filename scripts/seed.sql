-- Little Moonbeam's Creations seed data (idempotent)
BEGIN;

-- Users (password for both: moonbeam123)
INSERT INTO users (id, email, password_hash, name, role) VALUES
  (1, 'admin@littlemoonbeamscreations.co.uk', '49fcabdc63e6e75559f4edc5bd502cb0:dafbc47032ad97c6ce18ae407b71b27001c557f4234c69f15d0fe07b6540b9c71bc2055711e3e9e66c474063a3a8353d6a84554d23a17fde4c1c8d715e452fae', 'Moonbeam Admin', 'admin'),
  (2, 'emily@example.com', '5ff6e515d10b8604100d236712859445:adca85b89e6f0e8b4a0115b16f24c71fccf3686b042be503b77587f4a657f95226c19745ffb6b4721073bc0edff47edbbd4bd647a6812b0ff05c0d42701af40c', 'Emily Rose', 'customer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (id, name, slug, description) VALUES
  (1, 'Necklaces', 'necklaces', 'Handmade pendant and beaded necklaces with precious stones.'),
  (2, 'Bracelets', 'bracelets', 'Gemstone bead bracelets with artisan charms.'),
  (3, 'Earrings', 'earrings', 'Sterling silver studs, hoops and celestial drops.'),
  (4, 'Rings', 'rings', 'Hand-forged sterling silver rings with natural stones.'),
  (5, 'Anklets', 'anklets', 'Delicate pearl and silver anklets.')
ON CONFLICT (slug) DO NOTHING;


INSERT INTO products (id, name, slug, sku, description, materials, stone_info, care_instructions, price, sale_price, stock, low_stock_threshold, status, featured, is_new, is_bestseller, category_id, collection_id, meta_title, meta_description) VALUES
  (1, 'Luna Moonstone Pendant Necklace', 'luna-moonstone-pendant-necklace', 'LM-NECK-001',
   'Our signature piece. A luminous oval rainbow moonstone, hand-set in a sterling silver bezel and hung from a whisper-fine silver chain. In candlelight it flashes soft blues and lilacs — like catching moonlight on water.',
   '925 sterling silver, genuine rainbow moonstone (10x14mm), 45cm silver chain with 5cm extender.',
   'Rainbow moonstone is known as the stone of new beginnings, said to soothe emotions and spark intuition. Each stone displays unique adularescence — a soft blue shimmer that moves with the light.',
   'Keep away from water, perfume and lotions. Store in the pouch provided and polish gently with the included silver cloth.',
   4200, NULL, 12, 3, 'active', true, false, true, 1, 1,
   'Luna Moonstone Pendant Necklace | Handmade Sterling Silver', 'Handmade rainbow moonstone necklace in sterling silver. Ethically sourced, gift-wrapped, free UK shipping over £50.'),
  (2, 'Amethyst Dream Crystal Pendant', 'amethyst-dream-crystal-pendant', 'LM-NECK-002',
   'A raw amethyst point, lovingly wrapped by hand in recycled sterling silver wire. Because every crystal is natural, yours will be beautifully one of a kind.',
   'Raw Brazilian amethyst point, recycled 925 sterling silver wire, 50cm chain.',
   'Amethyst is the stone of calm and clarity, long used to quiet busy minds and invite restful sleep. Colour ranges from soft lilac to deep violet.',
   'Wipe gently with a soft cloth. Avoid prolonged sunlight, which can soften the crystal''s colour.',
   3800, 3200, 8, 3, 'active', true, true, false, 1, 2, NULL, NULL),
  (3, 'Starlight & Crescent Drop Earrings', 'starlight-crescent-drop-earrings', 'LM-EARR-001',
   'Dainty crescent moons and tiny sparkling stars dance from sterling silver hooks. Light as a moonbeam, these are our most-loved earrings for day and night.',
   '925 sterling silver, cubic zirconia accents, hypoallergenic ear wires.',
   'Set with ethically produced cubic zirconia for an affordable, conflict-free sparkle.',
   'Store in a dry place; polish with a silver cloth. Remove before swimming or sleeping.',
   2800, NULL, 20, 4, 'active', true, false, true, 3, 2, NULL, NULL),
  (4, 'Rose Quartz Moon Charm Bracelet', 'rose-quartz-moon-charm-bracelet', 'LM-BRAC-001',
   'Soft pink rose quartz beads strung by hand on strong stretch cord, finished with a tiny gold-plated crescent moon charm. A little hug for your wrist.',
   'Genuine 6mm rose quartz beads, gold-plated brass crescent charm, professional stretch cord.',
   'Rose quartz is the stone of unconditional love — gentle, soothing and endlessly giving.',
   'Roll on and off rather than pulling. Keep dry to protect the cord and plating.',
   2600, NULL, 15, 3, 'active', true, true, false, 2, 1, NULL, NULL),
  (5, 'Labradorite Aurora Ring', 'labradorite-aurora-ring', 'LM-RING-001',
   'A flashing blue-green labradorite set on a hand-hammered sterling silver band. Tilt your hand and watch the northern lights ripple across the stone.',
   '925 sterling silver hammered band, genuine labradorite cabochon (8x10mm). Available in sizes K–R.',
   'Labradorite, the stone of magic, shimmers with labradorescence — flashes of blue, green and gold hidden inside a grey stone.',
   'Remove before washing hands or swimming. Polish the band with the included cloth.',
   4600, NULL, 6, 3, 'active', false, false, true, 4, 3, NULL, NULL),
  (6, 'Freshwater Pearl Star Anklet', 'freshwater-pearl-star-anklet', 'LM-ANKL-001',
   'Tiny freshwater pearls and polished silver beads on a fine chain, finished with a little star charm. Barefoot summer magic.',
   'Genuine freshwater pearls, 925 sterling silver chain and star charm, 23cm + 3cm extender.',
   'Freshwater pearls symbolise purity and quiet wisdom. Each pearl is naturally unique in shape and lustre.',
   'Pearls are delicate — put your anklet on after lotions and perfume, and wipe after wearing.',
   2400, NULL, 18, 3, 'active', false, true, false, 5, 4, NULL, NULL),
  (7, 'Opal Shimmer Stud Earrings', 'opal-shimmer-stud-earrings', 'LM-EARR-002',
   'Tiny orbs of iridescent opal set in sterling silver. Subtle enough for every day, magical enough for moonlit evenings.',
   '925 sterling silver settings and butterfly backs, lab-created opal (5mm) for ethical sparkle.',
   'Opal dances with every colour of the rainbow. Ours are lab-created for durability and ethics, with all the fire of the natural stone.',
   'Avoid water and perfume. Store separately to prevent scratching.',
   3400, 2900, 10, 3, 'active', false, false, true, 3, 1, NULL, NULL),
  (8, 'Turquoise River Necklace', 'turquoise-river-necklace', 'LM-NECK-003',
   'Natural turquoise nuggets flow like a river between hand-placed sterling silver beads. An earthy statement with bohemian soul.',
   'Natural stabilised turquoise nuggets, 925 sterling silver beads and clasp, 48cm length.',
   'Turquoise has been treasured for millennia as a protective talisman — each nugget carries its own unique matrix pattern.',
   'Keep away from oils and cosmetics; turquoise is porous. Wipe gently after wearing.',
   4800, NULL, 7, 3, 'active', false, true, false, 1, 3, NULL, NULL),
  (9, 'Midnight Amethyst Beaded Bracelet', 'midnight-amethyst-beaded-bracelet', 'LM-BRAC-002',
   'Deep violet amethyst beads with a single silver star spacer — midnight skies for your wrist. Stacks beautifully with our rose quartz bracelet.',
   'Genuine 6mm amethyst beads, 925 sterling silver star spacer, professional stretch cord.',
   'Amethyst brings calm and balance; worn at the wrist it is said to steady the heart through busy days.',
   'Roll on and off gently; keep dry.',
   2900, NULL, 14, 3, 'active', false, false, false, 2, 2, NULL, NULL),
  (10, 'Selene Moonstone Ring', 'selene-moonstone-ring', 'LM-RING-002',
   'Named for the goddess of the moon — a petite round moonstone on a slim twisted silver band. Quietly magical.',
   '925 sterling silver twisted band, rainbow moonstone (6mm). Available in sizes J–Q.',
   'Moonstone shifts with the light, revealing a soft inner glow said to mirror the phases of the moon.',
   'Remove before washing hands. Polish with the included silver cloth.',
   3900, NULL, 2, 3, 'active', false, true, false, 4, 1, NULL, NULL),
  (11, 'Ocean Mist Pearl Necklace', 'ocean-mist-pearl-necklace', 'LM-NECK-004',
   'A single luminous freshwater pearl floating on a fine sterling chain — sea mist caught in silver. Timeless, bridal, beautiful.',
   'AAA freshwater pearl (8mm), 925 sterling silver chain, 42cm + 5cm extender.',
   'Our pearls are responsibly farmed freshwater pearls, chosen one by one for their lustre.',
   'Pearls love to be worn! Wipe with a soft cloth after wearing and store flat.',
   5200, NULL, 9, 3, 'active', true, false, false, 1, 4, NULL, NULL),
  (12, 'Stardust Silver Hoops', 'stardust-silver-hoops', 'LM-EARR-003',
   'Classic sterling hoops hand-textured with a thousand tiny facets that catch the light like stardust.',
   '925 sterling silver, hand-textured finish, 18mm diameter, secure hinge closure.',
   'No stones — just pure, hand-finished recycled sterling silver.',
   'Polish with a silver cloth; store in the pouch provided.',
   2200, 1800, 25, 5, 'active', false, false, false, 3, 2, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;



INSERT INTO reviews (product_id, name, rating, title, comment, approved) VALUES
  (1, 'Emily R.', 5, 'Even more beautiful in person', 'The moonstone catches the light in the most magical way — soft blue flashes everywhere. The packaging was gorgeous too. Truly special.', true),
  (1, 'Charlotte W.', 5, 'My new favourite necklace', 'Bought as a birthday treat and I haven''t taken it off since. The chain is delicate but feels strong.', true),
  (1, 'Megan L.', 4, 'Lovely handmade quality', 'You can tell it''s handmade with care. Stone is slightly smaller than I imagined but absolutely beautiful.', true),
  (2, 'Sophie T.', 5, 'Stunning crystal', 'My amethyst is a gorgeous deep purple and the wire wrapping is so neat. Arrived beautifully gift-wrapped.', true),
  (3, 'Hannah M.', 5, 'Perfect celestial earrings', 'So light I forget I''m wearing them. The little stars twinkle just like the name promises!', true),
  (3, 'Jess P.', 5, 'Bought two pairs', 'One for me and one for my sister — we both adore them. Fast delivery and lovely handwritten note.', true),
  (4, 'Amelia K.', 5, 'The sweetest bracelet', 'The rose quartz is such a soft pink and the little moon charm is adorable. Fits perfectly.', true),
  (5, 'Lucy B.', 5, 'Magical labradorite', 'The flash on this stone is unreal — blues and greens everywhere. The hammered band is gorgeous.', true),
  (6, 'Freya D.', 4, 'Summer essential', 'Delicate and pretty, survived a whole beach holiday. Would love a matching bracelet!', true),
  (7, 'Grace H.', 5, 'Tiny rainbows', 'These opals flash every colour when the light hits. Comfortable all day.', true),
  (8, 'Isla C.', 5, 'Statement piece', 'The turquoise is stunning — every nugget is different. I get compliments every time I wear it.', true),
  (11, 'Rosie F.', 5, 'Wore it on my wedding day', 'Elegant, timeless and beautifully made. It was the perfect something-new.', true)
ON CONFLICT DO NOTHING;

INSERT INTO discount_codes (code, type, value, min_subtotal, active, usage_limit) VALUES
  ('WELCOME10', 'percent', 10, 0, true, NULL),
  ('MOONBEAM5', 'fixed', 500, 3000, true, 200),
  ('FULLMOON15', 'percent', 15, 5000, true, 100)
ON CONFLICT (code) DO NOTHING;

INSERT INTO inventory_logs (product_id, change, reason)
SELECT id, stock, 'Initial stock'
FROM products
WHERE NOT EXISTS (SELECT 1 FROM inventory_logs);

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));
SELECT setval('collections_id_seq', (SELECT COALESCE(MAX(id), 1) FROM collections));
SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));

COMMIT;
