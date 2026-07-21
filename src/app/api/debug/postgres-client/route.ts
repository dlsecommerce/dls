import { NextResponse } from "next/server";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawDatabaseUrl =
      process.env.DATABASE_URL;

    if (!rawDatabaseUrl) {
      throw new Error(
        "DATABASE_URL não configurada."
      );
    }

    const parsedUrl = new URL(
      rawDatabaseUrl.trim()
    );

    const sql =
      getPostgresClient();

    const rows = await sql`
      select
        current_database() as database,
        current_user as usuario,
        inet_server_addr()::text as endereco_servidor,
        inet_server_port() as porta_servidor,
        now() as conectado_em
    `;

    return NextResponse.json({
      success: true,

      runtime: {
        pid: process.pid,
        nodeVersion:
          process.version,
      },

      configuredConnection: {
        hostname:
          parsedUrl.hostname,
        port:
          Number(
            parsedUrl.port ||
              5432
          ),
        database:
          parsedUrl.pathname,
        username:
          decodeURIComponent(
            parsedUrl.username
          ),
      },

      queryResult:
        rows[0] ?? null,
    });
  } catch (error: unknown) {
    const databaseError =
      error as {
        name?: string;
        message?: string;
        code?: string;
        errno?: number;
        syscall?: string;
        hostname?: string;
        address?: string;
        port?: number;
        cause?: unknown;
      };

    console.error(
      "Erro no teste do cliente PostgreSQL:",
      databaseError
    );

    return NextResponse.json(
      {
        success: false,

        runtime: {
          pid: process.pid,
          nodeVersion:
            process.version,
        },

        error: {
          name:
            databaseError.name ??
            null,
          message:
            databaseError.message ??
            "Erro desconhecido.",
          code:
            databaseError.code ??
            null,
          errno:
            databaseError.errno ??
            null,
          syscall:
            databaseError.syscall ??
            null,
          hostname:
            databaseError.hostname ??
            null,
          address:
            databaseError.address ??
            null,
          port:
            databaseError.port ??
            null,
          cause:
            databaseError.cause ??
            null,
        },
      },
      {
        status: 500,
      }
    );
  }
}