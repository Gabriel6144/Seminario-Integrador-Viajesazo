-- Datos de arranque para la demo. El esquema se recrea en cada arranque
-- (ddl-auto=create-drop), así que sin este script la aplicación levanta vacía.
--
-- Las fechas son relativas a CURRENT_DATE a propósito: la agenda semanal consulta
-- desde hoy hasta el domingo, así que con fechas fijas el demo dejaría de tener
-- eventos en pantalla ni un mes después de escribirlo.
--
-- Desde la herencia de PropuestaTuristica los eventos se guardan en dos tablas:
-- `propuesta_turistica` (datos comunes, incluido el discriminador `subtipo`) y
-- `evento` (fechas, monto y sitio oficial). Las imágenes viven en
-- `propuesta_imagen` con una columna `orden` que conserva la secuencia.

-- ============================================================
-- PUBLICADORES
-- ============================================================

INSERT INTO publicador (nombre, email, telefono) VALUES ('Turismo Córdoba', 'info@cordoba.gob.ar', '0351-1234567');
INSERT INTO publicador (nombre, email, telefono) VALUES ('Municipalidad de Cosquín', 'cosquin@cordoba.gob.ar', '0351-4601002');
INSERT INTO publicador (nombre, email, telefono) VALUES ('Asociación de Artesanos', 'artesanos@cordoba.gob.ar', NULL);

-- ============================================================
-- ESTADOS DE PROPUESTA
-- ============================================================

INSERT INTO estado_propuesta (nombre, descripcion) VALUES ('INICIADO', 'Propuesta registrada y pendiente de ejecución');
INSERT INTO estado_propuesta (nombre, descripcion) VALUES ('REPROGRAMADO', 'Propuesta cuya fecha fue modificada');
INSERT INTO estado_propuesta (nombre, descripcion) VALUES ('CANCELADO', 'Propuesta cancelada');
INSERT INTO estado_propuesta (nombre, descripcion) VALUES ('FINALIZADO', 'Propuesta ejecutada');

-- ============================================================
-- UBICACIONES DE VIAJES
-- ============================================================

INSERT INTO ubicacion (ciudad, localidad, latitud, longitud) VALUES
    ('Villa General Belgrano', 'Córdoba', -31.95, -64.55),
    ('Ciudad de Córdoba', 'Córdoba', -31.42, -64.18),
    ('Carlos Paz', 'Córdoba', -31.42, -64.50),
    ('Alta Gracia', 'Córdoba', -31.65, -64.43),
    ('La Cumbrecita', 'Córdoba', -31.90, -64.77);

-- ============================================================
-- UBICACIONES DE EVENTOS
-- ============================================================
-- Cada evento tiene su propia ubicación; se insertan antes del evento y se
-- referencian por `direccion`, que en este seed es única.

INSERT INTO ubicacion (ciudad, localidad, direccion, latitud, longitud) VALUES
    ('Santa María de Punilla', 'Santa María de Punilla', 'Ruta Provincial E55 Km 6, Santa María de Punilla', -31.3932, -64.5146),
    ('Cosquín', 'Cosquín', 'Av. San Martín 800, Cosquín', -31.4135, -64.4947),
    ('Villa General Belgrano', 'Villa General Belgrano', 'Julio A. Roca s/n, Villa General Belgrano', -31.9545, -64.5553),
    ('Alta Gracia', 'Alta Gracia', 'Rafael Lozada 1250, Alta Gracia', -31.6550, -64.4297),
    ('Alta Gracia', 'Alta Gracia', 'Av. Presidente Perón 1000, Alta Gracia', -31.6565, -64.4275),
    ('Jesús María', 'Jesús María', 'Av. Bamba s/n, Jesús María', -30.9820, -64.0920),
    ('Villa María', 'Villa María', 'Bv. España 300, Villa María', -32.4075, -63.2401),
    ('Villa General Belgrano', 'Villa General Belgrano', 'Av. San Martín 100, Villa General Belgrano', -31.9553, -64.5555);

-- ============================================================
-- EVENTOS TURÍSTICOS
-- ============================================================

-- 1. COSQUÍN ROCK
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Cosquín Rock',
     'Uno de los festivales de música más importantes de Argentina, con artistas nacionales e internacionales y múltiples escenarios.',
     'FESTIVAL', 'MUSICA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Aeródromo de Santa María de Punilla',
     (SELECT id FROM ubicacion WHERE direccion = 'Ruta Provincial E55 Km 6, Santa María de Punilla'),
     1);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Cosquín Rock'),
    70000,
    'https://cosquinrock.net',
    DATEADD('DAY', 100, CURRENT_DATE),
    DATEADD('DAY', 101, CURRENT_DATE),
    '18:00:00',
    '23:59:00'
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Cosquín Rock'),
    'https://cdn.getcrowder.com/images/b37b0343-9a9c-45f2-a095-0d9503a9da80-eden1920x720-px.webp',
    0
);

-- 2. FESTIVAL NACIONAL DE FOLKLORE DE COSQUÍN
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Festival Nacional de Folklore de Cosquín',
     'Tradicional festival folklórico que reúne música, danza y expresiones culturales argentinas en la ciudad de Cosquín.',
     'FESTIVAL', 'CULTURA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Plaza Próspero Molina',
     (SELECT id FROM ubicacion WHERE direccion = 'Av. San Martín 800, Cosquín'),
     2);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Festival Nacional de Folklore de Cosquín'),
    25000,
    'https://festivaldecosquin.com',
    DATEADD('DAY', -20, CURRENT_DATE),
    DATEADD('DAY', -10, CURRENT_DATE),
    '20:00:00',
    '23:30:00'
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Festival Nacional de Folklore de Cosquín'),
    'https://aquicosquin.com.ar/wp-content/uploads/2026/09/1920X1080-PARA-PANTALLA-2-980x551.jpg',
    0
);

-- 3. OKTOBERFEST
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Oktoberfest',
     'Fiesta Nacional de la Cerveza celebrada en Villa General Belgrano, con gastronomía, música, espectáculos y tradiciones centroeuropeas.',
     'FESTIVAL', 'GASTRONOMIA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Parque Cervecero',
     (SELECT id FROM ubicacion WHERE direccion = 'Julio A. Roca s/n, Villa General Belgrano'),
     1);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Oktoberfest'),
    15000,
    'https://oktoberfestargentina.com.ar',
    DATEADD('DAY', 2, CURRENT_DATE),
    DATEADD('DAY', 12, CURRENT_DATE),
    '18:00:00',
    '23:59:00'
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Oktoberfest'),
    'https://oktoberfestargentina.com.ar/wp-content/uploads/2026/05/2.-Banner-web-preventa-mayo-04.jpg',
    0
);

-- 4. FIESTA NACIONAL DEL MANÍ - PEPERINA
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Peperina',
     'Festival gastronómico que reúne productores, cocineros y propuestas de la gastronomía argentina en Alta Gracia.',
     'FERIA', 'GASTRONOMIA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Predio del Ferrocarril',
     (SELECT id FROM ubicacion WHERE direccion = 'Rafael Lozada 1250, Alta Gracia'),
     3);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Peperina'),
    10000,
    'https://peperina.gob.ar',
    DATEADD('DAY', -60, CURRENT_DATE),
    DATEADD('DAY', -58, CURRENT_DATE)
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Peperina'),
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnh25FTSuN-mNqEe54mexwqHT8RIq1AjzHXCyZf_vqp5lHs8t_76DYQWU&s=10',
    0
);

-- 5. FIESTA DE LAS COLECTIVIDADES
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Fiesta de las Colectividades',
     'Evento cultural y gastronómico que reúne las tradiciones, comidas, música y danzas de diferentes comunidades en Alta Gracia.',
     'FERIA', 'CULTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Parque García Lorca',
     (SELECT id FROM ubicacion WHERE direccion = 'Av. Presidente Perón 1000, Alta Gracia'),
     3);

INSERT INTO evento (id, fecha_inicio, fecha_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Fiesta de las Colectividades'),
    DATEADD('DAY', -30, CURRENT_DATE),
    DATEADD('DAY', -26, CURRENT_DATE)
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Fiesta de las Colectividades'),
    'https://colectividadesaltagracia.com/imagenes/encuentro-colectividades-alta-gracia/encuentro-colectividades-alta-gracia-2026-banner-001.jpg',
    0
);

-- 6. FESTIVAL NACIONAL DE DOMA Y FOLKLORE DE JESÚS MARÍA
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Festival Nacional de Doma y Folklore de Jesús María',
     'Festival tradicional argentino que combina espectáculos de doma, música folklórica, gastronomía y actividades culturales.',
     'FESTIVAL', 'CULTURA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Campo de la Doma',
     (SELECT id FROM ubicacion WHERE direccion = 'Av. Bamba s/n, Jesús María'),
     2);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Festival Nacional de Doma y Folklore de Jesús María'),
    30000,
    'https://festival.org.ar',
    DATEADD('DAY', -90, CURRENT_DATE),
    DATEADD('DAY', -80, CURRENT_DATE)
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Festival Nacional de Doma y Folklore de Jesús María'),
    'https://festival.org.ar/wp-content/uploads/2026/09/IMG_9402.JPG-vert.jpeg',
    0
);

-- 7. FESTIVAL INTERNACIONAL DE PEÑAS
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Festival Internacional de Peñas',
     'Importante festival musical de Villa María que reúne artistas nacionales e internacionales y propuestas culturales.',
     'FESTIVAL', 'MUSICA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Anfiteatro de Villa María',
     (SELECT id FROM ubicacion WHERE direccion = 'Bv. España 300, Villa María'),
     1);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Festival Internacional de Peñas'),
    20000,
    'https://festivaldepenas.com.ar',
    DATEADD('DAY', -40, CURRENT_DATE),
    DATEADD('DAY', -36, CURRENT_DATE)
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Festival Internacional de Peñas'),
    'https://cdn.getcrowder.com/images/70175405-2551-4002-a9c1-8d04ecda4f22-portada1920x720.jpg?format=webp',
    0
);

-- 8. MASA VIENESA
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Masa Vienesa',
     'Tradicional celebración gastronómica de Villa General Belgrano con productos de pastelería, chocolate y especialidades centroeuropeas.',
     'FERIA', 'GASTRONOMIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Plaza José Hernández',
     (SELECT id FROM ubicacion WHERE direccion = 'Av. San Martín 100, Villa General Belgrano'),
     1);

INSERT INTO evento (id, fecha_inicio, fecha_fin)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Masa Vienesa'),
    DATEADD('DAY', 1, CURRENT_DATE),
    DATEADD('DAY', 4, CURRENT_DATE)
);

INSERT INTO propuesta_imagen (propuesta_id, url, orden)
VALUES (
    (SELECT id FROM propuesta_turistica WHERE nombre = 'Masa Vienesa'),
    'https://villageneralbelgrano.gob.ar//wp-content/uploads/2026/02/Logo-masa56_Mesa-de-trabajo-1-300x206.png',
    0
);

-- ============================================================
-- ACTIVIDADES TURÍSTICAS
-- ============================================================

-- 1. VISITA GUIADA POR EL CASCO HISTÓRICO
INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('ACTIVIDAD', 0, 'Visita guiada por el Casco Histórico',
     'Recorrido a pie por las calles, plazas y edificios históricos de Cosquín con guías locales.',
     'VISITA_GUIADA', 'CULTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cabildo de Cosquín',
     (SELECT id FROM ubicacion WHERE direccion = 'Av. San Martín 800, Cosquín'),
     2);

INSERT INTO actividad (id, duracion_minutos)
VALUES ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada por el Casco Histórico'), 90);

INSERT INTO actividad_disponibilidad (actividad_id, orden, dia_semana, hora_inicio, hora_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada por el Casco Histórico'), 0, 'MONDAY', '09:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada por el Casco Histórico'), 1, 'WEDNESDAY', '15:00:00', '17:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada por el Casco Histórico'), 2, 'SATURDAY', '10:00:00', '12:00:00');

-- 2. SENDERISMO EN EL CERRO DE LA CRUZ
INSERT INTO ubicacion (ciudad, localidad, direccion, latitud, longitud) VALUES
    ('Carlos Paz', 'Carlos Paz', 'Cerro de la Cruz, Carlos Paz', -31.4241, -64.4978);

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('ACTIVIDAD', 0, 'Senderismo en el Cerro de la Cruz',
     'Caminata guiada hasta el mirador del cerro, con vistas panorámicas del valle de Punilla.',
     'DEPORTIVO', 'NATURALEZA', 'CICLISTA', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cerro de la Cruz',
     (SELECT id FROM ubicacion WHERE direccion = 'Cerro de la Cruz, Carlos Paz'),
     1);

INSERT INTO actividad (id, duracion_minutos)
VALUES ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo en el Cerro de la Cruz'), 180);

INSERT INTO actividad_disponibilidad (actividad_id, orden, dia_semana, hora_inicio, hora_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo en el Cerro de la Cruz'), 0, 'SATURDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo en el Cerro de la Cruz'), 1, 'SUNDAY', '08:00:00', '11:00:00');


-- ============================================================
-- PROPUESTAS FUTURAS PARA EL CIRCUITO AUTOMÁTICO (VZ-25)
-- ============================================================
-- Cada viaje del seed tiene al menos tres propuestas dentro de su ventana de
-- fechas y de su radio de interés. Se usan fechas relativas para que el demo
-- siga funcionando sin importar cuándo se levante la aplicación.

INSERT INTO ubicacion (ciudad, localidad, direccion, latitud, longitud) VALUES
    ('Villa General Belgrano', 'Villa General Belgrano', 'Río Los Reartes, Villa General Belgrano', -31.9400, -64.5600),
    ('Villa General Belgrano', 'Villa General Belgrano', 'Museo de la Cerveza, Villa General Belgrano', -31.9520, -64.5480),
    ('Villa General Belgrano', 'Villa General Belgrano', 'Cervecería artesanal, Villa General Belgrano', -31.9530, -64.5510),
    ('Ciudad de Córdoba', 'Córdoba', 'Manzana Jesuítica, Córdoba', -31.4170, -64.1870),
    ('Ciudad de Córdoba', 'Córdoba', 'Feria de artesanos, Córdoba', -31.4130, -64.1830),
    ('Ciudad de Córdoba', 'Córdoba', 'Cañada de Córdoba', -31.4190, -64.1850),
    ('Carlos Paz', 'Carlos Paz', 'Lago San Roque, Carlos Paz', -31.4160, -64.5050),
    ('Carlos Paz', 'Carlos Paz', 'Teleférico, Carlos Paz', -31.4250, -64.4980),
    ('Carlos Paz', 'Carlos Paz', 'Teatro del Lago, Carlos Paz', -31.4210, -64.5020),
    ('Alta Gracia', 'Alta Gracia', 'Museo Casa del Che, Alta Gracia', -31.6550, -64.4280),
    ('Alta Gracia', 'Alta Gracia', 'Feria de productores, Alta Gracia', -31.6530, -64.4310),
    ('Alta Gracia', 'Alta Gracia', 'Peña de los cerros, Alta Gracia', -31.6570, -64.4260),
    ('La Cumbrecita', 'La Cumbrecita', 'Bosque de los Pioneros, La Cumbrecita', -31.8990, -64.7710),
    ('La Cumbrecita', 'La Cumbrecita', 'Cascada de La Cumbrecita', -31.9020, -64.7680),
    ('La Cumbrecita', 'La Cumbrecita', 'Fogón de la montaña, La Cumbrecita', -31.8980, -64.7730);

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Caminata al Río Los Reartes',
     'Caminata guiada por los senderos ribereños de Villa General Belgrano.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Río Los Reartes',
     (SELECT id FROM ubicacion WHERE direccion = 'Río Los Reartes, Villa General Belgrano'), 1),
    ('EVENTO', 0, 'Museo de la Cerveza',
     'Recorrido por la historia cervecera de la localidad con degustación final.',
     'EXPOSICION', 'HISTORIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Museo de la Cerveza',
     (SELECT id FROM ubicacion WHERE direccion = 'Museo de la Cerveza, Villa General Belgrano'), 1),
    ('EVENTO', 0, 'Noche de cerveza artesanal',
     'Encuentro nocturno con productores locales, música en vivo y food trucks.',
     'ENCUENTRO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cervecería artesanal',
     (SELECT id FROM ubicacion WHERE direccion = 'Cervecería artesanal, Villa General Belgrano'), 1),
    ('EVENTO', 0, 'Visita a la Manzana Jesuítica',
     'Recorrido guiado por el conjunto histórico declarado Patrimonio de la Humanidad.',
     'EXPOSICION', 'CULTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Manzana Jesuítica',
     (SELECT id FROM ubicacion WHERE direccion = 'Manzana Jesuítica, Córdoba'), 2),
    ('EVENTO', 0, 'Feria de artesanos del Centro',
     'Puestos de artesanías, diseño independiente y productos regionales.',
     'FERIA', 'COMPRAS', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Feria de artesanos',
     (SELECT id FROM ubicacion WHERE direccion = 'Feria de artesanos, Córdoba'), 3),
    ('EVENTO', 0, 'Peña en la Cañada',
     'Noche de folklore, guitarreada y gastronomía criolla junto a la Cañada.',
     'ESPECTACULO', 'MUSICA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cañada de Córdoba',
     (SELECT id FROM ubicacion WHERE direccion = 'Cañada de Córdoba'), 2),
    ('EVENTO', 0, 'Kayak en el lago San Roque',
     'Salida guiada en kayak por la costa del lago, con equipo incluido.',
     'DEPORTIVO', 'AVENTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Lago San Roque',
     (SELECT id FROM ubicacion WHERE direccion = 'Lago San Roque, Carlos Paz'), 1),
    ('EVENTO', 0, 'Teleférico y mirador',
     'Ascenso al mirador panorámico del valle de Punilla.',
     'EXPOSICION', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Teleférico',
     (SELECT id FROM ubicacion WHERE direccion = 'Teleférico, Carlos Paz'), 1),
    ('EVENTO', 0, 'Teatro en Carlos Paz',
     'Función nocturna de teatro y música en la sala principal del lago.',
     'ESPECTACULO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Teatro del Lago',
     (SELECT id FROM ubicacion WHERE direccion = 'Teatro del Lago, Carlos Paz'), 2),
    ('EVENTO', 0, 'Museo Casa del Che',
     'Visita al museo que recorre la vida de Ernesto Guevara en Alta Gracia.',
     'EXPOSICION', 'HISTORIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Museo Casa del Che',
     (SELECT id FROM ubicacion WHERE direccion = 'Museo Casa del Che, Alta Gracia'), 3),
    ('EVENTO', 0, 'Feria de productores de Alta Gracia',
     'Productos de la región, conservas, dulces y cocina de estación.',
     'FERIA', 'GASTRONOMIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Feria de productores',
     (SELECT id FROM ubicacion WHERE direccion = 'Feria de productores, Alta Gracia'), 3),
    ('EVENTO', 0, 'Peña de los cerros',
     'Peña nocturna con artistas locales y comidas típicas de las sierras.',
     'ESPECTACULO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Peña de los cerros',
     (SELECT id FROM ubicacion WHERE direccion = 'Peña de los cerros, Alta Gracia'), 2),
    ('EVENTO', 0, 'Bosque de los Pioneros',
     'Caminata interpretativa por el bosque nativo y sus senderos de montaña.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Bosque de los Pioneros',
     (SELECT id FROM ubicacion WHERE direccion = 'Bosque de los Pioneros, La Cumbrecita'), 1),
    ('EVENTO', 0, 'Cascada de La Cumbrecita',
     'Caminata hasta la cascada y los pozones naturales del río Almbach.',
     'DEPORTIVO', 'AVENTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cascada de La Cumbrecita',
     (SELECT id FROM ubicacion WHERE direccion = 'Cascada de La Cumbrecita'), 1),
    ('EVENTO', 0, 'Fogón bajo las estrellas',
     'Noche de fogón, música acústica y chocolate caliente en la montaña.',
     'ENCUENTRO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Fogón de la montaña',
     (SELECT id FROM ubicacion WHERE direccion = 'Fogón de la montaña, La Cumbrecita'), 1);

INSERT INTO evento (id, fecha_inicio, fecha_fin, horario_inicio, horario_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Caminata al Río Los Reartes'),
     DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '09:00:00', '13:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo de la Cerveza'),
     DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '10:00:00', '18:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Noche de cerveza artesanal'),
     DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '20:00:00', '23:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita a la Manzana Jesuítica'),
     DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '10:00:00', '13:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Feria de artesanos del Centro'),
     DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '11:00:00', '19:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña en la Cañada'),
     DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '21:00:00', '23:59:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak en el lago San Roque'),
     DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '09:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Teleférico y mirador'),
     DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '12:30:00', '13:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Teatro en Carlos Paz'),
     DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '21:00:00', '23:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo Casa del Che'),
     DATEADD('DAY', 28, CURRENT_DATE), DATEADD('DAY', 30, CURRENT_DATE), '10:00:00', '13:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Feria de productores de Alta Gracia'),
     DATEADD('DAY', 28, CURRENT_DATE), DATEADD('DAY', 30, CURRENT_DATE), '11:00:00', '18:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña de los cerros'),
     DATEADD('DAY', 28, CURRENT_DATE), DATEADD('DAY', 30, CURRENT_DATE), '20:30:00', '23:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Bosque de los Pioneros'),
     DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '09:00:00', '13:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cascada de La Cumbrecita'),
     DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '10:00:00', '14:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Fogón bajo las estrellas'),
     DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '20:00:00', '23:30:00');

-- ============================================================
-- PROPUESTAS AMPLIADAS PARA EL CIRCUITO AUTOMÁTICO
-- ============================================================
-- Cada viaje recibe propuestas suficientes para llenar el tope diario
-- (TRANQUILO 2, EQUILIBRADO 3, INTENSIVO 4) sin días vacíos. Las fechas
-- son relativas para que el demo funcione en cualquier momento.

INSERT INTO ubicacion (ciudad, localidad, direccion, latitud, longitud) VALUES
    ('Villa General Belgrano', 'Villa General Belgrano', 'Senderos de Villa General Belgrano', -31.9450, -64.5580),
    ('Ciudad de Córdoba', 'Córdoba', 'Paseo del Buen Pastor, Córdoba', -31.4200, -64.1900),
    ('Ciudad de Córdoba', 'Córdoba', 'Museo Emilio Caraffa, Córdoba', -31.4180, -64.1880),
    ('Ciudad de Córdoba', 'Córdoba', 'Cabildo de Córdoba, Córdoba', -31.4170, -64.1840),
    ('Ciudad de Córdoba', 'Córdoba', 'Iglesia de los Capuchinos, Córdoba', -31.4150, -64.1800),
    ('Ciudad de Córdoba', 'Córdoba', 'Paseo de las Artes, Córdoba', -31.4250, -64.1900),
    ('Ciudad de Córdoba', 'Córdoba', 'Catedral de Córdoba, Córdoba', -31.4165, -64.1845),
    ('Carlos Paz', 'Carlos Paz', 'Parque de aventura, Carlos Paz', -31.4300, -64.5100),
    ('Carlos Paz', 'Carlos Paz', 'Tirolesa del valle, Carlos Paz', -31.4350, -64.5150),
    ('Carlos Paz', 'Carlos Paz', 'Cabalgata de las sierras, Carlos Paz', -31.4400, -64.5200),
    ('Carlos Paz', 'Carlos Paz', 'Balneario El Fantasio, Carlos Paz', -31.4100, -64.5000),
    ('Carlos Paz', 'Carlos Paz', 'Parque Estancia La Quinta, Carlos Paz', -31.4050, -64.4950),
    ('Carlos Paz', 'Carlos Paz', 'Sendero del río San Antonio, Carlos Paz', -31.4300, -64.5050),
    ('Carlos Paz', 'Carlos Paz', 'Peña del centro, Carlos Paz', -31.4200, -64.5000),
    ('Carlos Paz', 'Carlos Paz', 'Bar de música en vivo, Carlos Paz', -31.4180, -64.4980),
    ('Carlos Paz', 'Carlos Paz', 'Cine al aire libre, Carlos Paz', -31.4220, -64.5010),
    ('Alta Gracia', 'Alta Gracia', 'Museo Manuel de Falla, Alta Gracia', -31.6560, -64.4250),
    ('Alta Gracia', 'Alta Gracia', 'Reloj Público y Tajamar, Alta Gracia', -31.6550, -64.4300),
    ('Alta Gracia', 'Alta Gracia', 'Peña gastronómica, Alta Gracia', -31.6580, -64.4270),
    ('Alta Gracia', 'Alta Gracia', 'Museo Nacional Estancia Jesuítica, Alta Gracia', -31.6530, -64.4290),
    ('La Cumbrecita', 'La Cumbrecita', 'Mirador del Cerro Wank, La Cumbrecita', -31.8950, -64.7750),
    ('La Cumbrecita', 'La Cumbrecita', 'Reserva natural, La Cumbrecita', -31.9000, -64.7700),
    ('La Cumbrecita', 'La Cumbrecita', 'Cabalgata de montaña, La Cumbrecita', -31.8970, -64.7720),
    ('La Cumbrecita', 'La Cumbrecita', 'Escalada en roca, La Cumbrecita', -31.8990, -64.7690),
    ('La Cumbrecita', 'La Cumbrecita', 'Paseo del pueblo, La Cumbrecita', -31.8980, -64.7700),
    ('La Cumbrecita', 'La Cumbrecita', 'Cerro Wank, La Cumbrecita', -31.8950, -64.7750);

-- Villa General Belgrano

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Degustación en el Parque Cervecero',
     'Degustación guiada de cervezas artesanales con maridaje en el Parque Cervecero.',
     'ENCUENTRO', 'GASTRONOMIA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Parque Cervecero',
     (SELECT id FROM ubicacion WHERE direccion = 'Julio A. Roca s/n, Villa General Belgrano'), 1),
    ('EVENTO', 0, 'Feria de productores y artesanos de VGB',
     'Feria de productos regionales, artesanías y especialidades de Villa General Belgrano.',
     'FERIA', 'GASTRONOMIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Plaza José Hernández',
     (SELECT id FROM ubicacion WHERE direccion = 'Av. San Martín 100, Villa General Belgrano'), 3),
    ('EVENTO', 0, 'Paseo por el Río Los Reartes',
     'Paseo guiado por la ribera del río Los Reartes y sus senderos naturales.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Río Los Reartes',
     (SELECT id FROM ubicacion WHERE direccion = 'Río Los Reartes, Villa General Belgrano'), 1),
    ('EVENTO', 0, 'Noche de música en vivo en la Plaza José Hernández',
     'Música en vivo, food trucks y artistas locales en la plaza.',
     'ESPECTACULO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Plaza José Hernández',
     (SELECT id FROM ubicacion WHERE direccion = 'Av. San Martín 100, Villa General Belgrano'), 2),
    ('EVENTO', 0, 'Cena con food trucks y cerveza artesanal',
     'Cena al aire libre con food trucks y cerveza artesanal de la región.',
     'ENCUENTRO', 'GASTRONOMIA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cervecería artesanal',
     (SELECT id FROM ubicacion WHERE direccion = 'Cervecería artesanal, Villa General Belgrano'), 1);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Degustación en el Parque Cervecero'),
     5000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '10:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Feria de productores y artesanos de VGB'),
     NULL, NULL, DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo por el Río Los Reartes'),
     NULL, NULL, DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '14:00:00', '15:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Noche de música en vivo en la Plaza José Hernández'),
     NULL, NULL, DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '18:00:00', '19:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cena con food trucks y cerveza artesanal'),
     8000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '16:00:00', '17:00:00');

-- Ciudad de Córdoba

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Paseo del Buen Pastor',
     'Recorrido por el paseo cultural, la fuente y los espacios verdes del Buen Pastor.',
     'EXPOSICION', 'CULTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Paseo del Buen Pastor',
     (SELECT id FROM ubicacion WHERE direccion = 'Paseo del Buen Pastor, Córdoba'), 2),
    ('EVENTO', 0, 'Museo Emilio Caraffa',
     'Visita a las salas de arte contemporáneo del museo.',
     'EXPOSICION', 'CULTURA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Museo Emilio Caraffa',
     (SELECT id FROM ubicacion WHERE direccion = 'Museo Emilio Caraffa, Córdoba'), 2),
    ('EVENTO', 0, 'Cabildo de Córdoba',
     'Recorrido por el histórico Cabildo y sus exposiciones.',
     'EXPOSICION', 'HISTORIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cabildo de Córdoba',
     (SELECT id FROM ubicacion WHERE direccion = 'Cabildo de Córdoba, Córdoba'), 1),
    ('EVENTO', 0, 'Iglesia de los Capuchinos',
     'Visita a la iglesia neogótica y su entorno.',
     'EXPOSICION', 'HISTORIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Iglesia de los Capuchinos',
     (SELECT id FROM ubicacion WHERE direccion = 'Iglesia de los Capuchinos, Córdoba'), 1),
    ('EVENTO', 0, 'Paseo de las Artes de Güemes',
     'Feria de arte, diseño y gastronomía en el barrio Güemes.',
     'FERIA', 'COMPRAS', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Paseo de las Artes',
     (SELECT id FROM ubicacion WHERE direccion = 'Paseo de las Artes, Córdoba'), 3);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo del Buen Pastor'),
     NULL, NULL, DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo Emilio Caraffa'),
     3000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '09:30:00', '10:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cabildo de Córdoba'),
     NULL, NULL, DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '14:00:00', '15:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Iglesia de los Capuchinos'),
     NULL, NULL, DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '15:30:00', '16:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo de las Artes de Güemes'),
     NULL, NULL, DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 17, CURRENT_DATE), '17:00:00', '18:00:00');

-- Carlos Paz

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Parque de aventura en las sierras',
     'Circuito de aventura con actividades al aire libre en las sierras.',
     'DEPORTIVO', 'AVENTURA', 'AUTOMOVILÍSTICA', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Parque de aventura',
     (SELECT id FROM ubicacion WHERE direccion = 'Parque de aventura, Carlos Paz'), 1),
    ('EVENTO', 0, 'Tirolesa en el valle de Punilla',
     'Descenso en tirolesa con vistas al valle de Punilla.',
     'DEPORTIVO', 'AVENTURA', 'AUTOMOVILÍSTICA', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Tirolesa del valle',
     (SELECT id FROM ubicacion WHERE direccion = 'Tirolesa del valle, Carlos Paz'), 2),
    ('EVENTO', 0, 'Cabalgata por las sierras de Carlos Paz',
     'Cabalgata guiada por senderos serranos de Carlos Paz.',
     'DEPORTIVO', 'AVENTURA', 'ECUESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cabalgata de las sierras',
     (SELECT id FROM ubicacion WHERE direccion = 'Cabalgata de las sierras, Carlos Paz'), 1),
    ('EVENTO', 0, 'Paseo en lancha por el lago San Roque',
     'Paseo en lancha por la costa del lago San Roque.',
     'DEPORTIVO', 'NATURALEZA', 'NÁUTICA', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Lago San Roque',
     (SELECT id FROM ubicacion WHERE direccion = 'Lago San Roque, Carlos Paz'), 1),
    ('EVENTO', 0, 'Balneario El Fantasio',
     'Tarde de playa y descanso en las aguas del balneario.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Balneario El Fantasio',
     (SELECT id FROM ubicacion WHERE direccion = 'Balneario El Fantasio, Carlos Paz'), 2),
    ('EVENTO', 0, 'Parque Estancia La Quinta',
     'Paseo por el parque y los jardines de la estancia.',
     'ENCUENTRO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Parque Estancia La Quinta',
     (SELECT id FROM ubicacion WHERE direccion = 'Parque Estancia La Quinta, Carlos Paz'), 2),
    ('EVENTO', 0, 'Mirador del Cerro de la Cruz',
     'Ascenso al mirador panorámico del cerro de la Cruz.',
     'EXPOSICION', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cerro de la Cruz',
     (SELECT id FROM ubicacion WHERE direccion = 'Cerro de la Cruz, Carlos Paz'), 1),
    ('EVENTO', 0, 'Sendero del río San Antonio',
     'Caminata por el sendero que acompaña al río San Antonio.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Sendero del río San Antonio',
     (SELECT id FROM ubicacion WHERE direccion = 'Sendero del río San Antonio, Carlos Paz'), 1),
    ('EVENTO', 0, 'Peña en el centro de Carlos Paz',
     'Peña con música en vivo y gastronomía en el centro.',
     'ESPECTACULO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Peña del centro',
     (SELECT id FROM ubicacion WHERE direccion = 'Peña del centro, Carlos Paz'), 2),
    ('EVENTO', 0, 'Cena show en el Teatro del Lago',
     'Cena con espectáculo en el Teatro del Lago.',
     'ESPECTACULO', 'VIDA_NOCTURNA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Teatro del Lago',
     (SELECT id FROM ubicacion WHERE direccion = 'Teatro del Lago, Carlos Paz'), 2),
    ('EVENTO', 0, 'Bar de música en vivo',
     'Noche de música en vivo en un bar del centro.',
     'ESPECTACULO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Bar de música en vivo',
     (SELECT id FROM ubicacion WHERE direccion = 'Bar de música en vivo, Carlos Paz'), 2),
    ('EVENTO', 0, 'Noche de cine al aire libre',
     'Proyección de cine al aire libre bajo las sierras.',
     'ESPECTACULO', 'VIDA_NOCTURNA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cine al aire libre',
     (SELECT id FROM ubicacion WHERE direccion = 'Cine al aire libre, Carlos Paz'), 3);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Parque de aventura en las sierras'),
     12000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '09:00:00', '10:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Tirolesa en el valle de Punilla'),
     9000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '10:30:00', '11:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cabalgata por las sierras de Carlos Paz'),
     8000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '12:00:00', '13:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo en lancha por el lago San Roque'),
     7000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '14:00:00', '15:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Balneario El Fantasio'),
     NULL, NULL, DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '15:30:00', '16:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Parque Estancia La Quinta'),
     NULL, NULL, DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '17:00:00', '18:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Mirador del Cerro de la Cruz'),
     NULL, NULL, DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '18:30:00', '19:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Sendero del río San Antonio'),
     NULL, NULL, DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña en el centro de Carlos Paz'),
     NULL, NULL, DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '20:00:00', '21:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cena show en el Teatro del Lago'),
     15000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '21:00:00', '22:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Bar de música en vivo'),
     NULL, NULL, DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '19:00:00', '20:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Noche de cine al aire libre'),
     NULL, NULL, DATEADD('DAY', 21, CURRENT_DATE), DATEADD('DAY', 24, CURRENT_DATE), '22:00:00', '23:00:00');

-- Alta Gracia

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Museo Manuel de Falla',
     'Visita al museo dedicado al compositor Manuel de Falla.',
     'EXPOSICION', 'CULTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Museo Manuel de Falla',
     (SELECT id FROM ubicacion WHERE direccion = 'Museo Manuel de Falla, Alta Gracia'), 2),
    ('EVENTO', 0, 'Reloj Público y Tajamar',
     'Recorrido por el reloj público y el tajamar histórico de Alta Gracia.',
     'EXPOSICION', 'HISTORIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Reloj Público y Tajamar',
     (SELECT id FROM ubicacion WHERE direccion = 'Reloj Público y Tajamar, Alta Gracia'), 1),
    ('EVENTO', 0, 'Peña gastronómica de Alta Gracia',
     'Peña con comidas típicas y música en vivo.',
     'ENCUENTRO', 'GASTRONOMIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Peña gastronómica',
     (SELECT id FROM ubicacion WHERE direccion = 'Peña gastronómica, Alta Gracia'), 3);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo Manuel de Falla'),
     NULL, NULL, DATEADD('DAY', 28, CURRENT_DATE), DATEADD('DAY', 30, CURRENT_DATE), '10:30:00', '11:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Reloj Público y Tajamar'),
     NULL, NULL, DATEADD('DAY', 28, CURRENT_DATE), DATEADD('DAY', 30, CURRENT_DATE), '14:00:00', '15:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña gastronómica de Alta Gracia'),
     NULL, NULL, DATEADD('DAY', 28, CURRENT_DATE), DATEADD('DAY', 30, CURRENT_DATE), '20:00:00', '21:00:00');

-- La Cumbrecita

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('EVENTO', 0, 'Río Almbach y pozones naturales',
     'Recorrido por el río Almbach y sus pozones naturales.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Río Almbach',
     (SELECT id FROM ubicacion WHERE direccion = 'Cascada de La Cumbrecita'), 1),
    ('EVENTO', 0, 'Mirador del Cerro Wank',
     'Caminata al mirador del Cerro Wank con vistas panorámicas.',
     'EXPOSICION', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Mirador del Cerro Wank',
     (SELECT id FROM ubicacion WHERE direccion = 'Mirador del Cerro Wank, La Cumbrecita'), 1),
    ('EVENTO', 0, 'Reserva natural de La Cumbrecita',
     'Visita interpretativa a la reserva natural y sus senderos.',
     'EXPOSICION', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Reserva natural',
     (SELECT id FROM ubicacion WHERE direccion = 'Reserva natural, La Cumbrecita'), 2),
    ('EVENTO', 0, 'Tirolesa en el bosque',
     'Descenso en tirolesa entre los árboles del bosque serrano.',
     'DEPORTIVO', 'AVENTURA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Bosque de los Pioneros',
     (SELECT id FROM ubicacion WHERE direccion = 'Bosque de los Pioneros, La Cumbrecita'), 2),
    ('EVENTO', 0, 'Cabalgata por los senderos de montaña',
     'Cabalgata guiada por los senderos de montaña de La Cumbrecita.',
     'DEPORTIVO', 'AVENTURA', 'ECUESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cabalgata de montaña',
     (SELECT id FROM ubicacion WHERE direccion = 'Cabalgata de montaña, La Cumbrecita'), 1),
    ('EVENTO', 0, 'Escalada en roca',
     'Iniciación a la escalada en roca con guía especializado.',
     'DEPORTIVO', 'AVENTURA', 'PEDESTRE', 'DE_PAGO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Escalada en roca',
     (SELECT id FROM ubicacion WHERE direccion = 'Escalada en roca, La Cumbrecita'), 3),
    ('EVENTO', 0, 'Picnic familiar en el bosque',
     'Picnic familiar con productos regionales en el bosque.',
     'ENCUENTRO', 'FAMILIAR_Y_RELAX', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Bosque de los Pioneros',
     (SELECT id FROM ubicacion WHERE direccion = 'Bosque de los Pioneros, La Cumbrecita'), 2),
    ('EVENTO', 0, 'Fogón familiar con chocolate caliente',
     'Fogón familiar con chocolate caliente y música acústica.',
     'ENCUENTRO', 'FAMILIAR_Y_RELAX', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Fogón de la montaña',
     (SELECT id FROM ubicacion WHERE direccion = 'Fogón de la montaña, La Cumbrecita'), 2),
    ('EVENTO', 0, 'Paseo relajante por el pueblo',
     'Paseo tranquilo por las calles y rincones de La Cumbrecita.',
     'ENCUENTRO', 'FAMILIAR_Y_RELAX', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Paseo del pueblo',
     (SELECT id FROM ubicacion WHERE direccion = 'Paseo del pueblo, La Cumbrecita'), 3);

INSERT INTO evento (id, monto_estimado, sitio_oficial, fecha_inicio, fecha_fin, horario_inicio, horario_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Río Almbach y pozones naturales'),
     NULL, NULL, DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Mirador del Cerro Wank'),
     NULL, NULL, DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '09:30:00', '10:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Reserva natural de La Cumbrecita'),
     NULL, NULL, DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '11:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Tirolesa en el bosque'),
     9000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '14:00:00', '15:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cabalgata por los senderos de montaña'),
     NULL, NULL, DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '15:30:00', '16:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Escalada en roca'),
     10000, 'https://turismo.cordoba.gob.ar', DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '17:00:00', '18:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Picnic familiar en el bosque'),
     NULL, NULL, DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '18:30:00', '19:30:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Fogón familiar con chocolate caliente'),
     NULL, NULL, DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '20:00:00', '21:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo relajante por el pueblo'),
     NULL, NULL, DATEADD('DAY', 35, CURRENT_DATE), DATEADD('DAY', 38, CURRENT_DATE), '21:30:00', '22:30:00');

-- Actividades nuevas

INSERT INTO propuesta_turistica
    (subtipo, version, nombre, descripcion, tipo_propuesta, categoria, modalidad, tipo_acceso,
     estado_propuesta_id, lugar_recinto, ubicacion_id, publicador_id)
VALUES
    ('ACTIVIDAD', 0, 'Senderismo guiado por los senderos de VGB',
     'Caminata guiada por los senderos naturales de Villa General Belgrano.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Senderos de Villa General Belgrano',
     (SELECT id FROM ubicacion WHERE direccion = 'Senderos de Villa General Belgrano'), 1),
    ('ACTIVIDAD', 0, 'Visita guiada a la Catedral de Córdoba',
     'Visita guiada por la Catedral de Córdoba y su historia.',
     'VISITA_GUIADA', 'CULTURA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Catedral de Córdoba',
     (SELECT id FROM ubicacion WHERE direccion = 'Catedral de Córdoba, Córdoba'), 2),
    ('ACTIVIDAD', 0, 'Kayak guiado por el lago San Roque',
     'Salida guiada en kayak por la costa del lago San Roque.',
     'DEPORTIVO', 'AVENTURA', 'NÁUTICA', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Lago San Roque',
     (SELECT id FROM ubicacion WHERE direccion = 'Lago San Roque, Carlos Paz'), 1),
    ('ACTIVIDAD', 0, 'Visita guiada al Museo Nacional Estancia Jesuítica',
     'Recorrido guiado por el Museo Nacional Estancia Jesuítica de Alta Gracia.',
     'VISITA_GUIADA', 'HISTORIA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Museo Nacional Estancia Jesuítica',
     (SELECT id FROM ubicacion WHERE direccion = 'Museo Nacional Estancia Jesuítica, Alta Gracia'), 3),
    ('ACTIVIDAD', 0, 'Trekking guiado al Cerro Wank',
     'Trekking guiado al Cerro Wank con vistas al valle.',
     'DEPORTIVO', 'NATURALEZA', 'PEDESTRE', 'GRATUITO',
     (SELECT id FROM estado_propuesta WHERE nombre = 'INICIADO'),
     'Cerro Wank',
     (SELECT id FROM ubicacion WHERE direccion = 'Cerro Wank, La Cumbrecita'), 1);

INSERT INTO actividad (id, duracion_minutos) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 180),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 60),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 120),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 60),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 120);

INSERT INTO actividad_disponibilidad (actividad_id, orden, dia_semana, hora_inicio, hora_fin) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 0, 'MONDAY', '08:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 1, 'TUESDAY', '08:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 2, 'WEDNESDAY', '08:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 3, 'THURSDAY', '08:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 4, 'FRIDAY', '08:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 5, 'SATURDAY', '08:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'), 6, 'SUNDAY', '08:00:00', '12:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 0, 'MONDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 1, 'TUESDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 2, 'WEDNESDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 3, 'THURSDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 4, 'FRIDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 5, 'SATURDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'), 6, 'SUNDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 0, 'MONDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 1, 'TUESDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 2, 'WEDNESDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 3, 'THURSDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 4, 'FRIDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 5, 'SATURDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'), 6, 'SUNDAY', '08:00:00', '11:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 0, 'MONDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 1, 'TUESDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 2, 'WEDNESDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 3, 'THURSDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 4, 'FRIDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 5, 'SATURDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'), 6, 'SUNDAY', '08:00:00', '09:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 0, 'MONDAY', '08:00:00', '10:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 1, 'TUESDAY', '08:00:00', '10:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 2, 'WEDNESDAY', '08:00:00', '10:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 3, 'THURSDAY', '08:00:00', '10:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 4, 'FRIDAY', '08:00:00', '10:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 5, 'SATURDAY', '08:00:00', '10:00:00'),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'), 6, 'SUNDAY', '08:00:00', '10:00:00');

-- ============================================================
-- IMÁGENES DE PROPUESTAS EXISTENTES SIN IMAGEN
-- ============================================================

INSERT INTO propuesta_imagen (propuesta_id, url, orden) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Caminata al Río Los Reartes'),
     'https://losreartes.gob.ar/images/actividades/yucac11b.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo de la Cerveza'),
     'https://www.cadena3.com/admin/playerswf/fotos/ARCHI_REL_811654.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Noche de cerveza artesanal'),
     'https://www.hammurabibar.com.ar/assets/img/about_3.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita a la Manzana Jesuítica'),
     'https://lp-cms-production.imgix.net/2023-07/shutterstockeditorial2317949241.jpg?ar=1%3A1&auto=format&fit=crop&q=75&w=640', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Feria de artesanos del Centro'),
     'https://live.staticflickr.com/3642/3558082972_f654dbb198_b.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña en la Cañada'),
     'https://viapais.com.ar/resizer/v2/M6XFQN4CDJEVTPJR2BYY3IF7GA.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak en el lago San Roque'),
     'https://cabanasecosdelvalle.com.ar/assets/images/galeria/rio/rio2.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Teleférico y mirador'),
     'https://villacarlospaz.tur.ar/wp-content/uploads/2020/10/cruz-1.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Teatro en Carlos Paz'),
     'https://viapais.com.ar/resizer/v2/M6XFQN4CDJEVTPJR2BYY3IF7GA.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo Casa del Che'),
     'https://www.cadena3.com/admin/playerswf/fotos/ARCHI_678417.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Feria de productores de Alta Gracia'),
     'https://www.welcomeargentina.com/villageneralbelgrano/imagenes/vgb-artesanos01.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña de los cerros'),
     'https://www.hammurabibar.com.ar/assets/img/about_3.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Bosque de los Pioneros'),
     'https://descubrirturismo.com/wp-content/uploads/2019/10/bosque.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cascada de La Cumbrecita'),
     'https://enamoratedecordoba.com.ar/download/multimedia.normal.8e68a461f044fa10.31373720636173636164612063756d6220305f6e6f726d616c2e6a7067.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Fogón bajo las estrellas'),
     'https://finistterra.com.ar/assets/events-BTuQws1n.webp', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada por el Casco Histórico'),
     'https://lp-cms-production.imgix.net/2023-07/shutterstockeditorial2317949241.jpg?ar=1%3A1&auto=format&fit=crop&q=75&w=640', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo en el Cerro de la Cruz'),
     'https://villacarlospaz.tur.ar/wp-content/uploads/2020/10/cruz-1.jpg', 0);

-- ============================================================
-- IMÁGENES DE LAS PROPUESTAS NUEVAS
-- ============================================================

INSERT INTO propuesta_imagen (propuesta_id, url, orden) VALUES
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Senderismo guiado por los senderos de VGB'),
     'https://cdn.tourcms.com/a/5970/305/7/default.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Degustación en el Parque Cervecero'),
     'https://www.cadena3.com/admin/playerswf/fotos/ARCHI_REL_811654.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Feria de productores y artesanos de VGB'),
     'https://www.welcomeargentina.com/villageneralbelgrano/imagenes/vgb-artesanos01.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo por el Río Los Reartes'),
     'https://cabanasecosdelvalle.com.ar/assets/images/galeria/rio/rio2.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Noche de música en vivo en la Plaza José Hernández'),
     'https://www.hammurabibar.com.ar/assets/img/about_3.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cena con food trucks y cerveza artesanal'),
     'https://viapais.com.ar/resizer/v2/DD7IGVD7NZFGJDELBEWYRZFQ3Y.png', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada a la Catedral de Córdoba'),
     'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Interior_de_la_Catedral_de_la_Ciudad_de_Cordoba.JPG/760px-Mapcarta.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo del Buen Pastor'),
     'https://tribuna.com.ar/download/multimedia.normal.a77c29be37ccb1db.wrRQYXNlby1kZWwtYnVlbi1wYXN0b3ItMV9ub3JtYWwuanBn.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo Emilio Caraffa'),
     'https://image.wmsm.co/64455957966c3/museo-emilio-caraffa-cordoba.webp?aspect_ratio=1296%3A729&height=729&quality=80&width=1296', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cabildo de Córdoba'),
     'https://tn.com.ar/resizer/v2/cabildo-de-cordoba-foto-gentileza-eduardo-lazzari-MJJNDP4HPZGKFEHIIO3Z4CM4Q4.jpg?auth=247ee2947a4c57798eb8b7399c186008e371b32823a4e7ca1cff7a44445aa231&width=767', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Iglesia de los Capuchinos'),
     'https://bahiacesar.com/wp-content/uploads/2018/04/iglesia-de-los-capuchinos-cc3b3rdoba-2017-4.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo de las Artes de Güemes'),
     'https://live.staticflickr.com/3642/3558082972_f654dbb198_b.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Kayak guiado por el lago San Roque'),
     'https://cabanasecosdelvalle.com.ar/assets/images/galeria/rio/rio2.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Parque de aventura en las sierras'),
     'https://www.viapais.com.ar/resizer/v2/IECEISK3ERENXE535DQMOD6XOY.png?auth=2666867e7d704a9a465de8bd8d7eea4cd5f46d0abcc0dd661228257256134bb1&height=720&width=1280', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Tirolesa en el valle de Punilla'),
     'https://www.viapais.com.ar/resizer/v2/IECEISK3ERENXE535DQMOD6XOY.png?auth=2666867e7d704a9a465de8bd8d7eea4cd5f46d0abcc0dd661228257256134bb1&height=720&width=1280', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cabalgata por las sierras de Carlos Paz'),
     'https://cdn.tourcms.com/a/5970/305/7/default.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo en lancha por el lago San Roque'),
     'https://cabanasecosdelvalle.com.ar/assets/images/galeria/rio/rio2.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Balneario El Fantasio'),
     'https://www.lacumbrecita.gob.ar/images/btn/rincon-olla.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Parque Estancia La Quinta'),
     'https://descubrirturismo.com/wp-content/uploads/2019/10/bosque.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Mirador del Cerro de la Cruz'),
     'https://villacarlospaz.tur.ar/wp-content/uploads/2020/10/cruz-1.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Sendero del río San Antonio'),
     'https://cabanasecosdelvalle.com.ar/assets/images/galeria/rio/rio2.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña en el centro de Carlos Paz'),
     'https://www.hammurabibar.com.ar/assets/img/about_3.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cena show en el Teatro del Lago'),
     'https://viapais.com.ar/resizer/v2/M6XFQN4CDJEVTPJR2BYY3IF7GA.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Bar de música en vivo'),
     'https://www.hammurabibar.com.ar/assets/img/about_3.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Noche de cine al aire libre'),
     'https://finistterra.com.ar/assets/events-BTuQws1n.webp', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Visita guiada al Museo Nacional Estancia Jesuítica'),
     'https://tn.com.ar/resizer/v2/el-museo-nacional-estancia-jesuitica-de-alta-gracia-foto-turismo-de-cordoba-Y6AYT3CJ3FH4BLEA525XY6QDL4.jpeg?auth=72a0b18d2d6efad1f4ae893f724f3efad440b35c9ca11ef37d13687f97528bd6&width=1440', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Museo Manuel de Falla'),
     'https://www.cultura.gob.ar/media/uploads/pianodefallaenaltagraciacadena3.com.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Reloj Público y Tajamar'),
     'https://static.wixstatic.com/media/491e57_f7d110aff95c49e5b0cf24e259decd9a~mv2.jpg/v1/fill/w_980%2Ch_735%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/491e57_f7d110aff95c49e5b0cf24e259decd9a~mv2.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Peña gastronómica de Alta Gracia'),
     'https://www.hammurabibar.com.ar/assets/img/about_3.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Trekking guiado al Cerro Wank'),
     'https://www.cadena3.com/admin/playerswf/fotos/ARCHI_REL_813154.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Río Almbach y pozones naturales'),
     'https://www.lacumbrecita.gob.ar/images/btn/rincon-olla.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Mirador del Cerro Wank'),
     'https://www.cadena3.com/admin/playerswf/fotos/ARCHI_REL_813154.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Reserva natural de La Cumbrecita'),
     'https://www.lacumbrecita.gob.ar/images/btn/rincon-olla.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Tirolesa en el bosque'),
     'https://www.viapais.com.ar/resizer/v2/IECEISK3ERENXE535DQMOD6XOY.png?auth=2666867e7d704a9a465de8bd8d7eea4cd5f46d0abcc0dd661228257256134bb1&height=720&width=1280', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Cabalgata por los senderos de montaña'),
     'https://cdn.tourcms.com/a/5970/305/7/default.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Escalada en roca'),
     'https://www.cadena3.com/admin/playerswf/fotos/ARCHI_REL_813154.jpg', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Picnic familiar en el bosque'),
     'https://finistterra.com.ar/assets/events-BTuQws1n.webp', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Fogón familiar con chocolate caliente'),
     'https://finistterra.com.ar/assets/events-BTuQws1n.webp', 0),
    ((SELECT id FROM propuesta_turistica WHERE nombre = 'Paseo relajante por el pueblo'),
     'https://www.welcomeargentina.com/villageneralbelgrano/imagenes/vgb-artesanos01.jpg', 0);

-- ============================================================
-- VIAJES SUGERIDOS PARA TURISTAS
-- ============================================================
--
-- `Viaje.zonaInteres` es una asociación `@ManyToOne` a `Ubicacion` (columna
-- `zona_interes_id`). Se referencia por ciudad para no depender del orden de
-- inserción de las ubicaciones.
--
-- Las fechas son relativas a hoy (mismo criterio que los eventos) para que el
-- demo tenga siempre viajes futuros.

INSERT INTO viaje (
    nombre,
    zona_interes_id,
    rango_interes_km,
    fecha_inicio,
    fecha_fin,
    ritmo,
    estado,
    usuario
)
VALUES (
    'Escapada serrana por Villa General Belgrano',
    (SELECT id FROM ubicacion WHERE ciudad = 'Villa General Belgrano' AND direccion IS NULL),
    35,
    DATEADD('DAY', 7, CURRENT_TIMESTAMP),
    DATEADD('DAY', 9, CURRENT_TIMESTAMP),
    'EQUILIBRADO',
    'PLANIFICADO',
    'turista.demo@viajesazo.com'
);

INSERT INTO viaje (
    nombre,
    zona_interes_id,
    rango_interes_km,
    fecha_inicio,
    fecha_fin,
    ritmo,
    estado,
    usuario
)
VALUES (
    'Cultura y naturaleza en Córdoba',
    (SELECT id FROM ubicacion WHERE ciudad = 'Ciudad de Córdoba' AND direccion IS NULL),
    50,
    DATEADD('DAY', 14, CURRENT_TIMESTAMP),
    DATEADD('DAY', 17, CURRENT_TIMESTAMP),
    'TRANQUILO',
    'PLANIFICADO',
    'turista.demo@viajesazo.com'
);

INSERT INTO viaje (
    nombre,
    zona_interes_id,
    rango_interes_km,
    fecha_inicio,
    fecha_fin,
    ritmo,
    estado,
    usuario
)
VALUES (
    'Aventura en el Valle de Punilla',
    (SELECT id FROM ubicacion WHERE ciudad = 'Carlos Paz' AND direccion IS NULL),
    45,
    DATEADD('DAY', 21, CURRENT_TIMESTAMP),
    DATEADD('DAY', 24, CURRENT_TIMESTAMP),
    'INTENSIVO',
    'PLANIFICADO',
    'turista.aventura@viajesazo.com'
);

INSERT INTO viaje (
    nombre,
    zona_interes_id,
    rango_interes_km,
    fecha_inicio,
    fecha_fin,
    ritmo,
    estado,
    usuario
)
VALUES (
    'Sabores y tradiciones de Córdoba',
    (SELECT id FROM ubicacion WHERE ciudad = 'Alta Gracia' AND direccion IS NULL),
    30,
    DATEADD('DAY', 28, CURRENT_TIMESTAMP),
    DATEADD('DAY', 30, CURRENT_TIMESTAMP),
    'TRANQUILO',
    'PLANIFICADO',
    'turista.gastronomico@viajesazo.com'
);

INSERT INTO viaje (
    nombre,
    zona_interes_id,
    rango_interes_km,
    fecha_inicio,
    fecha_fin,
    ritmo,
    estado,
    usuario
)
VALUES (
    'Recorrido familiar por las sierras',
    (SELECT id FROM ubicacion WHERE ciudad = 'La Cumbrecita' AND direccion IS NULL),
    40,
    DATEADD('DAY', 35, CURRENT_TIMESTAMP),
    DATEADD('DAY', 38, CURRENT_TIMESTAMP),
    'EQUILIBRADO',
    'PLANIFICADO',
    'familia.demo@viajesazo.com'
);

-- ============================================================
-- INTERESES DE LOS VIAJES DEL SEED
-- ============================================================
-- Sin intereses, la estrategia INTERESES queda empatada y el circuito no
-- refleja las preferencias del turista.

INSERT INTO viaje_intereses_categoria (viaje_id, categoria)
VALUES
    ((SELECT id FROM viaje WHERE nombre = 'Escapada serrana por Villa General Belgrano'), 'NATURALEZA'),
    ((SELECT id FROM viaje WHERE nombre = 'Escapada serrana por Villa General Belgrano'), 'GASTRONOMIA'),
    ((SELECT id FROM viaje WHERE nombre = 'Escapada serrana por Villa General Belgrano'), 'VIDA_NOCTURNA'),
    ((SELECT id FROM viaje WHERE nombre = 'Cultura y naturaleza en Córdoba'), 'CULTURA'),
    ((SELECT id FROM viaje WHERE nombre = 'Cultura y naturaleza en Córdoba'), 'HISTORIA'),
    ((SELECT id FROM viaje WHERE nombre = 'Cultura y naturaleza en Córdoba'), 'COMPRAS'),
    ((SELECT id FROM viaje WHERE nombre = 'Aventura en el Valle de Punilla'), 'AVENTURA'),
    ((SELECT id FROM viaje WHERE nombre = 'Aventura en el Valle de Punilla'), 'NATURALEZA'),
    ((SELECT id FROM viaje WHERE nombre = 'Aventura en el Valle de Punilla'), 'VIDA_NOCTURNA'),
    ((SELECT id FROM viaje WHERE nombre = 'Sabores y tradiciones de Córdoba'), 'GASTRONOMIA'),
    ((SELECT id FROM viaje WHERE nombre = 'Sabores y tradiciones de Córdoba'), 'HISTORIA'),
    ((SELECT id FROM viaje WHERE nombre = 'Sabores y tradiciones de Córdoba'), 'CULTURA'),
    ((SELECT id FROM viaje WHERE nombre = 'Recorrido familiar por las sierras'), 'NATURALEZA'),
    ((SELECT id FROM viaje WHERE nombre = 'Recorrido familiar por las sierras'), 'AVENTURA'),
    ((SELECT id FROM viaje WHERE nombre = 'Recorrido familiar por las sierras'), 'FAMILIAR_Y_RELAX');
