"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Kind = "cube" | "sphere" | "cylinder" | "cone" | "torus";

const LABELS: Record<Kind, string> = {
  cube: "مكعب",
  sphere: "كرة",
  cylinder: "أسطوانة",
  cone: "مخروط",
  torus: "حلقة (توس)",
};

type Metrics = { label: string; formula: string; value: string };

function computeMetrics(kind: Kind, a: number, b: number): Metrics[] {
  const n = (v: number) => Number(v.toFixed(3)).toString();
  switch (kind) {
    case "cube":
      return [
        { label: "الحجم", formula: "V = a³", value: n(Math.pow(a, 3)) },
        { label: "المساحة الكلية", formula: "A = 6a²", value: n(6 * Math.pow(a, 2)) },
        { label: "القطر", formula: "d = a√3", value: n(a * Math.sqrt(3)) },
      ];
    case "sphere":
      return [
        { label: "الحجم", formula: "V = (4/3)πr³", value: n((4 / 3) * Math.PI * Math.pow(a, 3)) },
        { label: "المساحة السطحية", formula: "A = 4πr²", value: n(4 * Math.PI * Math.pow(a, 2)) },
        { label: "المحيط الأعظمي", formula: "C = 2πr", value: n(2 * Math.PI * a) },
      ];
    case "cylinder":
      return [
        { label: "الحجم", formula: "V = πr²h", value: n(Math.PI * Math.pow(a, 2) * b) },
        { label: "المساحة الكلية", formula: "A = 2πr(r+h)", value: n(2 * Math.PI * a * (a + b)) },
        { label: "مساحة القاعدة", formula: "B = πr²", value: n(Math.PI * Math.pow(a, 2)) },
      ];
    case "cone":
      return [
        { label: "الحجم", formula: "V = (1/3)πr²h", value: n((1 / 3) * Math.PI * Math.pow(a, 2) * b) },
        {
          label: "المساحة الكلية",
          formula: "A = πr(r+√(r²+h²))",
          value: n(Math.PI * a * (a + Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2)))),
        },
        {
          label: "الراسم",
          formula: "l = √(r²+h²)",
          value: n(Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))),
        },
      ];
    case "torus":
      return [
        { label: "الحجم", formula: "V = 2π²Rr²", value: n(2 * Math.PI * Math.PI * a * Math.pow(b, 2)) },
        { label: "المساحة السطحية", formula: "A = 4π²Rr", value: n(4 * Math.PI * Math.PI * a * b) },
      ];
  }
}

export default function SolidViewer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [kind, setKind] = useState<Kind>("cube");
  const [a, setA] = useState(1.4);
  const [b, setB] = useState(1.8);

  // one-time scene setup
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b1c, 0.05);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.6, 6.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth || 500, host.clientHeight || 380);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x9aa6c9, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    const cyan = new THREE.PointLight(0x4fe3e8, 160, 30, 2.2);
    cyan.position.set(4, 2, 3);
    scene.add(cyan);
    const violet = new THREE.PointLight(0x6d4aff, 180, 30, 2.2);
    violet.position.set(-4, -1, -3);
    scene.add(violet);

    const grid = new THREE.GridHelper(16, 16, 0x4fe3e8, 0x6d4aff);
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.18;
    });
    grid.position.y = -2.1;
    scene.add(grid);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x6d4aff,
        emissive: 0x1b1150,
        emissiveIntensity: 0.8,
        metalness: 0.6,
        roughness: 0.28,
        flatShading: true,
        transparent: true,
        opacity: 0.92,
      })
    );
    scene.add(mesh);
    meshRef.current = mesh;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      mesh.rotation.y += (event.clientX - lastX) * 0.01;
      mesh.rotation.x += (event.clientY - lastY) * 0.01;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onUp = () => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.getAttribute("data-reduced-motion") === "true";

    let frame = 0;
    const tick = () => {
      if (!reduced && !dragging) mesh.rotation.y += 0.0035;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    return () => {
      window.cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      ro.disconnect();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, []);

  // geometry updates
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.geometry.dispose();
    switch (kind) {
      case "cube":
        mesh.geometry = new THREE.BoxGeometry(a * 1.6, a * 1.6, a * 1.6);
        break;
      case "sphere":
        mesh.geometry = new THREE.SphereGeometry(a * 1.15, 48, 32);
        break;
      case "cylinder":
        mesh.geometry = new THREE.CylinderGeometry(a * 1.05, a * 1.05, b * 1.4, 56);
        break;
      case "cone":
        mesh.geometry = new THREE.ConeGeometry(a * 1.15, b * 1.5, 56);
        break;
      case "torus":
        mesh.geometry = new THREE.TorusGeometry(a * 1.25, b * 0.42, 28, 96);
        break;
    }
  }, [kind, a, b]);

  const metrics = computeMetrics(kind, a, b);

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <span className="plate-label">3D SOLID INSPECTOR</span>
          <h3 className="mt-2 text-lg font-bold text-ink"> المجسمات ثلاثية الأبعاد</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LABELS) as Kind[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`btn px-4 py-2 text-sm ${kind === value ? "btn-primary" : "btn-ghost"}`}
            >
              {LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div ref={hostRef} className="h-[360px] w-full overflow-hidden rounded-2xl border border-line bg-[radial-gradient(120%_100%_at_60%_20%,rgba(109,74,255,0.18),transparent_60%)]" />

        <div className="grid content-start gap-5">
          <div>
            <label className="mb-2 flex items-center justify-between text-sm text-ink-soft">
              {kind === "cube" ? "الضلع a" : kind === "sphere" ? "النصف قطر r" : "النصف قطر القاعدة r"}
              <span className="tnum text-accent">{Number(a.toFixed(2))}</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={a}
              onChange={(event) => setA(Number(event.target.value))}
              className="w-full"
            />
          </div>

          {kind === "cylinder" || kind === "cone" || kind === "torus" ? (
            <div>
              <label className="mb-2 flex items-center justify-between text-sm text-ink-soft">
                {kind === "torus" ? "نصف قطر الأنبوب r" : "الارتفاع h"}
                <span className="tnum text-accent">{Number(b.toFixed(2))}</span>
              </label>
              <input
                type="range"
                min={0.4}
                max={3.4}
                step={0.05}
                value={b}
                onChange={(event) => setB(Number(event.target.value))}
                className="w-full"
              />
            </div>
          ) : null}

          <div className="grid gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-line p-4">
                <p className="text-[0.8rem] text-ink-faint">{metric.label}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <code dir="ltr" className="text-[0.82rem] text-ink-soft">
                    {metric.formula}
                  </code>
                  <span dir="ltr" className="tnum text-accent">
                    {metric.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[0.78rem] leading-[1.9] text-ink-faint">
            اسحب المجسم بفأرتك أو بإصبعك لتدويره، وغيّر الأبعاد لترى تأثيرها فوراً على الحجم والمساحة.
          </p>
        </div>
      </div>
    </div>
  );
}
