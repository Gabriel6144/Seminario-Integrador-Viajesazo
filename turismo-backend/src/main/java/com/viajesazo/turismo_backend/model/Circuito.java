package com.viajesazo.turismo_backend.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "circuito")
@Getter
@Setter
@NoArgsConstructor
public class Circuito {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viaje_id", nullable = false, unique = true)
    private Viaje viaje;

    @Column(nullable = false)
    private LocalDateTime generadoEn;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private CircuitStrategy estrategiaSeleccionada;

    @Column(nullable = false)
    private boolean distanciasEstimadas;

    @Column(length = 500)
    private String advertencia;

    @OneToMany(mappedBy = "circuito", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CircuitoAlternativa> alternativas = new ArrayList<>();

    public void addAlternativa(CircuitoAlternativa alternativa) {
        alternativas.add(alternativa);
        alternativa.setCircuito(this);
    }
}
