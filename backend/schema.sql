-- Supabase SQL Schema for TradoxB2B
-- Run this script in your Supabase SQL Editor to initialize the database tables.

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    "companyId" UUID REFERENCES companies(id) ON DELETE CASCADE,
    "kybStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "companyId" UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC,
    moq NUMERIC,
    certificates JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: rfqs
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "buyerCompanyId" UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    "targetPrice" NUMERIC,
    "targetQuantity" NUMERIC,
    status TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: negotiation_rooms
CREATE TABLE IF NOT EXISTS negotiation_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "buyerCompanyId" UUID REFERENCES companies(id) ON DELETE CASCADE,
    "supplierCompanyId" UUID REFERENCES companies(id) ON DELETE CASCADE,
    "rfqId" UUID REFERENCES rfqs(id) ON DELETE SET NULL,
    "productId" UUID REFERENCES products(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES negotiation_rooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL, -- Corresponds to firebase_uid or "system"
    content TEXT,
    offer_version JSONB, -- Stores the OfferVersion structure
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES negotiation_rooms(id) ON DELETE CASCADE,
    buyer_id TEXT NOT NULL, -- Corresponds to firebase_uid
    supplier_id TEXT NOT NULL, -- Corresponds to firebase_uid
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC NOT NULL,
    contract_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
-- For this initial setup, we will allow all authenticated service role access.
-- In production, you would configure strict RLS policies here based on auth.uid()
