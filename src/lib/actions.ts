
"use server"

import { initializeApp } from "firebase/app";
import { z } from "zod"
import { voucherSchema, processSchema, outputSchema, saleSchema, userSchema, type Process, type Voucher, type FinishedGood, type Output, type Sale, type User } from "./schemas"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "users.json")

// Helper function to get the data directory for a specific user
function getUserDataDir(username: string) {
  return path.join(DATA_DIR, username);
}

// Ensure data directory exists for a user
async function ensureUserDataDir(username: string) {
  const userDir = getUserDataDir(username);
  try {
    await fs.mkdir(userDir, { recursive: true })
  } catch (error) {
    console.error(`Error creating data directory for user ${username}:`, error)
  }
}

async function readJsonFile(filePath: string): Promise<any[]> {
    try {
        // The parent directory is now created by ensureUserDataDir
        const fileContent = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(fileContent);
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

async function writeJsonFile(filePath: string, data: any) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Failed to write to ${path.basename(filePath)}:`, error);
    }
}


// User-specific file paths
const getVouchersFile = (username: string) => path.join(getUserDataDir(username), "vouchers.json");
const getProcessesFile = (username: string) => path.join(getUserDataDir(username), "processes.json");
const getOutputsFile = (username: string) => path.join(getUserDataDir(username), "outputs.json");
const getSalesFile = (username: string) => path.join(getUserDataDir(username), "sales.json");


// Vouchers
const readVouchers = async (username: string): Promise<Voucher[]> => {
    await ensureUserDataDir(username);
    return readJsonFile(getVouchersFile(username));
}
const writeVouchers = (username: string, data: any[]) => writeJsonFile(getVouchersFile(username), data);

// Processes
const readProcesses = async (username: string): Promise<Process[]> => {
    await ensureUserDataDir(username);
    return readJsonFile(getProcessesFile(username));
}
const writeProcesses = (username: string, data: any[]) => writeJsonFile(getProcessesFile(username), data);

// Outputs
const readOutputs = async (username: string): Promise<Output[]> => {
    await ensureUserDataDir(username);
    return readJsonFile(getOutputsFile(username));
}
const writeOutputs = (username: string, data: any[]) => writeJsonFile(getOutputsFile(username), data);

// Sales
const readSales = async (username: string): Promise<Sale[]> => {
    await ensureUserDataDir(username);
    return readJsonFile(getSalesFile(username));
}
const writeSales = (username: string, data: any[]) => writeJsonFile(getSalesFile(username), data);


// Users (Global)
const readUsers = async (): Promise<User[]> => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    return readJsonFile(USERS_FILE);
};
const writeUsers = (data: any[]) => writeJsonFile(USERS_FILE, data);

// ============== USER ACTIONS ==============

export async function getUser(username: string): Promise<User | undefined> {
    const users = await readUsers();
    return users.find(u => u.username === username);
}

export async function createUser(userData: User) {
    const validatedFields = userSchema.safeParse(userData);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid user data." };
    }

    try {
        const users = await readUsers();
        const existingUser = users.find(u => u.username === validatedFields.data.username);
        if (existingUser) {
            return { success: false, message: "Username already exists." };
        }

        users.push(validatedFields.data);
        await writeUsers(users);
        await ensureUserDataDir(validatedFields.data.username); // Create user's data directory

        return { success: true, message: "User created successfully." };
    } catch (error) {
        console.error("Failed to create user:", error);
        return { success: false, message: "Failed to create user on the server." };
    }
}


export async function updateUser(updatedUser: User): Promise<boolean> {
    const validatedFields = userSchema.safeParse(updatedUser);
    if (!validatedFields.success) {
        console.error("Invalid user data for update:", validatedFields.error);
        return false;
    }
    
    try {
        let users = await readUsers();
        const userIndex = users.findIndex(u => u.username === updatedUser.username);
        if (userIndex === -1) {
            // This case should ideally not happen in an update scenario
            return false;
        } else {
            users[userIndex] = validatedFields.data;
        }
        await writeUsers(users);
        return true;
    } catch (error) {
        console.error("Failed to update user:", error);
        return false;
    }
}


// ============== VOUCHER / PROCESS / ETC. ACTIONS ==============

export async function createVoucher(username: string, values: z.infer<typeof voucherSchema>) {
  const validatedFields = voucherSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  try {
    const vouchers = await readVouchers(username);

    const newVoucher = {
      ...validatedFields.data,
      id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
    }

    vouchers.push(newVoucher)
    await writeVouchers(username, vouchers)

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

export async function createProcess(username: string, values: z.infer<typeof processSchema>) {
  const validatedFields = processSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }
  
  const { date, rawMaterials, processName } = validatedFields.data;

  try {
    const allVouchers = await readVouchers(username);
    const allProcesses = await readProcesses(username);

    // Check for sufficient stock before proceeding
    for (const material of rawMaterials) {
        const inventory = await getInventoryItem(username, material.name);
        if (inventory.availableStock < material.quantity) {
            return {
                success: false,
                message: `Insufficient stock for ${material.name}. Available: ${inventory.availableStock}, Required: ${material.quantity}`,
            };
        }
    }
    
    const processId = new Date().toISOString() + Math.random().toString(36).substr(2, 9);
    
    allProcesses.push({
      ...validatedFields.data,
      id: processId,
    });
    await writeProcesses(username, allProcesses);

    // Create a new voucher for each raw material consumption, linking it to the process
    rawMaterials.forEach(material => {
        const processVoucher: Voucher = {
            id: processId + material.name.replace(/\s/g, ''), // Create a unique, deterministic ID for each consumption entry
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
    });

    await writeVouchers(username, allVouchers);

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

export async function createOutput(username: string, values: z.infer<typeof outputSchema>) {
  const validatedFields = outputSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  try {
    const { date, productName, quantityProduced, scrape, scrapeUnit } = validatedFields.data;
    const allOutputs = await readOutputs(username);
    const allVouchers = await readVouchers(username);
    
    const outputId = new Date().toISOString() + Math.random().toString(36).substr(2, 9);

    // 1. Save the main output record
    const newOutput = {
      ...validatedFields.data,
      id: outputId,
    };
    allOutputs.push(newOutput);
    await writeOutputs(username, allOutputs);
    
    // 2. Add the finished good to inventory (vouchers)
    const finishedGoodVoucher: Voucher = {
        id: outputId, // Use the same ID as the parent output record
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
        const processDetails = await getProcessDetails(username, validatedFields.data.processUsed);
        if (scrapeUnit === '%') {
            scrapeQty = (processDetails?.totalProcessOutput || 0) * (scrape / 100);
        } else {
            scrapeQty = scrape;
        }

        if (scrapeQty > 0) {
            const scrapeVoucher: Voucher = {
                id: outputId + "scrape", // Scrape still needs a unique ID
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
    
    await writeVouchers(username, allVouchers);

    revalidatePath("/view/vouchers");
    revalidatePath("/view/outputs");
    revalidatePath("/view/inventory");


    return { success: true, message: "Output and scrape saved to inventory." };
  } catch (error) {
    console.error("Failed to save output:", error);
    return { success: false, message: "Failed to save output." };
  }
}

export async function recordSale(username: string, values: z.infer<typeof saleSchema>) {
  const validatedFields = saleSchema.safeParse(values)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid sale data.",
    }
  }

  const { productName, saleQty, date, clientCode } = validatedFields.data;

  try {
    const allVouchers = await readVouchers(username);
    const allSales = await readSales(username);
    
    // Final stock check
    const inventory = await getInventoryItem(username, productName);
    if (inventory.availableStock < saleQty) {
        return {
            success: false,
            message: `Insufficient stock for ${productName}. Available: ${inventory.availableStock}`,
        };
    }

    const saleId = new Date().toISOString() + Math.random().toString(36).substr(2, 9);
    // 1. Save the sales record
    const newSale = {
        ...validatedFields.data,
        id: saleId,
    }
    allSales.push(newSale);
    await writeSales(username, allSales);

    // 2. Create a negative voucher to deduct from inventory
    const saleVoucher: Voucher = {
        id: saleId, // Use the same ID as the parent sale record
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
    await writeVouchers(username, allVouchers);

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

export async function getVouchers(username: string, filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    let vouchers = await readVouchers(username);
    
    if (filters.name) {
        vouchers = vouchers.filter(v => v.name === filters.name);
    }
    if (filters.startDate) {
        const filterDate = new Date(filters.startDate);
        const startOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate()));
        vouchers = vouchers.filter(v => new Date(v.date) >= startOfDay);
    }
    if (filters.endDate) {
        const filterDate = new Date(filters.endDate);
        const endOfDay = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate(), 23, 59, 59, 999));
        vouchers = vouchers.filter(v => new Date(v.date) <= endOfDay);
    }
    
    return vouchers;
}

export async function getInventoryItem(username: string, name: string, filters?: { startDate?: Date; endDate?: Date }) {
    if (!name) {
        return { availableStock: 0, averagePrice: 0, code: "", quantityType: "" };
    }
  
    let allVouchers = await readVouchers(username);
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

export async function getVoucherItemNames(username: string): Promise<string[]> {
    const vouchers = await readVouchers(username);
    const purchaseVouchers = vouchers.filter(v => v.quantities > 0 && !v.remarks?.includes("PRODUCED FROM"));
    const names = new Set(purchaseVouchers.map(v => v.name));
    return Array.from(names).sort();
}

export interface ProcessDetails {
  processName: string;
  totalProcessOutput: number;
  totalCost: number;
}

export async function getProcessNamesAndDetails(username: string): Promise<ProcessDetails[]> {
  const processes = await readProcesses(username);
  return processes.map(p => {
    const totalCost = p.rawMaterials.reduce((sum: number, mat: any) => sum + (mat.rate * mat.quantity), 0);
    return {
      processName: p.processName,
      totalProcessOutput: p.totalProcessOutput,
      totalCost,
    };
  });
}

export async function getProcessDetails(username: string, name: string): Promise<ProcessDetails | null> {
    const processes = await getProcessNamesAndDetails(username);
    return processes.find(p => p.processName === name) || null;
}

export async function getProcesses(username: string, filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    let processes = await readProcesses(username);

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

export async function getUniqueProcessNames(username: string): Promise<string[]> {
    const processes = await readProcesses(username);
    const names = new Set(processes.map(p => p.processName));
    return Array.from(names).sort();
}

export async function getFinishedGoods(username: string): Promise<FinishedGood[]> {
  const vouchers = await readVouchers(username);
  const finishedGoodsMap = new Map<string, FinishedGood>();

  // Use outputs file to get the list of all possible finished goods
  const outputs = await readOutputs(username);
  const productNames = new Set(outputs.map(o => o.productName));

  for (const name of Array.from(productNames)) {
    const { availableStock } = await getInventoryItem(username, name);
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

export async function getOutputLedger(username: string, filters: { name?: string; startDate?: Date; endDate?: Date }): Promise<LedgerEntry[]> {
    let allOutputs = await readOutputs(username);
    let allSales = await readSales(username);
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

export async function getFinishedGoodsInventory(username: string, filters?: { name?: string }): Promise<FinishedGoodInventoryItem[]> {
  const vouchers = await readVouchers(username);
  
  let productNames = Array.from(new Set(vouchers.filter(v => v.code.startsWith('FG-')).map(v => v.name)));
  
  // Apply the name filter if provided
  if (filters?.name) {
    productNames = productNames.filter(name => name.toLowerCase().includes(filters.name!.toLowerCase()));
  }

  const inventory: FinishedGoodInventoryItem[] = [];

  for (const name of productNames) {
    const itemDetails = await getInventoryItem(username, name);
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

export async function deleteVoucher(username: string, voucherId: string) {
  try {
    let vouchers = await readVouchers(username);
    vouchers = vouchers.filter(v => v.id !== voucherId);
    await writeVouchers(username, vouchers);
    revalidatePath("/view/vouchers");
    revalidatePath("/view/inventory");

    return { success: true, message: "Voucher deleted successfully." };
  } catch (error) {
    console.error("Failed to delete voucher:", error);
    return { success: false, message: "Failed to delete voucher." };
  }
}

export async function updateVoucher(username: string, values: z.infer<typeof voucherSchema>) {
    const validatedFields = voucherSchema.safeParse(values)

    if (!validatedFields.success) {
        return { success: false, message: "Invalid voucher data." }
    }

    try {
        const { id, ...updatedVoucherData } = validatedFields.data;
        let vouchers = await readVouchers(username);
        const voucherIndex = vouchers.findIndex(v => v.id === id);

        if (voucherIndex === -1) {
            return { success: false, message: "Voucher not found." };
        }

        vouchers[voucherIndex] = { ...vouchers[voucherIndex], ...updatedVoucherData };
        await writeVouchers(username, vouchers);

        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");
        return { success: true, message: "Voucher updated successfully." };
    } catch (error) {
        console.error("Failed to update voucher:", error);
        return { success: false, message: "Failed to update voucher." };
    }
}

export async function updateProcess(username: string, originalProcess: Process, newValues: z.infer<typeof processSchema>) {
    const validatedFields = processSchema.safeParse(newValues);

    if (!validatedFields.success) {
        return { success: false, message: "Invalid process data." };
    }
    
    const { date, processName, outputUnit, notes } = validatedFields.data;

    try {
        let allProcesses = await readProcesses(username);
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
        await writeProcesses(username, allProcesses);

        // Also update the associated vouchers' remarks if process name changed
        if(originalProcessName !== processName) {
            let allVouchers = await readVouchers(username);
            const originalRemark = `USED IN ${originalProcessName}`;
            const newRemark = `USED IN ${processName}`;

            allVouchers.forEach(voucher => {
                if (voucher.remarks === originalRemark && new Date(voucher.date).getTime() === new Date(date).getTime()) {
                    voucher.remarks = newRemark;
                }
            });
            await writeVouchers(username, allVouchers);
        }
        
        revalidatePath("/view/processes");
        revalidatePath("/view/vouchers");
        return { success: true, message: "Process updated successfully." };

    } catch (error) {
        console.error("Failed to update process:", error);
        return { success: false, message: "Failed to update process." };
    }
}

export async function deleteProcess(username: string, processToDelete: Process) {
  try {
    let processes = await readProcesses(username);
    let vouchers = await readVouchers(username);

    // 1. Remove the process record
    processes = processes.filter(p => p.id !== processToDelete.id);
    
    // 2. Find and remove the corresponding consumption vouchers
    vouchers = vouchers.filter(v => !v.id?.startsWith(processToDelete.id!));
    
    await writeProcesses(username, processes);
    await writeVouchers(username, vouchers);

    revalidatePath("/view/processes");
    revalidatePath("/view/vouchers");
    revalidatePath("/view/inventory");
    return { success: true, message: "Process deleted and raw materials returned to stock." };
  } catch (error) {
    console.error("Failed to delete process:", error);
    return { success: false, message: "Failed to delete process." };
  }
}

export async function deleteOutput(username: string, outputId: string) {
    try {
        let outputs = await readOutputs(username);
        let vouchers = await readVouchers(username);
        const outputToDelete = outputs.find(o => o.id === outputId);

        if (!outputToDelete) {
            return { success: false, message: "Output record not found." };
        }

        // 1. Remove the output record
        outputs = outputs.filter(o => o.id !== outputId);

        // 2. Find and remove the corresponding finished good and scrape vouchers
        vouchers = vouchers.filter(v => !v.id?.startsWith(outputId));

        await writeOutputs(username, outputs);
        await writeVouchers(username, vouchers);

        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");

        return { success: true, message: "Output deleted and inventory adjusted." };
    } catch (error) {
        console.error("Failed to delete output:", error);
        return { success: false, message: "Failed to delete output." };
    }
}

export async function deleteSale(username: string, saleId: string) {
    try {
        let sales = await readSales(username);
        let vouchers = await readVouchers(username);
        
        if (!sales.find(s => s.id === saleId)) {
            return { success: false, message: "Sale record not found." };
        }

        // 1. Remove the sale record
        sales = sales.filter(s => s.id !== saleId);

        // 2. Find and remove the corresponding negative inventory voucher, which has the same ID.
        vouchers = vouchers.filter(v => v.id !== saleId);

        await writeSales(username, sales);
        await writeVouchers(username, vouchers);

        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");
        return { success: true, message: "Sale deleted and stock returned to inventory." };
    } catch (error) {
        console.error("Failed to delete sale:", error);
        return { success: false, message: "Failed to delete sale." };
    }
}

export async function getOutput(username: string, id: string): Promise<Output | undefined> {
    const outputs = await readOutputs(username);
    return outputs.find(o => o.id === id);
}

export async function getSale(username: string, id: string): Promise<Sale | undefined> {
    const sales = await readSales(username);
    return sales.find(s => s.id === id);
}

export async function updateOutput(username: string, values: z.infer<typeof outputSchema>) {
    const validatedFields = outputSchema.safeParse(values)

    if (!validatedFields.success) {
        return { success: false, message: "Invalid output data." }
    }

    try {
        const { id, ...updatedData } = validatedFields.data;
        if (!id) return { success: false, message: "Output ID is missing." };

        let allOutputs = await readOutputs(username);
        let allVouchers = await readVouchers(username);
        
        const outputIndex = allOutputs.findIndex(o => o.id === id);
        if (outputIndex === -1) return { success: false, message: "Output not found." };
        
        const originalOutput = allOutputs[outputIndex];

        // Recalculate values based on new data
        const processDetails = await getProcessDetails(username, updatedData.processUsed);
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
        // Production Voucher (has same ID as output)
        const prodVoucherIndex = allVouchers.findIndex(v => v.id === id);
        if (prodVoucherIndex !== -1) {
            allVouchers[prodVoucherIndex].date = finalUpdatedData.date;
            allVouchers[prodVoucherIndex].name = finalUpdatedData.productName;
            allVouchers[prodVoucherIndex].quantities = finalUpdatedData.quantityProduced;
            allVouchers[prodVoucherIndex].pricePerNo = finalUpdatedData.finalAveragePrice;
            allVouchers[prodVoucherIndex].totalPrice = finalUpdatedData.quantityProduced * finalUpdatedData.finalAveragePrice;
            allVouchers[prodVoucherIndex].remarks = `PRODUCED FROM ${finalUpdatedData.processUsed}`;
        }

        // Scrape Voucher
        const scrapeVoucherIndex = allVouchers.findIndex(v => v.id === id + "scrape");
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
             const scrapeVoucher: Voucher = {
                id: id + "scrape",
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

        await writeOutputs(username, allOutputs);
        await writeVouchers(username, allVouchers);

        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");

        return { success: true, message: "Output updated successfully." };

    } catch (error) {
        console.error("Failed to update output:", error);
        return { success: false, message: "Failed to update output." };
    }
}

export async function updateSale(username: string, values: z.infer<typeof saleSchema>) {
    const validatedFields = saleSchema.safeParse(values)

    if (!validatedFields.success) {
        return { success: false, message: "Invalid sale data." }
    }

    try {
        const { id, ...updatedData } = validatedFields.data;
        if (!id) return { success: false, message: "Sale ID is missing." };
        
        let allSales = await readSales(username);
        let allVouchers = await readVouchers(username);
        
        const saleIndex = allSales.findIndex(s => s.id === id);
        if (saleIndex === -1) return { success: false, message: "Sale not found." };
        
        const originalSale = allSales[saleIndex];
        
        // Server-side stock check
        const currentStock = await getInventoryItem(username, updatedData.productName);
        const stockBeforeThisSale = currentStock.availableStock + originalSale.saleQty;
        if (updatedData.saleQty > stockBeforeThisSale) {
            return { success: false, message: `Not enough stock. Available before this sale: ${stockBeforeThisSale}` };
        }

        // Find and update the associated inventory voucher (has same ID as sale)
        const saleVoucherIndex = allVouchers.findIndex(v => v.id === id);
        if (saleVoucherIndex === -1) {
            return { success: false, message: "Could not find the original inventory transaction for this sale." };
        }
        
        // Update Sale Record
        allSales[saleIndex] = { ...originalSale, ...updatedData, id: originalSale.id };
        
        // Update Voucher Record
        const inventoryDetails = await getInventoryItem(username, updatedData.productName);
        allVouchers[saleVoucherIndex].date = updatedData.date;
        allVouchers[saleVoucherIndex].quantities = -updatedData.saleQty;
        allVouchers[saleVoucherIndex].remarks = `SOLD TO ${updatedData.clientCode}`;
        // Note: Inventory cost price is used for the voucher, not the sale price
        allVouchers[saleVoucherIndex].pricePerNo = inventoryDetails.averagePrice;
        allVouchers[saleVoucherIndex].totalPrice = updatedData.saleQty * inventoryDetails.averagePrice;
        
        await writeSales(username, allSales);
        await writeVouchers(username, allVouchers);
        
        revalidatePath("/view/outputs");
        revalidatePath("/view/vouchers");
        revalidatePath("/view/inventory");

        return { success: true, message: "Sale updated successfully." };

    } catch (error) {
        console.error("Failed to update sale:", error);
        return { success: false, message: "Failed to update sale." };
    }
}

    