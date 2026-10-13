package com.viajesazo.turismo_backend.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.Builder;


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


    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, optional = false)
    @JoinColumn(name = "zona_interes_id", nullable = false)
    private Ubicacion zonaInteres; 

    @Column(nullable = false)
    private double rangoInteresKm;

    @Column(nullable = false)
    private LocalDateTime fechaInicio;

    @Column(nullable = false)
    private LocalDateTime fechaFin;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private TipoRitmo ritmo;


    @ElementCollection
    @Enumerated(EnumType.STRING)
    @CollectionTable(
        name = "viaje_intereses_categoria",
        joinColumns = @JoinColumn(name = "viaje_id")
    )
    @Column(name = "categoria", nullable = false, length = 50)
    @Builder.Default
    private List<InteresCategoria> interesesCategoria = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private EstadoViaje estado;

    // Usuario entiendo lo vemos en el utlimo Sprint, por ahora diría dejarlo como String
    @Column(nullable = false, length = 120)
    private String usuario;


}
