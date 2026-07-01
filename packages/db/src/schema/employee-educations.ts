import { pgTable, uuid, text, date, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"

/** Employee education records — 學歷 (My Data ▸ 學歷證照). N per employee. */
export const employeeEducations = pgTable("employee_educations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  school: text("school").notNull(),
  major: text("major"),
  degree: text("degree"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
