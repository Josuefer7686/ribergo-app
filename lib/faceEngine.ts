/**
 * Reconocimiento facial en el teléfono (nada de rostros se envía a terceros).
 * Usa face-api.js (@vladmandic) cargado bajo demanda: solo se descarga cuando
 * un conductor se verifica.
 *
 *  - Prueba de vida: pide parpadear y girar la cabeza a ambos lados en orden
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

export type Challenge = 'blink' | 'turnRight' | 'turnLeft';

export const CHALLENGE_TEXT: Record<Challenge, string> = {
  blink: 'Parpadea una vez',
  turnRight: 'Gira la cabeza hacia tu derecha',
  turnLeft: 'Gira la cabeza hacia tu izquierda',
};

export interface LivenessResult {
  passed: boolean;
  reason?: string;
  descriptor?: Float32Array;
  frame?: HTMLCanvasElement;
  challenges: Challenge[];
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const eyeRatio = (p: { x: number; y: number }[]) => (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3]));

const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta la prueba de vida sobre el video de la cámara frontal.
 * `onPrompt` recibe la instrucción actual para mostrarla en pantalla.
 */
export async function runLiveness(
  video: HTMLVideoElement,
  onPrompt: (text: string, step: number, total: number) => void,
  shouldStop: () => boolean,
): Promise<LivenessResult> {
  const faceapi = await loadFaceApi();
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const challenges = shuffle<Challenge>(['blink', 'turnRight', 'turnLeft']);
  const total = challenges.length + 1;

  const read = async () => {
    const r = await faceapi.detectSingleFace(video, options).withFaceLandmarks();
    if (!r) return null;
    const pts = r.landmarks.positions as { x: number; y: number }[];
    const widthShare = r.detection.box.width / video.videoWidth;
    const yaw = (pts[30].x - pts[0].x) / (pts[16].x - pts[0].x); // 0.5 = de frente
    const ear = (eyeRatio(pts.slice(36, 42)) + eyeRatio(pts.slice(42, 48))) / 2;
    return { yaw, ear, widthShare };
  };

  // 1) Rostro de frente, cerca y estable
  let stable = 0;
  const startAt = Date.now();
  while (stable < 5) {
    if (shouldStop()) return { passed: false, reason: 'Cancelado', challenges };
    if (Date.now() - startAt > 20000) return { passed: false, reason: 'No pudimos ver tu rostro. Busca más luz y acércate.', challenges };
    const f = await read();
    if (!f) { onPrompt('No vemos tu rostro: mira a la cámara', 0, total); stable = 0; }
    else if (f.widthShare < 0.28) { onPrompt('Acércate un poco más', 0, total); stable = 0; }
    else if (f.yaw < 0.4 || f.yaw > 0.6) { onPrompt('Mira de frente a la cámara', 0, total); stable = 0; }
    else { onPrompt('Perfecto, no te muevas', 0, total); stable++; }
    await sleep(120);
  }

  // 2) Retos en orden aleatorio
  for (let i = 0; i < challenges.length; i++) {
    const challenge = challenges[i];
    onPrompt(CHALLENGE_TEXT[challenge], i + 1, total);
    const began = Date.now();
    let done = false;
    let closed = false;
    while (!done) {
      if (shouldStop()) return { passed: false, reason: 'Cancelado', challenges };
      if (Date.now() - began > 12000) return { passed: false, reason: 'No detectamos el movimiento. Inténtalo de nuevo.', challenges };
      const f = await read();
      if (f) {
        if (challenge === 'blink') {
          if (f.ear < 0.2) closed = true;
          else if (closed && f.ear > 0.26) done = true;
        } else if (challenge === 'turnRight') {
          done = f.yaw < 0.38; // en el espejo, tu derecha
        } else {
          done = f.yaw > 0.62;
        }
      }
      await sleep(90);
    }
    await sleep(250);
  }

  // 3) Vuelve al frente y se toma la foto con su huella
  onPrompt('Mira de frente: tomando tu foto', total, total);
  const lastTry = Date.now();
  while (Date.now() - lastTry < 10000) {
    if (shouldStop()) return { passed: false, reason: 'Cancelado', challenges };
    const r = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (r) {
      const pts = r.landmarks.positions as { x: number; y: number }[];
      const yaw = (pts[30].x - pts[0].x) / (pts[16].x - pts[0].x);
      if (yaw > 0.42 && yaw < 0.58) {
        const frame = document.createElement('canvas');
        frame.width = video.videoWidth;
        frame.height = video.videoHeight;
        frame.getContext('2d')!.drawImage(video, 0, 0);
        return { passed: true, descriptor: r.descriptor as Float32Array, frame, challenges };
      }
    }
    await sleep(120);
  }
  return { passed: false, reason: 'No pudimos tomar tu foto de frente. Inténtalo de nuevo.', challenges };
}
