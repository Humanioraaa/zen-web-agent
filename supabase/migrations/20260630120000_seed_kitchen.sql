-- ============================================================================
-- Seed: Kitchen ingredients, Snacks + Main Dish menu categories,
--       11 food menu items, and all recipe_items.
-- Idempotent — safe to re-run.
-- ============================================================================

-- 0. Bahan Baku Kitchen expense category ------------------------------------
INSERT INTO public.categories (name, type)
SELECT 'Bahan Baku Kitchen', 'expense'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE LOWER(TRIM(name)) = 'bahan baku kitchen'
);

-- 1. Kitchen ingredients (54 items) -----------------------------------------
-- Sources: zen-kitchen-restock.md (Tabel A + A-lanjutan + B update 28-30 Jun).
-- unit_cost is a generated column (package_cost / package_size) — not inserted.
INSERT INTO public.ingredients (name, base_unit, package_size, package_cost, category_id)
SELECT v.name, v.unit, v.pkg_size, v.pkg_cost,
  (SELECT id FROM public.categories WHERE LOWER(TRIM(name)) = 'bahan baku kitchen' LIMIT 1)
FROM (VALUES
  -- Produce / Protein
  ('Kentang',                'g',   2500.0,  68000.0),
  ('Sawi',                   'g',    300.0,   1800.0),
  ('Beras',                  'g',   2500.0,  36000.0),
  ('Telur',                  'pcs',    8.0,  12500.0),
  ('Chicken wings',          'g',    500.0,  15000.0),
  -- Frozen / Protein
  ('Sosis',                  'g',    500.0,  26500.0),
  ('Nugget',                 'g',    500.0,  18500.0),
  ('Baso',                   'g',    640.0,  19000.0),
  ('Karage',                 'g',    500.0,  40000.0),
  -- Sauces
  ('Mayo',                   'g',   1000.0,  25000.0),
  ('Saos pedas',             'g',   1000.0,  13000.0),
  ('Korean spicy',           'g',    250.0,  16000.0),
  ('Teriyaki',               'g',    310.0,  12000.0),
  ('Kecap',                  'g',    250.0,   5000.0),
  ('Kecap asin',             'g',    140.0,   5500.0),
  ('Kecap inggris',          'ml',   142.0,  66000.0),
  ('Saos keju',              'g',    500.0,  22000.0),
  ('Madu',                   'g',    560.0,  80000.0),
  ('Cuka apel',              'ml',   473.0,  64000.0),
  -- Seasoning / Spices
  ('Garam',                  'g',    250.0,   2500.0),
  ('Masako',                 'g',      8.5,    500.0),
  ('Merica bubuk',           'g',    100.0,  12000.0),
  ('Cabe bubuk',             'g',     15.0,   1500.0),
  ('Kunyit bubuk',           'g',     20.0,   1000.0),
  ('Ketumbar bubuk',         'g',     12.5,   1000.0),
  ('Bawang putih bubuk',     'g',     50.0,  15000.0),
  ('Sasa micin',             'g',     85.0,   5000.0),
  ('Wijen',                  'g',    200.0,  12000.0),
  ('Cajun',                  'g',     30.0,  11000.0),
  ('Paprika bubuk',          'g',     40.0,  11000.0),
  -- Dry goods / Carbs
  ('Indomie',                'g',    240.0,   3300.0),
  ('Makaroni',               'g',   1000.0,  18000.0),
  ('Minyak',                 'ml',   800.0,  18500.0),
  -- Starch / Flour
  ('Terigu tulip',           'g',   1000.0,   9000.0),
  ('Maizenaku',              'g',    150.0,   5500.0),
  ('Tepung beras',           'g',    200.0,   4000.0),
  ('Sasa tepung pisang',     'g',    210.0,   7000.0),
  -- Wrap
  ('Kulit samosa',           'pcs',   60.0,  26000.0),
  -- Bumbu masak
  ('Indofood kare',          'g',    270.0,   6000.0),
  ('Desaku bumbu kari',      'g',     25.0,   3500.0),
  ('Chili sachet',           'g',    200.0,   6000.0),
  -- Baking
  ('Gula pasir',             'g',   1000.0,  17500.0),
  ('Soda kue',               'g',    100.0,   5000.0),
  ('Baking powder',          'g',    100.0,   5000.0),
  ('Vanili',                 'g',     55.0,   6000.0),
  ('Vanilla essence',        'ml',    60.0,   6600.0),
  ('Margarin simas',         'g',    500.0,  13500.0),
  ('Margarin royal palmia',  'g',    250.0,  10000.0),
  ('Galetto dark chocolate', 'g',    250.0,  14000.0),
  ('Cocoa powder',           'g',   1000.0, 165000.0),
  -- Dairy / Dessert
  ('Cream cheese',           'g',    200.0,  22000.0),
  ('Keju oles',              'g',    160.0,  13000.0),
  ('NZMP susu bubuk',        'g',    250.0,  28500.0),
  -- Topping
  ('Kacang kenari',          'g',   1000.0, 114000.0)
) AS v(name, unit, pkg_size, pkg_cost)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredients WHERE LOWER(TRIM(name)) = LOWER(TRIM(v.name))
);

-- Price history for all kitchen ingredients that have none yet --------------
INSERT INTO public.ingredient_price_history
  (ingredient_id, package_cost, package_size, unit_cost, source, pct_change)
SELECT i.id, i.package_cost, i.package_size, i.unit_cost, 'seed', NULL
FROM public.ingredients i
WHERE i.category_id = (
    SELECT id FROM public.categories WHERE LOWER(TRIM(name)) = 'bahan baku kitchen' LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.ingredient_price_history h WHERE h.ingredient_id = i.id
  );

-- 2. Food menu categories ---------------------------------------------------
INSERT INTO public.menu_categories (name, sort_order, safe_threshold, warning_threshold)
SELECT v.name, v.sort_order, 58, 50
FROM (VALUES
  ('Snacks',    10),
  ('Main Dish', 11)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_categories mc
  WHERE LOWER(TRIM(mc.name)) = LOWER(TRIM(v.name))
);

-- 3. Food menu items --------------------------------------------------------
INSERT INTO public.menu_items (name, category_id, selling_price)
SELECT v.name, mc.id, v.price
FROM (VALUES
  ('Cookies',          'Snacks',     5000),
  ('Fudgy Brownies',   'Snacks',     8000),
  ('French Fries',     'Snacks',    15000),
  ('Cheesecake',       'Snacks',    16000),
  ('Samosa',           'Snacks',    18000),
  ('Noodles',          'Main Dish', 18000),
  ('Fried Rice',       'Main Dish', 18000),
  ('Spicy Karaage',    'Main Dish', 22000),
  ('Teriyaki Karaage', 'Main Dish', 22000),
  ('Chicken Wings',    'Main Dish', 25000),
  ('Mix Platter',      'Main Dish', 25000)
) AS v(name, cat_name, price)
JOIN public.menu_categories mc ON LOWER(TRIM(mc.name)) = LOWER(TRIM(v.cat_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m WHERE LOWER(TRIM(m.name)) = LOWER(TRIM(v.name))
);

-- 4. Recipe items -----------------------------------------------------------
-- Quantities per unit sold (desserts = batch ÷ yield).
-- Whipping cream (Cheesecake) is in bar ingredients — join silently skips if absent.
INSERT INTO public.recipe_items (menu_id, ingredient_id, quantity)
SELECT m.id, i.id, r.qty
FROM (VALUES
  -- Cookies (batch ÷ 10 pcs)
  ('Cookies',          'Margarin simas',         7.5),
  ('Cookies',          'Margarin royal palmia',   2.5),
  ('Cookies',          'Gula pasir',              8.0),
  ('Cookies',          'Vanilla essence',         0.5),
  ('Cookies',          'Telur',                   0.1),
  ('Cookies',          'Baking powder',           0.2),
  ('Cookies',          'Kecap',                   0.75),
  ('Cookies',          'Soda kue',                0.2),
  ('Cookies',          'Terigu tulip',           18.0),
  ('Cookies',          'Galetto dark chocolate', 10.0),

  -- Fudgy Brownies (batch ÷ 8 pcs)
  ('Fudgy Brownies',   'Margarin simas',         12.5),
  ('Fudgy Brownies',   'Galetto dark chocolate', 25.0),
  ('Fudgy Brownies',   'Gula pasir',             25.0),
  ('Fudgy Brownies',   'Telur',                   0.375),
  ('Fudgy Brownies',   'Terigu tulip',           12.5),
  ('Fudgy Brownies',   'Vanili',                  0.125),
  ('Fudgy Brownies',   'Baking powder',           0.375),
  ('Fudgy Brownies',   'Cocoa powder',            2.5),

  -- Cheesecake (batch ÷ 7 pcs)
  ('Cheesecake',       'Cream cheese',           28.0),
  ('Cheesecake',       'Keju oles',              11.0),
  ('Cheesecake',       'Gula pasir',             14.0),
  ('Cheesecake',       'Telur',                   0.43),
  ('Cheesecake',       'Maizenaku',               3.0),
  ('Cheesecake',       'Vanili',                  0.3),
  ('Cheesecake',       'NZMP susu bubuk',         4.0),
  ('Cheesecake',       'Whipping cream',         14.0),

  -- French Fries (per serving)
  ('French Fries',     'Kentang',               200.0),
  ('French Fries',     'Garam',                   5.0),
  ('French Fries',     'Minyak',                 15.0),
  ('French Fries',     'Mayo',                   10.0),
  ('French Fries',     'Saos pedas',             10.0),

  -- Samosa (per pcs / 5 kulit)
  ('Samosa',           'Kulit samosa',            5.0),
  ('Samosa',           'Kentang',               150.0),
  ('Samosa',           'Terigu tulip',           10.0),
  ('Samosa',           'Desaku bumbu kari',       3.0),
  ('Samosa',           'Indofood kare',          10.0),
  ('Samosa',           'Masako',                  2.0),
  ('Samosa',           'Kunyit bubuk',            2.0),
  ('Samosa',           'Merica bubuk',            1.0),
  ('Samosa',           'Garam',                   3.0),
  ('Samosa',           'Minyak',                 15.0),
  ('Samosa',           'Sawi',                   30.0),

  -- Noodles (per porsi)
  ('Noodles',          'Indomie',                85.0),
  ('Noodles',          'Telur',                   1.0),
  ('Noodles',          'Sawi',                   60.0),
  ('Noodles',          'Sosis',                  50.0),
  ('Noodles',          'Minyak',                 10.0),
  ('Noodles',          'Kecap',                  10.0),
  ('Noodles',          'Saos pedas',             20.0),
  ('Noodles',          'Garam',                   5.0),
  ('Noodles',          'Masako',                  3.0),
  ('Noodles',          'Chili sachet',            5.0),

  -- Fried Rice (per porsi)
  ('Fried Rice',       'Beras',                 150.0),
  ('Fried Rice',       'Telur',                   1.0),
  ('Fried Rice',       'Sosis',                  50.0),
  ('Fried Rice',       'Minyak',                 15.0),
  ('Fried Rice',       'Kecap',                  15.0),
  ('Fried Rice',       'Kecap asin',             10.0),
  ('Fried Rice',       'Saos pedas',             15.0),
  ('Fried Rice',       'Garam',                   5.0),
  ('Fried Rice',       'Masako',                  3.0),
  ('Fried Rice',       'Cabe bubuk',              1.5),

  -- Teriyaki Karaage (per porsi)
  ('Teriyaki Karaage', 'Karage',                 70.0),
  ('Teriyaki Karaage', 'Teriyaki',               70.0),
  ('Teriyaki Karaage', 'Terigu tulip',           20.0),
  ('Teriyaki Karaage', 'Maizenaku',              10.0),
  ('Teriyaki Karaage', 'Minyak',                 20.0),
  ('Teriyaki Karaage', 'Wijen',                   3.0),
  ('Teriyaki Karaage', 'Garam',                   5.0),
  ('Teriyaki Karaage', 'Kentang',               100.0),

  -- Spicy Karaage (per porsi)
  ('Spicy Karaage',    'Karage',                 70.0),
  ('Spicy Karaage',    'Korean spicy',            67.0),
  ('Spicy Karaage',    'Terigu tulip',           20.0),
  ('Spicy Karaage',    'Maizenaku',              10.0),
  ('Spicy Karaage',    'Minyak',                 20.0),
  ('Spicy Karaage',    'Wijen',                   3.0),
  ('Spicy Karaage',    'Garam',                   5.0),
  ('Spicy Karaage',    'Kentang',               100.0),

  -- Mix Platter (per porsi)
  ('Mix Platter',      'Kentang',               100.0),
  ('Mix Platter',      'Nugget',                 50.0),
  ('Mix Platter',      'Sosis',                  50.0),
  ('Mix Platter',      'Karage',                 35.0),
  ('Mix Platter',      'Mayo',                   30.0),
  ('Mix Platter',      'Saos pedas',             20.0),
  ('Mix Platter',      'Terigu tulip',           15.0),
  ('Mix Platter',      'Maizenaku',               5.0),
  ('Mix Platter',      'Minyak',                 10.0),

  -- Chicken Wings Honey Butter (per 200g / 4 pcs serving — pricier variant)
  ('Chicken Wings',    'Chicken wings',          200.0),
  ('Chicken Wings',    'Kentang',               100.0),
  ('Chicken Wings',    'Terigu tulip',           15.0),
  ('Chicken Wings',    'Maizenaku',              10.0),
  ('Chicken Wings',    'Minyak',                 20.0),
  ('Chicken Wings',    'Garam',                   5.0),
  ('Chicken Wings',    'Margarin royal palmia',  20.0),
  ('Chicken Wings',    'Madu',                   20.0),
  ('Chicken Wings',    'Bawang putih bubuk',      1.0)
) AS r(menu_name, ingredient_name, qty)
JOIN public.menu_items  m ON LOWER(TRIM(m.name)) = LOWER(TRIM(r.menu_name))
JOIN public.ingredients i ON LOWER(TRIM(i.name)) = LOWER(TRIM(r.ingredient_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipe_items ri
  WHERE ri.menu_id = m.id AND ri.ingredient_id = i.id
);
