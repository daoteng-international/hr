import { z } from "zod";

/**
 * RuleConfig — the tenant-configurable 差勤/薪資規則 DSL.
 *
 * Four loosely-coupled regions, intentionally permissive at this P0 stage but
 * already structured so the worker/payroll engine has a stable shape to read:
 *   - attendance_bonus 全勤獎金: base 金額 + 遲到階梯扣款 (tiers)
 *   - overtime 加班: 多條條件式倍率規則 (可選補休 compTime)
 *   - night 夜間: 時段視窗 + 倍率
 *   - payroll 薪資: 計薪方式 (月薪 / 按出勤天數) + 平日加班時薪等參數
 */

// 全勤獎金階梯：lateMinutesUpTo 為「累計遲到分鐘數上限」，null 代表「以上不封頂」
// (最後一階)。deduct 為該階扣款金額。
const AttendanceTierSchema = z.object({
  lateMinutesUpTo: z.number().nullable(),
  deduct: z.number(),
});

const AttendanceBonusSchema = z.object({
  base: z.number(),
  tiers: z.array(AttendanceTierSchema),
});

// 加班規則：when 描述觸發情境 (e.g. "holiday" / "weekday" / "restday")，
// multiplier 為倍率，compTime 為是否改以補休 (預設不補休)。
const OvertimeRuleSchema = z.object({
  when: z.string(),
  multiplier: z.number(),
  compTime: z.boolean().optional(),
});

const OvertimeSchema = z.object({
  rules: z.array(OvertimeRuleSchema),
});

// 夜間加給：window 為時段視窗 ("HH:MM")，multiplier 為倍率。
const NightSchema = z.object({
  window: z.object({
    from: z.string(),
    to: z.string(),
  }),
  multiplier: z.number(),
});

// 計薪：method 月薪或按出勤天數；overtimeFlatHourly 為平日加班統一時薪；
// dailyRegularHours 為每日正常工時 (折算用)。
const PayrollSchema = z.object({
  method: z.enum(["monthly", "by_attendance_days"]),
  overtimeFlatHourly: z.number().optional(),
  dailyRegularHours: z.number().optional(),
});

export const RuleConfigSchema = z.object({
  attendance_bonus: AttendanceBonusSchema,
  overtime: OvertimeSchema,
  night: NightSchema,
  payroll: PayrollSchema,
});

export type RuleConfig = z.infer<typeof RuleConfigSchema>;

/**
 * Parse-and-validate an unknown input into a typed RuleConfig.
 * Throws a ZodError when the input does not match the schema.
 */
export function parseRuleConfig(input: unknown): RuleConfig {
  return RuleConfigSchema.parse(input);
}
