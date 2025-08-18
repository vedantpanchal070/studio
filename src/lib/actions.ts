
"use server"

import { z } from "zod"
import { voucherSchema, processSchema, outputSchema, Voucher } from "./schemas"
import { revalidatePath } from "next/cache"
import { db } from "./firebase"
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, documentId, writeBatch, getDoc, doc } from "firebase/firestore"

// Helper function to convert Firestore Timestamps to Dates in voucher objects
function voucherFromDoc(doc: any): Voucher {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    date: (data.date as Timestamp).toDate(),
  };
}

export async function createVoucher(values: z.infer<typeof voucherSchema>) {
  const validatedFields = voucherSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    }
  }

  try {
    const docRef = await addDoc(collection(db, "vouchers"), {
      ...validatedFields.data,
      date: Timestamp.fromDate(validatedFields.data.date),
    });
    console.log("Document written with ID: ", docRef.id);
    revalidatePath("/view/vouchers");
    return { success: true, message: "Voucher created successfully!" };
  } catch (e) {
    console.error("Error adding document: ", e);
    return { success: false, message: "Failed to create voucher." };
  }
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

  try {
    // In a real app, we'd save the process to its own collection.
    // For this app, we just create the negative voucher entries.
    const batch = writeBatch(db);

    for (const material of rawMaterials) {
        // Fetch the average price for the raw material
        const q = query(collection(db, "vouchers"), where("name", "==", material.name), where("quantities", ">", 0));
        const querySnapshot = await getDocs(q);
        
        let totalValue = 0;
        let totalQty = 0;
        querySnapshot.forEach(doc => {
            totalValue += doc.data().totalPrice;
            totalQty += doc.data().quantities;
        });

        const rate = totalQty > 0 ? totalValue / totalQty : 0;
        
        const newVoucherRef = doc(collection(db, "vouchers"));
        batch.set(newVoucherRef, {
            date: Timestamp.fromDate(date),
            name: material.name,
            code: material.code,
            quantities: -material.quantity, // Negative quantity
            quantityType: material.quantityType,
            pricePerNo: rate,
            totalPrice: -material.quantity * rate,
            remarks: `Used in process: ${processName}. ${notes || ""}`.trim(),
        });
    }

    await batch.commit();

    console.log("Process created and inventory updated.");
    revalidatePath("/view/processes");
    revalidatePath("/view/vouchers");

    return { success: true, message: "Process saved and inventory updated!" };
  } catch (e) {
    console.error("Error creating process: ", e);
    return { success: false, message: "Failed to create process." };
  }
}

export async function createOutput(values: z.infer<typeof outputSchema>) {
  const validatedFields = outputSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form and try again.",
    };
  }

   try {
    const docRef = await addDoc(collection(db, "outputs"), {
      ...validatedFields.data,
      date: Timestamp.fromDate(validatedFields.data.date),
    });
    console.log("Document written with ID: ", docRef.id);
    revalidatePath("/view/outputs");
    return { success: true, message: "Output created successfully!" };
  } catch (e) {
    console.error("Error adding document: ", e);
    return { success: false, message: "Failed to create output." };
  }
}

export async function getVouchers(
  filters: { name?: string; startDate?: Date; endDate?: Date }
): Promise<Voucher[]> {
  console.log("Fetching vouchers with filters:", filters)
  
  const queries = [];
  if (filters.name) {
    queries.push(where("name", "==", filters.name));
  }
  if (filters.startDate) {
    queries.push(where("date", ">=", Timestamp.fromDate(filters.startDate)));
  }
  if (filters.endDate) {
    queries.push(where("date", "<=", Timestamp.fromDate(filters.endDate)));
  }

  const q = query(collection(db, "vouchers"), ...queries, orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  const vouchers = querySnapshot.docs.map(voucherFromDoc);
  
  return JSON.parse(JSON.stringify(vouchers));
}

// New function to get item details for the process form
export async function getInventoryItem(name: string) {
    if (!name) {
        return { availableStock: 0, averagePrice: 0, code: '', quantityType: '' };
    }

    try {
        const q = query(collection(db, "vouchers"), where("name", "==", name));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { availableStock: 0, averagePrice: 0, code: '', quantityType: '' };
        }
        
        let totalStock = 0;
        let totalPositiveValue = 0;
        let totalPositiveQty = 0;
        let code = '';
        let quantityType = '';

        querySnapshot.forEach(doc => {
            const data = doc.data();
            totalStock += data.quantities;
            if (!code) code = data.code;
            if (!quantityType) quantityType = data.quantityType;

            if (data.quantities > 0) {
                totalPositiveValue += data.totalPrice;
                totalPositiveQty += data.quantities;
            }
        });

        const averagePrice = totalPositiveQty > 0 ? totalPositiveValue / totalPositiveQty : 0;

        return { availableStock: totalStock, averagePrice, code, quantityType };
    } catch (error) {
        console.error("Error fetching inventory item:", error);
        // Return a default object structure in case of an error to prevent crashes
        return { availableStock: 0, averagePrice: 0, code: '', quantityType: '' };
    }
}
