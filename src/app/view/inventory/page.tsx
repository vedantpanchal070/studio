
"use client"

import React, { useState } from "react";
import Link from "next/link"
import { ArrowLeft, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InventoryClient } from "./inventory-client"
import { getFinishedGoodsInventory } from "@/lib/actions"
import { SalesDialog } from "@/components/sales-dialog";


export default function ViewInventoryPage() {
  const [initialData, setInitialData] = useState<any[]>([]);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)

  React.useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async (filters = {}) => {
    const data = await getFinishedGoodsInventory(filters);
    setInitialData(data);
  };
  
  const onSaleSuccess = async () => {
    await fetchInventory();
  }


  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <SalesDialog isOpen={isSalesModalOpen} onOpenChange={setIsSalesModalOpen} onSaleSuccess={onSaleSuccess}/>
      <div className="w-full max-w-5xl">
        <Link href="/view" className="mb-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to View Menu
          </Button>
        </Link>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Finished Goods Inventory</CardTitle>
              <CardDescription>
                View and sell your current stock of finished products.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSalesModalOpen(true)}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Sell
            </Button>
          </CardHeader>
          <CardContent>
            <InventoryClient initialData={initialData} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
