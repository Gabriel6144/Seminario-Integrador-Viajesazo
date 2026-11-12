# Guía de contribución — Viajesazo

El repositorio es **único** y contiene los dos proyectos: `turismo-backend/` (API REST) y
`turismo-frontend/` (cliente web). Es normal tocar ambos en el mismo commit cuando el cambio
atraviesa la API y el cliente.

Si es tu primera vez en el backend, empezá por [`docs/ONBOARDING.md`](./docs/ONBOARDING.md).
Para el *por qué* de las decisiones técnicas, la fuente de verdad es
[`turismo-backend/AGENTS.md`](./turismo-backend/AGENTS.md) (y su par de frontend).

## Flujo de ramas

Ramas permanentes:

- **`main`** — lo estable. **Protegida**: no se commitea ni se pushea directo.
- **`develop`** — integración. Todo feature se mergea acá.

Para trabajar:

```bash
git checkout develop
git pull origin develop
git checkout -b feat/publicador-update-delete
```

Convención de nombre: `feat/<algo>`, `fix/<algo>`, `docs/<algo>`, `test/<algo>`, `chore/<algo>`.
Una rama = un tema. Evitá ramas largas: PRs chicos se revisan mejor y se mergean más rápido.

## Pull Requests

1. Antes de abrir el PR, actualizá tu rama contra `develop` y corré la verificación (sección
   siguiente).
2. Abrí el PR **hacia `develop`**, no hacia `main`.
3. **Al menos una aprobación** antes de mergear. Con más de una persona en el equipo, `main` y
   `develop` deben exigir review en la config de GitHub (branch protection).
4. Describí **qué** cambia y **cómo probarlo**. Si toca la API, citá el `curl`.
5. El **primer PR de cada persona se hace en pareja**; después ya se puede trabajar solo con
   review normal.
6. Preferí *squash merge* para dejar el historial de `develop` limpio.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`,
`test:`, `refactor:`. Mensaje en imperativo y en español, ej.:

```
feat: agrega PUT y DELETE de publicadores
fix: corrige el solapamiento de la agenda cuando el evento empezó antes de la semana
```

## Verificación (siempre antes de pedir review)

No hay CI configurado: **la verificación es manual y es tu responsabilidad**. Corré lo que
corresponda al proyecto que tocaste.

**Backend** (`turismo-backend/`):

```powershell
.\mvnw.cmd clean test      # siempre clean, nunca test a secas
```

**Frontend** (`turismo-frontend/`):

```bash
npm test
npm run typecheck
npm run lint
```

Un PR no está listo si la suite queda en rojo. Si rompiste un test a propósito, decilo en la
descripción y justificá por qué.

## Estilo

- **Indentación con tabulaciones**, no espacios. Igualá el archivo que estás editando.
- **Nomenclatura mixta** (la regla que más se rompe): el dominio va en **español** (entidades,
  campos, rutas, tablas, DTOs, mensajes de error, `@DisplayName`) y el resto en **inglés**
  (métodos, campos internos, constantes de código). Tabla completa en `AGENTS.md`.
- **Tests**: identificadores en inglés, `@DisplayName` en español.
- No hay linter ni formatter en el backend (`spotless`/`checkstyle` **no existen**). No agregues
  plugins sin pedido explícito.
- No expongas entidades JPA en el controller: siempre DTOs.

## Definition of Done

Un cambio está terminado cuando:

- [ ] `.\mvnw.cmd clean test` (y/o la suite del frontend) queda en verde.
- [ ] No rompe el contrato de la API sin actualizar el cliente y la documentación.
- [ ] Respeta la nomenclatura y el estilo.
- [ ] Actualiza la doc afectada (`README.md`, `AGENTS.md`, `PRUEBAS-MANUALES.md`).
- [ ] Tiene al menos una aprobación y pasó el review.
