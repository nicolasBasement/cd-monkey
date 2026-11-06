# Monkey Island — dos revelaciones

Experiencia de apertura hecha con Next.js, React Three Fiber y Three.js. Usa el modelo de Monkey Island y una animación procedural inspirada en la referencia de loot reveal: carga, anticipación, apertura, pausa de canto, impacto, cierre de caja con rebote y doble brillo final.

## Ejecutar

Requiere Node.js 22.18+.

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000. Para producción estática: `npm run build` y `npm start`. El resultado distribuible queda en `out/`.

Si la instalación de Sharp intenta compilar contra una instalación global de libvips, usar `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci`.

## Comparar las opciones

El selector superior permite elegir **A · Tesoro** (apertura dorada) o **B · Murray** (levitación, cámara desde el lado opuesto, trayectoria espiral y apariciones fantasmales). Cambiar de opción cancela la secuencia y el audio anteriores.

No hay botón de apertura: hacer clic en la caja cerrada, o enfocar el visor con Tab y presionar Enter/Espacio. Al terminar, el CD queda ampliado y centrado en X; el movimiento horizontal del mouse lo gira sin pulsar, y en touch se puede arrastrar; otro clic en la caja repite la animación. El aro central tiene un material translúcido separado, no el material opaco del disco.

## Ajustar la animación

| Archivo | Responsabilidad |
| --- | --- |
| `components/motion.ts` | Timeline de 6,8 s, easing, rebotes y momento del impacto. |
| `components/Scene.tsx` | Poses del modelo, cámara, materiales, foil y luces. No reproduce el clip del GLB. |
| `components/RevealEffects.tsx` | Contorno de carga, rayos, partículas y anillo expansivo. |
| `components/MurrayParticles.tsx` | Cuatro apariciones con chroma key por shader, solo en B; no edita la imagen fuente. |
| `components/murray-motion.ts` | Trayectorias, entradas escalonadas y fade de Murray. |
| `components/audio.ts` | Rumble, clic, whoosh y golpe sintetizados; comparte el tiempo de impacto. |
| `components/Experience.tsx` | Estados, replay, sonido, diálogo y accesibilidad. |

Al terminar, el movimiento horizontal del mouse gira el CD sin girar la caja; en touch se conserva el arrastre; con el visor enfocado, las flechas izquierda/derecha también lo rotan. El canvas es de viewport completo, sin plano de fondo, y un control de bounds proyectados mantiene todas las piezas dentro del encuadre durante la apertura y la inspección.

El modo de movimiento reducido salta a la pose final sin sacudidas, partículas, bloom ni audio de revelación.

## Sustituir el modelo

Reemplazar `public/models/cd.glb` por el export optimizado. Conservar las piezas separadas, los transforms y la bisagra: `Top`, `Back`, `CD_low.001` y `CD_low.002`. Three.js normaliza los nombres de los discos a `CD_low001` y `CD_low002`.

La copia actual tiene texturas WebP reducidas provisionalmente. El GLB original en Downloads no se modificó. La optimización definitiva queda pendiente del nuevo modelo; si cambian los pivotes, habrá que ajustar las poses en Scene.

La utilidad opcional `npm run optimize-model -- /ruta/al/modelo.glb` escribe únicamente la copia de `public/models/cd.glb`.

## Verificar

```sh
npm test
npm run typecheck
npm run build
```

Los tests verifican reposo, orden de fases, sincronización del impacto, overshoot y estabilidad numérica. La comprobación visual debe incluir apertura, replay, vista móvil, sonido y movimiento reducido.

Las fuentes se sirven localmente; sus licencias están en `public/fonts/`. No se incluyen el video de referencia ni archivos privados. El arte y las marcas del juego pertenecen a sus titulares.

## Imagen de Murray

`public/textures/murray-reference.png` es la captura aportada por el usuario del GIF de Murray de Monkey Island Wiki. El shader oculta el fondo mostaza y recorta el encuadre por UV; el archivo original se mantiene sin editar. La captura es estática: se animan posición, inclinación y opacidad, y se simula una risa desplazando la mandíbula en UV. No reproduce los fotogramas del GIF original. Las cuatro apariciones terminan antes de habilitar la inspección y se omiten con movimiento reducido.

### Descarga HD
El cierre de ambas variantes alinea el plano del CD con la cámara y muestra el CTA de descarga. Configurá `NEXT_PUBLIC_GAME_DOWNLOAD_URL` con el enlace real antes de compilar; sin enlace se muestra deshabilitado y con “Descarga próximamente”. El giro con mouse/touch continúa disponible sin cursor de doble flecha.

La presentación orienta el disco hacia la cámara durante la extracción (2.05–2.8 s), antes del destello. La caja se retira a un costado para separar siluetas. El contorno de carga copia la matriz mundial del rig, incluida la levitación de Murray. Tipografías locales Pirata One e IM Fell English (licencias OFL en public/fonts); CTA de madera construido con CSS.

### C · Maldito
Tercera opción: presión sin temblor, luz verde, apertura a 1.65 s, extracción frontal corta a 2.25 s y destello/aro a 2.95 s. Sin calaveras ni lluvia de partículas. Murray conserva sus calaveras pero ahora sube en línea recta, pausa brevemente y termina de levitar sin vueltas. Tesoro conserva su coreografía.

Maldito: el CD sale plano de la bandeja antes de girar (2.45–2.8 s). Se desactiva el tilt compartido para evitar que rote dentro de la caja antes de comenzar la extracción.

### D · La cripta
Apertura lenta y extracción recta bajo un haz diagonal dorado, con iluminación más oscura. Niebla baja y polvo procedural en shaders sin imágenes ni rectángulos visibles. La niebla se disipa antes del CTA; en movimiento reducido se desactiva y el haz queda estático. Sin explosión, aro ni calaveras. El disco despeja la bandeja antes de inclinarse.
