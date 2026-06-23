import { pgTable, uuid, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

/**
 * Leave types — the catalogue of leave categories a tenant offers (e.g. "annual"
 * /特休, "sick"/病假). `code` is a short stable key unique per tenant; `name` is
 * the human label; `paid` flags whether the leave is paid. Only used by requests
 * of kind 'leave'. The unique (tenant_id, code) index lets a tenant reuse a code
 * another tenant already took while keeping it unique within their own org.
 */
export const leaveTypes = pgTable(
  "leave_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    paid: boolean("paid").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantCodeUnique: uniqueIndex("leave_types_tenant_code_uq").on(table.tenantId, table.code),
  }),
)
