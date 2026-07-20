
SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

ALTER ROLE "anon" SET "statement_timeout" TO '10min';

ALTER ROLE "authenticated" SET "statement_timeout" TO '10min';

ALTER ROLE "authenticator" SET "statement_timeout" TO '8s';

ALTER ROLE "postgres" SET "statement_timeout" TO '10min';

ALTER ROLE "service_role" SET "statement_timeout" TO '10min';

RESET ALL;
