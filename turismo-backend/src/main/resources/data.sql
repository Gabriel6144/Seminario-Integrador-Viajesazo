-- Datos de arranque para la demo. El esquema se recrea en cada arranque
-- (ddl-auto=create-drop), así que sin este script la aplicación levanta vacía.
--
-- Las fechas son relativas a CURRENT_DATE a propósito: la agenda semanal consulta
-- desde hoy hasta el domingo, así que con fechas fijas el demo dejaría de tener
-- eventos en pantalla ni un mes después de escribirlo. Se siembra una semana hacia
-- atrás y dos hacia adelante, para que siempre haya algo en la ventana sea cual
-- sea el día de la semana en el que se levante la aplicación.
--
-- Los eventos ahora llevan tipo_acceso / estado_propuesta (NOT NULL) y las
-- coordenadas que el backend resolvería con Nominatim al darlos de alta por la API.
-- En el seed se cargan a mano para que el mapa tenga contenido desde el arranque.

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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, monto_estimado, sitio_oficial, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Cosquín Rock',
    'Uno de los festivales de música más importantes de Argentina, con artistas nacionales e internacionales y múltiples escenarios.',
    'DE_PAGO',
    'INICIADO',
    70000,
    'https://cosquinrock.net',
    'Aeródromo de Santa María de Punilla',
    'Santa María de Punilla',
    'Ruta Provincial E55 Km 6, Santa María de Punilla',
    -31.3932,
    -64.5146,
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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, monto_estimado, sitio_oficial, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Festival Nacional de Folklore de Cosquín',
    'Tradicional festival folklórico que reúne música, danza y expresiones culturales argentinas en la ciudad de Cosquín.',
    'DE_PAGO',
    'INICIADO',
    25000,
    'https://festivaldecosquin.com',
    'Plaza Próspero Molina',
    'Cosquín',
    'Av. San Martín 800, Cosquín',
    -31.4135,
    -64.4947,
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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, monto_estimado, sitio_oficial, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Oktoberfest',
    'Fiesta Nacional de la Cerveza celebrada en Villa General Belgrano, con gastronomía, música, espectáculos y tradiciones centroeuropeas.',
    'DE_PAGO',
    'INICIADO',
    15000,
    'https://oktoberfestargentina.com.ar',
    'Parque Cervecero',
    'Villa General Belgrano',
    'Julio A. Roca s/n, Villa General Belgrano',
    -31.9545,
    -64.5553,
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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, monto_estimado, sitio_oficial, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Peperina',
    'Festival gastronómico que reúne productores, cocineros y propuestas de la gastronomía argentina en Alta Gracia.',
    'DE_PAGO',
    'INICIADO',
    10000,
    'https://peperina.gob.ar',
    'Predio del Ferrocarril',
    'Alta Gracia',
    'Rafael Lozada 1250, Alta Gracia',
    -31.6550,
    -64.4297,
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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Fiesta de las Colectividades',
    'Evento cultural y gastronómico que reúne las tradiciones, comidas, música y danzas de diferentes comunidades en Alta Gracia.',
    'GRATUITO',
    'INICIADO',
    'Parque García Lorca',
    'Alta Gracia',
    'Av. Presidente Perón 1000, Alta Gracia',
    -31.6565,
    -64.4275,
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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, monto_estimado, sitio_oficial, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Festival Nacional de Doma y Folklore de Jesús María',
    'Festival tradicional argentino que combina espectáculos de doma, música folklórica, gastronomía y actividades culturales.',
    'DE_PAGO',
    'INICIADO',
    30000,
    'https://festival.org.ar',
    'Campo de la Doma',
    'Jesús María',
    'Av. Bamba s/n, Jesús María',
    -30.9820,
    -64.0920,
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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, monto_estimado, sitio_oficial, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Festival Internacional de Peñas',
    'Importante festival musical de Villa María que reúne artistas nacionales e internacionales y propuestas culturales.',
    'DE_PAGO',
    'INICIADO',
    20000,
    'https://festivaldepenas.com.ar',
    'Anfiteatro de Villa María',
    'Villa María',
    'Bv. España 300, Villa María',
    -32.4075,
    -63.2401,
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

INSERT INTO evento (nombre, descripcion, tipo_acceso, estado_propuesta, lugar_recinto, localidad, direccion, latitud, longitud, fecha_inicio, fecha_fin, publicador_id)
VALUES (
    'Masa Vienesa',
    'Tradicional celebración gastronómica de Villa General Belgrano con productos de pastelería, chocolate y especialidades centroeuropeas.',
    'GRATUITO',
    'INICIADO',
    'Plaza José Hernández',
    'Villa General Belgrano',
    'Av. San Martín 100, Villa General Belgrano',
    -31.9553,
    -64.5555,
    '2026-04-02',
    '2026-04-05',
    1
);

INSERT INTO evento_imagen (evento_id, url)
VALUES (
    (SELECT id FROM evento WHERE nombre = 'Masa Vienesa'),
    'https://villageneralbelgrano.gob.ar//wp-content/uploads/2026/02/Logo-masa56_Mesa-de-trabajo-1-300x206.png'
);


-- ============================================================
-- VIAJES SUGERIDOS PARA TURISTAS
-- ============================================================
--
-- `Viaje.zonaInteres` es una asociación `@ManyToOne` a `Ubicacion` (columna
-- `zona_interes_id`), así que primero se siembran las ubicaciones y luego se
-- referencian por id. El estado va en 'PLANIFICADO' a propósito: VZ-22 lista los
-- viajes con `estado <> 'CANCELADO'`, y una fila con estado NULL quedaría fuera
-- de la comparación (NULL <> 'X' no es verdadero).
--
-- Las fechas son relativas a hoy (mismo criterio que los eventos) para que el
-- demo tenga siempre viajes futuros.

INSERT INTO ubicacion (ciudad, localidad, latitud, longitud) VALUES
    ('Villa General Belgrano', 'Córdoba', -31.95, -64.55),
    ('Ciudad de Córdoba', 'Córdoba', -31.42, -64.18),
    ('Carlos Paz', 'Córdoba', -31.42, -64.50),
    ('Alta Gracia', 'Córdoba', -31.65, -64.43),
    ('La Cumbrecita', 'Córdoba', -31.90, -64.77);

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
    1,
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
    2,
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
    3,
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
    4,
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
    5,
    40,
    DATEADD('DAY', 35, CURRENT_TIMESTAMP),
    DATEADD('DAY', 38, CURRENT_TIMESTAMP),
    'EQUILIBRADO',
    'PLANIFICADO',
    'familia.demo@viajesazo.com'
);
