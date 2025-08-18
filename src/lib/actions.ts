
"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema, saleSchema, type Process, type Voucher, type FinishedGood, type Output, type Sale } from "./schemas"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"
import crypto from "crypto"

const DATA_DIR = path.join(process.cwd(), "data")
const VOUCHERS_FILE = path.join(DATA_DIR, "vouchers.json")
const PROCESSES_FILE = path.join(DATA_DIR, "processes.json")
const OUTPUTS_FILE = path.join(DATA_DIR, "outputs.json")
const SALES_FILE = path.join(DATA_DIR, "sales.json")
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json")


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
        // When parsing from JSON, assume the date string is in UTC format.
        // The 'Z' at the end of an ISO string signifies UTC. If it's not present,
        // new Date() might interpret it in the server's local timezone.
        // We manually ensure we treat it as a UTC date string.
        return data.map((item: any) => {
            if (item.date && typeof item.date === 'string') {
                const dateStr = item.date.endsWith('Z') ? item.date : `${item.date}Z`;
                return { ...item, date: new Date(dateStr) };
            }
            return item;
        });
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
const readVouchers = (): Promise<Voucher[]> => readJsonFile(VOUCHERS_FILE);
const writeVouchers = (data: any[]) => writeJsonFile(VOUCHERS_FILE, data);

// Processes
const readProcesses = (): Promise<Process[]> => readJsonFile(PROCESSES_FILE);
const writeProcesses = (data: any[]) => writeJsonFile(PROCESSES_FILE, data);

// Outputs
const readOutputs = (): Promise<Output[]> => readJsonFile(OUTPUTS_FILE);
const writeOutputs = (data: any[]) => writeJsonFile(OUTPUTS_FILE, data);

// Sales
const readSales = (): Promise<Sale[]> => readJsonFile(SALES_FILE);
const writeSales = (data: any[]) => writeJsonFile(SALES_FILE, data);


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
    
    allProcesses.push({
      ...validatedFields.data,
      id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
    });
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
    revalidatePath("/view/inventory");


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
    revalidatePath("/view/inventory");


    return { success: true, message: "Output and scrape saved to inventory." };
  } catch (error) {
    console.error("Failed to save output:", error);
    return { success: false, message: "Failed to save output." };
  }
}

export async function recordSale(values: z.infer<typeof saleSchema>) {
  const validatedFields = saleSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid sale data.",
    }
  }

  const { productName, saleQty, date, clientCode } = validatedFields.data;

  try {
    const allVouchers = await readVouchers();
    const allSales = await readSales();
    
    // Final stock check
    const inventory = await getInventoryItem(productName);
    if (inventory.availableStock < saleQty) {
        return {
            success: false,
            message: `Insufficient stock for ${productName}. Available: ${inventory.availableStock}`,
        };
    }

    // 1. Save the sales record
    const newSale = {
        ...validatedFields.data,
        id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
    }
    allSales.push(newSale);
    await writeSales(allSales);

    // 2. Create a negative voucher to deduct from inventory
    const saleVoucher = {
        id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
        date: date,
        name: productName,
        code: inventory.code,
        quantities: -saleQty,
        quantityType: inventory.quantityType,
        pricePerNo: inventory.averagePrice, // Use cost price for inventory value deduction
        totalPrice: saleQty * inventory.averagePrice,
        remarks: `SOLD TO ${clientCode}`,
    };
    allVouchers.push(saleVoucher);
    await writeVouchers(allVouchers);

    revalidatePath("/view/vouchers");
    revalidatePath("/create/output"); // To refresh finished goods list
    revalidatePath("/view/outputs");
    revalidatePath("/view/inventory");

    return { success: true, message: "Sale recorded and inventory updated." };
  } catch (error) {
      console.error("Failed to record sale:", error);
      return { success: false, message: "Failed to record sale." };
  }
}

export async function getVouchers(filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    let vouchers = await readVouchers();
    
    if (filters.name) {
        vouchers = vouchers.filter(v => v.name === filters.name);
    }
    if (filters.startDate) {
        const filterDate = new Date(filters.startDate);
        // Important: Create a new Date object based on UTC values to avoid timezone shifts
        const startOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate()));
        vouchers = vouchers.filter(v => new Date(v.date) >= startOfDay);
    }
    if (filters.endDate) {
        const filterDate = new Date(filters.endDate);
         // Important: Set to the very end of the UTC day
        const endOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate(), 23, 59, 59, 999));
        vouchers = vouchers.filter(v => new Date(v.date) <= endOfDay);
    }
    
    return vouchers;
}

export async function getInventoryItem(name: string, filters?: { startDate?: Date; endDate?: Date }) {
    if (!name) {
        return { availableStock: 0, averagePrice: 0, code: "", quantityType: "" };
    }
  
    let allVouchers = await readVouchers();
    let itemVouchers = allVouchers.filter(v => v.name === name);

    // Date filtering
    if (filters?.startDate) {
        const start = new Date(filters.startDate);
        const startOfDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
        itemVouchers = itemVouchers.filter(v => new Date(v.date) >= startOfDay);
    }
    if (filters?.endDate) {
        const end = new Date(filters.endDate);
        const endOfDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
        itemVouchers = itemVouchers.filter(v => new Date(v.date) <= endOfDay);
    }


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
    
    const latestVoucher = itemVouchers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

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

export async function getProcessDetails(name: string): Promise<ProcessDetails | null> {
    const processes = await getProcessNamesAndDetails();
    return processes.find(p => p.processName === name) || null;
}

export async function getProcesses(filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    let processes = await readProcesses();

    if (filters.name) {
        processes = processes.filter(p => p.processName === filters.name);
    }
    if (filters.startDate) {
        const filterDate = new Date(filters.startDate);
        const startOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate()));
        processes = processes.filter(p => new Date(p.date) >= startOfDay);
    }
    if (filters.endDate) {
        const filterDate = new Date(filters.endDate);
        const endOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate(), 23, 59, 59, 999));
        processes = processes.filter(p => new Date(p.date) <= endOfDay);
    }
    
    return processes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getUniqueProcessNames(): Promise<string[]> {
    const processes = await readProcesses();
    const names = new Set(processes.map(p => p.processName));
    return Array.from(names).sort();
}

export async function getFinishedGoods(): Promise<FinishedGood[]> {
  const vouchers = await readVouchers();
  const finishedGoodsMap = new Map<string, FinishedGood>();

  // Use outputs file to get the list of all possible finished goods
  const outputs = await readOutputs();
  const productNames = new Set(outputs.map(o => o.productName));

  for (const name of Array.from(productNames)) {
    const { availableStock } = await getInventoryItem(name);
    if(availableStock > 0) {
      finishedGoodsMap.set(name, { name, availableStock });
    }
  }

  return Array.from(finishedGoodsMap.values());
}


export interface LedgerEntry {
  type: 'Production' | 'Sale';
  date: Date;
  productName: string;
  clientCode?: string;
  quantity: number;
  pricePerKg: number;
  id: string;
}

export async function getOutputLedger(filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<LedgerEntry[]> {
    let allOutputs = await readOutputs();
    let allSales = await readSales();
    let ledger: LedgerEntry[] = [];

    // Apply filters
    if (filters.name) {
        allOutputs = allOutputs.filter(o => o.productName === filters.name);
        allSales = allSales.filter(s => s.productName === filters.name);
    }
    if (filters.startDate) {
        const filterDate = new Date(filters.startDate);
        const startOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate()));
        allOutputs = allOutputs.filter(o => new Date(o.date) >= startOfDay);
        allSales = allSales.filter(s => new Date(s.date) >= startOfDay);
    }
    if (filters.endDate) {
        const filterDate = new Date(filters.endDate);
        const endOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate(), 23, 59, 59, 999));
        allOutputs = allOutputs.filter(o => new Date(o.date) <= endOfDay);
        allSales = allSales.filter(s => new Date(s.date) <= endOfDay);
    }
    
    // Map outputs to ledger entries
    allOutputs.forEach(output => {
        ledger.push({
            type: 'Production',
            date: new Date(output.date),
            productName: output.productName,
            quantity: output.quantityProduced,
            pricePerKg: output.finalAveragePrice,
            id: output.id!,
        });
    });

    // Map sales to ledger entries
    allSales.forEach(sale => {
        ledger.push({
            type: 'Sale',
            date: new Date(sale.date),
            productName: sale.productName,
            clientCode: sale.clientCode,
            quantity: -sale.saleQty, // Sales are negative quantity
            pricePerKg: sale.salePrice,
            id: sale.id!,
        });
    });

    // Sort by date chronologically
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return ledger;
}

export interface FinishedGoodInventoryItem {
  name: string;
  code: string;
  availableStock: number;
  averagePrice: number;
  quantityType: string;
}

export async function getFinishedGoodsInventory(filters?: { name?: string }): Promise<FinishedGoodInventoryItem[]> {
  const vouchers = await readVouchers();
  
  let productNames = Array.from(new Set(vouchers.filter(v => v.code.startsWith('FG-')).map(v => v.name)));
  
  // Apply the name filter if provided
  if (filters?.name) {
    productNames = productNames.filter(name => name.toLowerCase().includes(filters.name!.toLowerCase()));
  }

  const inventory: FinishedGoodInventoryItem[] = [];

  for (const name of productNames) {
    const itemDetails = await getInventoryItem(name);
    if (itemDetails.availableStock > 0) {
      inventory.push({
        name: name,
        code: itemDetails.code,
        availableStock: itemDetails.availableStock,
        averagePrice: itemDetails.averagePrice,
        quantityType: itemDetails.quantityType,
      });
    }
  }

  return inventory.sort((a, b) => a.name.localeCompare(b.name));
}


// ============== DELETE / UPDATE ACTIONS ==============

export async function deleteVoucher(voucherId: string) {
  try {
    let vouchers = await readVouchers();
    vouchers = vouchers.filter(v => v.id !== voucherId);
    await writeVouchers(vouchers);
    revalidatePath("/view/vouchers");
    revalidatePath("/view/inventory");

    return { success: true, message: "Voucher deleted successfully." };
  } catch (error) {
    console.error("Failed to delete voucher:", error);
    return { success: false, message: "Failed to delete voucher." };
  }
}

export async function updateVoucher(values: z.infer<typeof voucherSchema>) {
    const validatedFields = voucherSchema.safeParse(values)

    if (!validatedFields.success) {
        return { success: false, message: "Invalid voucher data." }
    }

    try {
        const { id, ...updatedVoucherData } = validatedFields.data;
        let vouchers = await readVouchers();
        const voucherIndex = vouchers.findIndex(v => v.id === id);

        if (voucherIndex === -1) {
            return { success: false, message: "Voucher not found." };
        }

        vouchers[voucherIndex] = { ...vouchers[voucherIndex], ...updatedVoucherData };
        await writeVouchers(vouchers);

        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");
        return { success: true, message: "Voucher updated successfully." };
    } catch (error) {
        console.error("Failed to update voucher:", error);
        return { success: false, message: "Failed to update voucher." };
    }
}

export async function updateProcess(originalProcess: Process, newValues: z.infer<typeof processSchema>) {
    const validatedFields = processSchema.safeParse(newValues);

    if (!validatedFields.success) {
        return { success: false, message: "Invalid process data." };
    }
    
    const { date, processName, outputUnit, notes } = validatedFields.data;

    try {
        let allProcesses = await readProcesses();
        const processIndex = allProcesses.findIndex(p => p.id === originalProcess.id);
        
        if (processIndex === -1) {
            return { success: false, message: "Original process not found." };
        }

        const originalProcessName = allProcesses[processIndex].processName;

        // Update the process entry
        allProcesses[processIndex] = {
            ...allProcesses[processIndex],
            date,
            processName,
            outputUnit,
            notes,
        };
        await writeProcesses(allProcesses);

        // Also update the associated vouchers' remarks if process name changed
        if(originalProcessName !== processName) {
            let allVouchers = await readVouchers();
            const originalRemark = `USED IN ${originalProcessName}`;
            const newRemark = `USED IN ${processName}`;

            allVouchers.forEach(voucher => {
                if (voucher.remarks === originalRemark && new Date(voucher.date).getTime() === new Date(date).getTime()) {
                    voucher.remarks = newRemark;
                }
            });
            await writeVouchers(allVouchers);
        }
        
        revalidatePath("/view/processes");
        revalidatePath("/view/vouchers");
        return { success: true, message: "Process updated successfully." };

    } catch (error) {
        console.error("Failed to update process:", error);
        return { success: false, message: "Failed to update process." };
    }
}

export async function deleteProcess(processToDelete: Process) {
  try {
    let processes = await readProcesses();
    let vouchers = await readVouchers();

    // 1. Remove the process record
    processes = processes.filter(p => p.id !== processToDelete.id);
    
    // 2. Find and remove the corresponding consumption vouchers
    vouchers = vouchers.filter(v => {
      const isConsumptionVoucher = v.remarks === `USED IN ${processToDelete.processName}` && new Date(v.date).getTime() === new Date(processToDelete.date).getTime();
      return !isConsumptionVoucher;
    });
    
    await writeProcesses(processes);
    await writeVouchers(vouchers);

    revalidatePath("/view/processes");
    revalidatePath("/view/vouchers");
    revalidatePath("/view/inventory");
    return { success: true, message: "Process deleted and raw materials returned to stock." };
  } catch (error) {
    console.error("Failed to delete process:", error);
    return { success: false, message: "Failed to delete process." };
  }
}

export async function deleteOutput(outputId: string) {
    try {
        let outputs = await readOutputs();
        let vouchers = await readVouchers();
        const outputToDelete = outputs.find(o => o.id === outputId);

        if (!outputToDelete) {
            return { success: false, message: "Output record not found." };
        }

        // 1. Remove the output record
        outputs = outputs.filter(o => o.id !== outputId);

        // 2. Find and remove the corresponding finished good and scrape vouchers
        const productionVoucherRemark = `PRODUCED FROM ${outputToDelete.processUsed}`;
        const scrapeVoucherRemark = `SCRAPE FROM ${outputToDelete.processUsed}`;
        
        vouchers = vouchers.filter(v => {
            const isProductionVoucher = v.remarks === productionVoucherRemark && new Date(v.date).getTime() === new Date(outputToDelete.date).getTime();
            const isScrapeVoucher = v.remarks === scrapeVoucherRemark && new Date(v.date).getTime() === new Date(outputToDelete.date).getTime();
            return !isProductionVoucher && !isScrapeVoucher;
        });

        await writeOutputs(outputs);
        await writeVouchers(vouchers);

        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");

        return { success: true, message: "Output deleted and inventory adjusted." };
    } catch (error) {
        console.error("Failed to delete output:", error);
        return { success: false, message: "Failed to delete output." };
    }
}

export async function deleteSale(saleId: string) {
    try {
        let sales = await readSales();
        let vouchers = await readVouchers();
        const saleToDelete = sales.find(s => s.id === saleId);

        if (!saleToDelete) {
            return { success: false, message: "Sale record not found." };
        }

        // 1. Remove the sale record
        sales = sales.filter(s => s.id !== saleId);

        // 2. Find and remove the corresponding negative inventory voucher
        const saleVoucherRemark = `SOLD TO ${saleToDelete.clientCode}`;
        vouchers = vouchers.filter(v => {
            const isSaleVoucher = v.remarks === saleVoucherRemark && 
                                  v.name === saleToDelete.productName && 
                                  new Date(v.date).getTime() === new Date(saleToDelete.date).getTime() &&
                                  v.quantities === -saleToDelete.saleQty;
            return !isSaleVoucher;
        });

        await writeSales(sales);
        await writeVouchers(vouchers);

        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");
        return { success: true, message: "Sale deleted and stock returned to inventory." };
    } catch (error) {
        console.error("Failed to delete sale:", error);
        return { success: false, message: "Failed to delete sale." };
    }
}

export async function getOutput(id: string): Promise<Output | undefined> {
    const outputs = await readOutputs();
    return outputs.find(o => o.id === id);
}

export async function getSale(id: string): Promise<Sale | undefined> {
    const sales = await readSales();
    return sales.find(s => s.id === id);
}

export async function updateOutput(values: z.infer<typeof outputSchema>) {
    const validatedFields = outputSchema.safeParse(values)

    if (!validatedFields.success) {
        return { success: false, message: "Invalid output data." }
    }

    try {
        const { id, ...updatedData } = validatedFields.data;
        if (!id) return { success: false, message: "Output ID is missing." };

        let allOutputs = await readOutputs();
        let allVouchers = await readVouchers();
        
        const outputIndex = allOutputs.findIndex(o => o.id === id);
        if (outputIndex === -1) return { success: false, message: "Output not found." };
        
        const originalOutput = allOutputs[outputIndex];

        // Recalculate values based on new data
        const processDetails = await getProcessDetails(updatedData.processUsed);
        if (!processDetails) return { success: false, message: "Process details not found." };
        
        const { totalCost, totalProcessOutput } = processDetails;
        let scrapeQty = 0;
        if (updatedData.scrapeUnit === '%') {
            scrapeQty = totalProcessOutput * ((updatedData.scrape || 0) / 100);
        } else {
            scrapeQty = updatedData.scrape || 0;
        }
        const currentNetQty = totalProcessOutput - scrapeQty - (updatedData.reduction || 0);
        const finalAveragePrice = currentNetQty > 0 ? (totalCost / currentNetQty) + (updatedData.processCharge || 0) : 0;
        
        const finalUpdatedData = {
            ...updatedData,
            quantityProduced: currentNetQty,
            finalAveragePrice: finalAveragePrice,
        };

        allOutputs[outputIndex] = { ...originalOutput, ...finalUpdatedData, id: originalOutput.id };

        // Find and update the associated inventory vouchers
        // Production Voucher
        const prodVoucherIndex = allVouchers.findIndex(v => v.remarks === `PRODUCED FROM ${originalOutput.processUsed}` && new Date(v.date).getTime() === new Date(originalOutput.date).getTime());
        if (prodVoucherIndex !== -1) {
            allVouchers[prodVoucherIndex].date = finalUpdatedData.date;
            allVouchers[prodVoucherIndex].name = finalUpdatedData.productName;
            allVouchers[prodVoucherIndex].quantities = finalUpdatedData.quantityProduced;
            allVouchers[prodVoucherIndex].pricePerNo = finalUpdatedData.finalAveragePrice;
            allVouchers[prodVoucherIndex].totalPrice = finalUpdatedData.quantityProduced * finalUpdatedData.finalAveragePrice;
            allVouchers[prodVoucherIndex].remarks = `PRODUCED FROM ${finalUpdatedData.processUsed}`;
        }

        // Scrape Voucher
        const scrapeVoucherIndex = allVouchers.findIndex(v => v.remarks === `SCRAPE FROM ${originalOutput.processUsed}` && new Date(v.date).getTime() === new Date(originalOutput.date).getTime());
        if (scrapeVoucherIndex !== -1) {
             if (scrapeQty > 0) {
                allVouchers[scrapeVoucherIndex].date = finalUpdatedData.date;
                allVouchers[scrapeVoucherIndex].name = `${finalUpdatedData.productName} - SCRAPE`;
                allVouchers[scrapeVoucherIndex].quantities = scrapeQty;
                allVouchers[scrapeVoucherIndex].remarks = `SCRAPE FROM ${finalUpdatedData.processUsed}`;
             } else {
                allVouchers.splice(scrapeVoucherIndex, 1); // Remove scrape voucher if scrape is 0
             }
        } else if (scrapeQty > 0) { // Add new scrape voucher if it didn't exist before
             const scrapeVoucher = {
                id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
                date: finalUpdatedData.date,
                name: `${finalUpdatedData.productName} - SCRAPE`,
                code: `SCRAPE-${finalUpdatedData.productName}`,
                quantities: scrapeQty,
                quantityType: 'KG',
                pricePerNo: 0,
                totalPrice: 0,
                remarks: `SCRAPE FROM ${finalUpdatedData.processUsed}`,
            };
            allVouchers.push(scrapeVoucher);
        }

        await writeOutputs(allOutputs);
        await writeVouchers(allVouchers);

        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");

        return { success: true, message: "Output updated successfully." };

    } catch (error) {
        console.error("Failed to update output:", error);
        return { success: false, message: "Failed to update output." };
    }
}

export async function updateSale(values: z.infer<typeof saleSchema>) {
    const validatedFields = saleSchema.safeParse(values)

    if (!validatedFields.success) {
        return { success: false, message: "Invalid sale data." }
    }

    try {
        const { id, ...updatedData } = validatedFields.data;
        if (!id) return { success: false, message: "Sale ID is missing." };
        
        let allSales = await readSales();
        let allVouchers = await readVouchers();
        
        const saleIndex = allSales.findIndex(s => s.id === id);
        if (saleIndex === -1) return { success: false, message: "Sale not found." };
        
        const originalSale = allSales[saleIndex];
        
        // Find and update the associated inventory voucher
        const saleVoucherIndex = allVouchers.findIndex(v => 
            v.remarks === `SOLD TO ${originalSale.clientCode}` &&
            v.name === originalSale.productName &&
            new Date(v.date).getTime() === new Date(originalSale.date).getTime() &&
            v.quantities === -originalSale.saleQty
        );
        
        if (saleVoucherIndex === -1) {
            return { success: false, message: "Could not find the original inventory transaction for this sale." };
        }
        
        // Update Sale Record
        allSales[saleIndex] = { ...originalSale, ...updatedData, id: originalSale.id };
        
        // Update Voucher Record
        const inventoryDetails = await getInventoryItem(updatedData.productName);
        allVouchers[saleVoucherIndex].date = updatedData.date;
        allVouchers[saleVoucherIndex].quantities = -updatedData.saleQty;
        allVouchers[saleVoucherIndex].remarks = `SOLD TO ${updatedData.clientCode}`;
        // Note: Inventory cost price is used for the voucher, not the sale price
        allVouchers[saleVoucherIndex].pricePerNo = inventoryDetails.averagePrice;
        allVouchers[saleVoucherIndex].totalPrice = updatedData.saleQty * inventoryDetails.averagePrice;
        
        await writeSales(allSales);
        await writeVouchers(allVouchers);
        
        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");

        return { success: true, message: "Sale updated successfully." };

    } catch (error) {
        console.error("Failed to update sale:", error);
        return { success: false, message: "Failed to update sale." };
    }
}


// ============== PASSWORD ACTIONS ==============

async function readSettings(): Promise<{ passwordHash: string; passwordSalt: string }> {
    try {
        const fileContent = await fs.readFile(SETTINGS_FILE, "utf-8");
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Failed to read settings:", error);
        // Return a default that will never match
        return { passwordHash: "", passwordSalt: "" };
    }
}

async function writeSettings(settings: { passwordHash: string; passwordSalt: string }) {
    await writeJsonFile(SETTINGS_FILE, settings);
}

function hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export async function verifyPassword(password: string): Promise<boolean> {
    const settings = await readSettings();
    if (!settings.passwordHash || !settings.passwordSalt) {
        return false;
    }
    const hash = hashPassword(password, settings.passwordSalt);
    return hash === settings.passwordHash;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const isCorrect = await verifyPassword(currentPassword);
    if (!isCorrect) {
        return { success: false, message: "Incorrect current password." };
    }

    try {
        const newSalt = crypto.randomBytes(16).toString('hex');
        const newHash = hashPassword(newPassword, newSalt);
        await fs.writeFile(SETTINGS_FILE, JSON.stringify({ passwordHash: newHash, passwordSalt: newSalt }, null, 2));
        return { success: true, message: "Password updated successfully." };
    } catch (error) {
        console.error("Failed to change password:", error);
        return { success: false, message: "Failed to update password." };
    }
}
