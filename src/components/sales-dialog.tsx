
"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { saleSchema, type FinishedGood } from "@/lib/schemas"
import { getFinishedGoods, getInventoryItem, recordSale } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "./date-picker"
import { UppercaseInput } from "./ui/uppercase-input"
import { ReadOnlyInput } from "./ui/read-only-input"

type SalesFormValues = z.infer<typeof saleSchema>

interface SalesDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void;
  onSaleSuccess?: () => void;
}

export function SalesDialog({ isOpen, onOpenChange, onSaleSuccess }: SalesDialogProps) {
  const { toast } = useToast()
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])
  const [availableQty, setAvailableQty] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const dateOfSaleRef = useRef<HTMLButtonElement>(null)


  const form = useForm<SalesFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      date: new Date(),
      productName: "",
      clientCode: "",
      saleQty: 0,
      salePrice: 0,
      totalAmount: 0,
    },
  })
  
  const saleQty = form.watch("saleQty")
  const salePrice = form.watch("salePrice")
  const selectedProduct = form.watch("productName")

  useEffect(() => {
    const fetchGoods = async () => {
      const goods = await getFinishedGoods()
      setFinishedGoods(goods)
    }
    if (isOpen) {
      fetchGoods()
    }
  }, [isOpen])
  
  useEffect(() => {
    const fetchStock = async () => {
      if (selectedProduct) {
        const stock = await getInventoryItem(selectedProduct)
        setAvailableQty(stock.availableStock)
      } else {
        setAvailableQty(0)
      }
    }
    fetchStock()
  }, [selectedProduct])

  useEffect(() => {
    const amount = (saleQty || 0) * (salePrice || 0)
    setTotalAmount(amount)
    form.setValue("totalAmount", amount)
  }, [saleQty, salePrice, form])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
          date: new Date(),
          productName: "",
          clientCode: "",
          saleQty: 0,
          salePrice: 0,
          totalAmount: 0,
      })
      setAvailableQty(0)
      setTotalAmount(0)
    }
    onOpenChange(open)
  }

  const onSubmit = async (values: SalesFormValues) => {
    if (values.saleQty > availableQty) {
        toast({
            title: "Error",
            description: `Not enough stock. Available: ${availableQty}`,
            variant: "destructive"
        })
        return;
    }
    
    const result = await recordSale(values)
    if (result.success) {
      toast({
        title: "Success!",
        description: "Sale has been recorded.",
      })
      onSaleSuccess?.();
      handleOpenChange(false)
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell Finished Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product to Sell</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    dateOfSaleRef.current?.focus();
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {finishedGoods.map((good) => (
                        <SelectItem key={good.name} value={good.name}>
                          {good.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   {selectedProduct && <p className="text-sm text-muted-foreground mt-1">Available: {availableQty.toFixed(2)}</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Sale</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} ref={dateOfSaleRef} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="clientCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Client Code</FormLabel>
                    <FormControl>
                        <UppercaseInput {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="saleQty"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sale Qty (kg)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sale Price (Rs/kg)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormItem>
                <FormLabel>Total Amount</FormLabel>
                <FormControl>
                    <ReadOnlyInput value={totalAmount.toFixed(2)} />
                </FormControl>
            </FormItem>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Confirm Sale"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
