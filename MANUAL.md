# SnackGame Studio · Manual de uso

Web: https://snkgm.github.io/snackgame-studio/

## 1. Menú principal
- **Publicaciones**: calendario (mes/semana/lista) con todas las publicaciones. Arrastra para cambiar de día. Clic para abrir en el editor.
- **Plantillas**: diseños guardados por tipo, categoría y formato. Uno por combinación puede ser el predeterminado.
- **Automatizaciones**: programación por lotes (listas de productos que se generan solas).
- **Tipos y categorías**: edita tipos de publicación, categorías y sus presets (hashtag y web).

## 2. Crear una publicación a mano
1. En Publicaciones pulsa **Nueva publicación**.
2. Elige tipo, categoría y uno o varios formatos, y busca el producto de la tienda o sube una foto.
3. Se crea una versión por formato con la plantilla predeterminada. Ábrela para editarla.

## 3. Editor
- Capas a la izquierda, propiedades a la derecha, formato abajo.
- **Fondo**: modo automático (1, 2 o 3 colores del producto), color liso, imagen o biblioteca. Ajusta ángulo, luz, viñeta, saturación y **Textura (grano %)**.
- **Producto**: quitar fondo automático, tamaño, posición y sombra (se guardan como regla de la plantilla).
- **Textos**: hashtag, título, frase, web. El título se ajusta solo para no desbordar.
- **Diapositivas**: en formato carrusel; exporta ZIP.
- **Guardar como plantilla**: conserva diseño y reglas para reutilizarlo con otros productos.

## 4. Programación por lotes (Automatizaciones)
1. Automatizaciones → **Nueva lista**.
2. Bloque 1: tipo de publicación (ej. Diario). Bloque 2: categoría (ej. Funkos).
3. Bloque 3: formatos (ej. Feed 3:4) y plantilla por formato (si no eliges, se usa el diseño básico automático). Imágenes por publicación: 1 a 4. Con 2 o más se crea un carrusel con el mismo diseño; solo cambia el producto (ej. Funko en caja + fuera de caja).
4. Bloque 4: frecuencia. **Días de la semana** (ej. L/X/V) o **cada N días**, primer día y hora (zona Europa/Madrid).
5. Bloque 5: pega la lista, una línea por producto: `Nombre  URL-de-snackgame.es  Subtítulo opcional`. Pulsa **Revisar fotografías**: verás las fotos de cada ficha, orden de la galería, duplicadas o de baja calidad marcadas. Haz clic en una foto para elegir/quitar (el número indica el orden) y en ⤢ para ampliarla. Por defecto se toman las dos primeras válidas.
6. Bloque 6: resumen (productos, publicaciones, imágenes, incidencias, primera y última fecha). **Iniciar procesamiento** o **Guardar sin iniciar**.

### Qué pasa después
- El procesamiento corre en la nube (GitHub Actions); puedes cerrar el navegador y apagar el PC. Tarda unos minutos en arrancar tras pulsar Iniciar (el reloj de GitHub tiene retraso, a veces 15 min o más).
- Cada producto: descarga fotos originales → quita el fondo → analiza colores → genera fondo → compone → guarda → queda **Programada** en el calendario.
- Un producto con error (URL rota, pocas fotos) no detiene al resto.

### Panel de seguimiento
Resumen de la lista, barra de progreso, estado de cada producto, contador de **Quedan** y próxima fecha. Se actualiza solo.
- **LISTA AGOTADA** (rojo): no quedan publicaciones por salir. Usa **Añadir productos**.
- Botones: Pausar / Reanudar, Reintentar errores, Regenerar imágenes (rehace todo con el diseño actual), Cancelar (conserva lo ya creado), Abrir en editor, clic en la miniatura para vista previa.

## 5. Consejos
- Si un recorte sale mal, abre la publicación en el editor y sustituye/ajusta la capa de producto.
- Para cambiar el diseño de todas: edita/crea la plantilla, márcala predeterminada y usa **Regenerar imágenes**.
- Meta/Instagram: la preparación está hecha (producto, campaña, fecha, formato, plantilla, imágenes en orden, texto). **Todavía no se publica en Instagram**; "Programada" significa programada en el calendario interno.

## 6. Seguridad
La web está abierta a quien conozca la URL hasta que actives el inicio de sesión:
1. Supabase → Authentication → Users → Add user (tu email y contraseña, Auto confirm).
2. Authentication → Sign In / Providers → desactiva "Allow new users to sign up".
3. GitHub → repo → Settings → Secrets and variables → Actions → crea `STUDIO_EMAIL` y `STUDIO_PASSWORD`.
4. Avísame y activo el bloqueo (`AUTH_REQUIRED` y las políticas de `supabase/auth.sql`).

## 7. Pexels (opcional, pendiente)
Solo para fondos ambientales (nunca sustituye las fotos del producto). La clave se guardará como secreto de GitHub, nunca en el código.
