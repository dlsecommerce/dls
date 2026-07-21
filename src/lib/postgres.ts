import postgres, {
  type Sql,
} from "postgres";

declare global {
  var postgresClient:
    | Sql
    | undefined;
}

export function getPostgresClient(): Sql {
  if (globalThis.postgresClient) {
    return globalThis.postgresClient;
  }

  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "A variável DATABASE_URL não foi configurada."
    );
  }

  const parsedUrl =
    new URL(databaseUrl);

  console.log(
    "Conectando ao PostgreSQL:",
    {
      hostname:
        parsedUrl.hostname,
      port:
        parsedUrl.port,
      database:
        parsedUrl.pathname,
      username:
        parsedUrl.username,
      ssl:
        "require",
    }
  );

  const client = postgres(
    databaseUrl,
    {

      ssl: "require",

      prepare: false,

      max: 1,

      connect_timeout: 20,
      idle_timeout: 20,
    }
  );

  globalThis.postgresClient =
    client;

  return client;
}