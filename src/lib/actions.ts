
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

async function readVouchers(): Promise<any[]> {
    try {
        await ensureDataDir();
        const fileContent = await fs.readFile(VOUCHERS_FILE, "utf-8");
        const vouchers = JSON.parse(fileContent);
        // Ensure date fields are Date objects
        return vouchers.map((v: any) => ({ ...v, date: new Date(v.date) }));
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return []; // File doesn't exist, return empty array
        }
        console.error("Failed to read vouchers from file:", error);
        return [];
    }
}

async function writeVouchers(vouchers: any[]) {
    try {
        await ensureDataDir();
        await fs.writeFile(VOUCHERS_FILE, JSON.stringify(vouchers, null, 2));
    } catch (error) {
        console.error("Failed to write vouchers to file:", error);
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
    const vouchers = await readVouchers();

    const newVoucher = {
      ...validatedFields.data,
      id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
    }

    vouchers.push(newVoucher)
    await writeVouchers(vouchers)

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
  const validatedFields = processSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }
  
  const { date, rawMaterials, processName } = validatedFields.data;

  try {
    const allVouchers = await readVouchers();

    for (const material of rawMaterials) {
        // Create a new voucher for the raw material consumption
        const processVoucher = {
            id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
            date: date,
            name: material.name,
            code: material.code,
            quantities: -material.quantity, // Negative quantity for consumption
            quantityType: material.quantityType,
            pricePerNo: material.rate || 0,
            totalPrice: (material.rate || 0) * material.quantity,
            remarks: `USED IN ${processName}`,
        };
        allVouchers.push(processVoucher);
    }

    await writeVouchers(allVouchers);

    revalidatePath("/view/vouchers");
    revalidatePath("/create/process");

    return { success: true, message: "Process saved successfully, inventory updated." };
  } catch (error) {
      console.error("Failed to save process to file:", error);
      return {
          success: false,
          message: "Failed to save process to file.",
      };
  }
}

export async function createOutput(values: z.infer<typeof outputSchema>) {
  console.log("createOutput: Received values (File storage not implemented):", values)
  return { success: true, message: "Output creation is not implemented for file storage." }
}

export async function getVouchers(filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    let vouchers = await readVouchers();

    if (filters.name) {
        vouchers = vouchers.filter(v => v.name === filters.name);
    }
    if (filters.startDate) {
        vouchers = vouchers.filter(v => v.date >= filters.startDate!);
    }
    if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end day
        vouchers = vouchers.filter(v => v.date <= endDate);
    }
    
    return vouchers;
}

export async function getInventoryItem(name: string) {
    if (!name) {
        return { availableStock: 0, averagePrice: 0, code: "", quantityType: "" };
    }
  
    const allVouchers = await readVouchers();
    const itemVouchers = allVouchers.filter(v => v.name === name);

    if (itemVouchers.length === 0) {
        return { availableStock: 0, averagePrice: 0, code: "", quantityType: "" };
    }

    const totalInputQty = itemVouchers
        .filter(v => v.quantities > 0)
        .reduce((sum, v) => sum + v.quantities, 0);

    const totalOutputQty = itemVouchers
        .filter(v => v.quantities < 0)
        .reduce((sum, v) => sum + v.quantities, 0);

    const availableStock = totalInputQty + totalOutputQty;

    const totalInputValue = itemVouchers
        .filter(v => v.quantities > 0)
        .reduce((sum, v) => sum + v.totalPrice, 0);

    const averagePrice = totalInputQty > 0 ? totalInputValue / totalInputQty : 0;
    
    const latestVoucher = itemVouchers[itemVouchers.length - 1];

    return { 
        availableStock: availableStock || 0, 
        averagePrice: averagePrice || 0,
        code: latestVoucher?.code || "",
        quantityType: latestVoucher?.quantityType || "",
    };
}

