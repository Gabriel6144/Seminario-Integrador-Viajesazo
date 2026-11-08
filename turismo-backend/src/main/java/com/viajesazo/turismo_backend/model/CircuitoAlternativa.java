package com.viajesazo.turismo_backend.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "circuito_alternativa")
@Getter
@Setter
@NoArgsConstructor
public class CircuitoAlternativa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "circuito_id", nullable = false)
    private Circuito circuito;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CircuitStrategy estrategia;

    @Column(nullable = false)
    private double distanciaTotalKm;

    @Column(nullable = false)
    private double afinidadIntereses;

    @ElementCollection
    @CollectionTable(name = "circuito_categoria", joinColumns = @JoinColumn(name = "alternativa_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "categoria", nullable = false)
    private List<InteresCategoria> categoriasCubiertas = new ArrayList<>();

    @Column(length = 500)
    private String advertencia;

    @OneToMany(mappedBy = "alternativa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<CircuitoItem> items = new ArrayList<>();

    public void addItem(CircuitoItem item) {
        items.add(item);
        item.setAlternativa(this);
    }
}
