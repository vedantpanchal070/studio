"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema, Voucher } from "./schemas"
import { revalidatePath } from "next/cache"

// Mock Data
const mockVouchers: Voucher[] = [
  { id: '1', date: new Date('2023-10-01'), name: 'MUSTARD OIL', code: 'MO001', quantities: 100, quantityType: 'KG', pricePerNo: 150, totalPrice: 15000, remarks: 'Purchase from supplier A' },
  { id: '2', date: new Date('2023-10-02'), name: 'FLOUR', code: 'FL001', quantities: 500, quantityType: 'KG', pricePerNo: 40, totalPrice: 20000, remarks: 'Purchase from supplier B' },
  { id: '3', date: new Date('2023-10-03'), name: 'MUSTARD OIL', code: 'MO001', quantities: -20, quantityType: 'KG', pricePerNo: 150, totalPrice: -3000, remarks: 'Used in Spicy Oil Blend' },
  { id: '4', date: new Date('2023-10-04'), name: 'SUGAR', code: 'SU001', quantities: 200, quantityType: 'KG', pricePerNo: 50, totalPrice: 10000, remarks: 'Purchase from supplier A' },
  { id: '5', date: new Date('2023-10-05'), name: 'FLOUR', code: 'FL001', quantities: -100, quantityType: 'KG', pricePerNo: 40, totalPrice: -4000, remarks: 'Used in Biscuits' },
  { id: '6', date: new Date('2023-10-06'), name: 'MUSTARD OIL', code: 'MO001', quantities: 50, quantityType: 'KG', pricePerNo: 155, totalPrice: 7750, remarks: 'Purchase from supplier C' },
]

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

  // Here you would insert data into the database
  console.log("Creating process with data:", validatedFields.data);

  // Simulate a database delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  revalidatePath("/view/processes"); // Example path to revalidate

  return { success: true, message: "Process created successfully!" };
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
    filteredVouchers = filteredVouchers.filter(v => v.date >= filters.startDate!)
  }
  if (filters.endDate) {
    filteredVouchers = filteredVouchers.filter(v => v.date <= filters.endDate!)
  }

  return JSON.parse(JSON.stringify(filteredVouchers))
}
