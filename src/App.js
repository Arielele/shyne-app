import { useState, useEffect, useRef } from "react";
import lucaImg from "./luca.jpg";

const QUESTIONS = [
  { id: "gender", question: "¿Cuál es tu género?", subtitle: "Para personalizar mejor tus recomendaciones", options: ["Hombre", "Mujer", "Prefiero no decir"], icons: ["♂", "♀", "◇"] },
  { id: "age", question: "¿Qué edad tenés?", subtitle: "Tu etapa de vida importa para tu estilo", options: ["18-25", "26-35", "36-45", "45+"], icons: ["✦", "✦", "✦", "✦"] },
  { id: "goal", question: "¿Cuál es tu objetivo principal?", subtitle: "Shyne se enfoca en lo que más te importa", options: ["Verme mejor", "Ganar confianza", "Mejorar mi estilo", "Cuidar mi imagen"], icons: ["✨", "💪", "👁", "🌟"] },
  { id: "style", question: "¿Cómo describirías tu estilo actual?", subtitle: "Sin juicios — punto de partida honesto", options: ["No tengo estilo definido", "Casual y cómodo", "Elegante", "Una mezcla rara"], icons: ["?", "☁", "◈", "∞"] },
  { id: "focus", question: "¿Qué área querés mejorar primero?", subtitle: "Podemos trabajar todo, pero empezamos por algo", options: ["Mi ropa y outfits", "Mi skincare", "Mi imagen general", "Todo a la vez"], icons: ["👗", "✦", "◎", "⟡"] }
];

const SECTIONS = [
  { id: "luca", label: "Luca", icon: "◈" },
  { id: "armario", label: "Armario", icon: "◻" },
  { id: "skincare", label: "Skincare", icon: "✦" },
  { id: "tienda", label: "Descubrí", icon: "⟡" },
  { id: "perfil", label: "Perfil", icon: "◎" },
];

const SITUACIONES = ["Trabajo / reunión", "Cita romántica", "Salida con amigos", "Día casual", "Evento especial", "Gym / deporte"];
const COLORES_OPCIONES = ["Neutros (negro, blanco, gris)", "Tierra (camel, marrón, verde oliva)", "Azules y marinos", "Colores vivos", "Pasteles", "Todo oscuro"];
const CLIMA_OPCIONES = ["Frío todo el año", "Calor todo el año", "4 estaciones", "Muy húmedo", "Seco"];

const API_URL = "/api/chat";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_FREE_PHOTOS = 1;

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callClaude(messages, system = "") {
  const body = { model: MODEL, max_tokens: 1000, messages };
  if (system) body.system = system;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export default function App() {
  const [phase, setPhase] = useState("splash");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [activeSection, setActiveSection] = useState("luca");
  const [animating, setAnimating] = useState(false);
  const chatEndRef = useRef(null);

  // Perfil estático del usuario
  const [perfil, setPerfil] = useState({
    nombre: "",
    foto: null,
    fotoBase64: null,
    fotoMime: "image/jpeg",
    colores: [],
    clima: "",
    situaciones: [],
  });
  const [perfilGuardado, setPerfilGuardado] = useState(false);

  // Chat
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Armario
  const PRENDA_KEYS = ["top", "bottom", "shoes", "acc"];
  const PRENDA_LABELS = { top: "Superior / Top", bottom: "Pantalón / Bottom", shoes: "Calzado", acc: "Accesorios" };
  const PRENDA_PH = { top: "ej. camisa blanca oversize", bottom: "ej. jeans azules slim", shoes: "ej. zapatillas blancas", acc: "ej. reloj, cinturón" };
  const [wardrobeText, setWardrobeText] = useState({ top: "", bottom: "", shoes: "", acc: "" });
  const [wardrobePhotos, setWardrobePhotos] = useState({ top: [], bottom: [], shoes: [], acc: [] });
  const [wardrobePhotosB64, setWardrobePhotosB64] = useState({ top: [], bottom: [], shoes: [], acc: [] });
  const [situacion, setSituacion] = useState("");
  const [outfitResult, setOutfitResult] = useState("");
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);

  // Skincare & Tienda
  const [skincareResult, setSkincareResult] = useState("");
  const [skincareLoading, setSkincareLoading] = useState(false);
  const [tiendaResult, setTiendaResult] = useState("");
  const [tiendaLoading, setTiendaLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("onboarding"), 2400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // Contexto de perfil para Luca
  const buildPerfilContext = () => {
    if (!perfilGuardado) return "";
    return `
Perfil del usuario:
- Nombre: ${perfil.nombre || "no indicado"}
- Colores favoritos: ${perfil.colores.join(", ") || "no indicado"}
- Clima donde vive: ${perfil.clima || "no indicado"}
- Situaciones donde quiere verse bien: ${perfil.situaciones.join(", ") || "no indicado"}
- Género: ${answers.gender}, Edad: ${answers.age}, Objetivo: ${answers.goal}, Estilo actual: ${answers.style}`.trim();
  };

  const selectOption = (option) => {
    if (animating) return;
    const newAnswers = { ...answers, [QUESTIONS[currentQ].id]: option };
    setAnswers(newAnswers);
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setPhase("app");
        generateWelcome(newAnswers);
      }
    }, 350);
  };

  const generateWelcome = async (ans) => {
    setChatLoading(true);
    try {
      const reply = await callClaude([{
        role: "user",
        content: `Eres Luca, estilista personal de Shyne. Español, cálido, directo. NUNCA digas que eres IA. Usuario: Género: ${ans.gender}, Edad: ${ans.age}, Objetivo: ${ans.goal}, Estilo: ${ans.style}. Escribí una bienvenida personalizada en máximo 2 oraciones. Luego en una oración invitalo a que complete su perfil en la sección Perfil para que puedas conocerlo mejor.`
      }]);
      setChatHistory([{ role: "luca", text: reply }]);
    } catch {
      setChatHistory([{ role: "luca", text: "¡Bienvenido/a a Shyne! Soy Luca, tu estilista personal. Completá tu perfil para que pueda conocerte mejor y darte recomendaciones más precisas." }]);
    } finally { setChatLoading(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", text: userMsg }];
    setChatHistory(newHistory);
    setChatLoading(true);

    const perfilCtx = buildPerfilContext();
    const system = `Eres Luca, estilista personal de Shyne. Español, cálido, directo, con criterio propio. NUNCA digas que eres IA. Solo hablás de imagen, moda, estilo, outfits, skincare y confianza personal. Si preguntan otra cosa, redirigís con humor hacia tu especialidad.

${perfilCtx}

Cuando el usuario pide un look o consejo de outfit, SIEMPRE preguntá primero: 1) para qué ocasión es, 2) cómo está el clima hoy, antes de dar la recomendación. Si ya te lo dijeron en la conversación, usá esa info directamente. Respuestas cortas y directas, máximo 4 oraciones.`;

    // Incluir foto del perfil si existe y es el primer mensaje relevante
    const messages = newHistory.map((m, idx) => {
      if (m.role === "user" && idx === newHistory.length - 1 && perfil.fotoBase64) {
        return {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: perfil.fotoMime, data: perfil.fotoBase64 } },
            { type: "text", text: m.text }
          ]
        };
      }
      return { role: m.role === "luca" ? "assistant" : "user", content: m.text };
    });

    try {
      const reply = await callClaude(messages, system);
      setChatHistory([...newHistory, { role: "luca", text: reply }]);
    } catch {
      setChatHistory([...newHistory, { role: "luca", text: "Algo salió mal. Intentá de nuevo." }]);
    } finally { setChatLoading(false); }
  };

  // Foto de perfil
  const handlePerfilFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const b64 = await toBase64(file);
    setPerfil(p => ({ ...p, foto: url, fotoBase64: b64, fotoMime: file.type }));
  };

  const togglePerfilColor = (c) => setPerfil(p => ({ ...p, colores: p.colores.includes(c) ? p.colores.filter(x => x !== c) : [...p.colores, c] }));
  const togglePerfilSituacion = (s) => setPerfil(p => ({ ...p, situaciones: p.situaciones.includes(s) ? p.situaciones.filter(x => x !== s) : [...p.situaciones, s] }));

  const guardarPerfil = () => {
    setPerfilGuardado(true);
    setActiveSection("luca");
    setChatHistory(prev => [...prev, { role: "luca", text: `¡Perfecto${perfil.nombre ? `, ${perfil.nombre}` : ""}! Ya tengo tu perfil completo. Ahora puedo darte recomendaciones mucho más precisas. ¿Querés que te arme un look o empezamos por otra cosa?` }]);
  };

  // Armario fotos
  const handleWardrobePhoto = async (key, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (wardrobePhotos[key].length >= MAX_FREE_PHOTOS) {
      setShowPlusModal(true);
      return;
    }
    const url = URL.createObjectURL(file);
    const b64 = await toBase64(file);
    setWardrobePhotos(p => ({ ...p, [key]: [...p[key], url] }));
    setWardrobePhotosB64(p => ({ ...p, [key]: [...p[key], { data: b64, type: file.type }] }));
  };

  const removeWardrobePhoto = (key, idx) => {
    setWardrobePhotos(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));
    setWardrobePhotosB64(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));
  };

  const generateOutfit = async () => {
    const hasContent = PRENDA_KEYS.some(k => wardrobeText[k] || wardrobePhotosB64[k].length > 0);
    if (!hasContent || !situacion) return;
    setOutfitLoading(true);
    setOutfitResult("");
    try {
      const content = [];
      PRENDA_KEYS.forEach(key => {
        if (wardrobePhotosB64[key].length > 0) {
          content.push({ type: "text", text: `Fotos de ${PRENDA_LABELS[key]}:` });
          wardrobePhotosB64[key].forEach(p => content.push({ type: "image", source: { type: "base64", media_type: p.type, data: p.data } }));
        }
      });
      if (perfil.fotoBase64) {
        content.push({ type: "text", text: "Foto del usuario:" });
        content.push({ type: "image", source: { type: "base64", media_type: perfil.fotoMime, data: perfil.fotoBase64 } });
      }
      const textDesc = PRENDA_KEYS.filter(k => wardrobeText[k]).map(k => `- ${PRENDA_LABELS[k]}: ${wardrobeText[k]}`).join("\n");
      const perfilCtx = buildPerfilContext();
      content.push({ type: "text", text: `Eres Luca, estilista personal. Español, directo, con criterio. NUNCA digas que eres IA.\n${perfilCtx}\nOcasión: ${situacion}.\n${textDesc ? `Prendas:\n${textDesc}` : ""}\nArmá el mejor outfit para la ocasión. Cómo combinar, cómo llevarlo, y UNA pieza que lo elevaría. Máximo 5 oraciones.` });
      const reply = await callClaude([{ role: "user", content }]);
      setOutfitResult(reply);
    } catch { setOutfitResult("Algo salió mal. Intentá de nuevo."); }
    finally { setOutfitLoading(false); }
  };

  const generateSkincare = async () => {
    setSkincareLoading(true);
    setSkincareResult("");
    try {
      const reply = await callClaude([{ role: "user", content: `Eres Luca, coach de imagen. Español, cálido. NUNCA digas que eres IA. ${buildPerfilContext()} Rutina de skincare: mañana (2-3 pasos), noche (2-3 pasos), 1 consejo extra. Sin marcas. Máximo 8 oraciones.` }]);
      setSkincareResult(reply);
    } catch { setSkincareResult("Algo salió mal. Intentá de nuevo."); }
    finally { setSkincareLoading(false); }
  };

  const generateTienda = async () => {
    setTiendaLoading(true);
    setTiendaResult("");
    try {
      const reply = await callClaude([{ role: "user", content: `Eres Luca, estilista. Español, directo. NUNCA digas que eres IA. ${buildPerfilContext()} Recomendá 4 prendas/productos con: qué es, por qué lo necesita, tipo de tienda o marca. Personalizado.` }]);
      setTiendaResult(reply);
    } catch { setTiendaResult("Algo salió mal. Intentá de nuevo."); }
    finally { setTiendaLoading(false); }
  };

  const C = {
    app: { minHeight: "100vh", background: "#0E1824", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif" },
    accent: "#F4845F",
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "1.2rem 1.4rem" },
    btn: (disabled) => ({ width: "100%", background: disabled ? "#1a2a3a" : "linear-gradient(135deg, #F4845F, #e86d47)", border: disabled ? "1px solid rgba(255,255,255,0.06)" : "none", borderRadius: 8, padding: "1rem", color: disabled ? "#3a5a7a" : "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", marginBottom: "1.5rem" }),
    pill: (sel) => ({ padding: "0.5rem 1rem", border: `1px solid ${sel ? "#F4845F" : "rgba(255,255,255,0.1)"}`, borderRadius: 100, fontSize: "0.72rem", cursor: "pointer", background: sel ? "rgba(244,132,95,0.15)" : "transparent", color: sel ? "#F4845F" : "#6a8aa0", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }),
    input: { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", padding: "0.4rem 0", outline: "none" },
    sectionTitle: (label) => (
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>
      </div>
    ),
    lucaMsg: (msg) => (
      <div style={{ ...C.card, borderLeft: "3px solid #F4845F", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem" }}>
          <img src={lucaImg} alt="Luca" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#F4845F", textTransform: "uppercase" }}>Luca dice</div>
        </div>
        <p style={{ color: "#c8d8e8", fontSize: "0.88rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{msg}</p>
      </div>
    )
  };

  if (phase === "splash") return (
    <div style={{ ...C.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "4rem", fontWeight: 300, letterSpacing: "0.4em", marginBottom: "0.8rem" }}>SHYNE</div>
        <div style={{ width: 40, height: 1, background: "#F4845F", margin: "0 auto 1rem" }} />
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", color: "#F4845F", textTransform: "uppercase" }}>Tu mejor versión, cada día</div>
      </div>
    </div>
  );

  if (phase === "onboarding") {
    const q = QUESTIONS[currentQ];
    return (
      <div style={{ ...C.app, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
        <div style={{ height: 2, background: "#1a2a3a" }}>
          <div style={{ height: "100%", background: "#F4845F", width: `${(currentQ / QUESTIONS.length) * 100}%`, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#F4845F", textTransform: "uppercase", marginBottom: "2.5rem" }}>{currentQ + 1} / {QUESTIONS.length}</div>
          <div style={{ textAlign: "center", marginBottom: "3rem", opacity: animating ? 0 : 1, transition: "opacity 0.3s" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, marginBottom: "0.6rem", lineHeight: 1.3 }}>{q.question}</h2>
            <p style={{ fontSize: "0.78rem", color: "#5a7a9a" }}>{q.subtitle}</p>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.8rem", opacity: animating ? 0 : 1, transition: "opacity 0.3s" }}>
            {q.options.map((opt, i) => (
              <button key={opt} onClick={() => selectOption(opt)} style={{ width: "100%", padding: "1.1rem 1.5rem", background: answers[q.id] === opt ? "rgba(244,132,95,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${answers[q.id] === opt ? "#F4845F" : "rgba(255,255,255,0.08)"}`, borderRadius: 6, color: answers[q.id] === opt ? "#F4845F" : "#8aabC0", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
                <span style={{ opacity: 0.5 }}>{q.icons[i]}</span> {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...C.app, display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* PLUS MODAL */}
      {showPlusModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "2rem" }}>
          <div style={{ background: "#0E1824", border: "1px solid rgba(244,132,95,0.3)", borderRadius: 12, padding: "2rem", maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", marginBottom: "0.5rem" }}>Shyne Plus</div>
            <p style={{ color: "#7a9ab0", fontSize: "0.85rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>Cargá hasta 3 fotos por prenda con Shyne Plus. Luca puede analizar mejor tus prendas y armar looks más precisos.</p>
            <button onClick={() => setShowPlusModal(false)} style={{ width: "100%", background: "linear-gradient(135deg, #F4845F, #e86d47)", border: "none", borderRadius: 8, padding: "1rem", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: "pointer", marginBottom: "0.8rem" }}>Próximamente</button>
            <button onClick={() => setShowPlusModal(false)} style={{ background: "transparent", border: "none", color: "#4a6a8a", fontSize: "0.8rem", cursor: "pointer" }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "1.2rem 1.5rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 300, letterSpacing: "0.3em" }}>SHYNE</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(244,132,95,0.08)", border: "1px solid rgba(244,132,95,0.2)", borderRadius: 20, padding: "0.3rem 0.8rem 0.3rem 0.4rem" }}>
          {perfil.foto
            ? <img src={perfil.foto} alt="yo" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
            : <img src={lucaImg} alt="Luca" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
          }
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#F4845F", textTransform: "uppercase" }}>con Luca</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>

        {/* ── LUCA CHAT ── */}
        {activeSection === "luca" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", ...C.card }}>
              <img src={lucaImg} alt="Luca" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: "2px solid #F4845F" }} />
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem" }}>Luca</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "#F4845F", textTransform: "uppercase" }}>Tu estilista personal</div>
              </div>
              {perfilGuardado && <div style={{ marginLeft: "auto", fontSize: "0.6rem", color: "#4a8a6a", background: "rgba(74,138,106,0.15)", border: "1px solid rgba(74,138,106,0.3)", borderRadius: 20, padding: "0.2rem 0.7rem" }}>Perfil ✓</div>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem", minHeight: 150 }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  {msg.role === "luca" && <img src={lucaImg} alt="Luca" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", objectPosition: "top", flexShrink: 0 }} />}
                  <div style={{ background: msg.role === "luca" ? "rgba(255,255,255,0.04)" : "rgba(244,132,95,0.12)", border: `1px solid ${msg.role === "luca" ? "rgba(255,255,255,0.08)" : "rgba(244,132,95,0.25)"}`, borderRadius: msg.role === "luca" ? "0 12px 12px 12px" : "12px 0 12px 12px", padding: "0.9rem 1.1rem", fontSize: "0.88rem", lineHeight: 1.7, color: "#c8d8e8", maxWidth: "80%" }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <img src={lucaImg} alt="Luca" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0 12px 12px 12px", padding: "0.9rem 1.1rem", color: "#5a7a9a", fontSize: "0.85rem", fontStyle: "italic" }}>Luca está escribiendo...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Preguntale algo a Luca..." style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.9rem 1rem", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", outline: "none" }} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ background: "#F4845F", border: "none", borderRadius: 8, padding: "0 1.2rem", cursor: "pointer", color: "#fff", fontSize: "1.1rem", opacity: chatLoading || !chatInput.trim() ? 0.4 : 1 }}>→</button>
            </div>
          </div>
        )}

        {/* ── ARMARIO ── */}
        {activeSection === "armario" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.4rem" }}>Generador de looks</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Tu Armario</h3>
            </div>

            <div style={{ ...C.card, marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.8rem" }}>¿Para qué ocasión?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {SITUACIONES.map(s => <button key={s} onClick={() => setSituacion(s)} style={C.pill(situacion === s)}>{s}</button>)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              {PRENDA_KEYS.map(key => (
                <div key={key} style={C.card}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {PRENDA_LABELS[key]}
                    {wardrobePhotos[key].length >= MAX_FREE_PHOTOS && <span style={{ fontSize: "0.55rem", background: "rgba(244,132,95,0.15)", color: "#F4845F", padding: "0.1rem 0.5rem", borderRadius: 4, border: "1px solid rgba(244,132,95,0.3)" }}>+ fotos con PLUS</span>}
                  </div>

                  {wardrobePhotos[key].length > 0 && (
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                      {wardrobePhotos[key].map((url, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover", border: "1px solid rgba(244,132,95,0.3)" }} />
                          <button onClick={() => removeWardrobePhoto(key, idx)} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#e86d47", border: "none", cursor: "pointer", color: "#fff", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                        </div>
                      ))}
                      <label style={{ cursor: "pointer" }}>
                        <div onClick={() => wardrobePhotos[key].length >= MAX_FREE_PHOTOS && setShowPlusModal(true)} style={{ width: 64, height: 64, borderRadius: 6, border: "2px dashed rgba(244,132,95,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "rgba(244,132,95,0.3)" }}>+</div>
                        {wardrobePhotos[key].length < MAX_FREE_PHOTOS && <input type="file" accept="image/*" onChange={e => handleWardrobePhoto(key, e)} style={{ display: "none" }} />}
                      </label>
                    </div>
                  )}

                  {wardrobePhotos[key].length === 0 && (
                    <label style={{ cursor: "pointer", display: "block", marginBottom: "0.8rem" }}>
                      <div style={{ border: "2px dashed rgba(244,132,95,0.15)", borderRadius: 6, padding: "0.7rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "rgba(244,132,95,0.4)", fontSize: "0.75rem" }}>
                        <span>📷</span> Agregar foto
                      </div>
                      <input type="file" accept="image/*" onChange={e => handleWardrobePhoto(key, e)} style={{ display: "none" }} />
                    </label>
                  )}

                  <input value={wardrobeText[key]} onChange={e => setWardrobeText(p => ({ ...p, [key]: e.target.value }))} placeholder={PRENDA_PH[key]} style={C.input} />
                </div>
              ))}
            </div>

            <button onClick={generateOutfit} disabled={outfitLoading || !situacion} style={C.btn(outfitLoading || !situacion)}>
              {outfitLoading ? "Armando tu look..." : !situacion ? "Elegí una ocasión primero" : "Armar mi Look con Luca ✦"}
            </button>
            {outfitResult && C.lucaMsg(outfitResult)}
          </div>
        )}

        {/* ── SKINCARE ── */}
        {activeSection === "skincare" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.4rem" }}>Rutina personalizada</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Skincare & Cuidado</h3>
            </div>
            <div style={{ ...C.card, marginBottom: "1.5rem" }}>
              <p style={{ color: "#7a9ab0", fontSize: "0.85rem", lineHeight: 1.7 }}>Rutina para <span style={{ color: "#F4845F" }}>{answers.gender}, {answers.age} años</span>.{perfilGuardado && <span style={{ color: "#5a7a9a" }}> Personalizada con tu perfil.</span>}</p>
            </div>
            <button onClick={generateSkincare} disabled={skincareLoading} style={C.btn(skincareLoading)}>
              {skincareLoading ? "Preparando tu rutina..." : "Crear mi rutina con Luca ✦"}
            </button>
            {skincareResult && C.lucaMsg(skincareResult)}
          </div>
        )}

        {/* ── TIENDA ── */}
        {activeSection === "tienda" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.4rem" }}>Selección para vos</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Descubrí tu Estilo</h3>
            </div>
            <div style={{ ...C.card, marginBottom: "1.5rem" }}>
              <p style={{ color: "#7a9ab0", fontSize: "0.85rem", lineHeight: 1.7 }}>Recomendaciones específicas para tu perfil.{perfilGuardado && <span style={{ color: "#5a7a9a" }}> Personalizadas con tu análisis.</span>}</p>
            </div>
            <button onClick={generateTienda} disabled={tiendaLoading} style={C.btn(tiendaLoading)}>
              {tiendaLoading ? "Seleccionando para vos..." : "Ver recomendaciones de Luca ✦"}
            </button>
            {tiendaResult && C.lucaMsg(tiendaResult)}
          </div>
        )}

        {/* ── PERFIL ── */}
        {activeSection === "perfil" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.4rem" }}>Para que Luca te conozca</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Mi Perfil</h3>
            </div>

            {/* Foto + nombre */}
            <div style={{ ...C.card, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1.2rem" }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                {perfil.foto
                  ? <img src={perfil.foto} alt="yo" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid #F4845F" }} />
                  : <div style={{ width: 72, height: 72, borderRadius: "50%", border: "2px dashed rgba(244,132,95,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                    <span style={{ fontSize: "1.5rem" }}>📸</span>
                    <span style={{ fontSize: "0.5rem", color: "#F4845F", letterSpacing: "0.05em" }}>MI FOTO</span>
                  </div>
                }
                <input type="file" accept="image/*" onChange={handlePerfilFoto} style={{ display: "none" }} />
              </label>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.4rem" }}>Tu nombre</div>
                <input value={perfil.nombre} onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} placeholder="¿Cómo te llamás?" style={C.input} />
              </div>
            </div>

            {/* Colores */}
            <div style={{ ...C.card, marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.8rem" }}>Colores que te gustan</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {COLORES_OPCIONES.map(c => <button key={c} onClick={() => togglePerfilColor(c)} style={C.pill(perfil.colores.includes(c))}>{c}</button>)}
              </div>
            </div>

            {/* Clima */}
            <div style={{ ...C.card, marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.8rem" }}>Clima donde vivís</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {CLIMA_OPCIONES.map(c => <button key={c} onClick={() => setPerfil(p => ({ ...p, clima: c }))} style={C.pill(perfil.clima === c)}>{c}</button>)}
              </div>
            </div>

            {/* Situaciones */}
            <div style={{ ...C.card, marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#F4845F", textTransform: "uppercase", marginBottom: "0.8rem" }}>¿Dónde querés verte bien?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {SITUACIONES.map(s => <button key={s} onClick={() => togglePerfilSituacion(s)} style={C.pill(perfil.situaciones.includes(s))}>{s}</button>)}
              </div>
            </div>

            <button onClick={guardarPerfil} disabled={!perfil.nombre && !perfil.foto} style={C.btn(!perfil.nombre && !perfil.foto)}>
              {perfilGuardado ? "Actualizar perfil ✦" : "Guardar perfil y hablar con Luca ✦"}
            </button>

            {perfilGuardado && (
              <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#4a8a6a" }}>✓ Luca ya tiene tu perfil en cuenta</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", background: "#0a1520" }}>
        {SECTIONS.map(sec => (
          <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{ flex: 1, padding: "0.8rem 0", background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", borderTop: `2px solid ${activeSection === sec.id ? "#F4845F" : "transparent"}`, transition: "all 0.2s", position: "relative" }}>
            {sec.id === "perfil" && !perfilGuardado && <div style={{ position: "absolute", top: 6, right: "calc(50% - 14px)", width: 7, height: 7, borderRadius: "50%", background: "#F4845F" }} />}
            <span style={{ fontSize: "0.95rem", color: activeSection === sec.id ? "#F4845F" : "#3a5a7a" }}>{sec.icon}</span>
            <span style={{ fontSize: "0.52rem", letterSpacing: "0.08em", color: activeSection === sec.id ? "#F4845F" : "#3a5a7a", textTransform: "uppercase" }}>{sec.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
