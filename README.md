# Backoffice Facultad

Frontend administrativo con núcleo académico, cursadas, inscripciones, RFID, asistencia, evaluaciones, resultados, cuotas e importación/exportación. Fase 7: hardening del sistema existente. `AGENTS.MD` es la especificación permanente; verificaciones y limitaciones del entorno en [IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Desarrollo local (Windows o Linux)

Requiere Node.js 22.13+ de la rama 22, o Node.js 24, y npm.

```sh
npm ci
npm run dev
```

Abrir http://localhost:5173. Los mocks están activados en desarrollo y test, con datos ficticios y cambios únicamente en memoria. No ingresar datos personales reales; recargar reinicia la demostración.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

`npm test` ejecuta una vez; `npm run test:watch` deja Vitest en modo interactivo. El build queda en `dist/` y la vista previa en http://localhost:4173.

## Configuración

`.env.development`, `.env.test` y `.env.production` contienen únicamente valores públicos. `.env.example` documenta las variables. Los cambios locales se pueden colocar en `.env.development.local` (ignorado por Git).

| Variable | Uso |
| --- | --- |
| `VITE_API_BASE_URL` | Base REST; por defecto `/api/v1`. Admite URL HTTP(S) o ruta absoluta. |
| `VITE_USE_MOCKS` | `true` en desarrollo/test, `false` en producción. |

Las variables `VITE_` se incorporan al bundle al compilar: nunca colocar secretos. Para cambiar la URL de una compilación, volver a construirla. No se permite activar mocks en modo producción. No hay backend aún: el build de producción mostrará un error al comprobar la sesión hasta conectar la API.

## Probar autenticación (solo demo)

- Administrador: `admin@demo.facultad.test`. Secretaría: `secretaria@demo.facultad.test`.
- Contraseña: cualquier texto ficticio no vacío; no se compara ni guarda. No usar contraseñas reales.
- Segundo factor: `123456`. Alternativa de recuperación: `DEMO-RECUPERAR-01`, consumible una vez por cuenta hasta recargar.
- Sesión: 30 minutos; desafío: 5 minutos y hasta 5 intentos; enlace de reset: 15 minutos y un solo uso. La recuperación muestra un enlace de demostración para las cuentas anteriores, sin enviar emails ni modificar contraseñas.
- Al recargar se pierde todo el estado mock. No se genera TOTP, QR, secretos ni criptografía: la aplicación recibe códigos de una aplicación previamente vinculada por el backend futuro.

`src/features/auth/permissions.ts` centraliza permisos; `RequireAuth`, `RequirePermission` y `Can` controlan rutas y elementos. Secretaría puede consultar y exportar CSV/Excel, pero no accede a Usuarios administrativos ni tiene permisos de escritura o importación. Los hooks comprueban permisos antes de mutar o transferir datos.

## Contrato de autenticación futuro

Base `/api/v1`; contratos tipados en `src/features/auth/auth-schemas.ts`. Respuestas con datos dentro de `{ "data": ... }`, como el resto de servicios.

| Método y ruta | Entrada / respuesta |
| --- | --- |
| `GET /auth/session` | `AuthSession` o `null`; 401 equivale a sesión ausente. |
| `POST /auth/login` | Email y contraseña → `AUTHENTICATED` con sesión, o `TWO_FACTOR_REQUIRED` con desafío y vencimiento. |
| `POST /auth/two-factor/verify` | `challengeId`, `method` (`TOTP`/`RECOVERY_CODE`), `code` → sesión. |
| `POST /auth/password/forgot` | Email → 204 genérico, exista o no la cuenta; nunca devuelve tokens. |
| `POST /auth/password/reset` | Token y nueva contraseña → 204; el backend consume el token e invalida sesiones. |
| `POST /auth/logout` | 204; el backend invalida la sesión y expira la cookie. |

La sesión contiene un usuario administrativo activo y `expiresAt` ISO. Credenciales, desafío y token de reset se usan de forma transitoria, sin Web Storage ni caché de mutaciones. El token de reset se recibe preferentemente por fragmento `#token=…` y se elimina de la URL. El servicio HTTP descarta cualquier token que una respuesta de recuperación pudiera contener; `demoToken` existe solo en el mock. Ante vencimiento, logout o 401 de recursos protegidos se vacía el caché de consultas. Un fallo de logout no se presenta como cierre confirmado en el servidor.

La seguridad real queda a cargo del backend: cookies HttpOnly/Secure/SameSite, CSRF/CORS, validación de permisos en cada endpoint, contraseñas, vinculación TOTP, códigos y tokens de un solo uso, límites de intentos y revocación. Los guards de UI no son una barrera de seguridad.

## Organización

- `src/app`, `src/router`, `src/pages`: proveedores, catálogo único de navegación y shells.
- `src/components`: layout, controles de formulario y estados reutilizables.
- `src/features/academic`: schemas, relaciones, catálogo de campos, hooks y pantallas compartidas de los diez módulos del núcleo académico.
- `src/features/auth`: formularios, schemas, sesión y guards; `src/services/auth.ts` selecciona HTTP o mock sin cambios en la UI.
- `src/features/transfers`: importación CSV/XLSX, plantillas, validaciones, preview y exportación; `src/services/transfers.ts` selecciona HTTP o mock.
- `src/services` → `src/lib/api-client.ts`: interfaz de servicios y HTTP con Axios. La UI nunca consume Axios directamente.
- `src/mocks`: implementaciones alternativas de los servicios, seleccionadas centralmente según el ambiente.
- `src/schemas`, `src/utils`, `src/test`: validaciones compartidas, formato argentino de fechas y configuración de pruebas.

Cambiar `VITE_USE_MOCKS=false` utiliza HTTP sin modificar componentes. Axios utiliza `withCredentials` para las cookies del backend.

## Núcleo académico (Fase 3)

Sedes, edificios, aulas, carreras, planes de estudio, materias, períodos académicos, comisiones, alumnos y profesores comparten búsqueda, filtros, ordenamiento, paginación, detalle y formularios RHF/Zod. Administrador puede crear, editar, desactivar mediante el campo Estado y confirmar bajas lógicas. Secretaría dispone de consulta; las rutas de escritura también están protegidas.

Los mocks validan unicidad de identificadores (RFID compartido entre alumnos y profesores), carrera/plan del alumno, sede/edificio del aula y referencias existentes. Una baja con registros vinculados se rechaza; los identificadores dados de baja siguen reservados. Las materias admiten varios planes y correlativas previas simples, sin motor de correlatividades. Los mocks no constituyen seguridad ni persistencia real.

Contratos en `src/services/academic-service.ts` y `src/features/academic/schemas.ts`. Para cada recurso bajo `/api/v1`:

| Método | Contrato |
| --- | --- |
| `GET /recurso` | `search`, `estado`, filtros por campo, `sortBy`, `sortOrder`, `page`, `pageSize` → `{ data: Registro[], total, page, pageSize }`. Excluye bajas lógicas. |
| `GET /recurso/:id` | `{ data: Registro }`; 404 si no existe o está dado de baja. |
| `POST /recurso` | Datos del formulario → `{ data: Registro }`. |
| `PUT /recurso/:id` | Datos del formulario → `{ data: Registro }`. |
| `DELETE /recurso/:id` | Baja lógica (`deletedAt`); 204. No es eliminación física. |

Cada registro incluye `id`, `createdAt`, `updatedAt` y `deletedAt`. Fechas de calendario: ISO `YYYY-MM-DD`; auditoría: ISO con hora. Los años se denominan `anio`/`anioVigencia`; las asociaciones de materia son `planEstudioIds` y `correlativaIds`. El backend deberá validar permisos, unicidad e integridad de forma autoritativa.

## Cursadas e inscripciones (Fase 4)

`/cursadas` y `/inscripciones` utilizan los mismos contratos de listado, detalle y CRUD. Una cursada combina materia, comisión y período (combinación única); admite de cero a tres profesores distintos y requiere al menos un horario. El formulario permite agregar, editar y retirar horarios, con distintas aulas por encuentro. Valida horas `HH:mm`, inicio anterior al fin y ausencia de solapamientos dentro de la propia cursada. La detección de conflictos entre cursadas queda para una etapa posterior.

El cuerpo de cursada contiene `materiaId`, `comisionId`, `periodoAcademicoId`, `profesorIds`, `horarios` y `estado`. Cada horario contiene `id` estable, `diaSemana` (1=lunes a 7=domingo), `horaInicio`, `horaFin` y `aulaId`; `cursadaId` queda determinado por el agregado. Un único POST/PUT guarda el conjunto atómicamente. Los mocks conservan en memoria los horarios retirados con baja lógica y su pertenencia; la API deberá hacer lo mismo y validar los identificadores recibidos.

El cupo se deriva del aula de menor capacidad; cada inscripción activa ocupa un lugar, independientemente de su condición académica. Se valida también al reactivar o trasladar inscripciones, modificar horarios o reducir aulas. Una inscripción requiere una materia del plan del alumno. Registros activos requieren referencias activas; antes de desactivar una cursada con inscripciones activas hay que inactivarlas. Las inscripciones separan `estado` (`ACTIVO`/`INACTIVO`) de `condicionAcademica` (`CURSANDO`, `REGULAR`, `LIBRE`, `PROMOCIONADO`, `APROBADO`, `DESAPROBADO`). La pareja alumno+cursada sigue reservada tras una baja lógica; para suspensiones temporales usar Inactivo y luego editar la misma inscripción.

Administrador puede gestionar estos módulos; Secretaría solo consulta, busca, filtra, ordena y pagina. El detalle de la cursada ofrece horarios, cupo y acceso al listado filtrado de inscripciones. No hay backend ni garantías de concurrencia entre clientes: las validaciones definitivas y transacciones corresponden a la API futura.

Fechas de presentación: `DD/MM/YYYY`; zona `America/Argentina/Cordoba`. Los días sin hora conservan su fecha de calendario.

## Gestión académica y RFID (Fase 5)

`src/features/gestion` agrega las reglas y vistas específicas sobre los formularios, tablas y servicios compartidos. Administrador administra y confirma bajas lógicas; Secretaría consulta. No incluye backend, lectura de tarjetas ni Raspberry Pi.

- **RFID:** consulta exacta en `/rfid`, normalizada a mayúsculas. La asociación se modifica en la ficha del alumno/profesor; se valida unicidad entre ambos tipos de persona, incluyendo bajas. El contrato futuro `GET /personas/por-rfid/:rfid` devuelve `{ data: { tipo: "ALUMNO" | "PROFESOR", persona } }` o `{ data: null }`.
- **Asistencia:** UI `/asistencia`, REST `/asistencias`. Alta manual, búsqueda y filtros por alumno, cursada, fecha, estado y origen. Exige inscripción previa y horario de la cursada coincidente con el día y período. No admite fechas futuras ni duplicados alumno+horario+fecha. Las correcciones conservan el origen `MANUAL`/`RFID` y actualizan auditoría. La demostración incluye registros RFID ficticios.
- **Evaluaciones/resultados:** recursos `/evaluaciones` y `/resultados`, con los cuatro tipos previstos y una nota por evaluación+alumno inscripto. Notas de 0 a 10, decimales admitidos, aprobación desde 6; el estado se calcula. No se cargan notas de evaluaciones futuras. Las evaluaciones pueden activarse/inactivarse. La condición académica y el estado de la inscripción se administran explícitamente en Inscripciones, accesible desde el resultado; una nota no promociona automáticamente al alumno. El estado de la oferta se administra en Cursadas.
- **Cuotas:** recurso `/cuotas`; una cuota por alumno+año+mes, importe positivo en ARS con hasta dos decimales. `fechaPago` vacía representa falta de pago. Registrar o corregir esa fecha recalcula `PAGADA`; sin pago, se calcula `VENCIDA` si el vencimiento es anterior al día actual de Córdoba, o `PENDIENTE` en otro caso. La ficha del alumno deriva su situación de las cuotas vigentes, sin duplicarla en Alumno.

Los recursos usan el contrato CRUD/paginado anterior y auditoría/baja lógica. Se bloquean cambios o bajas que dejan historial sin inscripción, evaluación u horario; las claves de registros dados de baja siguen reservadas. Las fechas se transportan en ISO y se muestran en formato argentino. La API futura debe repetir validaciones, derivar estados, comprobar permisos y preservar integridad en transacciones; los mocks solamente duran hasta recargar.

## Importación y exportación (Fase 6)

Administrador puede importar alumnos y profesores desde sus listados. Las pantallas incluyen plantillas CSV/XLSX, columnas esperadas, previsualización paginada, errores por fila y confirmación. Admiten CSV UTF-8 con coma o punto y coma, y XLSX con una hoja, sin fórmulas ni celdas combinadas; máximo 2 MB y 1000 registros. Identificadores como texto, fechas `YYYY-MM-DD` y estados `ACTIVO`/`INACTIVO`. Los alumnos usan `carrera_codigo` y `plan_codigo`, vinculados a registros existentes.

Se validan estructura, schemas, relaciones y duplicados dentro del archivo y contra los datos existentes, incluyendo RFID entre alumnos y profesores y bajas lógicas. El mock revalida al confirmar y aplica el lote completo en memoria, sin altas parciales ni actualización de registros existentes.

Ambos roles exportan CSV y XLSX desde los listados académicos, respetando búsqueda, filtros y orden en todas las páginas. Las exportaciones incluyen etiquetas de relaciones y fechas `DD/MM/YYYY`; son informes, no plantillas de reimportación. CSV neutraliza texto interpretable como fórmula. ExcelJS se carga al usar XLSX; su versión y dependencias están fijadas en el lockfile.

Contratos en `src/services/transfer-service.ts`, bajo `/api/v1`:

| Método | Contrato |
| --- | --- |
| `POST /alumnos/importaciones/validar` (o `/profesores/...`) | `{ headers, rows: [{ line, values, errors }] }` → `{ data: { headers, rows, errors } }`. |
| `POST /alumnos/importaciones` (o `/profesores/...`) | Mismo lote → `{ data: { status: "IMPORTED", imported } }` o `{ data: { status: "INVALID", preview } }`. |
| `GET /recurso/exportar` | `search`, `estado`, filtros, `sortBy`, `sortOrder`, `format=csv\|xlsx`; devuelve el archivo completo con MIME correspondiente, sin parámetros de página. |

La API futura debe repetir las validaciones, comprobar permisos y aplicar la importación en una transacción. Los mocks no proporcionan persistencia ni seguridad real.

## Hardening (Fase 7)

Se revisaron permisos, schemas, errores recuperables, estados de carga/vacío, navegación y estilos responsive. Las consultas de referencias y exportaciones abortan ante páginas incompletas, repetidas o totales inconsistentes, sin entregar resultados parciales. Las pruebas cubren reintentos de importación, permisos al invocar hooks directamente y cierre del menú móvil al pasar a escritorio. La comprobación visual y Docker requieren los entornos indicados en el estado de implementación.

## Docker

Con Docker Desktop (contenedores Linux):

```sh
docker compose up --build -d
docker compose down
```

Abrir http://localhost:8080. Build multietapa con `npm ci`, lockfile versionado y Nginx sin privilegios; incluye fallback para rutas directas de React Router. Las imágenes oficiales Node 22 Alpine y Nginx estable Alpine están fijadas por digest para reproducibilidad.

Para una API externa: `docker compose build --build-arg VITE_API_BASE_URL=https://api.ejemplo.edu/api/v1`. Nginx devuelve 503 JSON para `/api/*` hasta que se configure un proxy al backend independiente; esas rutas nunca sirven `index.html`. No incluye servidor de desarrollo, base de datos ni backend.

Estado de la fase y verificaciones: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).
