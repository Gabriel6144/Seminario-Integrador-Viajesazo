package com.viajesazo.turismo_backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.response.PropuestaInscriptosResponse;
import com.viajesazo.turismo_backend.dto.response.PublicadorAgendaItemResponse;
import com.viajesazo.turismo_backend.dto.response.PublicadorDashboardResponse;
import com.viajesazo.turismo_backend.service.InscriptosService;
import com.viajesazo.turismo_backend.service.PublicadorAgendaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/publicador")
@RequiredArgsConstructor
public class PublicadorInscriptosController {

	private final InscriptosService inscriptosService;
	private final PublicadorAgendaService publicadorAgendaService;

	@GetMapping("/inscriptos")
	public List<PropuestaInscriptosResponse> listar() {
		return inscriptosService.listarPropias();
	}

	@GetMapping("/agenda")
	public List<PublicadorAgendaItemResponse> agenda() {
		return publicadorAgendaService.listarAgenda();
	}

	@GetMapping("/fechas-ocupadas")
	public List<LocalDate> fechasOcupadas() {
		return publicadorAgendaService.listarFechasOcupadas();
	}

	@GetMapping("/dashboard")
	public PublicadorDashboardResponse dashboard() {
		return publicadorAgendaService.getDashboard();
	}

}
