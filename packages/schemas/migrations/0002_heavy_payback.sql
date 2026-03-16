DO $$ BEGIN
 CREATE TYPE "public"."cocktail_difficulty" AS ENUM('easy', 'medium', 'hard');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "cocktails" ALTER COLUMN "difficulty" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cocktails" ALTER COLUMN "difficulty" SET DATA TYPE cocktail_difficulty USING
  CASE difficulty::int
    WHEN 1 THEN 'easy'::cocktail_difficulty
    WHEN 2 THEN 'easy'::cocktail_difficulty
    WHEN 3 THEN 'medium'::cocktail_difficulty
    WHEN 4 THEN 'hard'::cocktail_difficulty
    WHEN 5 THEN 'hard'::cocktail_difficulty
    ELSE NULL
  END;--> statement-breakpoint
ALTER TABLE "cocktails" ADD COLUMN "is_alcoholic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cocktails" ADD COLUMN "main_alcohol_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cocktails" ADD CONSTRAINT "cocktails_main_alcohol_id_alcohol_types_id_fk" FOREIGN KEY ("main_alcohol_id") REFERENCES "public"."alcohol_types"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
