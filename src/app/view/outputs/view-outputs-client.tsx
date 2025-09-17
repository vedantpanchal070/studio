
"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Search, Trash2, Edit } from "lucide-react"
import { format } from 'date-fns'

import type { LedgerEntry, Output, Sale } from "@/lib/actions"
import { getOutputLedger, deleteOutput, deleteSale, getOutput, getSale, getFinishedGoods } from "@/lib/actions"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
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
import { EditOutputDialog } from "./edit-output-dialog"
import { EditSaleDialog } from "./edit-sale-dialog"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"

const searchSchema = z.object({
  name: z.string().optional(),
})

type SearchFormValues = z.infer<typeof searchSchema>

export function ViewOutputsClient() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [productNames, setProductNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false)
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false)
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)


  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  })

  const watchedFilters = useWatch({ control: form.control });
  const selectedName = watchedFilters.name;

  useEffect(() => {
    if (!user) return;
    const fetchInitialData = async () => {
        setIsLoading(true);
        const [ledgerResults, goods] = await Promise.all([
            getOutputLedger(user.username, watchedFilters),
            getFinishedGoods(user.username)
        ]);
        setLedger(ledgerResults);
        setProductNames(goods.map(g => g.name));
        setIsLoading(false);
    };
    fetchInitialData();
  }, [watchedFilters, user]);


  const handleClear = () => {
    form.reset({ name: "" })
  }

  const handleDelete = async (entry: LedgerEntry) => {
    if (!user) return;
    let result;
    if (entry.type === 'Production') {
      result = await deleteOutput(user.username, entry.id);
    } else { // Sale
      result = await deleteSale(user.username, entry.id);
    }
    
    if (result.success) {
      toast({ title: "Success", description: result.message });
      const results = await getOutputLedger(user.username, form.getValues())
      setLedger(results)
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };
  
  const handleEdit = async (entry: LedgerEntry) => {
    if (!user) return;
    if (entry.type === 'Production') {
      const outputData = await getOutput(user.username, entry.id);
      if (outputData) {
        setSelectedOutput(outputData);
        setIsOutputDialogOpen(true);
      } else {
        toast({ title: "Error", description: "Could not find output record to edit.", variant: "destructive" });
      }
    } else { // Sale
      const saleData = await getSale(user.username, entry.id);
       if (saleData) {
        setSelectedSale(saleData);
        setIsSaleDialogOpen(true);
      } else {
        toast({ title: "Error", description: "Could not find sale record to edit.", variant: "destructive" });
      }
    }
  };


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
        <form className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                   <Combobox
                      options={productNames.map(name => ({ value: name, label: name }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a product"
                      searchPlaceholder="Search products..."
                    />
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
        <Table height="24rem">
            <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client Code</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price/kg</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : ledger.length > 0 ? ledger.map((entry) => (
                <TableRow
                    key={entry.id}
                    className={cn(
                    entry.type === 'Production'
                        ? "bg-green-100/50"
                        : "bg-red-100/50"
                    )}
                >
                    <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{entry.productName}</TableCell>
                    <TableCell>{entry.type}</TableCell>
                    <TableCell>{entry.clientCode || 'N/A'}</TableCell>
                    <TableCell>{entry.quantity.toFixed(2)}</TableCell>
                    <TableCell>{entry.pricePerKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
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
                                <AlertDialogDescription>This will delete the transaction and reverse its effect on inventory. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(entry)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                </TableRow>
                )) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                    No results found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
        </Table>
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

      {selectedOutput && (
        <EditOutputDialog
            isOpen={isOutputDialogOpen}
            onOpenChange={setIsOutputDialogOpen}
            output={selectedOutput}
            onOutputUpdated={async () => {
                if (!user) return;
                const results = await getOutputLedger(user.username, form.getValues())
                setLedger(results)
            }}
        />
      )}
      
       {selectedSale && (
        <EditSaleDialog
            isOpen={isSaleDialogOpen}
            onOpenChange={setIsSaleDialogOpen}
            sale={selectedSale}
            onSaleUpdated={async () => {
                if (!user) return;
                const results = await getOutputLedger(user.username, form.getValues())
                setLedger(results)
            }}
        />
      )}

    </div>
  )
}

    