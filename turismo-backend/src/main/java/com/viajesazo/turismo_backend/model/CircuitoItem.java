package com.viajesazo.turismo_backend.model;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "circuito_item")
@Getter
@Setter
@NoArgsConstructor
public class CircuitoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alternativa_id", nullable = false)
    private CircuitoAlternativa alternativa;

    @Column(nullable = false)
    private Long propuestaId;

    @Column(nullable = false, length = 150)
    private String propuestaNombre;

    @Column(length = 1000)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private InteresCategoria categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TipoRegistro tipo;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private int orden;

    private LocalTime horaInicio;
    private LocalTime horaFin;

    @Column(nullable = false)
    private double trasladoKm;

    @Column(nullable = false)
    private int trasladoMinutos;

    @Column(nullable = false)
    private boolean disponible = true;

    @Column(length = 300)
    private String motivoNoDisponible;
}
