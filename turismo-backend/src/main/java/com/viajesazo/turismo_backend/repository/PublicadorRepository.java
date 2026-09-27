package com.viajesazo.turismo_backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.viajesazo.turismo_backend.model.Publicador;

public interface PublicadorRepository extends JpaRepository<Publicador, Long> {

	/**
	 * Listado paginado en orden alfabético. El orden va en el nombre de la Derived Query y no en
	 * el {@code Pageable}, por el mismo motivo que en {@code EventoRepository}: es parte del
	 * contrato de la API y no una preferencia del cliente.
	 */
	Page<Publicador> findAllByOrderByNombreAsc(Pageable pageable);

	/**
	 * Existe ya un publicador con ese email. El {@code email} es {@code UNIQUE} en el esquema, así
	 * que el alta tiene que consultarlo antes de guardar: si se deja que reviente la base, la
	 * única excepción posible es un {@code DataIntegrityViolationException} y el cliente recibe un
	 * 500 genérico en vez de un 400 que le diga qué corregir.
	 *
	 * <p>Derived Query para no escribir la consulta a mano. Ojo con el alcance: si el índice de
	 * {@code UNIQUE} se declarara como {@code case-insensitive}, este método dejaría de detectar
	 * los duplicados que solo difieren en mayúsculas, porque la comparación sería exacta.
	 */
	boolean existsByEmail(String email);

}
