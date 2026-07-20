


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."anuncios_all"() RETURNS TABLE("ID" bigint, "Loja" "text", "ID Bling" "text", "ID Tray" "text", "ID Var" "text", "OD" "text", "Referência" "text", "Nome" "text", "Marca" "text", "Categoria" "text", "Peso" numeric, "Altura" numeric, "Largura" numeric, "Comprimento" numeric, "Código 1" "text", "Quantidade 1" numeric, "Código 2" "text", "Quantidade 2" numeric, "Código 3" "text", "Quantidade 3" numeric, "Código 4" "text", "Quantidade 4" numeric, "Código 5" "text", "Quantidade 5" numeric, "Código 6" "text", "Quantidade 6" numeric, "Código 7" "text", "Quantidade 7" numeric, "Código 8" "text", "Quantidade 8" numeric, "Código 9" "text", "Quantidade 9" numeric, "Código 10" "text", "Quantidade 10" numeric)
    LANGUAGE "sql"
    AS $$
  SELECT
    "ID",
    "Loja",
    "ID Bling",
    "ID Tray",
    "ID Var",
    "OD",
    "Referência",
    "Nome",
    "Marca",
    "Categoria",
    NULLIF(REPLACE("Peso", ',', '.'), '')::numeric AS "Peso",
    NULLIF(REPLACE("Altura", ',', '.'), '')::numeric AS "Altura",
    NULLIF(REPLACE("Largura", ',', '.'), '')::numeric AS "Largura",
    NULLIF(REPLACE("Comprimento", ',', '.'), '')::numeric AS "Comprimento",
    "Código 1",
    NULLIF(REPLACE("Quantidade 1", ',', '.'), '')::numeric AS "Quantidade 1",
    "Código 2",
    NULLIF(REPLACE("Quantidade 2", ',', '.'), '')::numeric AS "Quantidade 2",
    "Código 3",
    NULLIF(REPLACE("Quantidade 3", ',', '.'), '')::numeric AS "Quantidade 3",
    "Código 4",
    NULLIF(REPLACE("Quantidade 4", ',', '.'), '')::numeric AS "Quantidade 4",
    "Código 5",
    NULLIF(REPLACE("Quantidade 5", ',', '.'), '')::numeric AS "Quantidade 5",
    "Código 6",
    NULLIF(REPLACE("Quantidade 6", ',', '.'), '')::numeric AS "Quantidade 6",
    "Código 7",
    NULLIF(REPLACE("Quantidade 7", ',', '.'), '')::numeric AS "Quantidade 7",
    "Código 8",
    NULLIF(REPLACE("Quantidade 8", ',', '.'), '')::numeric AS "Quantidade 8",
    "Código 9",
    NULLIF(REPLACE("Quantidade 9", ',', '.'), '')::numeric AS "Quantidade 9",
    "Código 10",
    NULLIF(REPLACE("Quantidade 10", ',', '.'), '')::numeric AS "Quantidade 10"
  FROM public."anuncios_pk"

  UNION ALL

  SELECT
    "ID",
    "Loja",
    "ID Bling",
    "ID Tray",
    "ID Var",
    "OD",
    "Referência",
    "Nome",
    "Marca",
    "Categoria",
    NULLIF(REPLACE("Peso", ',', '.'), '')::numeric AS "Peso",
    NULLIF(REPLACE("Altura", ',', '.'), '')::numeric AS "Altura",
    NULLIF(REPLACE("Largura", ',', '.'), '')::numeric AS "Largura",
    NULLIF(REPLACE("Comprimento", ',', '.'), '')::numeric AS "Comprimento",
    "Código 1",
    NULLIF(REPLACE("Quantidade 1", ',', '.'), '')::numeric AS "Quantidade 1",
    "Código 2",
    NULLIF(REPLACE("Quantidade 2", ',', '.'), '')::numeric AS "Quantidade 2",
    "Código 3",
    NULLIF(REPLACE("Quantidade 3", ',', '.'), '')::numeric AS "Quantidade 3",
    "Código 4",
    NULLIF(REPLACE("Quantidade 4", ',', '.'), '')::numeric AS "Quantidade 4",
    "Código 5",
    NULLIF(REPLACE("Quantidade 5", ',', '.'), '')::numeric AS "Quantidade 5",
    "Código 6",
    NULLIF(REPLACE("Quantidade 6", ',', '.'), '')::numeric AS "Quantidade 6",
    "Código 7",
    NULLIF(REPLACE("Quantidade 7", ',', '.'), '')::numeric AS "Quantidade 7",
    "Código 8",
    NULLIF(REPLACE("Quantidade 8", ',', '.'), '')::numeric AS "Quantidade 8",
    "Código 9",
    NULLIF(REPLACE("Quantidade 9", ',', '.'), '')::numeric AS "Quantidade 9",
    "Código 10",
    NULLIF(REPLACE("Quantidade 10", ',', '.'), '')::numeric AS "Quantidade 10"
  FROM public."anuncios_sb";
$$;


ALTER FUNCTION "public"."anuncios_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."anuncios_all_by_id"("anuncio_id" bigint) RETURNS TABLE("ID" bigint, "Loja" "text", "ID Bling" "text", "ID Tray" "text", "ID Var" "text", "OD" "text", "Referência" "text", "Nome" "text", "Marca" "text", "Categoria" "text", "Peso" numeric, "Altura" numeric, "Largura" numeric, "Comprimento" numeric, "Código 1" "text", "Quantidade 1" numeric, "Código 2" "text", "Quantidade 2" numeric, "Código 3" "text", "Quantidade 3" numeric, "Código 4" "text", "Quantidade 4" numeric, "Código 5" "text", "Quantidade 5" numeric, "Código 6" "text", "Quantidade 6" numeric, "Código 7" "text", "Quantidade 7" numeric, "Código 8" "text", "Quantidade 8" numeric, "Código 9" "text", "Quantidade 9" numeric, "Código 10" "text", "Quantidade 10" numeric)
    LANGUAGE "sql"
    AS $$
  SELECT * 
  FROM public.anuncios_all()
  WHERE "ID" = anuncio_id;
$$;


ALTER FUNCTION "public"."anuncios_all_by_id"("anuncio_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualiza_timestamp_mensagem"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualiza_timestamp_mensagem"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualiza_timestamp_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualiza_timestamp_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_custo_magalu_por_faixa"("p_loja" "text" DEFAULT 'PK'::"text", "p_id_min" numeric DEFAULT 0, "p_id_max" numeric DEFAULT 999999999, "p_limit" integer DEFAULT 20) RETURNS TABLE("id" "text", "referencia" "text", "anuncio_id" "text", "custo" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_loja text;
  v_marketplace_table text;
  v_anuncios_table text;
  v_limit integer;
  v_sql text;
BEGIN
  v_loja := upper(trim(coalesce(p_loja, 'PK')));
  v_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  IF v_loja IN ('PIKOT', 'PIKOT SHOP') THEN
    v_loja := 'PK';
  ELSIF v_loja IN ('SOBAQUETAS', 'SÓBAQUETAS', 'SO BAQUETAS') THEN
    v_loja := 'SB';
  END IF;

  IF v_loja NOT IN ('PK', 'SB') THEN
    RETURN;
  END IF;

  IF v_loja = 'SB' THEN
    v_marketplace_table := 'marketplace_magalu_sb';
    v_anuncios_table := 'anuncios_sb';
  ELSE
    v_marketplace_table := 'marketplace_magalu_pk';
    v_anuncios_table := 'anuncios_pk';
  END IF;

  v_sql := format(
    $SQL$
      WITH candidatos AS (
        SELECT
          m.id,
          m."ID",
          m.anuncio_id,
          m."Referência"
        FROM public.%I m
        WHERE public.safe_to_numeric(m."ID"::text) BETWEEN %s AND %s
          AND NULLIF(trim(coalesce(m.anuncio_id::text, '')), '') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.%I a
            WHERE a."ID"::text = m.anuncio_id::text
            LIMIT 1
          )
        ORDER BY public.safe_to_numeric(m."ID"::text)
        LIMIT %s
      ),

      calculados AS (
        SELECT
          c.id,
          c."ID"::text AS id_text,
          c."Referência"::text AS referencia_text,
          c.anuncio_id::text AS anuncio_id_text,

          COALESCE(SUM(
            COALESCE(NULLIF(public.safe_to_numeric(i.quantidade::text), 0), 1)
            *
            COALESCE(public.safe_to_numeric(ct."Custo Atual"::text), 0)
          ), 0) AS custo_calculado

        FROM candidatos c

        JOIN public.%I a
          ON a."ID"::text = c.anuncio_id::text

        CROSS JOIN LATERAL (
          VALUES
            (a."Código 1",  a."Quantidade 1"),
            (a."Código 2",  a."Quantidade 2"),
            (a."Código 3",  a."Quantidade 3"),
            (a."Código 4",  a."Quantidade 4"),
            (a."Código 5",  a."Quantidade 5"),
            (a."Código 6",  a."Quantidade 6"),
            (a."Código 7",  a."Quantidade 7"),
            (a."Código 8",  a."Quantidade 8"),
            (a."Código 9",  a."Quantidade 9"),
            (a."Código 10", a."Quantidade 10")
        ) AS i(codigo, quantidade)

        LEFT JOIN public.custos ct
          ON ct."Código"::text = i.codigo::text

        WHERE NULLIF(trim(coalesce(i.codigo::text, '')), '') IS NOT NULL

        GROUP BY
          c.id,
          c."ID",
          c."Referência",
          c.anuncio_id
      ),

      atualizados AS (
        UPDATE public.%I m
        SET "Custo" = calculados.custo_calculado
        FROM calculados
        WHERE m.id = calculados.id
        RETURNING
          m."ID"::text AS id,
          m."Referência"::text AS referencia,
          m.anuncio_id::text AS anuncio_id,
          m."Custo"::numeric AS custo
      )

      SELECT
        atualizados.id,
        atualizados.referencia,
        atualizados.anuncio_id,
        atualizados.custo
      FROM atualizados
    $SQL$,
    v_marketplace_table,
    p_id_min,
    p_id_max,
    v_anuncios_table,
    v_limit,
    v_anuncios_table,
    v_marketplace_table
  );

  RETURN QUERY EXECUTE v_sql;
END;
$_$;


ALTER FUNCTION "public"."atualizar_custo_magalu_por_faixa"("p_loja" "text", "p_id_min" numeric, "p_id_max" numeric, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_custo_magalu_super_leve"("p_loja" "text" DEFAULT 'PK'::"text", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "text", "referencia" "text", "anuncio_id" "text", "custo" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_loja text;
  v_marketplace_table text;
  v_anuncios_table text;
  v_limit integer;
  v_sql text;
BEGIN
  v_loja := upper(trim(coalesce(p_loja, 'PK')));
  v_limit := greatest(1, least(coalesce(p_limit, 10), 50));

  IF v_loja IN ('PIKOT', 'PIKOT SHOP') THEN
    v_loja := 'PK';
  ELSIF v_loja IN ('SOBAQUETAS', 'SÓBAQUETAS', 'SO BAQUETAS') THEN
    v_loja := 'SB';
  END IF;

  IF v_loja NOT IN ('PK', 'SB') THEN
    RETURN;
  END IF;

  IF v_loja = 'SB' THEN
    v_marketplace_table := 'marketplace_magalu_sb';
    v_anuncios_table := 'anuncios_sb';
  ELSE
    v_marketplace_table := 'marketplace_magalu_pk';
    v_anuncios_table := 'anuncios_pk';
  END IF;

  v_sql := format(
    $SQL$
      WITH candidatos AS (
        SELECT
          m.id,
          m."ID",
          m.anuncio_id,
          m."Referência"
        FROM public.%I m
        WHERE COALESCE(m."Custo", 0) = 0
          AND NULLIF(trim(coalesce(m.anuncio_id::text, '')), '') IS NOT NULL
        ORDER BY m.id
        LIMIT %s
      ),
      calculados AS (
        SELECT
          c.id,
          c."ID"::text AS id_text,
          c."Referência"::text AS referencia_text,
          c.anuncio_id::text AS anuncio_id_text,
          COALESCE(SUM(
            COALESCE(public.safe_to_numeric(i.quantidade::text), 1)
            *
            COALESCE(public.safe_to_numeric(ct."Custo Atual"::text), 0)
          ), 0) AS custo_calculado
        FROM candidatos c
        JOIN public.%I a
          ON a."ID"::text = c.anuncio_id::text
        CROSS JOIN LATERAL (
          VALUES
            (a."Código 1",  a."Quantidade 1"),
            (a."Código 2",  a."Quantidade 2"),
            (a."Código 3",  a."Quantidade 3"),
            (a."Código 4",  a."Quantidade 4"),
            (a."Código 5",  a."Quantidade 5"),
            (a."Código 6",  a."Quantidade 6"),
            (a."Código 7",  a."Quantidade 7"),
            (a."Código 8",  a."Quantidade 8"),
            (a."Código 9",  a."Quantidade 9"),
            (a."Código 10", a."Quantidade 10")
        ) AS i(codigo, quantidade)
        LEFT JOIN public.custos ct
          ON ct."Código"::text = i.codigo::text
        WHERE NULLIF(trim(coalesce(i.codigo::text, '')), '') IS NOT NULL
        GROUP BY
          c.id,
          c."ID",
          c."Referência",
          c.anuncio_id
      ),
      atualizados AS (
        UPDATE public.%I m
        SET "Custo" = calculados.custo_calculado
        FROM calculados
        WHERE m.id = calculados.id
          AND calculados.custo_calculado > 0
        RETURNING
          m."ID"::text AS id,
          m."Referência"::text AS referencia,
          m.anuncio_id::text AS anuncio_id,
          m."Custo"::numeric AS custo
      )
      SELECT
        atualizados.id,
        atualizados.referencia,
        atualizados.anuncio_id,
        atualizados.custo
      FROM atualizados
    $SQL$,
    v_marketplace_table,
    v_limit,
    v_anuncios_table,
    v_marketplace_table
  );

  RETURN QUERY EXECUTE v_sql;
END;
$_$;


ALTER FUNCTION "public"."atualizar_custo_magalu_super_leve"("p_loja" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shopee_ref_chave"("p_referencia" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v text;
begin
  v := public.shopee_ref_limpa(p_referencia);

  if v = '' then
    return null;
  end if;

  -- Remove prefixo PAI / VAR em qualquer forma:
  -- PAI-MARCA-CODIGO
  -- PAI - MARCA CODIGO
  -- VAR-MARCA-CODIGO
  -- VAR - MARCA CODIGO
  v := regexp_replace(v, '^\s*(PAI|VAR)\s*[-_\s]*', '', 'i');

  v := trim(v);
  v := regexp_replace(v, '\s*-\s*', '-', 'g');
  v := regexp_replace(v, '\s*_\s*', '_', 'g');
  v := regexp_replace(v, '\s+', '_', 'g');

  if v = '' then
    return null;
  end if;

  return v;
end;
$$;


ALTER FUNCTION "public"."shopee_ref_chave"("p_referencia" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shopee_ref_tipo"("p_referencia" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v text;
begin
  v := public.shopee_ref_limpa(p_referencia);

  if v ~* '^\s*PAI\s*[-_\s]+' or v ~* '^\s*PAI-' then
    return 'PAI';
  end if;

  if v ~* '^\s*VAR\s*[-_\s]+' or v ~* '^\s*VAR-' then
    return 'VAR';
  end if;

  return 'SIMPLES';
end;
$$;


ALTER FUNCTION "public"."shopee_ref_tipo"("p_referencia" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."marketplace_shopee_pk" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" bigint NOT NULL,
    "ID" bigint NOT NULL,
    "Loja" "text" DEFAULT 'PK'::"text" NOT NULL,
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "Referência" "text",
    "OD" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Desconto" numeric,
    "Embalagem" numeric,
    "Frete" numeric,
    "Comissão" numeric,
    "Imposto" numeric,
    "Margem de Lucro" numeric,
    "Marketing" numeric,
    "Custo" numeric,
    "Preço de Venda" numeric,
    "Atualizado em" timestamp without time zone DEFAULT "now"(),
    "Sincronizado em" timestamp without time zone
);

ALTER TABLE ONLY "public"."marketplace_shopee_pk" REPLICA IDENTITY FULL;


ALTER TABLE "public"."marketplace_shopee_pk" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_shopee_sb" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" bigint,
    "ID" bigint,
    "Loja" "text" DEFAULT 'SB'::"text" NOT NULL,
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "Referência" "text",
    "OD" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Desconto" numeric,
    "Embalagem" numeric,
    "Frete" numeric,
    "Comissão" numeric,
    "Imposto" numeric,
    "Margem de Lucro" numeric,
    "Marketing" numeric,
    "Custo" numeric,
    "Preço de Venda" numeric,
    "Atualizado em" timestamp without time zone DEFAULT "now"(),
    "Sincronizado em" timestamp without time zone
);

ALTER TABLE ONLY "public"."marketplace_shopee_sb" REPLICA IDENTITY FULL;


ALTER TABLE "public"."marketplace_shopee_sb" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_shopee_variacoes_ref_count" (
    "loja" "text" NOT NULL,
    "chave_ref" "text" NOT NULL,
    "total_variacoes" integer DEFAULT 0 NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketplace_shopee_variacoes_ref_count" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."marketplace_shopee_all" WITH ("security_invoker"='on') AS
 SELECT "s"."id",
    "s"."anuncio_id",
    "s"."ID",
    'PK'::"text" AS "Loja",
    "s"."ID Tray",
    "s"."ID Var",
    "s"."ID Bling",
    "s"."Nome",
    "s"."Marca",
    "s"."Referência",
    "s"."Categoria",
    "s"."Desconto",
    "s"."Embalagem",
    "s"."Frete",
    "s"."Comissão",
    "s"."Imposto",
    "s"."Marketing",
    "s"."Margem de Lucro",
    "s"."Custo",
    "s"."Preço de Venda",
    "s"."Atualizado em",
    "public"."shopee_ref_tipo"("s"."Referência") AS "tipo_ref",
    "public"."shopee_ref_chave"("s"."Referência") AS "chave_ref",
    COALESCE("c"."total_variacoes", 0) AS "total_variacoes"
   FROM ("public"."marketplace_shopee_pk" "s"
     LEFT JOIN "public"."marketplace_shopee_variacoes_ref_count" "c" ON ((("c"."loja" = 'PK'::"text") AND ("c"."chave_ref" = "public"."shopee_ref_chave"("s"."Referência")))))
UNION ALL
 SELECT "s"."id",
    "s"."anuncio_id",
    "s"."ID",
    'SB'::"text" AS "Loja",
    "s"."ID Tray",
    "s"."ID Var",
    "s"."ID Bling",
    "s"."Nome",
    "s"."Marca",
    "s"."Referência",
    "s"."Categoria",
    "s"."Desconto",
    "s"."Embalagem",
    "s"."Frete",
    "s"."Comissão",
    "s"."Imposto",
    "s"."Marketing",
    "s"."Margem de Lucro",
    "s"."Custo",
    "s"."Preço de Venda",
    "s"."Atualizado em",
    "public"."shopee_ref_tipo"("s"."Referência") AS "tipo_ref",
    "public"."shopee_ref_chave"("s"."Referência") AS "chave_ref",
    COALESCE("c"."total_variacoes", 0) AS "total_variacoes"
   FROM ("public"."marketplace_shopee_sb" "s"
     LEFT JOIN "public"."marketplace_shopee_variacoes_ref_count" "c" ON ((("c"."loja" = 'SB'::"text") AND ("c"."chave_ref" = "public"."shopee_ref_chave"("s"."Referência")))));


ALTER VIEW "public"."marketplace_shopee_all" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_pai_shopee_por_referencia"("p_loja" "text", "p_referencia" "text") RETURNS SETOF "public"."marketplace_shopee_all"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.marketplace_shopee_all s
  where s."Loja" = public.shopee_normalizar_loja(p_loja)
    and public.shopee_ref_tipo(s."Referência") = 'PAI'
    and public.shopee_ref_chave(s."Referência") =
        public.shopee_ref_chave(p_referencia)
  order by
    s."ID" nulls last,
    s.id
  limit 1;
$$;


ALTER FUNCTION "public"."buscar_pai_shopee_por_referencia"("p_loja" "text", "p_referencia" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_variacoes_do_pai"("p_referencia_pai" "text", "p_loja" "text" DEFAULT NULL::"text", "p_marketplace" "text" DEFAULT 'magalu'::"text") RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_loja text;
  v_marketplace text;
  v_marketplace_table text;
  v_anuncios_table text;
  v_ref_pai text;
  v_base text;
  v_marca text;
  v_codigos_text text;
  v_codigo text;
  v_refs text[] := ARRAY[]::text[];
  v_sql text;
BEGIN
  v_ref_pai := upper(trim(coalesce(p_referencia_pai, '')));
  v_loja := upper(trim(coalesce(p_loja, '')));
  v_marketplace := lower(trim(coalesce(p_marketplace, 'magalu')));

  IF v_ref_pai = '' THEN
    RETURN;
  END IF;

  IF v_loja IN ('PIKOT', 'PIKOT SHOP') THEN
    v_loja := 'PK';
  ELSIF v_loja IN ('SOBAQUETAS', 'SÓBAQUETAS', 'SO BAQUETAS') THEN
    v_loja := 'SB';
  END IF;

  IF v_loja NOT IN ('PK', 'SB') THEN
    RETURN;
  END IF;

  IF v_marketplace NOT IN ('magalu', 'shopee', 'tray') THEN
    v_marketplace := 'magalu';
  END IF;

  v_marketplace_table := format(
    'marketplace_%s_%s',
    v_marketplace,
    lower(v_loja)
  );

  v_anuncios_table := format(
    'anuncios_%s',
    lower(v_loja)
  );

  v_base := regexp_replace(v_ref_pai, '^\s*PAI\s*[-_\s]*', '', 'i');
  v_base := regexp_replace(v_base, '\s+', '', 'g');

  IF v_base = '' THEN
    RETURN;
  END IF;

  v_marca := split_part(v_base, '-', 1);
  v_codigos_text := substring(v_base from position('-' in v_base) + 1);

  IF v_marca = '' OR v_codigos_text = '' OR v_codigos_text = v_base THEN
    v_refs := ARRAY[upper('VAR-' || v_base)];
  ELSE
    FOREACH v_codigo IN ARRAY string_to_array(v_codigos_text, '_')
    LOOP
      IF trim(v_codigo) <> '' THEN
        v_refs := array_append(
          v_refs,
          upper('VAR-' || v_marca || '-' || trim(v_codigo))
        );
      END IF;
    END LOOP;
  END IF;

  IF array_length(v_refs, 1) IS NULL THEN
    RETURN;
  END IF;

  v_sql := format(
    $SQL$
      SELECT
        jsonb_strip_nulls(
          to_jsonb(m)

          ||

          jsonb_build_object(
            'marketplace_id', m.id,
            'id_marketplace', m.id,

            'anuncio_id', COALESCE(m.anuncio_id::text, a."ID"::text, m."ID"::text),
            'id_anuncio', COALESCE(m.anuncio_id::text, a."ID"::text, m."ID"::text),

            'id_logico', COALESCE(a."ID"::text, m."ID"::text, m.anuncio_id::text),
            'ID', COALESCE(a."ID"::text, m."ID"::text, m.anuncio_id::text),

            'loja', %L,
            'Loja', %L,

            'marketplace', %L,
            'canal', %L,

            'tipo_anuncio', 'variacoes'
          )

          ||

          jsonb_build_object(
            'referencia', m."Referência",
            'Referencia', m."Referência",
            'Referência', m."Referência",
            'sku', m."Referência",

            'nome', COALESCE(a."Nome", m."Nome"),
            'Nome', COALESCE(a."Nome", m."Nome"),

            'marca', COALESCE(a."Marca", m."Marca"),
            'Marca', COALESCE(a."Marca", m."Marca"),

            'categoria', COALESCE(a."Categoria", m."Categoria"),
            'Categoria', COALESCE(a."Categoria", m."Categoria")
          )

          ||

          jsonb_build_object(
            'preco', m."Preço de Venda",
            'precoLoja', m."Preço de Venda",
            'preco_loja', m."Preço de Venda",
            'Preço de Venda', m."Preço de Venda",

            'desconto', m."Desconto",
            'Desconto', m."Desconto",

            'embalagem', m."Embalagem",
            'Embalagem', m."Embalagem",

            'frete', m."Frete",
            'Frete', m."Frete",

            'imposto', m."Imposto",
            'Imposto', m."Imposto"
          )

          ||

          jsonb_build_object(
            'margem', m."Margem de Lucro",
            'margem_lucro', m."Margem de Lucro",
            'Margem de Lucro', m."Margem de Lucro",

            'comissao', m."Comissão",
            'Comissao', m."Comissão",
            'Comissão', m."Comissão",

            'marketing', m."Marketing",
            'Marketing', m."Marketing"
          )

          ||

          jsonb_build_object(
            'composicao', COALESCE(comp.composicao, '[]'::jsonb),
            'Composicao', COALESCE(comp.composicao, '[]'::jsonb),
            'Composição', COALESCE(comp.composicao, '[]'::jsonb),

            'custoTotal', COALESCE(comp.custo_total, 0),
            'custo_total', COALESCE(comp.custo_total, 0),
            'custo', COALESCE(comp.custo_total, 0),
            'Custo', COALESCE(comp.custo_total, 0),
            'Custo Total', COALESCE(comp.custo_total, 0)
          )

          ||

          jsonb_build_object(
            'calculoLoja', jsonb_build_object(
              'desconto', COALESCE(m."Desconto"::text, ''),
              'embalagem', COALESCE(m."Embalagem"::text, ''),
              'frete', COALESCE(m."Frete"::text, ''),
              'imposto', COALESCE(m."Imposto"::text, ''),
              'margem', COALESCE(m."Margem de Lucro"::text, ''),
              'comissao', COALESCE(m."Comissão"::text, ''),
              'marketing', COALESCE(m."Marketing"::text, '')
            )
          )

          ||

          jsonb_build_object(
            'dados',
              to_jsonb(m)

              ||

              jsonb_build_object(
                'marketplace_id', m.id,
                'id_marketplace', m.id,

                'anuncio_id', COALESCE(m.anuncio_id::text, a."ID"::text, m."ID"::text),
                'id_anuncio', COALESCE(m.anuncio_id::text, a."ID"::text, m."ID"::text),

                'id_logico', COALESCE(a."ID"::text, m."ID"::text, m.anuncio_id::text),
                'ID', COALESCE(a."ID"::text, m."ID"::text, m.anuncio_id::text),

                'tipo_anuncio', 'variacoes',

                'marketplace', %L,
                'canal', %L
              )

              ||

              jsonb_build_object(
                'referencia', m."Referência",
                'Referencia', m."Referência",
                'Referência', m."Referência",
                'sku', m."Referência",

                'composicao', COALESCE(comp.composicao, '[]'::jsonb),
                'Composicao', COALESCE(comp.composicao, '[]'::jsonb),
                'Composição', COALESCE(comp.composicao, '[]'::jsonb),

                'custoTotal', COALESCE(comp.custo_total, 0),
                'custo_total', COALESCE(comp.custo_total, 0),
                'custo', COALESCE(comp.custo_total, 0),
                'Custo', COALESCE(comp.custo_total, 0),
                'Custo Total', COALESCE(comp.custo_total, 0)
              )
          )
        )
      FROM public.%I m

      LEFT JOIN LATERAL (
        SELECT a1.*
        FROM public.%I a1
        WHERE
          a1."Loja"::text = %L
          AND (
            a1."ID"::text = m.anuncio_id::text
            OR a1."ID"::text = m."ID"::text
            OR a1."Referência"::text = m."Referência"::text
            OR a1."ID Tray"::text = m."ID Tray"::text
            OR a1."ID Var"::text = m."ID Var"::text
          )
        LIMIT 1
      ) a ON true

      LEFT JOIN LATERAL (
        WITH itens AS (
          SELECT *
          FROM (
            VALUES
              (1, a."Código 1",  a."Quantidade 1"),
              (2, a."Código 2",  a."Quantidade 2"),
              (3, a."Código 3",  a."Quantidade 3"),
              (4, a."Código 4",  a."Quantidade 4"),
              (5, a."Código 5",  a."Quantidade 5"),
              (6, a."Código 6",  a."Quantidade 6"),
              (7, a."Código 7",  a."Quantidade 7"),
              (8, a."Código 8",  a."Quantidade 8"),
              (9, a."Código 9",  a."Quantidade 9"),
              (10, a."Código 10", a."Quantidade 10")
          ) AS x(ordem, codigo, quantidade)
          WHERE nullif(trim(coalesce(x.codigo::text, '')), '') IS NOT NULL
        ),
        itens_com_custo AS (
          SELECT
            i.ordem,
            i.codigo::text AS codigo,

            COALESCE(
              NULLIF(
                replace(
                  regexp_replace(i.quantidade::text, '[^0-9,.\-]', '', 'g'),
                  ',',
                  '.'
                ),
                ''
              )::numeric,
              1
            ) AS quantidade,

            COALESCE(
              NULLIF(
                replace(
                  regexp_replace(c."Custo Atual"::text, '[^0-9,.\-]', '', 'g'),
                  ',',
                  '.'
                ),
                ''
              )::numeric,
              0
            ) AS custo
          FROM itens i
          LEFT JOIN public.custos c
            ON c."Código"::text = i.codigo::text
        )
        SELECT
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'codigo', codigo,
                'Codigo', codigo,
                'Código', codigo,

                'produto', '',
                'descricao', '',

                'quantidade', quantidade,
                'Quantidade', quantidade,

                'custo', custo,
                'Custo', custo
              )
              ORDER BY ordem
            ),
            '[]'::jsonb
          ) AS composicao,

          COALESCE(SUM(quantidade * custo), 0) AS custo_total
        FROM itens_com_custo
      ) comp ON true

      WHERE upper(trim(m."Referência"::text)) = ANY($1)
      ORDER BY m."Referência"
    $SQL$,
    v_loja,
    v_loja,
    initcap(v_marketplace),
    initcap(v_marketplace),

    initcap(v_marketplace),
    initcap(v_marketplace),

    v_marketplace_table,
    v_anuncios_table,
    v_loja
  );

  RETURN QUERY EXECUTE v_sql USING v_refs;
END;
$_$;


ALTER FUNCTION "public"."buscar_variacoes_do_pai"("p_referencia_pai" "text", "p_loja" "text", "p_marketplace" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calc_custo_composicao_marketplace"("p_codigo_1" "text" DEFAULT NULL::"text", "p_qtd_1" "text" DEFAULT NULL::"text", "p_codigo_2" "text" DEFAULT NULL::"text", "p_qtd_2" "text" DEFAULT NULL::"text", "p_codigo_3" "text" DEFAULT NULL::"text", "p_qtd_3" "text" DEFAULT NULL::"text", "p_codigo_4" "text" DEFAULT NULL::"text", "p_qtd_4" "text" DEFAULT NULL::"text", "p_codigo_5" "text" DEFAULT NULL::"text", "p_qtd_5" "text" DEFAULT NULL::"text", "p_codigo_6" "text" DEFAULT NULL::"text", "p_qtd_6" "text" DEFAULT NULL::"text", "p_codigo_7" "text" DEFAULT NULL::"text", "p_qtd_7" "text" DEFAULT NULL::"text", "p_codigo_8" "text" DEFAULT NULL::"text", "p_qtd_8" "text" DEFAULT NULL::"text", "p_codigo_9" "text" DEFAULT NULL::"text", "p_qtd_9" "text" DEFAULT NULL::"text", "p_codigo_10" "text" DEFAULT NULL::"text", "p_qtd_10" "text" DEFAULT NULL::"text") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  WITH itens AS (
    SELECT *
    FROM (
      VALUES
        (1, p_codigo_1,  p_qtd_1),
        (2, p_codigo_2,  p_qtd_2),
        (3, p_codigo_3,  p_qtd_3),
        (4, p_codigo_4,  p_qtd_4),
        (5, p_codigo_5,  p_qtd_5),
        (6, p_codigo_6,  p_qtd_6),
        (7, p_codigo_7,  p_qtd_7),
        (8, p_codigo_8,  p_qtd_8),
        (9, p_codigo_9,  p_qtd_9),
        (10, p_codigo_10, p_qtd_10)
    ) AS x(ordem, codigo, quantidade)
    WHERE NULLIF(trim(COALESCE(codigo, '')), '') IS NOT NULL
      AND lower(trim(COALESCE(codigo, ''))) NOT IN (
        'código do cu',
        'codigo do cu',
        'código do custo',
        'codigo do custo',
        'novo custo'
      )
  ),
  itens_com_custo AS (
    SELECT
      i.ordem,
      trim(i.codigo) AS codigo,
      greatest(
        public.safe_to_numeric(COALESCE(NULLIF(trim(i.quantidade), ''), '1')),
        1
      ) AS quantidade_num,
      public.safe_to_numeric(c."Custo Atual"::text) AS custo_atual
    FROM itens i
    LEFT JOIN public.custos c
      ON trim(c."Código"::text) = trim(i.codigo)
  )
  SELECT round(
    COALESCE(
      SUM(quantidade_num * COALESCE(custo_atual, 0)),
      0
    ),
    2
  )
  FROM itens_com_custo;
$$;


ALTER FUNCTION "public"."calc_custo_composicao_marketplace"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_preco_venda"("desconto" "text", "embalagem" "text", "frete" "text", "comissao" "text", "imposto" "text", "margem" "text", "marketing" "text", "custo" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_desconto NUMERIC := COALESCE(NULLIF(desconto, '')::NUMERIC, 0);
  v_embalagem NUMERIC := COALESCE(NULLIF(embalagem, '')::NUMERIC, 0);
  v_frete NUMERIC := COALESCE(NULLIF(frete, '')::NUMERIC, 0);
  v_comissao NUMERIC := COALESCE(NULLIF(comissao, '')::NUMERIC, 0);
  v_imposto NUMERIC := COALESCE(NULLIF(imposto, '')::NUMERIC, 0);
  v_margem NUMERIC := COALESCE(NULLIF(margem, '')::NUMERIC, 0);
  v_marketing NUMERIC := COALESCE(NULLIF(marketing, '')::NUMERIC, 0);
  v_custo NUMERIC := COALESCE(NULLIF(custo, '')::NUMERIC, 0);
  v_preco NUMERIC;
BEGIN
  v_preco := ROUND(
    (v_custo + v_embalagem + v_frete + v_marketing + v_imposto + v_comissao)
    * (1 + v_margem / 100)
    * (1 - v_desconto / 100),
    2
  );
  RETURN v_preco;
END;
$$;


ALTER FUNCTION "public"."calcular_preco_venda"("desconto" "text", "embalagem" "text", "frete" "text", "comissao" "text", "imposto" "text", "margem" "text", "marketing" "text", "custo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_preco_venda_magalu"("p_custo" numeric DEFAULT 0, "p_desconto" numeric DEFAULT 0, "p_embalagem" numeric DEFAULT 0, "p_frete" numeric DEFAULT 0, "p_comissao" numeric DEFAULT 0, "p_imposto" numeric DEFAULT 0, "p_margem_lucro" numeric DEFAULT 0, "p_marketing" numeric DEFAULT 0) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  base numeric;
  percentual_total numeric;
  divisor numeric;
BEGIN
  base :=
    COALESCE(p_custo, 0)
    + COALESCE(p_embalagem, 0)
    + COALESCE(p_frete, 0)
    + COALESCE(p_marketing, 0);

  percentual_total :=
    COALESCE(p_desconto, 0)
    + COALESCE(p_comissao, 0)
    + COALESCE(p_imposto, 0)
    + COALESCE(p_margem_lucro, 0);

  divisor := 1 - (percentual_total / 100);

  IF divisor <= 0 THEN
    RETURN 0;
  END IF;

  RETURN round(base / divisor, 2);
END;
$$;


ALTER FUNCTION "public"."calcular_preco_venda_magalu"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_preco_venda_marketplace"("p_custo" numeric DEFAULT 0, "p_desconto" numeric DEFAULT 0, "p_embalagem" numeric DEFAULT 0, "p_frete" numeric DEFAULT 0, "p_comissao" numeric DEFAULT 0, "p_imposto" numeric DEFAULT 0, "p_margem_lucro" numeric DEFAULT 0, "p_marketing" numeric DEFAULT 0) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  base numeric;
  percentual_total numeric;
  divisor numeric;
BEGIN
  base :=
    COALESCE(p_custo, 0)
    + COALESCE(p_embalagem, 0)
    + COALESCE(p_frete, 0)
    + COALESCE(p_marketing, 0);

  percentual_total :=
    COALESCE(p_desconto, 0)
    + COALESCE(p_comissao, 0)
    + COALESCE(p_imposto, 0)
    + COALESCE(p_margem_lucro, 0);

  divisor := 1 - (percentual_total / 100);

  IF divisor <= 0 THEN
    RETURN 0;
  END IF;

  RETURN round(base / divisor, 2);
END;
$$;


ALTER FUNCTION "public"."calcular_preco_venda_marketplace"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."chave_valida_anuncio"("p_text" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select
    p_text is not null
    and upper(trim(p_text)) not in (
      '',
      'NULL',
      'N TRAY',
      'NTRAY',
      'NÃO',
      'NAO',
      '-',
      '0',
      'SEM',
      'SIMPLES'
    );
$$;


ALTER FUNCTION "public"."chave_valida_anuncio"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."chave_variacao_padrao"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select lower(
    regexp_replace(
      trim(
        regexp_replace(
          coalesce(p_ref, ''),
          '^(PAI|VAR)\s*-\s*',
          '',
          'i'
        )
      ),
      '\s+',
      '',
      'g'
    )
  );
$$;


ALTER FUNCTION "public"."chave_variacao_padrao"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- apaga relações primeiro, para evitar problema de chave estrangeira
  delete from public.notification_reads
  where notification_id in (
    select id
    from public.notifications
    where created_at < now() - interval '3 days'
  );

  delete from public.notification_hidden
  where notification_id in (
    select id
    from public.notifications
    where created_at < now() - interval '3 days'
  );

  delete from public.notifications
  where created_at < now() - interval '3 days';
end;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."codigo_modelo_anuncio"("p_codigo" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(split_part(public.codigo_norm_anuncio(p_codigo), ' ', 1), '');
$$;


ALTER FUNCTION "public"."codigo_modelo_anuncio"("p_codigo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."codigo_norm_anuncio"("p_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select public.normalizar_texto_anuncio(p_text);
$$;


ALTER FUNCTION "public"."codigo_norm_anuncio"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."codigo_tipo_anuncio"("p_codigo" "text", "p_nome" "text", "p_referencia" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  with dados as (
    select
      public.codigo_norm_anuncio(p_codigo) as codigo_norm,
      public.normalizar_texto_anuncio(p_nome) as nome_norm,
      public.normalizar_texto_anuncio(p_referencia) as ref_norm
  ),

  partes as (
    select
      codigo_norm,
      nome_norm,
      ref_norm,
      split_part(codigo_norm, ' ', 2) as tamanho
    from dados
  )

  select
    case
      when codigo_norm like '%SL%'
        or nome_norm like '%SEM LOGO%'
        or ref_norm like '%SEM LOGO%'
      then 'SEM_LOGO'

      when nome_norm like '%NYLON%'
        or ref_norm like '%NYLON%'
        or tamanho ~ '^[0-9A-Z]*N$'
      then 'NYLON'

      else 'MADEIRA'
    end
  from partes;
$_$;


ALTER FUNCTION "public"."codigo_tipo_anuncio"("p_codigo" "text", "p_nome" "text", "p_referencia" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custos"() RETURNS TABLE("codigo" "text", "custo" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select 
        "Código"::text as codigo,
        "Custo Atual"::numeric as custo
    from public.custos;
$$;


ALTER FUNCTION "public"."custos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_timeouts"() RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  select jsonb_build_object(
    'statement_timeout', current_setting('statement_timeout', true),
    'idle_in_transaction_session_timeout', current_setting('idle_in_transaction_session_timeout', true),
    'lock_timeout', current_setting('lock_timeout', true),
    'role', current_user,
    'session_user', session_user
  );
$$;


ALTER FUNCTION "public"."debug_timeouts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_all_to_pk_sb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Anti-loop
    IF current_setting('myapp.market_sync', true) = 'on' THEN
        RETURN OLD;
    END IF;

    BEGIN
        PERFORM set_config('myapp.market_sync', 'on', true);
    EXCEPTION
        WHEN others THEN NULL;
    END;

    IF OLD."Loja" = 'PK' THEN
        DELETE FROM marketplace_tray_pk
        WHERE "ID" = OLD."ID";

    ELSIF OLD."Loja" = 'SB' THEN
        DELETE FROM marketplace_tray_sb
        WHERE "ID" = OLD."ID";
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_all_to_pk_sb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_marketplaces_on_anuncio_pk_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.marketplace_shopee_pk
  WHERE anuncio_id = OLD."ID";

  DELETE FROM public.marketplace_tray_pk
  WHERE anuncio_id = OLD."ID";

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_marketplaces_on_anuncio_pk_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_marketplaces_on_anuncio_sb_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.marketplace_shopee_sb
  WHERE anuncio_id = OLD."ID";

  DELETE FROM public.marketplace_tray_sb
  WHERE anuncio_id = OLD."ID";

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_marketplaces_on_anuncio_sb_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_pk_to_all"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Anti-loop
    IF current_setting('myapp.market_sync', true) = 'on' THEN
        RETURN OLD;
    END IF;

    BEGIN
        PERFORM set_config('myapp.market_sync', 'on', true);
    EXCEPTION
        WHEN others THEN NULL;
    END;

    DELETE FROM marketplace_tray_all
    WHERE "ID" = OLD."ID"
      AND "Loja" = 'PK';

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_pk_to_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_sb_to_all"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Anti-loop
    IF current_setting('myapp.market_sync', true) = 'on' THEN
        RETURN OLD;
    END IF;

    BEGIN
        PERFORM set_config('myapp.market_sync', 'on', true);
    EXCEPTION
        WHEN others THEN NULL;
    END;

    DELETE FROM marketplace_tray_all
    WHERE "ID" = OLD."ID"
      AND "Loja" = 'SB';

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_sb_to_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enfileirar_recalculo_anuncio"("p_tabela_anuncios" "text", "p_anuncio_id" bigint, "p_id_bling" "text" DEFAULT NULL::"text", "p_origem" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
    if p_tabela_anuncios not in ('anuncios_pk', 'anuncios_sb') then
        return;
    end if;

    insert into public.fila_recalculo_marketplace (
        tabela_anuncios,
        anuncio_id,
        id_bling,
        origem,
        status
    )
    select
        p_tabela_anuncios,
        p_anuncio_id,
        nullif(btrim(p_id_bling), ''),
        p_origem,
        'pendente'
    where not exists (
        select 1
        from public.fila_recalculo_marketplace f
        where f.tabela_anuncios = p_tabela_anuncios
          and f.anuncio_id = p_anuncio_id
          and f.status = 'pendente'
    );
end;
$$;


ALTER FUNCTION "public"."enfileirar_recalculo_anuncio"("p_tabela_anuncios" "text", "p_anuncio_id" bigint, "p_id_bling" "text", "p_origem" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_dm_participants"("p_conversa_id" "text", "p_other_user" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- usuário precisa estar logado
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- evita criar conversa com ele mesmo
  if p_other_user is null or p_other_user = auth.uid() then
    raise exception 'invalid other user';
  end if;

  -- garante que o outro usuário existe
  if not exists (
    select 1 from public.profiles where id = p_other_user
  ) then
    raise exception 'other user not found';
  end if;

  -- insere o usuário logado
  insert into public.conversa_participantes (conversa_id, usuario_id)
  values (p_conversa_id, auth.uid())
  on conflict (conversa_id, usuario_id) do nothing;

  -- insere o outro participante
  insert into public.conversa_participantes (conversa_id, usuario_id)
  values (p_conversa_id, p_other_user)
  on conflict (conversa_id, usuario_id) do nothing;
end;
$$;


ALTER FUNCTION "public"."ensure_dm_participants"("p_conversa_id" "text", "p_other_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  execute sql;
end;
$$;


ALTER FUNCTION "public"."exec_sql"("sql" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
        COALESCE(public.fn_get_custo_codigo(p_codigo_1), 0)  * public.fn_text_to_numeric_safe(p_qtd_1) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_2), 0)  * public.fn_text_to_numeric_safe(p_qtd_2) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_3), 0)  * public.fn_text_to_numeric_safe(p_qtd_3) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_4), 0)  * public.fn_text_to_numeric_safe(p_qtd_4) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_5), 0)  * public.fn_text_to_numeric_safe(p_qtd_5) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_6), 0)  * public.fn_text_to_numeric_safe(p_qtd_6) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_7), 0)  * public.fn_text_to_numeric_safe(p_qtd_7) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_8), 0)  * public.fn_text_to_numeric_safe(p_qtd_8) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_9), 0)  * public.fn_text_to_numeric_safe(p_qtd_9) +
        COALESCE(public.fn_get_custo_codigo(p_codigo_10), 0) * public.fn_text_to_numeric_safe(p_qtd_10);
$$;


ALTER FUNCTION "public"."fn_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_calc_preco_venda_shopee"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  custo numeric := COALESCE(p_custo, 0);
  descontoPct numeric := COALESCE(p_desconto, 0);
  embalagem numeric := COALESCE(p_embalagem, 2.5);
  frete numeric := COALESCE(p_frete, 0);

  comissaoPct numeric := COALESCE(p_comissao, 0);
  impostoPct numeric := COALESCE(p_imposto, 0);
  lucroPct numeric := COALESCE(p_margem_lucro, 0);
  marketingPct numeric := COALESCE(p_marketing, 0);

  custoLiquido numeric;
  baseTeste numeric;
  numerador numeric;
  divisor numeric;
  pv numeric;
BEGIN
  IF custo <= 0 THEN
    RETURN 0;
  END IF;

  custoLiquido := custo * (1 - descontoPct / 100);
  baseTeste := custoLiquido + embalagem + frete;

  IF baseTeste > 500 THEN
    numerador := custoLiquido + embalagem + 100;
    divisor := 1 - (impostoPct + lucroPct + marketingPct) / 100;
  ELSE
    numerador := custoLiquido + embalagem + frete;
    divisor := 1 - (comissaoPct + impostoPct + lucroPct + marketingPct) / 100;
  END IF;

  -- ✅ validação correta para numeric
  IF divisor <= 0 THEN
    RETURN 0;
  END IF;

  pv := numerador / divisor;

  IF pv <= 0 THEN
    RETURN 0;
  END IF;

  RETURN round(pv, 2);
END;
$$;


ALTER FUNCTION "public"."fn_calc_preco_venda_shopee"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_calc_preco_venda_tray"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  custo numeric := COALESCE(p_custo, 0);
  desconto numeric := COALESCE(p_desconto, 0) / 100;
  embalagem numeric := COALESCE(p_embalagem, 2.5);
  frete numeric := COALESCE(p_frete, 0);

  comissao numeric := COALESCE(p_comissao, 0) / 100;
  imposto numeric := COALESCE(p_imposto, 0) / 100;
  lucro numeric := COALESCE(p_margem_lucro, 0) / 100;
  marketing numeric := COALESCE(p_marketing, 0) / 100;

  custoLiquido numeric;
  divisor numeric;
  preco numeric;
BEGIN
  IF custo <= 0 THEN
    RETURN 0;
  END IF;

  custoLiquido := custo * (1 - desconto);
  divisor := 1 - (imposto + lucro + comissao + marketing);

  -- ✅ validação correta
  IF divisor <= 0 THEN
    RETURN 0;
  END IF;

  preco := (custoLiquido + frete + embalagem) / divisor;

  IF preco <= 0 THEN
    RETURN 0;
  END IF;

  RETURN round(preco, 2);
END;
$$;


ALTER FUNCTION "public"."fn_calc_preco_venda_tray"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_enfileirar_recalculo_anuncio_pk"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.fila_recalculo_marketplace (tabela_anuncio, anuncio_id, codigo_origem)
    VALUES ('anuncios_pk', NEW."ID", NULL)
    ON CONFLICT DO NOTHING;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_enfileirar_recalculo_anuncio_pk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_enfileirar_recalculo_anuncio_sb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.fila_recalculo_marketplace (tabela_anuncio, anuncio_id, codigo_origem)
    VALUES ('anuncios_sb', NEW."ID", NULL)
    ON CONFLICT DO NOTHING;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_enfileirar_recalculo_anuncio_sb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_enfileirar_recalculo_por_custo"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_codigo text;
BEGIN
    v_codigo := public.fn_normalize_codigo(NEW."Código");

    INSERT INTO public.fila_recalculo_marketplace (tabela_anuncio, anuncio_id, codigo_origem)
    SELECT 'anuncios_pk', a."ID", NEW."Código"
    FROM public.anuncios_pk a
    WHERE public.fn_normalize_codigo(a."Código 1")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 2")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 3")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 4")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 5")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 6")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 7")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 8")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 9")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 10") = v_codigo
    ON CONFLICT DO NOTHING;

    INSERT INTO public.fila_recalculo_marketplace (tabela_anuncio, anuncio_id, codigo_origem)
    SELECT 'anuncios_sb', a."ID", NEW."Código"
    FROM public.anuncios_sb a
    WHERE public.fn_normalize_codigo(a."Código 1")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 2")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 3")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 4")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 5")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 6")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 7")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 8")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 9")  = v_codigo
       OR public.fn_normalize_codigo(a."Código 10") = v_codigo
    ON CONFLICT DO NOTHING;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_enfileirar_recalculo_por_custo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_custo_codigo"("p_codigo" "text") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
    SELECT c."Custo Atual"
    FROM public.custos c
    WHERE public.fn_normalize_codigo(c."Código") = public.fn_normalize_codigo(p_codigo)
      AND c."Código" IS NOT NULL
      AND btrim(c."Código") <> ''
      AND c."Custo Atual" IS NOT NULL
      AND c."Custo Atual" > 0
    ORDER BY c."Custo Atual" DESC
    LIMIT 1;
$$;


ALTER FUNCTION "public"."fn_get_custo_codigo"("p_codigo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_guard_custos_invalidos"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD."Custo Atual" IS NOT NULL
       AND OLD."Custo Atual" > 0
       AND (NEW."Custo Atual" IS NULL OR NEW."Custo Atual" <= 0) THEN
        RAISE EXCEPTION
        'Bloqueado: tentativa de sobrescrever custo válido por 0/NULL. Código: %, antigo: %, novo: %',
        NEW."Código", OLD."Custo Atual", NEW."Custo Atual";
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_guard_custos_invalidos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_normalize_codigo"("p_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
    SELECT NULLIF(upper(btrim(p_text)), '');
$$;


ALTER FUNCTION "public"."fn_normalize_codigo"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_parse_numeric_br"("p" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v text;
BEGIN
  IF p IS NULL THEN RETURN 0; END IF;
  v := btrim(p);
  IF v = '' THEN RETURN 0; END IF;

  v := regexp_replace(v, '[^0-9,\.\-]+', '', 'g');
  v := replace(v, '.', '');
  v := replace(v, ',', '.');

  RETURN COALESCE(v::numeric, 0);
EXCEPTION WHEN others THEN
  RETURN 0;
END;
$$;


ALTER FUNCTION "public"."fn_parse_numeric_br"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_processar_fila_recalculo_marketplace"("p_limite" integer DEFAULT 100) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    r RECORD;
    v_processados integer := 0;
BEGIN
    FOR r IN
        SELECT id, tabela_anuncio, anuncio_id
        FROM public.fila_recalculo_marketplace
        WHERE status = 'pendente'
        ORDER BY criado_em
        LIMIT p_limite
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            UPDATE public.fila_recalculo_marketplace
               SET status = 'processando',
                   tentativas = tentativas + 1,
                   atualizado_em = now()
             WHERE id = r.id;

            IF r.tabela_anuncio = 'anuncios_pk' THEN
                PERFORM public.fn_push_marketplace_pk_from_anuncio(r.anuncio_id);
            ELSIF r.tabela_anuncio = 'anuncios_sb' THEN
                PERFORM public.fn_push_marketplace_sb_from_anuncio(r.anuncio_id);
            END IF;

            UPDATE public.fila_recalculo_marketplace
               SET status = 'processado',
                   erro = NULL,
                   atualizado_em = now()
             WHERE id = r.id;

            v_processados := v_processados + 1;

        EXCEPTION WHEN OTHERS THEN
            UPDATE public.fila_recalculo_marketplace
               SET status = 'erro',
                   erro = SQLERRM,
                   atualizado_em = now()
             WHERE id = r.id;
        END;
    END LOOP;

    RETURN v_processados;
END;
$$;


ALTER FUNCTION "public"."fn_processar_fila_recalculo_marketplace"("p_limite" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_push_marketplace_pk_from_anuncio"("p_anuncio_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total numeric;
    v_id_bling text;
    v_id int8;
BEGIN
    SELECT
        a."ID",
        public.fn_normalize_codigo(a."ID Bling"::text),
        public.fn_calc_custo_composicao(
            a."Código 1",  a."Quantidade 1",
            a."Código 2",  a."Quantidade 2",
            a."Código 3",  a."Quantidade 3",
            a."Código 4",  a."Quantidade 4",
            a."Código 5",  a."Quantidade 5",
            a."Código 6",  a."Quantidade 6",
            a."Código 7",  a."Quantidade 7",
            a."Código 8",  a."Quantidade 8",
            a."Código 9",  a."Quantidade 9",
            a."Código 10", a."Quantidade 10"
        )
    INTO v_id, v_id_bling, v_total
    FROM public.anuncios_pk a
    WHERE a."ID" = p_anuncio_id;

    IF v_total IS NULL OR v_total <= 0 THEN
        RETURN;
    END IF;

    UPDATE public.marketplace_tray_pk m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = v_id
            OR m."ID" = v_id
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;

    UPDATE public.marketplace_shopee_pk m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = v_id
            OR m."ID" = v_id
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;
END;
$$;


ALTER FUNCTION "public"."fn_push_marketplace_pk_from_anuncio"("p_anuncio_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_push_marketplace_sb_from_anuncio"("p_anuncio_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total numeric;
    v_id_bling text;
    v_id int8;
BEGIN
    SELECT
        a."ID",
        public.fn_normalize_codigo(a."ID Bling"::text),
        public.fn_calc_custo_composicao(
            a."Código 1",  a."Quantidade 1",
            a."Código 2",  a."Quantidade 2",
            a."Código 3",  a."Quantidade 3",
            a."Código 4",  a."Quantidade 4",
            a."Código 5",  a."Quantidade 5",
            a."Código 6",  a."Quantidade 6",
            a."Código 7",  a."Quantidade 7",
            a."Código 8",  a."Quantidade 8",
            a."Código 9",  a."Quantidade 9",
            a."Código 10", a."Quantidade 10"
        )
    INTO v_id, v_id_bling, v_total
    FROM public.anuncios_sb a
    WHERE a."ID" = p_anuncio_id;

    IF v_total IS NULL OR v_total <= 0 THEN
        RETURN;
    END IF;

    UPDATE public.marketplace_tray_sb m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = v_id
            OR m."ID" = v_id
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;

    UPDATE public.marketplace_shopee_sb m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = v_id
            OR m."ID" = v_id
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;
END;
$$;


ALTER FUNCTION "public"."fn_push_marketplace_sb_from_anuncio"("p_anuncio_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_pk"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total numeric;
    v_id_bling text;
BEGIN
    v_total := public.fn_calc_custo_composicao(
        NEW."Código 1",  NEW."Quantidade 1",
        NEW."Código 2",  NEW."Quantidade 2",
        NEW."Código 3",  NEW."Quantidade 3",
        NEW."Código 4",  NEW."Quantidade 4",
        NEW."Código 5",  NEW."Quantidade 5",
        NEW."Código 6",  NEW."Quantidade 6",
        NEW."Código 7",  NEW."Quantidade 7",
        NEW."Código 8",  NEW."Quantidade 8",
        NEW."Código 9",  NEW."Quantidade 9",
        NEW."Código 10", NEW."Quantidade 10"
    );

    IF v_total IS NULL OR v_total <= 0 THEN
        RETURN NULL;
    END IF;

    v_id_bling := public.fn_normalize_codigo(NEW."ID Bling"::text);

    UPDATE public.marketplace_tray_pk m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = NEW."ID"
            OR m."ID" = NEW."ID"
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;

    UPDATE public.marketplace_shopee_pk m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = NEW."ID"
            OR m."ID" = NEW."ID"
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_pk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_sb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total numeric;
    v_id_bling text;
BEGIN
    v_total := public.fn_calc_custo_composicao(
        NEW."Código 1",  NEW."Quantidade 1",
        NEW."Código 2",  NEW."Quantidade 2",
        NEW."Código 3",  NEW."Quantidade 3",
        NEW."Código 4",  NEW."Quantidade 4",
        NEW."Código 5",  NEW."Quantidade 5",
        NEW."Código 6",  NEW."Quantidade 6",
        NEW."Código 7",  NEW."Quantidade 7",
        NEW."Código 8",  NEW."Quantidade 8",
        NEW."Código 9",  NEW."Quantidade 9",
        NEW."Código 10", NEW."Quantidade 10"
    );

    IF v_total IS NULL OR v_total <= 0 THEN
        RETURN NULL;
    END IF;

    v_id_bling := public.fn_normalize_codigo(NEW."ID Bling"::text);

    UPDATE public.marketplace_tray_sb m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = NEW."ID"
            OR m."ID" = NEW."ID"
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;

    UPDATE public.marketplace_shopee_sb m
       SET "Custo" = v_total
     WHERE (
            m.anuncio_id = NEW."ID"
            OR m."ID" = NEW."ID"
            OR public.fn_normalize_codigo(m."ID Bling") = v_id_bling
       )
       AND m."Custo" IS DISTINCT FROM v_total;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_sb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_anuncios_pk_marketplaces"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- INSERT / UPDATE
  if tg_op in ('INSERT', 'UPDATE') then

    insert into public.marketplace_tray_pk (
      "anuncio_id",
      "ID",
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Atualizado em",
      "Sincronizado em"
    )
    values (
      new."ID",
      new."ID",
      new."Loja",
      new."ID Bling",
      new."ID Tray",
      new."ID Var",
      new."Referência",
      new."OD",
      new."Nome",
      new."Marca",
      new."Categoria",
      now(),
      now()
    )
    on conflict ("anuncio_id")
    do update set
      "ID"              = excluded."ID",
      "Loja"            = excluded."Loja",
      "ID Bling"        = excluded."ID Bling",
      "ID Tray"         = excluded."ID Tray",
      "ID Var"          = excluded."ID Var",
      "Referência"      = excluded."Referência",
      "OD"              = excluded."OD",
      "Nome"            = excluded."Nome",
      "Marca"           = excluded."Marca",
      "Categoria"       = excluded."Categoria",
      "Atualizado em"   = now(),
      "Sincronizado em" = now();

    insert into public.marketplace_shopee_pk (
      "anuncio_id",
      "ID",
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Atualizado em",
      "Sincronizado em"
    )
    values (
      new."ID",
      new."ID",
      new."Loja",
      new."ID Bling",
      new."ID Tray",
      new."ID Var",
      new."Referência",
      new."OD",
      new."Nome",
      new."Marca",
      new."Categoria",
      now(),
      now()
    )
    on conflict ("anuncio_id")
    do update set
      "ID"              = excluded."ID",
      "Loja"            = excluded."Loja",
      "ID Bling"        = excluded."ID Bling",
      "ID Tray"         = excluded."ID Tray",
      "ID Var"          = excluded."ID Var",
      "Referência"      = excluded."Referência",
      "OD"              = excluded."OD",
      "Nome"            = excluded."Nome",
      "Marca"           = excluded."Marca",
      "Categoria"       = excluded."Categoria",
      "Atualizado em"   = now(),
      "Sincronizado em" = now();

    return new;
  end if;

  -- DELETE
  if tg_op = 'DELETE' then
    delete from public.marketplace_tray_pk
    where "anuncio_id" = old."ID";

    delete from public.marketplace_shopee_pk
    where "anuncio_id" = old."ID";

    return old;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."fn_sync_anuncios_pk_marketplaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_anuncios_sb_marketplaces"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- INSERT / UPDATE
  if tg_op in ('INSERT', 'UPDATE') then

    insert into public.marketplace_tray_sb (
      "anuncio_id",
      "ID",
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Atualizado em",
      "Sincronizado em"
    )
    values (
      new."ID",
      new."ID",
      new."Loja",
      new."ID Bling",
      new."ID Tray",
      new."ID Var",
      new."Referência",
      new."OD",
      new."Nome",
      new."Marca",
      new."Categoria",
      now(),
      now()
    )
    on conflict ("anuncio_id")
    do update set
      "ID"              = excluded."ID",
      "Loja"            = excluded."Loja",
      "ID Bling"        = excluded."ID Bling",
      "ID Tray"         = excluded."ID Tray",
      "ID Var"          = excluded."ID Var",
      "Referência"      = excluded."Referência",
      "OD"              = excluded."OD",
      "Nome"            = excluded."Nome",
      "Marca"           = excluded."Marca",
      "Categoria"       = excluded."Categoria",
      "Atualizado em"   = now(),
      "Sincronizado em" = now();

    insert into public.marketplace_shopee_sb (
      "anuncio_id",
      "ID",
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Atualizado em",
      "Sincronizado em"
    )
    values (
      new."ID",
      new."ID",
      new."Loja",
      new."ID Bling",
      new."ID Tray",
      new."ID Var",
      new."Referência",
      new."OD",
      new."Nome",
      new."Marca",
      new."Categoria",
      now(),
      now()
    )
    on conflict ("anuncio_id")
    do update set
      "ID"              = excluded."ID",
      "Loja"            = excluded."Loja",
      "ID Bling"        = excluded."ID Bling",
      "ID Tray"         = excluded."ID Tray",
      "ID Var"          = excluded."ID Var",
      "Referência"      = excluded."Referência",
      "OD"              = excluded."OD",
      "Nome"            = excluded."Nome",
      "Marca"           = excluded."Marca",
      "Categoria"       = excluded."Categoria",
      "Atualizado em"   = now(),
      "Sincronizado em" = now();

    return new;
  end if;

  -- DELETE
  if tg_op = 'DELETE' then
    delete from public.marketplace_tray_sb
    where "anuncio_id" = old."ID";

    delete from public.marketplace_shopee_sb
    where "anuncio_id" = old."ID";

    return old;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."fn_sync_anuncios_sb_marketplaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_tray_to_shopee_no_conflict"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
declare
  target_table text := TG_ARGV[0]; -- ex: 'public.marketplace_shopee_pk'
  src_table text := format('%I.%I', tg_table_schema, tg_table_name);

  upd_set text;
  ins_cols text;
  sel_cols text;

  has_src_anuncio_id boolean;
  where_key text;

  sql_upd text;
  sql_ins text;
begin
  if target_table is null or target_table = '' then
    raise exception 'Trigger sem target_table (TG_ARGV[0]) em %', src_table;
  end if;

  -- origem tem anuncio_id?
  select exists (
    select 1
    from information_schema.columns
    where table_schema = tg_table_schema
      and table_name   = tg_table_name
      and lower(column_name) = 'anuncio_id'
  ) into has_src_anuncio_id;

  if has_src_anuncio_id then
    where_key := 't.anuncio_id = src.anuncio_id';
  else
    where_key := 't.anuncio_id = (src."ID")::bigint';
  end if;

  /*
    Sincronização Tray -> Shopee

    Mantém sincronização de campos em comum, inclusive Custo.

    Não sincroniza:
      - id
      - Desconto
      - Embalagem
      - Frete
      - Comissão
      - Imposto
      - Marketing
      - Margem de Lucro
      - Preço de Venda
      - Atualizado em

    Assim:
      Tray altera Custo -> Shopee recebe Custo
      Tray altera percentual/preço -> Shopee NÃO recebe
      Shopee pode ter percentuais/preço próprios
  */
  with
  src_cols as (
    select column_name as src_col, lower(column_name) as k
    from information_schema.columns
    where table_schema = tg_table_schema
      and table_name   = tg_table_name
  ),
  dst_cols as (
    select column_name as dst_col, lower(column_name) as k, is_identity
    from information_schema.columns
    where table_schema = split_part(target_table, '.', 1)
      and table_name   = split_part(target_table, '.', 2)
  ),
  m as (
    select s.src_col, d.dst_col, d.k
    from src_cols s
    join dst_cols d on d.k = s.k
    where coalesce(d.is_identity, 'NO') <> 'YES'
      and d.k <> 'id'
      and d.k not in (
        'desconto',
        'embalagem',
        'frete',
        'comissão',
        'comissao',
        'imposto',
        'marketing',
        'margem de lucro',
        'preço de venda',
        'preco de venda',
        'atualizado em'
      )
  )
  select
    string_agg(format('%I = src.%I', m.dst_col, m.src_col), ', ') as upd_set_,
    string_agg(format('%I', m.dst_col), ', ') as ins_cols_,
    string_agg(format('src.%I', m.src_col), ', ') as sel_cols_
  into upd_set, ins_cols, sel_cols
  from m;

  if upd_set is null then
    raise exception 'Nenhuma coluna válida para sincronizar entre % e %.', src_table, target_table;
  end if;

  -- UPDATE primeiro
  sql_upd := format(
    'update %s t
        set %s
       from (select ($1).*) as src
      where %s',
    target_table, upd_set, where_key
  );

  execute sql_upd using new;

  if found then
    return new;
  end if;

  -- INSERT se não existir
  sql_ins := format(
    'insert into %s (%s)
     select %s
     from (select ($1).*) as src',
    target_table, ins_cols, sel_cols
  );

  execute sql_ins using new;

  return new;
end;
$_$;


ALTER FUNCTION "public"."fn_sync_tray_to_shopee_no_conflict"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_text_to_numeric_safe"("p_text" "text") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
DECLARE
    v_text text;
BEGIN
    v_text := trim(coalesce(p_text, ''));

    IF v_text = '' THEN
        RETURN 0;
    END IF;

    v_text := replace(v_text, ',', '.');

    IF v_text !~ '^[-+]?[0-9]*\.?[0-9]+$' THEN
        RETURN 0;
    END IF;

    RETURN v_text::numeric;
END;
$_$;


ALTER FUNCTION "public"."fn_text_to_numeric_safe"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_to_bigint_safe"("p" "text") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v text;
BEGIN
  IF p IS NULL THEN
    RETURN NULL;
  END IF;

  v := regexp_replace(btrim(p), '[^0-9\-]+', '', 'g');
  IF v = '' THEN
    RETURN NULL;
  END IF;

  RETURN v::bigint;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_to_bigint_safe"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_brands"("lojas" "text"[]) RETURNS TABLE("marca" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select distinct trim(m."Marca") as marca
  from marketplace_tray_all m
  where m."Marca" is not null
    and (
      lojas is null
      or array_length(lojas, 1) is null
      or m."Loja" = any(lojas)
    )
  order by marca;
$$;


ALTER FUNCTION "public"."get_distinct_brands"("lojas" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_brands_tray"("lojas" "text"[]) RETURNS TABLE("marca" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select distinct trim(m."Marca") as marca
  from marketplace_tray_all m
  where m."Marca" is not null
    and (
      lojas is null
      or array_length(lojas, 1) is null
      or m."Loja" = any(lojas)
    )
  order by marca;
$$;


ALTER FUNCTION "public"."get_distinct_brands_tray"("lojas" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_variacoes_anuncio"("p_loja" "text", "p_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_loja text;
  v_resultado jsonb;
begin
  v_loja := upper(trim(coalesce(p_loja, '')));

  -- =====================================================
  -- PK
  -- =====================================================
  if v_loja in ('PK', 'PIKOT SHOP') then

    with pai as (
      select
        p.*,
        public.ref_base_anuncio(p."Referência") as ref_base_pai,
        public.ref_familia_anuncio(p."Referência") as familia_pai,
        public.grupo_parenteses_anuncio(p."Referência") as grupo_ref_pai,
        public.tipo_material_variacao(p."Referência", p."Nome") as material_pai,
        upper(trim(coalesce(p."ID Tray", ''))) as id_tray_pai,
        upper(trim(coalesce(p."ID Bling", ''))) as id_bling_pai
      from public.anuncios_pk p
      where p."ID" = p_id
      limit 1
    ),

    vars_base as (
      select
        v.*,
        public.ref_base_anuncio(v."Referência") as ref_base_var,
        public.ref_familia_anuncio(v."Referência") as familia_var,
        public.grupo_parenteses_anuncio(v."Referência") as grupo_ref_var,
        public.tipo_material_variacao(v."Referência", v."Nome") as material_var,
        upper(trim(coalesce(v."ID Tray", ''))) as id_tray_var,
        upper(trim(coalesce(v."ID Bling", ''))) as id_bling_var
      from public.anuncios_pk v
      where v."ID" <> p_id
        and upper(trim(coalesce(v."Referência", ''))) ~ '^VAR\s*-'
    ),

    conectadas as (
      select
        v.*,

        case
          when p.grupo_ref_pai <> v.grupo_ref_var
          then 0

          when public.chave_valida_anuncio(p.id_tray_pai)
            and public.chave_valida_anuncio(v.id_tray_var)
            and p.id_tray_pai = v.id_tray_var
          then 100

          when p.ref_base_pai is not null
            and v.ref_base_var is not null
            and p.ref_base_pai = v.ref_base_var
          then 95

          when p.familia_pai is not null
            and v.familia_var is not null
            and p.familia_pai = v.familia_var
            and p.material_pai = v.material_var
          then 90

          when public.chave_valida_anuncio(p.id_bling_pai)
            and public.chave_valida_anuncio(v.id_bling_var)
            and p.id_bling_pai = v.id_bling_var
          then 70

          else 0
        end as score_conexao,

        case
          when p.grupo_ref_pai <> v.grupo_ref_var
          then 'Bloqueado por grupo diferente'

          when public.chave_valida_anuncio(p.id_tray_pai)
            and public.chave_valida_anuncio(v.id_tray_var)
            and p.id_tray_pai = v.id_tray_var
          then 'ID Tray'

          when p.ref_base_pai is not null
            and v.ref_base_var is not null
            and p.ref_base_pai = v.ref_base_var
          then 'Referência exata'

          when p.familia_pai is not null
            and v.familia_var is not null
            and p.familia_pai = v.familia_var
            and p.material_pai = v.material_var
          then 'Família + Material'

          when public.chave_valida_anuncio(p.id_bling_pai)
            and public.chave_valida_anuncio(v.id_bling_var)
            and p.id_bling_pai = v.id_bling_var
          then 'ID Bling'

          else 'Sem conexão'
        end as criterio_conexao

      from pai p
      cross join vars_base v
    ),

    filtradas as (
      select *
      from conectadas
      where score_conexao >= 70
        and criterio_conexao <> 'Bloqueado por grupo diferente'
    )

    select coalesce(
      jsonb_agg(
        to_jsonb(filtradas)
          - 'ref_base_pai'
          - 'ref_base_var'
          - 'familia_pai'
          - 'familia_var'
          - 'grupo_ref_pai'
          - 'grupo_ref_var'
          - 'material_pai'
          - 'material_var'
          - 'id_tray_pai'
          - 'id_tray_var'
          - 'id_bling_pai'
          - 'id_bling_var'
        order by score_conexao desc, "ID"
      ),
      '[]'::jsonb
    )
    into v_resultado
    from filtradas;

    return coalesce(v_resultado, '[]'::jsonb);


  -- =====================================================
  -- SB
  -- =====================================================
  elsif v_loja in ('SB', 'SÓBAQUETAS', 'SOBAQUETAS') then

    with pai as (
      select
        p.*,
        public.ref_base_anuncio(p."Referência") as ref_base_pai,
        public.ref_familia_anuncio(p."Referência") as familia_pai,
        public.grupo_parenteses_anuncio(p."Referência") as grupo_ref_pai,
        public.tipo_material_variacao(p."Referência", p."Nome") as material_pai,
        upper(trim(coalesce(p."ID Tray", ''))) as id_tray_pai,
        upper(trim(coalesce(p."ID Bling", ''))) as id_bling_pai
      from public.anuncios_sb p
      where p."ID" = p_id
      limit 1
    ),

    vars_base as (
      select
        v.*,
        public.ref_base_anuncio(v."Referência") as ref_base_var,
        public.ref_familia_anuncio(v."Referência") as familia_var,
        public.grupo_parenteses_anuncio(v."Referência") as grupo_ref_var,
        public.tipo_material_variacao(v."Referência", v."Nome") as material_var,
        upper(trim(coalesce(v."ID Tray", ''))) as id_tray_var,
        upper(trim(coalesce(v."ID Bling", ''))) as id_bling_var
      from public.anuncios_sb v
      where v."ID" <> p_id
        and upper(trim(coalesce(v."Referência", ''))) ~ '^VAR\s*-'
    ),

    conectadas as (
      select
        v.*,

        case
          when p.grupo_ref_pai <> v.grupo_ref_var
          then 0

          when public.chave_valida_anuncio(p.id_tray_pai)
            and public.chave_valida_anuncio(v.id_tray_var)
            and p.id_tray_pai = v.id_tray_var
          then 100

          when p.ref_base_pai is not null
            and v.ref_base_var is not null
            and p.ref_base_pai = v.ref_base_var
          then 95

          when p.familia_pai is not null
            and v.familia_var is not null
            and p.familia_pai = v.familia_var
            and p.material_pai = v.material_var
          then 90

          when public.chave_valida_anuncio(p.id_bling_pai)
            and public.chave_valida_anuncio(v.id_bling_var)
            and p.id_bling_pai = v.id_bling_var
          then 70

          else 0
        end as score_conexao,

        case
          when p.grupo_ref_pai <> v.grupo_ref_var
          then 'Bloqueado por grupo diferente'

          when public.chave_valida_anuncio(p.id_tray_pai)
            and public.chave_valida_anuncio(v.id_tray_var)
            and p.id_tray_pai = v.id_tray_var
          then 'ID Tray'

          when p.ref_base_pai is not null
            and v.ref_base_var is not null
            and p.ref_base_pai = v.ref_base_var
          then 'Referência exata'

          when p.familia_pai is not null
            and v.familia_var is not null
            and p.familia_pai = v.familia_var
            and p.material_pai = v.material_var
          then 'Família + Material'

          when public.chave_valida_anuncio(p.id_bling_pai)
            and public.chave_valida_anuncio(v.id_bling_var)
            and p.id_bling_pai = v.id_bling_var
          then 'ID Bling'

          else 'Sem conexão'
        end as criterio_conexao

      from pai p
      cross join vars_base v
    ),

    filtradas as (
      select *
      from conectadas
      where score_conexao >= 70
        and criterio_conexao <> 'Bloqueado por grupo diferente'
    )

    select coalesce(
      jsonb_agg(
        to_jsonb(filtradas)
          - 'ref_base_pai'
          - 'ref_base_var'
          - 'familia_pai'
          - 'familia_var'
          - 'grupo_ref_pai'
          - 'grupo_ref_var'
          - 'material_pai'
          - 'material_var'
          - 'id_tray_pai'
          - 'id_tray_var'
          - 'id_bling_pai'
          - 'id_bling_var'
        order by score_conexao desc, "ID"
      ),
      '[]'::jsonb
    )
    into v_resultado
    from filtradas;

    return coalesce(v_resultado, '[]'::jsonb);

  else
    return '[]'::jsonb;
  end if;
end;
$$;


ALTER FUNCTION "public"."get_variacoes_anuncio"("p_loja" "text", "p_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grupo_parenteses_anuncio"("p_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select coalesce(
    substring(upper(coalesce(p_text, '')) from '\(([0-9A-Z]+)\)\s*$'),
    ''
  );
$_$;


ALTER FUNCTION "public"."grupo_parenteses_anuncio"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  full_name text;
  avatar text;
begin
  full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(new.email, '@', 1)
  );

  avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', ''),
    ''
  );

  -- ⚙️ Correção: não sobrescreve o nome se já houver valor em profiles.name
  update public.profiles
  set
    name = case 
             when profiles.name is null or profiles.name = '' 
               then coalesce(nullif(full_name, ''), profiles.name)
             else profiles.name
           end,
    email = coalesce(nullif(new.email, ''), profiles.email),
    avatar_url = coalesce(nullif(avatar, ''), profiles.avatar_url),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_all_to_pk_sb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Anti-loop
    IF current_setting('myapp.market_sync', true) = 'on' THEN
        RETURN NEW;
    END IF;

    BEGIN
        PERFORM set_config('myapp.market_sync', 'on', true);
    EXCEPTION
        WHEN others THEN NULL;
    END;

    IF NEW."Loja" = 'PK' THEN
        INSERT INTO marketplace_tray_pk (
            "ID",
            Desconto,
            Embalagem,
            Frete,
            Comissão,
            Imposto,
            Marketing,
            "Margem de Lucro",
            Custo,
            "Preço de Venda"
        )
        SELECT
            NEW."ID",
            NEW.Desconto,
            NEW.Embalagem,
            NEW.Frete,
            NEW.Comissão,
            NEW.Imposto,
            NEW.Marketing,
            NEW."Margem de Lucro",
            NEW.Custo,
            NEW."Preço de Venda"
        WHERE NOT EXISTS (
            SELECT 1
            FROM marketplace_tray_pk
            WHERE "ID" = NEW."ID"
        );

    ELSIF NEW."Loja" = 'SB' THEN
        INSERT INTO marketplace_tray_sb (
            "ID",
            Desconto,
            Embalagem,
            Frete,
            Comissão,
            Imposto,
            Marketing,
            "Margem de Lucro",
            Custo,
            "Preço de Venda"
        )
        SELECT
            NEW."ID",
            NEW.Desconto,
            NEW.Embalagem,
            NEW.Frete,
            NEW.Comissão,
            NEW.Imposto,
            NEW.Marketing,
            NEW."Margem de Lucro",
            NEW.Custo,
            NEW."Preço de Venda"
        WHERE NOT EXISTS (
            SELECT 1
            FROM marketplace_tray_sb
            WHERE "ID" = NEW."ID"
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."insert_all_to_pk_sb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_pk_to_all"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Anti-loop
    IF current_setting('myapp.market_sync', true) = 'on' THEN
        RETURN NEW;
    END IF;

    BEGIN
        PERFORM set_config('myapp.market_sync', 'on', true);
    EXCEPTION
        WHEN others THEN NULL;
    END;

    -- Insere em ALL somente se ainda não existir
    INSERT INTO marketplace_tray_all (
        "ID",
        "Loja",
        Desconto,
        Embalagem,
        Frete,
        Comissão,
        Imposto,
        Marketing,
        "Margem de Lucro",
        Custo,
        "Preço de Venda"
    )
    SELECT
        NEW."ID",
        'PK',
        NEW.Desconto,
        NEW.Embalagem,
        NEW.Frete,
        NEW.Comissão,
        NEW.Imposto,
        NEW.Marketing,
        NEW."Margem de Lucro",
        NEW.Custo,
        NEW."Preço de Venda"
    WHERE NOT EXISTS (
        SELECT 1
        FROM marketplace_tray_all
        WHERE "ID" = NEW."ID"
          AND "Loja" = 'PK'
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."insert_pk_to_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_sb_to_all"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Anti-loop
    IF current_setting('myapp.market_sync', true) = 'on' THEN
        RETURN NEW;
    END IF;

    BEGIN
        PERFORM set_config('myapp.market_sync', 'on', true);
    EXCEPTION
        WHEN others THEN NULL;
    END;

    INSERT INTO marketplace_tray_all (
        "ID",
        "Loja",
        Desconto,
        Embalagem,
        Frete,
        Comissão,
        Imposto,
        Marketing,
        "Margem de Lucro",
        Custo,
        "Preço de Venda"
    )
    SELECT
        NEW."ID",
        'SB',
        NEW.Desconto,
        NEW.Embalagem,
        NEW.Frete,
        NEW.Comissão,
        NEW.Imposto,
        NEW.Marketing,
        NEW."Margem de Lucro",
        NEW.Custo,
        NEW."Preço de Venda"
    WHERE NOT EXISTS (
        SELECT 1
        FROM marketplace_tray_all
        WHERE "ID" = NEW."ID"
          AND "Loja" = 'SB'
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."insert_sb_to_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_ref_variacao_novo_padrao"("p_ref" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  SELECT COALESCE(public.normalizar_ref_variacao(p_ref), '') ~ '^(PAI|VAR)-[^-]+-.+$';
$_$;


ALTER FUNCTION "public"."is_ref_variacao_novo_padrao"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jsonb_num_first"("p_json" "jsonb", "p_keys" "text"[]) RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select public.safe_to_numeric(public.jsonb_text_first(p_json, p_keys));
$$;


ALTER FUNCTION "public"."jsonb_num_first"("p_json" "jsonb", "p_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jsonb_text_first"("p_json" "jsonb", "p_keys" "text"[]) RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(trim(p_json ->> k), '')
  from unnest(p_keys) as k
  where p_json ? k
    and nullif(trim(p_json ->> k), '') is not null
  limit 1;
$$;


ALTER FUNCTION "public"."jsonb_text_first"("p_json" "jsonb", "p_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."magalu_calc_custo_composicao"("p_codigo_1" "text" DEFAULT NULL::"text", "p_qtd_1" "text" DEFAULT NULL::"text", "p_codigo_2" "text" DEFAULT NULL::"text", "p_qtd_2" "text" DEFAULT NULL::"text", "p_codigo_3" "text" DEFAULT NULL::"text", "p_qtd_3" "text" DEFAULT NULL::"text", "p_codigo_4" "text" DEFAULT NULL::"text", "p_qtd_4" "text" DEFAULT NULL::"text", "p_codigo_5" "text" DEFAULT NULL::"text", "p_qtd_5" "text" DEFAULT NULL::"text", "p_codigo_6" "text" DEFAULT NULL::"text", "p_qtd_6" "text" DEFAULT NULL::"text", "p_codigo_7" "text" DEFAULT NULL::"text", "p_qtd_7" "text" DEFAULT NULL::"text", "p_codigo_8" "text" DEFAULT NULL::"text", "p_qtd_8" "text" DEFAULT NULL::"text", "p_codigo_9" "text" DEFAULT NULL::"text", "p_qtd_9" "text" DEFAULT NULL::"text", "p_codigo_10" "text" DEFAULT NULL::"text", "p_qtd_10" "text" DEFAULT NULL::"text") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  SELECT round(COALESCE(
    public.magalu_calc_custo_item(p_codigo_1, p_qtd_1) +
    public.magalu_calc_custo_item(p_codigo_2, p_qtd_2) +
    public.magalu_calc_custo_item(p_codigo_3, p_qtd_3) +
    public.magalu_calc_custo_item(p_codigo_4, p_qtd_4) +
    public.magalu_calc_custo_item(p_codigo_5, p_qtd_5) +
    public.magalu_calc_custo_item(p_codigo_6, p_qtd_6) +
    public.magalu_calc_custo_item(p_codigo_7, p_qtd_7) +
    public.magalu_calc_custo_item(p_codigo_8, p_qtd_8) +
    public.magalu_calc_custo_item(p_codigo_9, p_qtd_9) +
    public.magalu_calc_custo_item(p_codigo_10, p_qtd_10),
    0
  ), 2);
$$;


ALTER FUNCTION "public"."magalu_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."magalu_calc_custo_item"("p_codigo" "text", "p_quantidade" "text") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_custo numeric := 0;
  v_qtd numeric := 1;
BEGIN
  IF NULLIF(trim(COALESCE(p_codigo, '')), '') IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(c."Custo Atual", 0)
  INTO v_custo
  FROM public.custos c
  WHERE trim(c."Código") = trim(p_codigo)
  LIMIT 1;

  v_qtd := public.safe_to_numeric(p_quantidade);

  IF v_qtd <= 0 THEN
    v_qtd := 1;
  END IF;

  RETURN COALESCE(v_custo, 0) * v_qtd;
END;
$$;


ALTER FUNCTION "public"."magalu_calc_custo_item"("p_codigo" "text", "p_quantidade" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."magalu_to_bigint_safe"("value" "text") RETURNS bigint
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v text;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  v := regexp_replace(trim(value), '[^0-9\-]', '', 'g');

  IF v IS NULL OR v = '' OR v = '-' THEN
    RETURN NULL;
  END IF;

  RETURN v::bigint;

EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."magalu_to_bigint_safe"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."magalu_to_numeric"("value" "text") RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT public.safe_to_numeric(value);
$$;


ALTER FUNCTION "public"."magalu_to_numeric"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalizar_loja_magalu"("value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v text;
BEGIN
  IF value IS NULL OR trim(value) = '' THEN
    RETURN NULL;
  END IF;

  v := lower(trim(value));

  IF v IN ('pk', 'pikot', 'pikot shop', 'pikotshop') THEN
    RETURN 'Pikot Shop';
  END IF;

  IF v IN ('sb', 'sobaquetas', 'so baquetas', 'sóbaquetas', 'só baquetas') THEN
    RETURN 'Sóbaquetas';
  END IF;

  RETURN trim(value);
END;
$$;


ALTER FUNCTION "public"."normalizar_loja_magalu"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalizar_loja_marketplace"("p_loja" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN upper(regexp_replace(coalesce(p_loja, ''), '\s+', '', 'g')) IN (
      'PK',
      'PIKOT',
      'PIKOTSHOP'
    ) THEN 'PK'

    WHEN upper(regexp_replace(coalesce(p_loja, ''), '\s+', '', 'g')) IN (
      'SB',
      'SOBAQUETAS',
      'SOBAQUETA',
      'SÓBAQUETAS'
    ) THEN 'SB'

    ELSE upper(trim(coalesce(p_loja, '')))
  END;
$$;


ALTER FUNCTION "public"."normalizar_loja_marketplace"("p_loja" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalizar_loja_variacao"("p_loja" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when upper(trim(coalesce(p_loja, ''))) in ('PK', 'PIKOT SHOP') then 'PK'
    when upper(trim(coalesce(p_loja, ''))) in ('SB', 'SÓBAQUETAS', 'SOBAQUETAS') then 'SB'
    else upper(trim(coalesce(p_loja, '')))
  end;
$$;


ALTER FUNCTION "public"."normalizar_loja_variacao"("p_loja" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalizar_ref_marketplace"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT upper(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(p_ref, ''), '[–—−]', '-', 'g'),
          '\s+',
          '',
          'g'
        ),
        '_+',
        '_',
        'g'
      )
    )
  );
$$;


ALTER FUNCTION "public"."normalizar_ref_marketplace"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalizar_ref_variacao"("value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v text;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  v := upper(trim(value));
  v := regexp_replace(v, '\s+', '', 'g');
  v := replace(v, 'PAI–', 'PAI-');
  v := replace(v, 'VAR–', 'VAR-');
  v := replace(v, 'PAI—', 'PAI-');
  v := replace(v, 'VAR—', 'VAR-');

  RETURN v;
END;
$$;


ALTER FUNCTION "public"."normalizar_ref_variacao"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalizar_texto_anuncio"("p_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(
    upper(
      trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                coalesce(p_text, ''),
                '[–—−]',
                '-',
                'g'
              ),
              '^(PAI|VAR)\s*-\s*',
              '',
              'i'
            ),
            '[^A-Z0-9]+',
            ' ',
            'g'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ),
    ''
  );
$$;


ALTER FUNCTION "public"."normalizar_texto_anuncio"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_loja_norm"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when value is null or trim(value) = '' then null

    when upper(
      regexp_replace(
        translate(
          trim(value),
          'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
          'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
        ),
        '\s+',
        '',
        'g'
      )
    ) in ('PK', 'PIKOT', 'PIKOTSHOP') then 'PK'

    when upper(
      regexp_replace(
        translate(
          trim(value),
          'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
          'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
        ),
        '\s+',
        '',
        'g'
      )
    ) in ('SB', 'SOBA', 'SOBAQUETAS', 'SOBAQUETA') then 'SB'

    when upper(value) like '%PIKOT%' then 'PK'
    when upper(value) like '%SOBA%' then 'SB'

    else upper(trim(value))
  end;
$$;


ALTER FUNCTION "public"."pikot_loja_norm"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_ref_chave"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select regexp_replace(
    public.pikot_ref_norm(value),
    '^(PAI|VAR)-',
    '',
    'i'
  );
$$;


ALTER FUNCTION "public"."pikot_ref_chave"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_ref_codigos_array"("value" "text") RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when public.pikot_ref_codigos_text(value) is null then array[]::text[]
    else string_to_array(public.pikot_ref_codigos_text(value), '_')
  end;
$$;


ALTER FUNCTION "public"."pikot_ref_codigos_array"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_ref_codigos_text"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(
    regexp_replace(
      public.pikot_ref_chave(value),
      '^[^-]+-',
      ''
    ),
    ''
  );
$$;


ALTER FUNCTION "public"."pikot_ref_codigos_text"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_ref_marca"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(split_part(public.pikot_ref_chave(value), '-', 1), '');
$$;


ALTER FUNCTION "public"."pikot_ref_marca"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_ref_norm"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(
    upper(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            trim(coalesce(value, '')),
            '[–—−]',
            '-',
            'g'
          ),
          '\s*-\s*',
          '-',
          'g'
        ),
        '\s+',
        '',
        'g'
      )
    ),
    ''
  );
$$;


ALTER FUNCTION "public"."pikot_ref_norm"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_ref_tipo"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when public.pikot_ref_norm(value) like 'PAI-%' then 'PAI'
    when public.pikot_ref_norm(value) like 'VAR-%' then 'VAR'
    else null
  end;
$$;


ALTER FUNCTION "public"."pikot_ref_tipo"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pikot_ref_var_pertence_ao_pai"("referencia_pai" "text", "referencia_var" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select
    public.pikot_ref_tipo(referencia_pai) = 'PAI'
    and public.pikot_ref_tipo(referencia_var) = 'VAR'
    and public.pikot_ref_marca(referencia_pai) = public.pikot_ref_marca(referencia_var)
    and (
      -- Caso principal:
      -- PAI-MARCA-CODIGO_VARIACAO
      -- VAR-MARCA-CODIGO_VARIACAO
      public.pikot_ref_chave(referencia_pai) = public.pikot_ref_chave(referencia_var)

      -- Caso secundário:
      -- PAI-MARCA-COD1_COD2
      -- VAR-MARCA-COD1
      -- VAR-MARCA-COD2
      or public.pikot_ref_codigos_text(referencia_var)
        = any(public.pikot_ref_codigos_array(referencia_pai))

      -- Caso flexível:
      -- quando o código da variação está dentro da lista do pai
      or (
        public.pikot_ref_codigos_text(referencia_pai) like public.pikot_ref_codigos_text(referencia_var) || '\_%' escape '\'
        or public.pikot_ref_codigos_text(referencia_pai) like '%\_' || public.pikot_ref_codigos_text(referencia_var) escape '\'
        or public.pikot_ref_codigos_text(referencia_pai) like '%\_' || public.pikot_ref_codigos_text(referencia_var) || '\_%' escape '\'
      )
    );
$$;


ALTER FUNCTION "public"."pikot_ref_var_pertence_ao_pai"("referencia_pai" "text", "referencia_var" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prefixo_variacao_referencia"("p_referencia" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(
    upper(
      trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              coalesce(p_referencia, ''),
              '[–—−]',
              '-',
              'g'
            ),
            '^(PAI|VAR)\s*-\s*',
            '',
            'i'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ),
    ''
  );
$$;


ALTER FUNCTION "public"."prefixo_variacao_referencia"("p_referencia" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."processar_variacoes_auto"("p_lote" integer DEFAULT 20, "p_max_lotes" integer DEFAULT 50, "p_max_segundos" integer DEFAULT 18) RETURNS TABLE("loja" "text", "lotes_executados" integer, "pais_processados" integer, "variacoes_vinculadas" integer, "pendentes" integer)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_inicio timestamptz := clock_timestamp();
  v_loja text;
  v_result record;
  v_lotes int := 0;
  v_pk_processados int := 0;
  v_pk_vinculados int := 0;
  v_pk_pendentes int := null;
  v_sb_processados int := 0;
  v_sb_vinculados int := 0;
  v_sb_pendentes int := null;
begin
  while v_lotes < p_max_lotes
    and clock_timestamp() < v_inicio + make_interval(secs => p_max_segundos)
  loop

    foreach v_loja in array array['PK', 'SB']
    loop
      exit when v_lotes >= p_max_lotes;
      exit when clock_timestamp() >= v_inicio + make_interval(secs => p_max_segundos);

      select *
      into v_result
      from public.refresh_variacoes_lote(v_loja, p_lote);

      v_lotes := v_lotes + 1;

      if v_loja = 'PK' then
        v_pk_processados := v_pk_processados + coalesce(v_result.processados, 0);
        v_pk_vinculados := v_pk_vinculados + coalesce(v_result.vinculados, 0);
        v_pk_pendentes := coalesce(v_result.pendentes, v_pk_pendentes);
      else
        v_sb_processados := v_sb_processados + coalesce(v_result.processados, 0);
        v_sb_vinculados := v_sb_vinculados + coalesce(v_result.vinculados, 0);
        v_sb_pendentes := coalesce(v_result.pendentes, v_sb_pendentes);
      end if;

      if coalesce(v_result.processados, 0) = 0
         and coalesce(v_result.pendentes, 0) = 0
      then
        continue;
      end if;
    end loop;
  end loop;

  loja := 'PK';
  lotes_executados := v_lotes;
  pais_processados := v_pk_processados;
  variacoes_vinculadas := v_pk_vinculados;
  pendentes := coalesce(v_pk_pendentes, 0);
  return next;

  loja := 'SB';
  lotes_executados := v_lotes;
  pais_processados := v_sb_processados;
  variacoes_vinculadas := v_sb_vinculados;
  pendentes := coalesce(v_sb_pendentes, 0);
  return next;
end;
$$;


ALTER FUNCTION "public"."processar_variacoes_auto"("p_lote" integer, "p_max_lotes" integer, "p_max_segundos" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quantidade_norm_anuncio"("p_qtd" "text") RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(
    replace(
      regexp_replace(coalesce(p_qtd, ''), '[^0-9,.-]', '', 'g'),
      ',',
      '.'
    ),
    ''
  )::numeric;
$$;


ALTER FUNCTION "public"."quantidade_norm_anuncio"("p_qtd" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_preco_venda_precificacao_tray"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE "precificacao_tray"
  SET "Preço de Venda" = ROUND(
    (
      COALESCE(NULLIF(REPLACE("Custo", ',', '.')::NUMERIC, 0), 0) +
      COALESCE(NULLIF(REPLACE("Frete", ',', '.')::NUMERIC, 0), 0) +
      COALESCE(NULLIF(REPLACE("Embalagem", ',', '.')::NUMERIC, 0), 0)
    ) / NULLIF(
      1 - (
        (
          COALESCE(NULLIF(REPLACE("Imposto", ',', '.')::NUMERIC, 0), 0) +
          COALESCE(NULLIF(REPLACE("Comissão", ',', '.')::NUMERIC, 0), 0) +
          COALESCE(NULLIF(REPLACE("Margem de Lucro", ',', '.')::NUMERIC, 0), 0) +
          COALESCE(NULLIF(REPLACE("Marketing", ',', '.')::NUMERIC, 0), 0)
        ) / 100
      ),
      0
    ), 2
  )::TEXT,
  "Atualizado em" = NOW()
  WHERE "Referência" = NEW."Referência" AND "Loja" = NEW."Loja";
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recalc_preco_venda_precificacao_tray"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_base_anuncio"("p_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select public.normalizar_texto_anuncio(
    public.ref_sem_grupo_parenteses(p_text)
  );
$$;


ALTER FUNCTION "public"."ref_base_anuncio"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_familia_anuncio"("p_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  with partes_base as (
    select string_to_array(public.ref_base_anuncio(p_text), ' ') as partes
  ),

  tratada as (
    select
      partes,
      case
        when array_length(partes, 1) >= 2 and partes[2] = 'TEN' then 'TN'
        when array_length(partes, 1) >= 2 then partes[2]
        else null
      end as segunda_parte
    from partes_base
  )

  select nullif(
    case
      when array_length(partes, 1) >= 2
        and partes[1] ~ '^[0-9]+$'
        and segunda_parte is not null
      then partes[1] || ' ' || segunda_parte

      when array_length(partes, 1) = 1
      then partes[1]

      else public.ref_base_anuncio(p_text)
    end,
    ''
  )
  from tratada;
$_$;


ALTER FUNCTION "public"."ref_familia_anuncio"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_sem_grupo_parenteses"("p_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select regexp_replace(
    coalesce(p_text, ''),
    '\s*\([0-9A-Z]+\)\s*$',
    '',
    'i'
  );
$_$;


ALTER FUNCTION "public"."ref_sem_grupo_parenteses"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_sem_tipo"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT regexp_replace(
    public.normalizar_ref_marketplace(p_ref),
    '^(PAI|VAR)-',
    '',
    'i'
  );
$$;


ALTER FUNCTION "public"."ref_sem_tipo"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_tipo"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN public.normalizar_ref_variacao(p_ref) LIKE 'PAI-%' THEN 'PAI'
    WHEN public.normalizar_ref_variacao(p_ref) LIKE 'VAR-%' THEN 'VAR'
    ELSE NULL
  END;
$$;


ALTER FUNCTION "public"."ref_tipo"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_var_pertence_ao_pai"("p_ref_pai" "text", "p_ref_var" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  pai text;
  var text;

  pai_marca text;
  var_marca text;

  pai_corpo text;
  var_corpo text;

  pai_partes text[];
  var_partes text[];

  pai_primeiro text;
  pai_ultimo text;
BEGIN
  pai := public.ref_sem_tipo(p_ref_pai);
  var := public.ref_sem_tipo(p_ref_var);

  IF pai = '' OR var = '' THEN
    RETURN false;
  END IF;

  pai_marca := split_part(pai, '-', 1);
  var_marca := split_part(var, '-', 1);

  IF pai_marca = '' OR var_marca = '' OR pai_marca <> var_marca THEN
    RETURN false;
  END IF;

  pai_corpo := regexp_replace(pai, '^' || pai_marca || '-', '');
  var_corpo := regexp_replace(var, '^' || var_marca || '-', '');

  -- Mesmo corpo:
  -- PAI-LIV-TN-5AM -> VAR-LIV-TN-5AM
  IF pai_corpo = var_corpo THEN
    RETURN true;
  END IF;

  -- Pai com múltiplos códigos:
  -- PAI-VDR-6001800020_6001800010 -> VAR-VDR-6001800010
  IF position('_' IN pai_corpo) > 0 THEN
    IF var_corpo = ANY(string_to_array(pai_corpo, '_')) THEN
      RETURN true;
    END IF;
  END IF;

  -- Variação começa com corpo do pai:
  -- PAI-FIS-3456 -> VAR-FIS-3456-2345
  IF var_corpo LIKE pai_corpo || '-%' THEN
    RETURN true;
  END IF;

  pai_partes := string_to_array(pai_corpo, '-');
  var_partes := string_to_array(var_corpo, '-');

  pai_primeiro := pai_partes[1];
  pai_ultimo := pai_partes[array_length(pai_partes, 1)];

  -- Mantém começo e final:
  -- PAI-FIS-4567-INOX -> VAR-FIS-4567-3456-INOX
  IF array_length(pai_partes, 1) >= 2
     AND array_length(var_partes, 1) >= 3
     AND var_partes[1] = pai_primeiro
     AND var_partes[array_length(var_partes, 1)] = pai_ultimo THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;


ALTER FUNCTION "public"."ref_var_pertence_ao_pai"("p_ref_pai" "text", "p_ref_var" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_variacao_codigo_principal"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when public.ref_variacao_tokens(p_ref) is not null
     and array_length(public.ref_variacao_tokens(p_ref), 1) >= 2
      then (public.ref_variacao_tokens(p_ref))[2]
    else null
  end;
$$;


ALTER FUNCTION "public"."ref_variacao_codigo_principal"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_variacao_key"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when public.ref_variacao_tipo(p_ref) is not null
      then regexp_replace(
        upper(trim(coalesce(p_ref, ''))),
        '^(PAI|VAR)-',
        '',
        'i'
      )
    else null
  end;
$$;


ALTER FUNCTION "public"."ref_variacao_key"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_variacao_marca"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when public.ref_variacao_tokens(p_ref) is not null
      then (public.ref_variacao_tokens(p_ref))[1]
    else null
  end;
$$;


ALTER FUNCTION "public"."ref_variacao_marca"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_variacao_tipo"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select case
    when upper(trim(coalesce(p_ref, ''))) ~ '^(PAI|VAR)-[A-Z0-9]{2,5}-[A-Z0-9]+([-_][A-Z0-9]+)*$'
      then split_part(upper(trim(coalesce(p_ref, ''))), '-', 1)
    else null
  end;
$_$;


ALTER FUNCTION "public"."ref_variacao_tipo"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ref_variacao_tokens"("p_ref" "text") RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when public.ref_variacao_key(p_ref) is not null
      then regexp_split_to_array(public.ref_variacao_key(p_ref), '[-_]+')
    else null
  end;
$$;


ALTER FUNCTION "public"."ref_variacao_tokens"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_anuncios_variacoes_contagem_leve"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  truncate table public.anuncios_variacoes_keys;
  truncate table public.anuncios_variacoes_contagem;

  -- =====================================================
  -- PK - PAIS
  -- =====================================================

  insert into public.anuncios_variacoes_keys (
    loja,
    tipo,
    id,
    key_type,
    key_value,
    grupo
  )
  select
    'PK' as loja,
    'PAI' as tipo,
    p."ID"::bigint as id,
    k.key_type,
    k.key_value,
    coalesce(public.grupo_parenteses_anuncio(p."Referência"), '') as grupo
  from public.anuncios_pk p
  cross join lateral (
    values
      (
        'REF_BASE',
        public.ref_base_anuncio(p."Referência")
      ),
      (
        'FAM_MAT',
        public.ref_familia_anuncio(p."Referência")
          || '|'
          || public.tipo_material_variacao(p."Referência", p."Nome")
      ),
      (
        'ID_TRAY',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(p."ID Tray", ''))))
          then upper(trim(coalesce(p."ID Tray", '')))
          else null
        end
      ),
      (
        'ID_BLING',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(p."ID Bling", ''))))
          then upper(trim(coalesce(p."ID Bling", '')))
          else null
        end
      )
  ) as k(key_type, key_value)
  where upper(trim(coalesce(p."Referência", ''))) ~ '^PAI\s*-'
    and k.key_value is not null
    and trim(k.key_value) <> '';

  -- =====================================================
  -- PK - VARIAÇÕES
  -- =====================================================

  insert into public.anuncios_variacoes_keys (
    loja,
    tipo,
    id,
    key_type,
    key_value,
    grupo
  )
  select
    'PK' as loja,
    'VAR' as tipo,
    v."ID"::bigint as id,
    k.key_type,
    k.key_value,
    coalesce(public.grupo_parenteses_anuncio(v."Referência"), '') as grupo
  from public.anuncios_pk v
  cross join lateral (
    values
      (
        'REF_BASE',
        public.ref_base_anuncio(v."Referência")
      ),
      (
        'FAM_MAT',
        public.ref_familia_anuncio(v."Referência")
          || '|'
          || public.tipo_material_variacao(v."Referência", v."Nome")
      ),
      (
        'ID_TRAY',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(v."ID Tray", ''))))
          then upper(trim(coalesce(v."ID Tray", '')))
          else null
        end
      ),
      (
        'ID_BLING',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(v."ID Bling", ''))))
          then upper(trim(coalesce(v."ID Bling", '')))
          else null
        end
      )
  ) as k(key_type, key_value)
  where upper(trim(coalesce(v."Referência", ''))) ~ '^VAR\s*-'
    and k.key_value is not null
    and trim(k.key_value) <> '';

  -- =====================================================
  -- SB - PAIS
  -- =====================================================

  insert into public.anuncios_variacoes_keys (
    loja,
    tipo,
    id,
    key_type,
    key_value,
    grupo
  )
  select
    'SB' as loja,
    'PAI' as tipo,
    p."ID"::bigint as id,
    k.key_type,
    k.key_value,
    coalesce(public.grupo_parenteses_anuncio(p."Referência"), '') as grupo
  from public.anuncios_sb p
  cross join lateral (
    values
      (
        'REF_BASE',
        public.ref_base_anuncio(p."Referência")
      ),
      (
        'FAM_MAT',
        public.ref_familia_anuncio(p."Referência")
          || '|'
          || public.tipo_material_variacao(p."Referência", p."Nome")
      ),
      (
        'ID_TRAY',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(p."ID Tray", ''))))
          then upper(trim(coalesce(p."ID Tray", '')))
          else null
        end
      ),
      (
        'ID_BLING',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(p."ID Bling", ''))))
          then upper(trim(coalesce(p."ID Bling", '')))
          else null
        end
      )
  ) as k(key_type, key_value)
  where upper(trim(coalesce(p."Referência", ''))) ~ '^PAI\s*-'
    and k.key_value is not null
    and trim(k.key_value) <> '';

  -- =====================================================
  -- SB - VARIAÇÕES
  -- =====================================================

  insert into public.anuncios_variacoes_keys (
    loja,
    tipo,
    id,
    key_type,
    key_value,
    grupo
  )
  select
    'SB' as loja,
    'VAR' as tipo,
    v."ID"::bigint as id,
    k.key_type,
    k.key_value,
    coalesce(public.grupo_parenteses_anuncio(v."Referência"), '') as grupo
  from public.anuncios_sb v
  cross join lateral (
    values
      (
        'REF_BASE',
        public.ref_base_anuncio(v."Referência")
      ),
      (
        'FAM_MAT',
        public.ref_familia_anuncio(v."Referência")
          || '|'
          || public.tipo_material_variacao(v."Referência", v."Nome")
      ),
      (
        'ID_TRAY',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(v."ID Tray", ''))))
          then upper(trim(coalesce(v."ID Tray", '')))
          else null
        end
      ),
      (
        'ID_BLING',
        case
          when public.chave_valida_anuncio(upper(trim(coalesce(v."ID Bling", ''))))
          then upper(trim(coalesce(v."ID Bling", '')))
          else null
        end
      )
  ) as k(key_type, key_value)
  where upper(trim(coalesce(v."Referência", ''))) ~ '^VAR\s*-'
    and k.key_value is not null
    and trim(k.key_value) <> '';

  -- =====================================================
  -- CONTAGEM FINAL
  -- =====================================================

  insert into public.anuncios_variacoes_contagem (
    loja,
    id,
    total_variacoes,
    atualizado_em
  )
  select
    p.loja,
    p.id,
    count(distinct v.id)::int as total_variacoes,
    now() as atualizado_em
  from public.anuncios_variacoes_keys p
  join public.anuncios_variacoes_keys v
    on v.loja = p.loja
   and v.tipo = 'VAR'
   and v.key_type = p.key_type
   and v.key_value = p.key_value
   and v.grupo = p.grupo
   and v.id <> p.id
  where p.tipo = 'PAI'
  group by p.loja, p.id;
end;
$$;


ALTER FUNCTION "public"."refresh_anuncios_variacoes_contagem_leve"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  TRUNCATE TABLE public.marketplace_magalu_variacoes_ref_count;

  INSERT INTO public.marketplace_magalu_variacoes_ref_count (
    loja,
    referencia_key,
    total_variacoes,
    atualizado_em
  )
  SELECT
    m."Loja",
    m.referencia_key,
    COUNT(*)::integer,
    now()
  FROM public.marketplace_magalu_all m
  WHERE m.tipo_referencia = 'VAR'
    AND m.referencia_key IS NOT NULL
    AND m.referencia_key <> ''
  GROUP BY m."Loja", m.referencia_key;
END;
$$;


ALTER FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_loja text;
  v_key text;
  v_total integer;
BEGIN
  v_loja := public.normalizar_loja_magalu(p_loja);
  v_key := public.ref_sem_tipo(p_referencia_key);

  IF v_key IS NULL THEN
    v_key := public.normalizar_ref_variacao(p_referencia_key);
  END IF;

  IF v_loja IS NULL OR v_key IS NULL OR v_key = '' THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_total
  FROM public.marketplace_magalu_all m
  WHERE m."Loja" = v_loja
    AND m.tipo_referencia = 'VAR'
    AND m.referencia_key = v_key;

  INSERT INTO public.marketplace_magalu_variacoes_ref_count (
    loja,
    referencia_key,
    total_variacoes,
    atualizado_em
  )
  VALUES (
    v_loja,
    v_key,
    COALESCE(v_total, 0),
    now()
  )
  ON CONFLICT (loja, referencia_key)
  DO UPDATE SET
    total_variacoes = EXCLUDED.total_variacoes,
    atualizado_em = now();
END;
$$;


ALTER FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  truncate table public.marketplace_shopee_variacoes_ref_count;

  insert into public.marketplace_shopee_variacoes_ref_count (
    loja,
    chave_ref,
    total_variacoes,
    atualizado_em
  )
  select
    loja,
    chave_ref,
    count(*)::integer as total_variacoes,
    now()
  from (
    select
      'PK'::text as loja,
      public.shopee_ref_chave("Referência") as chave_ref
    from public.marketplace_shopee_pk
    where public.shopee_ref_tipo("Referência") = 'VAR'
      and public.shopee_ref_chave("Referência") is not null

    union all

    select
      'SB'::text as loja,
      public.shopee_ref_chave("Referência") as chave_ref
    from public.marketplace_shopee_sb
    where public.shopee_ref_tipo("Referência") = 'VAR'
      and public.shopee_ref_chave("Referência") is not null
  ) x
  group by loja, chave_ref;
end;
$$;


ALTER FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count_key"("p_loja" "text", "p_chave_ref" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_loja text;
  v_chave text;
  v_total integer;
begin
  v_loja := public.shopee_normalizar_loja(p_loja);
  v_chave := public.shopee_ref_chave(p_chave_ref);

  if v_loja is null or v_chave is null then
    return;
  end if;

  if v_loja = 'PK' then
    select count(*)
      into v_total
    from public.marketplace_shopee_pk s
    where public.shopee_ref_tipo(s."Referência") = 'VAR'
      and public.shopee_ref_chave(s."Referência") = v_chave;
  elsif v_loja = 'SB' then
    select count(*)
      into v_total
    from public.marketplace_shopee_sb s
    where public.shopee_ref_tipo(s."Referência") = 'VAR'
      and public.shopee_ref_chave(s."Referência") = v_chave;
  else
    return;
  end if;

  insert into public.marketplace_shopee_variacoes_ref_count (
    loja,
    chave_ref,
    total_variacoes,
    atualizado_em
  )
  values (
    v_loja,
    v_chave,
    coalesce(v_total, 0),
    now()
  )
  on conflict (loja, chave_ref)
  do update set
    total_variacoes = excluded.total_variacoes,
    atualizado_em = now();
end;
$$;


ALTER FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count_key"("p_loja" "text", "p_chave_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_variacoes_lote"("p_loja" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 20) RETURNS TABLE("loja" "text", "processados" integer, "vinculados" integer, "pendentes" integer)
    LANGUAGE "plpgsql"
    AS $$
declare
  r record;
  v_loja_filtro text;
  v_total int;
  v_processados int := 0;
  v_vinculados int := 0;
begin
  v_loja_filtro := nullif(public.normalizar_loja_variacao(p_loja), '');

  for r in
    with pais as (
      select
        'PK'::text as loja,
        p."ID"::bigint as pai_id
      from public.anuncios_pk p
      where upper(trim(coalesce(p."Referência", ''))) ~ '^PAI\s*-'

      union all

      select
        'SB'::text as loja,
        p."ID"::bigint as pai_id
      from public.anuncios_sb p
      where upper(trim(coalesce(p."Referência", ''))) ~ '^PAI\s*-'
    )
    select
      pais.loja,
      pais.pai_id
    from pais
    where (v_loja_filtro is null or pais.loja = v_loja_filtro)
      and not exists (
        select 1
        from public.anuncio_variacoes_refresh_status s
        where s.loja = pais.loja
          and s.pai_id = pais.pai_id
      )
    order by pais.loja, pais.pai_id
    limit greatest(coalesce(p_limit, 20), 1)
  loop
    v_total := public.refresh_variacoes_um_pai(r.loja, r.pai_id);

    v_processados := v_processados + 1;
    v_vinculados := v_vinculados + coalesce(v_total, 0);
  end loop;

  return query
  with pais as (
    select
      'PK'::text as loja,
      p."ID"::bigint as pai_id
    from public.anuncios_pk p
    where upper(trim(coalesce(p."Referência", ''))) ~ '^PAI\s*-'

    union all

    select
      'SB'::text as loja,
      p."ID"::bigint as pai_id
    from public.anuncios_sb p
    where upper(trim(coalesce(p."Referência", ''))) ~ '^PAI\s*-'
  )
  select
    coalesce(v_loja_filtro, 'TODAS')::text as loja,
    v_processados::int as processados,
    v_vinculados::int as vinculados,
    count(*)::int as pendentes
  from pais
  where (v_loja_filtro is null or pais.loja = v_loja_filtro)
    and not exists (
      select 1
      from public.anuncio_variacoes_refresh_status s
      where s.loja = pais.loja
        and s.pai_id = pais.pai_id
    );
end;
$$;


ALTER FUNCTION "public"."refresh_variacoes_lote"("p_loja" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_variacoes_ref_count"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  truncate table public.anuncios_variacoes_ref_count;

  insert into public.anuncios_variacoes_ref_count (
    loja,
    referencia_key,
    total_variacoes,
    atualizado_em
  )
  with todos as (
    select
      'PK'::text as loja,
      "Referência"::text as referencia
    from public.anuncios_pk
    where "Referência" is not null

    union all

    select
      'SB'::text as loja,
      "Referência"::text as referencia
    from public.anuncios_sb
    where "Referência" is not null
  ),

  pais as (
    select
      loja,
      referencia,
      public.ref_variacao_key(referencia) as pai_key,
      public.ref_variacao_marca(referencia) as marca,
      public.ref_variacao_tokens(referencia) as tokens
    from todos
    where public.ref_variacao_tipo(referencia) = 'PAI'
  ),

  variacoes as (
    select
      loja,
      referencia,
      public.ref_variacao_key(referencia) as var_key,
      public.ref_variacao_marca(referencia) as marca,
      public.ref_variacao_codigo_principal(referencia) as codigo_principal
    from todos
    where public.ref_variacao_tipo(referencia) = 'VAR'
  )

  select
    p.loja,
    p.pai_key as referencia_key,
    count(v.*)::int as total_variacoes,
    now() as atualizado_em
  from pais p
  left join variacoes v
    on v.loja = p.loja
   and v.marca = p.marca
   and v.codigo_principal = any(p.tokens)
  where p.pai_key is not null
  group by p.loja, p.pai_key;
end;
$$;


ALTER FUNCTION "public"."refresh_variacoes_ref_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_loja text;
  v_key text;
  v_total int := 0;
begin
  v_loja := public.normalizar_loja_variacao(p_loja);
  v_key := upper(trim(coalesce(p_referencia_key, '')));

  if v_key = '' then
    return;
  end if;

  if v_loja = 'PK' then
    select count(*)::int
    into v_total
    from public.anuncios_pk v
    where public.tipo_ref_variacao(v."Referência") = 'VAR'
      and public.ref_variacao_key(v."Referência") = v_key;

  elsif v_loja = 'SB' then
    select count(*)::int
    into v_total
    from public.anuncios_sb v
    where public.tipo_ref_variacao(v."Referência") = 'VAR'
      and public.ref_variacao_key(v."Referência") = v_key;

  else
    v_total := 0;
  end if;

  if coalesce(v_total, 0) > 0 then
    insert into public.anuncios_variacoes_ref_count (
      loja,
      referencia_key,
      total_variacoes,
      atualizado_em
    )
    values (
      v_loja,
      v_key,
      v_total,
      now()
    )
    on conflict (loja, referencia_key) do update
    set
      total_variacoes = excluded.total_variacoes,
      atualizado_em = now();
  else
    delete from public.anuncios_variacoes_ref_count
    where loja = v_loja
      and referencia_key = v_key;
  end if;
end;
$$;


ALTER FUNCTION "public"."refresh_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_variacoes_um_pai"("p_loja" "text", "p_pai_id" bigint) RETURNS integer
    LANGUAGE "plpgsql"
    AS $_$
declare
  v_loja text;
  v_total int := 0;
begin
  v_loja := public.normalizar_loja_variacao(p_loja);

  delete from public.anuncio_variacoes_rel
  where loja = v_loja
    and pai_id = p_pai_id;

  with vars as (
    select
      item
    from jsonb_array_elements(
      coalesce(public.get_variacoes_anuncio(v_loja, p_pai_id), '[]'::jsonb)
    ) item
  ),
  parsed as (
    select distinct
      v_loja as loja,
      p_pai_id as pai_id,
      nullif(item ->> 'ID', '')::bigint as variacao_id,
      coalesce(item ->> 'criterio_conexao', item ->> 'criterio', 'Automático') as criterio,
      coalesce(nullif(item ->> 'score_conexao', '')::int, 0) as score
    from vars
    where item ? 'ID'
      and nullif(item ->> 'ID', '') is not null
      and (item ->> 'ID') ~ '^[0-9]+$'
  )
  insert into public.anuncio_variacoes_rel (
    loja,
    pai_id,
    variacao_id,
    criterio,
    score,
    atualizado_em
  )
  select
    loja,
    pai_id,
    variacao_id,
    criterio,
    score,
    now()
  from parsed
  where variacao_id is not null
  on conflict (loja, pai_id, variacao_id) do update
  set
    criterio = excluded.criterio,
    score = excluded.score,
    atualizado_em = now();

  select count(distinct variacao_id)
  into v_total
  from public.anuncio_variacoes_rel
  where loja = v_loja
    and pai_id = p_pai_id;

  insert into public.anuncio_variacoes_refresh_status (
    loja,
    pai_id,
    total_variacoes,
    atualizado_em
  )
  values (
    v_loja,
    p_pai_id,
    coalesce(v_total, 0),
    now()
  )
  on conflict (loja, pai_id) do update
  set
    total_variacoes = excluded.total_variacoes,
    atualizado_em = now();

  return coalesce(v_total, 0);
end;
$_$;


ALTER FUNCTION "public"."refresh_variacoes_um_pai"("p_loja" "text", "p_pai_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reprocessar_variacoes_pai"("p_loja" "text", "p_pai_id" bigint) RETURNS TABLE("chave" "text", "pai_id" bigint, "total_variacoes" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_loja text;
  v_key text;
BEGIN
  v_loja := public.normalizar_loja_magalu(p_loja);

  SELECT public.ref_sem_tipo(m."Referência")
  INTO v_key
  FROM public.marketplace_magalu_all m
  WHERE m.anuncio_id = p_pai_id
    AND m.tipo_referencia = 'PAI'
    AND (v_loja IS NULL OR m."Loja" = v_loja)
  LIMIT 1;

  IF v_key IS NULL OR v_key = '' THEN
    RETURN;
  END IF;

  PERFORM public.refresh_marketplace_magalu_variacoes_ref_count_key(v_loja, v_key);

  RETURN QUERY
  SELECT
    v_key,
    p_pai_id,
    COALESCE(c.total_variacoes, 0)
  FROM public.marketplace_magalu_variacoes_ref_count c
  WHERE c.loja = v_loja
    AND c.referencia_key = v_key;
END;
$$;


ALTER FUNCTION "public"."reprocessar_variacoes_pai"("p_loja" "text", "p_pai_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_to_numeric"("value" "text") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v text;
BEGIN
  IF value IS NULL OR trim(value) = '' THEN
    RETURN 0;
  END IF;

  v := trim(value);
  v := regexp_replace(v, '[^0-9,.\-]', '', 'g');

  IF v = '' THEN
    RETURN 0;
  END IF;

  IF position(',' in v) > 0 AND position('.' in v) > 0 THEN
    IF strpos(reverse(v), ',') < strpos(reverse(v), '.') THEN
      v := replace(v, '.', '');
      v := replace(v, ',', '.');
    ELSE
      v := replace(v, ',', '');
    END IF;
  ELSIF position(',' in v) > 0 THEN
    v := replace(v, '.', '');
    v := replace(v, ',', '.');
  END IF;

  RETURN COALESCE(v::numeric, 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;


ALTER FUNCTION "public"."safe_to_numeric"("value" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "email" "text",
    "avatar_url" "text",
    "status" "text" DEFAULT 'disponivel'::"text" NOT NULL,
    "status_message" "text" DEFAULT ''::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "last_seen_at" timestamp with time zone,
    "status_updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['disponivel'::"text", 'ausente'::"text", 'ocupado'::"text", 'invisivel'::"text"]))),
    CONSTRAINT "profiles_status_message_length_check" CHECK ((("status_message" IS NULL) OR ("char_length"("status_message") <= 120)))
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_my_profile_status"("p_status" "text", "p_status_message" "text" DEFAULT NULL::"text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_profile public.profiles;
  v_status_message text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_status not in ('disponivel', 'ausente', 'ocupado', 'invisivel') then
    raise exception 'Status inválido: %', p_status;
  end if;

  v_status_message := nullif(btrim(coalesce(p_status_message, '')), '');

  if v_status_message is not null and char_length(v_status_message) > 120 then
    raise exception 'A mensagem de status deve ter no máximo 120 caracteres.';
  end if;

  update public.profiles
  set
    status = p_status,
    status_message = v_status_message,
    status_updated_at = now(),
    updated_at = now(),
    last_seen_at = now()
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile não encontrado para o usuário autenticado.';
  end if;

  return v_profile;
end;
$$;


ALTER FUNCTION "public"."set_my_profile_status"("p_status" "text", "p_status_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profiles_status_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();

  if tg_op = 'INSERT' then
    new.status_updated_at = coalesce(new.status_updated_at, now());
  elsif old.status is distinct from new.status
     or old.status_message is distinct from new.status_message then
    new.status_updated_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_profiles_status_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status then
      new.status_updated_at = now();
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shopee_normalizar_loja"("p_loja" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v text;
begin
  v := public.shopee_normalizar_texto(p_loja);
  v := regexp_replace(v, '\s+', '', 'g');

  if v = 'PK' or v like 'PK%' or v like '%PIKOT%' then
    return 'PK';
  end if;

  if v = 'SB' or v like 'SB%' or v like '%SOBA%' then
    return 'SB';
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."shopee_normalizar_loja"("p_loja" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shopee_normalizar_texto"("p_texto" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select upper(
    regexp_replace(
      translate(
        coalesce(p_texto, ''),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;


ALTER FUNCTION "public"."shopee_normalizar_texto"("p_texto" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shopee_ref_is_pai"("p_referencia" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select public.shopee_ref_tipo(p_referencia) = 'PAI';
$$;


ALTER FUNCTION "public"."shopee_ref_is_pai"("p_referencia" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shopee_ref_is_var"("p_referencia" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select public.shopee_ref_tipo(p_referencia) = 'VAR';
$$;


ALTER FUNCTION "public"."shopee_ref_is_var"("p_referencia" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shopee_ref_limpa"("p_referencia" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v text;
begin
  v := public.shopee_normalizar_texto(p_referencia);

  v := replace(v, '–', '-');
  v := replace(v, '—', '-');
  v := replace(v, '−', '-');

  v := regexp_replace(v, '\s+', ' ', 'g');
  v := trim(v);

  return v;
end;
$$;


ALTER FUNCTION "public"."shopee_ref_limpa"("p_referencia" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_all_to_pk_sb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Anti-loop
    IF current_setting('myapp.market_sync', true) = 'on' THEN
        RETURN NEW;
    END IF;

    BEGIN
        PERFORM set_config('myapp.market_sync', 'on', true);
    EXCEPTION
        WHEN others THEN NULL;
    END;

    IF NEW."Loja" = 'PK' THEN
        UPDATE marketplace_tray_pk
        SET
            Desconto         = NEW.Desconto,
            Embalagem        = NEW.Embalagem,
            Frete            = NEW.Frete,
            Comissão         = NEW.Comissão,
            Imposto          = NEW.Imposto,
            Marketing        = NEW.Marketing,
            "Margem de Lucro"= NEW."Margem de Lucro",
            Custo            = NEW.Custo,
            "Preço de Venda" = NEW."Preço de Venda"
        WHERE "ID" = NEW."ID";

    ELSIF NEW."Loja" = 'SB' THEN
        UPDATE marketplace_tray_sb
        SET
            Desconto         = NEW.Desconto,
            Embalagem        = NEW.Embalagem,
            Frete            = NEW.Frete,
            Comissão         = NEW.Comissão,
            Imposto          = NEW.Imposto,
            Marketing        = NEW.Marketing,
            "Margem de Lucro"= NEW."Margem de Lucro",
            Custo            = NEW.Custo,
            "Preço de Venda" = NEW."Preço de Venda"
        WHERE "ID" = NEW."ID";
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_all_to_pk_sb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_pk_to_marketplace"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO marketplace_tray_pk (
    anuncio_id,
    "ID",
    "Loja",
    "Atualizado em"
  )
  VALUES (
    NEW."ID",
    NEW."ID",
    'PK',
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_pk_to_marketplace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_pk_to_marketplace_magalu"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_anuncio_id bigint;
  v_custo numeric;
BEGIN
  v_anuncio_id := public.magalu_to_bigint_safe(NEW."ID"::text);

  IF v_anuncio_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_custo := public.magalu_calc_custo_composicao(
    NEW."Código 1", NEW."Quantidade 1",
    NEW."Código 2", NEW."Quantidade 2",
    NEW."Código 3", NEW."Quantidade 3",
    NEW."Código 4", NEW."Quantidade 4",
    NEW."Código 5", NEW."Quantidade 5",
    NEW."Código 6", NEW."Quantidade 6",
    NEW."Código 7", NEW."Quantidade 7",
    NEW."Código 8", NEW."Quantidade 8",
    NEW."Código 9", NEW."Quantidade 9",
    NEW."Código 10", NEW."Quantidade 10"
  );

  UPDATE public.marketplace_magalu_pk m
  SET
    anuncio_id = v_anuncio_id,
    "ID" = v_anuncio_id,
    "Loja" = 'Pikot Shop',
    "ID Bling" = COALESCE(NEW."ID Bling"::text, m."ID Bling"),
    "ID Tray" = COALESCE(NEW."ID Tray"::text, m."ID Tray"),
    "ID Var" = COALESCE(NEW."ID Var"::text, m."ID Var"),
    "Referência" = COALESCE(NEW."Referência"::text, m."Referência"),
    "OD" = COALESCE(NEW."OD"::text, m."OD"),
    "Nome" = COALESCE(NEW."Nome"::text, m."Nome"),
    "Marca" = COALESCE(NEW."Marca"::text, m."Marca"),
    "Categoria" = COALESCE(NEW."Categoria"::text, m."Categoria"),
    "Custo" = COALESCE(v_custo, m."Custo", 0),
    "Sincronizado em" = now()
  WHERE m.anuncio_id = v_anuncio_id
     OR m."ID" = v_anuncio_id;

  IF NOT FOUND THEN
    INSERT INTO public.marketplace_magalu_pk (
      anuncio_id,
      "ID",
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Desconto",
      "Embalagem",
      "Frete",
      "Comissão",
      "Imposto",
      "Margem de Lucro",
      "Marketing",
      "Custo",
      "Atualizado em",
      "Sincronizado em"
    )
    VALUES (
      v_anuncio_id,
      v_anuncio_id,
      'Pikot Shop',
            NEW."ID Bling"::text,
      NEW."ID Tray"::text,
      NEW."ID Var"::text,
      NEW."Referência"::text,
      NEW."OD"::text,
      NEW."Nome"::text,
      NEW."Marca"::text,
      NEW."Categoria"::text,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      COALESCE(v_custo, 0),
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_pk_to_marketplace_magalu"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_pk_to_marketplace_shopee"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
    UPDATE public.marketplace_shopee_pk
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling" = NEW."ID Bling"
       AND "ID Tray"  = NEW."ID Tray";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
    UPDATE public.marketplace_tray_pk
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling"   = NEW."ID Bling"
       AND "Referência" = NEW."Referência";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  UPDATE public.marketplace_tray_pk
     SET "ID"            = NEW."ID",
         "Loja"          = NEW."Loja",
         "ID Bling"      = NEW."ID Bling",
         "ID Tray"       = NEW."ID Tray",
         "ID Var"        = NEW."ID Var",
         "Referência"    = NEW."Referência",
         "OD"            = NEW."OD",
         "Nome"          = NEW."Nome",
         "Marca"         = NEW."Marca",
         "Categoria"     = NEW."Categoria",
         "Atualizado em" = NOW()
   WHERE anuncio_id = NEW."ID";

  IF FOUND THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.marketplace_tray_pk (
        id,
        anuncio_id,
        "ID",
        "Loja",
        "ID Bling",
        "ID Tray",
        "ID Var",
        "Referência",
        "OD",
        "Nome",
        "Marca",
        "Categoria",
        "Atualizado em",
        "Sincronizado em"
    )
    VALUES (
        gen_random_uuid(),
        NEW."ID",
        NEW."ID",
        NEW."Loja",
        NEW."ID Bling",
        NEW."ID Tray",
        NEW."ID Var",
        NEW."Referência",
        NEW."OD",
        NEW."Nome",
        NEW."Marca",
        NEW."Categoria",
        NOW(),
        NULL
    );
  EXCEPTION
    WHEN unique_violation THEN
      IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
        UPDATE public.marketplace_tray_pk
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Var"        = NEW."ID Var",
               "Referência"    = NEW."Referência",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling" = NEW."ID Bling"
           AND "ID Tray"  = NEW."ID Tray";

        IF FOUND THEN RETURN NEW; END IF;
      END IF;

      IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
        UPDATE public.marketplace_tray_pk
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Tray"       = NEW."ID Tray",
               "ID Var"        = NEW."ID Var",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling"   = NEW."ID Bling"
           AND "Referência" = NEW."Referência";
      END IF;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_pk_to_marketplace_shopee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_pk_to_marketplace_tray"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
    UPDATE public.marketplace_tray_pk
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling" = NEW."ID Bling"
       AND "ID Tray"  = NEW."ID Tray";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
    UPDATE public.marketplace_tray_pk
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling"   = NEW."ID Bling"
       AND "Referência" = NEW."Referência";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  UPDATE public.marketplace_tray_pk
     SET "ID"            = NEW."ID",
         "Loja"          = NEW."Loja",
         "ID Bling"      = NEW."ID Bling",
         "ID Tray"       = NEW."ID Tray",
         "ID Var"        = NEW."ID Var",
         "Referência"    = NEW."Referência",
         "OD"            = NEW."OD",
         "Nome"          = NEW."Nome",
         "Marca"         = NEW."Marca",
         "Categoria"     = NEW."Categoria",
         "Atualizado em" = NOW()
   WHERE anuncio_id = NEW."ID";

  IF FOUND THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.marketplace_tray_pk (
        id,
        anuncio_id,
        "ID",
        "Loja",
        "ID Bling",
        "ID Tray",
        "ID Var",
        "Referência",
        "OD",
        "Nome",
        "Marca",
        "Categoria",
        "Atualizado em",
        "Sincronizado em"
    )
    VALUES (
        gen_random_uuid(),
        NEW."ID",
        NEW."ID",
        NEW."Loja",
        NEW."ID Bling",
        NEW."ID Tray",
        NEW."ID Var",
        NEW."Referência",
        NEW."OD",
        NEW."Nome",
        NEW."Marca",
        NEW."Categoria",
        NOW(),
        NULL
    );
  EXCEPTION
    WHEN unique_violation THEN
      IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
        UPDATE public.marketplace_tray_pk
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Var"        = NEW."ID Var",
               "Referência"    = NEW."Referência",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling" = NEW."ID Bling"
           AND "ID Tray"  = NEW."ID Tray";

        IF FOUND THEN RETURN NEW; END IF;
      END IF;

      IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
        UPDATE public.marketplace_tray_pk
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Tray"       = NEW."ID Tray",
               "ID Var"        = NEW."ID Var",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling"   = NEW."ID Bling"
           AND "Referência" = NEW."Referência";
      END IF;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_pk_to_marketplace_tray"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_sb_to_marketplace"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO marketplace_tray_sb (
    anuncio_id,
    "ID",
    "Loja",
    "Atualizado em"
  )
  VALUES (
    NEW."ID",
    NEW."ID",
    'SB',
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_sb_to_marketplace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_sb_to_marketplace_magalu"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_anuncio_id bigint;
  v_custo numeric;
BEGIN
  v_anuncio_id := public.magalu_to_bigint_safe(NEW."ID"::text);

  IF v_anuncio_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_custo := public.magalu_calc_custo_composicao(
    NEW."Código 1", NEW."Quantidade 1",
    NEW."Código 2", NEW."Quantidade 2",
    NEW."Código 3", NEW."Quantidade 3",
    NEW."Código 4", NEW."Quantidade 4",
    NEW."Código 5", NEW."Quantidade 5",
    NEW."Código 6", NEW."Quantidade 6",
    NEW."Código 7", NEW."Quantidade 7",
    NEW."Código 8", NEW."Quantidade 8",
    NEW."Código 9", NEW."Quantidade 9",
    NEW."Código 10", NEW."Quantidade 10"
  );

  UPDATE public.marketplace_magalu_sb m
  SET
    anuncio_id = v_anuncio_id,
    "ID" = v_anuncio_id,
    "Loja" = 'Sóbaquetas',
    "ID Bling" = COALESCE(NEW."ID Bling"::text, m."ID Bling"),
    "ID Tray" = COALESCE(NEW."ID Tray"::text, m."ID Tray"),
    "ID Var" = COALESCE(NEW."ID Var"::text, m."ID Var"),
    "Referência" = COALESCE(NEW."Referência"::text, m."Referência"),
    "OD" = COALESCE(NEW."OD"::text, m."OD"),
    "Nome" = COALESCE(NEW."Nome"::text, m."Nome"),
    "Marca" = COALESCE(NEW."Marca"::text, m."Marca"),
    "Categoria" = COALESCE(NEW."Categoria"::text, m."Categoria"),
    "Custo" = COALESCE(v_custo, m."Custo", 0),
    "Sincronizado em" = now()
  WHERE m.anuncio_id = v_anuncio_id
     OR m."ID" = v_anuncio_id;

  IF NOT FOUND THEN
    INSERT INTO public.marketplace_magalu_sb (
      anuncio_id,
      "ID",
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Desconto",
      "Embalagem",
      "Frete",
      "Comissão",
      "Imposto",
      "Margem de Lucro",
      "Marketing",
      "Custo",
      "Atualizado em",
      "Sincronizado em"
    )
    VALUES (
      v_anuncio_id,
      v_anuncio_id,
      'Sóbaquetas',
      NEW."ID Bling"::text,
      NEW."ID Tray"::text,
      NEW."ID Var"::text,
      NEW."Referência"::text,
      NEW."OD"::text,
      NEW."Nome"::text,
      NEW."Marca"::text,
      NEW."Categoria"::text,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      COALESCE(v_custo, 0),
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_sb_to_marketplace_magalu"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_sb_to_marketplace_shopee"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
    UPDATE public.marketplace_shopee_sb
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling" = NEW."ID Bling"
       AND "ID Tray"  = NEW."ID Tray";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
    UPDATE public.marketplace_shopee_sb
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling"   = NEW."ID Bling"
       AND "Referência" = NEW."Referência";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  UPDATE public.marketplace_shopee_sb
     SET "ID"            = NEW."ID",
         "Loja"          = NEW."Loja",
         "ID Bling"      = NEW."ID Bling",
         "ID Tray"       = NEW."ID Tray",
         "ID Var"        = NEW."ID Var",
         "Referência"    = NEW."Referência",
         "OD"            = NEW."OD",
         "Nome"          = NEW."Nome",
         "Marca"         = NEW."Marca",
         "Categoria"     = NEW."Categoria",
         "Atualizado em" = NOW()
   WHERE anuncio_id = NEW."ID";

  IF FOUND THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.marketplace_shopee_sb (
        id,
        anuncio_id,
        "ID",
        "Loja",
        "ID Bling",
        "ID Tray",
        "ID Var",
        "Referência",
        "OD",
        "Nome",
        "Marca",
        "Categoria",
        "Atualizado em",
        "Sincronizado em"
    )
    VALUES (
        gen_random_uuid(),
        NEW."ID",
        NEW."ID",
        NEW."Loja",
        NEW."ID Bling",
        NEW."ID Tray",
        NEW."ID Var",
        NEW."Referência",
        NEW."OD",
        NEW."Nome",
        NEW."Marca",
        NEW."Categoria",
        NOW(),
        NULL
    );
  EXCEPTION
    WHEN unique_violation THEN
      IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
        UPDATE public.marketplace_shopee_sb
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Var"        = NEW."ID Var",
               "Referência"    = NEW."Referência",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling" = NEW."ID Bling"
           AND "ID Tray"  = NEW."ID Tray";

        IF FOUND THEN RETURN NEW; END IF;
      END IF;

      IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
        UPDATE public.marketplace_shopee_sb
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Tray"       = NEW."ID Tray",
               "ID Var"        = NEW."ID Var",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling"   = NEW."ID Bling"
           AND "Referência" = NEW."Referência";
      END IF;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_sb_to_marketplace_shopee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_sb_to_marketplace_tray"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
    UPDATE public.marketplace_tray_sb
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling" = NEW."ID Bling"
       AND "ID Tray"  = NEW."ID Tray";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
    UPDATE public.marketplace_tray_sb
       SET anuncio_id      = NEW."ID",
           "ID"            = NEW."ID",
           "Loja"          = NEW."Loja",
           "ID Bling"      = NEW."ID Bling",
           "ID Tray"       = NEW."ID Tray",
           "ID Var"        = NEW."ID Var",
           "Referência"    = NEW."Referência",
           "OD"            = NEW."OD",
           "Nome"          = NEW."Nome",
           "Marca"         = NEW."Marca",
           "Categoria"     = NEW."Categoria",
           "Atualizado em" = NOW()
     WHERE "ID Bling"   = NEW."ID Bling"
       AND "Referência" = NEW."Referência";

    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  UPDATE public.marketplace_tray_sb
     SET "ID"            = NEW."ID",
         "Loja"          = NEW."Loja",
         "ID Bling"      = NEW."ID Bling",
         "ID Tray"       = NEW."ID Tray",
         "ID Var"        = NEW."ID Var",
         "Referência"    = NEW."Referência",
         "OD"            = NEW."OD",
         "Nome"          = NEW."Nome",
         "Marca"         = NEW."Marca",
         "Categoria"     = NEW."Categoria",
         "Atualizado em" = NOW()
   WHERE anuncio_id = NEW."ID";

  IF FOUND THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.marketplace_tray_sb (
        id,
        anuncio_id,
        "ID",
        "Loja",
        "ID Bling",
        "ID Tray",
        "ID Var",
        "Referência",
        "OD",
        "Nome",
        "Marca",
        "Categoria",
        "Atualizado em",
        "Sincronizado em"
    )
    VALUES (
        gen_random_uuid(),
        NEW."ID",
        NEW."ID",
        NEW."Loja",
        NEW."ID Bling",
        NEW."ID Tray",
        NEW."ID Var",
        NEW."Referência",
        NEW."OD",
        NEW."Nome",
        NEW."Marca",
        NEW."Categoria",
        NOW(),
        NULL
    );
  EXCEPTION
    WHEN unique_violation THEN
      IF NEW."ID Bling" IS NOT NULL AND NEW."ID Tray" IS NOT NULL THEN
        UPDATE public.marketplace_tray_sb
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Var"        = NEW."ID Var",
               "Referência"    = NEW."Referência",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling" = NEW."ID Bling"
           AND "ID Tray"  = NEW."ID Tray";

        IF FOUND THEN RETURN NEW; END IF;
      END IF;

      IF NEW."ID Bling" IS NOT NULL AND NEW."Referência" IS NOT NULL THEN
        UPDATE public.marketplace_tray_sb
           SET anuncio_id      = NEW."ID",
               "ID"            = NEW."ID",
               "Loja"          = NEW."Loja",
               "ID Tray"       = NEW."ID Tray",
               "ID Var"        = NEW."ID Var",
               "OD"            = NEW."OD",
               "Nome"          = NEW."Nome",
               "Marca"         = NEW."Marca",
               "Categoria"     = NEW."Categoria",
               "Atualizado em" = NOW()
         WHERE "ID Bling"   = NEW."ID Bling"
           AND "Referência" = NEW."Referência";
      END IF;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anuncios_sb_to_marketplace_tray"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_to_all_marketplaces"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- 🔹 Atualiza ou insere no marketplace Tray
  insert into marketplace_tray_all (codigo, nome, preco, descricao)
  values (new.codigo, new.nome, new.preco, new.descricao)
  on conflict (codigo)
  do update set
    nome = excluded.nome,
    preco = excluded.preco,
    descricao = excluded.descricao;

  -- 🔹 Atualiza ou insere no marketplace Shopee
  insert into marketplace_shopee_all (codigo, nome, preco, descricao)
  values (new.codigo, new.nome, new.preco, new.descricao)
  on conflict (codigo)
  do update set
    nome = excluded.nome,
    preco = excluded.preco,
    descricao = excluded.descricao;

  -- 🔹 Atualiza ou insere no marketplace Magalu
  insert into marketplace_magalu_all (codigo, nome, preco, descricao)
  values (new.codigo, new.nome, new.preco, new.descricao)
  on conflict (codigo)
  do update set
    nome = excluded.nome,
    preco = excluded.preco,
    descricao = excluded.descricao;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_anuncios_to_all_marketplaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anuncios_variacoes_ref_count_keys"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.referencia_key is null and new.chave_variacao is not null then
    new.referencia_key := new.chave_variacao;
  end if;

  if new.chave_variacao is null and new.referencia_key is not null then
    new.chave_variacao := new.referencia_key;
  end if;

  if new.total_variacoes is null then
    new.total_variacoes := 0;
  end if;

  if new.updated_at is null then
    new.updated_at := now();
  end if;

  if new.atualizado_em is null then
    new.atualizado_em := coalesce(new.updated_at, now());
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_anuncios_variacoes_ref_count_keys"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_delete_anuncio_to_marketplace_magalu"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'anuncios_pk' THEN

    DELETE FROM public.marketplace_magalu_pk m
    WHERE
      m.anuncio_id::text = OLD."ID"::text
      OR (
        NULLIF(trim(coalesce(OLD."Referência"::text, '')), '') IS NOT NULL
        AND m."Referência"::text = OLD."Referência"::text
      )
      OR (
        NULLIF(trim(coalesce(OLD."ID Tray"::text, '')), '') IS NOT NULL
        AND m."ID Tray"::text = OLD."ID Tray"::text
      )
      OR (
        NULLIF(trim(coalesce(OLD."ID Var"::text, '')), '') IS NOT NULL
        AND m."ID Var"::text = OLD."ID Var"::text
      );

  ELSIF TG_TABLE_NAME = 'anuncios_sb' THEN

    DELETE FROM public.marketplace_magalu_sb m
    WHERE
      m.anuncio_id::text = OLD."ID"::text
      OR (
        NULLIF(trim(coalesce(OLD."Referência"::text, '')), '') IS NOT NULL
        AND m."Referência"::text = OLD."Referência"::text
      )
      OR (
        NULLIF(trim(coalesce(OLD."ID Tray"::text, '')), '') IS NOT NULL
        AND m."ID Tray"::text = OLD."ID Tray"::text
      )
      OR (
        NULLIF(trim(coalesce(OLD."ID Var"::text, '')), '') IS NOT NULL
        AND m."ID Var"::text = OLD."ID Var"::text
      );

  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."sync_delete_anuncio_to_marketplace_magalu"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_from_all"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF current_setting('app.sync_running', true) = 'on' THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.sync_running', 'on', true);

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW."Loja" = 'Pikot Shop' THEN
      INSERT INTO public."marketplace_tray_pk"
      ("ID","Loja","ID Bling","Referência","ID Tray","ID Var","OD","Nome","Marca","Categoria","Atualizado em")
      VALUES
      (NEW."ID",NEW."Loja",NEW."ID Bling",NEW."Referência",NEW."ID Tray",NEW."ID Var",NEW."OD",NEW."Nome",NEW."Marca",NEW."Categoria",NOW());
    ELSIF NEW."Loja" = 'Sóbaquetas' THEN
      INSERT INTO public."marketplace_tray_sb"
      ("ID","Loja","ID Bling","Referência","ID Tray","ID Var","OD","Nome","Marca","Categoria","Atualizado em")
      VALUES
      (NEW."ID",NEW."Loja",NEW."ID Bling",NEW."Referência",NEW."ID Tray",NEW."ID Var",NEW."OD",NEW."Nome",NEW."Marca",NEW."Categoria",NOW());
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public."marketplace_tray_pk"
    WHERE "Referência" = OLD."Referência" AND "Loja" = 'Pikot Shop';
    DELETE FROM public."marketplace_tray_sb"
    WHERE "Referência" = OLD."Referência" AND "Loja" = 'Sóbaquetas';
  END IF;

  PERFORM set_config('app.sync_running', 'off', true);
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_from_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_from_anuncios"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Evita recursão
  IF current_setting('app.sync_running', true) = 'on' THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.sync_running', 'on', true);

  IF TG_TABLE_NAME = 'anuncios_pk' THEN
    INSERT INTO public."marketplace_tray_pk"
    ("ID","Loja","ID Bling","Referência","ID Tray","ID Var","OD","Nome","Marca","Categoria","Atualizado em")
    VALUES
    (NEW."ID",'Pikot Shop',NEW."ID Bling",NEW."Referência",NEW."ID Tray",NEW."ID Var",NEW."OD",NEW."Nome",NEW."Marca",NEW."Categoria",NOW());
  ELSIF TG_TABLE_NAME = 'anuncios_sb' THEN
    INSERT INTO public."marketplace_tray_sb"
    ("ID","Loja","ID Bling","Referência","ID Tray","ID Var","OD","Nome","Marca","Categoria","Atualizado em")
    VALUES
    (NEW."ID",'Sóbaquetas',NEW."ID Bling",NEW."Referência",NEW."ID Tray",NEW."ID Var",NEW."OD",NEW."Nome",NEW."Marca",NEW."Categoria",NOW());
  END IF;

  PERFORM set_config('app.sync_running', 'off', true);
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_from_anuncios"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_from_marketplace"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF current_setting('app.sync_running', true) = 'on' THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.sync_running', 'on', true);

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    INSERT INTO public."marketplace_tray_all"
    ("ID","Loja","ID Bling","Referência","ID Tray","ID Var","OD","Nome","Marca","Categoria","Atualizado em","Sincronizado em")
    VALUES
    (NEW."ID",NEW."Loja",NEW."ID Bling",NEW."Referência",NEW."ID Tray",NEW."ID Var",NEW."OD",NEW."Nome",NEW."Marca",NEW."Categoria",NOW(),NOW());
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public."marketplace_tray_all"
    WHERE "Referência" = OLD."Referência" AND "Loja" = OLD."Loja";
  END IF;

  PERFORM set_config('app.sync_running', 'off', true);
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_from_marketplace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_marketplace_magalu_all"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.marketplace_magalu_pk (
    anuncio_id,
    "ID",
    "Loja",
    "ID Bling",
    "ID Tray",
    "ID Var",
    "Referência",
    "OD",
    "Nome",
    "Marca",
    "Categoria",
    "Desconto",
    "Embalagem",
    "Frete",
    "Comissão",
    "Imposto",
    "Margem de Lucro",
    "Marketing",
    "Custo",
    "Atualizado em",
    "Sincronizado em"
  )
  SELECT
    public.magalu_to_bigint_safe(a."ID"::text),
    public.magalu_to_bigint_safe(a."ID"::text),
    'Pikot Shop',
    a."ID Bling"::text,
    a."ID Tray"::text,
    a."ID Var"::text,
    a."Referência"::text,
    a."OD"::text,
    a."Nome"::text,
    a."Marca"::text,
    a."Categoria"::text,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    public.magalu_calc_custo_composicao(
      a."Código 1", a."Quantidade 1",
      a."Código 2", a."Quantidade 2",
      a."Código 3", a."Quantidade 3",
      a."Código 4", a."Quantidade 4",
      a."Código 5", a."Quantidade 5",
      a."Código 6", a."Quantidade 6",
      a."Código 7", a."Quantidade 7",
      a."Código 8", a."Quantidade 8",
      a."Código 9", a."Quantidade 9",
      a."Código 10", a."Quantidade 10"
    ),
    now(),
    now()
  FROM public.anuncios_pk a
  WHERE public.magalu_to_bigint_safe(a."ID"::text) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.marketplace_magalu_pk m
      WHERE m.anuncio_id = public.magalu_to_bigint_safe(a."ID"::text)
         OR m."ID" = public.magalu_to_bigint_safe(a."ID"::text)
    );

  UPDATE public.marketplace_magalu_pk m
  SET
    anuncio_id = public.magalu_to_bigint_safe(a."ID"::text),
    "ID" = public.magalu_to_bigint_safe(a."ID"::text),
    "Loja" = 'Pikot Shop',
    "ID Bling" = a."ID Bling"::text,
    "ID Tray" = a."ID Tray"::text,
    "ID Var" = a."ID Var"::text,
    "Referência" = a."Referência"::text,
    "OD" = a."OD"::text,
    "Nome" = a."Nome"::text,
    "Marca" = a."Marca"::text,
    "Categoria" = a."Categoria"::text,
    "Custo" = public.magalu_calc_custo_composicao(
      a."Código 1", a."Quantidade 1",
      a."Código 2", a."Quantidade 2",
      a."Código 3", a."Quantidade 3",
      a."Código 4", a."Quantidade 4",
      a."Código 5", a."Quantidade 5",
      a."Código 6", a."Quantidade 6",
      a."Código 7", a."Quantidade 7",
      a."Código 8", a."Quantidade 8",
      a."Código 9", a."Quantidade 9",
      a."Código 10", a."Quantidade 10"
    ),
    "Sincronizado em" = now()
  FROM public.anuncios_pk a
  WHERE public.magalu_to_bigint_safe(a."ID"::text) IS NOT NULL
    AND (
      m.anuncio_id = public.magalu_to_bigint_safe(a."ID"::text)
      OR m."ID" = public.magalu_to_bigint_safe(a."ID"::text)
    );

  INSERT INTO public.marketplace_magalu_sb (
    anuncio_id,
    "ID",
    "Loja",
    "ID Bling",
    "ID Tray",
    "ID Var",
    "Referência",
    "OD",
    "Nome",
    "Marca",
    "Categoria",
    "Desconto",
    "Embalagem",
    "Frete",
    "Comissão",
    "Imposto",
    "Margem de Lucro",
    "Marketing",
    "Custo",
    "Atualizado em",
    "Sincronizado em"
  )
  SELECT
    public.magalu_to_bigint_safe(a."ID"::text),
    public.magalu_to_bigint_safe(a."ID"::text),
    'Sóbaquetas',
    a."ID Bling"::text,
    a."ID Tray"::text,
    a."ID Var"::text,
    a."Referência"::text,
    a."OD"::text,
    a."Nome"::text,
    a."Marca"::text,
    a."Categoria"::text,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    public.magalu_calc_custo_composicao(
      a."Código 1", a."Quantidade 1",
      a."Código 2", a."Quantidade 2",
      a."Código 3", a."Quantidade 3",
      a."Código 4", a."Quantidade 4",
      a."Código 5", a."Quantidade 5",
      a."Código 6", a."Quantidade 6",
      a."Código 7", a."Quantidade 7",
      a."Código 8", a."Quantidade 8",
      a."Código 9", a."Quantidade 9",
      a."Código 10", a."Quantidade 10"
    ),
    now(),
    now()
  FROM public.anuncios_sb a
  WHERE public.magalu_to_bigint_safe(a."ID"::text) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.marketplace_magalu_sb m
      WHERE m.anuncio_id = public.magalu_to_bigint_safe(a."ID"::text)
         OR m."ID" = public.magalu_to_bigint_safe(a."ID"::text)
    );

  UPDATE public.marketplace_magalu_sb m
  SET
    anuncio_id = public.magalu_to_bigint_safe(a."ID"::text),
    "ID" = public.magalu_to_bigint_safe(a."ID"::text),
    "Loja" = 'Sóbaquetas',
    "ID Bling" = a."ID Bling"::text,
    "ID Tray" = a."ID Tray"::text,
    "ID Var" = a."ID Var"::text,
    "Referência" = a."Referência"::text,
    "OD" = a."OD"::text,
    "Nome" = a."Nome"::text,
    "Marca" = a."Marca"::text,
    "Categoria" = a."Categoria"::text,
    "Custo" = public.magalu_calc_custo_composicao(
      a."Código 1", a."Quantidade 1",
      a."Código 2", a."Quantidade 2",
      a."Código 3", a."Quantidade 3",
      a."Código 4", a."Quantidade 4",
      a."Código 5", a."Quantidade 5",
      a."Código 6", a."Quantidade 6",
      a."Código 7", a."Quantidade 7",
      a."Código 8", a."Quantidade 8",
      a."Código 9", a."Quantidade 9",
      a."Código 10", a."Quantidade 10"
    ),
    "Sincronizado em" = now()
  FROM public.anuncios_sb a
  WHERE public.magalu_to_bigint_safe(a."ID"::text) IS NOT NULL
    AND (
      m.anuncio_id = public.magalu_to_bigint_safe(a."ID"::text)
      OR m."ID" = public.magalu_to_bigint_safe(a."ID"::text)
    );

  PERFORM public.refresh_marketplace_magalu_variacoes_ref_count();
END;
$$;


ALTER FUNCTION "public"."sync_marketplace_magalu_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_marketplace_shopee_upsert"("p_shopee_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO marketplace_shopee (
    shopee_id_norm,
    id_bling_norm,
    payload,
    updated_at
  )
  VALUES (
    p_shopee_id_norm,
    p_id_bling_norm,
    p_payload,
    now()
  )
  ON CONFLICT ON CONSTRAINT ux_marketplace_shopee_id_bling_norm
  DO UPDATE SET
    payload    = EXCLUDED.payload,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."sync_marketplace_shopee_upsert"("p_shopee_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_marketplace_tray_all"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- ============================================================
  -- 🔹 CASO 1: INSERÇÃO OU ATUALIZAÇÃO
  -- ============================================================
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    INSERT INTO public."marketplace_tray_all" (
        "ID",
        "Loja",
        "ID Bling",
        "Referência",
        "ID Tray",
        "ID Var",
        "OD",
        "Nome",
        "Marca",
        "Categoria",
        "Desconto",
        "Embalagem",
        "Frete",
        "Comissão",
        "Imposto",
        "Margem de Lucro",
        "Marketing",
        "Custo",
        "Preço de Venda",
        "Atualizado em",
        "Sincronizado em"
    )
    VALUES (
        NEW."ID",
        COALESCE(NEW."Loja", CASE WHEN TG_TABLE_NAME = 'anuncios_pk' THEN 'Pikot Shop' ELSE 'Sóbaquetas' END),
        NEW."ID Bling",
        NEW."Referência",
        NEW."ID Tray",
        NEW."ID Var",
        NEW."OD",
        NEW."Nome",
        NEW."Marca",
        NEW."Categoria",
        NULL, -- Desconto
        NULL, -- Embalagem
        NULL, -- Frete
        NULL, -- Comissão
        NULL, -- Imposto
        NULL, -- Margem de Lucro
        NULL, -- Marketing
        NULL, -- Custo
        NULL, -- Preço de Venda
        NOW(), -- Atualizado em
        NOW()  -- Sincronizado em
    );
  END IF;

  -- ============================================================
  -- 🔹 CASO 2: EXCLUSÃO
  -- ============================================================
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public."marketplace_tray_all"
    WHERE "Referência" = OLD."Referência"
    AND "Loja" = COALESCE(OLD."Loja", CASE WHEN TG_TABLE_NAME = 'anuncios_pk' THEN 'Pikot Shop' ELSE 'Sóbaquetas' END);
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_marketplace_tray_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_marketplace_tray_pk_to_shopee_pk"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
declare
  j jsonb := to_jsonb(new);

  v_custo numeric := nullif(j->>'Custo','')::numeric;
  v_nome  text    := coalesce(j->>'Nome',  j->>'nome');
  v_marca text    := coalesce(j->>'Marca', j->>'marca');
  v_cat   text    := coalesce(j->>'Categoria', j->>'categoria');

  col_nome  text;
  col_marca text;
  col_cat   text;
  sql text;
begin
  -- Descobre como as colunas existem na Shopee (com ou sem maiúscula)
  col_nome := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='marketplace_shopee_pk' and column_name='Nome') then '"Nome"'
    else 'nome'
  end;

  col_marca := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='marketplace_shopee_pk' and column_name='Marca') then '"Marca"'
    else 'marca'
  end;

  col_cat := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='marketplace_shopee_pk' and column_name='Categoria') then '"Categoria"'
    else 'categoria'
  end;

  -- 1) UPDATE primeiro
  sql := format(
    'update public.marketplace_shopee_pk
        set "Custo" = $2,
            %s = $3,
            %s = $4,
            %s = $5
      where anuncio_id = $1',
    col_nome, col_marca, col_cat
  );

  execute sql using new.anuncio_id, v_custo, v_nome, v_marca, v_cat;

  if found then
    return new;
  end if;

  -- 2) INSERT se não existir
  sql := format(
    'insert into public.marketplace_shopee_pk (anuncio_id, "Custo", %s, %s, %s)
     values ($1, $2, $3, $4, $5)',
    col_nome, col_marca, col_cat
  );

  execute sql using new.anuncio_id, v_custo, v_nome, v_marca, v_cat;

  return new;
end;
$_$;


ALTER FUNCTION "public"."sync_marketplace_tray_pk_to_shopee_pk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_marketplace_tray_sb_to_shopee_sb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
declare
  j jsonb := to_jsonb(new);

  v_custo numeric := nullif(j->>'Custo','')::numeric;
  v_nome  text    := coalesce(j->>'Nome',  j->>'nome');
  v_marca text    := coalesce(j->>'Marca', j->>'marca');
  v_cat   text    := coalesce(j->>'Categoria', j->>'categoria');

  col_nome  text;
  col_marca text;
  col_cat   text;
  sql text;
begin
  col_nome := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='marketplace_shopee_sb' and column_name='Nome') then '"Nome"'
    else 'nome'
  end;

  col_marca := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='marketplace_shopee_sb' and column_name='Marca') then '"Marca"'
    else 'marca'
  end;

  col_cat := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='marketplace_shopee_sb' and column_name='Categoria') then '"Categoria"'
    else 'categoria'
  end;

  sql := format(
    'update public.marketplace_shopee_sb
        set "Custo" = $2,
            %s = $3,
            %s = $4,
            %s = $5
      where anuncio_id = $1',
    col_nome, col_marca, col_cat
  );

  execute sql using new.anuncio_id, v_custo, v_nome, v_marca, v_cat;

  if found then
    return new;
  end if;

  sql := format(
    'insert into public.marketplace_shopee_sb (anuncio_id, "Custo", %s, %s, %s)
     values ($1, $2, $3, $4, $5)',
    col_nome, col_marca, col_cat
  );

  execute sql using new.anuncio_id, v_custo, v_nome, v_marca, v_cat;

  return new;
end;
$_$;


ALTER FUNCTION "public"."sync_marketplace_tray_sb_to_shopee_sb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_marketplace_tray_upsert"("p_tray_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO marketplace_tray (
    tray_id_norm,
    id_bling_norm,
    payload,
    updated_at
  )
  VALUES (
    p_tray_id_norm,
    p_id_bling_norm,
    p_payload,
    now()
  )
  ON CONFLICT ON CONSTRAINT ux_marketplace_tray_id_bling_norm
  DO UPDATE SET
    payload    = EXCLUDED.payload,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."sync_marketplace_tray_upsert"("p_tray_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_precificacao_tray"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE "precificacao_tray"
  SET
    "Desconto"         = NULLIF(REGEXP_REPLACE(TRIM("Desconto"), '[^0-9,.-]', '', 'g'), ''),
    "Embalagem"        = NULLIF(REGEXP_REPLACE(TRIM("Embalagem"), '[^0-9,.-]', '', 'g'), ''),
    "Frete"            = NULLIF(REGEXP_REPLACE(TRIM("Frete"), '[^0-9,.-]', '', 'g'), ''),
    "Comissão"         = NULLIF(REGEXP_REPLACE(TRIM("Comissão"), '[^0-9,.-]', '', 'g'), ''),
    "Imposto"          = NULLIF(REGEXP_REPLACE(TRIM("Imposto"), '[^0-9,.-]', '', 'g'), ''),
    "Margem de Lucro"  = NULLIF(REGEXP_REPLACE(TRIM("Margem de Lucro"), '[^0-9,.-]', '', 'g'), ''),
    "Marketing"        = NULLIF(REGEXP_REPLACE(TRIM("Marketing"), '[^0-9,.-]', '', 'g'), ''),
    "Custo"            = NULLIF(REGEXP_REPLACE(TRIM("Custo"), '[^0-9,.-]', '', 'g'), ''),
    "Preço de Venda"   = NULLIF(REGEXP_REPLACE(TRIM("Preço de Venda"), '[^0-9,.-]', '', 'g'), '');

  UPDATE "precificacao_tray"
  SET "Preço de Venda" = ROUND(
    (
      COALESCE(NULLIF(REPLACE("Custo", ',', '.')::NUMERIC, 0), 0) +
      COALESCE(NULLIF(REPLACE("Frete", ',', '.')::NUMERIC, 0), 0) +
      COALESCE(NULLIF(REPLACE("Embalagem", ',', '.')::NUMERIC, 0), 0)
    ) / NULLIF(
      1 - (
        (
          COALESCE(NULLIF(REPLACE("Imposto", ',', '.')::NUMERIC, 0), 0) +
          COALESCE(NULLIF(REPLACE("Comissão", ',', '.')::NUMERIC, 0), 0) +
          COALESCE(NULLIF(REPLACE("Margem de Lucro", ',', '.')::NUMERIC, 0), 0) +
          COALESCE(NULLIF(REPLACE("Marketing", ',', '.')::NUMERIC, 0), 0)
        ) / 100
      ),
      0
    ), 2
  )::TEXT
  WHERE "Custo" IS NOT NULL AND TRIM("Custo") <> '';

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_precificacao_tray"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_status_legacy_tables"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- public.status_usuario
  update public.status_usuario
  set
    status = new.status,
    ultima_atividade = coalesce(new.last_seen_at, now()),
    atualizado_em = now()
  where usuario_id = new.id;

  if not found then
    insert into public.status_usuario (
      id,
      usuario_id,
      status,
      ultima_atividade,
      atualizado_em
    ) values (
      gen_random_uuid(),
      new.id,
      new.status,
      coalesce(new.last_seen_at, now()),
      now()
    );
  end if;

  -- public.usuarios
  update public.usuarios
  set
    nome = coalesce(new.name, public.usuarios.nome),
    email = coalesce(new.email, public.usuarios.email),
    avatar_url = coalesce(new.avatar_url, public.usuarios.avatar_url),
    status = new.status,
    ultima_atividade = coalesce(new.last_seen_at, public.usuarios.ultima_atividade, now())
  where id = new.id;

  if not found then
    insert into public.usuarios (
      id,
      nome,
      email,
      avatar_url,
      status,
      ultima_atividade,
      criado_em
    ) values (
      new.id,
      coalesce(new.name, 'Usuário'),
      new.email,
      new.avatar_url,
      new.status,
      coalesce(new.last_seen_at, now()),
      now()
    );
  end if;

  return new;
exception
  when undefined_table then
    return new;
end;
$$;


ALTER FUNCTION "public"."sync_profile_status_legacy_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tipo_material_variacao"("p_referencia" "text", "p_nome" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  ref_norm text;
  nome_norm text;
BEGIN
  ref_norm := public.normalizar_ref_variacao(p_referencia);
  nome_norm := lower(COALESCE(p_nome, ''));

  IF ref_norm LIKE 'PAI-%' THEN
    RETURN 'PAI';
  END IF;

  IF ref_norm LIKE 'VAR-%' THEN
    RETURN 'VAR';
  END IF;

  IF nome_norm LIKE '%variação%' OR nome_norm LIKE '%variacao%' THEN
    RETURN 'VAR';
  END IF;

  RETURN 'NORMAL';
END;
$$;


ALTER FUNCTION "public"."tipo_material_variacao"("p_referencia" "text", "p_nome" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tipo_ref_variacao"("p_ref" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when public.is_ref_variacao_novo_padrao(p_ref)
      and upper(trim(coalesce(p_ref, ''))) like 'PAI-%'
    then 'PAI'

    when public.is_ref_variacao_novo_padrao(p_ref)
      and upper(trim(coalesce(p_ref, ''))) like 'VAR-%'
    then 'VAR'

    else null
  end;
$$;


ALTER FUNCTION "public"."tipo_ref_variacao"("p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_my_profile_presence"() RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  update public.profiles
  set
    last_seen_at = now(),
    updated_at = now()
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile não encontrado para o usuário autenticado.';
  end if;

  return v_profile;
end;
$$;


ALTER FUNCTION "public"."touch_my_profile_presence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_anuncios_recalcular_marketplaces"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    perform public.atualizar_marketplaces_por_anuncio(tg_table_name, new."ID");
    return new;
end;
$$;


ALTER FUNCTION "public"."trg_anuncios_recalcular_marketplaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_calc_preco_magalu"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."Loja" := COALESCE(
    public.normalizar_loja_magalu(NEW."Loja"),
    CASE
      WHEN TG_TABLE_NAME = 'marketplace_magalu_pk' THEN 'Pikot Shop'
      WHEN TG_TABLE_NAME = 'marketplace_magalu_sb' THEN 'Sóbaquetas'
      ELSE NEW."Loja"
    END
  );

  NEW."Preço de Venda" := public.calcular_preco_venda_magalu(
    COALESCE(NEW."Custo", 0),
    COALESCE(NEW."Desconto", 0),
    COALESCE(NEW."Embalagem", 0),
    COALESCE(NEW."Frete", 0),
    COALESCE(NEW."Comissão", 0),
    COALESCE(NEW."Imposto", 0),
    COALESCE(NEW."Margem de Lucro", 0),
    COALESCE(NEW."Marketing", 0)
  );

  NEW."Atualizado em" := now();

  IF TG_OP = 'INSERT' AND NEW."Sincronizado em" IS NULL THEN
    NEW."Sincronizado em" := now();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_calc_preco_magalu"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_calc_preco_text"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  preco NUMERIC;
BEGIN
  preco := calcular_preco_venda(
    NEW."Desconto",
    NEW."Embalagem",
    NEW."Frete",
    NEW."Comissão",
    NEW."Imposto",
    NEW."Margem de Lucro",
    NEW."Marketing",
    NEW."Custo"
  );

  NEW."Preço de Venda" := preco::TEXT;
  NEW."Atualizado em" := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_calc_preco_text"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_create_marketplace_shopee_pk"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "marketplace_shopee_pk" (
      anuncio_id,
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Atualizado em"
  )
  VALUES (
      NEW."ID",                 -- ✅ AJUSTE AQUI: nome real do ID em anuncios_pk
      NEW."Loja",               -- ✅ se existir em anuncios_pk; senão, remova
      NEW."ID Bling",           -- ✅ se existir em anuncios_pk; senão, remova
      NEW."ID Tray",            -- ✅ se existir em anuncios_pk; senão, remova
      NEW."ID Var",             -- ✅ se existir em anuncios_pk; senão, remova
      NEW."Referência",         -- ✅ se existir em anuncios_pk; senão, remova
      NEW."OD",                 -- ✅ se existir em anuncios_pk; senão, remova
      NEW."Nome",               -- ✅ se existir em anuncios_pk; senão, remova
      NEW."Marca",              -- ✅ se existir em anuncios_pk; senão, remova
      NEW."Categoria",          -- ✅ se existir em anuncios_pk; senão, remova
      now()
  )
  ON CONFLICT (anuncio_id) DO NOTHING;  -- se já existe, não duplica

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_create_marketplace_shopee_pk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_create_marketplace_shopee_pk_from_anuncios"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "marketplace_shopee_pk" ("ID", anuncio_id, "ID Tray", "Atualizado em")
  VALUES (NEW."ID", NEW."ID", NEW."ID Tray", now())
  ON CONFLICT ("ID") DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_create_marketplace_shopee_pk_from_anuncios"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_custos_enfileirar_recalculo"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    r record;
    v_codigo text;
begin
    v_codigo := nullif(btrim(new."Código"), '');

    if v_codigo is null then
        return new;
    end if;

    if tg_op = 'UPDATE'
       and coalesce(old."Custo Atual", 0) = coalesce(new."Custo Atual", 0)
       and coalesce(nullif(btrim(old."Código"), ''), '') = v_codigo then
        return new;
    end if;

    for r in
        select "ID", "ID Bling"
        from public.anuncios_pk
        where v_codigo in (
            nullif(btrim("Código 1"), ''),
            nullif(btrim("Código 2"), ''),
            nullif(btrim("Código 3"), ''),
            nullif(btrim("Código 4"), ''),
            nullif(btrim("Código 5"), ''),
            nullif(btrim("Código 6"), ''),
            nullif(btrim("Código 7"), ''),
            nullif(btrim("Código 8"), ''),
            nullif(btrim("Código 9"), ''),
            nullif(btrim("Código 10"), '')
        )
    loop
        perform public.enfileirar_recalculo_anuncio(
            'anuncios_pk',
            r."ID",
            r."ID Bling",
            'custo'
        );
    end loop;

    for r in
        select "ID", "ID Bling"
        from public.anuncios_sb
        where v_codigo in (
            nullif(btrim("Código 1"), ''),
            nullif(btrim("Código 2"), ''),
            nullif(btrim("Código 3"), ''),
            nullif(btrim("Código 4"), ''),
            nullif(btrim("Código 5"), ''),
            nullif(btrim("Código 6"), ''),
            nullif(btrim("Código 7"), ''),
            nullif(btrim("Código 8"), ''),
            nullif(btrim("Código 9"), ''),
            nullif(btrim("Código 10"), '')
        )
    loop
        perform public.enfileirar_recalculo_anuncio(
            'anuncios_sb',
            r."ID",
            r."ID Bling",
            'custo'
        );
    end loop;

    return new;
end;
$$;


ALTER FUNCTION "public"."trg_custos_enfileirar_recalculo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_custos_recalcular_marketplaces"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    r record;
    v_codigo text;
begin
    v_codigo := nullif(btrim(new."Código"), '');

    if v_codigo is null then
        return new;
    end if;

    if tg_op = 'UPDATE'
       and coalesce(old."Custo Atual", 0) = coalesce(new."Custo Atual", 0)
       and coalesce(nullif(btrim(old."Código"), ''), '') = coalesce(v_codigo, '') then
        return new;
    end if;

    for r in
        select a."ID"
        from public.anuncios_pk a
        where v_codigo in (
            nullif(btrim(a."Código 1"), ''),
            nullif(btrim(a."Código 2"), ''),
            nullif(btrim(a."Código 3"), ''),
            nullif(btrim(a."Código 4"), ''),
            nullif(btrim(a."Código 5"), ''),
            nullif(btrim(a."Código 6"), ''),
            nullif(btrim(a."Código 7"), ''),
            nullif(btrim(a."Código 8"), ''),
            nullif(btrim(a."Código 9"), ''),
            nullif(btrim(a."Código 10"), '')
        )
    loop
        perform public.atualizar_marketplaces_por_anuncio('anuncios_pk', r."ID");
    end loop;

    for r in
        select a."ID"
        from public.anuncios_sb a
        where v_codigo in (
            nullif(btrim(a."Código 1"), ''),
            nullif(btrim(a."Código 2"), ''),
            nullif(btrim(a."Código 3"), ''),
            nullif(btrim(a."Código 4"), ''),
            nullif(btrim(a."Código 5"), ''),
            nullif(btrim(a."Código 6"), ''),
            nullif(btrim(a."Código 7"), ''),
            nullif(btrim(a."Código 8"), ''),
            nullif(btrim(a."Código 9"), ''),
            nullif(btrim(a."Código 10"), '')
        )
    loop
        perform public.atualizar_marketplaces_por_anuncio('anuncios_sb', r."ID");
    end loop;

    return new;
end;
$$;


ALTER FUNCTION "public"."trg_custos_recalcular_marketplaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_marketplace_pk_id_equals_anuncio_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW."ID" IS NULL THEN
    NEW."ID" := NEW.anuncio_id;
  END IF;

  IF NEW."ID" <> NEW.anuncio_id THEN
    RAISE EXCEPTION '"ID" (%) deve ser igual a anuncio_id (%)', NEW."ID", NEW.anuncio_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_marketplace_pk_id_equals_anuncio_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_marketplace_shopee_enforce_id_anuncio_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new."ID" is null and new.anuncio_id is not null then
    new."ID" := new.anuncio_id;
  end if;

  if new.anuncio_id is null and new."ID" is not null then
    new.anuncio_id := new."ID";
  end if;

  if new."ID" is not null
     and new.anuncio_id is not null
     and new."ID"::text <> new.anuncio_id::text then
    raise exception '"ID" (%) deve ser igual a anuncio_id (%)',
      new."ID", new.anuncio_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_marketplace_shopee_enforce_id_anuncio_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_marketplace_shopee_touch_pricing_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if
    old."Desconto" is distinct from new."Desconto"
    or old."Embalagem" is distinct from new."Embalagem"
    or old."Frete" is distinct from new."Frete"
    or old."Comissão" is distinct from new."Comissão"
    or old."Imposto" is distinct from new."Imposto"
    or old."Marketing" is distinct from new."Marketing"
    or old."Margem de Lucro" is distinct from new."Margem de Lucro"
    or old."Preço de Venda" is distinct from new."Preço de Venda"
  then
    new."Atualizado em" := now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_marketplace_shopee_touch_pricing_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_normalizar_custos"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se vier NULL, mantém NULL
  IF NEW."Custo Atual" IS NULL THEN
    NEW."Custo Atual" := NULL;
  END IF;

  IF NEW."Custo Antigo" IS NULL THEN
    NEW."Custo Antigo" := NULL;
  END IF;

  -- Garante duas casas decimais
  NEW."Custo Atual" := ROUND(NEW."Custo Atual"::numeric, 2);
  NEW."Custo Antigo" := ROUND(NEW."Custo Antigo"::numeric, 2);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_normalizar_custos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_normalizar_numeros"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Corrige campos principais
  NEW."Peso" := NULLIF(REPLACE(NEW."Peso"::text, ',', '.'), '')::numeric;
  NEW."Altura" := NULLIF(REPLACE(NEW."Altura"::text, ',', '.'), '')::numeric;
  NEW."Largura" := NULLIF(REPLACE(NEW."Largura"::text, ',', '.'), '')::numeric;
  NEW."Comprimento" := NULLIF(REPLACE(NEW."Comprimento"::text, ',', '.'), '')::numeric;

  -- Corrige campos de quantidade
  NEW."Quantidade 1" := NULLIF(REPLACE(NEW."Quantidade 1"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 2" := NULLIF(REPLACE(NEW."Quantidade 2"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 3" := NULLIF(REPLACE(NEW."Quantidade 3"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 4" := NULLIF(REPLACE(NEW."Quantidade 4"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 5" := NULLIF(REPLACE(NEW."Quantidade 5"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 6" := NULLIF(REPLACE(NEW."Quantidade 6"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 7" := NULLIF(REPLACE(NEW."Quantidade 7"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 8" := NULLIF(REPLACE(NEW."Quantidade 8"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 9" := NULLIF(REPLACE(NEW."Quantidade 9"::text, ',', '.'), '')::numeric;
  NEW."Quantidade 10" := NULLIF(REPLACE(NEW."Quantidade 10"::text, ',', '.'), '')::numeric;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_normalizar_numeros"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_recalc_magalu_on_custos_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_codigo text;
BEGIN
  v_codigo := COALESCE(NEW."Código", OLD."Código");

  IF NULLIF(trim(COALESCE(v_codigo, '')), '') IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.marketplace_magalu_pk m
  SET
    "Custo" = public.magalu_calc_custo_composicao(
      a."Código 1", a."Quantidade 1",
      a."Código 2", a."Quantidade 2",
      a."Código 3", a."Quantidade 3",
      a."Código 4", a."Quantidade 4",
      a."Código 5", a."Quantidade 5",
      a."Código 6", a."Quantidade 6",
      a."Código 7", a."Quantidade 7",
      a."Código 8", a."Quantidade 8",
      a."Código 9", a."Quantidade 9",
      a."Código 10", a."Quantidade 10"
    ),
    "Sincronizado em" = now()
  FROM public.anuncios_pk a
  WHERE m.anuncio_id::text = a."ID"::text
    AND v_codigo IN (
      a."Código 1", a."Código 2", a."Código 3", a."Código 4", a."Código 5",
      a."Código 6", a."Código 7", a."Código 8", a."Código 9", a."Código 10"
    );

  UPDATE public.marketplace_magalu_sb m
  SET
    "Custo" = public.magalu_calc_custo_composicao(
      a."Código 1", a."Quantidade 1",
      a."Código 2", a."Quantidade 2",
      a."Código 3", a."Quantidade 3",
      a."Código 4", a."Quantidade 4",
      a."Código 5", a."Quantidade 5",
      a."Código 6", a."Quantidade 6",
      a."Código 7", a."Quantidade 7",
      a."Código 8", a."Quantidade 8",
      a."Código 9", a."Quantidade 9",
      a."Código 10", a."Quantidade 10"
    ),
    "Sincronizado em" = now()
  FROM public.anuncios_sb a
  WHERE m.anuncio_id::text = a."ID"::text
    AND v_codigo IN (
      a."Código 1", a."Código 2", a."Código 3", a."Código 4", a."Código 5",
      a."Código 6", a."Código 7", a."Código 8", a."Código 9", a."Código 10"
    );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trg_recalc_magalu_on_custos_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_recalc_on_custo_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_codigo text;
begin
  v_codigo := trim(coalesce(new."Código", new."Codigo", ''));

  if v_codigo = '' then
    return new;
  end if;

  -- Força update nos anúncios PK que usam o código
  update public.anuncios_pk
  set "Atualizado em" = now()
  where v_codigo in (
    trim(coalesce("Código 1", '')), trim(coalesce("Código 2", '')), trim(coalesce("Código 3", '')),
    trim(coalesce("Código 4", '')), trim(coalesce("Código 5", '')), trim(coalesce("Código 6", '')),
    trim(coalesce("Código 7", '')), trim(coalesce("Código 8", '')), trim(coalesce("Código 9", '')),
    trim(coalesce("Código 10", ''))
  );

  -- Força update nos anúncios SB que usam o código
  update public.anuncios_sb
  set "Atualizado em" = now()
  where v_codigo in (
    trim(coalesce("Código 1", '')), trim(coalesce("Código 2", '')), trim(coalesce("Código 3", '')),
    trim(coalesce("Código 4", '')), trim(coalesce("Código 5", '')), trim(coalesce("Código 6", '')),
    trim(coalesce("Código 7", '')), trim(coalesce("Código 8", '')), trim(coalesce("Código 9", '')),
    trim(coalesce("Código 10", ''))
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_recalc_on_custo_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_magalu_marketplace_variacoes_ref_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_loja_old text;
  v_loja_new text;
  v_key_old text;
  v_key_new text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_loja_old := public.normalizar_loja_magalu(OLD."Loja");
    v_key_old := public.ref_sem_tipo(OLD."Referência");

    PERFORM public.refresh_marketplace_magalu_variacoes_ref_count_key(
      v_loja_old,
      v_key_old
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_loja_new := public.normalizar_loja_magalu(NEW."Loja");
    v_key_new := public.ref_sem_tipo(NEW."Referência");

    PERFORM public.refresh_marketplace_magalu_variacoes_ref_count_key(
      v_loja_new,
      v_key_new
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trg_refresh_magalu_marketplace_variacoes_ref_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_marketplace_shopee_variacoes_ref_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_loja text;
  v_old_chave text;
  v_new_chave text;
begin
  v_loja := TG_ARGV[0];

  if TG_OP = 'INSERT' then
    v_new_chave := public.shopee_ref_chave(NEW."Referência");

    if v_new_chave is not null then
      perform public.refresh_marketplace_shopee_variacoes_ref_count_key(
        v_loja,
        v_new_chave
      );
    end if;

    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    v_old_chave := public.shopee_ref_chave(OLD."Referência");
    v_new_chave := public.shopee_ref_chave(NEW."Referência");

    if v_old_chave is not null then
      perform public.refresh_marketplace_shopee_variacoes_ref_count_key(
        v_loja,
        v_old_chave
      );
    end if;

    if v_new_chave is not null and v_new_chave is distinct from v_old_chave then
      perform public.refresh_marketplace_shopee_variacoes_ref_count_key(
        v_loja,
        v_new_chave
      );
    end if;

    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    v_old_chave := public.shopee_ref_chave(OLD."Referência");

    if v_old_chave is not null then
      perform public.refresh_marketplace_shopee_variacoes_ref_count_key(
        v_loja,
        v_old_chave
      );
    end if;

    return OLD;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_refresh_marketplace_shopee_variacoes_ref_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_variacoes_ref_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.refresh_variacoes_ref_count();
  return null;
end;
$$;


ALTER FUNCTION "public"."trg_refresh_variacoes_ref_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_pk"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_custo_total numeric;
  v_tem_codigo_sem_custo boolean;
BEGIN
  IF NEW."ID Bling" IS NULL THEN
    RETURN NEW;
  END IF;

  WITH itens AS (
    SELECT
      NULLIF(TRIM(codigo), '') AS codigo,
      CASE
        WHEN qtd_txt IS NULL OR TRIM(qtd_txt) = '' THEN 0
        ELSE REPLACE(TRIM(qtd_txt), ',', '.')::numeric
      END AS qtd
    FROM (
      SELECT
        unnest(ARRAY[
          NEW."Código 1", NEW."Código 2", NEW."Código 3", NEW."Código 4", NEW."Código 5",
          NEW."Código 6", NEW."Código 7", NEW."Código 8", NEW."Código 9", NEW."Código 10"
        ]) AS codigo,
        unnest(ARRAY[
          NEW."Quantidade 1", NEW."Quantidade 2", NEW."Quantidade 3", NEW."Quantidade 4", NEW."Quantidade 5",
          NEW."Quantidade 6", NEW."Quantidade 7", NEW."Quantidade 8", NEW."Quantidade 9", NEW."Quantidade 10"
        ]) AS qtd_txt
    ) x
  ),
  itens_validos AS (
    SELECT *
    FROM itens
    WHERE codigo IS NOT NULL
      AND qtd > 0
  )
  SELECT EXISTS (
    SELECT 1
    FROM itens_validos i
    LEFT JOIN public.custos c
      ON TRIM(c."Código") = TRIM(i.codigo)
    WHERE c."Código" IS NULL
  )
  INTO v_tem_codigo_sem_custo;

  IF v_tem_codigo_sem_custo THEN
    RETURN NEW;
  END IF;

  WITH itens AS (
    SELECT
      NULLIF(TRIM(codigo), '') AS codigo,
      CASE
        WHEN qtd_txt IS NULL OR TRIM(qtd_txt) = '' THEN 0
        ELSE REPLACE(TRIM(qtd_txt), ',', '.')::numeric
      END AS qtd
    FROM (
      SELECT
        unnest(ARRAY[
          NEW."Código 1", NEW."Código 2", NEW."Código 3", NEW."Código 4", NEW."Código 5",
          NEW."Código 6", NEW."Código 7", NEW."Código 8", NEW."Código 9", NEW."Código 10"
        ]) AS codigo,
        unnest(ARRAY[
          NEW."Quantidade 1", NEW."Quantidade 2", NEW."Quantidade 3", NEW."Quantidade 4", NEW."Quantidade 5",
          NEW."Quantidade 6", NEW."Quantidade 7", NEW."Quantidade 8", NEW."Quantidade 9", NEW."Quantidade 10"
        ]) AS qtd_txt
    ) x
  )
  SELECT SUM(i.qtd * c."Custo Atual")
  INTO v_custo_total
  FROM itens i
  JOIN public.custos c
    ON TRIM(c."Código") = TRIM(i.codigo)
  WHERE i.codigo IS NOT NULL
    AND i.qtd > 0;

  IF v_custo_total IS NULL OR v_custo_total <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.marketplace_tray_pk
     SET "Custo" = ROUND(v_custo_total, 2)
   WHERE "ID Bling" = NEW."ID Bling";

  UPDATE public.marketplace_shopee_pk
     SET "Custo" = ROUND(v_custo_total, 2)
   WHERE "ID Bling" = NEW."ID Bling";

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_pk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_sb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_custo_total numeric;
  v_tem_codigo_sem_custo boolean;
BEGIN
  IF NEW."ID Bling" IS NULL THEN
    RETURN NEW;
  END IF;

  WITH itens AS (
    SELECT
      NULLIF(TRIM(codigo), '') AS codigo,
      CASE
        WHEN qtd_txt IS NULL OR TRIM(qtd_txt) = '' THEN 0
        ELSE REPLACE(TRIM(qtd_txt), ',', '.')::numeric
      END AS qtd
    FROM (
      SELECT
        unnest(ARRAY[
          NEW."Código 1", NEW."Código 2", NEW."Código 3", NEW."Código 4", NEW."Código 5",
          NEW."Código 6", NEW."Código 7", NEW."Código 8", NEW."Código 9", NEW."Código 10"
        ]) AS codigo,
        unnest(ARRAY[
          NEW."Quantidade 1", NEW."Quantidade 2", NEW."Quantidade 3", NEW."Quantidade 4", NEW."Quantidade 5",
          NEW."Quantidade 6", NEW."Quantidade 7", NEW."Quantidade 8", NEW."Quantidade 9", NEW."Quantidade 10"
        ]) AS qtd_txt
    ) x
  ),
  itens_validos AS (
    SELECT *
    FROM itens
    WHERE codigo IS NOT NULL
      AND qtd > 0
  )
  SELECT EXISTS (
    SELECT 1
    FROM itens_validos i
    LEFT JOIN public.custos c
      ON TRIM(c."Código") = TRIM(i.codigo)
    WHERE c."Código" IS NULL
  )
  INTO v_tem_codigo_sem_custo;

  IF v_tem_codigo_sem_custo THEN
    RETURN NEW;
  END IF;

  WITH itens AS (
    SELECT
      NULLIF(TRIM(codigo), '') AS codigo,
      CASE
        WHEN qtd_txt IS NULL OR TRIM(qtd_txt) = '' THEN 0
        ELSE REPLACE(TRIM(qtd_txt), ',', '.')::numeric
      END AS qtd
    FROM (
      SELECT
        unnest(ARRAY[
          NEW."Código 1", NEW."Código 2", NEW."Código 3", NEW."Código 4", NEW."Código 5",
          NEW."Código 6", NEW."Código 7", NEW."Código 8", NEW."Código 9", NEW."Código 10"
        ]) AS codigo,
        unnest(ARRAY[
          NEW."Quantidade 1", NEW."Quantidade 2", NEW."Quantidade 3", NEW."Quantidade 4", NEW."Quantidade 5",
          NEW."Quantidade 6", NEW."Quantidade 7", NEW."Quantidade 8", NEW."Quantidade 9", NEW."Quantidade 10"
        ]) AS qtd_txt
    ) x
  )
  SELECT SUM(i.qtd * c."Custo Atual")
  INTO v_custo_total
  FROM itens i
  JOIN public.custos c
    ON TRIM(c."Código") = TRIM(i.codigo)
  WHERE i.codigo IS NOT NULL
    AND i.qtd > 0;

  IF v_custo_total IS NULL OR v_custo_total <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.marketplace_tray_sb
     SET "Custo" = ROUND(v_custo_total, 2)
   WHERE "ID Bling" = NEW."ID Bling";

  UPDATE public.marketplace_shopee_sb
     SET "Custo" = ROUND(v_custo_total, 2)
   WHERE "ID Bling" = NEW."ID Bling";

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_sb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_preco_venda_shopee"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."Preço de Venda" :=
    public.fn_calc_preco_venda_shopee(
      NEW."Custo",
      NEW."Desconto",
      NEW."Embalagem",
      NEW."Frete",
      NEW."Comissão",
      NEW."Imposto",
      NEW."Margem de Lucro",
      NEW."Marketing"
    );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_preco_venda_shopee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_preco_venda_tray"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."Preço de Venda" :=
    public.fn_calc_preco_venda_tray(
      NEW."Custo",
      NEW."Desconto",
      NEW."Embalagem",
      NEW."Frete",
      NEW."Comissão",
      NEW."Imposto",
      NEW."Margem de Lucro",
      NEW."Marketing"
    );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_preco_venda_tray"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_sync_anuncios_sb_to_marketplace"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.marketplace_tray_sb (
      anuncio_id,
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Atualizado em"
  )
  VALUES (
      NEW."ID",
      NEW."ID Bling",
      NEW."ID Tray",
      NEW."ID Var",
      NEW."Referência",
      NEW."OD",
      NEW."Nome",
      NEW."Marca",
      NEW."Categoria",
      NOW()
  )
  ON CONFLICT ("ID Bling") DO UPDATE
  SET
      anuncio_id     = EXCLUDED.anuncio_id,
      "ID Tray"      = EXCLUDED."ID Tray",
      "ID Var"       = EXCLUDED."ID Var",
      "Referência"   = EXCLUDED."Referência",
      "OD"           = EXCLUDED."OD",
      "Nome"         = EXCLUDED."Nome",
      "Marca"        = EXCLUDED."Marca",
      "Categoria"    = EXCLUDED."Categoria",
      "Atualizado em" = NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_sync_anuncios_sb_to_marketplace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_upd_marketplace_tray_all"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.SUA_TABELA_BASE_TRAY
  set custo = new.custo
  where "ID Bling" = new."ID Bling";
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_upd_marketplace_tray_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_upd_shopee_all"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.SUA_TABELA_BASE_SHOPEE
  set custo = new.custo
  where "ID Bling" = new."ID Bling";
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_upd_shopee_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_feedback_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  _fid bigint;
begin
  -- Em DELETE, NEW é nulo; em INSERT/UPDATE, OLD pode ser nulo.
  _fid := coalesce(new.feedback_id, old.feedback_id);
  perform public.update_feedback_votes(_fid);
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."trigger_update_feedback_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_update_feedback_counts"() IS 'Trigger que mantém os contadores sincronizados após insert/update/delete em votes.';



CREATE OR REPLACE FUNCTION "public"."update_feedback_votes"("feedback_id_param" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update public.feedbacks f
     set upvotes   = (select count(*) from public.feedback_votes v where v.feedback_id = f.id and v.voto = 'up'),
         downvotes = (select count(*) from public.feedback_votes v where v.feedback_id = f.id and v.voto = 'down')
   where f.id = feedback_id_param;
end;
$$;


ALTER FUNCTION "public"."update_feedback_votes"("feedback_id_param" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_feedback_votes"("feedback_id_param" bigint) IS 'Recalcula upvotes/downvotes de um feedback.';



CREATE OR REPLACE FUNCTION "public"."update_magalu_pricing_batch_pk"("payload" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  item jsonb;
  v_count integer := 0;
  v_id uuid;
  v_anuncio_id bigint;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    v_id := NULL;
    v_anuncio_id := NULL;

    IF NULLIF(item->>'id', '') IS NOT NULL THEN
      BEGIN
        v_id := (item->>'id')::uuid;
      EXCEPTION WHEN others THEN
        v_id := NULL;
      END;
    END IF;

    IF NULLIF(item->>'anuncio_id', '') IS NOT NULL THEN
      v_anuncio_id := public.magalu_to_bigint_safe(item->>'anuncio_id');
    ELSIF NULLIF(item->>'ID', '') IS NOT NULL THEN
      v_anuncio_id := public.magalu_to_bigint_safe(item->>'ID');
    END IF;

    UPDATE public.marketplace_magalu_pk m
    SET
      "Desconto" = CASE WHEN item ? 'Desconto' THEN public.safe_to_numeric(item->>'Desconto') ELSE m."Desconto" END,
      "Embalagem" = CASE WHEN item ? 'Embalagem' THEN public.safe_to_numeric(item->>'Embalagem') ELSE m."Embalagem" END,
      "Frete" = CASE WHEN item ? 'Frete' THEN public.safe_to_numeric(item->>'Frete') ELSE m."Frete" END,
      "Comissão" = CASE WHEN item ? 'Comissão' THEN public.safe_to_numeric(item->>'Comissão') ELSE m."Comissão" END,
      "Imposto" = CASE WHEN item ? 'Imposto' THEN public.safe_to_numeric(item->>'Imposto') ELSE m."Imposto" END,
      "Margem de Lucro" = CASE WHEN item ? 'Margem de Lucro' THEN public.safe_to_numeric(item->>'Margem de Lucro') ELSE m."Margem de Lucro" END,
      "Marketing" = CASE WHEN item ? 'Marketing' THEN public.safe_to_numeric(item->>'Marketing') ELSE m."Marketing" END,
      "Custo" = CASE WHEN item ? 'Custo' THEN public.safe_to_numeric(item->>'Custo') ELSE m."Custo" END,
      "Atualizado em" = now()
    WHERE
      (v_id IS NOT NULL AND m.id = v_id)
      OR
      (v_anuncio_id IS NOT NULL AND m.anuncio_id = v_anuncio_id);

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."update_magalu_pricing_batch_pk"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_magalu_pricing_batch_sb"("payload" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  item jsonb;
  v_count integer := 0;
  v_id uuid;
  v_anuncio_id bigint;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    v_id := NULL;
    v_anuncio_id := NULL;

    IF NULLIF(item->>'id', '') IS NOT NULL THEN
      BEGIN
        v_id := (item->>'id')::uuid;
      EXCEPTION WHEN others THEN
        v_id := NULL;
      END;
    END IF;

    IF NULLIF(item->>'anuncio_id', '') IS NOT NULL THEN
      v_anuncio_id := public.magalu_to_bigint_safe(item->>'anuncio_id');
    ELSIF NULLIF(item->>'ID', '') IS NOT NULL THEN
      v_anuncio_id := public.magalu_to_bigint_safe(item->>'ID');
    END IF;

    UPDATE public.marketplace_magalu_sb m
    SET
      "Desconto" = CASE WHEN item ? 'Desconto' THEN public.safe_to_numeric(item->>'Desconto') ELSE m."Desconto" END,
      "Embalagem" = CASE WHEN item ? 'Embalagem' THEN public.safe_to_numeric(item->>'Embalagem') ELSE m."Embalagem" END,
      "Frete" = CASE WHEN item ? 'Frete' THEN public.safe_to_numeric(item->>'Frete') ELSE m."Frete" END,
      "Comissão" = CASE WHEN item ? 'Comissão' THEN public.safe_to_numeric(item->>'Comissão') ELSE m."Comissão" END,
      "Imposto" = CASE WHEN item ? 'Imposto' THEN public.safe_to_numeric(item->>'Imposto') ELSE m."Imposto" END,
      "Margem de Lucro" = CASE WHEN item ? 'Margem de Lucro' THEN public.safe_to_numeric(item->>'Margem de Lucro') ELSE m."Margem de Lucro" END,
      "Marketing" = CASE WHEN item ? 'Marketing' THEN public.safe_to_numeric(item->>'Marketing') ELSE m."Marketing" END,
      "Custo" = CASE WHEN item ? 'Custo' THEN public.safe_to_numeric(item->>'Custo') ELSE m."Custo" END,
      "Atualizado em" = now()
    WHERE
      (v_id IS NOT NULL AND m.id = v_id)
      OR
      (v_anuncio_id IS NOT NULL AND m.anuncio_id = v_anuncio_id);

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."update_magalu_pricing_batch_sb"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pricing_batch_pk"("payload" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  updated_count integer := 0;
begin
  with rows as (
    select
      (r->>'id')::bigint as "ID",
      nullif(r->>'desconto','')::numeric as desconto,
      nullif(r->>'embalagem','')::numeric as embalagem,
      nullif(r->>'frete','')::numeric as frete,
      nullif(r->>'comissao','')::numeric as comissao,
      nullif(r->>'imposto','')::numeric as imposto,
      nullif(r->>'margem_de_lucro','')::numeric as margem_de_lucro,
      nullif(r->>'marketing','')::numeric as marketing,
      nullif(r->>'custo','')::numeric as custo,
      nullif(r->>'preco_de_venda','')::numeric as preco_de_venda
    from jsonb_array_elements(payload) r
  )
  update public.marketplace_shopee_pk t
  set
    "Desconto" = coalesce(rows.desconto, t."Desconto"),
    "Embalagem" = coalesce(rows.embalagem, t."Embalagem"),
    "Frete" = coalesce(rows.frete, t."Frete"),
    "Comissão" = coalesce(rows.comissao, t."Comissão"),
    "Imposto" = coalesce(rows.imposto, t."Imposto"),
    "Margem de Lucro" = coalesce(rows.margem_de_lucro, t."Margem de Lucro"),
    "Marketing" = coalesce(rows.marketing, t."Marketing"),
    "Custo" = coalesce(rows.custo, t."Custo"),
    "Preço de Venda" = coalesce(rows.preco_de_venda, t."Preço de Venda"),
    "Atualizado em" = now()
  from rows
  where t."ID" = rows."ID";

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;


ALTER FUNCTION "public"."update_pricing_batch_pk"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pricing_batch_sb"("payload" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  updated_count integer := 0;
begin
  with rows as (
    select
      (r->>'id')::bigint as "ID",
      nullif(r->>'desconto','')::numeric as desconto,
      nullif(r->>'embalagem','')::numeric as embalagem,
      nullif(r->>'frete','')::numeric as frete,
      nullif(r->>'comissao','')::numeric as comissao,
      nullif(r->>'imposto','')::numeric as imposto,
      nullif(r->>'margem_de_lucro','')::numeric as margem_de_lucro,
      nullif(r->>'marketing','')::numeric as marketing,
      nullif(r->>'custo','')::numeric as custo,
      nullif(r->>'preco_de_venda','')::numeric as preco_de_venda
    from jsonb_array_elements(payload) r
  )
  update public.marketplace_shopee_sb t
  set
    "Desconto" = coalesce(rows.desconto, t."Desconto"),
    "Embalagem" = coalesce(rows.embalagem, t."Embalagem"),
    "Frete" = coalesce(rows.frete, t."Frete"),
    "Comissão" = coalesce(rows.comissao, t."Comissão"),
    "Imposto" = coalesce(rows.imposto, t."Imposto"),
    "Margem de Lucro" = coalesce(rows.margem_de_lucro, t."Margem de Lucro"),
    "Marketing" = coalesce(rows.marketing, t."Marketing"),
    "Custo" = coalesce(rows.custo, t."Custo"),
    "Preço de Venda" = coalesce(rows.preco_de_venda, t."Preço de Venda"),
    "Atualizado em" = now()
  from rows
  where t."ID" = rows."ID";

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;


ALTER FUNCTION "public"."update_pricing_batch_sb"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tray_pricing_batch_pk"("payload" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  updated_count integer := 0;
begin
  with rows as (
    select
      (r->>'id')::bigint as "ID",
      nullif(r->>'desconto','')::numeric as desconto,
      nullif(r->>'embalagem','')::numeric as embalagem,
      nullif(r->>'frete','')::numeric as frete,
      nullif(r->>'comissao','')::numeric as comissao,
      nullif(r->>'imposto','')::numeric as imposto,
      nullif(r->>'margem_de_lucro','')::numeric as margem_de_lucro,
      nullif(r->>'marketing','')::numeric as marketing,
      nullif(r->>'custo','')::numeric as custo,
      nullif(r->>'preco_de_venda','')::numeric as preco_de_venda
    from jsonb_array_elements(payload) r
  )
  update public.marketplace_tray_pk t
  set
    "Desconto" = coalesce(rows.desconto, t."Desconto"),
    "Embalagem" = coalesce(rows.embalagem, t."Embalagem"),
    "Frete" = coalesce(rows.frete, t."Frete"),
    "Comissão" = coalesce(rows.comissao, t."Comissão"),
    "Imposto" = coalesce(rows.imposto, t."Imposto"),
    "Margem de Lucro" = coalesce(rows.margem_de_lucro, t."Margem de Lucro"),
    "Marketing" = coalesce(rows.marketing, t."Marketing"),
    "Custo" = coalesce(rows.custo, t."Custo"),
    "Preço de Venda" = coalesce(rows.preco_de_venda, t."Preço de Venda"),
    "Atualizado em" = now()
  from rows
  where t."ID" = rows."ID";

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;


ALTER FUNCTION "public"."update_tray_pricing_batch_pk"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tray_pricing_batch_sb"("payload" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  updated_count integer := 0;
begin
  with rows as (
    select
      (r->>'id')::bigint as "ID",
      nullif(r->>'desconto','')::numeric as desconto,
      nullif(r->>'embalagem','')::numeric as embalagem,
      nullif(r->>'frete','')::numeric as frete,
      nullif(r->>'comissao','')::numeric as comissao,
      nullif(r->>'imposto','')::numeric as imposto,
      nullif(r->>'margem_de_lucro','')::numeric as margem_de_lucro,
      nullif(r->>'marketing','')::numeric as marketing,
      nullif(r->>'custo','')::numeric as custo,
      nullif(r->>'preco_de_venda','')::numeric as preco_de_venda
    from jsonb_array_elements(payload) r
  )
  update public.marketplace_tray_sb t
  set
    "Desconto" = coalesce(rows.desconto, t."Desconto"),
    "Embalagem" = coalesce(rows.embalagem, t."Embalagem"),
    "Frete" = coalesce(rows.frete, t."Frete"),
    "Comissão" = coalesce(rows.comissao, t."Comissão"),
    "Imposto" = coalesce(rows.imposto, t."Imposto"),
    "Margem de Lucro" = coalesce(rows.margem_de_lucro, t."Margem de Lucro"),
    "Marketing" = coalesce(rows.marketing, t."Marketing"),
    "Custo" = coalesce(rows.custo, t."Custo"),
    "Preço de Venda" = coalesce(rows.preco_de_venda, t."Preço de Venda"),
    "Atualizado em" = now()
  from rows
  where t."ID" = rows."ID";

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;


ALTER FUNCTION "public"."update_tray_pricing_batch_sb"("payload" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anexos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mensagem_id" "uuid",
    "nome_arquivo" "text" NOT NULL,
    "url" "text" NOT NULL,
    "tipo_mime" "text",
    "tamanho" bigint,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anexos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anuncio_variacoes_refresh_status" (
    "loja" "text" NOT NULL,
    "pai_id" bigint NOT NULL,
    "total_variacoes" integer DEFAULT 0 NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anuncio_variacoes_refresh_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anuncio_variacoes_rel" (
    "id" bigint NOT NULL,
    "loja" "text" NOT NULL,
    "pai_id" bigint NOT NULL,
    "variacao_id" bigint NOT NULL,
    "criterio" "text",
    "score" integer DEFAULT 0,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anuncio_variacoes_rel" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."anuncio_variacoes_rel_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."anuncio_variacoes_rel_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."anuncio_variacoes_rel_id_seq" OWNED BY "public"."anuncio_variacoes_rel"."id";



CREATE TABLE IF NOT EXISTS "public"."anuncios_pk" (
    "ID" bigint NOT NULL,
    "Loja" "text" DEFAULT 'Pikot Shop'::"text",
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "OD" "text",
    "Referência" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Peso" "text",
    "Altura" "text",
    "Largura" "text",
    "Comprimento" "text",
    "Código 1" "text",
    "Quantidade 1" "text",
    "Código 2" "text",
    "Quantidade 2" "text",
    "Código 3" "text",
    "Quantidade 3" "text",
    "Código 4" "text",
    "Quantidade 4" "text",
    "Código 5" "text",
    "Quantidade 5" "text",
    "Código 6" "text",
    "Quantidade 6" "text",
    "Código 7" "text",
    "Quantidade 7" "text",
    "Código 8" "text",
    "Quantidade 8" "text",
    "Código 9" "text",
    "Quantidade 9" "text",
    "Código 10" "text",
    "Quantidade 10" "text",
    "codigo_grupo" "text",
    "tipo_registro" "text",
    "produto_pai_id" bigint
);


ALTER TABLE "public"."anuncios_pk" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anuncios_sb" (
    "ID" bigint NOT NULL,
    "Loja" "text" DEFAULT 'Sóbaquetas'::"text",
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "OD" "text",
    "Referência" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Peso" "text",
    "Altura" "text",
    "Largura" "text",
    "Comprimento" "text",
    "Código 1" "text",
    "Quantidade 1" "text",
    "Código 2" "text",
    "Quantidade 2" "text",
    "Código 3" "text",
    "Quantidade 3" "text",
    "Código 4" "text",
    "Quantidade 4" "text",
    "Código 5" "text",
    "Quantidade 5" "text",
    "Código 6" "text",
    "Quantidade 6" "text",
    "Código 7" "text",
    "Quantidade 7" "text",
    "Código 8" "text",
    "Quantidade 8" "text",
    "Código 9" "text",
    "Quantidade 9" "text",
    "Código 10" "text",
    "Quantidade 10" "text"
);


ALTER TABLE "public"."anuncios_sb" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."anuncios_all" WITH ("security_invoker"='on') AS
 SELECT "anuncios_pk"."ID",
    "anuncios_pk"."Loja",
    "anuncios_pk"."ID Bling",
    "anuncios_pk"."ID Tray",
    "anuncios_pk"."ID Var",
    "anuncios_pk"."OD",
    "anuncios_pk"."Referência",
    "anuncios_pk"."Nome",
    "anuncios_pk"."Marca",
    "anuncios_pk"."Categoria",
    "anuncios_pk"."Peso",
    "anuncios_pk"."Altura",
    "anuncios_pk"."Largura",
    "anuncios_pk"."Comprimento",
    "anuncios_pk"."Código 1",
    "anuncios_pk"."Quantidade 1",
    "anuncios_pk"."Código 2",
    "anuncios_pk"."Quantidade 2",
    "anuncios_pk"."Código 3",
    "anuncios_pk"."Quantidade 3",
    "anuncios_pk"."Código 4",
    "anuncios_pk"."Quantidade 4",
    "anuncios_pk"."Código 5",
    "anuncios_pk"."Quantidade 5",
    "anuncios_pk"."Código 6",
    "anuncios_pk"."Quantidade 6",
    "anuncios_pk"."Código 7",
    "anuncios_pk"."Quantidade 7",
    "anuncios_pk"."Código 8",
    "anuncios_pk"."Quantidade 8",
    "anuncios_pk"."Código 9",
    "anuncios_pk"."Quantidade 9",
    "anuncios_pk"."Código 10",
    "anuncios_pk"."Quantidade 10"
   FROM "public"."anuncios_pk"
UNION ALL
 SELECT "anuncios_sb"."ID",
    "anuncios_sb"."Loja",
    "anuncios_sb"."ID Bling",
    "anuncios_sb"."ID Tray",
    "anuncios_sb"."ID Var",
    "anuncios_sb"."OD",
    "anuncios_sb"."Referência",
    "anuncios_sb"."Nome",
    "anuncios_sb"."Marca",
    "anuncios_sb"."Categoria",
    "anuncios_sb"."Peso",
    "anuncios_sb"."Altura",
    "anuncios_sb"."Largura",
    "anuncios_sb"."Comprimento",
    "anuncios_sb"."Código 1",
    "anuncios_sb"."Quantidade 1",
    "anuncios_sb"."Código 2",
    "anuncios_sb"."Quantidade 2",
    "anuncios_sb"."Código 3",
    "anuncios_sb"."Quantidade 3",
    "anuncios_sb"."Código 4",
    "anuncios_sb"."Quantidade 4",
    "anuncios_sb"."Código 5",
    "anuncios_sb"."Quantidade 5",
    "anuncios_sb"."Código 6",
    "anuncios_sb"."Quantidade 6",
    "anuncios_sb"."Código 7",
    "anuncios_sb"."Quantidade 7",
    "anuncios_sb"."Código 8",
    "anuncios_sb"."Quantidade 8",
    "anuncios_sb"."Código 9",
    "anuncios_sb"."Quantidade 9",
    "anuncios_sb"."Código 10",
    "anuncios_sb"."Quantidade 10"
   FROM "public"."anuncios_sb";


ALTER VIEW "public"."anuncios_all" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."anuncios_all_com_variacoes" AS
 WITH "base" AS (
         SELECT "a"."ID",
            "a"."Loja",
            "a"."ID Bling",
            "a"."ID Tray",
            "a"."ID Var",
            "a"."OD",
            "a"."Referência",
            "a"."Nome",
            "a"."Marca",
            "a"."Categoria",
            "a"."Peso",
            "a"."Altura",
            "a"."Largura",
            "a"."Comprimento",
            "a"."Código 1",
            "a"."Quantidade 1",
            "a"."Código 2",
            "a"."Quantidade 2",
            "a"."Código 3",
            "a"."Quantidade 3",
            "a"."Código 4",
            "a"."Quantidade 4",
            "a"."Código 5",
            "a"."Quantidade 5",
            "a"."Código 6",
            "a"."Quantidade 6",
            "a"."Código 7",
            "a"."Quantidade 7",
            "a"."Código 8",
            "a"."Quantidade 8",
            "a"."Código 9",
            "a"."Quantidade 9",
            "a"."Código 10",
            "a"."Quantidade 10",
            ("a"."ID")::"text" AS "__id_linha",
                CASE
                    WHEN ("upper"(TRIM(BOTH FROM COALESCE("a"."Loja", ''::"text"))) = ANY (ARRAY['PK'::"text", 'PIKOT'::"text", 'PIKOT SHOP'::"text"])) THEN 'PK'::"text"
                    WHEN ("upper"(TRIM(BOTH FROM COALESCE("a"."Loja", ''::"text"))) = ANY (ARRAY['SB'::"text", 'SOBAQUETAS'::"text", 'SÓBAQUETAS'::"text"])) THEN 'SB'::"text"
                    ELSE "upper"(TRIM(BOTH FROM COALESCE("a"."Loja", ''::"text")))
                END AS "__loja_norm",
            "upper"(TRIM(BOTH FROM "replace"(COALESCE("a"."Referência", ''::"text"), "chr"(160), ' '::"text"))) AS "__ref_norm"
           FROM "public"."anuncios_all" "a"
        ), "parsed" AS (
         SELECT "b_1"."ID",
            "b_1"."Loja",
            "b_1"."ID Bling",
            "b_1"."ID Tray",
            "b_1"."ID Var",
            "b_1"."OD",
            "b_1"."Referência",
            "b_1"."Nome",
            "b_1"."Marca",
            "b_1"."Categoria",
            "b_1"."Peso",
            "b_1"."Altura",
            "b_1"."Largura",
            "b_1"."Comprimento",
            "b_1"."Código 1",
            "b_1"."Quantidade 1",
            "b_1"."Código 2",
            "b_1"."Quantidade 2",
            "b_1"."Código 3",
            "b_1"."Quantidade 3",
            "b_1"."Código 4",
            "b_1"."Quantidade 4",
            "b_1"."Código 5",
            "b_1"."Quantidade 5",
            "b_1"."Código 6",
            "b_1"."Quantidade 6",
            "b_1"."Código 7",
            "b_1"."Quantidade 7",
            "b_1"."Código 8",
            "b_1"."Quantidade 8",
            "b_1"."Código 9",
            "b_1"."Quantidade 9",
            "b_1"."Código 10",
            "b_1"."Quantidade 10",
            "b_1"."__id_linha",
            "b_1"."__loja_norm",
            "b_1"."__ref_norm",
                CASE
                    WHEN ("b_1"."__ref_norm" ~~ 'PAI-%'::"text") THEN 'PAI'::"text"
                    WHEN ("b_1"."__ref_norm" ~~ 'VAR-%'::"text") THEN 'VAR'::"text"
                    ELSE 'OUTRO'::"text"
                END AS "__tipo_ref",
            "split_part"("b_1"."__ref_norm", '-'::"text", 2) AS "__marca",
            NULLIF("substring"("b_1"."__ref_norm", '^(?:PAI|VAR)-[^-]+-(.*)$'::"text"), ''::"text") AS "__codigo"
           FROM "base" "b_1"
        ), "relacoes" AS (
         SELECT DISTINCT "p"."__loja_norm",
            "p"."__id_linha" AS "id_pai",
            "v"."__id_linha" AS "id_variacao"
           FROM ("parsed" "p"
             JOIN "parsed" "v" ON ((("v"."__loja_norm" = "p"."__loja_norm") AND ("p"."__tipo_ref" = 'PAI'::"text") AND ("v"."__tipo_ref" = 'VAR'::"text") AND ("v"."__id_linha" <> "p"."__id_linha") AND ("v"."__marca" = "p"."__marca") AND (("v"."__codigo" = "p"."__codigo") OR (EXISTS ( SELECT 1
                   FROM "regexp_split_to_table"(COALESCE("p"."__codigo", ''::"text"), '[_/]+'::"text") "ptoken"("codigo_pai")
                  WHERE ("ptoken"."codigo_pai" = "v"."__codigo"))) OR (EXISTS ( SELECT 1
                   FROM ("regexp_split_to_table"(COALESCE("p"."__codigo", ''::"text"), '[_/]+'::"text") "ptoken"("codigo_pai")
                     JOIN "regexp_split_to_table"(COALESCE("v"."__codigo", ''::"text"), '[_/]+'::"text") "vtoken"("codigo_var") ON (("split_part"("vtoken"."codigo_var", '-'::"text", 1) = "ptoken"."codigo_pai"))))) OR ("split_part"(COALESCE("p"."__codigo", ''::"text"), '-'::"text", 1) = "split_part"(COALESCE("v"."__codigo", ''::"text"), '-'::"text", 1))))))
        ), "contagem" AS (
         SELECT "relacoes"."__loja_norm",
            "relacoes"."id_pai",
            ("count"(DISTINCT "relacoes"."id_variacao"))::integer AS "total_variacoes"
           FROM "relacoes"
          GROUP BY "relacoes"."__loja_norm", "relacoes"."id_pai"
        )
 SELECT "b"."ID",
    "b"."Loja",
    "b"."ID Bling",
    "b"."ID Tray",
    "b"."ID Var",
    "b"."OD",
    "b"."Referência",
    "b"."Nome",
    "b"."Marca",
    "b"."Categoria",
    "b"."Peso",
    "b"."Altura",
    "b"."Largura",
    "b"."Comprimento",
    "b"."Código 1",
    "b"."Quantidade 1",
    "b"."Código 2",
    "b"."Quantidade 2",
    "b"."Código 3",
    "b"."Quantidade 3",
    "b"."Código 4",
    "b"."Quantidade 4",
    "b"."Código 5",
    "b"."Quantidade 5",
    "b"."Código 6",
    "b"."Quantidade 6",
    "b"."Código 7",
    "b"."Quantidade 7",
    "b"."Código 8",
    "b"."Quantidade 8",
    "b"."Código 9",
    "b"."Quantidade 9",
    "b"."Código 10",
    "b"."Quantidade 10",
    "b"."__id_linha",
    "b"."__loja_norm",
    "b"."__ref_norm",
    "b"."__tipo_ref",
    "b"."__marca",
    "b"."__codigo",
        CASE
            WHEN ("b"."__tipo_ref" = 'PAI'::"text") THEN COALESCE("c"."total_variacoes", 0)
            ELSE 0
        END AS "total_variacoes"
   FROM ("parsed" "b"
     LEFT JOIN "contagem" "c" ON ((("c"."__loja_norm" = "b"."__loja_norm") AND ("c"."id_pai" = "b"."__id_linha"))));


ALTER VIEW "public"."anuncios_all_com_variacoes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."anuncios_pk_ID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."anuncios_pk_ID_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."anuncios_pk_ID_seq" OWNED BY "public"."anuncios_pk"."ID";



CREATE SEQUENCE IF NOT EXISTS "public"."anuncios_sb_ID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."anuncios_sb_ID_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."anuncios_sb_ID_seq" OWNED BY "public"."anuncios_sb"."ID";



CREATE TABLE IF NOT EXISTS "public"."anuncios_variacoes_contagem" (
    "loja" "text" NOT NULL,
    "id" bigint NOT NULL,
    "total_variacoes" integer DEFAULT 0 NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anuncios_variacoes_contagem" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anuncios_variacoes_count" (
    "Loja" "text" NOT NULL,
    "key_type" "text" NOT NULL,
    "key_value" "text" NOT NULL,
    "total_variacoes" integer DEFAULT 0 NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anuncios_variacoes_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anuncios_variacoes_keys" (
    "loja" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "id" bigint NOT NULL,
    "key_type" "text" NOT NULL,
    "key_value" "text" NOT NULL,
    "grupo" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."anuncios_variacoes_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anuncios_variacoes_ref_count" (
    "loja" "text",
    "chave_variacao" "text",
    "total_variacoes" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "referencia_key" "text",
    "atualizado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anuncios_variacoes_ref_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bling_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loja" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_in" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bling_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversa_key" "text" NOT NULL,
    "remetente_id" "uuid" NOT NULL,
    "remetente_nome" "text" DEFAULT 'Usuário'::"text" NOT NULL,
    "destinatario_id" "uuid" NOT NULL,
    "mensagem" "text",
    "file_url" "text",
    "file_name" "text",
    "file_type" "text",
    "file_size" bigint,
    "reply_to" "uuid",
    "lida" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."chat_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversa_participantes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversa_id" "text",
    "usuario_id" "uuid",
    "cargo" "text" DEFAULT 'membro'::"text",
    "entrou_em" timestamp with time zone DEFAULT "now"(),
    "saiu_em" timestamp with time zone,
    CONSTRAINT "conversa_participantes_cargo_check" CHECK (("cargo" = ANY (ARRAY['membro'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."conversa_participantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text",
    "tipo" "text" DEFAULT 'direta'::"text",
    "criador_id" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversas_tipo_check" CHECK (("tipo" = ANY (ARRAY['direta'::"text", 'grupo'::"text"])))
);


ALTER TABLE "public"."conversas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "Código" "text" NOT NULL,
    "Marca" "text",
    "Custo Atual" numeric(10,2),
    "Custo Antigo" numeric(10,2),
    "NCM" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "Produto" "text",
    CONSTRAINT "chk_codigo_nao_vazio" CHECK ((("Código" IS NOT NULL) AND ("btrim"("Código") <> ''::"text"))),
    CONSTRAINT "custos_codigo_not_empty" CHECK (("btrim"("Código") <> ''::"text"))
);


ALTER TABLE "public"."custos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_votes" (
    "id" bigint NOT NULL,
    "feedback_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "voto" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_votes_voto_check" CHECK (("voto" = ANY (ARRAY['up'::"text", 'down'::"text"])))
);


ALTER TABLE "public"."feedback_votes" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedback_votes" IS 'Votos (up/down) por usuário em cada feedback.';



ALTER TABLE "public"."feedback_votes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."feedback_votes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."feedbacks" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "nome" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "upvotes" integer DEFAULT 0,
    "downvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedbacks_tipo_check" CHECK (("tipo" = ANY (ARRAY['sugestão'::"text", 'erro'::"text", 'ideia'::"text"])))
);


ALTER TABLE "public"."feedbacks" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedbacks" IS 'Feedbacks enviados pelos usuários.';



ALTER TABLE "public"."feedbacks" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."feedbacks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fila_recalculo_marketplace" (
    "id" bigint NOT NULL,
    "tabela_anuncio" "text" NOT NULL,
    "anuncio_id" bigint NOT NULL,
    "codigo_origem" "text",
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "tentativas" integer DEFAULT 0 NOT NULL,
    "erro" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fila_recalculo_marketplace_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'processando'::"text", 'processado'::"text", 'erro'::"text"]))),
    CONSTRAINT "fila_recalculo_marketplace_tabela_anuncio_check" CHECK (("tabela_anuncio" = ANY (ARRAY['anuncios_pk'::"text", 'anuncios_sb'::"text"])))
);


ALTER TABLE "public"."fila_recalculo_marketplace" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."fila_recalculo_marketplace_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fila_recalculo_marketplace_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fila_recalculo_marketplace_id_seq" OWNED BY "public"."fila_recalculo_marketplace"."id";



CREATE TABLE IF NOT EXISTS "public"."logs_auth" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "evento" "text" NOT NULL,
    "data" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."logs_auth" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_magalu_pk" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" bigint,
    "ID" bigint,
    "Loja" "text",
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "Referência" "text",
    "OD" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Desconto" numeric,
    "Embalagem" numeric,
    "Frete" numeric,
    "Comissão" numeric,
    "Imposto" numeric,
    "Margem de Lucro" numeric,
    "Marketing" numeric,
    "Custo" numeric,
    "Preço de Venda" numeric,
    "Atualizado em" timestamp without time zone,
    "Sincronizado em" timestamp without time zone
);


ALTER TABLE "public"."marketplace_magalu_pk" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_magalu_sb" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" bigint,
    "ID" bigint,
    "Loja" "text",
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "Referência" "text",
    "OD" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Desconto" numeric,
    "Embalagem" numeric,
    "Frete" numeric,
    "Comissão" numeric,
    "Imposto" numeric,
    "Margem de Lucro" numeric,
    "Marketing" numeric,
    "Custo" numeric,
    "Preço de Venda" numeric,
    "Atualizado em" timestamp without time zone,
    "Sincronizado em" timestamp without time zone
);


ALTER TABLE "public"."marketplace_magalu_sb" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_magalu_variacoes_ref_count" (
    "loja" "text" NOT NULL,
    "referencia_key" "text" NOT NULL,
    "total_variacoes" integer DEFAULT 0 NOT NULL,
    "atualizado_em" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketplace_magalu_variacoes_ref_count" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."marketplace_magalu_all" WITH ("security_invoker"='on') AS
 SELECT "m"."id",
    "m"."anuncio_id",
    "m"."ID",
    COALESCE("public"."normalizar_loja_magalu"("m"."Loja"), 'Pikot Shop'::"text") AS "Loja",
    "m"."ID Bling",
    "m"."ID Tray",
    "m"."ID Var",
    "m"."Referência",
    "public"."normalizar_ref_variacao"("m"."Referência") AS "referencia_normalizada",
    "public"."ref_sem_tipo"("m"."Referência") AS "referencia_key",
    "public"."ref_tipo"("m"."Referência") AS "tipo_referencia",
    "m"."OD",
    "m"."Nome",
    "m"."Marca",
    "m"."Categoria",
    "m"."Desconto",
    "m"."Embalagem",
    "m"."Frete",
    "m"."Comissão",
    "m"."Imposto",
    "m"."Margem de Lucro",
    "m"."Marketing",
    "m"."Custo",
    "m"."Preço de Venda",
    "m"."Atualizado em",
    "m"."Sincronizado em",
    COALESCE("c"."total_variacoes", 0) AS "total_variacoes",
    'PK'::"text" AS "source_table"
   FROM ("public"."marketplace_magalu_pk" "m"
     LEFT JOIN "public"."marketplace_magalu_variacoes_ref_count" "c" ON ((("c"."loja" = COALESCE("public"."normalizar_loja_magalu"("m"."Loja"), 'Pikot Shop'::"text")) AND ("c"."referencia_key" = "public"."ref_sem_tipo"("m"."Referência")))))
UNION ALL
 SELECT "m"."id",
    "m"."anuncio_id",
    "m"."ID",
    COALESCE("public"."normalizar_loja_magalu"("m"."Loja"), 'Sóbaquetas'::"text") AS "Loja",
    "m"."ID Bling",
    "m"."ID Tray",
    "m"."ID Var",
    "m"."Referência",
    "public"."normalizar_ref_variacao"("m"."Referência") AS "referencia_normalizada",
    "public"."ref_sem_tipo"("m"."Referência") AS "referencia_key",
    "public"."ref_tipo"("m"."Referência") AS "tipo_referencia",
    "m"."OD",
    "m"."Nome",
    "m"."Marca",
    "m"."Categoria",
    "m"."Desconto",
    "m"."Embalagem",
    "m"."Frete",
    "m"."Comissão",
    "m"."Imposto",
    "m"."Margem de Lucro",
    "m"."Marketing",
    "m"."Custo",
    "m"."Preço de Venda",
    "m"."Atualizado em",
    "m"."Sincronizado em",
    COALESCE("c"."total_variacoes", 0) AS "total_variacoes",
    'SB'::"text" AS "source_table"
   FROM ("public"."marketplace_magalu_sb" "m"
     LEFT JOIN "public"."marketplace_magalu_variacoes_ref_count" "c" ON ((("c"."loja" = COALESCE("public"."normalizar_loja_magalu"("m"."Loja"), 'Sóbaquetas'::"text")) AND ("c"."referencia_key" = "public"."ref_sem_tipo"("m"."Referência")))));


ALTER VIEW "public"."marketplace_magalu_all" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_tray_pk" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" bigint,
    "ID" bigint,
    "Loja" "text" DEFAULT 'PK'::"text" NOT NULL,
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "Referência" "text",
    "OD" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Desconto" numeric,
    "Embalagem" numeric,
    "Frete" numeric,
    "Comissão" numeric,
    "Imposto" numeric,
    "Margem de Lucro" numeric,
    "Marketing" numeric,
    "Custo" numeric,
    "Preço de Venda" numeric,
    "Atualizado em" timestamp without time zone DEFAULT "now"(),
    "Sincronizado em" timestamp without time zone
);


ALTER TABLE "public"."marketplace_tray_pk" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_tray_sb" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" bigint NOT NULL,
    "ID" bigint NOT NULL,
    "Loja" "text" DEFAULT 'SB'::"text" NOT NULL,
    "ID Bling" "text",
    "ID Tray" "text",
    "ID Var" "text",
    "Referência" "text",
    "OD" "text",
    "Nome" "text",
    "Marca" "text",
    "Categoria" "text",
    "Desconto" numeric,
    "Embalagem" numeric,
    "Frete" numeric,
    "Comissão" numeric,
    "Imposto" numeric,
    "Margem de Lucro" numeric,
    "Marketing" numeric,
    "Custo" numeric,
    "Preço de Venda" numeric,
    "Atualizado em" timestamp without time zone DEFAULT "now"(),
    "Sincronizado em" timestamp without time zone
);


ALTER TABLE "public"."marketplace_tray_sb" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."marketplace_tray_all" WITH ("security_invoker"='on') AS
 SELECT "m"."id",
    "m"."anuncio_id",
    "m"."ID",
    "m"."Loja",
    "m"."ID Bling",
    "m"."ID Tray",
    "m"."ID Var",
    "m"."Referência",
    "m"."OD",
    "m"."Nome",
    "m"."Marca",
    "m"."Categoria",
    "m"."Desconto",
    "m"."Embalagem",
    "m"."Frete",
    "m"."Comissão",
    "m"."Imposto",
    "m"."Margem de Lucro",
    "m"."Marketing",
    "m"."Custo",
    "m"."Preço de Venda",
    "m"."Atualizado em"
   FROM "public"."marketplace_tray_pk" "m"
UNION ALL
 SELECT "m"."id",
    "m"."anuncio_id",
    "m"."ID",
    "m"."Loja",
    "m"."ID Bling",
    "m"."ID Tray",
    "m"."ID Var",
    "m"."Referência",
    "m"."OD",
    "m"."Nome",
    "m"."Marca",
    "m"."Categoria",
    "m"."Desconto",
    "m"."Embalagem",
    "m"."Frete",
    "m"."Comissão",
    "m"."Imposto",
    "m"."Margem de Lucro",
    "m"."Marketing",
    "m"."Custo",
    "m"."Preço de Venda",
    "m"."Atualizado em"
   FROM "public"."marketplace_tray_sb" "m";


ALTER VIEW "public"."marketplace_tray_all" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mensagens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversa_id" "text" NOT NULL,
    "remetente_id" "uuid" NOT NULL,
    "conteudo" "text",
    "tipo" "text" DEFAULT 'texto'::"text",
    "reply_to" "uuid",
    "editado" boolean DEFAULT false,
    "lida" boolean DEFAULT false,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "destinatario_id" "uuid",
    "mensagem" "text",
    "remetente_nome" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mensagens_tipo_check" CHECK (("tipo" = ANY (ARRAY['texto'::"text", 'imagem'::"text", 'arquivo'::"text", 'emoji'::"text", 'sistema'::"text"])))
);

ALTER TABLE ONLY "public"."mensagens" REPLICA IDENTITY FULL;


ALTER TABLE "public"."mensagens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_hidden" (
    "id" bigint NOT NULL,
    "notification_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hidden_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_hidden" OWNER TO "postgres";


ALTER TABLE "public"."notification_hidden" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notification_hidden_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notification_reads" (
    "id" bigint NOT NULL,
    "notification_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_reads" OWNER TO "postgres";


ALTER TABLE "public"."notification_reads" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notification_reads_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "actor_id" "uuid",
    "actor_name" "text",
    "link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mensagem_id" "uuid",
    "usuario_id" "uuid",
    "emoji" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."status_usuario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'disponivel'::"text",
    "ultima_atividade" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "status_usuario_status_check" CHECK (("status" = ANY (ARRAY['disponivel'::"text", 'ausente'::"text", 'ocupado'::"text", 'invisivel'::"text"])))
);

ALTER TABLE ONLY "public"."status_usuario" REPLICA IDENTITY FULL;


ALTER TABLE "public"."status_usuario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text",
    "avatar_url" "text",
    "status" "text" DEFAULT 'disponivel'::"text",
    "ultima_atividade" timestamp with time zone DEFAULT "now"(),
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "usuarios_status_check" CHECK (("status" = ANY (ARRAY['disponivel'::"text", 'ausente'::"text", 'ocupado'::"text", 'invisivel'::"text"])))
);

ALTER TABLE ONLY "public"."usuarios" REPLICA IDENTITY FULL;


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_profiles_chat_status" WITH ("security_invoker"='on') AS
 SELECT "id",
    "name",
    "email",
    "avatar_url",
    "status",
    "status_message",
    "last_seen_at",
    "status_updated_at",
    "updated_at",
        CASE
            WHEN ("status" = 'invisivel'::"text") THEN false
            WHEN ("last_seen_at" IS NULL) THEN false
            WHEN ("last_seen_at" >= ("now"() - '00:02:00'::interval)) THEN true
            ELSE false
        END AS "recently_seen"
   FROM "public"."profiles" "p";


ALTER VIEW "public"."v_profiles_chat_status" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anuncio_variacoes_rel" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."anuncio_variacoes_rel_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."anuncios_pk" ALTER COLUMN "ID" SET DEFAULT "nextval"('"public"."anuncios_pk_ID_seq"'::"regclass");



ALTER TABLE ONLY "public"."anuncios_sb" ALTER COLUMN "ID" SET DEFAULT "nextval"('"public"."anuncios_sb_ID_seq"'::"regclass");



ALTER TABLE ONLY "public"."fila_recalculo_marketplace" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fila_recalculo_marketplace_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."anexos"
    ADD CONSTRAINT "anexos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anuncio_variacoes_refresh_status"
    ADD CONSTRAINT "anuncio_variacoes_refresh_status_pkey" PRIMARY KEY ("loja", "pai_id");



ALTER TABLE ONLY "public"."anuncio_variacoes_rel"
    ADD CONSTRAINT "anuncio_variacoes_rel_loja_pai_id_variacao_id_key" UNIQUE ("loja", "pai_id", "variacao_id");



ALTER TABLE ONLY "public"."anuncio_variacoes_rel"
    ADD CONSTRAINT "anuncio_variacoes_rel_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anuncios_pk"
    ADD CONSTRAINT "anuncios_pk_id_bling_unique" UNIQUE ("ID");



ALTER TABLE ONLY "public"."anuncios_pk"
    ADD CONSTRAINT "anuncios_pk_pkey" PRIMARY KEY ("ID");



ALTER TABLE ONLY "public"."anuncios_sb"
    ADD CONSTRAINT "anuncios_sb_id_bling_unique" UNIQUE ("ID");



ALTER TABLE ONLY "public"."anuncios_sb"
    ADD CONSTRAINT "anuncios_sb_pkey" PRIMARY KEY ("ID");



ALTER TABLE ONLY "public"."anuncios_variacoes_contagem"
    ADD CONSTRAINT "anuncios_variacoes_contagem_pkey" PRIMARY KEY ("loja", "id");



ALTER TABLE ONLY "public"."anuncios_variacoes_count"
    ADD CONSTRAINT "anuncios_variacoes_count_pkey" PRIMARY KEY ("Loja", "key_type", "key_value");



ALTER TABLE ONLY "public"."bling_tokens"
    ADD CONSTRAINT "bling_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversa_participantes"
    ADD CONSTRAINT "conversa_participantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversas"
    ADD CONSTRAINT "conversas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custos"
    ADD CONSTRAINT "custos_codigo_unique" UNIQUE ("Código");



ALTER TABLE ONLY "public"."custos"
    ADD CONSTRAINT "custos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_votes"
    ADD CONSTRAINT "feedback_votes_feedback_id_user_id_key" UNIQUE ("feedback_id", "user_id");



ALTER TABLE ONLY "public"."feedback_votes"
    ADD CONSTRAINT "feedback_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fila_recalculo_marketplace"
    ADD CONSTRAINT "fila_recalculo_marketplace_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs_auth"
    ADD CONSTRAINT "logs_auth_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_magalu_pk"
    ADD CONSTRAINT "marketplace_magalu_pk_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_magalu_sb"
    ADD CONSTRAINT "marketplace_magalu_sb_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_magalu_variacoes_ref_count"
    ADD CONSTRAINT "marketplace_magalu_variacoes_ref_count_pkey" PRIMARY KEY ("loja", "referencia_key");



ALTER TABLE ONLY "public"."marketplace_shopee_pk"
    ADD CONSTRAINT "marketplace_shopee_pk_id_bling_uk" UNIQUE ("ID Bling");



ALTER TABLE ONLY "public"."marketplace_shopee_pk"
    ADD CONSTRAINT "marketplace_shopee_pk_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_shopee_sb"
    ADD CONSTRAINT "marketplace_shopee_sb_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_shopee_variacoes_ref_count"
    ADD CONSTRAINT "marketplace_shopee_variacoes_ref_count_pkey" PRIMARY KEY ("loja", "chave_ref");



ALTER TABLE ONLY "public"."marketplace_tray_pk"
    ADD CONSTRAINT "marketplace_tray_pk_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_tray_sb"
    ADD CONSTRAINT "marketplace_tray_sb_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mensagens"
    ADD CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_hidden"
    ADD CONSTRAINT "notification_hidden_notification_id_user_id_key" UNIQUE ("notification_id", "user_id");



ALTER TABLE ONLY "public"."notification_hidden"
    ADD CONSTRAINT "notification_hidden_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_notification_id_user_id_key" UNIQUE ("notification_id", "user_id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reacoes"
    ADD CONSTRAINT "reacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_usuario"
    ADD CONSTRAINT "status_usuario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_shopee_pk"
    ADD CONSTRAINT "uq_marketplace_shopee_pk_anuncio_id" UNIQUE ("anuncio_id");



ALTER TABLE ONLY "public"."marketplace_shopee_sb"
    ADD CONSTRAINT "uq_marketplace_shopee_sb_anuncio_id" UNIQUE ("anuncio_id");



ALTER TABLE ONLY "public"."marketplace_tray_pk"
    ADD CONSTRAINT "uq_marketplace_tray_pk_anuncio_id" UNIQUE ("anuncio_id");



ALTER TABLE ONLY "public"."marketplace_tray_sb"
    ADD CONSTRAINT "uq_marketplace_tray_sb_anuncio_id" UNIQUE ("anuncio_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "anuncios_pk_codigo_grupo_idx" ON "public"."anuncios_pk" USING "btree" ("codigo_grupo");



CREATE INDEX "anuncios_pk_grupo_tipo_idx" ON "public"."anuncios_pk" USING "btree" ("codigo_grupo", "tipo_registro");



CREATE INDEX "anuncios_pk_produto_pai_id_idx" ON "public"."anuncios_pk" USING "btree" ("produto_pai_id");



CREATE INDEX "anuncios_pk_tipo_registro_idx" ON "public"."anuncios_pk" USING "btree" ("tipo_registro");



CREATE UNIQUE INDEX "anuncios_variacoes_ref_count_loja_chave_variacao_uidx" ON "public"."anuncios_variacoes_ref_count" USING "btree" ("loja", "chave_variacao");



CREATE UNIQUE INDEX "anuncios_variacoes_ref_count_loja_referencia_key_uidx" ON "public"."anuncios_variacoes_ref_count" USING "btree" ("loja", "referencia_key");



CREATE INDEX "chat_messages_conversa_key_created_at_idx" ON "public"."chat_messages" USING "btree" ("conversa_key", "created_at");



CREATE INDEX "chat_messages_conversa_key_idx" ON "public"."chat_messages" USING "btree" ("conversa_key");



CREATE INDEX "chat_messages_destinatario_id_idx" ON "public"."chat_messages" USING "btree" ("destinatario_id");



CREATE INDEX "chat_messages_destinatario_lida_idx" ON "public"."chat_messages" USING "btree" ("destinatario_id", "lida");



CREATE INDEX "feedbacks_created_at_idx" ON "public"."feedbacks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_anuncio_variacoes_refresh_status" ON "public"."anuncio_variacoes_refresh_status" USING "btree" ("loja", "pai_id");



CREATE INDEX "idx_anuncio_variacoes_rel_pai" ON "public"."anuncio_variacoes_rel" USING "btree" ("loja", "pai_id");



CREATE INDEX "idx_anuncio_variacoes_rel_var" ON "public"."anuncio_variacoes_rel" USING "btree" ("loja", "variacao_id");



CREATE INDEX "idx_anuncios_pk_categoria" ON "public"."anuncios_pk" USING "btree" ("Categoria");



CREATE INDEX "idx_anuncios_pk_categoria_trgm" ON "public"."anuncios_pk" USING "gin" ("Categoria" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_pk_codigo1" ON "public"."anuncios_pk" USING "btree" ("Código 1");



CREATE INDEX "idx_anuncios_pk_codigo2" ON "public"."anuncios_pk" USING "btree" ("Código 2");



CREATE INDEX "idx_anuncios_pk_codigo_1" ON "public"."anuncios_pk" USING "btree" ("Código 1");



CREATE INDEX "idx_anuncios_pk_codigo_10" ON "public"."anuncios_pk" USING "btree" ("Código 10");



CREATE INDEX "idx_anuncios_pk_codigo_2" ON "public"."anuncios_pk" USING "btree" ("Código 2");



CREATE INDEX "idx_anuncios_pk_codigo_3" ON "public"."anuncios_pk" USING "btree" ("Código 3");



CREATE INDEX "idx_anuncios_pk_codigo_4" ON "public"."anuncios_pk" USING "btree" ("Código 4");



CREATE INDEX "idx_anuncios_pk_codigo_5" ON "public"."anuncios_pk" USING "btree" ("Código 5");



CREATE INDEX "idx_anuncios_pk_codigo_6" ON "public"."anuncios_pk" USING "btree" ("Código 6");



CREATE INDEX "idx_anuncios_pk_codigo_7" ON "public"."anuncios_pk" USING "btree" ("Código 7");



CREATE INDEX "idx_anuncios_pk_codigo_8" ON "public"."anuncios_pk" USING "btree" ("Código 8");



CREATE INDEX "idx_anuncios_pk_codigo_9" ON "public"."anuncios_pk" USING "btree" ("Código 9");



CREATE INDEX "idx_anuncios_pk_id_bling" ON "public"."anuncios_pk" USING "btree" ("ID Bling");



CREATE UNIQUE INDEX "idx_anuncios_pk_id_bling_unique" ON "public"."anuncios_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_anuncios_pk_id_humano" ON "public"."anuncios_pk" USING "btree" ("ID");



CREATE INDEX "idx_anuncios_pk_id_text" ON "public"."anuncios_pk" USING "btree" ((("ID")::"text"));



CREATE INDEX "idx_anuncios_pk_id_tray" ON "public"."anuncios_pk" USING "btree" ("ID Tray");



CREATE INDEX "idx_anuncios_pk_id_var" ON "public"."anuncios_pk" USING "btree" ("ID Var");



CREATE INDEX "idx_anuncios_pk_idbling_trgm" ON "public"."anuncios_pk" USING "gin" ("ID Bling" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_pk_idtray_trgm" ON "public"."anuncios_pk" USING "gin" ("ID Tray" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_pk_idvar_trgm" ON "public"."anuncios_pk" USING "gin" ("ID Var" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_pk_loja" ON "public"."anuncios_pk" USING "btree" ("Loja");



CREATE INDEX "idx_anuncios_pk_marca" ON "public"."anuncios_pk" USING "btree" ("Marca");



CREATE INDEX "idx_anuncios_pk_marca_trgm" ON "public"."anuncios_pk" USING "gin" ("Marca" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_pk_nome_trgm" ON "public"."anuncios_pk" USING "gin" ("Nome" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_pk_referencia_trgm" ON "public"."anuncios_pk" USING "gin" ("Referência" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_sb_categoria" ON "public"."anuncios_sb" USING "btree" ("Categoria");



CREATE INDEX "idx_anuncios_sb_categoria_trgm" ON "public"."anuncios_sb" USING "gin" ("Categoria" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_sb_codigo_1" ON "public"."anuncios_sb" USING "btree" ("Código 1");



CREATE INDEX "idx_anuncios_sb_codigo_10" ON "public"."anuncios_sb" USING "btree" ("Código 10");



CREATE INDEX "idx_anuncios_sb_codigo_2" ON "public"."anuncios_sb" USING "btree" ("Código 2");



CREATE INDEX "idx_anuncios_sb_codigo_3" ON "public"."anuncios_sb" USING "btree" ("Código 3");



CREATE INDEX "idx_anuncios_sb_codigo_4" ON "public"."anuncios_sb" USING "btree" ("Código 4");



CREATE INDEX "idx_anuncios_sb_codigo_5" ON "public"."anuncios_sb" USING "btree" ("Código 5");



CREATE INDEX "idx_anuncios_sb_codigo_6" ON "public"."anuncios_sb" USING "btree" ("Código 6");



CREATE INDEX "idx_anuncios_sb_codigo_7" ON "public"."anuncios_sb" USING "btree" ("Código 7");



CREATE INDEX "idx_anuncios_sb_codigo_8" ON "public"."anuncios_sb" USING "btree" ("Código 8");



CREATE INDEX "idx_anuncios_sb_codigo_9" ON "public"."anuncios_sb" USING "btree" ("Código 9");



CREATE INDEX "idx_anuncios_sb_id_bling" ON "public"."anuncios_sb" USING "btree" ("ID Bling");



CREATE INDEX "idx_anuncios_sb_id_humano" ON "public"."anuncios_sb" USING "btree" ("ID");



CREATE INDEX "idx_anuncios_sb_id_text" ON "public"."anuncios_sb" USING "btree" ((("ID")::"text"));



CREATE INDEX "idx_anuncios_sb_id_tray" ON "public"."anuncios_sb" USING "btree" ("ID Tray");



CREATE INDEX "idx_anuncios_sb_id_var" ON "public"."anuncios_sb" USING "btree" ("ID Var");



CREATE INDEX "idx_anuncios_sb_idbling_trgm" ON "public"."anuncios_sb" USING "gin" ("ID Bling" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_sb_idtray_trgm" ON "public"."anuncios_sb" USING "gin" ("ID Tray" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_sb_idvar_trgm" ON "public"."anuncios_sb" USING "gin" ("ID Var" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_sb_loja" ON "public"."anuncios_sb" USING "btree" ("Loja");



CREATE INDEX "idx_anuncios_sb_marca" ON "public"."anuncios_sb" USING "btree" ("Marca");



CREATE INDEX "idx_anuncios_sb_marca_trgm" ON "public"."anuncios_sb" USING "gin" ("Marca" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_sb_nome_trgm" ON "public"."anuncios_sb" USING "gin" ("Nome" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_sb_referencia_trgm" ON "public"."anuncios_sb" USING "gin" ("Referência" "public"."gin_trgm_ops");



CREATE INDEX "idx_anuncios_variacoes_contagem_match" ON "public"."anuncios_variacoes_contagem" USING "btree" ("loja", "id");



CREATE INDEX "idx_anuncios_variacoes_count_lookup" ON "public"."anuncios_variacoes_count" USING "btree" ("Loja", "key_type", "key_value");



CREATE INDEX "idx_anuncios_variacoes_keys_id" ON "public"."anuncios_variacoes_keys" USING "btree" ("loja", "tipo", "id");



CREATE INDEX "idx_anuncios_variacoes_keys_match" ON "public"."anuncios_variacoes_keys" USING "btree" ("loja", "tipo", "key_type", "grupo", "key_value");



CREATE INDEX "idx_custos_codigo" ON "public"."custos" USING "btree" ("Código");



CREATE INDEX "idx_custos_codigo_text" ON "public"."custos" USING "btree" ("Código");



CREATE INDEX "idx_fila_recalculo_status_criado" ON "public"."fila_recalculo_marketplace" USING "btree" ("status", "criado_em");



CREATE INDEX "idx_magalu_pk_anuncio_id_text" ON "public"."marketplace_magalu_pk" USING "btree" ((("anuncio_id")::"text"));



CREATE INDEX "idx_magalu_sb_anuncio_id_text" ON "public"."marketplace_magalu_sb" USING "btree" ((("anuncio_id")::"text"));



CREATE INDEX "idx_marketplace_magalu_pk_anuncio_id" ON "public"."marketplace_magalu_pk" USING "btree" ("anuncio_id");



CREATE INDEX "idx_marketplace_magalu_pk_atualizado_em" ON "public"."marketplace_magalu_pk" USING "btree" ("Atualizado em" DESC);



CREATE INDEX "idx_marketplace_magalu_pk_id" ON "public"."marketplace_magalu_pk" USING "btree" ("ID");



CREATE INDEX "idx_marketplace_magalu_pk_id_anuncio" ON "public"."marketplace_magalu_pk" USING "btree" ("ID");



CREATE INDEX "idx_marketplace_magalu_pk_id_bling" ON "public"."marketplace_magalu_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_marketplace_magalu_pk_id_tray" ON "public"."marketplace_magalu_pk" USING "btree" ("ID Tray");



CREATE INDEX "idx_marketplace_magalu_pk_id_var" ON "public"."marketplace_magalu_pk" USING "btree" ("ID Var");



CREATE INDEX "idx_marketplace_magalu_pk_loja" ON "public"."marketplace_magalu_pk" USING "btree" ("Loja");



CREATE INDEX "idx_marketplace_magalu_pk_marca" ON "public"."marketplace_magalu_pk" USING "btree" ("Marca");



CREATE INDEX "idx_marketplace_magalu_pk_referencia" ON "public"."marketplace_magalu_pk" USING "btree" ("Referência");



CREATE INDEX "idx_marketplace_magalu_sb_anuncio_id" ON "public"."marketplace_magalu_sb" USING "btree" ("anuncio_id");



CREATE INDEX "idx_marketplace_magalu_sb_atualizado_em" ON "public"."marketplace_magalu_sb" USING "btree" ("Atualizado em" DESC);



CREATE INDEX "idx_marketplace_magalu_sb_id" ON "public"."marketplace_magalu_sb" USING "btree" ("ID");



CREATE INDEX "idx_marketplace_magalu_sb_id_anuncio" ON "public"."marketplace_magalu_sb" USING "btree" ("ID");



CREATE INDEX "idx_marketplace_magalu_sb_id_bling" ON "public"."marketplace_magalu_sb" USING "btree" ("ID Bling");



CREATE INDEX "idx_marketplace_magalu_sb_id_tray" ON "public"."marketplace_magalu_sb" USING "btree" ("ID Tray");



CREATE INDEX "idx_marketplace_magalu_sb_id_var" ON "public"."marketplace_magalu_sb" USING "btree" ("ID Var");



CREATE INDEX "idx_marketplace_magalu_sb_loja" ON "public"."marketplace_magalu_sb" USING "btree" ("Loja");



CREATE INDEX "idx_marketplace_magalu_sb_marca" ON "public"."marketplace_magalu_sb" USING "btree" ("Marca");



CREATE INDEX "idx_marketplace_magalu_sb_referencia" ON "public"."marketplace_magalu_sb" USING "btree" ("Referência");



CREATE INDEX "idx_marketplace_shopee_id_bling" ON "public"."marketplace_shopee_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_marketplace_shopee_pk_anuncio_id" ON "public"."marketplace_shopee_pk" USING "btree" ("anuncio_id");



CREATE INDEX "idx_marketplace_shopee_pk_id" ON "public"."marketplace_shopee_pk" USING "btree" ("ID");



CREATE INDEX "idx_marketplace_shopee_pk_id_bling" ON "public"."marketplace_shopee_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_marketplace_shopee_pk_id_tray" ON "public"."marketplace_shopee_pk" USING "btree" ("ID Tray");



CREATE INDEX "idx_marketplace_shopee_pk_referencia" ON "public"."marketplace_shopee_pk" USING "btree" ("Referência");



CREATE INDEX "idx_marketplace_shopee_sb_anuncio_id" ON "public"."marketplace_shopee_sb" USING "btree" ("anuncio_id");



CREATE INDEX "idx_marketplace_shopee_sb_id" ON "public"."marketplace_shopee_sb" USING "btree" ("ID");



CREATE INDEX "idx_marketplace_shopee_sb_id_bling" ON "public"."marketplace_shopee_sb" USING "btree" ("ID Bling");



CREATE INDEX "idx_marketplace_shopee_sb_id_tray" ON "public"."marketplace_shopee_sb" USING "btree" ("ID Tray");



CREATE INDEX "idx_marketplace_shopee_sb_referencia" ON "public"."marketplace_shopee_sb" USING "btree" ("Referência");



CREATE INDEX "idx_marketplace_shopee_variacoes_ref_count_chave" ON "public"."marketplace_shopee_variacoes_ref_count" USING "btree" ("chave_ref");



CREATE INDEX "idx_marketplace_shopee_variacoes_ref_count_loja" ON "public"."marketplace_shopee_variacoes_ref_count" USING "btree" ("loja");



CREATE INDEX "idx_marketplace_tray_id_bling" ON "public"."marketplace_tray_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_marketplace_tray_pk_anuncio_id" ON "public"."marketplace_tray_pk" USING "btree" ("anuncio_id");



CREATE INDEX "idx_marketplace_tray_pk_id_bling" ON "public"."marketplace_tray_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_marketplace_tray_sb_anuncio_id" ON "public"."marketplace_tray_sb" USING "btree" ("anuncio_id");



CREATE INDEX "idx_marketplace_tray_sb_id_bling" ON "public"."marketplace_tray_sb" USING "btree" ("ID Bling");



CREATE INDEX "idx_mensagens_conversa_id" ON "public"."mensagens" USING "btree" ("conversa_id");



CREATE INDEX "idx_mensagens_criado_em" ON "public"."mensagens" USING "btree" ("criado_em" DESC);



CREATE INDEX "idx_mkt_shopee_pk_categoria" ON "public"."marketplace_shopee_pk" USING "btree" ("Categoria");



CREATE INDEX "idx_mkt_shopee_pk_id_bling" ON "public"."marketplace_shopee_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_mkt_shopee_pk_id_humano" ON "public"."marketplace_shopee_pk" USING "btree" ("ID");



CREATE INDEX "idx_mkt_shopee_pk_id_tray" ON "public"."marketplace_shopee_pk" USING "btree" ("ID Tray");



CREATE INDEX "idx_mkt_shopee_pk_idbling_trgm" ON "public"."marketplace_shopee_pk" USING "gin" ("ID Bling" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_pk_idtray_trgm" ON "public"."marketplace_shopee_pk" USING "gin" ("ID Tray" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_pk_idvar_trgm" ON "public"."marketplace_shopee_pk" USING "gin" ("ID Var" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_pk_loja" ON "public"."marketplace_shopee_pk" USING "btree" ("Loja");



CREATE INDEX "idx_mkt_shopee_pk_marca" ON "public"."marketplace_shopee_pk" USING "btree" ("Marca");



CREATE INDEX "idx_mkt_shopee_pk_marca_trgm" ON "public"."marketplace_shopee_pk" USING "gin" ("Marca" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_pk_nome_trgm" ON "public"."marketplace_shopee_pk" USING "gin" ("Nome" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_pk_referencia_trgm" ON "public"."marketplace_shopee_pk" USING "gin" ("Referência" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_pk_updated_id" ON "public"."marketplace_shopee_pk" USING "btree" ("Atualizado em" DESC, "id" DESC);



CREATE INDEX "idx_mkt_shopee_sb_categoria" ON "public"."marketplace_shopee_sb" USING "btree" ("Categoria");



CREATE INDEX "idx_mkt_shopee_sb_id_bling" ON "public"."marketplace_shopee_sb" USING "btree" ("ID Bling");



CREATE INDEX "idx_mkt_shopee_sb_id_humano" ON "public"."marketplace_shopee_sb" USING "btree" ("ID");



CREATE INDEX "idx_mkt_shopee_sb_id_tray" ON "public"."marketplace_shopee_sb" USING "btree" ("ID Tray");



CREATE INDEX "idx_mkt_shopee_sb_idbling_trgm" ON "public"."marketplace_shopee_sb" USING "gin" ("ID Bling" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_sb_idtray_trgm" ON "public"."marketplace_shopee_sb" USING "gin" ("ID Tray" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_sb_idvar_trgm" ON "public"."marketplace_shopee_sb" USING "gin" ("ID Var" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_sb_loja" ON "public"."marketplace_shopee_sb" USING "btree" ("Loja");



CREATE INDEX "idx_mkt_shopee_sb_marca" ON "public"."marketplace_shopee_sb" USING "btree" ("Marca");



CREATE INDEX "idx_mkt_shopee_sb_marca_trgm" ON "public"."marketplace_shopee_sb" USING "gin" ("Marca" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_sb_nome_trgm" ON "public"."marketplace_shopee_sb" USING "gin" ("Nome" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_sb_referencia_trgm" ON "public"."marketplace_shopee_sb" USING "gin" ("Referência" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_shopee_sb_updated_id" ON "public"."marketplace_shopee_sb" USING "btree" ("Atualizado em" DESC, "id" DESC);



CREATE INDEX "idx_mkt_tray_pk_categoria" ON "public"."marketplace_tray_pk" USING "btree" ("Categoria");



CREATE INDEX "idx_mkt_tray_pk_id_bling" ON "public"."marketplace_tray_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_mkt_tray_pk_id_humano" ON "public"."marketplace_tray_pk" USING "btree" ("ID");



CREATE INDEX "idx_mkt_tray_pk_id_tray" ON "public"."marketplace_tray_pk" USING "btree" ("ID Tray");



CREATE INDEX "idx_mkt_tray_pk_idbling_trgm" ON "public"."marketplace_tray_pk" USING "gin" ("ID Bling" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_pk_idtray_trgm" ON "public"."marketplace_tray_pk" USING "gin" ("ID Tray" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_pk_idvar_trgm" ON "public"."marketplace_tray_pk" USING "gin" ("ID Var" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_pk_loja" ON "public"."marketplace_tray_pk" USING "btree" ("Loja");



CREATE INDEX "idx_mkt_tray_pk_marca" ON "public"."marketplace_tray_pk" USING "btree" ("Marca");



CREATE INDEX "idx_mkt_tray_pk_marca_trgm" ON "public"."marketplace_tray_pk" USING "gin" ("Marca" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_pk_nome_trgm" ON "public"."marketplace_tray_pk" USING "gin" ("Nome" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_pk_referencia_trgm" ON "public"."marketplace_tray_pk" USING "gin" ("Referência" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_pk_updated_id" ON "public"."marketplace_tray_pk" USING "btree" ("Atualizado em" DESC, "id" DESC);



CREATE INDEX "idx_mkt_tray_sb_categoria" ON "public"."marketplace_tray_sb" USING "btree" ("Categoria");



CREATE INDEX "idx_mkt_tray_sb_id_bling" ON "public"."marketplace_tray_sb" USING "btree" ("ID Bling");



CREATE INDEX "idx_mkt_tray_sb_id_humano" ON "public"."marketplace_tray_sb" USING "btree" ("ID");



CREATE INDEX "idx_mkt_tray_sb_id_tray" ON "public"."marketplace_tray_sb" USING "btree" ("ID Tray");



CREATE INDEX "idx_mkt_tray_sb_idbling_trgm" ON "public"."marketplace_tray_sb" USING "gin" ("ID Bling" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_sb_idtray_trgm" ON "public"."marketplace_tray_sb" USING "gin" ("ID Tray" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_sb_idvar_trgm" ON "public"."marketplace_tray_sb" USING "gin" ("ID Var" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_sb_loja" ON "public"."marketplace_tray_sb" USING "btree" ("Loja");



CREATE INDEX "idx_mkt_tray_sb_marca" ON "public"."marketplace_tray_sb" USING "btree" ("Marca");



CREATE INDEX "idx_mkt_tray_sb_marca_trgm" ON "public"."marketplace_tray_sb" USING "gin" ("Marca" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_sb_nome_trgm" ON "public"."marketplace_tray_sb" USING "gin" ("Nome" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_sb_referencia_trgm" ON "public"."marketplace_tray_sb" USING "gin" ("Referência" "public"."gin_trgm_ops");



CREATE INDEX "idx_mkt_tray_sb_updated_id" ON "public"."marketplace_tray_sb" USING "btree" ("Atualizado em" DESC, "id" DESC);



CREATE UNIQUE INDEX "idx_reacoes_unicas" ON "public"."reacoes" USING "btree" ("mensagem_id", "usuario_id", "emoji");



CREATE INDEX "idx_shopee_pk_id_bling" ON "public"."marketplace_shopee_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_shopee_sb_id_bling" ON "public"."marketplace_shopee_sb" USING "btree" ("ID Bling");



CREATE UNIQUE INDEX "idx_status_unico_usuario" ON "public"."status_usuario" USING "btree" ("usuario_id");



CREATE INDEX "idx_tray_pk_id_bling" ON "public"."marketplace_tray_pk" USING "btree" ("ID Bling");



CREATE INDEX "idx_tray_sb_id_bling" ON "public"."marketplace_tray_sb" USING "btree" ("ID Bling");



CREATE UNIQUE INDEX "idx_unico_usuario_conversa" ON "public"."conversa_participantes" USING "btree" ("conversa_id", "usuario_id");



CREATE INDEX "ix_custos_codigo" ON "public"."custos" USING "btree" ("Código");



CREATE INDEX "ix_marketplace_shopee_pk_anuncio_id" ON "public"."marketplace_shopee_pk" USING "btree" ("anuncio_id");



CREATE INDEX "ix_marketplace_shopee_sb_anuncio_id" ON "public"."marketplace_shopee_sb" USING "btree" ("anuncio_id");



CREATE INDEX "ix_shopee_pk_referencia" ON "public"."marketplace_shopee_pk" USING "btree" ("Referência");



CREATE INDEX "ix_shopee_sb_referencia" ON "public"."marketplace_shopee_sb" USING "btree" ("Referência");



CREATE INDEX "ix_tray_pk_referencia" ON "public"."marketplace_tray_pk" USING "btree" ("Referência");



CREATE INDEX "ix_tray_sb_referencia" ON "public"."marketplace_tray_sb" USING "btree" ("Referência");



CREATE UNIQUE INDEX "marketplace_shopee_pk_anuncio_id_ux" ON "public"."marketplace_shopee_pk" USING "btree" ("anuncio_id");



CREATE UNIQUE INDEX "marketplace_shopee_pk_id_bling_unique_not_empty" ON "public"."marketplace_shopee_pk" USING "btree" ("ID Bling") WHERE (("ID Bling" IS NOT NULL) AND (TRIM(BOTH FROM "ID Bling") <> ''::"text"));



CREATE UNIQUE INDEX "marketplace_tray_pk_id_bling_uk" ON "public"."marketplace_tray_pk" USING "btree" ("ID Bling");



CREATE UNIQUE INDEX "marketplace_tray_pk_id_bling_unique_not_empty" ON "public"."marketplace_tray_pk" USING "btree" ("ID Bling") WHERE (("ID Bling" IS NOT NULL) AND (TRIM(BOTH FROM "ID Bling") <> ''::"text"));



CREATE INDEX "mensagens_conversa_id_idx" ON "public"."mensagens" USING "btree" ("conversa_id");



CREATE INDEX "mensagens_destinatario_id_idx" ON "public"."mensagens" USING "btree" ("destinatario_id");



CREATE INDEX "mensagens_destinatario_lida_idx" ON "public"."mensagens" USING "btree" ("destinatario_id", "lida");



CREATE INDEX "notification_reads_notification_id_idx" ON "public"."notification_reads" USING "btree" ("notification_id");



CREATE INDEX "notification_reads_user_id_idx" ON "public"."notification_reads" USING "btree" ("user_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");



CREATE UNIQUE INDEX "profiles_id_idx" ON "public"."profiles" USING "btree" ("id");



CREATE INDEX "profiles_last_seen_at_idx" ON "public"."profiles" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "profiles_metadata_idx" ON "public"."profiles" USING "gin" ("metadata");



CREATE INDEX "profiles_name_idx" ON "public"."profiles" USING "btree" ("name");



CREATE INDEX "profiles_status_idx" ON "public"."profiles" USING "btree" ("status");



CREATE INDEX "profiles_updated_at_idx" ON "public"."profiles" USING "btree" ("updated_at" DESC);



CREATE INDEX "status_usuario_usuario_id_idx" ON "public"."status_usuario" USING "btree" ("usuario_id");



CREATE UNIQUE INDEX "uq_fila_recalculo_pendente" ON "public"."fila_recalculo_marketplace" USING "btree" ("tabela_anuncio", "anuncio_id") WHERE ("status" = ANY (ARRAY['pendente'::"text", 'processando'::"text"]));



CREATE INDEX "usuarios_status_idx" ON "public"."usuarios" USING "btree" ("status");



CREATE UNIQUE INDEX "ux_marketplace_shopee_id_bling" ON "public"."marketplace_shopee_pk" USING "btree" (TRIM(BOTH FROM "ID Bling")) WHERE (("ID Bling" IS NOT NULL) AND (TRIM(BOTH FROM "ID Bling") <> ''::"text"));



CREATE UNIQUE INDEX "ux_marketplace_shopee_id_bling_norm" ON "public"."marketplace_shopee_pk" USING "btree" ("regexp_replace"(TRIM(BOTH FROM "ID Bling"), '\D'::"text", ''::"text", 'g'::"text")) WHERE (("ID Bling" IS NOT NULL) AND (TRIM(BOTH FROM "ID Bling") <> ''::"text"));



CREATE UNIQUE INDEX "ux_shopee_idbling_referencia" ON "public"."marketplace_shopee_pk" USING "btree" (TRIM(BOTH FROM "ID Bling"), TRIM(BOTH FROM "Referência")) WHERE (("ID Bling" IS NOT NULL) AND (TRIM(BOTH FROM "ID Bling") <> ''::"text") AND ("Referência" IS NOT NULL) AND (TRIM(BOTH FROM "Referência") <> ''::"text"));



CREATE UNIQUE INDEX "ux_shopee_idblingnorm_referencia" ON "public"."marketplace_tray_pk" USING "btree" ("regexp_replace"(TRIM(BOTH FROM "ID Bling"), '\D'::"text", ''::"text", 'g'::"text"), TRIM(BOTH FROM "Referência")) WHERE (("ID Bling" IS NOT NULL) AND (TRIM(BOTH FROM "ID Bling") <> ''::"text") AND ("Referência" IS NOT NULL) AND (TRIM(BOTH FROM "Referência") <> ''::"text"));



CREATE OR REPLACE TRIGGER "before_insert_update_id_marketplace_shopee_pk" BEFORE INSERT OR UPDATE OF "ID", "anuncio_id" ON "public"."marketplace_shopee_pk" FOR EACH ROW EXECUTE FUNCTION "public"."trg_marketplace_shopee_enforce_id_anuncio_id"();



CREATE OR REPLACE TRIGGER "before_insert_update_id_marketplace_shopee_sb" BEFORE INSERT OR UPDATE OF "ID", "anuncio_id" ON "public"."marketplace_shopee_sb" FOR EACH ROW EXECUTE FUNCTION "public"."trg_marketplace_shopee_enforce_id_anuncio_id"();



CREATE OR REPLACE TRIGGER "before_update_marketplace_shopee_pk_touch_pricing" BEFORE UPDATE OF "Desconto", "Embalagem", "Frete", "Comissão", "Imposto", "Marketing", "Margem de Lucro", "Preço de Venda" ON "public"."marketplace_shopee_pk" FOR EACH ROW EXECUTE FUNCTION "public"."trg_marketplace_shopee_touch_pricing_updated_at"();



CREATE OR REPLACE TRIGGER "before_update_marketplace_shopee_sb_touch_pricing" BEFORE UPDATE OF "Desconto", "Embalagem", "Frete", "Comissão", "Imposto", "Marketing", "Margem de Lucro", "Preço de Venda" ON "public"."marketplace_shopee_sb" FOR EACH ROW EXECUTE FUNCTION "public"."trg_marketplace_shopee_touch_pricing_updated_at"();



CREATE OR REPLACE TRIGGER "feedback_vote_update_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."feedback_votes" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_feedback_counts"();



CREATE OR REPLACE TRIGGER "trg_calc_preco_magalu_pk" BEFORE INSERT OR UPDATE ON "public"."marketplace_magalu_pk" FOR EACH ROW EXECUTE FUNCTION "public"."trg_calc_preco_magalu"();



CREATE OR REPLACE TRIGGER "trg_calc_preco_magalu_sb" BEFORE INSERT OR UPDATE ON "public"."marketplace_magalu_sb" FOR EACH ROW EXECUTE FUNCTION "public"."trg_calc_preco_magalu"();



CREATE OR REPLACE TRIGGER "trg_delete_anuncios_pk_to_marketplace_magalu" AFTER DELETE ON "public"."anuncios_pk" FOR EACH ROW EXECUTE FUNCTION "public"."sync_delete_anuncio_to_marketplace_magalu"();



CREATE OR REPLACE TRIGGER "trg_delete_anuncios_sb_to_marketplace_magalu" AFTER DELETE ON "public"."anuncios_sb" FOR EACH ROW EXECUTE FUNCTION "public"."sync_delete_anuncio_to_marketplace_magalu"();



CREATE OR REPLACE TRIGGER "trg_marketplace_shopee_pk_ref_count" AFTER INSERT OR DELETE OR UPDATE OF "Referência" ON "public"."marketplace_shopee_pk" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_marketplace_shopee_variacoes_ref_count"('PK');



CREATE OR REPLACE TRIGGER "trg_marketplace_shopee_sb_ref_count" AFTER INSERT OR DELETE OR UPDATE OF "Referência" ON "public"."marketplace_shopee_sb" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_marketplace_shopee_variacoes_ref_count"('SB');



CREATE OR REPLACE TRIGGER "trg_profiles_status_timestamps" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_profiles_status_timestamps"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "trg_proteger_custos_invalidos" BEFORE UPDATE OF "Custo Atual" ON "public"."custos" FOR EACH ROW EXECUTE FUNCTION "public"."fn_guard_custos_invalidos"();



CREATE OR REPLACE TRIGGER "trg_recalc_magalu_custos" AFTER INSERT OR DELETE OR UPDATE ON "public"."custos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_recalc_magalu_on_custos_change"();



CREATE OR REPLACE TRIGGER "trg_recalc_marketplaces_from_anuncios_pk" AFTER INSERT OR UPDATE OF "ID Bling", "Código 1", "Quantidade 1", "Código 2", "Quantidade 2", "Código 3", "Quantidade 3", "Código 4", "Quantidade 4", "Código 5", "Quantidade 5", "Código 6", "Quantidade 6", "Código 7", "Quantidade 7", "Código 8", "Quantidade 8", "Código 9", "Quantidade 9", "Código 10", "Quantidade 10" ON "public"."anuncios_pk" FOR EACH ROW EXECUTE FUNCTION "public"."fn_enfileirar_recalculo_anuncio_pk"();



CREATE OR REPLACE TRIGGER "trg_recalc_marketplaces_from_anuncios_sb" AFTER INSERT OR UPDATE OF "ID Bling", "Código 1", "Quantidade 1", "Código 2", "Quantidade 2", "Código 3", "Quantidade 3", "Código 4", "Quantidade 4", "Código 5", "Quantidade 5", "Código 6", "Quantidade 6", "Código 7", "Quantidade 7", "Código 8", "Quantidade 8", "Código 9", "Quantidade 9", "Código 10", "Quantidade 10" ON "public"."anuncios_sb" FOR EACH ROW EXECUTE FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_sb"();



CREATE OR REPLACE TRIGGER "trg_recalc_marketplaces_from_custos" AFTER INSERT OR UPDATE OF "Código", "Custo Atual" ON "public"."custos" FOR EACH ROW EXECUTE FUNCTION "public"."fn_enfileirar_recalculo_por_custo"();



CREATE OR REPLACE TRIGGER "trg_refresh_magalu_marketplace_variacoes_ref_count_pk" AFTER INSERT OR DELETE OR UPDATE OF "Referência" ON "public"."marketplace_magalu_pk" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_magalu_marketplace_variacoes_ref_count"();



CREATE OR REPLACE TRIGGER "trg_refresh_magalu_marketplace_variacoes_ref_count_sb" AFTER INSERT OR DELETE OR UPDATE OF "Referência" ON "public"."marketplace_magalu_sb" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_magalu_marketplace_variacoes_ref_count"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_chat_messages" BEFORE UPDATE ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_anuncios_pk_marketplaces" AFTER INSERT OR DELETE OR UPDATE ON "public"."anuncios_pk" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_anuncios_pk_marketplaces"();



CREATE OR REPLACE TRIGGER "trg_sync_anuncios_pk_to_marketplace_magalu" AFTER INSERT OR UPDATE ON "public"."anuncios_pk" FOR EACH ROW EXECUTE FUNCTION "public"."sync_anuncios_pk_to_marketplace_magalu"();



CREATE OR REPLACE TRIGGER "trg_sync_anuncios_sb_marketplaces" AFTER INSERT OR DELETE OR UPDATE ON "public"."anuncios_sb" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_anuncios_sb_marketplaces"();



CREATE OR REPLACE TRIGGER "trg_sync_anuncios_sb_to_marketplace_magalu" AFTER INSERT OR UPDATE ON "public"."anuncios_sb" FOR EACH ROW EXECUTE FUNCTION "public"."sync_anuncios_sb_to_marketplace_magalu"();



CREATE OR REPLACE TRIGGER "trg_sync_anuncios_variacoes_ref_count_keys" BEFORE INSERT OR UPDATE ON "public"."anuncios_variacoes_ref_count" FOR EACH ROW EXECUTE FUNCTION "public"."sync_anuncios_variacoes_ref_count_keys"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_status_legacy_tables" AFTER INSERT OR UPDATE OF "name", "email", "avatar_url", "status", "status_message", "last_seen_at" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_status_legacy_tables"();



CREATE OR REPLACE TRIGGER "trg_tray_pk_to_shopee_pk" AFTER INSERT OR UPDATE ON "public"."marketplace_tray_pk" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_tray_to_shopee_no_conflict"('public.marketplace_shopee_pk');



CREATE OR REPLACE TRIGGER "trg_tray_sb_to_shopee_sb" AFTER INSERT OR UPDATE ON "public"."marketplace_tray_sb" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_tray_to_shopee_no_conflict"('public.marketplace_shopee_sb');



CREATE OR REPLACE TRIGGER "trigger_mensagens_update" BEFORE UPDATE ON "public"."mensagens" FOR EACH ROW EXECUTE FUNCTION "public"."atualiza_timestamp_mensagem"();



CREATE OR REPLACE TRIGGER "trigger_status_usuario_update" BEFORE UPDATE ON "public"."status_usuario" FOR EACH ROW EXECUTE FUNCTION "public"."atualiza_timestamp_status"();



ALTER TABLE ONLY "public"."anexos"
    ADD CONSTRAINT "anexos_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "public"."mensagens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anuncios_pk"
    ADD CONSTRAINT "anuncios_pk_produto_pai_id_fkey" FOREIGN KEY ("produto_pai_id") REFERENCES "public"."anuncios_pk"("ID") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_remetente_id_fkey" FOREIGN KEY ("remetente_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "public"."chat_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversa_participantes"
    ADD CONSTRAINT "conversa_participantes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversas"
    ADD CONSTRAINT "conversas_criador_id_fkey" FOREIGN KEY ("criador_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_votes"
    ADD CONSTRAINT "feedback_votes_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedbacks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_votes"
    ADD CONSTRAINT "feedback_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logs_auth"
    ADD CONSTRAINT "logs_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mensagens"
    ADD CONSTRAINT "mensagens_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mensagens"
    ADD CONSTRAINT "mensagens_remetente_id_fkey" FOREIGN KEY ("remetente_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mensagens"
    ADD CONSTRAINT "mensagens_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "public"."mensagens"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_hidden"
    ADD CONSTRAINT "notification_hidden_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reacoes"
    ADD CONSTRAINT "reacoes_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "public"."mensagens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reacoes"
    ADD CONSTRAINT "reacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."status_usuario"
    ADD CONSTRAINT "status_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow delete for authenticated users" ON "public"."anuncios_pk" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow delete for authenticated users" ON "public"."anuncios_sb" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow insert for authenticated users" ON "public"."anuncios_pk" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow insert for authenticated users" ON "public"."anuncios_sb" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow insert for authenticated users" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow select for authenticated users" ON "public"."anuncios_pk" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow select for authenticated users" ON "public"."anuncios_sb" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow update for authenticated users" ON "public"."anuncios_pk" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow update for authenticated users" ON "public"."anuncios_sb" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."bling_tokens" FOR SELECT USING (true);



CREATE POLICY "Permitir delete authenticated" ON "public"."marketplace_magalu_variacoes_ref_count" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Permitir delete marketplace magalu pk" ON "public"."marketplace_magalu_pk" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "Permitir delete marketplace magalu sb" ON "public"."marketplace_magalu_sb" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "Permitir insert authenticated" ON "public"."marketplace_magalu_variacoes_ref_count" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Permitir insert marketplace magalu pk" ON "public"."marketplace_magalu_pk" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Permitir insert marketplace magalu sb" ON "public"."marketplace_magalu_sb" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Permitir leitura marketplace magalu pk" ON "public"."marketplace_magalu_pk" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Permitir leitura marketplace magalu sb" ON "public"."marketplace_magalu_sb" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Permitir select authenticated" ON "public"."marketplace_magalu_variacoes_ref_count" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir update authenticated" ON "public"."marketplace_magalu_variacoes_ref_count" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir update marketplace magalu pk" ON "public"."marketplace_magalu_pk" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir update marketplace magalu sb" ON "public"."marketplace_magalu_sb" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own hidden notifications" ON "public"."notification_hidden" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notification reads" ON "public"."notification_reads" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own hidden notifications" ON "public"."notification_hidden" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own notification reads" ON "public"."notification_reads" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own hidden notifications" ON "public"."notification_hidden" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own notification reads" ON "public"."notification_reads" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow read" ON "public"."marketplace_tray_pk" FOR SELECT USING (true);



CREATE POLICY "allow read" ON "public"."marketplace_tray_sb" FOR SELECT USING (true);



CREATE POLICY "allow_insert_fila" ON "public"."fila_recalculo_marketplace" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_read" ON "public"."marketplace_shopee_pk" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_read" ON "public"."marketplace_shopee_sb" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_select_fila" ON "public"."fila_recalculo_marketplace" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_update_fila" ON "public"."fila_recalculo_marketplace" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."anexos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncio_variacoes_refresh_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncio_variacoes_rel" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncios_pk" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncios_sb" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncios_variacoes_contagem" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncios_variacoes_count" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncios_variacoes_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anuncios_variacoes_ref_count" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bling_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_delete_sender" ON "public"."chat_messages" FOR DELETE TO "authenticated" USING (("remetente_id" = "auth"."uid"()));



CREATE POLICY "chat_messages_insert_sender" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("remetente_id" = "auth"."uid"()) AND ("destinatario_id" IS NOT NULL) AND ("destinatario_id" <> "auth"."uid"())));



CREATE POLICY "chat_messages_select_participants" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((("remetente_id" = "auth"."uid"()) OR ("destinatario_id" = "auth"."uid"())));



CREATE POLICY "chat_messages_update_sender_or_read" ON "public"."chat_messages" FOR UPDATE TO "authenticated" USING ((("remetente_id" = "auth"."uid"()) OR ("destinatario_id" = "auth"."uid"()))) WITH CHECK ((("remetente_id" = "auth"."uid"()) OR (("destinatario_id" = "auth"."uid"()) AND ("lida" = true))));



ALTER TABLE "public"."conversa_participantes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cp_delete_own" ON "public"."conversa_participantes" FOR DELETE TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



CREATE POLICY "cp_insert_own" ON "public"."conversa_participantes" FOR INSERT TO "authenticated" WITH CHECK (("usuario_id" = "auth"."uid"()));



CREATE POLICY "cp_select_own" ON "public"."conversa_participantes" FOR SELECT TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



ALTER TABLE "public"."custos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custos_delete_authenticated" ON "public"."custos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "custos_insert_authenticated" ON "public"."custos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "custos_select_authenticated" ON "public"."custos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "custos_update_authenticated" ON "public"."custos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "delete_marketplace_shopee_pk" ON "public"."marketplace_shopee_pk" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "delete_marketplace_shopee_sb" ON "public"."marketplace_shopee_sb" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "delete_marketplace_tray_pk" ON "public"."marketplace_tray_pk" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "delete_marketplace_tray_sb" ON "public"."marketplace_tray_sb" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."feedback_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedbacks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedbacks_delete_owner" ON "public"."feedbacks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "feedbacks_insert_owner" ON "public"."feedbacks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "feedbacks_select_auth" ON "public"."feedbacks" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "feedbacks_update_owner" ON "public"."feedbacks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."fila_recalculo_marketplace" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_marketplace_shopee_pk" ON "public"."marketplace_shopee_pk" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "insert_marketplace_shopee_sb" ON "public"."marketplace_shopee_sb" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "insert_marketplace_tray_pk" ON "public"."marketplace_tray_pk" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "insert_marketplace_tray_sb" ON "public"."marketplace_tray_sb" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "insert_own_status" ON "public"."status_usuario" FOR INSERT WITH CHECK (("usuario_id" = "auth"."uid"()));



CREATE POLICY "insert_participants" ON "public"."conversa_participantes" FOR INSERT TO "authenticated" WITH CHECK (("usuario_id" = "auth"."uid"()));



ALTER TABLE "public"."logs_auth" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_magalu_pk" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_magalu_sb" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_magalu_variacoes_ref_count" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_shopee_pk" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_shopee_sb" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_tray_pk" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_tray_sb" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mensagens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mensagens_insert_sender" ON "public"."mensagens" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversa_participantes" "cp"
  WHERE (("cp"."conversa_id" = "mensagens"."conversa_id") AND ("cp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "mensagens_select_my_messages" ON "public"."mensagens" FOR SELECT USING ((("destinatario_id" = "auth"."uid"()) OR ("remetente_id" = "auth"."uid"())));



CREATE POLICY "mensagens_select_participants" ON "public"."mensagens" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversa_participantes" "cp"
  WHERE (("cp"."conversa_id" = "mensagens"."conversa_id") AND ("cp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."notification_hidden" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permit select on anuncios_pk" ON "public"."anuncios_pk" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "permit select on anuncios_sb" ON "public"."anuncios_sb" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles are viewable by authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_authenticated" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."reacoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_anuncios_pk_public" ON "public"."anuncios_pk" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "select_anuncios_sb_public" ON "public"."anuncios_sb" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "select_marketplace_shopee_pk" ON "public"."marketplace_shopee_pk" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "select_marketplace_shopee_sb" ON "public"."marketplace_shopee_sb" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "select_marketplace_tray_pk" ON "public"."marketplace_tray_pk" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "select_marketplace_tray_sb" ON "public"."marketplace_tray_sb" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "select_participants" ON "public"."conversa_participantes" FOR SELECT TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



CREATE POLICY "select_status" ON "public"."status_usuario" FOR SELECT USING (true);



ALTER TABLE "public"."status_usuario" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_marketplace_shopee_pk" ON "public"."marketplace_shopee_pk" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "update_marketplace_shopee_sb" ON "public"."marketplace_shopee_sb" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "update_marketplace_tray_pk" ON "public"."marketplace_tray_pk" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "update_marketplace_tray_sb" ON "public"."marketplace_tray_sb" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "update_own_status" ON "public"."status_usuario" FOR UPDATE USING (("usuario_id" = "auth"."uid"())) WITH CHECK (("usuario_id" = "auth"."uid"()));



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes_delete_owner" ON "public"."feedback_votes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "votes_insert_owner" ON "public"."feedback_votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "votes_select_auth" ON "public"."feedback_votes" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "votes_update_owner" ON "public"."feedback_votes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."anuncios_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."anuncios_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."anuncios_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."anuncios_all_by_id"("anuncio_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."anuncios_all_by_id"("anuncio_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."anuncios_all_by_id"("anuncio_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."atualiza_timestamp_mensagem"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualiza_timestamp_mensagem"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualiza_timestamp_mensagem"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atualiza_timestamp_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualiza_timestamp_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualiza_timestamp_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_custo_magalu_por_faixa"("p_loja" "text", "p_id_min" numeric, "p_id_max" numeric, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_custo_magalu_por_faixa"("p_loja" "text", "p_id_min" numeric, "p_id_max" numeric, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_custo_magalu_por_faixa"("p_loja" "text", "p_id_min" numeric, "p_id_max" numeric, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_custo_magalu_super_leve"("p_loja" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_custo_magalu_super_leve"("p_loja" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_custo_magalu_super_leve"("p_loja" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."shopee_ref_chave"("p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."shopee_ref_chave"("p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shopee_ref_chave"("p_referencia" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."shopee_ref_tipo"("p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."shopee_ref_tipo"("p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shopee_ref_tipo"("p_referencia" "text") TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_shopee_pk" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_shopee_pk" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_shopee_pk" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_shopee_sb" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_shopee_sb" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_shopee_sb" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_shopee_variacoes_ref_count" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_shopee_variacoes_ref_count" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_shopee_variacoes_ref_count" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_shopee_all" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_shopee_all" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_shopee_all" TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_pai_shopee_por_referencia"("p_loja" "text", "p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_pai_shopee_por_referencia"("p_loja" "text", "p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_pai_shopee_por_referencia"("p_loja" "text", "p_referencia" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_variacoes_do_pai"("p_referencia_pai" "text", "p_loja" "text", "p_marketplace" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_variacoes_do_pai"("p_referencia_pai" "text", "p_loja" "text", "p_marketplace" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_variacoes_do_pai"("p_referencia_pai" "text", "p_loja" "text", "p_marketplace" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calc_custo_composicao_marketplace"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calc_custo_composicao_marketplace"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calc_custo_composicao_marketplace"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_preco_venda"("desconto" "text", "embalagem" "text", "frete" "text", "comissao" "text", "imposto" "text", "margem" "text", "marketing" "text", "custo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_preco_venda"("desconto" "text", "embalagem" "text", "frete" "text", "comissao" "text", "imposto" "text", "margem" "text", "marketing" "text", "custo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_preco_venda"("desconto" "text", "embalagem" "text", "frete" "text", "comissao" "text", "imposto" "text", "margem" "text", "marketing" "text", "custo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_preco_venda_magalu"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_preco_venda_magalu"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_preco_venda_magalu"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_preco_venda_marketplace"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_preco_venda_marketplace"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_preco_venda_marketplace"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."chave_valida_anuncio"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."chave_valida_anuncio"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."chave_valida_anuncio"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."chave_variacao_padrao"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."chave_variacao_padrao"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."chave_variacao_padrao"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."codigo_modelo_anuncio"("p_codigo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."codigo_modelo_anuncio"("p_codigo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."codigo_modelo_anuncio"("p_codigo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."codigo_norm_anuncio"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."codigo_norm_anuncio"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."codigo_norm_anuncio"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."codigo_tipo_anuncio"("p_codigo" "text", "p_nome" "text", "p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."codigo_tipo_anuncio"("p_codigo" "text", "p_nome" "text", "p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."codigo_tipo_anuncio"("p_codigo" "text", "p_nome" "text", "p_referencia" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."custos"() TO "anon";
GRANT ALL ON FUNCTION "public"."custos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."custos"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."debug_timeouts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."debug_timeouts"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_timeouts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_timeouts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_all_to_pk_sb"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_all_to_pk_sb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_all_to_pk_sb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_marketplaces_on_anuncio_pk_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_marketplaces_on_anuncio_pk_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_marketplaces_on_anuncio_pk_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_marketplaces_on_anuncio_sb_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_marketplaces_on_anuncio_sb_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_marketplaces_on_anuncio_sb_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_pk_to_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_pk_to_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_pk_to_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_sb_to_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_sb_to_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_sb_to_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enfileirar_recalculo_anuncio"("p_tabela_anuncios" "text", "p_anuncio_id" bigint, "p_id_bling" "text", "p_origem" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."enfileirar_recalculo_anuncio"("p_tabela_anuncios" "text", "p_anuncio_id" bigint, "p_id_bling" "text", "p_origem" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enfileirar_recalculo_anuncio"("p_tabela_anuncios" "text", "p_anuncio_id" bigint, "p_id_bling" "text", "p_origem" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_dm_participants"("p_conversa_id" "text", "p_other_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_dm_participants"("p_conversa_id" "text", "p_other_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_dm_participants"("p_conversa_id" "text", "p_other_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_calc_preco_venda_shopee"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_calc_preco_venda_shopee"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_calc_preco_venda_shopee"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_calc_preco_venda_tray"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_calc_preco_venda_tray"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_calc_preco_venda_tray"("p_custo" numeric, "p_desconto" numeric, "p_embalagem" numeric, "p_frete" numeric, "p_comissao" numeric, "p_imposto" numeric, "p_margem_lucro" numeric, "p_marketing" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_anuncio_pk"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_anuncio_pk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_anuncio_pk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_anuncio_sb"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_anuncio_sb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_anuncio_sb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_por_custo"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_por_custo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_enfileirar_recalculo_por_custo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_custo_codigo"("p_codigo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_custo_codigo"("p_codigo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_custo_codigo"("p_codigo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_guard_custos_invalidos"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_guard_custos_invalidos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_guard_custos_invalidos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_normalize_codigo"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_normalize_codigo"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_normalize_codigo"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_parse_numeric_br"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_parse_numeric_br"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_parse_numeric_br"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_processar_fila_recalculo_marketplace"("p_limite" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_processar_fila_recalculo_marketplace"("p_limite" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_processar_fila_recalculo_marketplace"("p_limite" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_push_marketplace_pk_from_anuncio"("p_anuncio_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_push_marketplace_pk_from_anuncio"("p_anuncio_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_push_marketplace_pk_from_anuncio"("p_anuncio_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_push_marketplace_sb_from_anuncio"("p_anuncio_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_push_marketplace_sb_from_anuncio"("p_anuncio_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_push_marketplace_sb_from_anuncio"("p_anuncio_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_pk"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_pk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_pk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_sb"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_sb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalc_marketplaces_from_anuncios_sb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_anuncios_pk_marketplaces"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_anuncios_pk_marketplaces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_anuncios_pk_marketplaces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_anuncios_sb_marketplaces"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_anuncios_sb_marketplaces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_anuncios_sb_marketplaces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_tray_to_shopee_no_conflict"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_tray_to_shopee_no_conflict"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_tray_to_shopee_no_conflict"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_text_to_numeric_safe"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_text_to_numeric_safe"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_text_to_numeric_safe"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_to_bigint_safe"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_to_bigint_safe"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_to_bigint_safe"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_brands"("lojas" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_brands"("lojas" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_brands"("lojas" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_brands_tray"("lojas" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_brands_tray"("lojas" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_brands_tray"("lojas" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_variacoes_anuncio"("p_loja" "text", "p_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_variacoes_anuncio"("p_loja" "text", "p_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_variacoes_anuncio"("p_loja" "text", "p_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."grupo_parenteses_anuncio"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."grupo_parenteses_anuncio"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grupo_parenteses_anuncio"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_all_to_pk_sb"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_all_to_pk_sb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_all_to_pk_sb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_pk_to_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_pk_to_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_pk_to_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_sb_to_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_sb_to_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_sb_to_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_ref_variacao_novo_padrao"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_ref_variacao_novo_padrao"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_ref_variacao_novo_padrao"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."jsonb_num_first"("p_json" "jsonb", "p_keys" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."jsonb_num_first"("p_json" "jsonb", "p_keys" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jsonb_num_first"("p_json" "jsonb", "p_keys" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."jsonb_text_first"("p_json" "jsonb", "p_keys" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."jsonb_text_first"("p_json" "jsonb", "p_keys" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jsonb_text_first"("p_json" "jsonb", "p_keys" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."magalu_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."magalu_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."magalu_calc_custo_composicao"("p_codigo_1" "text", "p_qtd_1" "text", "p_codigo_2" "text", "p_qtd_2" "text", "p_codigo_3" "text", "p_qtd_3" "text", "p_codigo_4" "text", "p_qtd_4" "text", "p_codigo_5" "text", "p_qtd_5" "text", "p_codigo_6" "text", "p_qtd_6" "text", "p_codigo_7" "text", "p_qtd_7" "text", "p_codigo_8" "text", "p_qtd_8" "text", "p_codigo_9" "text", "p_qtd_9" "text", "p_codigo_10" "text", "p_qtd_10" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."magalu_calc_custo_item"("p_codigo" "text", "p_quantidade" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."magalu_calc_custo_item"("p_codigo" "text", "p_quantidade" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."magalu_calc_custo_item"("p_codigo" "text", "p_quantidade" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."magalu_to_bigint_safe"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."magalu_to_bigint_safe"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."magalu_to_bigint_safe"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."magalu_to_numeric"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."magalu_to_numeric"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."magalu_to_numeric"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalizar_loja_magalu"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalizar_loja_magalu"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalizar_loja_magalu"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalizar_loja_marketplace"("p_loja" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalizar_loja_marketplace"("p_loja" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalizar_loja_marketplace"("p_loja" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalizar_loja_variacao"("p_loja" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalizar_loja_variacao"("p_loja" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalizar_loja_variacao"("p_loja" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalizar_ref_marketplace"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalizar_ref_marketplace"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalizar_ref_marketplace"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalizar_ref_variacao"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalizar_ref_variacao"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalizar_ref_variacao"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalizar_texto_anuncio"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalizar_texto_anuncio"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalizar_texto_anuncio"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_loja_norm"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_loja_norm"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_loja_norm"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_ref_chave"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_ref_chave"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_ref_chave"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_ref_codigos_array"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_ref_codigos_array"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_ref_codigos_array"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_ref_codigos_text"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_ref_codigos_text"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_ref_codigos_text"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_ref_marca"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_ref_marca"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_ref_marca"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_ref_norm"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_ref_norm"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_ref_norm"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_ref_tipo"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_ref_tipo"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_ref_tipo"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pikot_ref_var_pertence_ao_pai"("referencia_pai" "text", "referencia_var" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pikot_ref_var_pertence_ao_pai"("referencia_pai" "text", "referencia_var" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pikot_ref_var_pertence_ao_pai"("referencia_pai" "text", "referencia_var" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."prefixo_variacao_referencia"("p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."prefixo_variacao_referencia"("p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."prefixo_variacao_referencia"("p_referencia" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."processar_variacoes_auto"("p_lote" integer, "p_max_lotes" integer, "p_max_segundos" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."processar_variacoes_auto"("p_lote" integer, "p_max_lotes" integer, "p_max_segundos" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."processar_variacoes_auto"("p_lote" integer, "p_max_lotes" integer, "p_max_segundos" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."quantidade_norm_anuncio"("p_qtd" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."quantidade_norm_anuncio"("p_qtd" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."quantidade_norm_anuncio"("p_qtd" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_preco_venda_precificacao_tray"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_preco_venda_precificacao_tray"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_preco_venda_precificacao_tray"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_base_anuncio"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_base_anuncio"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_base_anuncio"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_familia_anuncio"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_familia_anuncio"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_familia_anuncio"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_sem_grupo_parenteses"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_sem_grupo_parenteses"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_sem_grupo_parenteses"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_sem_tipo"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_sem_tipo"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_sem_tipo"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_tipo"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_tipo"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_tipo"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_var_pertence_ao_pai"("p_ref_pai" "text", "p_ref_var" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_var_pertence_ao_pai"("p_ref_pai" "text", "p_ref_var" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_var_pertence_ao_pai"("p_ref_pai" "text", "p_ref_var" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_variacao_codigo_principal"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_variacao_codigo_principal"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_variacao_codigo_principal"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_variacao_key"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_variacao_key"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_variacao_key"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_variacao_marca"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_variacao_marca"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_variacao_marca"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_variacao_tipo"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_variacao_tipo"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_variacao_tipo"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ref_variacao_tokens"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ref_variacao_tokens"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ref_variacao_tokens"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_anuncios_variacoes_contagem_leve"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_anuncios_variacoes_contagem_leve"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_anuncios_variacoes_contagem_leve"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_magalu_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count_key"("p_loja" "text", "p_chave_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count_key"("p_loja" "text", "p_chave_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_marketplace_shopee_variacoes_ref_count_key"("p_loja" "text", "p_chave_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_variacoes_lote"("p_loja" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_lote"("p_loja" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_lote"("p_loja" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_variacoes_ref_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_ref_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_ref_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_ref_count_key"("p_loja" "text", "p_referencia_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_variacoes_um_pai"("p_loja" "text", "p_pai_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_um_pai"("p_loja" "text", "p_pai_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_variacoes_um_pai"("p_loja" "text", "p_pai_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."reprocessar_variacoes_pai"("p_loja" "text", "p_pai_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."reprocessar_variacoes_pai"("p_loja" "text", "p_pai_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reprocessar_variacoes_pai"("p_loja" "text", "p_pai_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_to_numeric"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_to_numeric"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_to_numeric"("value" "text") TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."set_my_profile_status"("p_status" "text", "p_status_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_my_profile_status"("p_status" "text", "p_status_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_my_profile_status"("p_status" "text", "p_status_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_profiles_status_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_profiles_status_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_profiles_status_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."shopee_normalizar_loja"("p_loja" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."shopee_normalizar_loja"("p_loja" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shopee_normalizar_loja"("p_loja" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."shopee_normalizar_texto"("p_texto" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."shopee_normalizar_texto"("p_texto" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shopee_normalizar_texto"("p_texto" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."shopee_ref_is_pai"("p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."shopee_ref_is_pai"("p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shopee_ref_is_pai"("p_referencia" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."shopee_ref_is_var"("p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."shopee_ref_is_var"("p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shopee_ref_is_var"("p_referencia" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."shopee_ref_limpa"("p_referencia" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."shopee_ref_limpa"("p_referencia" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shopee_ref_limpa"("p_referencia" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_all_to_pk_sb"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_all_to_pk_sb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_all_to_pk_sb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_magalu"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_magalu"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_magalu"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_shopee"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_shopee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_shopee"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_tray"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_tray"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_pk_to_marketplace_tray"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_magalu"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_magalu"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_magalu"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_shopee"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_shopee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_shopee"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_tray"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_tray"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_sb_to_marketplace_tray"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_to_all_marketplaces"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_to_all_marketplaces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_to_all_marketplaces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_anuncios_variacoes_ref_count_keys"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_anuncios_variacoes_ref_count_keys"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_anuncios_variacoes_ref_count_keys"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_delete_anuncio_to_marketplace_magalu"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_delete_anuncio_to_marketplace_magalu"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_delete_anuncio_to_marketplace_magalu"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_from_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_from_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_from_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_from_anuncios"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_from_anuncios"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_from_anuncios"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_from_marketplace"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_from_marketplace"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_from_marketplace"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_marketplace_magalu_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_marketplace_magalu_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_marketplace_magalu_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_marketplace_shopee_upsert"("p_shopee_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_marketplace_shopee_upsert"("p_shopee_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_marketplace_shopee_upsert"("p_shopee_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_pk_to_shopee_pk"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_pk_to_shopee_pk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_pk_to_shopee_pk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_sb_to_shopee_sb"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_sb_to_shopee_sb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_sb_to_shopee_sb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_upsert"("p_tray_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_upsert"("p_tray_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_marketplace_tray_upsert"("p_tray_id_norm" "text", "p_id_bling_norm" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_precificacao_tray"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_precificacao_tray"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_precificacao_tray"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_status_legacy_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_status_legacy_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_status_legacy_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tipo_material_variacao"("p_referencia" "text", "p_nome" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."tipo_material_variacao"("p_referencia" "text", "p_nome" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tipo_material_variacao"("p_referencia" "text", "p_nome" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."tipo_ref_variacao"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."tipo_ref_variacao"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tipo_ref_variacao"("p_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_my_profile_presence"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_my_profile_presence"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_my_profile_presence"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_anuncios_recalcular_marketplaces"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_anuncios_recalcular_marketplaces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_anuncios_recalcular_marketplaces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_calc_preco_magalu"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_calc_preco_magalu"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_calc_preco_magalu"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_calc_preco_text"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_calc_preco_text"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_calc_preco_text"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_create_marketplace_shopee_pk"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_create_marketplace_shopee_pk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_create_marketplace_shopee_pk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_create_marketplace_shopee_pk_from_anuncios"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_create_marketplace_shopee_pk_from_anuncios"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_create_marketplace_shopee_pk_from_anuncios"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_custos_enfileirar_recalculo"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_custos_enfileirar_recalculo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_custos_enfileirar_recalculo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_custos_recalcular_marketplaces"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_custos_recalcular_marketplaces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_custos_recalcular_marketplaces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_marketplace_pk_id_equals_anuncio_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_marketplace_pk_id_equals_anuncio_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_marketplace_pk_id_equals_anuncio_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_marketplace_shopee_enforce_id_anuncio_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_marketplace_shopee_enforce_id_anuncio_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_marketplace_shopee_enforce_id_anuncio_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_marketplace_shopee_touch_pricing_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_marketplace_shopee_touch_pricing_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_marketplace_shopee_touch_pricing_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_normalizar_custos"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_normalizar_custos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_normalizar_custos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_normalizar_numeros"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_normalizar_numeros"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_normalizar_numeros"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_recalc_magalu_on_custos_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_recalc_magalu_on_custos_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_recalc_magalu_on_custos_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_recalc_on_custo_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_recalc_on_custo_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_recalc_on_custo_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_magalu_marketplace_variacoes_ref_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_magalu_marketplace_variacoes_ref_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_magalu_marketplace_variacoes_ref_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_marketplace_shopee_variacoes_ref_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_marketplace_shopee_variacoes_ref_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_marketplace_shopee_variacoes_ref_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_variacoes_ref_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_variacoes_ref_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_variacoes_ref_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_pk"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_pk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_pk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_sb"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_sb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_custos_marketplace_from_anuncios_sb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_preco_venda_shopee"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_preco_venda_shopee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_preco_venda_shopee"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_preco_venda_tray"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_preco_venda_tray"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_preco_venda_tray"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_sync_anuncios_sb_to_marketplace"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_sync_anuncios_sb_to_marketplace"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_sync_anuncios_sb_to_marketplace"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_upd_marketplace_tray_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_upd_marketplace_tray_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_upd_marketplace_tray_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_upd_shopee_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_upd_shopee_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_upd_shopee_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_feedback_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_feedback_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_feedback_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feedback_votes"("feedback_id_param" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."update_feedback_votes"("feedback_id_param" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feedback_votes"("feedback_id_param" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_magalu_pricing_batch_pk"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_magalu_pricing_batch_pk"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_magalu_pricing_batch_pk"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_magalu_pricing_batch_sb"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_magalu_pricing_batch_sb"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_magalu_pricing_batch_sb"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pricing_batch_pk"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pricing_batch_pk"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pricing_batch_pk"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pricing_batch_sb"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pricing_batch_sb"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pricing_batch_sb"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tray_pricing_batch_pk"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_tray_pricing_batch_pk"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tray_pricing_batch_pk"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tray_pricing_batch_sb"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_tray_pricing_batch_sb"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tray_pricing_batch_sb"("payload" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."anexos" TO "anon";
GRANT ALL ON TABLE "public"."anexos" TO "authenticated";
GRANT ALL ON TABLE "public"."anexos" TO "service_role";



GRANT ALL ON TABLE "public"."anuncio_variacoes_refresh_status" TO "anon";
GRANT ALL ON TABLE "public"."anuncio_variacoes_refresh_status" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncio_variacoes_refresh_status" TO "service_role";



GRANT ALL ON TABLE "public"."anuncio_variacoes_rel" TO "anon";
GRANT ALL ON TABLE "public"."anuncio_variacoes_rel" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncio_variacoes_rel" TO "service_role";



GRANT ALL ON SEQUENCE "public"."anuncio_variacoes_rel_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."anuncio_variacoes_rel_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."anuncio_variacoes_rel_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_pk" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_pk" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_pk" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_sb" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_sb" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_sb" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_all" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_all" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_all" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_all_com_variacoes" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_all_com_variacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_all_com_variacoes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."anuncios_pk_ID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."anuncios_pk_ID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."anuncios_pk_ID_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."anuncios_sb_ID_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."anuncios_sb_ID_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."anuncios_sb_ID_seq" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_variacoes_contagem" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_variacoes_contagem" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_variacoes_contagem" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_variacoes_count" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_variacoes_count" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_variacoes_count" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_variacoes_keys" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_variacoes_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_variacoes_keys" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios_variacoes_ref_count" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_variacoes_ref_count" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_variacoes_ref_count" TO "service_role";



GRANT ALL ON TABLE "public"."bling_tokens" TO "anon";
GRANT ALL ON TABLE "public"."bling_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."bling_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."conversa_participantes" TO "anon";
GRANT ALL ON TABLE "public"."conversa_participantes" TO "authenticated";
GRANT ALL ON TABLE "public"."conversa_participantes" TO "service_role";



GRANT ALL ON TABLE "public"."conversas" TO "anon";
GRANT ALL ON TABLE "public"."conversas" TO "authenticated";
GRANT ALL ON TABLE "public"."conversas" TO "service_role";



GRANT ALL ON TABLE "public"."custos" TO "anon";
GRANT ALL ON TABLE "public"."custos" TO "authenticated";
GRANT ALL ON TABLE "public"."custos" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_votes" TO "anon";
GRANT ALL ON TABLE "public"."feedback_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_votes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feedback_votes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feedback_votes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feedback_votes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."feedbacks" TO "anon";
GRANT ALL ON TABLE "public"."feedbacks" TO "authenticated";
GRANT ALL ON TABLE "public"."feedbacks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feedbacks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feedbacks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feedbacks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fila_recalculo_marketplace" TO "anon";
GRANT ALL ON TABLE "public"."fila_recalculo_marketplace" TO "authenticated";
GRANT ALL ON TABLE "public"."fila_recalculo_marketplace" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fila_recalculo_marketplace_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fila_recalculo_marketplace_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fila_recalculo_marketplace_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."logs_auth" TO "anon";
GRANT ALL ON TABLE "public"."logs_auth" TO "authenticated";
GRANT ALL ON TABLE "public"."logs_auth" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_magalu_pk" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_magalu_pk" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_magalu_pk" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_magalu_sb" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_magalu_sb" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_magalu_sb" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_magalu_variacoes_ref_count" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_magalu_variacoes_ref_count" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_magalu_variacoes_ref_count" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_magalu_all" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_magalu_all" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_magalu_all" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_tray_pk" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_tray_pk" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_tray_pk" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_tray_sb" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_tray_sb" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_tray_sb" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_tray_all" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_tray_all" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_tray_all" TO "service_role";



GRANT ALL ON TABLE "public"."mensagens" TO "anon";
GRANT ALL ON TABLE "public"."mensagens" TO "authenticated";
GRANT ALL ON TABLE "public"."mensagens" TO "service_role";



GRANT ALL ON TABLE "public"."notification_hidden" TO "anon";
GRANT ALL ON TABLE "public"."notification_hidden" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_hidden" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_hidden_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_hidden_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_hidden_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_reads" TO "anon";
GRANT ALL ON TABLE "public"."notification_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_reads" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_reads_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_reads_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_reads_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reacoes" TO "anon";
GRANT ALL ON TABLE "public"."reacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."reacoes" TO "service_role";



GRANT ALL ON TABLE "public"."status_usuario" TO "anon";
GRANT ALL ON TABLE "public"."status_usuario" TO "authenticated";
GRANT ALL ON TABLE "public"."status_usuario" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."v_profiles_chat_status" TO "anon";
GRANT ALL ON TABLE "public"."v_profiles_chat_status" TO "authenticated";
GRANT ALL ON TABLE "public"."v_profiles_chat_status" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







