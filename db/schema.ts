import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const turretSaves = sqliteTable("turret_saves", {
  playerId: text("player_id").primaryKey(),
  snapshotJson: text("snapshot_json").notNull(),
  previousJson: text("previous_json"),
  revision: integer("revision").notNull(),
  mutationId: text("mutation_id").notNull(),
  updatedAt: text("updated_at").notNull(),
});
