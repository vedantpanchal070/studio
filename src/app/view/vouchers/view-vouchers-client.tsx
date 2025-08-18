"use client"

import React, { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowUpDown, Search } from "lucide-react"

import type { Voucher } from "@/lib/schemas"
import { getVouchers } from "@/lib/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const searchSchema = z.object({
  name: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

type SearchFormValues = z.infer<typeof searchSchema>
type SortKey = keyof Voucher
type SortDirection = "asc" | "desc"

export function ViewVouchersClient({ initialData }: { initialData: Voucher[] }) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey
    direction: SortDirection
  } | null>(null)

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  })

  // Mock item names - in a real app, this would be fetched from the DB
  const itemNames = useMemo(() => {
    const names = new Set(initialData.map(v => v.name));
    return Array.from(names);
  }, [initialData]);

  const sortedVouchers = useMemo(() => {
    let sortableItems = [...vouchers]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [vouchers, sortConfig])

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc"
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const onSubmit = async (values: SearchFormValues) => {
    setIsLoading(true)
    const results = await getVouchers(values)
    setVouchers(results)
    setIsLoading(false)
  }

  const handleClear = () => {
    form.reset({ name: "", startDate: undefined, endDate: undefined })
    setVouchers(initialData)
    setSortConfig(null)
  }

  const summary = useMemo(() => {
    const totalInputQty = vouchers
      .filter((v) => v.quantities > 0)
      .reduce((sum, v) => sum + v.quantities, 0)
    const totalOutputQty = vouchers
      .filter((v) => v.quantities < 0)
      .reduce((sum, v) => sum + v.quantities, 0)
    const availableQty = totalInputQty + totalOutputQty

    const totalInputValue = vouchers
      .filter((v) => v.quantities > 0)
      .reduce((sum, v) => sum + v.totalPrice, 0)
    const averagePrice =
      totalInputQty > 0 ? totalInputValue / totalInputQty : 0

    return {
      totalInputQty,
      totalOutputQty,
      availableQty,
      averagePrice,
    }
  }, [vouchers])

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
                  <FormLabel>Voucher Name</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {itemNames.map(name => (
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
            <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                <TableHead onClick={() => requestSort("date")}>
                    <div className="flex items-center cursor-pointer">
                    Date <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                </TableHead>
                <TableHead onClick={() => requestSort("name")}>
                    <div className="flex items-center cursor-pointer">
                    Name <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                </TableHead>
                <TableHead onClick={() => requestSort("code")}>
                    <div className="flex items-center cursor-pointer">
                    Code <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                </TableHead>
                <TableHead onClick={() => requestSort("quantities")}>
                    <div className="flex items-center cursor-pointer">
                    Qty <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                </TableHead>
                <TableHead onClick={() => requestSort("quantityType")}>
                    <div className="flex items-center cursor-pointer">
                    Unit <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                </TableHead>
                <TableHead onClick={() => requestSort("pricePerNo")}>
                    <div className="flex items-center cursor-pointer">
                    Rate <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                </TableHead>
                <TableHead onClick={() => requestSort("totalPrice")}>
                    <div className="flex items-center cursor-pointer">
                    Total Price <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedVouchers.map((voucher) => (
                <TableRow
                    key={voucher.id}
                    className={cn(
                    voucher.quantities > 0
                        ? "bg-green-100/50 hover:bg-green-100/80"
                        : "bg-red-100/50 hover:bg-red-100/80"
                    )}
                >
                    <TableCell>
                    {new Date(voucher.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{voucher.name}</TableCell>
                    <TableCell>{voucher.code}</TableCell>
                    <TableCell>{voucher.quantities}</TableCell>
                    <TableCell>{voucher.quantityType}</TableCell>
                    <TableCell>{voucher.pricePerNo.toFixed(2)}</TableCell>
                    <TableCell>{voucher.totalPrice.toFixed(2)}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Input Qty</p>
            <p className="text-2xl font-bold">{summary.totalInputQty.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Output Qty</p>
            <p className="text-2xl font-bold">{Math.abs(summary.totalOutputQty).toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Available Qty</p>
            <p className="text-2xl font-bold">{summary.availableQty.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Average Price</p>
            <p className="text-2xl font-bold">${summary.averagePrice.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
