import * as THREE from "three";
import { random } from "./environment";

/** Small generated surface maps; no downloads or image assets. */
export function surfaceTexture(kind: "wood" | "fabric" | "foliage" | "planet") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(256, 256);
  const rand = random(kind === "wood" ? 17 : 29);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const noise = rand();
      const grain = Math.sin(
        x * 0.6 + Math.sin(y * 0.038) * 2 + Math.sin(y * 0.012) * 4,
      );
      const value =
        kind === "planet"
          ? 175 +
            Math.sin(y * 0.16 + Math.sin((x / 256) * Math.PI * 2) * 0.8) * 35 +
            noise * 22
          : kind === "wood"
            ? 205 + grain * 15 + noise * 24
            : kind === "fabric"
              ? 210 + ((x % 2) + (y % 2)) * 9 + noise * 18
              : 165 + noise * 70 + Math.sin(x * 0.12) * Math.sin(y * 0.14) * 20;
      const index = (y * 256 + x) * 4;
      pixels.data[index] =
        pixels.data[index + 1] =
        pixels.data[index + 2] =
          value;
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "wood" ? 4 : 3, kind === "wood" ? 9 : 3);
  if (kind === "planet") texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function mountainGeometry() {
  const geometry = new THREE.PlaneGeometry(150, 38, 80, 20);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const depth = (positions.getY(i) + 19) / 38;
    const ridge =
      6 +
      Math.sin(x * 0.075) * 3.5 +
      Math.sin(x * 0.17 + 1) * 2.2 +
      Math.sin(x * 0.34) * 0.65;
    const height =
      Math.pow(Math.sin(depth * Math.PI), 0.8) * ridge +
      Math.sin(x * 0.3 + depth * 12) * Math.sin(depth * Math.PI) * 0.7;
    positions.setXYZ(i, x, height - 0.4, -32 - depth * 38);
  }
  geometry.computeVertexNormals();
  return geometry;
}
