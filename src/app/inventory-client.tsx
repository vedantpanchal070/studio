
"use client"

import React, { useState } from "react"
import { ShoppingCart, PlusCircle, LayoutList } from "lucide-react"
import Link from "next/link"

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full mx-auto my-8">
            <MenuCard
            href="/create"
            icon={<PlusCircle className="w-12 h-12 text-primary" />}
            title="Create"
            description="Add new vouchers, production processes, and outputs."
            />
            <MenuCard
            href="/view"
            icon={<LayoutList className="w-12 h-12 text-primary" />}
            title="View"
            description="Browse and manage inventory, production, and finished goods."
            />
        </div>

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


function MenuCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
        <CardHeader className="flex flex-col items-center text-center gap-4 p-6">
          {icon}
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
