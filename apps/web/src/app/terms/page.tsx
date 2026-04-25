export default function TermsPage() {
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: "#07070f", color: "#f0ecff", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ padding: "0 5%", height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(7,7,15,0.95)", borderBottom: "1px solid rgba(155,109,255,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f0ecff" }}>Emi<span style={{ color: "#9b6dff" }}>Tech</span></span>
        </a>
        <a href="/" style={{ color: "#9490b0", fontSize: "0.875rem", textDecoration: "none" }}>← Volver al inicio</a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 5% 100px" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "8px", letterSpacing: "-1px" }}>
          Términos de <span style={{ color: "#9b6dff" }}>Servicio</span>
        </h1>
        <p style={{ color: "#9490b0", marginBottom: "48px", fontSize: "0.9rem" }}>
          Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        {[
          {
            title: "1. Aceptación de los términos",
            content: `Al registrarte y usar EmiTech, aceptas estos Términos de Servicio. Si no estás de acuerdo con alguno de estos términos, no debes usar la plataforma.`,
          },
          {
            title: "2. Descripción del servicio",
            content: `EmiTech es una plataforma SaaS (Software como Servicio) que permite a salones de belleza, spas y negocios similares:\n\n• Gestionar citas y clientes.\n• Automatizar la atención al cliente a través de WhatsApp.\n• Recibir notificaciones y confirmaciones de citas.\n• Administrar profesionales y servicios del negocio.`,
          },
          {
            title: "3. Registro y cuenta",
            content: `Para usar EmiTech debes crear una cuenta proporcionando información veraz y actualizada. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades realizadas bajo tu cuenta. Debes notificarnos inmediatamente si sospechas de uso no autorizado.`,
          },
          {
            title: "4. Planes y pagos",
            content: `EmiTech ofrece planes de suscripción mensual. Los precios están en pesos colombianos (COP) e incluyen IVA cuando aplique.\n\n• El pago se procesa a través de Wompi, plataforma de pagos certificada en Colombia.\n• Los planes se renuevan automáticamente cada mes.\n• Puedes cancelar tu suscripción en cualquier momento; el servicio continuará hasta el fin del período pagado.\n• No hay reembolsos por períodos parciales.`,
          },
          {
            title: "5. Período de prueba",
            content: `Los nuevos salones reciben 30 días de prueba gratuita sin necesidad de tarjeta de crédito. Al finalizar el trial, deberás suscribirte a un plan de pago para continuar usando el servicio.`,
          },
          {
            title: "6. Uso aceptable",
            content: `Al usar EmiTech te comprometes a:\n\n• No usar el servicio para enviar spam o mensajes no solicitados.\n• No intentar acceder a datos de otros negocios.\n• No usar el bot para engañar o defraudar a los clientes finales.\n• Cumplir con las políticas de uso de WhatsApp Business de Meta.\n\nEmiTech se reserva el derecho de suspender cuentas que violen estas condiciones.`,
          },
          {
            title: "7. Disponibilidad del servicio",
            content: `Nos esforzamos por mantener EmiTech disponible 24/7, pero no garantizamos disponibilidad ininterrumpida. Pueden existir interrupciones por mantenimiento, actualizaciones o causas de fuerza mayor. No somos responsables por pérdidas derivadas de interrupciones del servicio.`,
          },
          {
            title: "8. Propiedad intelectual",
            content: `Todo el software, diseño y contenido de EmiTech es propiedad de Andrey Arévalo. No puedes copiar, modificar, distribuir o hacer ingeniería inversa de ninguna parte de la plataforma sin autorización expresa.`,
          },
          {
            title: "9. Limitación de responsabilidad",
            content: `EmiTech no será responsable por daños indirectos, pérdida de ingresos o datos derivados del uso o imposibilidad de uso del servicio. La responsabilidad máxima de EmiTech se limita al valor pagado por el último mes de suscripción.`,
          },
          {
            title: "10. Modificaciones",
            content: `Podemos modificar estos términos en cualquier momento. Te notificaremos los cambios importantes por correo electrónico o mediante un aviso en la plataforma. El uso continuado del servicio tras la notificación implica la aceptación de los nuevos términos.`,
          },
          {
            title: "11. Ley aplicable",
            content: `Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa se resolverá ante los tribunales competentes de Colombia.`,
          },
          {
            title: "12. Contacto",
            content: `Para cualquier consulta sobre estos términos:\n\nAndrey Arévalo — andreyarevalo0202@gmail.com\nEmiTech — emitech.app`,
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c4a0ff", marginBottom: "12px" }}>
              {section.title}
            </h2>
            <p style={{ color: "#9490b0", lineHeight: "1.8", fontSize: "0.95rem", whiteSpace: "pre-line" }}>
              {section.content}
            </p>
          </div>
        ))}

        <div style={{ borderTop: "1px solid rgba(155,109,255,0.15)", paddingTop: "32px", marginTop: "48px" }}>
          <a href="/privacy" style={{ color: "#9b6dff", fontSize: "0.875rem", textDecoration: "none" }}>
            Ver Política de Privacidad →
          </a>
        </div>
      </div>

      <footer style={{ textAlign: "center", padding: "24px", fontSize: "0.8rem", color: "rgba(148,144,176,0.5)", borderTop: "1px solid rgba(155,109,255,0.08)" }}>
        © {new Date().getFullYear()} EmiTech — Desarrollado por Andrey Arévalo
      </footer>
    </div>
  );
}
