import { pgTable, uuid, text, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"

/**
 * Employee profiles — 1:1 contact / personal extension of an employee (My Data ▸
 * 通訊資料 / 基本資料). Unique (tenant_id, employee_id) makes it a true 1:1 and
 * powers the upsert in PUT /employees/:id/profile.
 */
export const employeeProfiles = pgTable(
  "employee_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    phone: text("phone"),
    personalEmail: text("personal_email"),
    address: text("address"),
    emergencyContact: text("emergency_contact"),
    emergencyPhone: text("emergency_phone"),
    birthday: date("birthday"),
    gender: text("gender"),
    maritalStatus: text("marital_status"),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantEmployeeUnique: uniqueIndex("employee_profiles_tenant_employee_uq").on(
      table.tenantId,
      table.employeeId,
    ),
  }),
)
