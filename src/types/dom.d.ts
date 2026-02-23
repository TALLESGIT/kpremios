// Estender tipos do DOM para incluir captureStream (API experimental do Chrome)
interface HTMLVideoElement {
  captureStream(frameRate?: number): MediaStream;
}

interface HTMLCanvasElement {
  captureStream(frameRate?: number): MediaStream;
}

