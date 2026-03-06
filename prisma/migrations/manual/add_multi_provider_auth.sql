-- Migration: Add multi-provider auth support (GitHub + Google)
-- This is a single-step migration that generalizes the profile model.

-- Step 1: Add new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "auth_provider" TEXT DEFAULT 'github';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "google_id" TEXT;

-- Step 2: Backfill username from github_username for existing users
UPDATE profiles SET "username" = "github_username" WHERE "username" IS NULL;

-- Step 3: Make username and auth_provider NOT NULL
ALTER TABLE profiles ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN "auth_provider" SET NOT NULL;

-- Step 4: Make github_username and github_id nullable
ALTER TABLE profiles ALTER COLUMN "github_username" DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN "github_id" DROP NOT NULL;

-- Step 5: Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_key" ON profiles ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_key" ON profiles ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_google_id_key" ON profiles ("google_id");
