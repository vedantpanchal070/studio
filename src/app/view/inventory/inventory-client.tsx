
"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ShoppingCart, Search } from "lucide-react"

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface InventoryClientProps {
  initialData: FinishedGoodInventoryItem[];
}

const searchSchema = z.object({
  name: z.string().optional(),
})

type SearchFormValues = z.infer<typeof searchSchema>

export function InventoryClient({ initialData }: InventoryClientProps) {
  const [inventory, setInventory] = useState<FinishedGoodInventoryItem[]>(initialData)
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      name: "",
    },
  })
  
  const onSaleSuccess = async () => {
      await fetchInventory(form.getValues())
  }
  
  const fetchInventory = async (filters: SearchFormValues = {}) => {
    setIsLoading(true);
    const updatedInventory = await getFinishedGoodsInventory(filters);
    setInventory(updatedInventory);
    setIsLoading(false)
  }

  const onSubmit = (values: SearchFormValues) => {
    fetchInventory(values)
  }
  
  const handleClear = () => {
    form.reset({ name: "" })
    fetchInventory()
  }

  return (
    <div className="space-y-6">
      <SalesDialog isOpen={isSalesModalOpen} onOpenChange={setIsSalesModalOpen} onSaleSuccess={onSaleSuccess}/>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-lg border p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Search by product name..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-start gap-2">
                    <Button type="submit" disabled={isLoading}>
                        <Search className="mr-2 h-4 w-4" />
                        {isLoading ? "Searching..." : "Search"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleClear}>
                        Clear
                    </Button>
                </div>
            </div>
        </form>
      </Form>


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
