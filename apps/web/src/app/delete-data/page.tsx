export default function DeleteDataPage() {
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: "#07070f", color: "#f0ecff", minHeight: "100vh" }}>
      <nav style={{ padding: "0 5%", height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(7,7,15,0.95)", borderBottom: "1px solid rgba(155,109,255,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f0ecff", textDecoration: "none" }}>
          Emi<span style={{ color: "#9b6dff" }}>Tech</span>
        </a>
        <a href="/" style={{ color: "#9490b0", fontSize: "0.875rem", textDecoration: "none" }}>← Volver al inicio</a>
      </nav>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "60px 5% 100px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "8px", letterSpacing: "-1px" }}>
          Eliminación de <span style={{ color: "#9b6dff" }}>datos</span>
        </h1>
        <p style={{ color: "#9490b0", marginBottom: "40px", fontSize: "0.9rem" }}>
          Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div style={{ background: "rgba(155,109,255,0.06)", border: "1px solid rgba(155,109,255,0.2)", borderRadius: "16px", padding: "28px", marginBottom: "32px" }}>
          <p style={{ color: "#c4a0ff", fontWeight: 700, marginBottom: "12px", fontSize: "1rem" }}>
            ¿Quieres eliminar tus datos de EmiTech?
          </p>
          <p style={{ color: "#9490b0", lineHeight: "1.8", fontSize: "0.95rem" }}>
            Para solicitar la eliminación de tus datos personales de nuestra plataforma, envíanos un correo con el asunto <strong style={{ color: "#f0ecff" }}>"Eliminación de datos"</strong> a:
          </p>
          <a href="mailto:andreyarevalo0202@gmail.com?subject=Eliminación de datos EmiTech"
            style={{ display: "inline-block", marginTop: "16px", background: "linear-gradient(135deg, #9b6dff, #7c4dff)", color: "#fff", padding: "12px 24px", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>
            andreyarevalo0202@gmail.com
          </a>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#c4a0ff", marginBottom: "12px" }}>¿Qué datos se eliminan?</h2>
          <p style={{ color: "#9490b0", lineHeight: "1.8", fontSize: "0.95rem" }}>
            Al recibir tu solicitud, eliminaremos en un plazo de 30 días hábiles:
          </p>
          <ul style={{ color: "#9490b0", lineHeight: "2", paddingLeft: "20px", fontSize: "0.95rem", marginTop: "8px" }}>
            <li>Tu nombre y número de teléfono registrado.</li>
            <li>Historial de citas asociado a tu número.</li>
            <li>Conversaciones con el bot de WhatsApp.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#c4a0ff", marginBottom: "12px" }}>Información necesaria</h2>
          <p style={{ color: "#9490b0", lineHeight: "1.8", fontSize: "0.95rem" }}>
            Para procesar tu solicitud, incluye en el correo:<br />
            • Tu número de teléfono de WhatsApp (con código de país, ej: +57300...)<br />
            • El nombre del salón donde agendaste tu cita (si lo recuerdas)
          </p>
        </div>
      </div>

      <footer style={{ textAlign: "center", padding: "24px", fontSize: "0.8rem", color: "rgba(148,144,176,0.5)", borderTop: "1px solid rgba(155,109,255,0.08)" }}>
        © {new Date().getFullYear()} EmiTech — Desarrollado por Andrey Arévalo
      </footer>
    </div>
  );
}
