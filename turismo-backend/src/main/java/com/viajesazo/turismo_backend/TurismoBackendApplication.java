package com.viajesazo.turismo_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TurismoBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(TurismoBackendApplication.class, args);
	}

}
