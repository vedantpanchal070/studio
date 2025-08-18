import * as z from "zod"

export const voucherSchema = z.object({
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
  outputProduct: z.string().min(1, "Output product name is required."),
  totalProcessOutput: z.coerce.number().gt(0, "Total output must be a positive number."),
  outputUnit: z.string().min(1, "Output unit is required."),
  rawMaterials: z.array(z.object({
    name: z.string().min(1, "Raw material name is required."),
    quantity: z.coerce.number().gt(0, "Quantity must be a positive number."),
    // The following fields are for frontend calculation and not part of the final submission schema
    ratio: z.coerce.number().optional(),
  })).min(1, "At least one raw material is required."),
  notes: z.string().optional(),
});


export const outputSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  productName: z.string().min(1, "Product name is required."),
  quantityProduced: z.coerce.number().gt(0, "Quantity must be a positive number."),
  processUsed: z.string().min(1, "The process used is required."),
  notes: z.string().optional(),
})
