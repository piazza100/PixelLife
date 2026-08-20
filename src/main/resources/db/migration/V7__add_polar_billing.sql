ALTER TABLE users
  ADD COLUMN polar_customer_id VARCHAR(64) NULL AFTER paid_until,
  ADD COLUMN polar_subscription_id VARCHAR(64) NULL AFTER polar_customer_id,
  ADD COLUMN billing_updated_at DATETIME(6) NULL AFTER polar_subscription_id,
  ADD UNIQUE KEY uk_users_polar_customer (polar_customer_id),
  ADD UNIQUE KEY uk_users_polar_subscription (polar_subscription_id);

CREATE TABLE billing_webhook_events (
  webhook_id VARCHAR(128) PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  event_timestamp DATETIME(6) NOT NULL,
  received_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  processed_at DATETIME(6) NULL,
  KEY idx_billing_events_received (received_at)
);
