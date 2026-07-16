import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"

export const quoteLeadsRouter = Router()

const adminEmail = process.env.QUOTE_ADMIN_EMAIL ?? "daoteng.office@gmail.com"
const lineOfficialUrl = "https://line.me/R/ti/p/jWy10iiO7D"

const selectedModuleSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40),
})

const quoteLeadSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(6).max(40),
    email: z.string().trim().email().max(160),
  }),
  quote: z.object({
    employees: z.number().int().min(1).max(10_000),
    billingCycle: z.enum(["monthly", "annual"]),
    monthly: z.number().min(0).max(100_000_000),
    yearly: z.number().min(0).max(1_000_000_000),
    implementation: z.number().min(0).max(100_000_000),
    selectedModules: z.array(selectedModuleSchema).min(1).max(30),
  }),
  pageUrl: z.string().trim().url().max(500).optional(),
})

type QuoteLead = z.infer<typeof quoteLeadSchema>

class QuoteEmailNotConfiguredError extends Error {
  constructor() {
    super("Quote email sender is not configured")
  }
}

function currency(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function leadText(data: QuoteLead): string {
  const selectedModules = data.quote.selectedModules
    .map((item) => `- ${item.name}（${item.category}）`)
    .join("\n")

  return [
    "HRLink 方案估價器收到新的客戶洽詢。",
    "",
    "【客戶資料】",
    `姓名：${data.customer.name}`,
    `電話：${data.customer.phone}`,
    `Email：${data.customer.email}`,
    "",
    "【報價方案】",
    `員工數：${data.quote.employees} 人`,
    `付款週期：${data.quote.billingCycle === "annual" ? "年繳（約 86 折）" : "月繳"}`,
    `月費預估：${currency(data.quote.monthly)}`,
    `年費預估：${currency(data.quote.yearly)}`,
    `導入設定費：${currency(data.quote.implementation)}`,
    "",
    "【選購模組】",
    selectedModules,
    "",
    `LINE@：${lineOfficialUrl}`,
    data.pageUrl ? `來源頁面：${data.pageUrl}` : null,
    "",
    "備註：此為系統自動寄出的初步估價，正式報價仍可依導入範圍、資料移轉、客製整合與合約年限調整。",
  ]
    .filter((item): item is string => Boolean(item))
    .join("\n")
}

async function sendQuoteEmail(data: QuoteLead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.QUOTE_EMAIL_FROM ?? process.env.NOTIFICATION_EMAIL_FROM
  if (!apiKey || !from) throw new QuoteEmailNotConfiguredError()

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: adminEmail,
      reply_to: data.customer.email,
      subject: `HRLink 新報價洽詢｜${data.customer.name}｜${data.quote.employees} 人`,
      text: leadText(data),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Resend ${response.status}: ${text.slice(0, 300)}`)
  }
}

quoteLeadsRouter.post("/quote-leads", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = quoteLeadSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
    return
  }

  try {
    await sendQuoteEmail(parsed.data)
    res.status(201).json({ ok: true })
  } catch (err) {
    if (err instanceof QuoteEmailNotConfiguredError) {
      res.status(503).json({ error: "email_not_configured" })
      return
    }
    next(err)
  }
})
