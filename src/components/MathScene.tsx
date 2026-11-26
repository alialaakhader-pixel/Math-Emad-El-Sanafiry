"use client";
import { useEffect, useRef, useState } from "react";

type Shape = "icosahedron" | "cube" | "sphere" | "cone" | "cylinder" | "torus" | "surface";
export default function MathScene({ variant = "hero", shape = "icosahedron", zoom = 1 }: { variant?: "hero" | "viewer"; shape?: Shape; zoom?: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cancelFrame = 0;
    let cleanup = () => {};
    async function mount() {
      const el = holder.current;
      if (!el) return;
      try {
        if (!window.WebGLRenderingContext) { setFallback(true); return; }
        const THREE = await import("three");
        if (disposed || !el) return;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: window.devicePixelRatio < 2, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
        camera.position.set(0, 0, variant === "hero" ? 8.8 : 6.7 / zoom);
        const group = new THREE.Group(); scene.add(group);
        scene.add(new THREE.AmbientLight(0xa8b9ff, 1.8));
        const violet = new THREE.PointLight(0x805eff, 45); violet.position.set(-3, 3, 4); scene.add(violet);
        const cyan = new THREE.PointLight(0x57d7ff, 35); cyan.position.set(3, -2, 4); scene.add(cyan);
        const surface = new THREE.PlaneGeometry(3.7, 3.7, 38, 38);
        const coords = surface.attributes.position;
        for (let i = 0; i < coords.count; i++) { const x = coords.getX(i), y = coords.getY(i); coords.setZ(i, .72 * Math.sin(x * 1.5) * Math.cos(y * 1.5)); }
        surface.computeVertexNormals();
        const coreGeometry = shape === "surface" ? surface : shape === "cube" ? new THREE.BoxGeometry(2.7, 2.7, 2.7) : shape === "sphere" ? new THREE.SphereGeometry(1.75, 32, 24) : shape === "cone" ? new THREE.ConeGeometry(1.7, 3, 40) : shape === "cylinder" ? new THREE.CylinderGeometry(1.5, 1.5, 2.9, 36) : shape === "torus" ? new THREE.TorusGeometry(1.35, .48, 24, 72) : new THREE.IcosahedronGeometry(1.9, 1);
        if (shape !== "surface") surface.dispose();
        const core = new THREE.Mesh(coreGeometry, new THREE.MeshPhysicalMaterial({ color: variant === "hero" ? 0x5042be : 0x5652c9, metalness: .35, roughness: .22, transparent: true, opacity: shape === "surface" ? .65 : .46, side: THREE.DoubleSide, clearcoat: .8 }));
        group.add(core);
        const edges = new THREE.LineSegments(shape === "surface" ? new THREE.WireframeGeometry(coreGeometry) : new THREE.EdgesGeometry(coreGeometry, 12), new THREE.LineBasicMaterial({ color: 0x85dfff, transparent: true, opacity: variant === "hero" ? .68 : .72 }));
        group.add(edges);
        if (shape === "surface") { group.rotation.x = -.7; group.rotation.z = -.25; }
        if (variant === "hero") {
          const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.04, .105, 160, 10, 2, 3), new THREE.MeshStandardMaterial({ color: 0xb9a9ff, emissive: 0x4636a4, emissiveIntensity: .45, metalness: .65, roughness: .22 }));
          group.add(knot);
          const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x74d7f5, transparent: true, opacity: .55 });
          for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35 + i * .13, .008, 5, 100), ringMaterial);
            ring.rotation.x = .45 + i * .65; ring.rotation.y = .3 + i * .75; group.add(ring);
          }
          for (let i = 0; i < 14; i++) {
            const a = i * 2.39996;
            const radius = 2.6 + Math.sin(i * 1.7) * .25;
            const dot = new THREE.Mesh(new THREE.SphereGeometry(i % 4 === 0 ? .046 : .025, 7, 6), new THREE.MeshBasicMaterial({ color: i % 3 ? 0x89dcff : 0xb6a1ff }));
            dot.position.set(Math.cos(a) * radius, Math.sin(a) * radius * .78, Math.sin(a * 2) * .55); group.add(dot);
          }
        } else {
          const axes = new THREE.AxesHelper(2.65); axes.setColors(0x75dcff, 0xbba5ff, 0x82efa8); group.add(axes);
        }
        let visible = true;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const pointer = { x: 0, y: 0 };
        let drag: { x: number; y: number } | null = null;
        const onDown = (event: PointerEvent) => { if (variant === "viewer") { drag = { x: event.clientX, y: event.clientY }; el.setPointerCapture(event.pointerId); } };
        const onUp = (event: PointerEvent) => { drag = null; if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId); };
        const onPointer = (event: PointerEvent) => {
          if (variant === "viewer" && drag) { group.rotation.y += (event.clientX - drag.x) * .012; group.rotation.x += (event.clientY - drag.y) * .012; drag = { x: event.clientX, y: event.clientY }; renderer.render(scene, camera); return; }
          const rect = el.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width - .5) * .35;
          pointer.y = ((event.clientY - rect.top) / rect.height - .5) * .25;
        };
        const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera); };
        const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; }, { threshold: .01 });
        observer.observe(el);
        const resizer = new ResizeObserver(resize); resizer.observe(el);
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        el.addEventListener("pointermove", onPointer);
        resize();
        let last = 0;
        const animate = (t: number) => {
          cancelFrame = requestAnimationFrame(animate);
          if (!visible || document.hidden || t - last < 32) return;
          last = t;
          if (!reduced.matches) { group.rotation.y += variant === "hero" ? .0025 : .003; group.rotation.x += .0007; group.rotation.y += (pointer.x - group.rotation.y % (Math.PI * 2)) * .001; group.rotation.x += (pointer.y - group.rotation.x % (Math.PI * 2)) * .001; }
          renderer.render(scene, camera);
        };
        cancelFrame = requestAnimationFrame(animate);
        cleanup = () => { cancelAnimationFrame(cancelFrame); observer.disconnect(); resizer.disconnect(); el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointerup", onUp); el.removeEventListener("pointercancel", onUp); el.removeEventListener("pointermove", onPointer); group.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) { obj.geometry?.dispose(); const materials = Array.isArray(obj.material) ? obj.material : [obj.material]; materials.forEach(m => m.dispose()); } }); renderer.dispose(); renderer.domElement.remove(); };
      } catch (error) { console.error("3D scene unavailable", error); setFallback(true); }
    }
    mount();
    return () => { disposed = true; cleanup(); cancelAnimationFrame(cancelFrame); };
  }, [variant, shape, zoom]);
  return <div ref={holder} className={`math-scene math-scene-${variant}`} role="img" aria-label={variant === "hero" ? "مجسم هندسي رياضي متحرك ثلاثي الأبعاد" : `مجسم ${shape} ثلاثي الأبعاد`}>{fallback && <div className="scene-fallback"><span>∑</span><i/><i/><i/></div>}</div>;
}
