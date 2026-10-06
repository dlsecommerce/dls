import postgres, { type Sql } from "postgres";

declare global {
  var postgresClient: Sql | undefined;
}

type DbConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // tem "%" solto na senha: usa como está
  }
}

/**
 * Lê a DATABASE_URL sem usar new URL(), então aceita senha com
 * @ # / : ? % sem codificar. Usa o ÚLTIMO "@" como separador.
 */
function parseDatabaseUrl(raw: string): DbConfig {
  const match = raw.match(/^postgres(?:ql)?:\/\/(.+)$/i);
  if (!match) {
    throw new Error(
      `DATABASE_URL com prefixo ERRADO (${raw.length} caracteres). Deve começar com postgresql:// ou postgres://`
    );
  }

  const rest = match[1];
  const at = rest.lastIndexOf("@");
  if (at === -1) {
    throw new Error("DATABASE_URL sem '@' entre a senha e o host.");
  }

  const creds = rest.slice(0, at);
  const hostPart = rest.slice(at + 1);

  const colon = creds.indexOf(":");
  const username = safeDecode(colon === -1 ? creds : creds.slice(0, colon));
  const password = safeDecode(colon === -1 ? "" : creds.slice(colon + 1));

  const h = hostPart.match(/^([^:/?]+)(?::(\d+))?(?:\/([^?]*))?/);
  if (!h) {
    throw new Error("DATABASE_URL com host/porta inválidos (a porta deve ser numérica).");
  }

  return {
    host: h[1],
    port: h[2] ? Number(h[2]) : 5432,
    database: h[3] || "postgres",
    username,
    password,
  };
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

  const cfg = parseDatabaseUrl(databaseUrl);

  console.log("Conectando ao PostgreSQL:", {
    hostname: cfg.host,
    port: cfg.port,
    database: cfg.database,
    username: cfg.username,
    ssl: "require",
  });

  const client = postgres({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    username: cfg.username,
    password: cfg.password,
    ssl: "require",
    prepare: false,
    max: 5,
    connect_timeout: 20,
    idle_timeout: 60,
  });

  globalThis.postgresClient = client;

  return client;
}
