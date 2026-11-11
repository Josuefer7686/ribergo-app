/** Utilidades de imagen del navegador: reducen las fotos para que viajen ligeras y seguras. */

export type ImageSource = Blob | HTMLCanvasElement | HTMLVideoElement;

async function toCanvas(source: ImageSource, maxSide: number): Promise<HTMLCanvasElement> {
  let w: number, h: number;
  let draw: CanvasImageSource;
  if (source instanceof HTMLCanvasElement) {
    w = source.width; h = source.height; draw = source;
  } else if (source instanceof HTMLVideoElement) {
    w = source.videoWidth; h = source.videoHeight; draw = source;
  } else {
    // Las fotos de cámara pesan 12+ MP: se decodifican ya reducidas para no agotar la memoria del teléfono
    let bmp: ImageBitmap;
    try {
      bmp = await createImageBitmap(source, { imageOrientation: 'from-image', resizeWidth: maxSide, resizeQuality: 'medium' });
    } catch {
      bmp = await createImageBitmap(source, { imageOrientation: 'from-image' });
    }
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return canvas;
  }
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d')!.drawImage(draw, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const approxBytes = (dataUrl: string) => Math.floor(((dataUrl.length - 23) * 3) / 4);

/** JPEG que cabe en `maxBytes`: baja la calidad y luego el tamaño hasta lograrlo. */
export async function compressToLimit(input: ImageSource, maxSide: number, maxBytes: number): Promise<string> {
  // Un archivo se decodifica una sola vez (ya reducido) y de ahí se sigue comprimiendo
  const source: ImageSource = input instanceof Blob ? await toCanvas(input, maxSide) : input;
  let side = maxSide;
  for (let round = 0; round < 4; round++) {
    const canvas = await toCanvas(source, side);
    for (const q of [0.8, 0.7, 0.6, 0.5, 0.4]) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (approxBytes(url) <= maxBytes) return url;
    }
    side = Math.round(side * 0.8);
  }
  throw new Error('No se pudo reducir la foto');
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Imagen inválida'));
    img.src = src;
  });
}
