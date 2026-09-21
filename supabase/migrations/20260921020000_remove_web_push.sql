-- Web Push is retired. Workshop uses realtime in-app notifications through
-- in_app_notifications, which do not require browser permissions.
DROP TABLE IF EXISTS push_subscriptions CASCADE;
