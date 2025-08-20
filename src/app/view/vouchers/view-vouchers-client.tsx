
"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowUpDown, Search, Edit, Trash2 } from "lucide-react"
import { format } from 'date-fns'

import type { Voucher } from "@/lib/schemas"
import { getVouchers, getAllVoucherItemNames, deleteVoucher } from "@/lib/actions"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { EditVoucherDialog } from "./edit-voucher-dialog"
import { Combobox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/date-picker"

const searchSchema = z.object({
  name: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

type SearchFormValues = z.infer<typeof searchSchema>
type SortKey = keyof Voucher
type SortDirection = "asc" | "desc"

export function ViewVouchersClient() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [itemNames, setItemNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey
    direction: SortDirection
  } | null>(null)

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  })
  
  const watchedFilters = useWatch({ control: form.control });

  useEffect(() => {
    if (!user) return;
    const fetchVoucherData = async () => {
      setIsLoading(true);
      const [voucherResults, names] = await Promise.all([
        getVouchers(user.username, watchedFilters),
        getAllVoucherItemNames(user.username)
      ]);
      setVouchers(voucherResults);
      setItemNames(names);
      setIsLoading(false);
    }
    fetchVoucherData();
  }, [watchedFilters, user]);

  const sortedVouchers = useMemo(() => {
    let sortableItems = [...vouchers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue instanceof Date && bValue instanceof Date) {
            return (aValue.getTime() - bValue.getTime()) * (sortConfig.direction === "asc" ? 1 : -1);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [vouchers, sortConfig])

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const handleClear = () => {
    form.reset({ name: "", startDate: undefined, endDate: undefined })
    setSortConfig(null)
  }

  const handleDelete = async (voucherId: string) => {
    if (!user) return;
    const result = await deleteVoucher(user.username, voucherId);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      const results = await getVouchers(user.username, form.getValues());
      setVouchers(results);
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  }

  const handleEdit = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setIsEditDialogOpen(true)
  }

  const summary = useMemo(() => {
    const totalInputQty = vouchers
      .filter((v) => v.quantities > 0)
      .reduce((sum, v) => sum + v.quantities, 0)
      
    const totalOutputQty = vouchers
      .filter((v) => v.quantities < 0)
      .reduce((sum, v) => sum + v.quantities, 0)

    const availableQty = totalInputQty + totalOutputQty

    const totalInputValue = vouchers.filter(v => v.quantities > 0).reduce((sum, v) => sum + v.totalPrice, 0)
    const averagePrice = totalInputQty > 0 ? totalInputValue / totalInputQty : 0;


    return { totalInputQty, totalOutputQty, availableQty, averagePrice }
  }, [vouchers])

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voucher Name</FormLabel>
                   <Combobox
                      options={itemNames.map(name => ({ value: name, label: name }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select an item"
                      searchPlaceholder="Search items..."
                    />
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
                    <DatePicker 
                      value={field.value} 
                      onChange={(date) => {
                        field.onChange(date);
                      }} 
                    />
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
             <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClear} className="w-full">
                Clear
                </Button>
            </div>
          </div>
        </form>
      </Form>

      <div className="rounded-md border">
        <div className="h-96 overflow-auto">
            <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                <TableHead onClick={() => requestSort("date")}>Date <ArrowUpDown className="ml-2 h-4 w-4 inline-block" /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                ) : sortedVouchers.length > 0 ? sortedVouchers.map((voucher) => (
                <TableRow
                    key={voucher.id}
                    className={cn(voucher.quantities > 0 ? "bg-green-100/50" : "bg-red-100/50")}
                >
                    <TableCell>{format(new Date(voucher.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{voucher.name}</TableCell>
                    <TableCell>{voucher.quantities}</TableCell>
                    <TableCell>{voucher.pricePerNo.toFixed(2)}</TableCell>
                    <TableCell>{voucher.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>{voucher.remarks}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(voucher)}>
                           <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. This will permanently delete the voucher entry.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(voucher.id!)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No results found.</TableCell>
                  </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary for All Items</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Total Input Qty</p><p className="text-2xl font-bold">{summary.totalInputQty.toFixed(2)}</p></div>
          <div className="p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Total Output Qty</p><p className="text-2xl font-bold">{Math.abs(summary.totalOutputQty).toFixed(2)}</p></div>
          <div className="p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Available Qty</p><p className="text-2xl font-bold">{summary.availableQty.toFixed(2)}</p></div>
          <div className="p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Average Price</p><p className="text-2xl font-bold">{summary.averagePrice.toFixed(2)}</p></div>
        </CardContent>
      </Card>

      {selectedVoucher && (
        <EditVoucherDialog 
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          voucher={selectedVoucher}
          onVoucherUpdated={async () => {
            if (!user) return;
            const results = await getVouchers(user.username, form.getValues());
            setVouchers(results);
          }}
        />
      )}
    </div>
  )
}
