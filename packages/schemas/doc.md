# Database Schema

This document describes the full PostgreSQL schema defined in `packages/schemas/src/`.

## Entity Relationship Diagram

```
                                    ┌──────────────────┐
                                    │      users       │
                                    └──────┬───────────┘
          ┌───────────┬───────────┬────────┼────────┬────────────┬──────────────┐
          │           │           │        │        │            │              │
          ▼           ▼           ▼        ▼        ▼            ▼              ▼
    ┌──────────┐ ┌─────────┐ ┌────────┐ ┌─────┐ ┌────────────┐ ┌───────────┐ ┌───────────────┐
    │ sessions │ │cocktails│ │  bars  │ │votes│ │ favorites  │ │collections│ │party_sessions │
    └──────────┘ └────┬────┘ └───┬────┘ └─────┘ └────────────┘ └─────┬─────┘ └──────┬────────┘
                      │          │                                   │              │
     ┌────────┬───────┼──────┐   │                                   │         ┌────┴────────┐
     │        │       │      │   │                                   │         │             │
     ▼        ▼       ▼      ▼   ▼                                   ▼         ▼             ▼
┌─────────┐┌─────┐┌──────┐┌──────────────┐             ┌──────────────────┐┌────────────┐┌──────────────┐
│ photos  ││steps││styles││  ingredients │             │collection_       ││participants││  cocktail_   │
│         ││     ││junct.││              │             │cocktails         ││            ││  selections  │
└─────────┘└─────┘└──────┘└──────┬───────┘             └──────────────────┘└─────┬──────┘└──────────────┘
                                 │                                               │
                          ┌──────┴────┐                                          ▼
                          │           │                                 ┌───────────────────┐
                          ▼           ▼                                 │participant_styles │
                   ┌────────────┐┌────────────┐                         └───────────────────┘
                   │ingredients ││alcohol_type│
                   └────────────┘└────────────┘


 ── CORE ──────────────────────────────────────────

   users ──1:N──▶ sessions

 ── COCKTAILS ─────────────────────────────────────

   users ──1:N──▶ cocktails
   glasses ──1:N──▶ cocktails
   bars ──1:N──▶ cocktails
   cocktails ──1:N──▶ cocktail_ingredients ◀──N:1── ingredients
   cocktails ──1:N──▶ cocktail_photos
   cocktails ──1:N──▶ preparation_steps
   cocktails ──1:N──▶ cocktail_styles_junction ◀──N:1── cocktail_styles
   cocktails ──1:N──▶ cocktail_votes ◀──N:1── users

 ── INGREDIENTS ───────────────────────────────────

   alcohol_types ──1:N──▶ ingredients

 ── BARS ──────────────────────────────────────────

   users ──1:N──▶ bars
   bars ──1:N──▶ bar_photos
   bars ──1:N──▶ bar_signature_cocktails ◀──N:1── cocktails
   bars ──1:N──▶ bar_likes ◀──N:1── users
   bars ──1:N──▶ bar_reviews ◀──N:1── users

 ── USER FEATURES ─────────────────────────────────

   users ──1:N──▶ user_favorites ◀──N:1── cocktails
   users ──1:N──▶ collections ──1:N──▶ collection_cocktails ◀──N:1── cocktails

 ── ANALYTICS ─────────────────────────────────────

   cocktails ──1:N──▶ cocktail_views ◀──N:1── users
   cocktails ──1:N──▶ cocktail_of_month

 ── PARTY MODE ────────────────────────────────────

   users ──1:N──▶ party_sessions
   party_sessions ──1:N──▶ party_participants ◀──N:1── users
   party_participants ──1:N──▶ party_participant_styles ◀──N:1── cocktail_styles
   party_sessions ──1:N──▶ party_cocktail_selections ◀──N:1── cocktails
```

---

## Enums

| Enum | Values |
|------|--------|
| `user_roles` | `admin`, `user` |
| `cocktail_status` | `draft`, `pending`, `approved`, `rejected` |
| `vote_type` | `upvote`, `downvote` |
| `bar_style` | `classic`, `speakeasy`, `tiki`, `rooftop`, `dive`, `wine_bar`, `cocktail_lounge`, `sports_bar`, `brewpub`, `other` |
| `party_mode` | `voting`, `host_picks`, `random` |
| `ingredient_category` | `spirit`, `liqueur`, `wine`, `beer`, `mixer`, `juice`, `syrup`, `bitter`, `garnish`, `dairy`, `other` |

## Shared Columns

**`timestamps`** — included via `...timestamps`:

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `created_at` | `timestamp` | NOT NULL | `now()` |
| `updated_at` | `timestamp` | NOT NULL | `now()` (auto-updated) |

**`deletedAt`** — soft delete support:

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `deleted_at` | `timestamp` | YES | — |

---

## Core

### `users`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `username` | `text` | NOT NULL | — | UNIQUE |
| `email` | `text` | NOT NULL | — | UNIQUE |
| `password` | `text` | NOT NULL | — | |
| `role` | `user_roles` | NOT NULL | `'user'` | |
| `profile_pic` | `text` | YES | — | |
| `is_bar_owner` | `boolean` | NOT NULL | `false` | |
| + `timestamps` | | | | |
| `deleted_at` | `timestamp` | YES | — | Soft delete |

### `sessions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| `expires_at` | `timestamp` | NOT NULL | — | |
| `created_at` | `timestamp` | NOT NULL | `now()` | |

---

## Reference Tables

### `alcohol_types`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `text` | NOT NULL | — | UNIQUE |
| `description` | `text` | YES | — | |
| `abv_range_min` | `text` | YES | — | |
| `abv_range_max` | `text` | YES | — | |
| + `timestamps` | | | | |

### `glasses`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `text` | NOT NULL | — | UNIQUE |
| `description` | `text` | YES | — | |
| `capacity` | `integer` | YES | — | |
| `image_url` | `text` | YES | — | |
| + `timestamps` | | | | |

### `cocktail_styles`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `text` | NOT NULL | — | UNIQUE |
| `description` | `text` | YES | — | |
| + `timestamps` | | | | |

---

## Cocktails

### `cocktails`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `text` | NOT NULL | — | UNIQUE |
| `slug` | `text` | NOT NULL | — | UNIQUE |
| `description` | `text` | YES | — | |
| `intensity` | `integer` | YES | — | |
| `difficulty` | `integer` | YES | — | |
| `prep_time` | `integer` | YES | — | |
| `glass_id` | `uuid` | YES | — | FK &rarr; `glasses.id` (SET NULL) |
| `status` | `cocktail_status` | NOT NULL | `'draft'` | |
| `created_by_id` | `uuid` | YES | — | FK &rarr; `users.id` (SET NULL) |
| `variant_of_id` | `uuid` | YES | — | Self-referencing (no FK constraint) |
| `bar_id` | `uuid` | YES | — | FK &rarr; `bars.id` (SET NULL) |
| + `timestamps` | | | | |
| `deleted_at` | `timestamp` | YES | — | Soft delete |

### `cocktail_ingredients`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `ingredient_id` | `uuid` | NOT NULL | — | FK &rarr; `ingredients.id` (CASCADE) |
| `quantity` | `text` | YES | — | |
| `unit` | `text` | YES | — | |
| `notes` | `text` | YES | — | |
| + `timestamps` | | | | |

### `cocktail_photos`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `url` | `text` | NOT NULL | — | |
| `alt_text` | `text` | YES | — | |
| `is_primary` | `boolean` | NOT NULL | `false` | |
| + `timestamps` | | | | |

### `preparation_steps`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `step_number` | `integer` | NOT NULL | — | |
| `instruction` | `text` | NOT NULL | — | |
| `image_url` | `text` | YES | — | |
| + `timestamps` | | | | |

### `cocktail_styles_junction`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `style_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktail_styles.id` (CASCADE) |
| + `timestamps` | | | | |

### `cocktail_votes`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `user_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| `vote_type` | `vote_type` | NOT NULL | — | |
| + `timestamps` | | | | |

---

## Ingredients

### `ingredients`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `text` | NOT NULL | — | UNIQUE |
| `description` | `text` | YES | — | |
| `category` | `ingredient_category` | NOT NULL | — | |
| `is_alcoholic` | `boolean` | NOT NULL | `false` | |
| `alcohol_type_id` | `uuid` | YES | — | FK &rarr; `alcohol_types.id` (SET NULL) |
| `image_url` | `text` | YES | — | |
| + `timestamps` | | | | |
| `deleted_at` | `timestamp` | YES | — | Soft delete |

---

## Bars

### `bars`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `owner_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| `name` | `text` | NOT NULL | — | |
| `slug` | `text` | NOT NULL | — | UNIQUE |
| `description` | `text` | YES | — | |
| `address` | `text` | YES | — | |
| `city` | `text` | YES | — | |
| `postal_code` | `text` | YES | — | |
| `country` | `text` | YES | — | |
| `latitude` | `double precision` | YES | — | |
| `longitude` | `double precision` | YES | — | |
| `phone` | `text` | YES | — | |
| `website` | `text` | YES | — | |
| `style` | `bar_style` | YES | — | |
| + `timestamps` | | | | |
| `deleted_at` | `timestamp` | YES | — | Soft delete |

### `bar_photos`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `bar_id` | `uuid` | NOT NULL | — | FK &rarr; `bars.id` (CASCADE) |
| `url` | `text` | NOT NULL | — | |
| `alt_text` | `text` | YES | — | |
| `is_primary` | `boolean` | NOT NULL | `false` | |
| + `timestamps` | | | | |

### `bar_signature_cocktails`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `bar_id` | `uuid` | NOT NULL | — | FK &rarr; `bars.id` (CASCADE) |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `price` | `numeric(10,2)` | YES | — | |
| `currency` | `text` | YES | `'EUR'` | |
| `is_available` | `boolean` | NOT NULL | `true` | |
| + `timestamps` | | | | |

### `bar_likes`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `bar_id` | `uuid` | NOT NULL | — | FK &rarr; `bars.id` (CASCADE) |
| `user_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| + `timestamps` | | | | |

### `bar_reviews`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `bar_id` | `uuid` | NOT NULL | — | FK &rarr; `bars.id` (CASCADE) |
| `user_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| `rating` | `integer` | NOT NULL | — | |
| `comment` | `text` | YES | — | |
| + `timestamps` | | | | |
| `deleted_at` | `timestamp` | YES | — | Soft delete |

---

## User Features

### `user_favorites`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| + `timestamps` | | | | |

### `collections`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| `name` | `text` | NOT NULL | — | |
| `description` | `text` | YES | — | |
| `is_public` | `boolean` | NOT NULL | `false` | |
| + `timestamps` | | | | |
| `deleted_at` | `timestamp` | YES | — | Soft delete |

### `collection_cocktails`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `collection_id` | `uuid` | NOT NULL | — | FK &rarr; `collections.id` (CASCADE) |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| + `timestamps` | | | | |

---

## Analytics

### `cocktail_views`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `user_id` | `uuid` | YES | — | FK &rarr; `users.id` (SET NULL) |
| `ip_address` | `text` | YES | — | |
| `user_agent` | `text` | YES | — | |
| `hour_of_day` | `integer` | YES | — | |
| `day_of_week` | `integer` | YES | — | |
| + `timestamps` | | | | |

### `cocktail_of_month`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `year` | `integer` | NOT NULL | — | |
| `month` | `integer` | NOT NULL | — | |
| `rank` | `integer` | NOT NULL | `1` | |
| + `timestamps` | | | | |

---

## Party Mode

### `party_sessions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `code` | `text` | NOT NULL | — | UNIQUE |
| `host_id` | `uuid` | NOT NULL | — | FK &rarr; `users.id` (CASCADE) |
| `name` | `text` | YES | — | |
| `mode` | `party_mode` | NOT NULL | `'voting'` | |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `expires_at` | `timestamp` | YES | — | |
| + `timestamps` | | | | |

### `party_participants`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `session_id` | `uuid` | NOT NULL | — | FK &rarr; `party_sessions.id` (CASCADE) |
| `user_id` | `uuid` | YES | — | FK &rarr; `users.id` (SET NULL) |
| `guest_name` | `text` | YES | — | |
| `prefers_alcoholic` | `boolean` | YES | — | |
| `max_intensity` | `integer` | YES | — | |
| + `timestamps` | | | | |

### `party_participant_styles`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `participant_id` | `uuid` | NOT NULL | — | FK &rarr; `party_participants.id` (CASCADE) |
| `style_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktail_styles.id` (CASCADE) |
| + `timestamps` | | | | |

### `party_cocktail_selections`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `session_id` | `uuid` | NOT NULL | — | FK &rarr; `party_sessions.id` (CASCADE) |
| `cocktail_id` | `uuid` | NOT NULL | — | FK &rarr; `cocktails.id` (CASCADE) |
| `vote_count` | `integer` | NOT NULL | `0` | |
| `is_selected` | `integer` | NOT NULL | `0` | |
| + `timestamps` | | | | |

