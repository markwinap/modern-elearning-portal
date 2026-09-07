import "dotenv/config";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(databaseUrl);

const statements = [
  // Course full-text search
  `ALTER TABLE "pg-drizzle_course"
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS course_search_vector_idx
    ON "pg-drizzle_course" USING GIN(search_vector);`,

  // Activity full-text search
  `ALTER TABLE "pg-drizzle_activity"
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS activity_search_vector_idx
    ON "pg-drizzle_activity" USING GIN(search_vector);`,

  // Wiki page full-text search
  `ALTER TABLE "pg-drizzle_wiki_page"
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS wiki_page_search_vector_idx
    ON "pg-drizzle_wiki_page" USING GIN(search_vector);`,

  // Discussion (message thread + message) full-text search
  `ALTER TABLE "pg-drizzle_message_thread"
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(subject, ''))) STORED NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS message_thread_search_vector_idx
    ON "pg-drizzle_message_thread" USING GIN(search_vector);`,

  `ALTER TABLE "pg-drizzle_message"
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS message_search_vector_idx
    ON "pg-drizzle_message" USING GIN(search_vector);`,
];

async function main() {
  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      console.log("Executed:", statement.split("\n")[0].trim());
    } catch (error) {
      console.error("Failed to execute statement:", statement.split("\n")[0].trim());
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }
  await sql.end();
}

await main();
