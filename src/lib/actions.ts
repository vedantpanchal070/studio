
"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema } from "./schemas"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const VOUCHERS_FILE = path.join(DATA_DIR, "vouchers.json")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error("Error creating data directory:", error)
  }
}

export async function createVoucher(values: z.infer<typeof voucherSchema>) {
  const validatedFields = voucherSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  try {
    await ensureDataDir()

    let vouchers = []
    try {
      const fileContent = await fs.readFile(VOUCHERS_FILE, "utf-8")
      vouchers = JSON.parse(fileContent)
    } catch (error: any) {
      // If the file doesn't exist, we'll start with an empty array.
      if (error.code !== "ENOENT") {
        throw error
      }
    }

    const newVoucher = {
      ...validatedFields.data,
      id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
    }

    vouchers.push(newVoucher)

    await fs.writeFile(VOUCHERS_FILE, JSON.stringify(vouchers, null, 2))

    revalidatePath("/view/vouchers")
    return { success: true, message: "Voucher saved to file successfully!" }
  } catch (error) {
    console.error("Failed to save voucher to file:", error)
    return {
      success: false,
      message: "Failed to save voucher to file.",
    }
  }
}

export async function createProcess(values: z.infer<typeof processSchema>) {
  console.log("createProcess: Received values (File storage not implemented):", values)
  return { success: true, message: "Process creation is not implemented for file storage." }
}

export async function createOutput(values: z.infer<typeof outputSchema>) {
  console.log("createOutput: Received values (File storage not implemented):", values)
  return { success: true, message: "Output creation is not implemented for file storage." }
}

export async function getVouchers(filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    console.log("getVouchers: Called with filters (File storage not implemented):", filters);
    try {
        await ensureDataDir();
        const fileContent = await fs.readFile(VOUCHERS_FILE, "utf-8");
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Failed to read vouchers from file:", error);
        return [];
    }
}

export async function getInventoryItem(name: string) {
  console.log("getInventoryItem: Called for item (File storage not implemented):", name)
  return { availableStock: 0, averagePrice: 0, code: "DUMMY", quantityType: "UNIT" }
}
