-- Datos de arranque para la demo. El esquema se recrea en cada arranque
-- (ddl-auto=create-drop), así que sin este script la aplicación levanta vacía.
--
-- Las fechas son relativas a CURRENT_DATE a propósito: la agenda semanal consulta
-- desde hoy hasta el domingo, así que con fechas fijas el demo dejaría de tener
-- eventos en pantalla ni un mes después de escribirlo. Se siembra una semana hacia
-- atrás y dos hacia adelante, para que siempre haya algo en la ventana sea cual
-- sea el día de la semana en el que se levante la aplicación.

-- ============================================================
-- PUBLICADORES
-- ============================================================

INSERT INTO publicador (nombre, email, telefono) VALUES ('Turismo Córdoba', 'info@cordoba.gob.ar', '0351-1234567');
INSERT INTO publicador (nombre, email, telefono) VALUES ('Municipalidad de Cosquín', 'cosquin@cordoba.gob.ar', '0351-4601002');
INSERT INTO publicador (nombre, email, telefono) VALUES ('Asociación de Artesanos', 'artesanos@cordoba.gob.ar', NULL);

-- ============================================================
-- EVENTOS TURÍSTICOS - CÓRDOBA 2026
-- ============================================================

-- ------------------------------------------------------------
-- 1. COSQUÍN ROCK
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Cosquín Rock',
    'Uno de los festivales de música más importantes de Argentina, con artistas nacionales e internacionales y múltiples escenarios.',
    '2027-02-06',
    '2027-02-07',
    1
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Cosquín Rock'),
    'https://cdn.getcrowder.com/images/b37b0343-9a9c-45f2-a095-0d9503a9da80-eden1920x720-px.webp'
);


-- ------------------------------------------------------------
-- 2. FESTIVAL NACIONAL DE FOLKLORE DE COSQUÍN
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Festival Nacional de Folklore de Cosquín',
    'Tradicional festival folklórico que reúne música, danza y expresiones culturales argentinas en la ciudad de Cosquín.',
    '2026-01-24',
    '2026-02-01',
    2
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Festival Nacional de Folklore de Cosquín'),
    'https://aquicosquin.com.ar/wp-content/uploads/2026/09/1920X1080-PARA-PANTALLA-2-980x551.jpg'
);


-- ------------------------------------------------------------
-- 3. OKTOBERFEST
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Oktoberfest',
    'Fiesta Nacional de la Cerveza celebrada en Villa General Belgrano, con gastronomía, música, espectáculos y tradiciones centroeuropeas.',
    '2026-10-02',
    '2026-10-12',
    1
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Oktoberfest'),
    'https://oktoberfestargentina.com.ar/wp-content/uploads/2026/05/2.-Banner-web-preventa-mayo-04.jpg'
);


-- ------------------------------------------------------------
-- 4. FIESTA NACIONAL DEL MANÍ - PEPERINA
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Peperina',
    'Festival gastronómico que reúne productores, cocineros y propuestas de la gastronomía argentina en Alta Gracia.',
    '2026-04-03',
    '2026-04-05',
    3
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Peperina'),
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnh25FTSuN-mNqEe54mexwqHT8RIq1AjzHXCyZf_vqp5lHs8t_76DYQWU&s=10'
);


-- ------------------------------------------------------------
-- 5. FIESTA DE LAS COLECTIVIDADES
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Fiesta de las Colectividades',
    'Evento cultural y gastronómico que reúne las tradiciones, comidas, música y danzas de diferentes comunidades en Alta Gracia.',
    '2026-02-04',
    '2026-02-08',
    3
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Fiesta de las Colectividades'),
    'https://colectividadesaltagracia.com/imagenes/encuentro-colectividades-alta-gracia/encuentro-colectividades-alta-gracia-2026-banner-001.jpg'
);


-- ------------------------------------------------------------
-- 6. FESTIVAL NACIONAL DE DOMA Y FOLKLORE DE JESÚS MARÍA
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Festival Nacional de Doma y Folklore de Jesús María',
    'Festival tradicional argentino que combina espectáculos de doma, música folklórica, gastronomía y actividades culturales.',
    '2026-01-08',
    '2026-01-18',
    2
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Festival Nacional de Doma y Folklore de Jesús María'),
    'https://festival.org.ar/wp-content/uploads/2026/09/IMG_9402.JPG-vert.jpeg'
);


-- ------------------------------------------------------------
-- 7. FESTIVAL INTERNACIONAL DE PEÑAS
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Festival Internacional de Peñas',
    'Importante festival musical de Villa María que reúne artistas nacionales e internacionales y propuestas culturales.',
    '2026-02-06',
    '2026-02-10',
    1
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Festival Internacional de Peñas'),
    'https://cdn.getcrowder.com/images/70175405-2551-4002-a9c1-8d04ecda4f22-portada1920x720.jpg?format=webp'
);


-- ------------------------------------------------------------
-- 8. MASA VIENESA
-- ------------------------------------------------------------

INSERT INTO evento (nombre, descripcion, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Masa Vienesa',
    'Tradicional celebración gastronómica de Villa General Belgrano con productos de pastelería, chocolate y especialidades centroeuropeas.',
    '2026-04-02',
    '2026-04-05',
    1
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Masa Vienesa'),
    'https://villageneralbelgrano.gob.ar//wp-content/uploads/2026/02/Logo-masa56_Mesa-de-trabajo-1-300x206.png'
);
