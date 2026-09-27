# AGENTS.md

## Contexto

Tesis de facultad: **este proyecto es solo el frontend**. La API REST de Spring Boot vive en
`../turismo-backend` y expone eventos, publicadores y agenda semanal. Acá no va código de
servidor ni lógica de negocio: la UI **consume** la API.

Los dos proyectos viven en el **mismo repositorio git**, como subcarpetas. Eso no los hace
acoplados de build: cada uno tiene su `package.json` / `pom.xml` y sus propios comandos.

- Estado actual: Sprint 1 completo. Listados paginados de eventos y publicadores, detalle de
  ambos, agenda semanal, **CRUD de eventos y alta de publicadores**, y ruta 404.
  **120 tests en verde.**
- Sigue sin autenticación: cualquiera que abra la app puede crear, editar y borrar eventos. Es
  una limitación conocida del alcance de la tesis, no una decisión de diseño closed.
- Para la API ver el `AGENTS.md` y el `PRUEBAS-MANUALES.md` de `../turismo-backend`.

## Comandos

| Tarea | Comando |
| --- | --- |
| Levantar en dev | `npm run dev` |
| Build de producción | `npm run build` |
| Tests | `npm test` |
| Tests en watch | `npm run test:watch` |
| Lint | `npm run lint` |
| Solo tipos | `npm run typecheck` |

`npm run build` ya corre `tsc -b` antes de `vite build`: un typecheck fallado rompe el build.
No hace falta correr `typecheck` aparte antes de entrar.

## La API y sus trampas

Todo sale de `/api` y va por el proxy de Vite. **Nunca hardcodear
`http://localhost:8080`**: el backend no tiene CORS y el proxy es lo que hace que el navegador
vea las requests como same-origin. En producción hay que poner un proxy inverso delante o
agregar `CorsConfiguration` en el backend.

Cosas que se olvidan fácil y ya están resueltas en el código, para no volver a romperlas:

- **`Page` viene anidada**: los metadatos están en `page.size` / `page.number` /
  `page.totalElements` / `page.totalPages`, no en el nivel superior. Es la `PagedModel` de
  Spring Data 4.x (Boot 4), distinta del `Page` clásico.
- **`LocalDate` no va por `new Date(iso)`**: `"2026-10-01"` se parsea como medianoche UTC y en
  Argentina (UTC-3) se muestra 30 de septiembre. Toda fecha se arma por componentes en
  `src/lib/dates.ts`.
- **`LocalTime` siempre trae segundos**: `"20:00:00"`, aunque valgan cero (verificado contra la
  API real). Para mostrar se recorta a `HH:mm`.
- **Un id no numérico da 500, no 400**: los controllers no tienen `@Validated`, así que la
  conversión de la path variable cae en el catch-all. `src/lib/parse-id.ts` valida antes de
  pedir y la vista muestra un mensaje honesto.
- **`content: []` con 200 es una respuesta válida**, no un error: publicador sin eventos, base
  recién arrancada. Es estado vacío, se maneja distinto al error.
- **La agenda usa el reloj del servidor**: la ventana va de hoy al domingo, así que la cantidad
  de eventos cambia según el día de la semana en que se levanta la app. No se puede fijar un
  total esperado ni en la UI ni en los tests.
- **El cuerpo de error va en inglés** (`status`, `error`, `message`, `timestamp`) pero el
  **valor** de `message` está en español. El catch-all de 500 filtra el detalle a propósito, así
  que para 500 solo hay un texto genérico: ver `toUserMessage`.
- **Un campo opcional vacío se manda como `null`, nunca como `""`**: `""` no es "sin valor" y
  quedaría como cadena vacía en la base. Ojo con el detalle, que surprisingemente **no** rompe:
  medido contra la API real, Jackson coerciona `""` a `null` en `LocalDate` y `LocalTime`, así que
  mandarlo no da error. En un `LocalTime` sin `@NotNull` el alta se guarda con **201** y el
  horario vacío; en un `LocalDate` validado lo agarra el `@NotBlank` y responde
  `fechaInicio: la fecha de inicio es obligatoria`. El 400 genérico de Jackson
  (`el cuerpo de la petición no es válido...`) es para formatos **malformados**: `"no-es-fecha"`
  o una categoría inexistente. `toEventoRequest` y `toPublicadorRequest` hacen la conversión en un
  solo lugar.
- **`DELETE /api/eventos/{id}` responde 204 sin cuerpo**: `response.json()` contra eso tira
  `SyntaxError` y el usuario vería un error de red después de una baja exitosa. `readBody` tolera
  el cuerpo vacío.
- **En un PUT, `imagenes: []` borra y `imagenes: null` conserva**: es la regla del mapper del
  backend. El formulario manda siempre un array, nunca `null`, para que quitar la última imagen
  la borre de verdad.
- **`publicadorNombre` viene aplanado**: es un JOIN del backend, no un campo del DTO de entrada.
  No se manda al crear ni al editar.
- **El email duplicado responde 400 con un string plano** (`"ya existe un publicador con ese
  email"`), no con errores por campo. `PublicadorService` lo anticipa con `existsByEmail` para dar
  un mensaje claro en vez del error de constraint de H2.

## Escritura: cómo está armado

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Schemas y adapters | `src/lib/schemas.ts` | Zod valida; los adapters convierten a `EventoRequest` / `PublicadorRequest`. |
| Formularios | `src/components/*-form.tsx` | RHF + `zodResolver`. Comunes entre alta y edición. |
| Mutaciones | `src/api/eventos.ts`, `src/api/publicadores.ts` | Un hook por verbo. Invalidan caché. |
| Toasts y navegación | Las páginas | Los hooks no saben de `toast` ni de `navigate`. |

Decisiones que conviene no deshacer:

- **Un solo `EventoForm` para alta y edición.** La diferencia son los `defaultValues` y el
  `submitLabel`. Duplicar el formulario garantiza que unArrange de campos se aplique a uno solo.
- **La validación vive en Zod, no en el handler.** Los mensajes coinciden con los del backend a
  propósito: si divergen, el usuario lee dos textos para el mismo error según desde dónde lo
  tocó.
- **Un 400 del servidor se muestra como banner, no por campo**: el backend no devuelve errores
  estructurados. `serverError` va arriba del formulario.
- **Tras crear se navega al detalle del recurso creado** (o al listado tras borrar): quedarse
  en el formulario mostrando un evento que ya existe es confuso, y volver al detalle después de
  borrar mostraría un 404 justo después de una operación exitosa.
- **La baja va detrás de un `AlertDialog`** que repite el nombre del evento: es física, no hay
  forma de deshacerla.
- **Sin publicadores cargados no se muestra el formulario**: sin `publicadorId` es un callejón
  sin salida, así que se avisa con un link al alta.
- **El selector de publicadores pide `size=100`**: es un tope deliberado
  (`PUBLICADORES_MAX_SIZE`). Con más de 100 hay que agregar un buscador o paginar el select.

## Estructura

| Carpeta | Qué va |
| --- | --- |
| `src/api/` | Hooks de TanStack Query, uno por recurso. Son la **única** capa que conoce URLs. |
| `src/lib/` | Puros: `fetch`, fechas, ids, paginación en la URL, agrupado. Sin React. |
| `src/components/` | Presentación. Los `ui/` son de shadcn, no editar a mano. |
| `src/pages/` | Un componente por ruta. Orquestan datos y estados. |
| `src/types/api.ts` | Espejo de los DTO del backend. |
| `src/test/` | Fixtures, handlers MSW, store en memoria, helpers de render. |

Las reglas que sostienen esto:

- **Ningún componente hace `fetch`.** Va por el hook de `src/api/`. Así el `signal` de
  cancelación, la clave de caché y el reintento están en un solo lugar.
- **Los hooks devuelven la `Page` entera**, no solo `content`: la paginación necesita
  `totalElements` y `totalPages`. Desenvolver en el hook repartiría el formato por toda la app.
- **`apiGet` usa rutas relativas a propósito** (ver el proxy arriba).
- **`keepPreviousData` en los listados**: al paginar la grilla no se vacía. Mientras llega la
  nueva, `isPlaceholderData` es `true` y el skeleton va *encima*, no en lugar del contenido.
- **Los cuatro estados son explícitos**: `isPending`, `isError`, `isSuccess` con contenido vacío
  y `isSuccess` con contenido. Ojo con esto: durante `isPending` `data` es `undefined`, así que
  un `data?.content.length === 0` pintado como sibling del skeleton muestra el mensaje de
  "vacío" encima del skeleton. Por eso las páginas usan cadenas `if` sobre `isSuccess`.

## Estado de la página: vive en la URL

`usePageParam` lee y escribe `?page=`, **base 0 como el backend**. No es `useState` a propósito:
la URL queda compartible, el botón "atrás" funciona y recargar no pierde la posición. La primera
página borra el query param para que `/eventos` se vea más limpio que `/eventos?page=0`.

Mezclar base 0 y base 1 entre la URL y la API es la forma más fácil de meter un off-by-one sin
que se note. Si alguna vez se cambia, cambia en los dos lados.

`PaginationBar` es un componente **puro**: recibe la `Page` y un `onPageChange`, no pide datos.
Por eso se testea sin servidor.

Cuidado con los bordes de la paginación: `pointer-events-none` depende del CSS y
`aria-disabled` no impide el clic, así que la guarda va **explícita en el handler**. Sin ella,
"anterior" en la primera página pide `page = -1`.

## Convenciones

- **Identificadores en inglés, contenido en español**: `useEventos`, `formatDateRange`,
  `parseId`; pero rutas `/api/eventos`, textos de la UI y comentarios en español.
- **Sin `any`.** Los tipos de la API son explícitos en `src/types/api.ts`.
- **Comentarios explican el porqué, no el qué.** Si hay que anotar algo obvio, sobra.
- **Nunca editar `src/components/ui/`**: lo genera shadcn y `shadcn add` / `shadcn update` pisa
  los cambios. Si falta un componente, se agrega con el CLI. `CardTitle` es un `div` fijo sin
  `asChild`: cuando el título tiene que ser un heading de verdad, se compone el `<h2>` a mano.
- **Tokens semánticos de shadcn** (`bg-secondary`, `text-muted-foreground`) en vez de colores
  crudos (`bg-emerald-500`), así el tema funciona en claro y oscuro.
- **Los dos warnings de `only-export-components` en `ui/badge.tsx` y `ui/button.tsx` se dejan
  como están**: son exports de `cva` del propio shadcn. En los archivos propios sí se separan
  los helpers puros (ver `lib/group-by-day.ts` y `components/day-heading.tsx`).

## Tests

Vitest + Testing Library + MSW. 120 tests en 12 archivos.

- **MSW corre con `onUnhandledRequest: 'error'`**: una request sin handler falla el test en vez
  de salir a la red. Por eso un test que "funciona" y en realidad pegó a internet no puede pasar.
- **Los handlers de listado paginan de verdad**: leen `?page` y `?size` y cortan. Si devolvieran
  la lista entera siempre, el test de paginación pasaría sin verificar que la página 2 exista.
- **Los handlers de escritura son stately, sobre `src/test/store.ts`.** Un alta o una baja se
  reflejan en los listados siguientes, que es lo que permite testear el flujo entero —crear y
  ver el evento en la grilla— y no solo que se haya hecho un POST. `resetStore()` va en el
  `beforeEach` de los tests que escriben; la copia es profunda para no ensuciar los fixtures.
- **El store replica la regla de imágenes del mapper**: en un PUT, `[]` borra y `null` conserva.
  Si el handler no la respetara, un test de quitar imágenes pasaría sin detectar el bug.
- **Los fixtures copian lo que devuelve la API, no lo que dice `data.sql`**: el seed escribe
  `'20:00'` pero la API responde `"20:00:00"`. Y usan **fechas fijas**, no relativas a
  `CURRENT_DATE` como el seed: los tests tienen que dar lo mismo hoy y en un año.
- `QueryClient` de tests con `retry: false`, `staleTime: 0` y `gcTime: 0`. El default reintenta 3
  veces ante cualquier error: un test de estado de error tardaría tres esperas.
- **Polyfills de Radix en `setup.ts`**: `hasPointerCapture`, `setPointerCapture` y
  `scrollIntoView` no existen en jsdom. Sin ellos, hacer click en un `<Select>` revienta con un
  TypeError en vez de abrir la lista de opciones.
- **Los tests de formulario esperan al campo, no al render**: la página muestra un skeleton
  hasta que cargan los publicadores, así que un `getByLabelText` inmediato corre contra un árbol
  que todavía no existe. `findByLabelText` lo resuelve.
- Los tests se llaman con `screen` por rol o texto, no por clase CSS: los `data-slot` de shadcn
  se reescriben en cada `shadcn add`.

## Detalles de shadcn

Instalado con `style: "radix-nova"`, `baseColor: "neutral"`, iconos `lucide`, alias `@/`.

- `cn` viene del paquete `cn`, no de `lib/utils`. Es lo que generó el CLI.
- **`radix-nova` no tiene el componente Base UI `toast`**: por eso los avisos usan el wrapper
  `ui/sonner.tsx` con el paquete `sonner`, no shadcn `toast`. `Toaster` va montado en `main.tsx`
  y cada página llama a `toast.success` / `toast.error` desde los callbacks de la mutación.
- **`ui/sonner.tsx` importa `next-themes`**, aunque la app no monte un `ThemeProvider`: el
  wrapper de shadcn lo da por hecho y el tema resuelve a `"system"`. Si algún día se agrega
  dark mode, hay que envolver la app en `ThemeProvider` o el `Toaster` se desincroniza.
- **En Windows, shadcn a veces crea una carpeta literal llamada `@`** en vez de resolver el
  alias, si el `tsconfig` raíz no tiene `compilerOptions.paths`. Si aparece, borrarla: el alias
  está en `vite.config.ts` y en `tsconfig.app.json`.
- **No usar `baseUrl`**: TypeScript 6 lo marca como deprecated y deja de funcionar en TS 7.
  `paths` con `"./src/*"` se resuelve contra la carpeta del propio tsconfig.
- Hay un `AGENTS.md` de skills de terceros instalado que puede sugerir cosas que acá no aplican
  (Tailwind v3, `<Routes>` en vez de `createBrowserRouter`). **Las decisiones de este archivo
  pisan al skill.**

## Formularios

`react-hook-form` + `@hookform/resolvers` con **Zod clásico** (`zod@3.25.76`), no Zod 4: la
dependencia raíz quedó en 3.x y las APIs son distintas (`z.string().email()`, no `z.email()`).
Migrar a 4 no es un bump de versión.

- `resolver: zodResolver(schema)` y los `defaultValues` se tipan contra el schema, así que un
  campo nuevo obliga a definirlo en un solo lugar.
- `Controller` solo para los `<Select>` de Radix, que son controlados y no se pueden registrar
  con `register`. Los `<Input>` nativos van con `register`.
- **Los opcionales usan `z.union([z.literal(''), z.enum(...)])`** o `z.string()`: el `''` es el
  "sin valor" de HTML y el adapter lo traduce a `null`.
- `useFieldArray` para las imágenes: las filas son objetos `{ url }` y la key es `field.id`, no
  el índice, que se reusa al quitar una del medio.
- Una fila de imagen agregada y no llenada **no se manda** como `""`: el backend la rechaza con
  "las URLs de imagen no pueden estar vacías", así que Zod lo frena antes con un mensaje que sí
  dice qué hacer.

## Convenciones de git

Commits con [Conventional Commits](https://www.conventionalcommits.com/): `feat:`, `fix:`,
`chore:`, `docs:`.

El repositorio **todavía no es un repositorio git**: hay que hacer `git init` antes de poder
commitear.
