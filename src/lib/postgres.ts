import postgres, { type Sql } from "postgres";

declare global {
  var postgresClient: Sql | undefined;
}

export function getPostgresClient(): Sql {
  if (globalThis.postgresClient) {
    return globalThis.postgresClient;
  }

  // remove espaços, quebras de linha e aspas coladas junto do valor
  const databaseUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "");

  if (!databaseUrl) {
    throw new Error("A variável DATABASE_URL não foi configurada.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    const prefixOk = /^postgres(ql)?:\/\//.test(databaseUrl);
    throw new Error(
      `DATABASE_URL inválida (prefixo ${prefixOk ? "ok" : "ERRADO"}, ${databaseUrl.length} caracteres). ` +
        "Verifique caracteres especiais na senha (use encodeURIComponent), " +
        "placeholders como [YOUR-PASSWORD], aspas e espaços."
    );
  }

  console.log("Conectando ao PostgreSQL:", {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    database: parsedUrl.pathname,
    username: parsedUrl.username,
    ssl: "require",
  });

  const client = postgres(databaseUrl, {
    ssl: "require",
    prepare: false,
    max: 5,
    connect_timeout: 20,
    idle_timeout: 60,
  });

  globalThis.postgresClient = client;

  return client;
}
