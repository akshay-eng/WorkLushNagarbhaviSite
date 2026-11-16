import * as THREE from "three";

// Every texture here is painted on a canvas at runtime, so the 3D floor needs
// no downloads beyond the logo it already has.

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finish(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Polished grey concrete with soft mottling, like the floor in the photos. */
export function concreteTexture() {
  const [c, g] = canvas(512, 512);
  const rand = seeded(7);
  g.fillStyle = "#cfcbc4";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 6 + rand() * 40;
    const shade = 190 + Math.floor(rand() * 30);
    g.fillStyle = `rgba(${shade},${shade - 3},${shade - 8},0.06)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 9000; i++) {
    const v = Math.floor(rand() * 60) + 150;
    g.fillStyle = `rgba(${v},${v},${v},0.25)`;
    g.fillRect(rand() * 512, rand() * 512, 1, 1);
  }
  return finish(c, [8, 5]);
}

/** Warm oak planks for the reception and café floor. */
export function woodTexture() {
  const [c, g] = canvas(512, 512);
  const rand = seeded(11);
  const plank = 64;
  for (let row = 0; row < 512 / plank; row++) {
    let x = -rand() * 200;
    while (x < 512) {
      const len = 160 + rand() * 200;
      const base = 168 + Math.floor(rand() * 26);
      g.fillStyle = `rgb(${base + 30},${base},${base - 48})`;
      g.fillRect(x, row * plank, len, plank);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(110,74,40,${0.05 + rand() * 0.08})`;
        g.lineWidth = 1;
        const yy = row * plank + rand() * plank;
        g.beginPath();
        g.moveTo(x, yy);
        g.bezierCurveTo(x + len / 3, yy + rand() * 6 - 3, x + (2 * len) / 3, yy + rand() * 6 - 3, x + len, yy);
        g.stroke();
      }
      g.fillStyle = "rgba(80,55,30,0.35)";
      g.fillRect(x, row * plank, 2, plank);
      x += len;
    }
    g.fillStyle = "rgba(80,55,30,0.3)";
    g.fillRect(0, row * plank, 512, 2);
  }
  return finish(c, [3, 3]);
}

/** Preserved moss wall: dense clumps in a few greens. */
export function mossTexture() {
  const [c, g] = canvas(512, 512);
  const rand = seeded(23);
  g.fillStyle = "#3d6328";
  g.fillRect(0, 0, 512, 512);
  const greens = ["#4f7d34", "#628f3c", "#7aa548", "#365a24", "#8cb352", "#2f4f1f"];
  for (let i = 0; i < 2600; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 4 + rand() * 16;
    g.fillStyle = greens[Math.floor(rand() * greens.length)];
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(255,255,220,${rand() * 0.12})`;
    g.beginPath();
    g.arc(rand() * 512, rand() * 512, 1 + rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c, [1, 1]);
}

/** Glowing script sign: "On air", "maybe coffee". */
export function neonTexture(text: string, color: string, width = 1024, height = 256) {
  const [c, g] = canvas(width, height);
  g.clearRect(0, 0, width, height);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `italic 400 ${Math.floor(height * 0.62)}px "Instrument Serif", Georgia, serif`;
  g.shadowColor = color;
  for (const blur of [40, 20, 8]) {
    g.shadowBlur = blur;
    g.fillStyle = color;
    g.fillText(text, width / 2, height / 2);
  }
  g.shadowBlur = 0;
  g.fillStyle = "#fff8ec";
  g.fillText(text, width / 2, height / 2);
  return finish(c);
}

/** Flat sign with a label, for room plates above the doors. */
export function plateTexture(title: string, sub: string) {
  const [c, g] = canvas(512, 160);
  g.fillStyle = "#023c40";
  g.beginPath();
  g.roundRect(0, 0, 512, 160, 28);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = `600 56px "DM Sans", system-ui, sans-serif`;
  g.textBaseline = "middle";
  g.fillText(title, 36, 62);
  g.fillStyle = "#c8f169";
  g.font = `500 34px "DM Mono", ui-monospace, monospace`;
  g.fillText(sub, 36, 118);
  return finish(c);
}

/** The Worklush W mark recoloured white, for the reception moss wall. */
export function logoTexture(onReady: () => void) {
  const [c, g] = canvas(512, 512);
  const t = finish(c);
  const img = new Image();
  img.onload = () => {
    g.clearRect(0, 0, 512, 512);
    const s = Math.min(512 / img.width, 512 / img.height);
    const w = img.width * s;
    const h = img.height * s;
    g.drawImage(img, (512 - w) / 2, (512 - h) / 2, w, h);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#f5fbff";
    g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = "source-over";
    t.needsUpdate = true;
    onReady();
  };
  img.src = "/images/logo-square.png";
  return t;
}

/** Chess board top. */
export function checkerTexture() {
  const [c, g] = canvas(256, 256);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      g.fillStyle = (i + j) % 2 ? "#3b2a1e" : "#efe2c8";
      g.fillRect(i * 32, j * 32, 32, 32);
    }
  }
  return finish(c);
}

/** Soft radial glow for the selected-seat beacon. */
export function glowTexture() {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(200,241,105,0.95)");
  grad.addColorStop(0.35, "rgba(200,241,105,0.45)");
  grad.addColorStop(1, "rgba(200,241,105,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return finish(c);
}

/** Vertical fade for the light column over the chosen seat. */
export function beamTexture() {
  const [c, g] = canvas(16, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(200,241,105,0)");
  grad.addColorStop(0.7, "rgba(200,241,105,0.35)");
  grad.addColorStop(1, "rgba(200,241,105,0.7)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  return finish(c);
}
