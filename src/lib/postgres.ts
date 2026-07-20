import postgres from "postgres";

type PostgresClient = ReturnType<typeof postgres>;

const globalForPostgres = globalThis as typeof globalThis & {
  __costPostgresClient?: PostgresClient;
};

export function getPostgresClient(): PostgresClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "A variável de ambiente DATABASE_URL não foi configurada."
    );
  }

  if (!globalForPostgres.__costPostgresClient) {
    globalForPostgres.__costPostgresClient = postgres(
      connectionString,
      {
        /*
         * Necessário ao usar o Transaction Pooler
         * do Supabase/Supavisor.
         */
        prepare: false,

        /*
         * Evita muitas conexões simultâneas em ambientes
         * serverless, como a Vercel.
         */
        max: 1,

        connect_timeout: 15,
        idle_timeout: 20,
      }
    );
  }

  return globalForPostgres.__costPostgresClient;
}