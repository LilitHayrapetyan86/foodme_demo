CREATE SEQUENCE IF NOT EXISTS foodme.order_number_seq START WITH 1 INCREMENT BY 1;

INSERT INTO foodme.chef (id, username, phone_number, email, avatar_url, banner_url, status,
    full_name_en, full_name_am, full_name_ru, description_en, description_am, description_ru,
    kitchen_en, kitchen_am, kitchen_ru, rating, platform_fee, delivery_price, free_delivery_from, priority_index) VALUES
(1, 'marta-k', '+37493000001', 'marta@foodme.am', '/img/chef/1-avatar.jpg', '/img/chef/1-banner.jpg', 'ACTIVE',
 'Marta''s Kitchen', 'Մարտայի խոհանոց', 'Кухня Марты', 'Home-style Armenian dishes.', 'Տնային ուտեստներ', 'Домашние блюда',
 'Armenian', 'Հայկական', 'Армянская', 4.7, 0.12, 700.0, 8000.0, 0),
(2, 'ararat-grill', '+37493000002', 'ararat@foodme.am', '/img/chef/2-avatar.jpg', '/img/chef/2-banner.jpg', 'ACTIVE',
 'Ararat Grill House', 'Արարատ Գրիլ', 'Гриль-хаус Арарат', 'Smoky khorovats.', 'Ծխային խորոված', 'Дымный хоровац',
 'Grill', 'Գրիլ', 'Гриль', 4.8, 0.12, 900.0, 10000.0, 1),
(3, 'closed-kitchen', '+37493000003', 'closed@foodme.am', '/img/chef/3-avatar.jpg', '/img/chef/3-banner.jpg', 'INACTIVE',
 'Old Yerevan Kitchen', 'Հին Երևանի Խոհանոց', 'Кухня старого Еревана', 'On a break.', 'Ընդմիջման մեջ', 'На перерыве',
 'Armenian', 'Հայկական', 'Армянская', 4.2, 0.12, 700.0, 8000.0, 2);

INSERT INTO foodme.dish_tag (id, name_en, name_am, name_ru) VALUES
(1, 'Starters', 'Նախուտեստներ', 'Закуски'),
(2, 'Mains', 'Հիմնական ուտեստներ', 'Основные блюда');

INSERT INTO foodme.chef_tag_order (id, chef_id, dish_tag_id, priority_index) VALUES
(1, 1, 1, 0), (2, 1, 2, 1);

INSERT INTO foodme.dish (id, name_en, name_am, name_ru, description_en, price, url, portion_en, portion_am, portion_ru, status, minimum_order_count, priority_index, chef_id, dish_tag_id) VALUES
(1, 'Lavash Wrap', 'Լավաշ', 'Лаваш', 'Wrap.', 1800.0, '/img/dish/1.jpg', '300 g', '300 գ', '300 г', 'ACTIVE', 1, 0, 1, 1),
(2, 'Khashlama', 'Խաշլամա', 'Хашлама', 'Stew.', 4200.0, '/img/dish/2.jpg', '450 g', '450 գ', '450 г', 'ACTIVE', 1, 0, 1, 2),
(3, 'Pork Khorovats', 'Խոզի խորոված', 'Свиной хоровац', 'Grill.', 4800.0, '/img/dish/3.jpg', '400 g', '400 գ', '400 г', 'ACTIVE', 1, 0, 2, 2),
(4, 'Inactive Dish', 'Ապրանք', 'Товар', 'Not available.', 2500.0, '/img/dish/4.jpg', '300 g', '300 գ', '300 г', 'INACTIVE', 1, 1, 1, 2);

INSERT INTO foodme.admin (id, username, password_hash, role) VALUES
(1, 'admin', '$2y$10$oMkXATQDgiPBCh29e2u7ROJkWXECjE2kmHPwCpJGAvkf3TuFbnZCi', 'ADMIN');

INSERT INTO foodme.promo_code (id, code, percent, min_order_amount, valid_until) VALUES
(1, 'SAVE10', 10, 3000.0, NULL),
(2, 'TREAT15', 15, 8000.0, NULL),
(3, 'OLD15', 15, 0.0, DATE '2025-12-31');
