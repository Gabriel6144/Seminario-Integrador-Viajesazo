-- Datos de arranque para la demo. El esquema se recrea en cada arranque
-- (ddl-auto=create-drop), así que sin este script la aplicación levanta vacía.
--
-- Las fechas son relativas a CURRENT_DATE a propósito: la agenda semanal consulta
-- desde hoy hasta el domingo, así que con fechas fijas el demo dejaría de tener
-- eventos en pantalla ni un mes después de escribirlo. Se siembra una semana hacia
-- atrás y dos hacia adelante, para que siempre haya algo en la ventana sea cual
-- sea el día de la semana en el que se levante la aplicación.

INSERT INTO publicador (nombre, email, telefono) VALUES
	('Turismo Córdoba', 'info@cordoba.gob.ar', '0351-1234567'),
	('Municipalidad de Cosquín', 'cosquin@cordoba.gob.ar', '0351-4601002'),
	('Asociación de Artesanos', 'artesanos@cordoba.gob.ar', '0351-4210999');

-- Categoria se persiste como STRING: va el nombre de la constante en mayúsculas.
INSERT INTO evento (nombre, descripcion, categoria, localidad, direccion,
		fecha_inicio, fecha_fin, horario_inicio, horario_fin, publicador_id) VALUES
	('Festival de Folklore', 'Encuentro de syrigamis y danzas tradicionales.', 'CULTURA',
		'Cosquín', 'Plaza Pringles',
		DATEADD('DAY', -2, CURRENT_DATE), DATEADD('DAY', 1, CURRENT_DATE), '20:00', '23:30',
		(SELECT id FROM publicador WHERE email = 'info@cordoba.gob.ar')),

	('Exposición de artesanías', 'Muestra de cerámica y tejido de la región.', 'CULTURA',
		'Alta Gracia', 'Museo Jesús L. Werribar',
		DATEADD('DAY', 0, CURRENT_DATE), DATEADD('DAY', 3, CURRENT_DATE), '10:00', '18:00',
		(SELECT id FROM publicador WHERE email = 'artesanos@cordoba.gob.ar')),

	('Gastronomía de la estancia', 'Mesa de comida casera, vinos y parrilla a la parrilla.', 'GASTRONOMIA',
		'Alta Gracia', 'Estancia Los Quebrachos',
		DATEADD('DAY', 1, CURRENT_DATE), DATEADD('DAY', 1, CURRENT_DATE), '12:30', '16:00',
		(SELECT id FROM publicador WHERE email = 'info@cordoba.gob.ar')),

	('Cabalgata por las Sierras', 'Recorrido guiado con guía local.', 'AVENTURA',
		'Villa del Carmen', 'Plaza Central',
		DATEADD('DAY', 2, CURRENT_DATE), DATEADD('DAY', 2, CURRENT_DATE), '08:30', '13:00',
		(SELECT id FROM publicador WHERE email = 'cosquin@cordoba.gob.ar')),

	('Festival de la Buena Mesa', 'Tres días de gastronomía regional con cocineros invitados.', 'GASTRONOMIA',
		'Villa Grimaldi', 'Predio Tinkal',
		DATEADD('DAY', 4, CURRENT_DATE), DATEADD('DAY', 6, CURRENT_DATE), '19:00', '23:59',
		(SELECT id FROM publicador WHERE email = 'info@cordoba.gob.ar')),

	('Tarde de campo y avistamiento de aves', 'Actividad familiar al aire libre.', 'FAMILIA',
		'Alta Gracia', 'Reserva Natural Los Molinos',
		DATEADD('DAY', 5, CURRENT_DATE), DATEADD('DAY', 5, CURRENT_DATE), '15:00', '18:00',
		(SELECT id FROM publicador WHERE email = 'cosquin@cordoba.gob.ar')),

	('Caminata al Cerro San Bernardo', 'Salida de montaña de dificultad media.', 'NATURALEZA',
		'La Cruz', 'Club Andino Villaody',
		DATEADD('DAY', 9, CURRENT_DATE), DATEADD('DAY', 9, CURRENT_DATE), '07:00', '14:00',
		(SELECT id FROM publicador WHERE email = 'info@cordoba.gob.ar'));

INSERT INTO evento_imagen (evento_id, url) VALUES
	((SELECT id FROM evento WHERE nombre = 'Festival de Folklore'),
		'https://cdn.cordoba.gob.ar/folklore-cosquin.jpg'),
	((SELECT id FROM evento WHERE nombre = 'Festival de Folklore'),
		'https://cdn.cordoba.gob.ar/folklore-noche.jpg'),
	((SELECT id FROM evento WHERE nombre = 'Exposición de artesanías'),
		'https://cdn.cordoba.gob.ar/artesanias-alta-gracia.jpg'),
	((SELECT id FROM evento WHERE nombre = 'Cabalgata por las Sierras'),
		'https://cdn.cordoba.gob.ar/cabalgata-sierras.jpg'),
	((SELECT id FROM evento WHERE nombre = 'Caminata al Cerro San Bernardo'),
		'https://cdn.cordoba.gob.ar/san-bernardo.jpg');
