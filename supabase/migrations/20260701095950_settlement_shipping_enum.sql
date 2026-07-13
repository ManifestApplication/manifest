-- Add a settlement payee for the shipping fee (paid to the courier/aggregator).
-- Must be its own migration: a new enum value can't be USED in the same
-- transaction that adds it, and the next migration's payment_split references it.
alter type settlement_payee add value if not exists 'shipping';
