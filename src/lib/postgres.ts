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

  const cfg: DbConfig = {
    host: h[1].trim(),
    port: h[2] ? Number(h[2]) : 5432,
    database: h[3] || "postgres",
    username: username.trim(),
    password,
  };

  validateConfig(cfg);
  return cfg;
}

function validateConfig(cfg: DbConfig): void {
  if (!cfg.username) {
    throw new Error("DATABASE_URL sem usuário.");
  }
  if (!cfg.password) {
    throw new Error("DATABASE_URL sem senha.");
  }
  if (/^\[.*\]$/.test(cfg.password) || cfg.password.includes("YOUR-PASSWORD")) {
    throw new Error(
      "DATABASE_URL ainda contém o placeholder [YOUR-PASSWORD]. Troque pela senha real, sem os colchetes."
    );
  }
  if (!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) {
    throw new Error(`DATABASE_URL com porta inválida (${cfg.port}).`);
  }

  const isPooler = cfg.host.endsWith(".pooler.supabase.com");
  if (isPooler && !cfg.username.includes(".")) {
    throw new Error(
      `Host do pooler exige usuário no formato postgres.SEUREF (recebido "${cfg.username}"). ` +
        "Senão o Supabase responde 'Tenant or user not found'."
    );
  }
}

function resolvePoolMax(isServerless: boolean): number {
  const fromEnv = Number(process.env.DB_POOL_MAX);
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  return isServerless ? 1 : 5;
}

export function getPostgresClient(): Sql {
  if (globalThis.postgresClient) {
    return globalThis.postgresClient;
  }

  // remove espaços, quebras de linha e aspas coladas junto do valor
  const databaseUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "").trim();

  if (!databaseUrl) {
    throw new Error("A variável DATABASE_URL não foi configurada.");
  }

  const cfg = parseDatabaseUrl(databaseUrl);

  const isServerless = Boolean(process.env.VERCEL);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(cfg.host);
  const isDirectSupabase = /^db\..+\.supabase\.co$/.test(cfg.host);
  const max = resolvePoolMax(isServerless);

  if (isServerless && isDirectSupabase) {
    console.warn(
      "[postgres] Conexão direta (db.*.supabase.co) na Vercel pode falhar por IPv6. " +
        "Use o Transaction pooler (porta 6543)."
    );
  }
  if (isServerless && cfg.port === 5432 && cfg.host.endsWith(".pooler.supabase.com")) {
    console.warn("[postgres] Porta 5432 no pooler é Session mode. Em serverless prefira 6543.");
  }

  console.log("Conectando ao PostgreSQL:", {
    hostname: cfg.host,
    port: cfg.port,
    database: cfg.database,
    username: cfg.username,
    ssl: isLocalHost ? "off" : "require",
    max,
  });

  const client = postgres({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    username: cfg.username,
    password: cfg.password,
    ssl: isLocalHost ? false : "require",
    prepare: false, // obrigatório no pooler em modo transaction
    max,
    connect_timeout: 20,
    idle_timeout: 60,
    max_lifetime: 60 * 30, // recicla conexões a cada 30 min
  });

  globalThis.postgresClient = client;

  return client;
}
