package com.viajesazo.turismo_backend.mapper;

import java.util.List;

import org.springframework.stereotype.Component;

import com.viajesazo.turismo_backend.dto.response.PropuestaResumenResponse;
import com.viajesazo.turismo_backend.model.Actividad;
import com.viajesazo.turismo_backend.model.Evento;
import com.viajesazo.turismo_backend.model.PropuestaTuristica;
import com.viajesazo.turismo_backend.model.Ubicacion;

/**
 * El listado unificado devuelve columnas de ambos subtipos, asi que el mapeo necesita
 * saber que hay detras de la propuesta. MapStruct no puede resolverlo sin un metodo por
 * tipo; es mas simple un mapeo explicito en un solo lugar.
 */
@Component
public class PropuestaResumenMapper {

	public PropuestaResumenResponse toResponse(PropuestaTuristica propuesta) {
		Evento evento = propuesta instanceof Evento e ? e : null;
		Actividad actividad = propuesta instanceof Actividad a ? a : null;
		Ubicacion ubicacion = propuesta.getUbicacion();
		return new PropuestaResumenResponse(
				propuesta.getId(),
				propuesta.getTipo(),
				propuesta.getNombre(),
				propuesta.getDescripcion(),
				propuesta.getTipoPropuesta(),
				propuesta.getCategoria(),
				propuesta.getModalidad(),
				propuesta.getTipoAcceso(),
				propuesta.getEstadoPropuesta(),
				propuesta.getLugarRecinto(),
				ubicacion == null ? null : ubicacion.getLocalidad(),
				ubicacion == null ? null : ubicacion.getDireccion(),
				ubicacion == null ? null : ubicacion.getLatitud(),
				ubicacion == null ? null : ubicacion.getLongitud(),
				evento == null ? null : evento.getFechaInicio(),
				evento == null ? null : evento.getFechaFin(),
				evento == null ? null : evento.getHorarioInicio(),
				evento == null ? null : evento.getHorarioFin(),
				actividad == null ? null : actividad.getDuracionMinutos(),
				imagenes(propuesta),
				propuesta.getPublicador() == null ? null : propuesta.getPublicador().getId(),
				propuesta.getPublicador() == null ? null : propuesta.getPublicador().getNombre());
	}

	private List<String> imagenes(PropuestaTuristica propuesta) {
		return propuesta.getImagenes() == null ? List.of() : List.copyOf(propuesta.getImagenes());
	}
}
