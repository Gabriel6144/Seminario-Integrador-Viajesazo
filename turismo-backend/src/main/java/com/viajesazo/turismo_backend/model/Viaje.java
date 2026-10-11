package com.viajesazo.turismo_backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "viaje")

public class Viaje {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 120)
    private String nombre;

    @Column (nullable = false, length = 180)
    private String zonaInteres; 

    @Column(nullable = false)
    private double rangoInteresKm;

    @Column(nullable = false)
    private LocalDateTime fechaInicio;

    @Column(nullable = false)
    private LocalDateTime fechaFin;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private TipoRitmo ritmo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estado_id")
    private Estado estado;

    // Usuario entiendo lo vemos en el utlimo Sprint, por ahora diría dejarlo como String
    @Column(nullable = false, length = 120)
    private String usuario;


}
