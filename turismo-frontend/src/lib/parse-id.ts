/**
 * Los ids de la ruta son `string`, pero el backend espera `Long` en la path.
 *
 * Los controllers **no** tienen `@Validated`, así que la conversión de la path variable no dispara
 * `ConstraintViolationException` y cae en el catch-all de `GlobalExceptionHandler`: pedir
 * `/api/eventos/abc` devuelve **500** con un mensaje genérico en lugar de un 400. Validando acá se
 * evita el request inútil y se muestra un 404 honesto.
 *
 * El `RegExp` está a nivel de módulo, no dentro de la función: recompilarlo en cada llamada es
 * trabajo innecesario.
 */
const ID_PATTERN = /^[1-9]\d*$/

/** Devuelve el id como número, o `null` si no es un entero positivo válido. */
export function parseId(raw: string | undefined): number | null {
  if (raw === undefined || !ID_PATTERN.test(raw)) return null
  return Number(raw)
}
