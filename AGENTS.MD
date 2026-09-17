# Backoffice Facultad — instrucciones permanentes

## Objetivo

Construir un backoffice web para administrar el sistema académico de una facultad.

La aplicación administra alumnos, profesores, carreras, planes de estudio, materias, períodos académicos, sedes, edificios, aulas físicas, comisiones, cursadas, horarios, inscripciones, asistencia, evaluaciones, resultados académicos y cuotas.

El backoffice es únicamente administrativo. En esta etapa solo se desarrolla el FRONTEND.

El sistema debe quedar preparado para conectarse posteriormente a una API REST independiente y para que, en el futuro, otros clientes como una Raspberry Pi o una app móvil consuman la misma API.

## Regla de ejecución

Trabajar por fases.

Implementar SOLO la fase solicitada por el usuario.

No adelantar funcionalidades de fases futuras salvo interfaces, tipos o abstracciones estrictamente necesarias para evitar retrabajo.

Antes de preguntar algo:

1. Revisar este AGENTS.md.
2. Revisar el código existente relevante.
3. Inferir decisiones rutinarias usando estas reglas.

Preguntar únicamente cuando falte una decisión que cambie materialmente arquitectura, datos, seguridad o comportamiento funcional.

No pedir confirmación para decisiones técnicas menores o reversibles.

No repetir ni resumir estas especificaciones en cada respuesta.

Las respuestas finales deben ser breves:

* qué se implementó;
* archivos/áreas principales modificadas;
* verificaciones ejecutadas;
* bloqueos reales, si existen.

No generar explicaciones largas salvo que el usuario las solicite.

## Stack frontend

Usar:

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* TanStack Query
* React Hook Form
* Zod
* Axios
* Vitest
* React Testing Library
* npm

No usar JavaScript cuando pueda usarse TypeScript.

No agregar librerías sin necesidad real.

## Backend futuro

NO desarrollar backend salvo solicitud explícita.

Arquitectura futura prevista:

React
→ REST API
→ Node.js + TypeScript
→ Sequelize
→ MySQL

MySQL y Sequelize pertenecen al backend y NO deben instalarse ni utilizarse directamente en el frontend.

El frontend nunca debe conectarse directamente a MySQL.

Crear una capa desacoplada:

UI
→ hooks/query
→ services
→ API client

Mientras no exista backend, usar mocks detrás de la misma interfaz de servicios.

El reemplazo futuro de mocks por HTTP real no debe requerir modificar los componentes de UI.

Base prevista:

`/api/v1`

## Organización sugerida

Mantener una estructura equivalente a:

src/
app/
assets/
components/
ui/
layout/
forms/
tables/
features/
hooks/
lib/
mocks/
pages/
router/
schemas/
services/
types/
utils/

Organizar funcionalidades grandes por dominio dentro de `features/`.

Evitar componentes gigantes.

Evitar duplicar lógica entre formularios.

## Idioma y localización

Toda la interfaz debe estar en español.

Formato de fecha:

DD/MM/YYYY

Timezone:

America/Argentina/Cordoba

El código puede utilizar nombres técnicos en inglés cuando sea estándar, pero los conceptos del dominio pueden mantenerse en español si mejora la claridad.

Mantener consistencia una vez elegida la convención.

## Diseño

Estilo:

* institucional;
* clásico;
* limpio;
* profesional;
* sobrio.

No existe identidad visual previa.

Usar Tailwind CSS.

Responsive obligatorio:

* desktop;
* tablet;
* mobile.

El diseño debe priorizar backoffice de escritorio sin impedir su utilización desde celular.

Mantener:

* buena jerarquía visual;
* formularios claros;
* tablas legibles;
* navegación consistente;
* estados de carga;
* estados vacíos;
* errores;
* confirmaciones;
* accesibilidad básica.

No utilizar animaciones innecesarias.

## Navegación principal

El backoffice deberá contemplar:

* Inicio
* Alumnos
* Profesores
* Carreras
* Planes de estudio
* Materias
* Períodos académicos
* Sedes
* Edificios
* Aulas
* Comisiones
* Cursadas
* Inscripciones
* Asistencia
* Evaluaciones
* Cuotas
* Usuarios administrativos

El inicio NO debe contener estadísticas ni gráficos.

Puede funcionar como pantalla de bienvenida y acceso a módulos.

## Autenticación

Solo pueden iniciar sesión:

* ADMINISTRADOR
* SECRETARIA

PROFESOR y ALUMNO son entidades académicas, no usuarios del backoffice en esta versión.

### ADMINISTRADOR

Acceso total.

Puede:

* consultar;
* crear;
* modificar;
* desactivar;
* eliminar mediante soft delete;
* importar;
* exportar;
* administrar usuarios;
* crear otros administradores y secretarías.

### SECRETARIA

Solo lectura.

Puede:

* navegar;
* consultar;
* buscar;
* filtrar;
* ordenar;
* paginar;
* exportar CSV;
* exportar Excel.

No puede:

* crear;
* editar;
* eliminar;
* cambiar estados;
* importar;
* administrar usuarios.

Centralizar permisos.

No dispersar comprobaciones de roles manuales por toda la UI.

Crear guards/utilidades reutilizables.

## Seguridad de autenticación

El sistema futuro requiere seguridad alta.

Preparar el frontend y contratos para:

1. email + contraseña;
2. autenticación de dos factores TOTP;
3. aplicaciones compatibles como Google Authenticator o Microsoft Authenticator;
4. códigos de recuperación de un solo uso;
5. recuperación segura de contraseña mediante token temporal enviado por email;
6. expiración de sesión;
7. cierre de sesión.

El frontend no debe afirmar que proporciona seguridad real mientras se utilicen mocks.

La seguridad efectiva se implementará en backend.

Nunca:

* guardar contraseñas;
* guardar secretos TOTP;
* simular criptografía;
* persistir secretos sensibles;
* guardar tokens sensibles deliberadamente en localStorage.

Diseñar los contratos futuros para cookies HttpOnly + Secure cuando corresponda.

## Entidades

### UsuarioAdministrativo

Campos conceptuales:

* id
* nombre
* apellido
* email único
* rol: ADMINISTRADOR | SECRETARIA
* estado: ACTIVO | INACTIVO
* twoFactorEnabled
* createdAt
* updatedAt
* deletedAt

Los secretos de contraseña, TOTP, recuperación y sesión son responsabilidad exclusiva del backend.

### Alumno

* id
* nombre
* apellido
* dni único
* legajo único
* rfid único
* email
* teléfono
* fechaNacimiento
* dirección
* carreraId
* planEstudioId
* fechaIngreso
* estado: ACTIVO | INACTIVO
* createdAt
* updatedAt
* deletedAt

Un alumno solo puede tener UNA carrera activa.

No almacenar `estadoCuota` como dato duplicado: debe derivarse de Cuota.

No almacenar exámenes dentro de Alumno: usar relaciones académicas.

### Profesor

* id
* nombre
* apellido
* dni único
* legajo único
* rfid único
* email
* teléfono
* cargo
* estado
* createdAt
* updatedAt
* deletedAt

Un profesor puede dictar múltiples cursadas.

Una cursada puede tener máximo 3 profesores.

### Sede

* id
* nombre
* dirección
* estado
* createdAt
* updatedAt
* deletedAt

Actualmente puede existir una sola sede, pero la arquitectura debe soportar múltiples.

### Edificio

* id
* nombre
* sedeId
* estado
* createdAt
* updatedAt
* deletedAt

### Aula

Representa un espacio físico.

* id
* numero
* capacidadMaxima
* edificioId
* sedeId
* estado: ACTIVA | INACTIVA
* createdAt
* updatedAt
* deletedAt

NO guardar materia, comisión ni cursada como campos permanentes del aula.

La relación aula/cursada ocurre mediante HorarioCursada.

### Carrera

* id
* codigo
* nombre
* descripción
* estado
* createdAt
* updatedAt
* deletedAt

### PlanEstudio

* id
* codigo
* nombre
* carreraId
* añoVigencia
* estado
* createdAt
* updatedAt
* deletedAt

Una carrera puede tener múltiples planes de estudio.

Un alumno pertenece a una carrera y a un plan.

### Materia

* id
* codigo
* nombre
* descripción
* año
* cuatrimestre
* tipo: OBLIGATORIA | ELECTIVA
* estado
* createdAt
* updatedAt
* deletedAt

Los horarios NO pertenecen directamente a Materia.

Los horarios pertenecen a una cursada.

Las materias se relacionan con planes de estudio.

Contemplar correlatividades simples mediante una relación entre materias.

No desarrollar un motor complejo de correlatividades salvo que sea solicitado.

### PeriodoAcademico

Ejemplos:

2026 - 1er cuatrimestre
2026 - 2do cuatrimestre

Campos:

* id
* año
* cuatrimestre: 1 | 2
* fechaInicio
* fechaFin
* estado
* createdAt
* updatedAt
* deletedAt

### Comision

* id
* nombre
* estado
* createdAt
* updatedAt
* deletedAt

Ejemplos:

* A
* B
* Noche A

### Cursada

Representa una oferta concreta de una materia.

Relaciones principales:

Materia

* Comisión
* Período académico
* profesores
* horarios/aulas.

Campos conceptuales:

* id
* materiaId
* comisionId
* periodoAcademicoId
* estado
* createdAt
* updatedAt
* deletedAt

Una misma materia puede tener múltiples cursadas.

### ProfesorCursada

Relación muchos a muchos.

* profesorId
* cursadaId

Restricción:
máximo 3 profesores por cursada.

El frontend debe validar esta regla.

El backend futuro también deberá validarla.

### HorarioCursada

Una cursada puede tener múltiples horarios semanales.

Ejemplo:

Matemática I — Comisión A:

* lunes 18:00–20:00 — Aula 204
* miércoles 18:00–20:00 — Aula 301

Campos:

* id
* cursadaId
* diaSemana
* horaInicio
* horaFin
* aulaId

Preparar validaciones para:

* horaInicio < horaFin;
* capacidad del aula;
* futuros conflictos de aula/horario.

No implementar un algoritmo complejo de conflictos salvo fase solicitada.

### InscripcionMateria

Representa la inscripción de un alumno a una cursada.

* id
* alumnoId
* cursadaId
* fechaInscripcion
* estado
* condicionAcademica
* createdAt
* updatedAt
* deletedAt

Evitar duplicar la misma inscripción alumno+cursada.

Estados/condiciones posibles:

* CURSANDO
* REGULAR
* LIBRE
* PROMOCIONADO
* APROBADO
* DESAPROBADO

### Asistencia

El RFID será usado externamente por Raspberry Pi para consultar datos y registrar/confirmar asistencia.

El backoffice solo administra y consulta la información.

Campos conceptuales:

* id
* alumnoId
* cursadaId
* fecha
* horarioCursadaId
* estado: PRESENTE | AUSENTE | JUSTIFICADO
* origen: MANUAL | RFID
* createdAt
* updatedAt

Debe ser posible consultar y corregir registros desde el backoffice según permisos.

La Raspberry Pi utilizará posteriormente endpoints REST.

No implementar funcionalidad Raspberry Pi dentro de este frontend.

### Evaluacion

Tipos:

* PARCIAL
* RECUPERATORIO
* TRABAJO_PRACTICO
* FINAL

Campos:

* id
* cursadaId
* tipo
* nombre
* fecha
* descripción
* createdAt
* updatedAt
* deletedAt

### ResultadoEvaluacion

* id
* evaluacionId
* alumnoId
* nota
* estado
* observaciones

Escala:
0 a 10.

Nota mínima de aprobación:
6.

Validar:
0 <= nota <= 10.

### Cuota

No utilizar un simple `estadoCuota` dentro de Alumno.

Modelar:

* id
* alumnoId
* año
* mes
* importe
* fechaVencimiento
* fechaPago
* estado: PENDIENTE | PAGADA | VENCIDA
* createdAt
* updatedAt
* deletedAt

El estado general del alumno respecto a cuotas se deriva de estos registros.

El objetivo principal del proyecto no es financiero, por lo que mantener este módulo simple.

## RFID

Alumno.rfid y Profesor.rfid deben ser únicos.

El backoffice administra la asociación RFID ↔ persona.

No implementar lectura física de tarjetas.

No implementar Raspberry Pi.

Preparar los modelos, servicios y futura API para permitir que otro cliente consulte una persona mediante RFID.

## CRUD

El administrador debe poder gestionar:

* alumnos;
* profesores;
* carreras;
* planes de estudio;
* materias;
* períodos académicos;
* sedes;
* edificios;
* aulas;
* comisiones;
* cursadas;
* horarios;
* inscripciones;
* asistencia;
* evaluaciones;
* resultados;
* cuotas;
* usuarios administrativos.

Aplicar soft delete conceptualmente.

Nunca presentar una acción destructiva como hard delete.

## Tablas

Los listados administrativos deben soportar según corresponda:

* búsqueda;
* filtros;
* ordenamiento;
* paginación;
* estados de carga;
* estado vacío;
* manejo de errores;
* exportación CSV;
* exportación Excel.

Crear componentes reutilizables para evitar implementar una tabla diferente desde cero en cada módulo.

No sobreabstraer prematuramente.

## Formularios y validación

Usar React Hook Form + Zod.

Centralizar schemas en `src/schemas` o dentro de cada feature si la estructura crece.

Evitar escribir las mismas reglas manualmente en distintos formularios.

Inferir tipos desde schemas cuando sea razonable.

Validar como mínimo:

* campos requeridos;
* email;
* DNI;
* legajo;
* RFID;
* fechas;
* rangos;
* notas;
* capacidad;
* horarios;
* relaciones obligatorias.

DNI, legajo y RFID deben tratarse conceptualmente como identificadores únicos.

La validación definitiva de unicidad pertenece al backend.

## Importación

Solo se requiere importación masiva para:

* alumnos;
* profesores.

Formatos:

* CSV
* XLSX

La UI debe permitir:

1. descargar/ver formato esperado;
2. seleccionar archivo;
3. validar estructura;
4. previsualizar registros;
5. mostrar errores por fila;
6. detectar posibles duplicados;
7. confirmar importación.

Mientras no exista backend, implementar mediante servicios mock sin afirmar persistencia real.

### Formato alumnos

Columnas:

nombre
apellido
dni
legajo
rfid
email
telefono
fecha_nacimiento
direccion
carrera_codigo
plan_codigo
fecha_ingreso
estado

Fechas de importación:
YYYY-MM-DD

Estados:
ACTIVO
INACTIVO

### Formato profesores

Columnas:

nombre
apellido
dni
legajo
rfid
email
telefono
cargo
estado

Estados:
ACTIVO
INACTIVO

## Exportación

Permitir CSV y XLSX.

Disponible para:

* ADMINISTRADOR;
* SECRETARIA.

Respetar filtros activos cuando sea razonable.

## API REST futura

Preparar contratos REST consistentes.

Ejemplos:

/api/v1/auth/*
/api/v1/usuarios
/api/v1/alumnos
/api/v1/profesores
/api/v1/carreras
/api/v1/planes-estudio
/api/v1/materias
/api/v1/periodos-academicos
/api/v1/sedes
/api/v1/edificios
/api/v1/aulas
/api/v1/comisiones
/api/v1/cursadas
/api/v1/inscripciones
/api/v1/asistencias
/api/v1/evaluaciones
/api/v1/cuotas

No hardcodear URLs en componentes.

Usar:

VITE_API_BASE_URL

## Ambientes

Preparar:

development
test
production

No commitear secretos.

Crear `.env.example`.

Variables iniciales:

VITE_API_BASE_URL=
VITE_USE_MOCKS=true

En producción:
VITE_USE_MOCKS=false

No colocar claves privadas ni secretos en variables VITE_, ya que son públicas en el bundle.

## Docker

El proyecto debe poder ejecutarse localmente en Windows y mediante Docker.

Preparar Docker solamente cuando corresponda a la fase de infraestructura.

El frontend debe admitir build de producción.

Usar un enfoque reproducible.

## Testing

Usar:

* Vitest;
* React Testing Library.

No escribir tests triviales que únicamente repliquen la implementación.

Priorizar:

* permisos;
* schemas;
* reglas de negocio;
* formularios críticos;
* hooks/lógica compleja.

Playwright/E2E queda para una etapa posterior, especialmente cuando exista backend y autenticación real.

Al finalizar una fase ejecutar, cuando corresponda:

npm run lint
npm run typecheck
npm test
npm run build

No repetir suites amplias sin motivo si ya pasaron y no hubo cambios relacionados.

## Calidad

TypeScript estricto.

Evitar:

* `any`;
* componentes monolíticos;
* lógica de API dentro de componentes;
* duplicación;
* números mágicos;
* URLs hardcodeadas;
* permisos dispersos;
* estado global innecesario.

Preferir:

* tipos explícitos;
* funciones pequeñas;
* componentes reutilizables;
* separación de responsabilidades;
* nombres claros;
* código fácil de mantener.

## Eficiencia de trabajo con Codex

Optimizar uso de contexto y tokens.

Reglas:

* Leer este archivo una vez y reutilizar sus reglas.
* No repetir requisitos conocidos.
* No explicar nuevamente el dominio.
* No generar documentación redundante.
* No recorrer todo el repositorio si solo hace falta inspeccionar una parte.
* Modificar solo archivos relacionados con la fase.
* No crear código especulativo para funcionalidades futuras.
* No instalar dependencias futuras antes de necesitarlas.
* No reescribir archivos estables sin motivo.
* Reutilizar componentes y schemas existentes.
* Resolver automáticamente decisiones rutinarias coherentes con este documento.
* Si existe una solución simple y una sobrearquitecturada que cumplen igual, preferir la simple.
* No sacrificar calidad, seguridad ni mantenibilidad únicamente para ahorrar tokens.

Mantener `docs/IMPLEMENTATION_STATUS.md` muy breve con:

* fase actual;
* completado;
* pendiente;
* decisiones nuevas importantes.

Actualizarlo únicamente al finalizar una fase.

## Fases

### Fase 1 — Foundation

Crear proyecto desde cero.

Objetivos:

* Vite + React + TypeScript;
* Tailwind;
* routing;
* layout responsive;
* navegación;
* estructura del proyecto;
* API client;
* configuración de mocks;
* TanStack Query;
* React Hook Form;
* Zod;
* Axios;
* Vitest;
* Testing Library;
* ESLint;
* TypeScript estricto;
* env development/test/production;
* Docker;
* README mínimo;
* IMPLEMENTATION_STATUS.md.

Crear las páginas/rutas principales como shells funcionales.

No implementar CRUD completos todavía.

### Fase 2 — Autenticación y permisos

Implementar frontend de:

* login;
* recuperación de contraseña;
* reset de contraseña;
* flujo 2FA TOTP;
* ingreso de código;
* códigos de recuperación;
* sesión mock;
* logout;
* guards;
* ADMINISTRADOR;
* SECRETARIA;
* permisos de lectura/escritura/exportación.

No fingir seguridad backend.

### Fase 3 — Núcleo académico

Implementar CRUD y consultas de:

* sedes;
* edificios;
* aulas;
* carreras;
* planes de estudio;
* materias;
* períodos académicos;
* comisiones;
* alumnos;
* profesores.

Incluir:

* tablas;
* búsqueda;
* filtros;
* ordenamiento;
* paginación;
* validaciones;
* detalle;
* create/edit según permisos;
* soft-delete mock.

### Fase 4 — Cursadas

Implementar:

* cursadas;
* asignación de materia;
* comisión;
* período;
* hasta 3 profesores;
* múltiples horarios;
* aulas diferentes por horario;
* inscripciones de alumnos;
* condición académica.

Validar las reglas definidas en este documento.

### Fase 5 — Gestión académica y RFID

Implementar:

* administración RFID alumno/profesor;
* asistencia;
* consulta de asistencia;
* corrección manual;
* evaluaciones;
* resultados;
* notas 0–10;
* aprobación desde 6;
* estado de cursada;
* cuotas.

No implementar Raspberry Pi.

### Fase 6 — Importación y exportación

Implementar:

* importación CSV/XLSX de alumnos;
* importación CSV/XLSX de profesores;
* templates;
* preview;
* validación;
* errores por fila;
* duplicados;
* exportación CSV/XLSX;
* permisos correspondientes.

### Fase 7 — Hardening

Revisar:

* responsive;
* accesibilidad;
* permisos;
* manejo de errores;
* loading states;
* empty states;
* schemas;
* duplicación;
* tests relevantes;
* lint;
* typecheck;
* build;
* Docker;
* documentación mínima.

No rediseñar funcionalidades correctas sin motivo.

## Criterio de finalización de una fase

Una fase está completa cuando:

1. el alcance solicitado está implementado;
2. no existen errores TypeScript conocidos;
3. lint pasa;
4. tests relevantes pasan;
5. build pasa;
6. responsive básico verificado;
7. IMPLEMENTATION_STATUS.md actualizado.

Si alguna comprobación no puede ejecutarse, indicarlo brevemente en vez de afirmar que pasó.
