# Viajesazo — Seminario Integrador

API REST y cliente web para centralizar la información turística de la provincia de Córdoba
(Argentina) y generar itinerarios personalizados según fechas, preferencias y disponibilidad.

Sprint 1 completo: gestión de eventos y publicadores.

## Estructura

Un solo repositorio con dos proyectos independientes:

| Carpeta | Qué es | Stack |
| --- | --- | --- |
| [`turismo-backend/`](./turismo-backend) | API REST | Java 21, Spring Boot 4.1.1, Spring Data JPA, H2, MapStruct, Maven |
| [`turismo-frontend/`](./turismo-frontend) | Cliente web | React 19, TypeScript, Vite, TanStack Query, React Hook Form + Zod, shadcn/ui, Vitest |

Cada proyecto tiene su propio `AGENTS.md` con las decisiones técnicas y las trampas de su
código. **Lelos antes de tocar cualquier cosa**: documentan por qué el código es como es, no
solo qué hace.

## Levantar

### 1. La API (puerto 8080)

```bash
cd turismo-backend
.\mvnw.cmd spring-boot:run          # Windows
./mvnw spring-boot:run               # Unix
```

Arranca con H2 en memoria y ejecuta `data.sql`, así que ya viene con **3 publicadores, 7
eventos y 5 imágenes** de ejemplo. El esquema se recrea en cada arranque (`create-drop`): lo
que se carga o borra no sobrevive a un reinicio.

### 2. El frontend (puerto 5173)

```bash
cd turismo-frontend
npm install
npm run dev
```

Queda en http://localhost:5173.

**El backend tiene que estar levantado primero**: el frontend no tiene datos propios, consume
la API. `vite.config.ts` hace proxy de `/api` a `http://localhost:8080`, así que el navegador
ve todo como same-origin y **no hace falta configurar CORS** en desarrollo. En producción hay
que poner un proxy inverso delante o habilitar CORS en el backend.

## Verificación

| | Comando | Qué corre |
| --- | --- | --- |
| Backend | `.\mvnw.cmd clean test` | 83 tests (JUnit 5, Mockito, `@WebMvcTest`, `@DataJpaTest`) |
| Frontend | `npm test` | 120 tests (Vitest, Testing Library, MSW) |
| Frontend | `npm run typecheck` | TypeScript sin emitir |
| Frontend | `npm run lint` | oxlint |
| Frontend | `npm run build` | typecheck + build de producción |

La suite del frontend **no necesita la API levantada**: MSW intercepta todo con
`onUnhandledRequest: 'error'`, así que una request sin handler falla el test en vez de salir a
la red.

Usar siempre `clean test` en el backend, no `test` a secas: `target/test-classes/` puede quedar
con un `application.properties` viejo que opaca el de `main` y los tests corren con los
defaults de Spring Data en vez de la configuración del proyecto.

## Documentación

- [`turismo-backend/AGENTS.md`](./turismo-backend/AGENTS.md) — arquitectura por capas, las
  trampas de Spring Boot 4 / Jackson 3 / MapStruct, la base H2 y el manejo de errores.
- [`turismo-backend/PRUEBAS-MANUALES.md`](./turismo-backend/PRUEBAS-MANUALES.md) — curls de
  cada endpoint, casos de error medidos y bordes conocidos.
- [`turismo-frontend/AGENTS.md`](./turismo-frontend/AGENTS.md) — la forma de la `Page`
  anidada, el manejo de fechas y `LocalTime`, los formularios y las convenciones de shadcn.
- [`turismo-frontend/README.md`](./turismo-frontend/README.md) — detalle del cliente web.

## Estado y limitaciones conocidas

- **No hay autenticación.** Cualquiera que abra la app puede crear, editar y borrar. Es la
  limitación del alcance del Sprint 1, no una decisión de diseño.
- **Los publicadores solo se dan de alta**: la API no expone `PUT` ni `DELETE` para ellos.
- El selector de publicadores del formulario pide `?size=100`, que es el tope configurado en el
  backend. Con más de 100 publicadores hay que agregarle búsqueda o paginación.
- El mensaje de email duplicado confirma si un email está registrado, lo que habilita enumerar
  publicadores. Con autenticación conviene responder un 409 genérico.
- Los datos de H2 son efímeros. Para una demo con datos cargados hay que sembrar por script o
  cambiar a `jdbc:h2:file:./data/turismo` con `ddl-auto=update`.

## Sprites siguientes

`Viaje`, `Actividad`, `Itinerario`, `Usuario`, `Preferencia`, y el mapa con distancia y
traslados. La baja de eventos es física, así que cuando exista `Itinerario` hay que decidir si
el `DELETE` valida los itinerarios asociados: hoy no lo hace y dejaría referencias colgantes.
