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
];

const API_URL = "/api/chat";
const MODEL = "claude-haiku-4-5-20251001";

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

  // Luca chat
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Perfil personal
  const [userPhoto, setUserPhoto] = useState(null);
  const [userPhotoBase64, setUserPhotoBase64] = useState(null);
  const [userPhotoAnalysis, setUserPhotoAnalysis] = useState("");
  const [userPhotoLoading, setUserPhotoLoading] = useState(false);

  // Armario con fotos
  const [wardrobeItems, setWardrobeItems] = useState({ top: "", bottom: "", shoes: "", acc: "" });
  const [wardrobePhotos, setWardrobePhotos] = useState({ top: null, bottom: null, shoes: null, acc: null });
  const [wardrobePhotosB64, setWardrobePhotosB64] = useState({ top: null, bottom: null, shoes: null, acc: null });
  const [outfitResult, setOutfitResult] = useState("");
  const [outfitLoading, setOutfitLoading] = useState(false);

  // Skincare
  const [skincareResult, setSkincareResult] = useState("");
  const [skincareLoading, setSkincareLoading] = useState(false);

  // Tienda
  const [tiendaResult, setTiendaResult] = useState("");
  const [tiendaLoading, setTiendaLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("onboarding"), 2400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

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
      const reply = await callClaude([{ role: "user", content: `Eres Luca, estilista personal. Español, cálido, directo. NUNCA digas que eres IA. El usuario: Género: ${ans.gender}, Edad: ${ans.age}, Objetivo: ${ans.goal}, Estilo: ${ans.style}, Foco: ${ans.focus}. Bienvenida personalizada, máximo 3 oraciones.` }]);
      setChatHistory([{ role: "luca", text: reply }]);
    } catch {
      setChatHistory([{ role: "luca", text: "¡Bienvenido/a a Shyne! Soy Luca, tu estilista personal. ¿Por dónde empezamos?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", text: userMsg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    const system = `Eres Luca, estilista personal de Shyne. Español, cálido, directo. NUNCA digas que eres IA. Solo hablas de imagen, moda, estilo, outfits, skincare y confianza personal. Si preguntan otra cosa, redirigís con humor hacia tu especialidad. Perfil: ${answers.gender}, ${answers.age}, objetivo: ${answers.goal}, estilo: ${answers.style}.${userPhotoAnalysis ? ` Análisis físico del usuario: ${userPhotoAnalysis}` : ""}`;
    const messages = newHistory.map(m => ({ role: m.role === "luca" ? "assistant" : "user", content: m.text }));
    try {
      const reply = await callClaude(messages, system);
      setChatHistory([...newHistory, { role: "luca", text: reply }]);
    } catch {
      setChatHistory([...newHistory, { role: "luca", text: "Algo salió mal. Intentá de nuevo." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── FOTO PERSONAL ──
  const handleUserPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUserPhoto(url);
    const b64 = await toBase64(file);
    setUserPhotoBase64(b64);
    analyzeUserPhoto(b64, file.type);
  };

  const analyzeUserPhoto = async (b64, mimeType) => {
    setUserPhotoLoading(true);
    setUserPhotoAnalysis("");
    try {
      const reply = await callClaude([{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: b64 } },
          { type: "text", text: `Eres Luca, estilista personal. Analizá esta foto del usuario con ojo experto. Describí: tono de piel, tipo de cuerpo aproximado, colores que le favorecerían, y 2-3 recomendaciones de estilo personalizadas para esta persona específica. Tono cálido y constructivo. Máximo 5 oraciones. NUNCA menciones que eres IA.` }
        ]
      }]);
      setUserPhotoAnalysis(reply);
    } catch {
      setUserPhotoAnalysis("No pude analizar la foto. Intentá con otra imagen.");
    } finally {
      setUserPhotoLoading(false);
    }
  };

  // ── FOTOS DE ROPA ──
  const handleWardrobePhoto = async (key, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setWardrobePhotos(p => ({ ...p, [key]: url }));
    const b64 = await toBase64(file);
    setWardrobePhotosB64(p => ({ ...p, [key]: { data: b64, type: file.type } }));
  };

  // ── GENERAR OUTFIT CON FOTOS ──
  const generateOutfit = async () => {
    const hasPhoto = Object.values(wardrobePhotosB64).some(p => p !== null);
    const hasText = wardrobeItems.top || wardrobeItems.bottom;
    if (!hasPhoto && !hasText) return;
    setOutfitLoading(true);
    setOutfitResult("");

    try {
      const content = [];

      // Agregar fotos de ropa si las hay
      const photoKeys = ["top", "bottom", "shoes", "acc"];
      const labels = { top: "Superior/Top", bottom: "Pantalón/Bottom", shoes: "Calzado", acc: "Accesorios" };
      photoKeys.forEach(key => {
        if (wardrobePhotosB64[key]) {
          content.push({ type: "text", text: `Prenda — ${labels[key]}:` });
          content.push({ type: "image", source: { type: "base64", media_type: wardrobePhotosB64[key].type, data: wardrobePhotosB64[key].data } });
        }
      });

      // Agregar foto del usuario si existe
      if (userPhotoBase64) {
        content.push({ type: "text", text: "Foto del usuario:" });
        content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: userPhotoBase64 } });
      }

      const textDesc = `
${wardrobeItems.top ? `- Top (texto): ${wardrobeItems.top}` : ""}
${wardrobeItems.bottom ? `- Pantalón (texto): ${wardrobeItems.bottom}` : ""}
${wardrobeItems.shoes ? `- Calzado (texto): ${wardrobeItems.shoes}` : ""}
${wardrobeItems.acc ? `- Accesorios (texto): ${wardrobeItems.acc}` : ""}`.trim();

      content.push({
        type: "text",
        text: `Eres Luca, estilista personal. Español, directo, con criterio. NUNCA digas que eres IA. Perfil del usuario: ${answers.gender}, ${answers.age} años, estilo ${answers.style}.${textDesc ? `\n\nPrendas adicionales:\n${textDesc}` : ""}\n\nCon todo lo que ves, armá el mejor outfit posible. Describí cómo combinarlo, cómo llevarlo, y UNA sola pieza que elevaría el look. ${userPhotoBase64 ? "Considerá el físico del usuario que ves en la foto para personalizar la recomendación." : ""} Máximo 5 oraciones.`
      });

      const reply = await callClaude([{ role: "user", content }]);
      setOutfitResult(reply);
    } catch {
      setOutfitResult("Algo salió mal. Intentá de nuevo.");
    } finally {
      setOutfitLoading(false);
    }
  };

  const generateSkincare = async () => {
    setSkincareLoading(true);
    setSkincareResult("");
    try {
      const reply = await callClaude([{ role: "user", content: `Eres Luca, coach de imagen. Español, cálido. NUNCA digas que eres IA. Perfil: ${answers.gender}, ${answers.age}, objetivo: ${answers.goal}.${userPhotoAnalysis ? ` Análisis físico: ${userPhotoAnalysis}` : ""} Rutina de skincare: mañana (2-3 pasos), noche (2-3 pasos), 1 consejo extra. Sin marcas específicas. Máximo 8 oraciones.` }]);
      setSkincareResult(reply);
    } catch { setSkincareResult("Algo salió mal. Intentá de nuevo."); }
    finally { setSkincareLoading(false); }
  };

  const generateTienda = async () => {
    setTiendaLoading(true);
    setTiendaResult("");
    try {
      const reply = await callClaude([{ role: "user", content: `Eres Luca, estilista. Español, directo. NUNCA digas que eres IA. Perfil: ${answers.gender}, ${answers.age}, estilo: ${answers.style}, objetivo: ${answers.goal}.${userPhotoAnalysis ? ` Análisis físico: ${userPhotoAnalysis}` : ""} Recomendá 4 prendas/productos específicos. Para cada uno: qué es, por qué lo necesita, tipo de tienda o marca. Personalizado.` }]);
      setTiendaResult(reply);
    } catch { setTiendaResult("Algo salió mal. Intentá de nuevo."); }
    finally { setTiendaLoading(false); }
  };

  const C = {
    app: { minHeight: "100vh", background: "#0E1824", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif" },
    accent: "#F4845F",
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "1.2rem 1.4rem" },
    btn: { width: "100%", background: "linear-gradient(135deg, #F4845F, #e86d47)", border: "none", borderRadius: 8, padding: "1rem", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", marginBottom: "1.5rem" },
  };

  // ── SPLASH ──
  if (phase === "splash") return (
    <div style={{ ...C.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "4rem", fontWeight: 300, letterSpacing: "0.4em", marginBottom: "0.8rem" }}>SHYNE</div>
        <div style={{ width: 40, height: 1, background: C.accent, margin: "0 auto 1rem" }} />
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", color: C.accent, textTransform: "uppercase" }}>Tu mejor versión, cada día</div>
      </div>
    </div>
  );

  // ── ONBOARDING ──
  if (phase === "onboarding") {
    const q = QUESTIONS[currentQ];
    return (
      <div style={{ ...C.app, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ height: 2, background: "#1a2a3a" }}>
          <div style={{ height: "100%", background: C.accent, width: `${(currentQ / QUESTIONS.length) * 100}%`, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: C.accent, textTransform: "uppercase", marginBottom: "2.5rem" }}>{currentQ + 1} / {QUESTIONS.length}</div>
          <div style={{ textAlign: "center", marginBottom: "3rem", opacity: animating ? 0 : 1, transition: "opacity 0.3s" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, marginBottom: "0.6rem", lineHeight: 1.3 }}>{q.question}</h2>
            <p style={{ fontSize: "0.78rem", color: "#5a7a9a" }}>{q.subtitle}</p>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.8rem", opacity: animating ? 0 : 1, transition: "opacity 0.3s" }}>
            {q.options.map((opt, i) => (
              <button key={opt} onClick={() => selectOption(opt)} style={{ width: "100%", padding: "1.1rem 1.5rem", background: answers[q.id] === opt ? "rgba(244,132,95,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${answers[q.id] === opt ? C.accent : "rgba(255,255,255,0.08)"}`, borderRadius: 6, color: answers[q.id] === opt ? C.accent : "#8aabC0", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "1rem", transition: "all 0.2s" }}>
                <span style={{ opacity: 0.5 }}>{q.icons[i]}</span> {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN APP ──
  return (
    <div style={{ ...C.app, display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "1.2rem 1.5rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 300, letterSpacing: "0.3em" }}>SHYNE</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(244,132,95,0.08)", border: "1px solid rgba(244,132,95,0.2)", borderRadius: 20, padding: "0.3rem 0.8rem 0.3rem 0.4rem" }}>
          <img src={lucaImg} alt="Luca" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: C.accent, textTransform: "uppercase" }}>con Luca</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>

        {/* ── LUCA CHAT ── */}
        {activeSection === "luca" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Luca profile + foto usuario */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", ...C.card }}>
              <img src={lucaImg} alt="Luca" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: `2px solid ${C.accent}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem" }}>Luca</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: C.accent, textTransform: "uppercase" }}>Tu estilista personal</div>
              </div>
              {/* Foto del usuario */}
              <label style={{ cursor: "pointer", textAlign: "center" }}>
                {userPhoto
                  ? <img src={userPhoto} alt="Tu foto" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.accent}` }} />
                  : <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px dashed rgba(244,132,95,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: "1.2rem" }}>+</span>
                    <span style={{ fontSize: "0.45rem", color: C.accent, letterSpacing: "0.1em" }}>TU FOTO</span>
                  </div>
                }
                <input type="file" accept="image/*" onChange={handleUserPhoto} style={{ display: "none" }} />
              </label>
            </div>

            {/* Análisis de foto personal */}
            {userPhotoLoading && (
              <div style={{ ...C.card, marginBottom: "1rem", color: "#5a7a9a", fontSize: "0.85rem", fontStyle: "italic" }}>Luca está analizando tu foto...</div>
            )}
            {userPhotoAnalysis && !userPhotoLoading && (
              <div style={{ ...C.card, borderLeft: `3px solid ${C.accent}`, marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.25em", color: C.accent, textTransform: "uppercase", marginBottom: "0.6rem" }}>◈ Análisis de Luca</div>
                <p style={{ color: "#c8d8e8", fontSize: "0.85rem", lineHeight: 1.7 }}>{userPhotoAnalysis}</p>
              </div>
            )}

            {/* Chat */}
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
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "0 1.2rem", cursor: "pointer", color: "#fff", fontSize: "1.1rem", opacity: chatLoading || !chatInput.trim() ? 0.4 : 1 }}>→</button>
            </div>
          </div>
        )}

        {/* ── ARMARIO ── */}
        {activeSection === "armario" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: C.accent, textTransform: "uppercase", marginBottom: "0.4rem" }}>Generador de looks</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Tu Armario</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "1.5rem" }}>
              {[
                { key: "top", label: "Superior / Top", ph: "ej. camisa blanca oversize" },
                { key: "bottom", label: "Pantalón / Bottom", ph: "ej. jeans azules slim" },
                { key: "shoes", label: "Calzado", ph: "ej. zapatillas blancas" },
                { key: "acc", label: "Accesorios (opcional)", ph: "ej. reloj, cinturón" },
              ].map(({ key, label, ph }) => (
                <div key={key} style={{ ...C.card, display: "flex", gap: "1rem", alignItems: "center" }}>
                  {/* Foto de prenda */}
                  <label style={{ cursor: "pointer", flexShrink: 0 }}>
                    {wardrobePhotos[key]
                      ? <img src={wardrobePhotos[key]} alt={label} style={{ width: 52, height: 52, borderRadius: 6, objectFit: "cover", border: `1px solid ${C.accent}` }} />
                      : <div style={{ width: 52, height: 52, borderRadius: 6, border: "2px dashed rgba(244,132,95,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: "1.3rem", color: "rgba(244,132,95,0.5)" }}>📷</span>
                        <span style={{ fontSize: "0.45rem", color: C.accent, letterSpacing: "0.05em", textAlign: "center" }}>FOTO</span>
                      </div>
                    }
                    <input type="file" accept="image/*" onChange={e => handleWardrobePhoto(key, e)} style={{ display: "none" }} />
                  </label>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: C.accent, textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>
                    <input value={wardrobeItems[key]} onChange={e => setWardrobeItems(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", padding: "0.3rem 0", outline: "none" }} />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={generateOutfit} disabled={outfitLoading || (!wardrobeItems.top && !wardrobeItems.bottom && !wardrobePhotosB64.top && !wardrobePhotosB64.bottom)} style={{ ...C.btn, opacity: outfitLoading ? 0.5 : 1 }}>
              {outfitLoading ? "Armando tu look..." : "Armar mi Look con Luca ✦"}
            </button>

            {outfitResult && (
              <div style={{ ...C.card, borderLeft: `3px solid ${C.accent}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem" }}>
                  <img src={lucaImg} alt="Luca" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: C.accent, textTransform: "uppercase" }}>Luca dice</div>
                </div>
                <p style={{ color: "#c8d8e8", fontSize: "0.88rem", lineHeight: 1.8 }}>{outfitResult}</p>
              </div>
            )}
          </div>
        )}

        {/* ── SKINCARE ── */}
        {activeSection === "skincare" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: C.accent, textTransform: "uppercase", marginBottom: "0.4rem" }}>Rutina personalizada</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Skincare & Cuidado</h3>
            </div>
            <div style={{ ...C.card, marginBottom: "1.5rem" }}>
              <p style={{ color: "#7a9ab0", fontSize: "0.85rem", lineHeight: 1.7 }}>
                Rutina para: <span style={{ color: C.accent }}>{answers.gender}, {answers.age} años</span>, foco en <span style={{ color: C.accent }}>{answers.goal?.toLowerCase()}</span>.
                {userPhotoAnalysis && <span style={{ color: "#5a7a9a" }}> Personalizada con tu foto.</span>}
              </p>
            </div>
            <button onClick={generateSkincare} disabled={skincareLoading} style={{ ...C.btn, opacity: skincareLoading ? 0.5 : 1 }}>
              {skincareLoading ? "Preparando tu rutina..." : "Crear mi rutina con Luca ✦"}
            </button>
            {skincareResult && (
              <div style={{ ...C.card, borderLeft: `3px solid ${C.accent}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem" }}>
                  <img src={lucaImg} alt="Luca" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: C.accent, textTransform: "uppercase" }}>Tu rutina con Luca</div>
                </div>
                <p style={{ color: "#c8d8e8", fontSize: "0.88rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{skincareResult}</p>
              </div>
            )}
          </div>
        )}

        {/* ── TIENDA ── */}
        {activeSection === "tienda" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: C.accent, textTransform: "uppercase", marginBottom: "0.4rem" }}>Selección para vos</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Descubrí tu Estilo</h3>
            </div>
            <div style={{ ...C.card, marginBottom: "1.5rem" }}>
              <p style={{ color: "#7a9ab0", fontSize: "0.85rem", lineHeight: 1.7 }}>
                Recomendaciones específicas para tu perfil.
                {userPhotoAnalysis && <span style={{ color: "#5a7a9a" }}> Personalizadas con tu foto.</span>}
              </p>
            </div>
            <button onClick={generateTienda} disabled={tiendaLoading} style={{ ...C.btn, opacity: tiendaLoading ? 0.5 : 1 }}>
              {tiendaLoading ? "Seleccionando para vos..." : "Ver recomendaciones de Luca ✦"}
            </button>
            {tiendaResult && (
              <div style={{ ...C.card, borderLeft: `3px solid ${C.accent}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem" }}>
                  <img src={lucaImg} alt="Luca" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: C.accent, textTransform: "uppercase" }}>Selección de Luca</div>
                </div>
                <p style={{ color: "#c8d8e8", fontSize: "0.88rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{tiendaResult}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", background: "#0a1520" }}>
        {SECTIONS.map(sec => (
          <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{ flex: 1, padding: "0.9rem 0", background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", borderTop: `2px solid ${activeSection === sec.id ? C.accent : "transparent"}`, transition: "all 0.2s" }}>
            <span style={{ fontSize: "1rem", color: activeSection === sec.id ? C.accent : "#3a5a7a" }}>{sec.icon}</span>
            <span style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: activeSection === sec.id ? C.accent : "#3a5a7a", textTransform: "uppercase" }}>{sec.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
