package com.viajesazo.turismo_backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.viajesazo.turismo_backend.dto.response.AdminDashboardResponse;
import com.viajesazo.turismo_backend.service.DashboardService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class DashboardController {

	private final DashboardService dashboardService;

	@GetMapping("/dashboard")
	public AdminDashboardResponse dashboard() {
		return dashboardService.getDashboard();
	}

}
