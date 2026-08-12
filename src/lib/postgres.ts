import postgres, { type Sql } from "postgres";

declare global {
  var postgresClient: Sql | undefined;
}

export function getPostgresClient(): Sql {
  if (globalThis.postgresClient) {
    return globalThis.postgresClient;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("A variável DATABASE_URL não foi configurada.");
  }

  const parsedUrl = new URL(databaseUrl);

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

    // Aumentado de 1 para 5: cobre os 4 workers paralelos do client
    // (CONCURRENCY = 4) + 1 de margem. Com max:1, requests paralelos
    // ficavam na fila esperando a única conexão — anulando o ganho
    // da paralelização implementada no ImportAnnounce.ts.
    max: 5,

    connect_timeout: 20,

    // Aumentado de 20s para 60s: reduz a frequência de reconexão
    // (handshake TCP+TLS+auth) em invocações "quentes" que ficam
    // ociosas por um curto período entre requests do usuário.
    idle_timeout: 60,
  });

  globalThis.postgresClient = client;

  return client;
}
