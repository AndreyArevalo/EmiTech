"use client";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #07070f; --bg2: #0d0d1a; --bg3: #111120;
          --purple: #9b6dff; --purple2: #7c4dff; --purple3: #c4a0ff;
          --border: rgba(155,109,255,0.15);
          --text: #f0ecff; --muted: #9490b0; --card: rgba(255,255,255,0.03);
        }
        body { font-family: 'Inter', 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); overflow-x: hidden; }
        .glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 600px; background: radial-gradient(ellipse, rgba(124,77,255,0.22) 0%, transparent 70%); pointer-events: none; }
        .glow2 { position: absolute; bottom: -100px; right: 10%; width: 400px; height: 400px; background: radial-gradient(ellipse, rgba(155,109,255,0.08) 0%, transparent 70%); pointer-events: none; }
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 5%; height: 68px; display: flex; align-items: center; justify-content: space-between; background: rgba(7,7,15,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-text { font-size: 1.25rem; font-weight: 800; color: var(--text); }
        .logo-text span { color: var(--purple); }
        .nav-cta { background: var(--purple); color: #fff; padding: 9px 22px; border-radius: 9px; font-weight: 700; font-size: 0.875rem; text-decoration: none; transition: background 0.2s, transform 0.15s; display: inline-block; }
        .nav-cta:hover { background: var(--purple2); transform: translateY(-1px); }
        .hero { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 120px 5% 80px; overflow: hidden; }
        .hero-inner { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(155,109,255,0.1); border: 1px solid var(--border); border-radius: 100px; padding: 6px 18px; font-size: 0.78rem; font-weight: 700; color: var(--purple3); margin-bottom: 28px; letter-spacing: 0.5px; text-transform: uppercase; }
        h1 { font-size: clamp(2.2rem, 6vw, 4rem); font-weight: 900; line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 24px; }
        h1 span { background: linear-gradient(135deg, #c4a0ff, #9b6dff, #7c4dff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-sub { font-size: clamp(1rem, 2vw, 1.18rem); color: var(--muted); max-width: 560px; margin: 0 auto 40px; line-height: 1.7; }
        .btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .btn-p { background: linear-gradient(135deg, #9b6dff, #7c4dff); color: #fff; border: none; padding: 14px 32px; border-radius: 10px; font-size: 0.95rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 24px rgba(124,77,255,0.4); }
        .btn-p:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(124,77,255,0.5); }
        .btn-s { background: transparent; color: var(--text); border: 1px solid var(--border); padding: 14px 32px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: border-color 0.2s, background 0.2s; }
        .btn-s:hover { border-color: var(--purple); background: rgba(155,109,255,0.05); }
        .stats { display: flex; justify-content: center; gap: 48px; margin-top: 60px; flex-wrap: wrap; }
        .stat-num { font-size: 2rem; font-weight: 900; background: linear-gradient(135deg, #c4a0ff, #9b6dff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .stat-label { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 0 5%; }
        .pad { padding: 100px 0; }
        .container { max-width: 1140px; margin: 0 auto; padding: 0 5%; }
        .section-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--purple); margin-bottom: 14px; display: block; }
        .section-title { font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin-bottom: 16px; }
        .section-title span { background: linear-gradient(135deg, #c4a0ff, #9b6dff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .section-sub { color: var(--muted); font-size: 1rem; max-width: 520px; line-height: 1.7; }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 20px; margin-top: 56px; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; transition: border-color 0.3s, transform 0.2s; }
        .card:hover { border-color: rgba(155,109,255,0.4); transform: translateY(-3px); }
        .card-icon { width: 48px; height: 48px; background: linear-gradient(135deg, rgba(155,109,255,0.2), rgba(124,77,255,0.1)); border: 1px solid rgba(155,109,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 18px; }
        .card-title { font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--text); }
        .card-desc { font-size: 0.875rem; color: var(--muted); line-height: 1.7; }
        .how-bg { background: linear-gradient(180deg, var(--bg) 0%, var(--bg2) 50%, var(--bg) 100%); }
        .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0; margin-top: 56px; }
        .step { text-align: center; padding: 0 24px; }
        .step-num { width: 68px; height: 68px; background: linear-gradient(135deg, var(--bg3), var(--bg2)); border: 1px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 900; color: var(--purple); margin: 0 auto 20px; }
        .step-title { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
        .step-desc { font-size: 0.875rem; color: var(--muted); line-height: 1.6; }
        .pricing { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 56px; max-width: 700px; margin-left: auto; margin-right: auto; }
        .plan { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 36px 32px; text-align: center; transition: border-color 0.3s; }
        .plan.popular { border-color: rgba(155,109,255,0.5); background: rgba(155,109,255,0.05); position: relative; }
        .plan-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #9b6dff, #7c4dff); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 4px 16px; border-radius: 100px; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; }
        .plan-name { font-size: 1rem; font-weight: 700; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .plan-price { font-size: 2.8rem; font-weight: 900; color: var(--text); letter-spacing: -2px; line-height: 1; }
        .plan-price sup { font-size: 1.2rem; vertical-align: super; letter-spacing: 0; font-weight: 700; }
        .plan-period { font-size: 0.85rem; color: var(--muted); margin-top: 6px; margin-bottom: 28px; }
        .plan-features { list-style: none; text-align: left; space-y: 10px; margin-bottom: 32px; }
        .plan-features li { font-size: 0.875rem; color: var(--muted); padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; gap: 10px; }
        .plan-features li::before { content: '✦'; color: var(--purple); font-size: 0.6rem; flex-shrink: 0; }
        .trial-note { text-align: center; margin-top: 24px; font-size: 0.875rem; color: var(--muted); }
        .trial-note span { color: var(--purple3); font-weight: 600; }
        footer { border-top: 1px solid var(--border); padding: 40px 5%; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .footer-text { font-size: 0.875rem; color: var(--muted); }
        @media (max-width: 600px) { .stats { gap: 28px; } footer { flex-direction: column; text-align: center; } }
      `}</style>

      {/* NAV */}
      <nav>
        <a href="/" className="logo">
          <Image src="/perfilemi.png" alt="EmiTech" width={34} height={34} style={{ borderRadius: "50%", objectFit: "cover" }} />
          <span className="logo-text">Emi<span>Tech</span></span>
        </a>
        <Link href="/login" className="nav-cta">Iniciar sesión →</Link>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="glow" />
        <div className="glow2" />
        <div className="hero-inner">
          <div className="badge">✦ Tecnología para salones de belleza</div>
          <h1>Tu salón en piloto<br /><span>automático con IA</span></h1>
          <p className="hero-sub">
            Olvídate de responder WhatsApps a las 11pm. EmiTech agenda citas, confirma, recuerda y gestiona tu salón mientras tú trabajas.
          </p>
          <div className="btns">
            <Link href="/login" className="btn-p">Empezar gratis 30 días →</Link>
            <a href="#como-funciona" className="btn-s">Ver cómo funciona</a>
          </div>
          <div className="stats">
            <div className="stat"><div className="stat-num">24/7</div><div className="stat-label">Disponible siempre</div></div>
            <div className="stat"><div className="stat-num">0</div><div className="stat-label">Citas perdidas</div></div>
            <div className="stat"><div className="stat-num">100%</div><div className="stat-label">Desde WhatsApp</div></div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* BENEFICIOS */}
      <section className="pad">
        <div className="container">
          <span className="section-label">Beneficios</span>
          <h2 className="section-title">Todo lo que necesita<br /><span>tu salón</span></h2>
          <p className="section-sub">Una sola herramienta que reemplaza el desorden de mensajes, agendas en papel y hojas de cálculo.</p>
          <div className="cards">
            {[
              { icon: "🤖", title: "Bot de WhatsApp con IA", desc: "Atiende consultas, muestra servicios y agenda citas automáticamente. Si no sabe la respuesta, escala al humano." },
              { icon: "📅", title: "Agenda inteligente", desc: "Control de disponibilidad por estilista, horarios configurables y bloqueo de horas de descanso automático." },
              { icon: "🔔", title: "Recordatorios automáticos", desc: "El bot avisa a tus clientes horas antes de su cita. Reduce las inasistencias hasta en un 70%." },
              { icon: "👥", title: "Gestión de clientes", desc: "Historial completo de citas, servicios favoritos y datos de contacto de cada cliente." },
              { icon: "📊", title: "Panel de control", desc: "Dashboard con métricas en tiempo real: ingresos, citas del día, servicios más populares y más." },
              { icon: "✅", title: "Confirmación manual o auto", desc: "Tú decides si confirmas cada cita manualmente o si el bot la confirma solo. Flexibilidad total." },
            ].map((b) => (
              <div key={b.title} className="card">
                <div className="card-icon">{b.icon}</div>
                <div className="card-title">{b.title}</div>
                <div className="card-desc">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* CÓMO FUNCIONA */}
      <section className="pad how-bg" id="como-funciona">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 0 }}>
            <span className="section-label">Cómo funciona</span>
            <h2 className="section-title">Listo en <span>menos de un día</span></h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>Sin tecnicismos. Nosotros lo configuramos contigo.</p>
          </div>
          <div className="steps">
            {[
              { n: "1", emoji: "📋", title: "Configura tu salón", desc: "Agrega tus servicios, precios, horarios y estilistas en el panel." },
              { n: "2", emoji: "📱", title: "Conecta WhatsApp", desc: "Vincula tu número de WhatsApp Business y activa el bot." },
              { n: "3", emoji: "🤖", title: "El bot trabaja", desc: "Tus clientes escriben y el bot agenda, confirma y recuerda por ellos." },
              { n: "4", emoji: "💰", title: "Tú cobras más", desc: "Más citas, menos no-shows, más tiempo para enfocarte en tu trabajo." },
            ].map((s) => (
              <div key={s.n} className="step">
                <div className="step-num">{s.emoji}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* PRECIOS */}
      <section className="pad" id="precios">
        <div className="container" style={{ textAlign: "center" }}>
          <span className="section-label">Planes</span>
          <h2 className="section-title">Sin sorpresas, sin<br /><span>letra pequeña</span></h2>
          <p className="section-sub" style={{ margin: "0 auto 0" }}>Empieza gratis 30 días. Cancela cuando quieras.</p>
          <div className="pricing">
            <div className="plan">
              <div className="plan-name">Básico</div>
              <div className="plan-price"><sup>$</sup>89.900</div>
              <div className="plan-period">COP / mes</div>
              <ul className="plan-features">
                {["Bot de WhatsApp 24/7","Hasta 3 estilistas","Hasta 15 servicios","Recordatorios automáticos","Panel de administración"].map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href="/login" className="btn-s" style={{ justifyContent: "center", width: "100%" }}>Empezar gratis</Link>
            </div>
            <div className="plan popular">
              <div className="plan-badge">⭐ Más popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price"><sup>$</sup>159.900</div>
              <div className="plan-period">COP / mes</div>
              <ul className="plan-features">
                {["Todo lo del Básico","Hasta 10 estilistas","Hasta 50 servicios","IA como asistente del bot","Soporte prioritario","Reportes avanzados"].map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href="/login" className="btn-p" style={{ justifyContent: "center", width: "100%", boxSizing: "border-box" }}>Empezar gratis</Link>
            </div>
          </div>
          <p className="trial-note">🎁 <span>30 días de prueba gratis</span> en todos los planes. Sin tarjeta de crédito.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Image src="/perfilemi.png" alt="EmiTech" width={28} height={28} style={{ borderRadius: "50%" }} />
          <span className="logo-text" style={{ fontSize: "1rem" }}>Emi<span style={{ color: "#9b6dff" }}>Tech</span></span>
        </div>
        <span className="footer-text">© {new Date().getFullYear()} EmiTech — Automatización para salones de belleza</span>
        <Link href="/login" className="nav-cta" style={{ fontSize: "0.8rem", padding: "7px 18px" }}>Iniciar sesión</Link>
      </footer>
    </>
  );
}
