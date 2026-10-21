package com.viajesazo.turismo_backend.model;

/**
 * Naturaleza turística de una propuesta. Un evento acepta los tipos masivos (feria, festival,
 * congreso...); una actividad acepta los que se pueden itinerar por franjas horarias (visita
 * guiada y deportivo). La relación se valida en cada subtipo con {@code tiposPermitidos()}.
 */
public enum TipoPropuesta {
	FERIA,
	CONGRESO,
	ENCUENTRO,
	DEPORTIVO,
	ESPECTACULO,
	JORNADA,
	EXPOSICION,
	VISITA_GUIADA,
	FESTIVAL
}
