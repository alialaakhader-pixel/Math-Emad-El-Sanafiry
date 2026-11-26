"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Body = {
  mesh: THREE.Mesh;
  spin: THREE.Vector3;
  bob: number;
  phase: number;
  baseY: number;
};

/**
 * A living mathematical instrument: wireframe solids, axis arrows,
 * a coordinate grid and a drifting point field. Pure three.js, no runtime
 * asset fetching — everything is procedural geometry.
 */
export default function Scene3D({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced =
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.getAttribute("data-reduced-motion") === "true");

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b1c, 0.045);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 1.4, 8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 600);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    /* ── lighting ── */
    scene.add(new THREE.AmbientLight(0x8b93c8, 0.55));
    const key = new THREE.DirectionalLight(0xdfe6ff, 1.25);
    key.position.set(4, 7, 6);
    scene.add(key);
    const cyan = new THREE.PointLight(0x4fe3e8, 260, 40, 2.2);
    cyan.position.set(6, 2, 4);
    scene.add(cyan);
    const violet = new THREE.PointLight(0x6d4aff, 320, 42, 2.2);
    violet.position.set(-7, -1, -3);
    scene.add(violet);
    const rim = new THREE.DirectionalLight(0x2e7cf6, 0.8);
    rim.position.set(-5, 3, -6);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);

    /* ── coordinate grid floor ── */
    const grid = new THREE.GridHelper(26, 26, 0x4fe3e8, 0x6d4aff);
    const gridMat = grid.material as THREE.Material | THREE.Material[];
    if (Array.isArray(gridMat)) gridMat.forEach((m) => ((m as THREE.Material).opacity = 0.16));
    else (gridMat as THREE.Material).opacity = 0.16;
    (Array.isArray(gridMat) ? gridMat : [gridMat]).forEach((m) => {
      m.transparent = true;
    });
    grid.position.y = -2.6;
    world.add(grid);

    /* ── axis arrows ── */
    const axisMat = new THREE.LineBasicMaterial({ color: 0x4fe3e8, transparent: true, opacity: 0.65 });
    const makeAxis = (to: THREE.Vector3) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.6, 0), to]);
      const line = new THREE.Line(geo, axisMat);
      world.add(line);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.3, 12),
        new THREE.MeshBasicMaterial({ color: 0x4fe3e8, transparent: true, opacity: 0.85 })
      );
      tip.position.copy(to);
      tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().normalize());
      world.add(tip);
    };
    makeAxis(new THREE.Vector3(6.4, -2.6, 0));
    makeAxis(new THREE.Vector3(0, 3.6, 0));
    makeAxis(new THREE.Vector3(0, -2.6, -6.4));

    /* ── solids ── */
    const bodies: Body[] = [];

    const solid = (
      geo: THREE.BufferGeometry,
      mat: THREE.MeshStandardMaterial,
      position: THREE.Vector3,
      spin: THREE.Vector3,
      bob: number
    ) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      world.add(mesh);
      bodies.push({ mesh, spin, bob, phase: Math.random() * Math.PI * 2, baseY: position.y });
    };

    const violetWire = new THREE.MeshStandardMaterial({
      color: 0x8b6bff,
      emissive: 0x2a1a72,
      emissiveIntensity: 0.9,
      metalness: 0.75,
      roughness: 0.32,
      wireframe: true,
      transparent: true,
      opacity: 0.92,
    });

    const glassViolet = new THREE.MeshStandardMaterial({
      color: 0x6d4aff,
      emissive: 0x1b1150,
      emissiveIntensity: 0.7,
      metalness: 0.55,
      roughness: 0.22,
      flatShading: true,
      transparent: true,
      opacity: 0.9,
    });

    const glassCyan = new THREE.MeshStandardMaterial({
      color: 0x4fe3e8,
      emissive: 0x0b4b55,
      emissiveIntensity: 0.85,
      metalness: 0.4,
      roughness: 0.18,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    });

    const glassBlue = new THREE.MeshStandardMaterial({
      color: 0x2e7cf6,
      emissive: 0x0b2459,
      emissiveIntensity: 0.8,
      metalness: 0.65,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });

    // the centrepiece: a slowly turning wireframe torus knot
    solid(new THREE.TorusKnotGeometry(1.45, 0.42, 180, 26), violetWire, new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(0.055, 0.085, 0.03), 0.16);
    solid(new THREE.IcosahedronGeometry(0.92, 0), glassCyan, new THREE.Vector3(-3.6, 1.55, -1.2), new THREE.Vector3(0.075, 0.06, 0.045), 0.26);
    solid(new THREE.OctahedronGeometry(0.78, 0), glassBlue, new THREE.Vector3(3.75, 1.35, -1.6), new THREE.Vector3(0.06, 0.09, 0.05), 0.22);
    solid(new THREE.ConeGeometry(0.72, 1.55, 4), glassViolet, new THREE.Vector3(3.1, -1.35, 1.1), new THREE.Vector3(0.045, 0.11, 0.035), 0.2);
    solid(new THREE.CylinderGeometry(0.62, 0.62, 1.35, 36), glassCyan, new THREE.Vector3(-3.25, -1.5, 1.35), new THREE.Vector3(0.05, 0.075, 0.06), 0.18);
    solid(new THREE.SphereGeometry(0.68, 36, 24), glassBlue, new THREE.Vector3(-1.95, -0.55, -2.85), new THREE.Vector3(0.035, 0.05, 0.02), 0.24);
    solid(new THREE.TorusGeometry(1.15, 0.055, 16, 120), glassViolet, new THREE.Vector3(1.65, -0.35, -3.1), new THREE.Vector3(0.02, 0.065, 0.03), 0.14);

    /* ── point field ── */
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 7 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.35) * 9;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      pointsGeo,
      new THREE.PointsMaterial({
        color: 0xb9aeff,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    world.add(points);

    /* ── interaction & loop ── */
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    if (!reduced) window.addEventListener("pointermove", onPointerMove, { passive: true });

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

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      const t = clock.getElapsedTime();
      for (const body of bodies) {
        body.mesh.rotation.x += body.spin.x * 0.35;
        body.mesh.rotation.y += body.spin.y * 0.35;
        body.mesh.rotation.z += body.spin.z * 0.35;
        body.mesh.position.y = body.baseY + Math.sin(t * 0.5 + body.phase) * body.bob;
      }
      world.rotation.y = Math.sin(t * 0.08) * 0.16;
      points.rotation.y = t * 0.012;

      camera.position.x += (pointer.x * 1.15 - camera.position.x) * 0.035;
      camera.position.y += (1.4 - pointer.y * 0.75 - camera.position.y) * 0.035;
      camera.lookAt(0, 0.1, 0);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    if (reduced) {
      renderer.render(scene, camera);
    } else {
      frame = window.requestAnimationFrame(render);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      ro.disconnect();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
