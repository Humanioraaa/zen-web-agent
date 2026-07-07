-- ============================================================================
-- Seed: Classic Coffee + Manual Brew categories, menu items, recipes
-- New ingredient: Filter beans (filter roast, 150K/200g → 750/g)
-- Idempotent.
-- ============================================================================

-- 1. Filter beans ingredient --------------------------------------------------
INSERT INTO public.ingredients (name, base_unit, package_size, package_cost, category_id)
SELECT
  'Filter beans',
  'g',
  200.0,
  150000.0,
  (SELECT id FROM public.categories WHERE name = 'Bahan Baku Bar' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredients WHERE LOWER(TRIM(name)) = 'filter beans'
);

INSERT INTO public.ingredient_price_history
  (ingredient_id, package_cost, package_size, unit_cost, source, pct_change)
SELECT i.id, i.package_cost, i.package_size, i.unit_cost, 'seed', NULL
FROM public.ingredients i
WHERE LOWER(TRIM(i.name)) = 'filter beans'
  AND NOT EXISTS (
    SELECT 1 FROM public.ingredient_price_history h WHERE h.ingredient_id = i.id
  );

-- 2. Categories (safe=58, warning=50 — same as existing) ---------------------
INSERT INTO public.menu_categories (name, sort_order, safe_threshold, warning_threshold)
SELECT v.name, v.sort_order, 58, 50
FROM (VALUES
  ('Classic Coffee', 8),
  ('Manual Brew',    9)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_categories mc
  WHERE LOWER(TRIM(mc.name)) = LOWER(TRIM(v.name))
);

-- 3. Menu items ---------------------------------------------------------------
-- HPP: Black 3360 (78%), White 6480 (64%), Vietnam 4650 (74%), Pour Over 10500 (58%)
INSERT INTO public.menu_items (name, category_id, selling_price)
SELECT v.name, mc.id, v.price
FROM (VALUES
  ('Black Coffee', 'Classic Coffee', 15000),
  ('White Coffee', 'Classic Coffee', 18000),
  ('Vietnam Drip', 'Manual Brew',    18000),
  ('Pour Over',    'Manual Brew',    25000)
) AS v(name, cat_name, price)
JOIN public.menu_categories mc ON LOWER(TRIM(mc.name)) = LOWER(TRIM(v.cat_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m WHERE LOWER(TRIM(m.name)) = LOWER(TRIM(v.name))
);

-- 4. Recipe items -------------------------------------------------------------
-- Black Coffee : 16g blend + 70ml air (gratis)                HPP 3,360
-- White Coffee : 16g blend + 130ml Rich Milk                  HPP 6,480
-- Vietnam Drip : 15g blend + 25ml SKM (1:10)                  HPP 4,650
-- Pour Over    : 14g filter beans (1:17, ice dose)            HPP 10,500
INSERT INTO public.recipe_items (menu_id, ingredient_id, quantity)
SELECT m.id, i.id, r.qty
FROM (VALUES
  ('Black Coffee', 'Kopi / Espresso',       16),
  ('Black Coffee', 'Water (air)',            70),

  ('White Coffee', 'Kopi / Espresso',       16),
  ('White Coffee', 'Rich Milk',            130),

  ('Vietnam Drip', 'Kopi / Espresso',       15),
  ('Vietnam Drip', 'Condensed milk (SKM)',   25),

  ('Pour Over',    'Filter beans',          14)
) AS r(menu_name, ingredient_name, qty)
JOIN public.menu_items  m ON LOWER(TRIM(m.name)) = LOWER(TRIM(r.menu_name))
JOIN public.ingredients i ON LOWER(TRIM(i.name)) = LOWER(TRIM(r.ingredient_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipe_items ri
  WHERE ri.menu_id = m.id AND ri.ingredient_id = i.id
);
