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
    
    @Column(length = 120)
    private String nombre;


    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, optional = true)
    @JoinColumn(name = "zona_interes_id", nullable = true)
    private Ubicacion zonaInteres; 

    @Column
    private Double rangoInteresKm;

    @Column
    private LocalDateTime fechaInicio;

    @Column
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

    @Column
    private Integer pasoActual;

    // Usuario entiendo lo vemos en el utlimo Sprint, por ahora diría dejarlo como String
    @Column(nullable = false, length = 120)
    private String usuario;


}
