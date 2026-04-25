export default function PrivacyPage() {
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
          Política de <span style={{ color: "#9b6dff" }}>Privacidad</span>
        </h1>
        <p style={{ color: "#9490b0", marginBottom: "48px", fontSize: "0.9rem" }}>
          Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        {[
          {
            title: "1. Quiénes somos",
            content: `EmiTech es una plataforma de automatización para salones de belleza y spas en Colombia, desarrollada por Andrey Arévalo. Nuestra plataforma permite a los negocios gestionar citas, clientes y comunicaciones a través de WhatsApp. Puedes contactarnos en: andreyarevalo0202@gmail.com`,
          },
          {
            title: "2. Información que recopilamos",
            content: `Recopilamos la siguiente información:\n\n• Datos de contacto de clientes finales: nombre y número de teléfono de WhatsApp, proporcionados voluntariamente al interactuar con el bot.\n• Datos de los salones (tenants): nombre del negocio, correo electrónico del administrador, número de teléfono de contacto y ciudad.\n• Información de citas: fecha, hora, servicio seleccionado y profesional asignado.\n• Mensajes de WhatsApp: el contenido de las conversaciones entre clientes y el bot automatizado, necesario para prestar el servicio.`,
          },
          {
            title: "3. Cómo usamos la información",
            content: `Usamos la información recopilada para:\n\n• Gestionar y confirmar citas de los clientes de cada salón.\n• Enviar recordatorios automáticos de citas por WhatsApp.\n• Permitir a los administradores del salón visualizar y gestionar sus conversaciones y clientes.\n• Mejorar el funcionamiento del bot y la plataforma.\n\nNo usamos la información para enviar publicidad no solicitada ni la compartimos con terceros con fines comerciales.`,
          },
          {
            title: "4. Compartir información con terceros",
            content: `EmiTech utiliza los siguientes servicios de terceros para operar:\n\n• Meta (WhatsApp Business API): para el envío y recepción de mensajes. Los mensajes pasan por la infraestructura de Meta según sus propias políticas de privacidad.\n• DigitalOcean: proveedor de infraestructura donde se alojan los servidores de EmiTech.\n• Wompi: procesador de pagos para las suscripciones de los salones.\n\nNo vendemos, alquilamos ni cedemos datos personales a terceros.`,
          },
          {
            title: "5. Retención de datos",
            content: `Los datos de conversaciones y citas se conservan mientras el salón tenga una suscripción activa en EmiTech. Al cancelar la suscripción, los datos pueden ser eliminados previa solicitud enviada a andreyarevalo0202@gmail.com.`,
          },
          {
            title: "6. Derechos del usuario",
            content: `Los clientes finales de los salones tienen derecho a:\n\n• Conocer qué información tenemos sobre ellos.\n• Solicitar la corrección o eliminación de sus datos.\n• Oponerse al tratamiento de sus datos.\n\nPara ejercer estos derechos, pueden contactar directamente al salón o escribirnos a andreyarevalo0202@gmail.com.`,
          },
          {
            title: "7. Seguridad",
            content: `Implementamos medidas técnicas y organizativas para proteger la información, incluyendo cifrado HTTPS en todas las comunicaciones, acceso restringido a datos sensibles y contraseñas almacenadas con hashing seguro (bcrypt).`,
          },
          {
            title: "8. Menores de edad",
            content: `EmiTech no está dirigida a menores de 18 años. No recopilamos intencionalmente información de menores. Si detectamos que un menor ha proporcionado datos sin autorización, los eliminaremos de inmediato.`,
          },
          {
            title: "9. Cambios a esta política",
            content: `Podemos actualizar esta política periódicamente. Te notificaremos los cambios relevantes publicando la nueva versión en esta página con la fecha de actualización.`,
          },
          {
            title: "10. Contacto",
            content: `Si tienes preguntas sobre esta política de privacidad, puedes escribirnos a:\n\nAndrey Arévalo — andreyarevalo0202@gmail.com\nEmiTech — emitech.app`,
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
          <a href="/terms" style={{ color: "#9b6dff", fontSize: "0.875rem", textDecoration: "none" }}>
            Ver Términos de Servicio →
          </a>
        </div>
      </div>

      <footer style={{ textAlign: "center", padding: "24px", fontSize: "0.8rem", color: "rgba(148,144,176,0.5)", borderTop: "1px solid rgba(155,109,255,0.08)" }}>
        © {new Date().getFullYear()} EmiTech — Desarrollado por Andrey Arévalo
      </footer>
    </div>
  );
}
