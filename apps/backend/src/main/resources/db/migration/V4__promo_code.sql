-- KAN-27: percentage promo codes at checkout.
CREATE SEQUENCE foodme.promo_code_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE foodme.promo_code (
    id BIGINT NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    percent INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 100),
    min_order_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    valid_until DATE
);

INSERT INTO foodme.promo_code (id, code, percent, min_order_amount, valid_until) VALUES
(nextval('foodme.promo_code_id_seq'), 'SAVE10', 10, 3000, NULL),
(nextval('foodme.promo_code_id_seq'), 'TREAT15', 15, 8000, NULL),
(nextval('foodme.promo_code_id_seq'), 'OLD15', 15, 0, DATE '2025-12-31');

ALTER TABLE foodme."order" ADD COLUMN promo_code VARCHAR(50);
ALTER TABLE foodme."order" ADD COLUMN discount DOUBLE PRECISION;
