-- ============================================================================
-- Seed: 7 menu categories + 28 menu items + all recipe_items
-- All composites (Milk based, Half&half, Tea based, Matcha mix, Chocolate mix)
-- decomposed to raw ingredients at point of use.
-- selling_price = 0 placeholder — owner fills in actual prices via web UI.
-- Idempotent: skips rows that already exist (case-insensitive name match).
-- ============================================================================

-- 1. Menu categories ----------------------------------------------------------
INSERT INTO public.menu_categories (name, sort_order, safe_threshold, warning_threshold)
SELECT v.name, v.sort_order, 65, 50   -- safe=65% margin, warning=50%
FROM (VALUES
  ('Coffee — Signature',      1),
  ('Coffee — Kopsu',          2),
  ('Non Coffee — Milk Based', 3),
  ('Coffee Mocktail',         4),
  ('Mocktail — Non Coffee',   5),
  ('Tea Based',               6),
  ('Bundle',                  7)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_categories mc
  WHERE LOWER(TRIM(mc.name)) = LOWER(TRIM(v.name))
);

-- 2. Menu items (selling_price placeholder = 0) --------------------------------
INSERT INTO public.menu_items (name, category_id, selling_price)
SELECT v.name, mc.id, 0
FROM (VALUES
  -- Coffee — Signature
  ('Dirty Latte',               'Coffee — Signature'),
  ('Tiramisu',                  'Coffee — Signature'),
  ('Mont Blanc',                'Coffee — Signature'),
  ('Mango Matcha Latte',        'Coffee — Signature'),
  -- Coffee — Kopsu
  ('Zen Ease',                  'Coffee — Kopsu'),
  ('Hazel',                     'Coffee — Kopsu'),
  ('Caramel',                   'Coffee — Kopsu'),
  ('Dolce',                     'Coffee — Kopsu'),
  ('Bittersweet',               'Coffee — Kopsu'),
  ('Pandan Coffee Cloud',       'Coffee — Kopsu'),
  -- Non Coffee — Milk Based
  ('Chocolate Latte',           'Non Coffee — Milk Based'),
  ('Matcha Latte',              'Non Coffee — Milk Based'),
  ('Strawberry Matcha Latte',   'Non Coffee — Milk Based'),
  ('Strawberry Chocolate Latte','Non Coffee — Milk Based'),
  ('Chocolate Hazelnut',        'Non Coffee — Milk Based'),
  -- Coffee Mocktail
  ('Roseberry',                 'Coffee Mocktail'),
  ('Mango Yuzu',                'Coffee Mocktail'),
  ('Black Mint',                'Coffee Mocktail'),
  ('Berry Buzz',                'Coffee Mocktail'),
  ('Strawberry Black',          'Coffee Mocktail'),
  -- Mocktail — Non Coffee
  ('Yellow Mocktail',           'Mocktail — Non Coffee'),
  ('Strawberry Coldfoam Mojito','Mocktail — Non Coffee'),
  ('Roseberry Candy',           'Mocktail — Non Coffee'),
  -- Tea Based
  ('Milk Tea',                  'Tea Based'),
  ('Yuzu Tea',                  'Tea Based'),
  ('Lemon Tea',                 'Tea Based'),
  ('Ice Tea',                   'Tea Based'),
  -- Bundle
  ('Sparkling Berry',           'Bundle')
) AS v(name, cat_name)
JOIN public.menu_categories mc ON LOWER(TRIM(mc.name)) = LOWER(TRIM(v.cat_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m WHERE LOWER(TRIM(m.name)) = LOWER(TRIM(v.name))
);

-- 3. Recipe items --------------------------------------------------------------
-- Milk based decomposition:  80ml → Evap 8  + Rich 32  + UHT 40
--                           100ml → Evap 10 + Rich 40  + UHT 50
-- Half&half milk  100ml  → UHT 70 + Whipping cream 35
-- Tea based  Xml  → Teh(daun) X*2/100 g  + Water X ml
-- Matcha mix     → Matcha powder 8g + Creamer 10g
-- Chocolate mix  → Chocolate powder 15g + Creamer 10g
-- Espresso single = 16g kopi | Double = 32g kopi
-- Garnish (cinnamon stick, star anise): fractional pcs (1/7 stick each)

INSERT INTO public.recipe_items (menu_id, ingredient_id, quantity)
SELECT m.id, i.id, r.qty
FROM (VALUES
  -- ── Dirty Latte ──────────────────────────────────────────────────
  ('Dirty Latte',               'Rich Milk',              85),
  ('Dirty Latte',               'Whipping cream',         20),
  ('Dirty Latte',               'Condensed milk (SKM)',    3),
  ('Dirty Latte',               'Kopi / Espresso',        32),  -- double ristretto

  -- ── Tiramisu ─────────────────────────────────────────────────────
  ('Tiramisu',                  'Caramel sauce',           5),
  ('Tiramisu',                  'Hazelnut syrup',          5),
  ('Tiramisu',                  'Vanilla syrup',           3),
  ('Tiramisu',                  'Whipping cream',         20),
  ('Tiramisu',                  'Evap (susu evaporasi)',   8),   -- milk based 80ml
  ('Tiramisu',                  'Rich Milk',              32),
  ('Tiramisu',                  'Susu UHT',               40),
  ('Tiramisu',                  'Kopi / Espresso',        16),
  ('Tiramisu',                  'Chocolate powder',        3),

  -- ── Mont Blanc ───────────────────────────────────────────────────
  ('Mont Blanc',                'Kopi / Espresso',        32),  -- double ristretto
  ('Mont Blanc',                'Cinnamon syrup',          5),  -- 2 body + 3 foam
  ('Mont Blanc',                'Sunquick Orange',         6),  -- 4 body + 2 foam
  ('Mont Blanc',                'Simple syrup',            6),
  ('Mont Blanc',                'Whipping cream',         15),
  ('Mont Blanc',                'Creamer',                10),
  ('Mont Blanc',                'Susu UHT',               10),
  ('Mont Blanc',                'Cinnamon stick',       0.14),  -- 1/7 stick garnish
  ('Mont Blanc',                'Star anise',           0.14),  -- 1 piece garnish

  -- ── Mango Matcha Latte ───────────────────────────────────────────
  ('Mango Matcha Latte',        'Evap (susu evaporasi)', 10),   -- milk based 100ml
  ('Mango Matcha Latte',        'Rich Milk',             40),
  ('Mango Matcha Latte',        'Susu UHT',              50),
  ('Mango Matcha Latte',        'Yuzu syrup',             5),
  ('Mango Matcha Latte',        'Sunquick Mango',         8),
  ('Mango Matcha Latte',        'Simple syrup',          15),
  ('Mango Matcha Latte',        'Creamer',               10),   -- matcha mix
  ('Mango Matcha Latte',        'Matcha powder',          8),

  -- ── Zen Ease ─────────────────────────────────────────────────────
  ('Zen Ease',                  'Rich Milk',             85),
  ('Zen Ease',                  'Whipping cream',        10),
  ('Zen Ease',                  'Vanilla syrup',          8),
  ('Zen Ease',                  'Pandan syrup',           7),
  ('Zen Ease',                  'Kopi / Espresso',       16),
  ('Zen Ease',                  'Creamer',               12),

  -- ── Hazel ────────────────────────────────────────────────────────
  ('Hazel',                     'Rich Milk',             65),
  ('Hazel',                     'Susu UHT',              15),
  ('Hazel',                     'Hazelnut syrup',        18),
  ('Hazel',                     'Caramel syrup',          3),
  ('Hazel',                     'Kopi / Espresso',       16),
  ('Hazel',                     'Creamer',               20),

  -- ── Caramel ──────────────────────────────────────────────────────
  ('Caramel',                   'Rich Milk',             65),
  ('Caramel',                   'Susu UHT',              15),
  ('Caramel',                   'Caramel syrup',         12),
  ('Caramel',                   'Vanilla syrup',          5),
  ('Caramel',                   'Kopi / Espresso',       16),
  ('Caramel',                   'Creamer',               20),

  -- ── Dolce ────────────────────────────────────────────────────────
  ('Dolce',                     'Rich Milk',             65),
  ('Dolce',                     'Susu UHT',              15),
  ('Dolce',                     'Condensed milk (SKM)',  15),
  ('Dolce',                     'Vanilla syrup',          5),
  ('Dolce',                     'Kopi / Espresso',       16),
  ('Dolce',                     'Creamer',               20),

  -- ── Bittersweet ──────────────────────────────────────────────────
  ('Bittersweet',               'Evap (susu evaporasi)',  8),   -- milk based 80ml
  ('Bittersweet',               'Rich Milk',             32),
  ('Bittersweet',               'Susu UHT',              40),
  ('Bittersweet',               'Aren syrup',             8),
  ('Bittersweet',               'Pandan syrup',           2),
  ('Bittersweet',               'Hazelnut syrup',         3),
  ('Bittersweet',               'Kopi / Espresso',       16),  -- single espresso

  -- ── Pandan Coffee Cloud ──────────────────────────────────────────
  ('Pandan Coffee Cloud',       'Pandan syrup',          10),
  ('Pandan Coffee Cloud',       'Butterscotch syrup',     5),
  ('Pandan Coffee Cloud',       'Caramel syrup',          8),
  ('Pandan Coffee Cloud',       'Susu UHT',              85),   -- 70 half&half + 15 foam
  ('Pandan Coffee Cloud',       'Whipping cream',        45),   -- 35 half&half + 10 foam
  ('Pandan Coffee Cloud',       'Kopi / Espresso',       16),
  ('Pandan Coffee Cloud',       'Creamer',               10),
  ('Pandan Coffee Cloud',       'Vanilla syrup',          3),

  -- ── Chocolate Latte ──────────────────────────────────────────────
  ('Chocolate Latte',           'Evap (susu evaporasi)', 10),
  ('Chocolate Latte',           'Rich Milk',             40),
  ('Chocolate Latte',           'Susu UHT',              50),
  ('Chocolate Latte',           'Vanilla syrup',          5),
  ('Chocolate Latte',           'Condensed milk (SKM)',   5),
  ('Chocolate Latte',           'Creamer',               10),   -- chocolate mix
  ('Chocolate Latte',           'Chocolate powder',      15),

  -- ── Matcha Latte ─────────────────────────────────────────────────
  ('Matcha Latte',              'Evap (susu evaporasi)', 10),
  ('Matcha Latte',              'Rich Milk',             40),
  ('Matcha Latte',              'Susu UHT',              50),
  ('Matcha Latte',              'Condensed milk (SKM)',  25),
  ('Matcha Latte',              'Creamer',               10),   -- matcha mix
  ('Matcha Latte',              'Matcha powder',          8),

  -- ── Strawberry Matcha Latte ──────────────────────────────────────
  ('Strawberry Matcha Latte',   'Evap (susu evaporasi)', 10),
  ('Strawberry Matcha Latte',   'Rich Milk',             40),
  ('Strawberry Matcha Latte',   'Susu UHT',              50),
  ('Strawberry Matcha Latte',   'Pure strawberry',       20),
  ('Strawberry Matcha Latte',   'Strawberry syrup',      12),
  ('Strawberry Matcha Latte',   'Creamer',               10),
  ('Strawberry Matcha Latte',   'Matcha powder',          8),

  -- ── Strawberry Chocolate Latte ───────────────────────────────────
  ('Strawberry Chocolate Latte','Evap (susu evaporasi)', 10),
  ('Strawberry Chocolate Latte','Rich Milk',             40),
  ('Strawberry Chocolate Latte','Susu UHT',              50),
  ('Strawberry Chocolate Latte','Pure strawberry',       16),
  ('Strawberry Chocolate Latte','Strawberry syrup',       5),
  ('Strawberry Chocolate Latte','Creamer',               10),
  ('Strawberry Chocolate Latte','Chocolate powder',      15),

  -- ── Chocolate Hazelnut ───────────────────────────────────────────
  ('Chocolate Hazelnut',        'Evap (susu evaporasi)', 10),
  ('Chocolate Hazelnut',        'Rich Milk',             40),
  ('Chocolate Hazelnut',        'Susu UHT',              50),
  ('Chocolate Hazelnut',        'Hazelnut syrup',        13),
  ('Chocolate Hazelnut',        'Creamer',               10),
  ('Chocolate Hazelnut',        'Chocolate powder',      15),

  -- ── Roseberry ────────────────────────────────────────────────────
  ('Roseberry',                 'Pure strawberry',       18),
  ('Roseberry',                 'Strawberry syrup',       8),
  ('Roseberry',                 'Rose syrup',             6),
  ('Roseberry',                 'Soda (soda water)',      70),
  ('Roseberry',                 'Simple syrup',           6),
  ('Roseberry',                 'Yuzu syrup',             5),
  ('Roseberry',                 'Kopi / Espresso',       16),  -- single espresso

  -- ── Mango Yuzu ───────────────────────────────────────────────────
  ('Mango Yuzu',                'Yuzu syrup',            30),
  ('Mango Yuzu',                'Sunquick Mango',        10),
  ('Mango Yuzu',                'Simple syrup',          12),
  ('Mango Yuzu',                'Soda (soda water)',      70),
  ('Mango Yuzu',                'Rose syrup',             3),
  ('Mango Yuzu',                'Kopi / Espresso',       16),

  -- ── Black Mint ───────────────────────────────────────────────────
  ('Black Mint',                'Mint syrup',            18),
  ('Black Mint',                'Sunquick Mango',        16),
  ('Black Mint',                'Yuzu syrup',             6),
  ('Black Mint',                'Soda (soda water)',      70),
  ('Black Mint',                'Simple syrup',           3),
  ('Black Mint',                'Rose syrup',             2),
  ('Black Mint',                'Kopi / Espresso',       16),

  -- ── Berry Buzz ───────────────────────────────────────────────────
  ('Berry Buzz',                'Yuzu syrup',             5),
  ('Berry Buzz',                'Mint syrup',             5),
  ('Berry Buzz',                'Raspberry syrup',       21),
  ('Berry Buzz',                'Pure strawberry',       10),
  ('Berry Buzz',                'Strawberry syrup',       5),
  ('Berry Buzz',                'Soda (soda water)',      70),
  ('Berry Buzz',                'Kopi / Espresso',       32),  -- double espresso

  -- ── Strawberry Black ─────────────────────────────────────────────
  ('Strawberry Black',          'Strawberry syrup',      12),
  ('Strawberry Black',          'Pure strawberry',       18),
  ('Strawberry Black',          'Mint syrup',            10),
  ('Strawberry Black',          'Rose syrup',             3),
  ('Strawberry Black',          'Soda (soda water)',      70),
  ('Strawberry Black',          'Kopi / Espresso',       16),  -- single espresso

  -- ── Yellow Mocktail ──────────────────────────────────────────────
  ('Yellow Mocktail',           'Vinegar',                2),
  ('Yellow Mocktail',           'Apple juice',           60),
  ('Yellow Mocktail',           'Simple syrup',           5),
  ('Yellow Mocktail',           'Soda (soda water)',      20),
  ('Yellow Mocktail',           'Yuzu syrup',            15),
  ('Yellow Mocktail',           'Sunquick Mango',         2),
  ('Yellow Mocktail',           'Mint syrup',             9),

  -- ── Strawberry Coldfoam Mojito ───────────────────────────────────
  ('Strawberry Coldfoam Mojito','Mint syrup',            18),
  ('Strawberry Coldfoam Mojito','Soda (soda water)',      70),
  ('Strawberry Coldfoam Mojito','Simple syrup',           8),
  ('Strawberry Coldfoam Mojito','Rose syrup',             1),
  ('Strawberry Coldfoam Mojito','Lemon juice',            6),
  ('Strawberry Coldfoam Mojito','Whipping cream',         8),
  ('Strawberry Coldfoam Mojito','Creamer',                5),
  ('Strawberry Coldfoam Mojito','Susu UHT',               5),
  ('Strawberry Coldfoam Mojito','Pure strawberry',        5),
  ('Strawberry Coldfoam Mojito','Strawberry syrup',       1),

  -- ── Roseberry Candy ──────────────────────────────────────────────
  ('Roseberry Candy',           'Pure strawberry',        5),
  ('Roseberry Candy',           'Raspberry syrup',       18),
  ('Roseberry Candy',           'Rose syrup',             6),
  ('Roseberry Candy',           'Vinegar',              1.5),
  ('Roseberry Candy',           'Apple juice',           70),
  ('Roseberry Candy',           'Soda (soda water)',      45),

  -- ── Milk Tea ─────────────────────────────────────────────────────
  -- Tea based 55ml → Teh (daun) ~1g + Water 55ml
  ('Milk Tea',                  'Condensed milk (SKM)',  15),
  ('Milk Tea',                  'Creamer',               20),
  ('Milk Tea',                  'Evap (susu evaporasi)', 15),
  ('Milk Tea',                  'Rose syrup',           0.5),
  ('Milk Tea',                  'Aren syrup',            10),
  ('Milk Tea',                  'Teh (daun)',             1),
  ('Milk Tea',                  'Water (air)',           55),
  ('Milk Tea',                  'Susu UHT',              80),

  -- ── Yuzu Tea ─────────────────────────────────────────────────────
  -- Tea based 25ml → Teh ~0.5g; Water 120ml additional
  ('Yuzu Tea',                  'Teh (daun)',           0.5),
  ('Yuzu Tea',                  'Water (air)',           145),  -- 25 brew + 120 dilution
  ('Yuzu Tea',                  'Yuzu syrup',            30),
  ('Yuzu Tea',                  'Simple syrup',          20),
  ('Yuzu Tea',                  'Sunquick Mango',         2),
  ('Yuzu Tea',                  'Rose syrup',             1),

  -- ── Lemon Tea ────────────────────────────────────────────────────
  ('Lemon Tea',                 'Lemon tea (bubuk)',      30),
  ('Lemon Tea',                 'Simple syrup',          18),
  ('Lemon Tea',                 'Teh (daun)',            0.5),
  ('Lemon Tea',                 'Water (air)',           145),  -- 25 brew + 120 dilution
  ('Lemon Tea',                 'Lemon juice',           10),

  -- ── Ice Tea ──────────────────────────────────────────────────────
  ('Ice Tea',                   'Teh (daun)',            0.5),
  ('Ice Tea',                   'Water (air)',           165),  -- 25 brew + 140 dilution
  ('Ice Tea',                   'Simple syrup',          40),
  ('Ice Tea',                   'Rose syrup',             1),

  -- ── Sparkling Berry ──────────────────────────────────────────────
  ('Sparkling Berry',           'Pure strawberry',       21),  -- 5 garnish + 16 shaker
  ('Sparkling Berry',           'Strawberry syrup',       6),
  ('Sparkling Berry',           'Soda (soda water)',      60),
  ('Sparkling Berry',           'Mint syrup',             3),
  ('Sparkling Berry',           'Rose syrup',             1)

) AS r(menu_name, ingredient_name, qty)
JOIN public.menu_items   m ON LOWER(TRIM(m.name)) = LOWER(TRIM(r.menu_name))
JOIN public.ingredients  i ON LOWER(TRIM(i.name)) = LOWER(TRIM(r.ingredient_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipe_items ri
  WHERE ri.menu_id = m.id AND ri.ingredient_id = i.id
);
