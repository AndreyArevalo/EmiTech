-- AlterTable: agregar mensaje de rechazo configurable al BotConfig
ALTER TABLE "BotConfig" ADD COLUMN "rejectMessage" TEXT NOT NULL DEFAULT 'Lo sentimos, tu cita no pudo confirmarse. Escríbenos para reagendar. 🙏';
