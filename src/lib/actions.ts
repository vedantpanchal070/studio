"use server"

import { z } from "zod"
import { voucherSchema, processSchema } from "./schemas"
import { revalidatePath } from "next/cache"

export async function createVoucher(values: z.infer<typeof voucherSchema>) {
  const validatedFields = voucherSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  // Here you would insert data into the database
  console.log("Creating voucher with data:", validatedFields.data)

  // Simulate a database delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  revalidatePath("/view/vouchers") // Example path to revalidate

  return { success: true, message: "Voucher created successfully!" }
}

export async function createProcess(values: z.infer<typeof processSchema>) {
  const validatedFields = processSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    };
  }

  // Here you would insert data into the database
  console.log("Creating process with data:", validatedFields.data);

  // Simulate a database delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  revalidatePath("/view/processes"); // Example path to revalidate

  return { success: true, message: "Process created successfully!" };
}
