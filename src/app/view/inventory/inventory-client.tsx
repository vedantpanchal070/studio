
"use client"

import React, { useState, useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search } from "lucide-react"

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
import { getFinishedGoodsInventory } from "@/lib/actions"
import { useAuth } from "@/hooks/use-auth"
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
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      name: "",
    },
  })
  
  const watchedFilters = useWatch({ control: form.control });

  useEffect(() => {
    if (!user) return;
    const fetchInventory = async () => {
        setIsLoading(true);
        const updatedInventory = await getFinishedGoodsInventory(user.username, watchedFilters);
        setInventory(updatedInventory);
        setIsLoading(false);
    };

    // Debounce to avoid excessive requests while typing
    const handler = setTimeout(() => {
        fetchInventory();
    }, 300); 

    return () => clearTimeout(handler);
  }, [watchedFilters, initialData, user]);
  
  const handleClear = () => {
    form.reset({ name: "" })
  }

  return (
    <div className="space-y-6">
      
      <Form {...form}>
        <form className="rounded-lg border p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                <div className="flex justify-start">
                    <Button type="button" variant="outline" onClick={handleClear} className="w-full md:w-auto">
                        Clear
                    </Button>
                </div>
            </div>
        </form>
      </Form>


      <div className="rounded-md border">
        <div className="h-96 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Available Qty</TableHead>
                <TableHead>Cost Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : inventory.length > 0 ? (
                inventory.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{`${item.availableStock.toFixed(2)} ${item.quantityType}`}</TableCell>
                    <TableCell>{item.averagePrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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

    
