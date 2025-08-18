
"use client"

import React, { useState } from "react"
import { ShoppingCart } from "lucide-react"

import type { FinishedGoodInventoryItem } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SalesDialog } from "@/components/sales-dialog"
import { getFinishedGoodsInventory } from "@/lib/actions"

interface InventoryClientProps {
  initialData: FinishedGoodInventoryItem[];
}

export function InventoryClient({ initialData }: InventoryClientProps) {
  const [inventory, setInventory] = useState<FinishedGoodInventoryItem[]>(initialData)
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)
  
  const onSaleSuccess = async () => {
      const updatedInventory = await getFinishedGoodsInventory();
      setInventory(updatedInventory);
  }

  return (
    <div className="space-y-6">
       <SalesDialog isOpen={isSalesModalOpen} onOpenChange={setIsSalesModalOpen} onSaleSuccess={onSaleSuccess}/>

      <div className="rounded-md border">
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Available Qty</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length > 0 ? (
                inventory.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{`${item.availableStock.toFixed(2)} ${item.quantityType}`}</TableCell>
                    <TableCell>{item.averagePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSalesModalOpen(true)}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Sell
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No finished goods in stock.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
