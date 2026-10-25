# Limitaciones con respecto a la fecha de inicio y fin:
- Recorda que las fechas no se pueden modificar mientras el viaje este EN CURSO, CANCELADO y FINALIZADO.
- La fecha de fin no puede ser anterior a la fecha de inicio.
- Evaluo tanto si ingresa una fecha fin o inicial con la guardada en la entidad, si es distinto modifica, sino pasa de largo.
- En caso de modificacion:
    - la fecha de inicio de la entidad tiene que ser menor a la fecha actual, sino se toma que esta en curso.
    - La nueva fecha de inicio no puede ser anterior a la fecha actual.
    - La nueva fecha de fin no puede ser anterior a la fecha actual.
    - No se puede modificar la fecha de finalizacion de un viaje que ya termino.

## Modificaciones:
### Agregaciones:
-----------------------------------------------------------------------------------------------------------------------
```java
private void validateUpdateDate(ViajeRequest request, Viaje viaje) {
		// Validación: la nueva fecha de finalización no puede ser anterior a la fecha de inicio.
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("La nueva fecha de finalización no puede ser anterior a la de inicio");
		}
		// Validación: la nueva fecha de inicio debe ser distinto a la fecha fin guardada
		if (!request.fechaInicio().equals(viaje.getFechaInicio())) {
			// Validación: no se puede modificar la fecha de inicio si el viaje ya comenzó.
			// es opcional y lo hace mas robusto, porque ya sabemos que los viajes en curso no se pueden modificar.
			if (viaje.getFechaInicio().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("No se puede modificar la fecha de inicio de un viaje que ya comenzó");
			}
			// Validación: la nueva fecha de inicio no puede ser anterior a hoy
			if (request.fechaInicio().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de inicio no puede ser anterior a hoy");
			}
		}

		// Validación: la nueva fecha de finalización debe ser distinto a la fecha fin guardada
		if (!request.fechaFin().equals(viaje.getFechaFin())) {
			// Validación: la nueva fecha de finalizacion no puede ser anterior a hoy.
			if (request.fechaFin().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de finalizacion no puede ser anterior a hoy");
			}
			if (viaje.getFechaFin().isBefore(LocalDate.now(clock))) {
				throw new BusinessRuleException("La nueva fecha de finalizacion no puede ser anterior a la fecha de inicio");
			}

		}
	}

```
---------------------------------------------------------------------------------------------------------------------------------------------
```java
private void validateCreationDate(ViajeRequest request) {
		if (request.fechaInicio().isBefore(LocalDate.now(clock))) {
			throw new BusinessRuleException("La fecha de inicio debe ser igual o posterior a la fecha actual");
		}
		if (request.fechaFin().isBefore(request.fechaInicio())) {
			throw new BusinessRuleException("La fecha de finalización no puede ser anterior a la fecha actual");
		}
	}
```
--------------------------------------------------------------------------------------------------------------------------------------------
## 1- Explicacion de porque implemente las validaciones en el service y no en el DTO:

- El DTO solo transporta datos entre la api y el backend, en cambio el service maneja la regla de negocio.

- Las validaciones de fechas se resolvieron en el Service porque dependen del estado actual del viaje en la base de datos y 
de la relación entre dos campos, algo que las anotaciones del DTO no pueden evaluar por sí solas sin bloquear ediciones válidas.

- @FutureOrPresent bloquea la edición de viajes en curso: Las anotaciones del DTO validan el dato en crudo sin saber qué había antes en la base de datos. 
Si un viaje empezó ayer y hoy el usuario quiere cambiar otro dato (como el nombre o estirar la fecha de fin), el DTO vuelve a mandar la fecha de inicio 
de ayer y @FutureOrPresent rechaza toda la petición con un error 400. En el Service, en cambio, podemos comparar el request contra la entidad guardada y 
validar que la fecha sea futura únicamente si el usuario realmente la modificó.

- No existe una anotación estándar en Jakarta Validation para comparar un atributo contra otro (como validar que fechaFin no sea anterior a fechaInicio). 
Hacerlo en el DTO obligaría a crear una anotación personalizada con su propio validador o meter métodos con @AssertTrue adentro de un objeto que solo 
debería transportar datos. Además, en ediciones parciales (borradores), en el Service podemos cruzar la fecha nueva contra la que ya estaba guardada en 
la base de datos.

- Testabilidad con Clock: Al validar en el Service usando LocalDate.now(clock), es muy fácil simular distintas fechas en los tests unitarios sin que los 
tests fallen con el paso de los días, mientras que @FutureOrPresent toma por defecto la hora del sistema.

- No usamos @FutureOrPresent ni anotaciones en el DTO porque al editar un viaje que ya empezó, la anotación rechazaría la petición aunque el usuario no 
haya tocado la fecha de inicio. Además, comparar que la fecha de fin sea mayor o igual a la de inicio es una regla de negocio cruzada entre dos campos 
(y contra el estado guardado en la base de datos), por lo que corresponde validarla en el Service.

## 2- Explicacion de porque ponemos primero la validacion: fecha de inicio tiene que ser menor a la fecha fin.

  Míralo con un caso concreto paso a paso:

  1. Estado actual en la base de datos (viaje):
	fechaInicio: 10 de noviembre
	fechaFin: 15 de noviembre

  2. Lo que envía el usuario en el PUT (request):
	El usuario se equivocó y cambia únicamente la fechaInicio al 20 de noviembre, pero no toca la fechaFin (sigue siendo 15 de noviembre).
	request.fechaInicio(): 20 de noviembre (cambió)
	request.fechaFin(): 15 de noviembre (NO cambió)


## 3- Explicacion de porque tuve que tocar el mapping durante el transcurso de la tarea:
-------------------------------------------------------------------------------------------------------------------
### Cambio esto:
```java
@Mapping(target = "interesesCategoria",nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "pasoActual", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "nombre", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "rangoInteresKm", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "fechaInicio", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "fechaFin", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "ritmo", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
```
### por:
```java
@BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
```
-------------------------------------------------------------------------------------------------------------------
### Explicacion paso a paso:

El cambio reemplaza una configuración repetitiva atributo por atributo por una regla global a nivel de método usando @BeanMapping, logrando un código más limpio, seguro y fácil de mantener para las actualizaciones parciales (borradores).
- anteriormente tenias que declarar un mapping por cada atributo unicamente para decirle a MapStruct que hacer si el campo venia null.
       Dificultad -> Si mañana agregabas un campo nuevo al viaje y olvidabas ponerle la anotación, MapStruct iba a sobrescribir el dato de la base de datos con null.
- Ahora aplicamos la configuracion a todo el metodo de mapeo de una sola vez, le indicamos a MapStruct que esa regla rige para todos los atributos del objeto  
       sin necesidad de nombrarlos uno por uno.

- La estrategia NullValuePropertyMappingStrategy.IGNORE que utiliza MapStruct frente a algun campo que viene null.

Importante -> Cuando el MapStruct actualiza una entidad existente con @MappingTarget, copia todo lo que viene del DTO, incluidos los null. 
	      En un borrador o edición parcial, el usuario solo envía los campos que quiere modificar y el resto viaja en null.
Lo que hace: Si el campo en el DTO trae un valor nuevo, actualiza el atributo correspondiente en la entidad Viaje.
Lo que no hace: si el campo en el DTO trae un null, no toca ni borra el valor que ya tenía la entidad guardada en la base de datos (simplemente saltea el set de ese campo).

source: Campo de origen(DTO).
target: Campo destino(Entidad).

### Caracteristicas importantes:
	Cuando el atributo se llama exactamente igual en ambos lados (por ejemplo, fechaInicio, fechaFin, nombre, ritmo), 
      MapStruct los vincula automáticamente sin que escribas @Mapping. Al haber movido la estrategia de nulos a @BeanMapping, 
      todas esas líneas desaparecen.
	Solo dejas un Mapping cuando los nombres son distintos entre si.
	No confundir la estrategia que usa MapStruct frente a nulos con "ignore = true".
	Diferencia:
	   - NullValuePropertyMappingStrategy.IGNORE: Ignora el campo solo si viene null (si trae un dato, lo actualiza).
       - ignore = true :(ej. en id, estado, zonaInteres): Ignora el campo siempre, venga con datos o no. Se utiliza por seguridad  y  reglas de negocio para proteger atributos críticos: el id jamás debe alterarse en un update, el estado cambia por flujos de negocio propios del Service, y zonaInteres puede requerir un procesamiento especial fuera del mapeo directo.


### Resumen de la IA:
Reemplacé los @Mapping individuales por un único @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE) 
para aplicar la regla de actualización parcial a todo el método. Así, cualquier atributo que se llame igual en el DTO (source) y en la entidad (target) 
se mapea automáticamente, ignorando los valores null para no pisar datos ya guardados en la base de datos, y dejando anotaciones explícitas solo para los 
campos que cambian de nombre o que deben bloquearse siempre con ignore = true (como el id o el estado).


