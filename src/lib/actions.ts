
"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema, Voucher } from "./schemas"
import { revalidatePath } from "next/cache"

// Mock Data - Moved to global scope to persist between server action calls
let mockVouchers: Voucher[] = []

export async function createVoucher(values: z.infer<typeof voucherSchema>) {
  const validatedFields = voucherSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  // Here you would insert data into the database
  console.log("Creating voucher with data:", validatedFields.data)
  const newVoucher = { id: (mockVouchers.length + 1).toString(), ...validatedFields.data };
  mockVouchers.push(newVoucher);


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

  const { date, processName, rawMaterials, notes } = validatedFields.data

  // Here you would insert data into the database
  console.log("Creating process with data:", validatedFields.data);
  // This is where we would save the process recipe itself to a 'recipes' table.

  // Now, create negative voucher entries for each raw material used.
  for (const material of rawMaterials) {
    // In a real app, this rate would be fetched securely from the DB
    // For now, we'll simulate fetching an average price.
    const averagePrice = mockVouchers
      .filter(v => v.name === material.name && v.quantities > 0)
      .reduce(
        (acc, v) => {
          acc.totalValue += v.totalPrice
          acc.totalQty += v.quantities
          return acc
        },
        { totalValue: 0, totalQty: 0 }
      );
    
    const rate = averagePrice.totalQty > 0 ? averagePrice.totalValue / averagePrice.totalQty : 0;

    const negativeVoucher = {
      id: (mockVouchers.length + 1).toString(),
      date,
      name: material.name,
      code: material.code,
      quantities: -material.quantity, // Make it a negative quantity
      quantityType: material.quantityType,
      pricePerNo: rate,
      totalPrice: -material.quantity * rate,
      remarks: `Used in process: ${processName}. ${notes || ""}`.trim(),
    };
    mockVouchers.push(negativeVoucher);
    console.log("Creating negative voucher:", negativeVoucher)
  }


  // Simulate a database delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  revalidatePath("/view/processes");
  revalidatePath("/view/vouchers"); // Revalidate vouchers page to show deductions

  return { success: true, message: "Process saved and inventory updated!" };
}

export async function createOutput(values: z.infer<typeof outputSchema>) {
  const validatedFields = outputSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    };
  }

  // Here you would insert data into the database
  console.log("Creating output with data:", validatedFields.data);

  // Simulate a database delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  revalidatePath("/view/outputs"); // Example path to revalidate

  return { success: true, message: "Output created successfully!" };
}

export async function getVouchers(
  filters: { name?: string; startDate?: Date; endDate?: Date }
): Promise<Voucher[]> {
  console.log("Fetching vouchers with filters:", filters)
  await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay

  let filteredVouchers = mockVouchers

  if (filters.name) {
    filteredVouchers = filteredVouchers.filter(v => v.name === filters.name)
  }
  if (filters.startDate) {
    filteredVouchers = filteredVouchers.filter(v => new Date(v.date) >= filters.startDate!)
  }
  if (filters.endDate) {
    filteredVouchers = filteredVouchers.filter(v => new Date(v.date) <= filters.endDate!)
  }

  return JSON.parse(JSON.stringify(filteredVouchers))
}
