import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function testTcp(
  hostname: string,
  port: number
): Promise<{
  success: boolean;
  remoteAddress?: string;
  error?: string;
  code?: string;
}> {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: hostname,
      port,
      timeout: 10000,
    });

    socket.once("connect", () => {
      const remoteAddress =
        socket.remoteAddress;

      socket.end();

      resolve({
        success: true,
        remoteAddress,
      });
    });

    socket.once("timeout", () => {
      socket.destroy();

      resolve({
        success: false,
        error:
          "Timeout ao conectar na porta do PostgreSQL.",
        code: "TIMEOUT",
      });
    });

    socket.once("error", (error: NodeJS.ErrnoException) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code,
      });
    });
  });
}

export async function GET() {
  const rawDatabaseUrl =
    process.env.DATABASE_URL;

  if (!rawDatabaseUrl) {
    return NextResponse.json(
      {
        success: false,
        error:
          "DATABASE_URL não encontrada dentro do processo Next.js.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const databaseUrl = new URL(
      rawDatabaseUrl.trim()
    );

    const hostname =
      databaseUrl.hostname;

    const port = Number(
      databaseUrl.port || 5432
    );

    let dnsResult:
      | Awaited<ReturnType<typeof lookup>>
      | null = null;

    let dnsError:
      | {
          message: string;
          code?: string;
        }
      | null = null;

    try {
      dnsResult = await lookup(
        hostname,
        {
          all: true,
        }
      );
    } catch (
      error: unknown
    ) {
      const dnsException =
        error as NodeJS.ErrnoException;

      dnsError = {
        message:
          dnsException.message,
        code:
          dnsException.code,
      };
    }

    const tcpResult =
      dnsResult
        ? await testTcp(
            hostname,
            port
          )
        : null;

    return NextResponse.json({
      success:
        Boolean(dnsResult) &&
        Boolean(
          tcpResult?.success
        ),

      runtime: {
        pid: process.pid,
        nodeVersion:
          process.version,
        platform:
          process.platform,
        architecture:
          process.arch,
      },

      database: {
        hostname,
        hostnameJson:
          JSON.stringify(
            hostname
          ),
        hostnameLength:
          hostname.length,
        hostnameCharacters:
          Array.from(hostname).map(
            (character) => ({
              character,
              code:
                character.codePointAt(
                  0
                ),
            })
          ),
        port,
        database:
          databaseUrl.pathname,
        username:
          decodeURIComponent(
            databaseUrl.username
          ),
      },

      dns: {
        result:
          dnsResult,
        error:
          dnsError,
      },

      tcp:
        tcpResult,
    });
  } catch (
    error: unknown
  ) {
    const exception =
      error as Error;

    return NextResponse.json(
      {
        success: false,
        error:
          exception.message,
      },
      {
        status: 500,
      }
    );
  }
}