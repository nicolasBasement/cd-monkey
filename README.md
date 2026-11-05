# The vault — CD reveal

Experiencia de apertura hecha con Next.js, React Three Fiber y Three.js. Usa el modelo de Monkey Island y una animación procedural inspirada en la referencia de loot reveal: carga, anticipación, apertura, giro contenido, impacto y brillo final.

## Ejecutar

Requiere Node.js 22.18+.

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000. Para producción estática: `npm run build` y `npm start`. El resultado distribuible queda en `out/`.

Si la instalación de Sharp intenta compilar contra una instalación global de libvips, usar `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci`.

## Ajustar la animación

| Archivo | Responsabilidad |
| --- | --- |
| `components/motion.ts` | Timeline de 6,2 s, easing, rebotes y momento del impacto. |
| `components/Scene.tsx` | Poses del modelo, cámara, materiales, foil y luces. No reproduce el clip del GLB. |
| `components/RevealEffects.tsx` | Contorno de carga, rayos, partículas y anillo expansivo. |
| `components/audio.ts` | Rumble, clic, whoosh y golpe sintetizados; comparte el tiempo de impacto. |
| `components/Experience.tsx` | Estados, replay, sonido, diálogo y accesibilidad. |

Al terminar, se puede arrastrar el CD con mouse o touch sin girar la caja; con el visor enfocado, las flechas izquierda/derecha también lo rotan. El canvas es de viewport completo, sin plano de fondo, y un control de bounds proyectados mantiene todas las piezas dentro del encuadre durante la apertura y la inspección.

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
