DO $$ BEGIN
 CREATE TYPE "public"."cocktail_difficulty" AS ENUM('easy', 'medium', 'hard');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "cocktails" ALTER COLUMN "difficulty" SET DATA TYPE cocktail_difficulty USING (CASE difficulty WHEN 1 THEN 'easy' WHEN 2 THEN 'medium' WHEN 3 THEN 'hard' ELSE 'medium' END)::cocktail_difficulty;--> statement-breakpoint
ALTER TABLE "cocktails" ALTER COLUMN "difficulty" SET DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "cocktails" ADD COLUMN "is_alcoholic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cocktails" ADD COLUMN "main_alcohol_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cocktails" ADD CONSTRAINT "cocktails_main_alcohol_id_alcohol_types_id_fk" FOREIGN KEY ("main_alcohol_id") REFERENCES "public"."alcohol_types"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
