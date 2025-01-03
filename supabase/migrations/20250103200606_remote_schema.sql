

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


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."npc_action" AS ENUM (
    'movetocoordinates',
    'movetoplace',
    'movetoperson',
    'talk',
    'vote',
    'idle',
    'broadcast',
    'listen'
);


ALTER TYPE "public"."npc_action" OWNER TO "postgres";


CREATE TYPE "public"."room_type" AS ENUM (
    'private',
    'shared'
);


ALTER TYPE "public"."room_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_room_instance"("p_id" "text", "p_room_id" integer) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO room_instance (id, room_id)
  VALUES (p_id, p_room_id);

  INSERT INTO npc_instance (npc_id, room_instance_id) 
  SELECT nr.npc_id, p_id
  FROM npc_room nr
  WHERE nr.room_id = p_room_id;

  RETURN p_id;
END;
$$;


ALTER FUNCTION "public"."create_room_instance"("p_id" "text", "p_room_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."map" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "image" "text" NOT NULL,
    "map_json_filename" "text" NOT NULL,
    "tileset_png_filename" "text" NOT NULL,
    "spawn_place_name" "text" NOT NULL,
    "voting_place_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."map" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."map_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."map_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."map_id_seq" OWNED BY "public"."map"."id";



CREATE TABLE IF NOT EXISTS "public"."message" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "text",
    "content" "text" NOT NULL,
    "from_user_id" "text",
    "from_npc_instance_id" integer,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_check" CHECK (((("from_user_id" IS NOT NULL) AND ("from_npc_instance_id" IS NULL)) OR (("from_user_id" IS NULL) AND ("from_npc_instance_id" IS NOT NULL))))
);


ALTER TABLE "public"."message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."npc" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "backstory" "text" NOT NULL,
    "sprite_definition" "jsonb" NOT NULL,
    "available_actions" "public"."npc_action"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."npc" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."npc_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."npc_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."npc_id_seq" OWNED BY "public"."npc"."id";



CREATE TABLE IF NOT EXISTS "public"."npc_instance" (
    "id" integer NOT NULL,
    "npc_id" integer,
    "room_instance_id" "text",
    "position_x" integer,
    "position_y" integer,
    "reflections" "text"[],
    "last_update" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."npc_instance" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."npc_instance_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."npc_instance_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."npc_instance_id_seq" OWNED BY "public"."npc_instance"."id";



CREATE TABLE IF NOT EXISTS "public"."npc_room" (
    "npc_id" integer NOT NULL,
    "room_id" integer NOT NULL
);


ALTER TABLE "public"."npc_room" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room" (
    "id" integer NOT NULL,
    "map_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "scenario" "text" NOT NULL,
    "type" "public"."room_type" DEFAULT 'private'::"public"."room_type",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "visible" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."room" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."room_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."room_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."room_id_seq" OWNED BY "public"."room"."id";



CREATE TABLE IF NOT EXISTS "public"."room_instance" (
    "id" "text" NOT NULL,
    "room_id" integer NOT NULL,
    "newspaper" "jsonb"[],
    "last_update" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."room_instance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thread" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY "public"."thread" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."thread" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thread_participant" (
    "thread_id" "text" NOT NULL,
    "user_id" "text",
    "npc_instance_id" integer,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_participant_check" CHECK (((("user_id" IS NOT NULL) AND ("npc_instance_id" IS NULL)) OR (("user_id" IS NULL) AND ("npc_instance_id" IS NOT NULL))))
);


ALTER TABLE "public"."thread_participant" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_room_instance" (
    "user_id" "text" NOT NULL,
    "room_instance_id" "text" NOT NULL
);


ALTER TABLE "public"."user_room_instance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "sprite_definition" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."map" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."map_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."npc" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."npc_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."npc_instance" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."npc_instance_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."room" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."room_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."map"
    ADD CONSTRAINT "map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."npc_instance"
    ADD CONSTRAINT "npc_instance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."npc"
    ADD CONSTRAINT "npc_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."npc_room"
    ADD CONSTRAINT "npc_room_pkey" PRIMARY KEY ("npc_id", "room_id");



ALTER TABLE ONLY "public"."room_instance"
    ADD CONSTRAINT "room_instance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room"
    ADD CONSTRAINT "room_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."thread"
    ADD CONSTRAINT "thread_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_room_instance"
    ADD CONSTRAINT "user_room_instance_pkey" PRIMARY KEY ("user_id", "room_instance_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_message_thread_id" ON "public"."message" USING "btree" ("thread_id");



CREATE INDEX "idx_npc_instance_npc_id" ON "public"."npc_instance" USING "btree" ("npc_id");



CREATE INDEX "idx_npc_instance_room_instance_id" ON "public"."npc_instance" USING "btree" ("room_instance_id");



CREATE INDEX "idx_room_instance_room_id" ON "public"."room_instance" USING "btree" ("room_id");



CREATE INDEX "idx_room_map_id" ON "public"."room" USING "btree" ("map_id");



CREATE INDEX "idx_thread_participant_npc_instance_id" ON "public"."thread_participant" USING "btree" ("npc_instance_id");



CREATE INDEX "idx_thread_participant_thread_id" ON "public"."thread_participant" USING "btree" ("thread_id");



CREATE INDEX "idx_thread_participant_user_id" ON "public"."thread_participant" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_from_npc_instance_id_fkey" FOREIGN KEY ("from_npc_instance_id") REFERENCES "public"."npc_instance"("id");



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id");



ALTER TABLE ONLY "public"."npc_instance"
    ADD CONSTRAINT "npc_instance_npc_id_fkey" FOREIGN KEY ("npc_id") REFERENCES "public"."npc"("id");



ALTER TABLE ONLY "public"."npc_instance"
    ADD CONSTRAINT "npc_instance_room_instance_id_fkey" FOREIGN KEY ("room_instance_id") REFERENCES "public"."room_instance"("id");



ALTER TABLE ONLY "public"."npc_room"
    ADD CONSTRAINT "npc_room_npc_id_fkey" FOREIGN KEY ("npc_id") REFERENCES "public"."npc"("id");



ALTER TABLE ONLY "public"."npc_room"
    ADD CONSTRAINT "npc_room_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id");



ALTER TABLE ONLY "public"."room_instance"
    ADD CONSTRAINT "room_instance_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id");



ALTER TABLE ONLY "public"."room"
    ADD CONSTRAINT "room_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id");



ALTER TABLE ONLY "public"."thread_participant"
    ADD CONSTRAINT "thread_participant_npc_instance_id_fkey" FOREIGN KEY ("npc_instance_id") REFERENCES "public"."npc_instance"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thread_participant"
    ADD CONSTRAINT "thread_participant_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id");



ALTER TABLE ONLY "public"."thread_participant"
    ADD CONSTRAINT "thread_participant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_room_instance"
    ADD CONSTRAINT "user_room_instance_room_instance_id_fkey" FOREIGN KEY ("room_instance_id") REFERENCES "public"."room_instance"("id");



ALTER TABLE ONLY "public"."user_room_instance"
    ADD CONSTRAINT "user_room_instance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."create_room_instance"("p_id" "text", "p_room_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_room_instance"("p_id" "text", "p_room_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_room_instance"("p_id" "text", "p_room_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."map" TO "anon";
GRANT ALL ON TABLE "public"."map" TO "authenticated";
GRANT ALL ON TABLE "public"."map" TO "service_role";



GRANT ALL ON SEQUENCE "public"."map_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."map_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."map_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."message" TO "anon";
GRANT ALL ON TABLE "public"."message" TO "authenticated";
GRANT ALL ON TABLE "public"."message" TO "service_role";



GRANT ALL ON TABLE "public"."npc" TO "anon";
GRANT ALL ON TABLE "public"."npc" TO "authenticated";
GRANT ALL ON TABLE "public"."npc" TO "service_role";



GRANT ALL ON SEQUENCE "public"."npc_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."npc_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."npc_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."npc_instance" TO "anon";
GRANT ALL ON TABLE "public"."npc_instance" TO "authenticated";
GRANT ALL ON TABLE "public"."npc_instance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."npc_instance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."npc_instance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."npc_instance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."npc_room" TO "anon";
GRANT ALL ON TABLE "public"."npc_room" TO "authenticated";
GRANT ALL ON TABLE "public"."npc_room" TO "service_role";



GRANT ALL ON TABLE "public"."room" TO "anon";
GRANT ALL ON TABLE "public"."room" TO "authenticated";
GRANT ALL ON TABLE "public"."room" TO "service_role";



GRANT ALL ON SEQUENCE "public"."room_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."room_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."room_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."room_instance" TO "anon";
GRANT ALL ON TABLE "public"."room_instance" TO "authenticated";
GRANT ALL ON TABLE "public"."room_instance" TO "service_role";



GRANT ALL ON TABLE "public"."thread" TO "anon";
GRANT ALL ON TABLE "public"."thread" TO "authenticated";
GRANT ALL ON TABLE "public"."thread" TO "service_role";
GRANT ALL ON TABLE "public"."thread" TO "authenticator";



GRANT ALL ON TABLE "public"."thread_participant" TO "anon";
GRANT ALL ON TABLE "public"."thread_participant" TO "authenticated";
GRANT ALL ON TABLE "public"."thread_participant" TO "service_role";



GRANT ALL ON TABLE "public"."user_room_instance" TO "anon";
GRANT ALL ON TABLE "public"."user_room_instance" TO "authenticated";
GRANT ALL ON TABLE "public"."user_room_instance" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
