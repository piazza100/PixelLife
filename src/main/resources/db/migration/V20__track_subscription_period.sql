ALTER TABLE users
  ADD COLUMN paid_from DATETIME(6) NULL AFTER plan,
  ADD COLUMN subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE AFTER paid_until;

UPDATE users
SET paid_from = billing_updated_at
WHERE polar_subscription_id IS NOT NULL AND paid_until IS NOT NULL;
