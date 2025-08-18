
"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema, Voucher } from "./schemas"
import { revalidatePath } from "next/cache"

// Helper function to convert Firestore Timestamps to Dates in voucher objects
function voucherFromDoc(doc: any): Voucher {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    date: new Date(),
  };
}

export async function createVoucher(values: z.infer<typeof voucherSchema>) {
  console.log("createVoucher: Received values:", values);
  const validatedFields = voucherSchema.safeParse(values);

  if (!validatedFields.success) {
    console.error("createVoucher: Validation failed:", validatedFields.error);
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  console.log("createVoucher: Validated data (database is disabled):", validatedFields.data);
  revalidatePath("/view/vouchers");
  return { success: true, message: "Voucher created successfully! (Database is disabled)" };
}

export async function createProcess(values: z.infer<typeof processSchema>) {
  const validatedFields = processSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    };
  }

  console.log("createProcess: Validated data (database is disabled):", validatedFields.data);
  revalidatePath("/view/processes");
  revalidatePath("/view/vouchers");

  return { success: true, message: "Process saved successfully! (Database is disabled)" };
}

export async function createOutput(values: z.infer<typeof outputSchema>) {
  const validatedFields = outputSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    };
  }

   console.log("createOutput: Validated data (database is disabled):", validatedFields.data);
   revalidatePath("/view/outputs");
   return { success: true, message: "Output created successfully! (Database is disabled)" };
}

export async function getVouchers(
  filters: { name?: string; startDate?: Date; endDate?: Date }
): Promise<Voucher[]> {
  console.log("getVouchers: Called with filters (database is disabled):", filters);
  return [];
}

export async function getInventoryItem(name: string) {
    console.log("getInventoryItem: Called for item (database is disabled):", name);
    return { availableStock: 0, averagePrice: 0, code: 'DUMMY', quantityType: 'UNIT' };
}
