
"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema } from "./schemas"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const VOUCHERS_FILE = path.join(DATA_DIR, "vouchers.json")
const PROCESSES_FILE = path.join(DATA_DIR, "processes.json")
const OUTPUTS_FILE = path.join(DATA_DIR, "outputs.json")


// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error("Error creating data directory:", error)
  }
}

async function readJsonFile(filePath: string): Promise<any[]> {
    try {
        await ensureDataDir();
        const fileContent = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(fileContent);
        // Ensure date fields are Date objects if they exist
        return data.map((item: any) => item.date ? { ...item, date: new Date(item.date) } : item);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            await writeJsonFile(filePath, []); // File doesn't exist, create it.
            return [];
        }
        console.error(`Failed to read from ${path.basename(filePath)}:`, error);
        return [];
    }
}

async function writeJsonFile(filePath: string, data: any[]) {
    try {
        await ensureDataDir();
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Failed to write to ${path.basename(filePath)}:`, error);
    }
}


// Vouchers
const readVouchers = () => readJsonFile(VOUCHERS_FILE);
const writeVouchers = (data: any[]) => writeJsonFile(VOUCHERS_FILE, data);

// Processes
const readProcesses = () => readJsonFile(PROCESSES_FILE);
const writeProcesses = (data: any[]) => writeJsonFile(PROCESSES_FILE, data);

// Outputs
const readOutputs = () => readJsonFile(OUTPUTS_FILE);
const writeOutputs = (data: any[]) => writeJsonFile(OUTPUTS_FILE, data);


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
    revalidatePath("/create/process") // To update ingredient lists
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
    const allProcesses = await readProcesses();

    // Check for sufficient stock before proceeding
    for (const material of rawMaterials) {
        const inventory = await getInventoryItem(material.name);
        if (inventory.availableStock < material.quantity) {
            return {
                success: false,
                message: `Insufficient stock for ${material.name}. Available: ${inventory.availableStock}, Required: ${material.quantity}`,
            };
        }
    }
    
    allProcesses.push(validatedFields.data);
    await writeProcesses(allProcesses);


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
    revalidatePath("/create/output");
    revalidatePath("/view/processes");

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
  const validatedFields = outputSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  try {
    const { date, productName, quantityProduced, processCharge, scrape, scrapeUnit, notes } = validatedFields.data;
    const allOutputs = await readOutputs();
    const allVouchers = await readVouchers();

    // 1. Save the main output record
    const newOutput = {
      ...validatedFields.data,
      id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
    };
    allOutputs.push(newOutput);
    await writeOutputs(allOutputs);
    
    // 2. Add the finished good to inventory (vouchers)
    const finishedGoodVoucher = {
        id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
        date,
        name: productName,
        code: "FG-" + productName, // Simple finished good code
        quantities: quantityProduced,
        quantityType: "KG", // Assuming KG for now, can be made dynamic
        pricePerNo: validatedFields.data.finalAveragePrice,
        totalPrice: quantityProduced * validatedFields.data.finalAveragePrice,
        remarks: `PRODUCED FROM ${validatedFields.data.processUsed}`,
    };
    allVouchers.push(finishedGoodVoucher);


    // 3. Add scrape back to inventory if applicable
    let scrapeQty = 0;
    if (scrape && scrape > 0) {
        const processDetails = await getProcessDetails(validatedFields.data.processUsed);
        if (scrapeUnit === '%') {
            scrapeQty = (processDetails?.totalProcessOutput || 0) * (scrape / 100);
        } else {
            scrapeQty = scrape;
        }

        if (scrapeQty > 0) {
            const scrapeVoucher = {
                id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
                date,
                name: `${productName} - SCRAPE`,
                code: `SCRAPE-${productName}`,
                quantities: scrapeQty,
                quantityType: 'KG',
                pricePerNo: 0, // Scrape has no value until re-processed
                totalPrice: 0,
                remarks: `SCRAPE FROM ${validatedFields.data.processUsed}`,
            };
            allVouchers.push(scrapeVoucher);
        }
    }
    
    await writeVouchers(allVouchers);

    revalidatePath("/view/vouchers");
    revalidatePath("/view/outputs");

    return { success: true, message: "Output and scrape saved to inventory." };
  } catch (error) {
    console.error("Failed to save output:", error);
    return { success: false, message: "Failed to save output." };
  }
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
    
    const latestVoucher = itemVouchers.sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    return { 
        availableStock: availableStock || 0, 
        averagePrice: averagePrice || 0,
        code: latestVoucher?.code || "",
        quantityType: latestVoucher?.quantityType || "",
    };
}

export async function getVoucherItemNames(): Promise<string[]> {
    const vouchers = await readVouchers();
    const purchaseVouchers = vouchers.filter(v => v.quantities > 0 && !v.remarks?.includes("PRODUCED FROM"));
    const names = new Set(purchaseVouchers.map(v => v.name));
    return Array.from(names).sort();
}

export interface ProcessDetails {
  processName: string;
  totalProcessOutput: number;
  totalCost: number;
}

export async function getProcessNamesAndDetails(): Promise<ProcessDetails[]> {
  const processes = await readProcesses();
  return processes.map(p => {
    const totalCost = p.rawMaterials.reduce((sum: number, mat: any) => sum + (mat.rate * mat.quantity), 0);
    return {
      processName: p.processName,
      totalProcessOutput: p.totalProcessOutput,
      totalCost,
    };
  });
}

async function getProcessDetails(name: string): Promise<ProcessDetails | null> {
    const processes = await getProcessNamesAndDetails();
    return processes.find(p => p.processName === name) || null;
}

export async function getProcesses(filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    let processes = await readProcesses();

    if (filters.name) {
        processes = processes.filter(p => p.processName === filters.name);
    }
    if (filters.startDate) {
        processes = processes.filter(p => p.date >= filters.startDate!);
    }
    if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        processes = processes.filter(p => p.date <= endDate);
    }
    
    return processes.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getUniqueProcessNames(): Promise<string[]> {
    const processes = await readProcesses();
    const names = new Set(processes.map(p => p.processName));
    return Array.from(names).sort();
}
