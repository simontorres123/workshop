const TARGET_BYTES = 900 * 1024;
const MAX_SIDE = 1600;
const WIDTHS = [1600, 1400, 1200];
const QUALITIES = [0.8, 0.75, 0.7, 0.65];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo comprimir la imagen'));
    }, 'image/webp', quality);
  });
}

/**
 * Optimiza fotos de órdenes antes de subirlas.
 * El objetivo es quedar por debajo de 900 KB sin bajar de 1200 px de lado mayor.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) return file;

  try {
    const image = await loadImage(file);
    const originalArea = image.naturalWidth * image.naturalHeight;
    const candidates: File[] = [];

    for (const maxWidth of WIDTHS) {
      const scale = Math.min(1, maxWidth / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) continue;

      context.drawImage(image, 0, 0, width, height);

      for (const quality of QUALITIES) {
        const blob = await canvasToBlob(canvas, quality);
        candidates.push(new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, {
          type: 'image/webp',
          lastModified: file.lastModified,
        }));

        if (blob.size <= TARGET_BYTES) {
          return candidates[candidates.length - 1];
        }
      }
    }

    const smallest = candidates.sort((a, b) => a.size - b.size)[0];
    // Nunca aumentar el archivo: si ya era pequeño, conservamos el original.
    if (!smallest || (file.size <= smallest.size && originalArea <= MAX_SIDE * MAX_SIDE)) {
      return file;
    }
    return smallest;
  } catch (error) {
    console.warn('No se pudo optimizar la imagen; se usará el archivo original.', error);
    return file;
  }
}

