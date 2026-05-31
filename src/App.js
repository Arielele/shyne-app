import { useState, useEffect, useRef } from "react";
import lucaImg from "./luca.jpg";

const QUESTIONS = [
  {
    id: "gender",
    question: "¿Cuál es tu género?",
    subtitle: "Para personalizar mejor tus recomendaciones",
    options: ["Hombre", "Mujer", "Prefiero no decir"],
    icons: ["♂", "♀", "◇"]
  },
  {
    id: "age",
    question: "¿Qué edad tenés?",
    subtitle: "Tu etapa de vida importa para tu estilo",
    options: ["18-25", "26-35", "36-45", "45+"],
    icons: ["✦", "✦", "✦", "✦"]
  },
  {
    id: "goal",
    question: "¿Cuál es tu objetivo principal?",
    subtitle: "Shyne se enfoca en lo que más te importa",
    options: ["Verme mejor", "Ganar confianza", "Mejorar mi estilo", "Cuidar mi imagen"],
    icons: ["✨", "💪", "👁", "🌟"]
  },
  {
    id: "style",
    question: "¿Cómo describirías tu estilo actual?",
    subtitle: "Sin juicios — punto de partida honesto",
    options: ["No tengo estilo definido", "Casual y cómodo", "Elegante", "Una mezcla rara"],
    icons: ["?", "☁", "◈", "∞"]
  },
  {
    id: "focus",
    question: "¿Qué área querés mejorar primero?",
    subtitle: "Podemos trabajar todo, pero empezamos por algo",
    options: ["Mi ropa y outfits", "Mi skincare", "Mi imagen general", "Todo a la vez"],
    icons: ["👗", "✦", "◎", "⟡"]
  }
];

const SECTIONS = [
  { id: "luca", label: "Luca", icon: "◈" },
  { id: "armario", label: "Armario", icon: "◻" },
  { id: "skincare", label: "Skincare", icon: "✦" },
  { id: "tienda", label: "Descubrí", icon: "⟡" },
];

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

async function callClaude(messages, system = "") {
  const body = { model: MODEL, max_tokens: 1000, messages };
  if (system) body.system = system;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
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
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState({ top: "", bottom: "", shoes: "", acc: "" });
  const [outfitResult, setOutfitResult] = useState("");
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [skincareResult, setSkincareResult] = useState("");
  const [skincareLoading, setSkincareLoading] = useState(false);
  const [tiendaResult, setTiendaResult] = useState("");
  const [tiendaLoading, setTiendaLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const chatEndRef = useRef(null);

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
      const reply = await callClaude([{
        role: "user",
        content: `Eres Luca, estilista personal y coach de imagen. Hablas en español con tono cálido, directo y motivador — como un amigo con muy buen gusto. NUNCA menciones que eres IA ni un asistente virtual.

El usuario acaba de registrarse:
- Género: ${ans.gender}
- Edad: ${ans.age}
- Objetivo: ${ans.goal}
- Estilo actual: ${ans.style}
- Área a mejorar: ${ans.focus}

Escribí un mensaje de bienvenida personalizado. Máximo 3 oraciones. Mencioná algo específico de su perfil. Sé genuino y directo.`
      }]);
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

    const system = `Eres Luca, estilista personal y coach de imagen de la app Shyne. Hablas en español con tono cálido, directo y con criterio — como un amigo con muy buen gusto. NUNCA menciones que eres IA. Das consejos concretos sobre moda, imagen personal, outfits, skincare y confianza. Respuestas cortas, máximo 4 oraciones.
    
Perfil del usuario: Género: ${answers.gender}, Edad: ${answers.age}, Objetivo: ${answers.goal}, Estilo: ${answers.style}, Foco: ${answers.focus}.`;

    const messages = newHistory.map(m => ({
      role: m.role === "luca" ? "assistant" : "user",
      content: m.text
    }));

    try {
      const reply = await callClaude(messages, system);
      setChatHistory([...newHistory, { role: "luca", text: reply }]);
    } catch {
      setChatHistory([...newHistory, { role: "luca", text: "Algo salió mal. Intentá de nuevo." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const generateOutfit = async () => {
    if (!wardrobeItems.top || !wardrobeItems.bottom) return;
    setOutfitLoading(true);
    setOutfitResult("");
    try {
      const reply = await callClaude([{
        role: "user",
        content: `Eres Luca, estilista personal. Español, directo, con criterio. NUNCA menciones que eres IA.

Prendas disponibles:
- Top: ${wardrobeItems.top}
- Pantalón: ${wardrobeItems.bottom}
- Zapatillas: ${wardrobeItems.shoes || "no especificado"}
- Accesorios: ${wardrobeItems.acc || "ninguno"}

Perfil: ${answers.gender}, ${answers.age} años, estilo ${answers.style}.

Armá el mejor outfit con lo que tiene. Cómo llevarlo y UNA pieza que lo elevaría. Máximo 5 oraciones.`
      }]);
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
      const reply = await callClaude([{
        role: "user",
        content: `Eres Luca, coach de imagen. Español, cálido y directo. NUNCA menciones que eres IA.

Perfil: Género: ${answers.gender}, Edad: ${answers.age}, Objetivo: ${answers.goal}.

Creá una rutina de skincare personalizada: rutina de mañana (2-3 pasos), rutina de noche (2-3 pasos), y UN consejo extra de cuidado personal. Específico con tipos de productos pero sin marcas. Máximo 8 oraciones.`
      }]);
      setSkincareResult(reply);
    } catch {
      setSkincareResult("Algo salió mal. Intentá de nuevo.");
    } finally {
      setSkincareLoading(false);
    }
  };

  const generateTienda = async () => {
    setTiendaLoading(true);
    setTiendaResult("");
    try {
      const reply = await callClaude([{
        role: "user",
        content: `Eres Luca, estilista personal. Español, directo. NUNCA menciones que eres IA.

Perfil: Género: ${answers.gender}, Edad: ${answers.age}, Estilo: ${answers.style}, Objetivo: ${answers.goal}, Foco: ${answers.focus}.

Recomendá 4 prendas o productos específicos para mejorar su imagen. Para cada uno: qué es, por qué lo necesita, y qué tipo de tienda o marca buscar. Personalizado, no genérico.`
      }]);
      setTiendaResult(reply);
    } catch {
      setTiendaResult("Algo salió mal. Intentá de nuevo.");
    } finally {
      setTiendaLoading(false);
    }
  };

  const C = {
    app: { minHeight: "100vh", background: "#0E1824", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif" },
    accent: "#F4845F",
    navy: "#0E1824",
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "1.2rem 1.4rem" },
  };

  // ── SPLASH ──
  if (phase === "splash") return (
    <div style={{ ...C.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
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
    const progress = (currentQ / QUESTIONS.length) * 100;
    return (
      <div style={{ ...C.app, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ height: 2, background: "#1a2a3a" }}>
          <div style={{ height: "100%", background: C.accent, width: `${progress}%`, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: C.accent, textTransform: "uppercase", marginBottom: "2.5rem" }}>
            {currentQ + 1} / {QUESTIONS.length}
          </div>
          <div style={{ textAlign: "center", marginBottom: "3rem", opacity: animating ? 0 : 1, transition: "opacity 0.3s" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, marginBottom: "0.6rem", lineHeight: 1.3 }}>{q.question}</h2>
            <p style={{ fontSize: "0.78rem", color: "#5a7a9a", letterSpacing: "0.04em" }}>{q.subtitle}</p>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.8rem", opacity: animating ? 0 : 1, transition: "opacity 0.3s" }}>
            {q.options.map((opt, i) => (
              <button key={opt} onClick={() => selectOption(opt)} style={{
                width: "100%", padding: "1.1rem 1.5rem",
                background: answers[q.id] === opt ? "rgba(244,132,95,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${answers[q.id] === opt ? C.accent : "rgba(255,255,255,0.08)"}`,
                borderRadius: 6, color: answers[q.id] === opt ? C.accent : "#8aabC0",
                fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "1rem",
                transition: "all 0.2s"
              }}>
                <span style={{ opacity: 0.5 }}>{q.icons[i]}</span> {opt}
              </button>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "1.5rem", fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", letterSpacing: "0.4em", color: "rgba(250,247,242,0.1)" }}>SHYNE</div>
      </div>
    );
  }

  // ── MAIN APP ──
  return (
    <div style={{ ...C.app, display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto", minHeight: "100vh" }}>

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

        {/* LUCA CHAT */}
        {activeSection === "luca" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Luca profile */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", ...C.card }}>
              <img src={lucaImg} alt="Luca" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: `2px solid ${C.accent}` }} />
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 400 }}>Luca</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: C.accent, textTransform: "uppercase" }}>Tu estilista personal</div>
              </div>
            </div>

            {/* Chat messages */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem", minHeight: 200 }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  {msg.role === "luca" && (
                    <img src={lucaImg} alt="Luca" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", objectPosition: "top", flexShrink: 0 }} />
                  )}
                  <div style={{
                    background: msg.role === "luca" ? "rgba(255,255,255,0.04)" : "rgba(244,132,95,0.12)",
                    border: `1px solid ${msg.role === "luca" ? "rgba(255,255,255,0.08)" : "rgba(244,132,95,0.25)"}`,
                    borderRadius: msg.role === "luca" ? "0 12px 12px 12px" : "12px 0 12px 12px",
                    padding: "0.9rem 1.1rem", fontSize: "0.88rem", lineHeight: 1.7,
                    color: "#c8d8e8", maxWidth: "80%"
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <img src={lucaImg} alt="Luca" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0 12px 12px 12px", padding: "0.9rem 1.1rem", color: "#5a7a9a", fontSize: "0.85rem", fontStyle: "italic" }}>
                    Luca está escribiendo...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "auto" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Preguntale algo a Luca..."
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.9rem 1rem", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", outline: "none" }} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                style={{ background: C.accent, border: "none", borderRadius: 8, padding: "0 1.2rem", cursor: "pointer", color: "#fff", fontSize: "1.1rem", opacity: chatLoading || !chatInput.trim() ? 0.4 : 1 }}>→</button>
            </div>
          </div>
        )}

        {/* ARMARIO */}
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
                <div key={key} style={C.card}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: C.accent, textTransform: "uppercase", marginBottom: "0.5rem" }}>{label}</div>
                  <input value={wardrobeItems[key]} onChange={e => setWardrobeItems(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                    style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", padding: "0.3rem 0", outline: "none" }} />
                </div>
              ))}
            </div>
            <button onClick={generateOutfit} disabled={outfitLoading || !wardrobeItems.top || !wardrobeItems.bottom}
              style={{ width: "100%", background: `linear-gradient(135deg, ${C.accent}, #e86d47)`, border: "none", borderRadius: 8, padding: "1rem", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", opacity: outfitLoading || !wardrobeItems.top || !wardrobeItems.bottom ? 0.5 : 1, marginBottom: "1.5rem" }}>
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

        {/* SKINCARE */}
        {activeSection === "skincare" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: C.accent, textTransform: "uppercase", marginBottom: "0.4rem" }}>Rutina personalizada</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Skincare & Cuidado</h3>
            </div>
            <div style={{ ...C.card, marginBottom: "1.5rem" }}>
              <p style={{ color: "#7a9ab0", fontSize: "0.85rem", lineHeight: 1.7 }}>
                Luca va a crear una rutina personalizada para: <span style={{ color: C.accent }}>{answers.gender}, {answers.age} años</span>, con foco en <span style={{ color: C.accent }}>{answers.goal?.toLowerCase()}</span>.
              </p>
            </div>
            <button onClick={generateSkincare} disabled={skincareLoading}
              style={{ width: "100%", background: `linear-gradient(135deg, ${C.accent}, #e86d47)`, border: "none", borderRadius: 8, padding: "1rem", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", opacity: skincareLoading ? 0.5 : 1, marginBottom: "1.5rem" }}>
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

        {/* TIENDA */}
        {activeSection === "tienda" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: C.accent, textTransform: "uppercase", marginBottom: "0.4rem" }}>Selección para vos</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300 }}>Descubrí tu Estilo</h3>
            </div>
            <div style={{ ...C.card, marginBottom: "1.5rem" }}>
              <p style={{ color: "#7a9ab0", fontSize: "0.85rem", lineHeight: 1.7 }}>Luca seleccionó recomendaciones específicas para tu perfil y objetivos. Cada sugerencia tiene un propósito.</p>
            </div>
            <button onClick={generateTienda} disabled={tiendaLoading}
              style={{ width: "100%", background: `linear-gradient(135deg, ${C.accent}, #e86d47)`, border: "none", borderRadius: 8, padding: "1rem", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", opacity: tiendaLoading ? 0.5 : 1, marginBottom: "1.5rem" }}>
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
          <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{
            flex: 1, padding: "0.9rem 0", background: "transparent", border: "none",
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
            borderTop: `2px solid ${activeSection === sec.id ? C.accent : "transparent"}`, transition: "all 0.2s"
          }}>
            <span style={{ fontSize: "1rem", color: activeSection === sec.id ? C.accent : "#3a5a7a" }}>{sec.icon}</span>
            <span style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: activeSection === sec.id ? C.accent : "#3a5a7a", textTransform: "uppercase" }}>{sec.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
