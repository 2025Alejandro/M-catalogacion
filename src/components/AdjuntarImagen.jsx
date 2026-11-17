/**
 * Selector de imágenes de muestra.
 *
 * Qué hace: abre una cuadrícula de 12 miniaturas ya clasificadas fuera del navegador.
 * Recibe: las muestras, la elegida y si el control está deshabilitado.
 * Devuelve: la vista previa y la imagen elegida.
 * Se relaciona con prediccionesVisual.json y ChatWindow. No sube archivos del usuario.
 */

/**
 * @param {{
 *   muestras: { id: string, archivo: string }[],
 *   elegida: { id: string, archivo: string } | null,
 *   deshabilitado: boolean,
 *   onElegir: (muestra: { id: string, archivo: string } | null) => void
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function AdjuntarImagen({
  muestras,
  elegida,
  deshabilitado,
  onElegir,
}) {
  return (
    <div className="adjuntar">
      <details>
        <summary>Adjuntar imagen de muestra</summary>
        <p className="adjuntar-aviso">
          Solo se pueden clasificar las imágenes de muestra: la red neuronal se entrenó fuera del navegador y aquí se muestra su predicción guardada.
        </p>
        <div className="rejilla" role="listbox" aria-label="Imágenes de muestra">
          {muestras.map((muestra) => (
            <button
              key={muestra.id}
              type="button"
              role="option"
              aria-selected={elegida?.id === muestra.id}
              disabled={deshabilitado}
              className={elegida?.id === muestra.id ? 'miniatura elegida' : 'miniatura'}
              onClick={() => onElegir(muestra)}
            >
              <img src={`${process.env.PUBLIC_URL}/${muestra.archivo}`} alt={muestra.id.replaceAll('_', ' ')} />
            </button>
          ))}
        </div>
      </details>
      {elegida && (
        <p className="previa">
          <img src={`${process.env.PUBLIC_URL}/${elegida.archivo}`} alt="" />
          <span>{elegida.id.replaceAll('_', ' ')}</span>
          <button type="button" onClick={() => onElegir(null)} disabled={deshabilitado}>
            Quitar imagen
          </button>
        </p>
      )}
    </div>
  );
}
