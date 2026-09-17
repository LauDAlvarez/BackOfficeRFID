# Estado de implementación

- **Fase actual:** 1 — Foundation implementada; cierre condicionado a las verificaciones de entorno pendientes.
- **Completado:** stack solicitado, TypeScript estricto, layout responsive, inicio sin estadísticas, navegación y 16 shells, 404, componentes accesibles, API client, servicios HTTP/mock, Query, formulario RHF/Zod, ambientes, Docker multietapa y README.
- **Verificado:** `npm run lint`, `npm run typecheck`, `npm test` (42 pruebas), `npm run build`, `git diff --check`; preview HTTP y rutas directas. Se comprobó el rechazo del build con mocks en producción.
- **Pendiente:** revisión visual en desktop/tablet/mobile (sin navegador integrado ni conexión nativa disponible; lanzamiento headless bloqueado por revisión automática). Responsive revisado en código y menú probado con Testing Library; no equivalen a verificación visual. Docker no ejecutado: no está instalado.
- **Decisiones:** mocks sin persistencia; Sedes es solo un ejemplo mínimo de lectura con lista vacía y estados de consulta. REST base `/api/v1`, cookies previstas sin tokens almacenados; producción exige mocks desactivados. Imágenes Docker fijadas por digest. No se implementaron fases posteriores.
