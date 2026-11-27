"use client";
// Math whiteboard built on Excalidraw (MIT). Teacher draws; students follow live over the LiveKit data channel.
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";
import MathInput from "./MathInput";
import { latexToSvg } from "@/lib/mathSvg";

/* eslint-disable @typescript-eslint/no-explicit-any */
type El = any;
const enc = new TextEncoder(), dec = new TextDecoder();
const CHUNK = 9000;

export default function Whiteboard({ isTeacher }: { isTeacher: boolean }) {
  const room = useRoomContext();
  const apiRef = useRef<any>(null);
  const pagesRef = useRef<El[][]>([[]]);
  const sentRef = useRef<Map<string, number>>(new Map());
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(1);
  const pageRef = useRef(0); pageRef.current = page;
  const [fit, setFit] = useState(true);
  const fitRef = useRef(true); fitRef.current = fit;
  const [mathOpen, setMathOpen] = useState(false);
  const [latex, setLatex] = useState("\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}");
  const [mathErr, setMathErr] = useState("");
  const inbox = useRef<Map<string, { n: number; parts: string[] }>>(new Map());
  const fitTimer = useRef<any>(null);
  const sendTimer = useRef<any>(null);

  const send = useCallback(async (msg: object, to?: string[]) => {
    const s = JSON.stringify(msg);
    const id = Math.random().toString(36).slice(2, 9);
    const n = Math.ceil(s.length / CHUNK) || 1;
    for (let i = 0; i < n; i++) {
      const piece = JSON.stringify({ id, i, n, d: s.slice(i * CHUNK, (i + 1) * CHUNK) });
      try { await room.localParticipant.publishData(enc.encode(piece), { reliable: true, topic: "wb", destinationIdentities: to }); } catch { /* ignore */ }
    }
  }, [room]);

  const filesFor = (els: El[]) => {
    const api = apiRef.current; if (!api) return undefined;
    const all = api.getFiles?.() || {}; const out: Record<string, any> = {};
    for (const e of els) if (e.type === "image" && e.fileId && all[e.fileId]) out[e.fileId] = all[e.fileId];
    return Object.keys(out).length ? out : undefined;
  };
  const sendFull = useCallback((to?: string[]) => {
    const api = apiRef.current; if (!api) return;
    const els = api.getSceneElementsIncludingDeleted();
    pagesRef.current[pageRef.current] = els as El[];
    els.forEach((e: El) => sentRef.current.set(e.id, e.version));
    void send({ t: "page", page: pageRef.current, total: pagesRef.current.length, els, files: filesFor(els) }, to);
  }, [send]);

  const applyScene = (els: El[], files?: Record<string, any>) => {
    const api = apiRef.current; if (!api) return;
    if (files) api.addFiles(Object.values(files));
    api.updateScene({ elements: els });
  };
  const doFit = () => {
    if (!fitRef.current) return; clearTimeout(fitTimer.current);
    fitTimer.current = setTimeout(() => { const api = apiRef.current; if (!api) return; const els = api.getSceneElements(); if (els.length) api.scrollToContent(els, { fitToContent: true, animate: false }); }, 500);
  };

  useEffect(() => {
    const onData = (payload: Uint8Array, p?: RemoteParticipant, _k?: unknown, topic?: string) => {
      if (topic !== "wb") return;
      let w: { id: string; i: number; n: number; d: string };
      try { w = JSON.parse(dec.decode(payload)); } catch { return; }
      const slot = inbox.current.get(w.id) || { n: w.n, parts: [] }; slot.parts[w.i] = w.d; inbox.current.set(w.id, slot);
      if (slot.parts.filter(x => x !== undefined).length < slot.n) return;
      inbox.current.delete(w.id);
      let m: any; try { m = JSON.parse(slot.parts.join("")); } catch { return; }
      const fromTeacher = !!p?.identity.startsWith("t-");
      if (isTeacher) { if (m.t === "hello" && p) sendFull([p.identity]); return; }
      if (!fromTeacher) return;
      if (m.t === "page") {
        setPage(m.page); pageRef.current = m.page; setTotal(m.total);
        pagesRef.current[m.page] = m.els; applyScene(m.els, m.files); doFit();
      } else if (m.t === "diff" && m.page === pageRef.current) {
        const api = apiRef.current; if (!api) return;
        const cur: El[] = api.getSceneElementsIncludingDeleted(); const map = new Map(cur.map(e => [e.id, e]));
        for (const e of m.els as El[]) { const old = map.get(e.id); if (!old || old.version < e.version || (old.version === e.version && old.versionNonce !== e.versionNonce)) map.set(e.id, e); }
        const order = new Map<string, number>(); (m.els as El[]).forEach((e) => order.set(e.id, 1));
        applyScene([...map.values()], m.files); doFit();
      }
    };
    room.on(RoomEvent.DataReceived, onData as never);
    const onJoin = (p: RemoteParticipant) => { if (isTeacher) sendFull([p.identity]); else if (p.identity.startsWith("t-")) void send({ t: "hello" }, [p.identity]); };
    room.on(RoomEvent.ParticipantConnected, onJoin);
    if (!isTeacher) { const t = [...room.remoteParticipants.values()].find(p => p.identity.startsWith("t-")); if (t) void send({ t: "hello" }, [t.identity]); }
    return () => { room.off(RoomEvent.DataReceived, onData as never); room.off(RoomEvent.ParticipantConnected, onJoin); };
  }, [room, isTeacher, send, sendFull]);

  const onChange = (elements: readonly El[]) => {
    if (!isTeacher) return;
    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => {
      const changed = elements.filter(e => sentRef.current.get(e.id) !== e.version);
      if (!changed.length) return;
      changed.forEach(e => sentRef.current.set(e.id, e.version));
      pagesRef.current[pageRef.current] = elements as El[];
      void send({ t: "diff", page: pageRef.current, els: changed, files: filesFor(changed) });
    }, 120);
  };

  const goPage = (n: number) => {
    const api = apiRef.current; if (!api || !isTeacher) return;
    pagesRef.current[pageRef.current] = api.getSceneElementsIncludingDeleted() as El[];
    if (n >= pagesRef.current.length) pagesRef.current[n] = [];
    sentRef.current.clear(); setPage(n); pageRef.current = n; setTotal(pagesRef.current.length);
    api.updateScene({ elements: pagesRef.current[n] }); api.history?.clear?.();
    sendFull();
  };

  async function insertMath() {
    setMathErr("");
    try {
      const api = apiRef.current; if (!api) return;
      const { dataURL, width, height } = await latexToSvg(latex.trim() || "x");
      const fileId = "m" + Math.random().toString(36).slice(2, 10);
      api.addFiles([{ id: fileId, mimeType: "image/svg+xml", dataURL, created: Date.now() }]);
      const st = api.getAppState(); const cx = (-st.scrollX + st.width / 2) / st.zoom.value, cy = (-st.scrollY + st.height / 2) / st.zoom.value;
      const el = convertToExcalidrawElements([{ type: "image", x: cx - width / 2, y: cy - height / 2, width, height, fileId } as never]);
      api.updateScene({ elements: [...api.getSceneElementsIncludingDeleted(), ...el] });
      setMathOpen(false);
    } catch (e) { setMathErr(e instanceof Error ? e.message : "تعذر إدراج المعادلة."); }
  }

  return <div className="wb-wrap" dir="ltr">
    <div className="wb-bar" dir="rtl">
      {isTeacher ? <>
        <button type="button" className="wb-btn" onClick={() => setMathOpen(true)}>∑ معادلة</button>
        <span className="wb-sep"/>
        {Array.from({ length: total }, (_, i) => <button type="button" key={i} className={`wb-btn${i === page ? " on" : ""}`} onClick={() => goPage(i)}>{i + 1}</button>)}
        <button type="button" className="wb-btn" onClick={() => goPage(total)} aria-label="صفحة جديدة">+ صفحة</button>
      </> : <>
        <span className="small">صفحة {page + 1} من {total} · السبورة للمشاهدة</span>
        <label className="wb-fit"><input type="checkbox" checked={fit} onChange={e => setFit(e.target.checked)}/> ملاءمة تلقائية</label>
      </>}
    </div>
    <div className="wb-canvas">
      <Excalidraw
        excalidrawAPI={(a: any) => { apiRef.current = a; if (isTeacher) setTimeout(() => { try { a.setActiveTool({ type: "freedraw" }); } catch { /* noop */ } }, 400); }}
        onChange={onChange as never}
        viewModeEnabled={!isTeacher}
        langCode="ar-SA"
        UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false, clearCanvas: isTeacher } } as never}
        initialData={{ appState: { currentItemStrokeWidth: 2, currentItemStrokeColor: "#1e1e1e" } } as never}
      />
    </div>
    {mathOpen && <div className="wb-modal" dir="rtl" onClick={e => { if (e.target === e.currentTarget) setMathOpen(false); }}>
      <div className="wb-modal-box"><h3>إدراج معادلة</h3><p className="small">اكتب بلوحة المفاتيح الرياضية أو بصيغة LaTeX.</p>
        <MathInput value={latex} onChange={setLatex}/>
        {mathErr && <p className="err" style={{ color: "#ff8a8a" }}>{mathErr}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button type="button" className="btn btn-primary" onClick={insertMath}>إدراج في السبورة</button><button type="button" className="btn btn-outline" onClick={() => setMathOpen(false)}>إلغاء</button></div>
      </div></div>}
  </div>;
}
