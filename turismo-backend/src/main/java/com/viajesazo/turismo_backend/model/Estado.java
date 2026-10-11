package com.viajesazo.turismo_backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "estado")

public class Estado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50)
    private String ambito;
    
    @Column(length = 180)
    private String nombre;

    @Column(length = 300)  
    private String descripcion;
}
