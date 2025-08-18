
"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema, saleSchema, type Process, type Voucher, type FinishedGood, type Output, type Sale } from "./schemas"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const VOUCHERS_FILE = path.join(DATA_DIR, "vouchers.json")
const PROCESSES_FILE = path.join(DATA_DIR, "processes.json")
const OUTPUTS_FILE = path.join(DATA_DIR, "outputs.json")
const SALES_FILE = path.join(DATA_DIR, "sales.json")


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

    return { success: true, message: "Sale recorded and inventory updated." };
  } catch (error) {
      console.error("Failed to record sale:", error);
      return { success: false, message: "Failed to record sale." };
  }
}

export async function getVouchers(filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    let vouchers = await readVouchers();
    
    // Filter out finished goods and scrape
    vouchers = vouchers.filter(v => !v.code.startsWith('FG-') && !v.code.startsWith('SCRAPE-'));

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
        const start = filters.startDate;
        allOutputs = allOutputs.filter(o => o.date >= start);
        allSales = allSales.filter(s => s.date >= start);
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        allOutputs = allOutputs.filter(o => o.date <= end);
        allSales = allSales.filter(s => s.date <= end);
    }
    
    // Map outputs to ledger entries
    allOutputs.forEach(output => {
        ledger.push({
            type: 'Production',
            date: output.date,
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
            date: sale.date,
            productName: sale.productName,
            clientCode: sale.clientCode,
            quantity: -sale.saleQty, // Sales are negative quantity
            pricePerKg: sale.salePrice,
            id: sale.id!,
        });
    });

    // Sort by date chronologically
    ledger.sort((a, b) => a.date.getTime() - b.date.getTime());

    return ledger;
}

// ============== DELETE / UPDATE ACTIONS ==============

export async function deleteVoucher(voucherId: string) {
  try {
    let vouchers = await readVouchers();
    vouchers = vouchers.filter(v => v.id !== voucherId);
    await writeVouchers(vouchers);
    revalidatePath("/view/vouchers");
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
        return { success: true, message: "Voucher updated successfully." };
    } catch (error) {
        console.error("Failed to update voucher:", error);
        return { success: false, message: "Failed to update voucher." };
    }
}

export async function deleteProcess(processToDelete: Process) {
  try {
    let processes = await readProcesses();
    let vouchers = await readVouchers();

    // 1. Remove the process record
    processes = processes.filter(p => !(p.processName === processToDelete.processName && new Date(p.date).getTime() === new Date(processToDelete.date).getTime()));
    
    // 2. Find and remove the corresponding consumption vouchers
    vouchers = vouchers.filter(v => {
      const isConsumptionVoucher = v.remarks === `USED IN ${processToDelete.processName}` && new Date(v.date).getTime() === new Date(processToDelete.date).getTime();
      return !isConsumptionVoucher;
    });
    
    await writeProcesses(processes);
    await writeVouchers(vouchers);

    revalidatePath("/view/processes");
    revalidatePath("/view/vouchers");
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
        return { success: true, message: "Sale deleted and stock returned to inventory." };
    } catch (error) {
        console.error("Failed to delete sale:", error);
        return { success: false, message: "Failed to delete sale." };
    }
}
