-- TICKET #4: Orders table + generate_order_number function
-- Run in: https://supabase.com/dashboard/project/odtexqyvjxxdgysuxoxb/sql/new

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending_whatsapp',
  total_amount NUMERIC(10,2),
  items JSONB NOT NULL,
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  count_part TEXT;
  next_num INT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 11)::INT), 0) + 1
  INTO next_num
  FROM orders
  WHERE order_number LIKE 'HEAL-' || year_part || '-%';

  count_part := LPAD(next_num::TEXT, 4, '0');
  RETURN 'HEAL-' || year_part || '-' || count_part;
END;
$$ LANGUAGE plpgsql;
