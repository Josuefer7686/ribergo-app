/**
 * Reconocimiento facial en el teléfono (nada de rostros se envía a terceros).
 * Usa face-api.js (@vladmandic) cargado bajo demanda: solo se descarga cuando
 * un conductor se verifica.
 *
 *  - Prueba de vida: pide girar la cabeza a un lado y luego al contrario
 *    aleatorio, así una foto impresa o en pantalla no sirve.
 *  - Coincidencia: compara el rostro en vivo con el del carnet.
 *
 * Es una barrera práctica, no infalible: la administración siempre revisa las
 * fotos antes de aprobar.
 */

const VERSION = '1.7.13';
const BASE = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}`;

/** Distancia máxima entre rostros para considerarlos la misma persona. */
export const FACE_MATCH_MAX_DISTANCE = 0.6;

let loading: Promise<any> | null = null;

export function loadFaceApi(): Promise<any> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const start = async () => {
      try {
        const faceapi = (window as any).faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(`${BASE}/model`),
          faceapi.nets.faceLandmark68Net.loadFromUri(`${BASE}/model`),
          faceapi.nets.faceRecognitionNet.loadFromUri(`${BASE}/model`),
        ]);
        resolve(faceapi);
      } catch (e) {
        reject(e);
      }
    };
    if ((window as any).faceapi) return void start();
    const script = document.createElement('script');
    script.src = `${BASE}/dist/face-api.js`;
    script.async = true;
    script.onload = start;
    script.onerror = () => reject(new Error('No se pudo cargar el reconocimiento facial'));
    document.head.appendChild(script);
  }).catch((e) => {
    loading = null; // permite reintentar
    throw e;
  });
  return loading;
}

/** Huella del rostro de una foto (la del carnet). Null si no se ve una cara. */
export async function descriptorFromImage(img: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array | null> {
  const faceapi = await loadFaceApi();
  const result = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ? (result.descriptor as Float32Array) : null;
}

export async function faceDistance(a: Float32Array, b: Float32Array): Promise<number> {
  const faceapi = await loadFaceApi();
  return faceapi.euclideanDistance(a, b);
}

export type Challenge = 'turnA' | 'turnB';

export interface LivenessStep { id: 'front' | Challenge | 'photo'; label: string }

/** Lo que la pantalla muestra en cada momento de la prueba. */
export interface LivenessUi {
  /** Instrucción grande */
  prompt: string;
  /** Detalle de lo que pasa (p. ej. "Acércate un poco") */
  hint: string;
  tone: 'bad' | 'warn' | 'good';
  steps: LivenessStep[];
  /** Cantidad de pasos ya cumplidos */
  completed: number;
  faceVisible: boolean;
}

export interface LivenessResult {
  passed: boolean;
  reason?: string;
  descriptor?: Float32Array;
  frame?: HTMLCanvasElement;
  challenges: Challenge[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Dos giros seguidos: a un lado y luego al contrario. */
function buildSteps(): LivenessStep[] {
  return [
    { id: 'front', label: 'Mira de frente' },
    { id: 'turnA', label: 'Gira la cabeza a un lado' },
    { id: 'turnB', label: 'Ahora al lado contrario' },
    { id: 'photo', label: 'Foto final' },
  ];
}

/**
 * Prueba de vida sobre el video de la cámara frontal. Es tolerante: se adapta a
 * tu postura inicial (no hay que girar un ángulo exacto) y a ojos pequeños o lentes.
 */
export async function runLiveness(
  video: HTMLVideoElement,
  onUi: (ui: LivenessUi) => void,
  shouldStop: () => boolean,
): Promise<LivenessResult> {
  const faceapi = await loadFaceApi();
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
  const steps = buildSteps();
  const challenges = steps.map((s) => s.id).filter((id): id is Challenge => id === 'turnA' || id === 'turnB');

  let completed = 0;
  const ui = (prompt: string, hint: string, tone: LivenessUi['tone'], faceVisible: boolean) =>
    onUi({ prompt, hint, tone, steps, completed, faceVisible });

  const read = async () => {
    const r = await faceapi.detectSingleFace(video, options).withFaceLandmarks();
    if (!r) return null;
    const pts = r.landmarks.positions as { x: number; y: number }[];
    const box = r.detection.box;
    return {
      widthShare: box.width / video.videoWidth,
      cx: (box.x + box.width / 2) / video.videoWidth,
      yaw: (pts[30].x - pts[0].x) / (pts[16].x - pts[0].x), // 0.5 = de frente
    };
  };

  // 1) Mira de frente, cerca, dentro del óvalo y quieto
  ui('Pon tu cara dentro del óvalo', 'Buscando tu rostro…', 'bad', false);
  let stable = 0;
  let yawBase = 0.5;
  const yawSamples: number[] = [];
  const t0 = Date.now();
  while (stable < 6) {
    if (shouldStop()) return { passed: false, reason: 'Cancelado', challenges };
    if (Date.now() - t0 > 40000) return { passed: false, reason: 'No logramos ver tu rostro con claridad. Busca más luz, quítate gorra o lentes oscuros e inténtalo otra vez.', challenges };
    const f = await read();
    if (!f) { stable = 0; ui('No vemos tu rostro', 'Mira a la cámara y busca más luz', 'bad', false); }
    else if (f.widthShare < 0.2) { stable = 0; ui('Acércate un poco más', 'Tu cara se ve muy pequeña', 'warn', true); }
    else if (f.widthShare > 0.75) { stable = 0; ui('Aléjate un poco', 'Tu cara se ve muy grande', 'warn', true); }
    else if (f.yaw < 0.35 || f.yaw > 0.65) { stable = 0; ui('Mira de frente a la cámara', 'Tu cara está de lado', 'warn', true); }
    else {
      stable++;
      yawSamples.push(f.yaw);
      ui('Perfecto, quédate quieto', 'Rostro detectado', 'good', true);
    }
    await sleep(60);
  }
  yawBase = yawSamples.reduce((a, b) => a + b, 0) / yawSamples.length;
  completed = 1;

  // 2) Retos
  let turnSign = 0;
  for (const step of steps.slice(1, -1)) {
    const began = Date.now();
    let done = false;
    const prompt = step.id === 'turnA' ? 'Gira la cabeza a un lado' : 'Ahora gira hacia el lado contrario';
    ui(prompt, 'Hazlo con calma', 'good', true);
    while (!done) {
      if (shouldStop()) return { passed: false, reason: 'Cancelado', challenges };
      if (Date.now() - began > 15000) {
        return { passed: false, reason: 'No detectamos el movimiento. Hazlo un poco más marcado e inténtalo de nuevo.', challenges };
      }
      const f = await read();
      if (!f) { ui(prompt, 'Perdimos tu rostro: vuelve al centro', 'warn', false); await sleep(60); continue; }
      ui(prompt, 'Muy bien, sigue', 'good', true);
      const delta = f.yaw - yawBase;
      if (step.id === 'turnA') {
        if (Math.abs(delta) >= 0.1) { turnSign = Math.sign(delta); done = true; }
      } else if (Math.sign(delta) === -turnSign && Math.abs(delta) >= 0.1) {
        done = true;
      }
      await sleep(50);
    }
    completed++;
    ui('¡Bien hecho!', 'Paso cumplido', 'good', true);
    await sleep(450);
  }

  // 3) Vuelve al centro y se toma la foto con su huella
  ui('Mira de frente: tomando tu foto', 'No te muevas', 'good', true);
  const lastTry = Date.now();
  while (Date.now() - lastTry < 12000) {
    if (shouldStop()) return { passed: false, reason: 'Cancelado', challenges };
    const r = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (r) {
      const pts = r.landmarks.positions as { x: number; y: number }[];
      const yaw = (pts[30].x - pts[0].x) / (pts[16].x - pts[0].x);
      if (Math.abs(yaw - yawBase) < 0.07) {
        const frame = document.createElement('canvas');
        frame.width = video.videoWidth;
        frame.height = video.videoHeight;
        frame.getContext('2d')!.drawImage(video, 0, 0);
        completed++;
        ui('¡Listo!', 'Rostro capturado', 'good', true);
        return { passed: true, descriptor: r.descriptor as Float32Array, frame, challenges };
      }
    }
    await sleep(80);
  }
  return { passed: false, reason: 'No pudimos tomar tu foto de frente. Inténtalo de nuevo.', challenges };
}
