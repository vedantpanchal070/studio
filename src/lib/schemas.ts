
import * as z from "zod"

export const voucherSchema = z.object({
  id: z.string().optional(), // Adding ID, optional as it will be created on the server
  date: z.date({
    required_error: "A date is required.",
  }),
  name: z.string().min(1, "Item name is required."),
  code: z.string().min(1, "Item code is required."),
  quantities: z.coerce.number().refine(val => val !== 0, "Quantity cannot be zero."),
  quantityType: z.string().min(1, "Quantity type is required."),
  pricePerNo: z.coerce
    .number()
    .min(0, "Price per unit must be a positive number."),
  totalPrice: z.coerce.number(),
  remarks: z.string().optional(),
})

const rawMaterialSchema = z.object({
  name: z.string().min(1, "Raw material name is required."),
  code: z.string().min(1, "Item code is required."),
  quantityType: z.string().min(1, "Quantity type is required."),
  quantity: z.coerce.number().gt(0, "Quantity must be a positive number."),
  ratio: z.coerce.number().optional(),
  rate: z.coerce.number().optional(),
})

export const processSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  processName: z.string().min(1, "Process name is required."),
  totalProcessOutput: z.coerce.number().gt(0, "Total output must be a positive number."),
  outputUnit: z.string().min(1, "Output unit is required."),
  rawMaterials: z.array(rawMaterialSchema).min(1, "At least one raw material is required."),
  notes: z.string().optional(),
});


export const outputSchema = z.object({
  id: z.string().optional(),
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

export const saleSchema = z.object({
  id: z.string().optional(),
  date: z.date({
    required_error: "A date is required.",
  }),
  productName: z.string().min(1, "Product name is required."),
  clientCode: z.string().min(1, "Client code is required."),
  saleQty: z.coerce.number().gt(0, "Sale quantity must be positive."),
  salePrice: z.coerce.number().min(0, "Sale price must be positive."),
  totalAmount: z.coerce.number(),
});

export type Voucher = z.infer<typeof voucherSchema> & { id: string }
export type Process = z.infer<typeof processSchema>;
export type Output = z.infer<typeof outputSchema> & { id: string };
export type Sale = z.infer<typeof saleSchema> & { id: string };


export interface FinishedGood {
  name: string;
  availableStock: number;
}
