package com.viajesazo.turismo_backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.viajesazo.turismo_backend.model.Circuito;
import com.viajesazo.turismo_backend.model.CircuitoAlternativa;
import com.viajesazo.turismo_backend.model.CircuitoItem;
import com.viajesazo.turismo_backend.model.EstadoViaje;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.model.TipoRitmo;
import com.viajesazo.turismo_backend.model.Ubicacion;
import com.viajesazo.turismo_backend.model.Viaje;
import com.viajesazo.turismo_backend.model.CircuitStrategy;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@DataJpaTest
class CircuitoRepositoryTest {

	@Autowired
	private CircuitoRepository circuitoRepository;

	@Autowired
	private ViajeRepository viajeRepository;

	@PersistenceContext
	private EntityManager entityManager;

	@Test
	@DisplayName("VZ-25: al recargar el circuito los ítems mantienen el orden y no aparecen nulos")
	void reloadsItemsInOrderWithoutNulls() {
		Viaje viaje = viajeRepository.save(Viaje.builder()
				.nombre("Viaje de prueba")
				.zonaInteres(Ubicacion.builder().ciudad("Córdoba").localidad("Córdoba").build())
				.rangoInteresKm(40.0)
				.fechaInicio(LocalDate.parse("2026-11-01"))
				.fechaFin(LocalDate.parse("2026-11-03"))
				.ritmo(TipoRitmo.EQUILIBRADO)
				.estado(EstadoViaje.PLANIFICADO)
				.usuario("turista@test.com")
				.build());

		Circuito circuito = new Circuito();
		circuito.setViaje(viaje);
		circuito.setGeneradoEn(LocalDateTime.parse("2026-10-20T12:00:00"));

		CircuitoAlternativa alternativa = new CircuitoAlternativa();
		alternativa.setEstrategia(CircuitStrategy.CERCANIA);
		alternativa.setDistanciaTotalKm(10.0);
		alternativa.setAfinidadIntereses(0.5);
		circuito.addAlternativa(alternativa);

		alternativa.addItem(item(1, LocalTime.parse("09:00:00")));
		alternativa.addItem(item(2, LocalTime.parse("12:00:00")));

		circuitoRepository.saveAndFlush(circuito);
		entityManager.clear();

		Circuito reloaded = circuitoRepository.findByViajeId(viaje.getId()).orElseThrow();

		assertThat(reloaded.getAlternativas()).hasSize(1);
		assertThat(reloaded.getAlternativas().get(0).getItems())
				.extracting(CircuitoItem::getOrden)
				.containsExactly(1, 2);
		CircuitoItem first = reloaded.getAlternativas().get(0).getItems().get(0);
		assertThat(first.getImagenes()).containsExactly("https://imagen.test/evento.jpg");
		assertThat(first.getCiudad()).isEqualTo("Córdoba");
		assertThat(first.getLocalidad()).isEqualTo("Nueva Córdoba");
		assertThat(first.getDireccion()).isEqualTo("Av. Hipólito Yrigoyen 325");
		assertThat(first.getLugarRecinto()).isEqualTo("Paseo del Buen Pastor");
		assertThat(first.getLatitud()).isEqualByComparingTo("-31.4");
		assertThat(first.getLongitud()).isEqualByComparingTo("-64.2");
		assertThat(first.getTipoAcceso()).isEqualTo(TipoAcceso.DE_PAGO);
		assertThat(first.getMontoEstimado()).isEqualByComparingTo("1500.00");
		assertThat(first.getDuracionMinutos()).isEqualTo(60);
	}

	private CircuitoItem item(int orden, LocalTime inicio) {
		CircuitoItem item = new CircuitoItem();
		item.setPropuestaId((long) orden);
		item.setPropuestaNombre("Propuesta " + orden);
		item.setTipo(TipoRegistro.EVENTO);
		item.setFecha(LocalDate.parse("2026-11-01"));
		item.setOrden(orden);
		item.setHoraInicio(inicio);
		item.setHoraFin(inicio.plusHours(1));
		item.setTrasladoKm(0.0);
		item.setTrasladoMinutos(0);
		item.setDisponible(true);
		item.setImagenes(List.of("https://imagen.test/evento.jpg"));
		item.setCiudad("Córdoba");
		item.setLocalidad("Nueva Córdoba");
		item.setDireccion("Av. Hipólito Yrigoyen 325");
		item.setLugarRecinto("Paseo del Buen Pastor");
		item.setLatitud(BigDecimal.valueOf(-31.4));
		item.setLongitud(BigDecimal.valueOf(-64.2));
		item.setTipoAcceso(TipoAcceso.DE_PAGO);
		item.setMontoEstimado(BigDecimal.valueOf(1500));
		item.setDescripcionArancel("Entrada general");
		item.setSitioOficial("https://evento.test");
		item.setDuracionMinutos(60);
		return item;
	}
}
