export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return Response.json(
      {
        configured: false,
        error: "DATABASE_URL não está configurada.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const parsed = new URL(connectionString);

    return Response.json({
      configured: true,
      validUrl: true,

      // Informações seguras: a senha não é retornada.
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || "5432",
      username: decodeURIComponent(parsed.username),
      database: parsed.pathname.replace(/^\//, ""),

      isPooler: parsed.hostname.endsWith(
        ".pooler.supabase.com"
      ),

      isTransactionPooler:
        parsed.hostname.endsWith(
          ".pooler.supabase.com"
        ) && parsed.port === "6543",
    });
  } catch {
    return Response.json(
      {
        configured: true,
        validUrl: false,
        error:
          "DATABASE_URL existe, mas não possui um formato válido.",
      },
      {
        status: 500,
      }
    );
  }
}