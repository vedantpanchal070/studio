
"use client"

import React, { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Search } from "lucide-react"
import { format } from 'date-fns'

import type { LedgerEntry } from "@/lib/actions"
import { getOutputLedger } from "@/lib/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const searchSchema = z.object({
  name: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

type SearchFormValues = z.infer<typeof searchSchema>

interface ViewOutputsClientProps {
  initialData: LedgerEntry[];
  productNames: string[];
}

export function ViewOutputsClient({ initialData, productNames }: ViewOutputsClientProps) {
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  })

  const selectedName = form.watch("name");

  const onSubmit = async (values: SearchFormValues) => {
    setIsLoading(true)
    const results = await getOutputLedger(values)
    setLedger(results)
    setIsLoading(false)
  }

  const handleClear = async () => {
    form.reset({ name: "", startDate: undefined, endDate: undefined })
    setIsLoading(true);
    const results = await getOutputLedger({});
    setLedger(results);
    setIsLoading(false);
  }

  const summary = useMemo(() => {
    const totalProduced = ledger
      .filter(entry => entry.type === 'Production')
      .reduce((sum, entry) => sum + entry.quantity, 0)
      
    const totalSold = ledger
      .filter(entry => entry.type === 'Sale')
      .reduce((sum, entry) => sum + Math.abs(entry.quantity), 0)

    const availableStock = totalProduced - totalSold

    return { totalProduced, totalSold, availableStock }
  }, [ledger])

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-lg border p-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>
      </Form>
      
      <div className="rounded-md border">
        <div className="h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Client Code</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price/kg</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ledger.length > 0 ? ledger.map((entry) => (
                    <TableRow
                        key={entry.id}
                        className={cn(
                        entry.type === 'Production'
                            ? "bg-green-100/50 hover:bg-green-100/80 dark:bg-green-900/50 dark:hover:bg-green-900/80"
                            : "bg-red-100/50 hover:bg-red-100/80 dark:bg-red-900/50 dark:hover:bg-red-900/80"
                        )}
                    >
                        <TableCell>{format(new Date(entry.date), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{entry.productName}</TableCell>
                        <TableCell>{entry.type}</TableCell>
                        <TableCell>{entry.clientCode || 'N/A'}</TableCell>
                        <TableCell>{entry.quantity.toFixed(2)}</TableCell>
                        <TableCell>{entry.pricePerKg.toFixed(2)}</TableCell>
                    </TableRow>
                    )) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                        No results found.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Inventory Summary for {selectedName || "All Products"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Produced</p>
            <p className="text-2xl font-bold">{summary.totalProduced.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Sold</p>
            <p className="text-2xl font-bold">{summary.totalSold.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Available Stock</p>
            <p className="text-2xl font-bold">{summary.availableStock.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
