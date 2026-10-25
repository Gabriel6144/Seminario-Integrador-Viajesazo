package com.viajesazo.turismo_backend.model;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;

import com.viajesazo.turismo_backend.exception.BusinessRuleException;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
    private LocalDate fechaInicio;

    @Column
    private LocalDate fechaFin;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private TipoRitmo ritmo;


    @JdbcTypeCode(SqlTypes.VARCHAR)
    @ElementCollection
    @Enumerated(EnumType.STRING)
    @CollectionTable(
        name = "viaje_intereses_categoria",
        joinColumns = @JoinColumn(name = "viaje_id")
    )
    @Column(name = "categoria", nullable = false, length = 50)
    @Builder.Default
    private List<InteresCategoria> interesesCategoria = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private EstadoViaje estado;

    @Column
    private Integer pasoActual;

    // Usuario entiendo lo vemos en el utlimo Sprint, por ahora diría dejarlo como String
    @Column(nullable = false, length = 120)
    private String usuario;


    private void transicionarA(EstadoViaje destino) {
        if (estado == null || !estado.puedeTransicionarA(destino)) {
            throw new BusinessRuleException("no se puede pasar de " + estado + " a " + destino);
        }
        estado = destino;
    }

    /**
     * Completa un borrador y lo deja PLANIFICADO, validando que tenga todos los datos
     * obligatorios. La transición BORRADOR → PLANIFICADO es la única entrada a este estado.
     */
    public void planificar(Clock clock) {
        List<String> errores = new ArrayList<>();
        if (nombre == null || nombre.isBlank()) {
            errores.add("El nombre del viaje no puede estar vacío");
        }
        if (zonaInteres == null) {
            errores.add("La ubicación de interés no puede estar vacía");
        }
        if (rangoInteresKm == null || rangoInteresKm <= 0) {
            errores.add("El rango de interés debe ser mayor a cero");
        }
        if (ritmo == null) {
            errores.add("El ritmo del viaje no puede estar vacío");
        }
        if (interesesCategoria == null || interesesCategoria.isEmpty()) {
            errores.add("Debe seleccionar al menos un interés");
        }
        if (fechaInicio == null) {
            errores.add("La fecha de inicio no puede estar vacía");
        }
        if (fechaFin == null) {
            errores.add("La fecha de finalización no puede estar vacía");
        }
        if (fechaInicio != null && fechaFin != null) {
            if (fechaFin.isBefore(fechaInicio)) {
                errores.add("la fecha de finalización no puede ser anterior a la de inicio");
            }
            if (fechaInicio.isBefore(LocalDate.now(clock))) {
                errores.add("La fecha de inicio no puede ser anterior a hoy");
            }
        }
        if (usuario == null || usuario.isBlank()) {
            errores.add("El turista no puede estar vacío");
        }
        if (!errores.isEmpty()) {
            throw new BusinessRuleException(String.join("; ", errores));
        }
        transicionarA(EstadoViaje.PLANIFICADO);
    }

    /** Baja lógica: solo un borrador o un viaje planificado se pueden cancelar. */
    public void cancelar() {
        transicionarA(EstadoViaje.CANCELADO);
    }

    /** Un viaje en curso o terminado ya no se puede modificar. */
    public void validarEditable() {
        if (estado == EstadoViaje.EN_CURSO || estado == EstadoViaje.FINALIZADO
                || estado == EstadoViaje.CANCELADO) {
            throw new BusinessRuleException(
                    "el viaje está " + estado.name().toLowerCase().replace('_', ' ')
                            + " y no se puede modificar");
        }
    }

    /**
     * Aplica las transiciones automáticas según la fecha actual. Un viaje planificado
     * pasa a EN_CURSO el día de inicio y a FINALIZADO el día siguiente al de fin.
     * Los borradores y los estados terminales nunca se tocan.
     */
    public void actualizarEstadoPorFechas(LocalDate hoy) {
        if (estado != EstadoViaje.PLANIFICADO && estado != EstadoViaje.EN_CURSO) {
            return;
        }
        if (fechaInicio == null || fechaFin == null) {
            return;
        }
        LocalDate inicio = fechaInicio;
        LocalDate fin = fechaFin;
        if (hoy.isAfter(fin)) {
            if (estado == EstadoViaje.PLANIFICADO) {
                transicionarA(EstadoViaje.EN_CURSO);
            }
            transicionarA(EstadoViaje.FINALIZADO);
        } else if (!hoy.isBefore(inicio) && estado == EstadoViaje.PLANIFICADO) {
            transicionarA(EstadoViaje.EN_CURSO);
        }
    }


}
