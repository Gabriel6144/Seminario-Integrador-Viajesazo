# Turismo Córdoba — Frontend

Cliente web de la API REST de turismo de la provincia de Córdoba. React + TypeScript + Vite,
consumiendo el backend Spring Boot que vive en `../turismo-backend` (un solo repositorio git).

## Qué hace

- Listado paginado de **eventos** y de **publicadores**.
- Detalle de cada evento y cada publicador.
- Agenda de la semana (de hoy al domingo, según el reloj del servidor).
- **Alta, edición y baja de eventos**, y **alta de publicadores**.
- Estados de carga, error, vacío y 404.

**No hay autenticación**: cualquiera que abra la app puede crear, editar y borrar. Es la
limitación conocida del alcance actual, no una decisión de diseño. La API tampoco expone
`PUT`/`DELETE` de publicadores, así que ese recurso solo se da de alta.

## Levantar

Hace falta la API corriendo en el puerto 8080. En `../turismo-backend`:

```bash
.\mvnw.cmd spring-boot:run
```

Y en este repo:

```bash
npm install
npm run dev
```

Queda en http://localhost:5173.

**No hace falta configurar CORS**: `vite.config.ts` tiene un proxy que manda `/api` a
`http://localhost:8080`, así que el navegador ve todo como same-origin. Eso resuelve el
desarrollo; en producción hay que poner un proxy inverso delante o agregar CORS en el backend.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con proxy a la API. |
| `npm run build` | Typecheck (`tsc -b`) + build de producción. |
| `npm test` | 120 tests (Vitest + Testing Library + MSW). |
| `npm run test:watch` | Tests en watch. |
| `npm run lint` | oxlint. |
| `npm run typecheck` | Solo tipos. |

## Tests sin backend

MSW corre con `onUnhandledRequest: 'error'`, así que la suite **no necesita la API levantada**:
una request sin handler falla el test en vez de salir a la red. Para el trabajo diario alcanza
con `npm test`.

Los handlers de escritura son **stateful** sobre un store en memoria (`src/test/store.ts`), así
que se puede probar el flujo completo —crear un evento y verlo aparecer en la grilla— sin
levantar nada.

## Documentación

**[`AGENTS.md`](./AGENTS.md)** tiene lo importante y lo no obvio: la forma de la `Page`
anidada, por qué las fechas no se parsean con `new Date`, el bug de los ids no numéricos que da
500, por qué los opcionales van como `null` y no como `""`, la diferencia entre `imagenes: []`
y `imagenes: null` en un PUT, el 204 del `DELETE` y las convenciones de shadcn y de los
formularios.
