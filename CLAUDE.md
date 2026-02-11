# Grosly Web

Recipe-to-grocery-list app with AI recipe generation and suggestion.

## Tech Stack

- **Next.js 16** (app router) + **React 19** + **TypeScript** + **Tailwind v4** + **shadcn/ui** (Radix Nova)
- **next-intl** for i18n (uk/en, default: uk)
- **pnpm** package manager
- Dev: port **4000**, Backend API: port **3000** (`http://localhost:3000`)

## Project Structure

```
app/[locale]/           — pages: layout.tsx, page.tsx (home), generate/, suggest/,
                          shopping-list/ (index + /new), categories/, preferences/, login/
app/globals.css         — Tailwind theme, colors, dark mode, custom CSS classes

components/
  nav-bar.tsx           — Sheet sidebar navigation (hamburger menu, all screen sizes)
  shared/               — page-header.tsx, empty-state.tsx
  recipes/              — recipe-parser, recipe-generator, recipe-suggester, recipe-card
  shopping-list/        — shopping-list-card (checklist+DnD), shopping-list-index, shopping-list-new,
                          sortable-item, inline-edit-form, add-item-form, category-group, types.ts
  categories/           — categories-manager
  preferences/          — user-preferences
  auth/                 — login-form
  ui/                   — shadcn components

lib/
  api/                  — client.ts (request helper), auth, recipes, shopping-lists, categories,
                          preferences + index.ts barrel → import from "@/lib/api"
  types/                — domain types + index.ts barrel → import from "@/lib/types"
  auth/                 — context.tsx (AuthProvider+useAuth), storage.ts, google.ts
                          + index.ts barrel → import from "@/lib/auth"
  constants.ts          — NONE_CATEGORY
  utils.ts              — cn()

hooks/                  — use-category-localization.ts
i18n/                   — routing.ts, request.ts, navigation.ts (localized Link, useRouter, usePathname)
messages/               — uk.json, en.json
proxy.ts                — next-intl middleware (NOT middleware.ts — Next.js 16 convention)
```

## Commands

```bash
pnpm dev          # dev server on port 4000
pnpm build        # production build
pnpm lint         # eslint
npx tsc --noEmit  # type check
```

## Mobile-First Priority

- **Mobile is the primary target** — all features must look and work flawlessly on mobile screens first, then scale up to desktop
- Always test layouts on small viewports (~375px width) before considering wider screens
- Use `flex-wrap`, responsive breakpoints (`sm:`, `md:`), and proper `flex-basis` values to ensure content doesn't overflow or collapse on mobile
- Avoid fixed widths that would cause horizontal overflow on mobile — prefer `min-w` + `flex` patterns

## Key Patterns

- **Client components**: all page components are `"use client"` with `useTranslations("Namespace")`
- **Translation namespaces**: Nav, Auth, Metadata, RecipeParser, RecipeGenerator, RecipeSuggester, ShoppingList, Preferences, Categories
- **Ukrainian plurals**: ICU `{count, plural, one{} few{} many{} other{}}` syntax
- **Auth**: Google Sign-In → JWT (access+refresh) in localStorage. `useAuth()` from `@/lib/auth`. Auto-refresh on 401
- **API calls**: through `@/lib/api` barrel. `request()` helper adds auth headers. Error `message` can be string OR array
- **New pages**: under `app/[locale]/` with `setRequestLocale(locale)` call
- **New components**: feature folder under `components/` (recipes/, shopping-list/, etc.)
- **AI endpoints**: pass `language` param via `useLocale()` from next-intl
- **Category localization**: `useCategoryLocalization()` hook from `@/hooks/use-category-localization`
- **Reference data localization**: `useMessages()` for slug→name lookup. Maps: `Preferences.allergyNames`, `Preferences.restrictionNames`, `Categories.categoryNames`
- **Combobox chips**: `ComboboxChip` has NO `value` prop — index-based tracking
- **Styling**: `cn()` from `@/lib/utils`. Colors via CSS variables. Use shadcn `Select` instead of native `<select>`

## Design System

- **Primary**: vibrant green (oklch hue 145), **Accent**: warm peach (oklch hue 55)
- **Page headers**: `<PageHeader title subtitle />` from `@/components/shared/page-header`
- **Empty states**: `<EmptyState icon message />` from `@/components/shared/empty-state`
- **Cards**: border + shadow-sm, hover:shadow-md + hover:border-primary/20
- **Buttons**: gradient from-primary, shadow, active:scale-[0.98]
- **`.gradient-text`**: animated gradient text — defined outside `@layer` in globals.css

## Backend API

Base: `http://localhost:3000`. See `lib/api/` and `lib/types/` for full request/response shapes.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /recipes/parse | Parse recipe text → ingredients |
| POST | /recipes/generate | Query → AI-generated recipes |
| POST | /recipes/suggest | Ingredients → AI-suggested recipes |
| POST | /shopping-list | Create shopping list |
| PATCH | /shopping-list/:id | Update list (name, items, groupedByCategories) |
| DELETE | /shopping-list/:id | Delete list (204) |
| POST | /shopping-list/:listId/items | Add items to list |
| PATCH | /shopping-list/:listId/items/:itemId | Update single item |
| DELETE | /shopping-list/:listId/items/:itemId | Delete single item (204) |
| GET | /categories | All categories (system+custom) |
| POST/PATCH/DELETE | /categories/:id | CRUD custom categories |
| GET | /allergies | All allergies |
| GET | /dietary-restrictions | All dietary restrictions |
| GET | /users/me/preferences | User preferences |
| PATCH | /users/me/preferences | Update preferences (arrays are full-replace) |

## Gotchas

- Next.js 16 uses `proxy.ts` not `middleware.ts`
- `params` is async — always `await params`
- After restructuring `app/`, delete `.next/` to clear stale type cache
- `toLocaleString()` causes hydration mismatch — avoid
- `NextIntlClientProvider` does NOT need explicit `messages` prop
- API error `message` can be string OR array — check with `Array.isArray()`
- `request()` handles 204 No Content (returns `undefined`) for DELETE
- **Tailwind v4**: `@layer utilities {}` does NOT work for custom classes — define outside `@layer`
- Use shadcn `Select` not native `<select>` (misaligned indicators)
