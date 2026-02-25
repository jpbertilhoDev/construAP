-- Migration: Add missing values to the existing user_role ENUM
-- The table user_roles uses the type "user_role", which missing 'custom'
-- Since enums cannot be altered inside a transaction block with other things in some PG versions,
-- we'll just add the values.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'custom';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Admin do Tenant';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Super Admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Administrativo';
