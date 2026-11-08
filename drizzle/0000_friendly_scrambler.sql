CREATE TABLE `turret_saves` (
	`player_id` text PRIMARY KEY NOT NULL,
	`snapshot_json` text NOT NULL,
	`previous_json` text,
	`revision` integer NOT NULL,
	`mutation_id` text NOT NULL,
	`updated_at` text NOT NULL
);
