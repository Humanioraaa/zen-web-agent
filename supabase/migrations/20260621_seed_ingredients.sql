-- ============================================================================
-- Seed: 35 bahan baku from ZEN Recipe Book
-- Idempotent: skips names that already exist (case-insensitive), then
-- backfills price_history and category_id for any uncategorised rows.
-- ============================================================================

-- 1. Insert missing ingredients -----------------------------------------------
-- unit_cost is a GENERATED ALWAYS column — omit from INSERT, DB computes it.
INSERT INTO public.ingredients (name, base_unit, package_size, package_cost, category_id)
SELECT
  v.name,
  v.base_unit,
  v.package_size,
  v.package_cost,
  (SELECT id FROM public.categories WHERE name = 'Bahan Baku Bar' LIMIT 1)
FROM (VALUES
  -- dairy & cream
  ('Susu UHT',             'ml',  1000.0,  21000.0),
  ('Rich Milk',            'ml',  1000.0,  24000.0),
  ('Evap (susu evaporasi)','ml',   390.0,  15000.0),
  ('Whipping cream',       'ml',  1000.0,  65000.0),
  ('Condensed milk (SKM)', 'ml',  1000.0,  60000.0),
  -- powder
  ('Creamer',              'g',   1000.0,  55000.0),
  ('Kopi / Espresso',      'g',   1000.0, 210000.0),
  ('Chocolate powder',     'g',   1000.0, 165000.0),
  ('Matcha powder',        'g',    500.0, 230000.0),
  ('Lemon tea (bubuk)',    'g',    900.0,  30000.0),  -- 30 sachet × 30g
  ('Teh (daun)',           'g',    720.0,  40000.0),  -- 12 bag × 60g
  -- syrups 1L / 700ml
  ('Hazelnut syrup',       'ml',  1000.0, 111000.0),
  ('Vanilla syrup',        'ml',  1000.0, 111000.0),
  ('Caramel syrup',        'ml',  1000.0, 111000.0),
  ('Caramel sauce',        'ml',   300.0,  30000.0),
  ('Cinnamon syrup',       'ml',   700.0, 150000.0),
  ('Simple syrup',         'ml',  1000.0,  25000.0),
  ('Pandan syrup',         'ml',   760.0, 111000.0),
  ('Aren syrup',           'ml',  1000.0,  60000.0),
  ('Butterscotch syrup',   'ml',  1000.0, 111000.0),
  ('Yuzu syrup',           'ml',   840.0, 111000.0),
  ('Rose syrup',           'ml',  1000.0, 111000.0),
  ('Mint syrup',           'ml',  1000.0, 111000.0),
  ('Raspberry syrup',      'ml',  1000.0, 111000.0),
  ('Strawberry syrup',     'ml',   400.0,  32000.0),
  -- fresh / produce / juice
  ('Sunquick Orange',      'ml',   300.0,  40000.0),
  ('Sunquick Mango',       'ml',   300.0,  40000.0),
  ('Pure strawberry',      'ml',  1000.0, 120000.0),
  ('Apple juice',          'ml',  1000.0,  32000.0),
  ('Lemon juice',          'ml',   500.0,  30000.0),  -- 1kg lemon ≈ 500ml juice
  ('Soda (soda water)',    'ml',  3000.0, 128000.0),  -- 12 botol × 250ml
  ('Vinegar',              'ml',   470.0,  65000.0),
  -- misc / free
  ('Water (air)',          'ml',  1000.0,      0.0),
  -- garnish
  ('Cinnamon stick',       'pcs',    5.0,  15000.0),
  ('Star anise',           'pcs',    5.0,   2000.0)
) AS v(name, base_unit, package_size, package_cost)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredients i
  WHERE LOWER(TRIM(i.name)) = LOWER(TRIM(v.name))
);

-- 2. Stamp category_id on any uncategorised ingredient (including pre-existing ones) --
UPDATE public.ingredients
SET category_id = (SELECT id FROM public.categories WHERE name = 'Bahan Baku Bar' LIMIT 1)
WHERE category_id IS NULL;

-- 3. Backfill price_history seed entries (idempotent) -------------------------
INSERT INTO public.ingredient_price_history
  (ingredient_id, package_cost, package_size, unit_cost, source, pct_change)
SELECT
  i.id,
  i.package_cost,
  i.package_size,
  i.unit_cost,
  'seed',
  NULL
FROM public.ingredients i
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredient_price_history h WHERE h.ingredient_id = i.id
);
