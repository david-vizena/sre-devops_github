-- Create base schema for transactional data
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT NOT NULL,
    name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    subtotal NUMERIC(14,2) NOT NULL,
    tax NUMERIC(14,2) NOT NULL,
    discount NUMERIC(14,2) NOT NULL,
    total NUMERIC(14,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    status TEXT DEFAULT 'processed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT,
    category TEXT,
    unit_price NUMERIC(14,2) NOT NULL,
    quantity INT NOT NULL,
    total NUMERIC(14,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);

