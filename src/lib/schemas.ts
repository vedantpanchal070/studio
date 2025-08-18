
import * as z from "zod"

export const voucherSchema = z.object({
  id: z.string().optional(), // Adding ID, optional as it will be created on the server
  date: z.date({
    required_error: "A date is required.",
  }),
  name: z.string().min(1, "Item name is required."),
  code: z.string().min(1, "Item code is required."),
  quantities: z.coerce.number().gt(0, "Quantity must be a positive number."),
  quantityType: z.string().min(1, "Quantity type is required."),
  pricePerNo: z.coerce
    .number()
    .gt(0, "Price per unit must be a positive number."),
  totalPrice: z.coerce.number(),
  remarks: z.string().optional(),
})

export const processSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  processName: z.string().min(1, "Process name is required."),
  totalProcessOutput: z.coerce.number().gt(0, "Total output must be a positive number."),
  outputUnit: z.string().min(1, "Output unit is required."),
  rawMaterials: z.array(z.object({
    name: z.string().min(1, "Raw material name is required."),
    code: z.string().min(1, "Item code is required."),
    quantityType: z.string().min(1, "Quantity type is required."),
    quantity: z.coerce.number().gt(0, "Quantity must be a positive number."),
    ratio: z.coerce.number().optional(),
    rate: z.coerce.number().optional(),
  })).min(1, "At least one raw material is required."),
  notes: z.string().optional(),
});


export const outputSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  productName: z.string().min(1, "Product name is required."),
  processUsed: z.string().min(1, "The process used is required."),
  scrape: z.coerce.number().min(0, "Scrape must be a positive number.").optional(),
  scrapeUnit: z.enum(["kg", "%"]).optional(),
  reduction: z.coerce.number().min(0, "Reduction must be a positive number.").optional(),
  processCharge: z.coerce.number().min(0, "Process charge must be a positive number.").optional(),
  quantityProduced: z.coerce.number(),
  finalAveragePrice: z.coerce.number(),
  notes: z.string().optional(),
})

export type Voucher = z.infer<typeof voucherSchema> & { id: string }
