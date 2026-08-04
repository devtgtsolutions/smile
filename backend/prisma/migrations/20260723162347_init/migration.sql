-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('NORMAL', 'DOWN', 'MAINTENANCE', 'KARAOKE_ONLY', 'QUIZ_ONLY', 'AMBIANCE');

-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('QUIZ', 'BLIND_TEST', 'KARAOKE');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('QUIZ', 'BLIND_TEST', 'KARAOKE', 'AMBIANCE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('WAITING', 'ACTIVE', 'PAUSED', 'FINISHED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'DEBUG');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'NORMAL',
    "ip_address" INET,
    "last_heartbeat" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "refresh_token_hash" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL DEFAULT 'SUPER_ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_catalog" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "type" "QuizType" NOT NULL,
    "difficulty" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "media_url" VARCHAR(255),
    "time_limit" INTEGER NOT NULL DEFAULT 30,
    "points" INTEGER NOT NULL DEFAULT 1,
    "shuffle_options" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "answer_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karaoke_songs" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "artist" VARCHAR(255) NOT NULL,
    "lyrics_json" JSONB NOT NULL,
    "external_api_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "karaoke_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_configurations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "audio_profile" JSONB NOT NULL DEFAULT '{"volume": 70, "eq_bands": {}, "latency_compensation": 20}',
    "lighting_profile" JSONB NOT NULL DEFAULT '{"default_ambiance": "WARM", "intensity": 80, "dmx_universe": 1}',
    "buzzer_config" JSONB NOT NULL DEFAULT '{"debounce_ms": 50, "sound_effect": "click.wav"}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quiz_id" TEXT,
    "mode" "GameMode" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'WAITING',
    "current_question_index" INTEGER NOT NULL DEFAULT 0,
    "scores_cache" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "buzzer_tablet_id" VARCHAR(50),
    "color" VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_answers" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_option_id" TEXT,
    "is_correct" BOOLEAN,
    "response_time_ms" INTEGER,
    "score_earned" INTEGER NOT NULL DEFAULT 0,
    "joker_used" JSONB,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_sync_status" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "last_full_sync" TIMESTAMP(3),
    "quiz_version" INTEGER NOT NULL DEFAULT 0,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cache_sync_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_name_key" ON "tenants"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "quiz_catalog_category_idx" ON "quiz_catalog"("category");

-- CreateIndex
CREATE INDEX "quiz_catalog_is_active_idx" ON "quiz_catalog"("is_active");

-- CreateIndex
CREATE INDEX "questions_quiz_id_order_index_idx" ON "questions"("quiz_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "room_configurations_tenant_id_key" ON "room_configurations"("tenant_id");

-- CreateIndex
CREATE INDEX "game_sessions_tenant_id_status_idx" ON "game_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "game_sessions_tenant_id_started_at_idx" ON "game_sessions"("tenant_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "players_game_session_id_idx" ON "players"("game_session_id");

-- CreateIndex
CREATE INDEX "player_answers_game_session_id_player_id_idx" ON "player_answers"("game_session_id", "player_id");

-- CreateIndex
CREATE INDEX "player_answers_question_id_idx" ON "player_answers"("question_id");

-- CreateIndex
CREATE INDEX "system_logs_tenant_id_created_at_idx" ON "system_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cache_sync_status_tenant_id_key" ON "cache_sync_status"("tenant_id");

-- CreateIndex
CREATE INDEX "cache_sync_status_tenant_id_idx" ON "cache_sync_status"("tenant_id");

-- AddForeignKey
ALTER TABLE "quiz_catalog" ADD CONSTRAINT "quiz_catalog_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karaoke_songs" ADD CONSTRAINT "karaoke_songs_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_configurations" ADD CONSTRAINT "room_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "answer_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cache_sync_status" ADD CONSTRAINT "cache_sync_status_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
