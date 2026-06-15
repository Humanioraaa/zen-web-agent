-- Sprint 13 Part A: link ingredients to an expense category.
-- Nullable in DB (existing rows stay null); "required on create" enforced at the app/Zod layer.
-- Restock expenses inherit this category server-side (restock-service.commitCore).
alter table public.ingredients add column if not exists category_id uuid references public.categories(id) on delete set null;
create index if not exists idx_ingredients_category_id on public.ingredients(category_id);
