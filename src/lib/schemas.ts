import * as z from "zod"

export const voucherSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  voucherNo: z.string().min(1, "Voucher No. is required."),
  rawMaterial: z.string().min(1, "Raw Material name is required."),
  quantity: z.coerce.number().gt(0, "Quantity must be a positive number."),
  pricePerUnit: z.coerce
    .number()
    .gt(0, "Price per unit must be a positive number."),
  totalPrice: z.coerce.number(),
  remarks: z.string().optional(),
})
