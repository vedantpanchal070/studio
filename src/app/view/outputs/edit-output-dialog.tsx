
"use client"

import { useEffect, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { outputSchema, type Output } from "@/lib/schemas"
import { getProcessNamesAndDetails, updateOutput, type ProcessDetails } from "@/lib/actions"
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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"


type OutputFormValues = z.infer<typeof outputSchema>

interface EditOutputDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  output: Output
  onOutputUpdated: () => void
}

export function EditOutputDialog({ isOpen, onOpenChange, output, onOutputUpdated }: EditOutputDialogProps) {
  const { toast } = useToast()
  const [processes, setProcesses] = useState<ProcessDetails[]>([])
  const [selectedProcess, setSelectedProcess] = useState<ProcessDetails | null>(null)
  
  const [finalAvgPrice, setFinalAvgPrice] = useState(0)
  const [netAvailableQty, setNetAvailableQty] = useState(0)
  
  const processSelectRef = useRef<HTMLButtonElement>(null)

  const form = useForm<OutputFormValues>({
    resolver: zodResolver(outputSchema),
    defaultValues: {
      ...output,
      date: new Date(output.date),
    },
  })

  useEffect(() => {
    form.reset({
      ...output,
      date: new Date(output.date),
    })
  }, [output, form])

  useEffect(() => {
    const fetchProcesses = async () => {
      const processData = await getProcessNamesAndDetails()
      setProcesses(processData)
      const currentProcess = processData.find(p => p.processName === output.processUsed);
      setSelectedProcess(currentProcess || null);
    }
    fetchProcesses()
  }, [output])

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    if (!selectedProcess) {
      setFinalAvgPrice(0);
      setNetAvailableQty(0);
      return;
    }

    const { totalCost, totalProcessOutput } = selectedProcess;
    const { scrape = 0, scrapeUnit = 'kg', reduction = 0 } = watchedValues;
    const processCharge = Number(watchedValues.processCharge) || 0;

    let scrapeQty = 0;
    if (scrapeUnit === '%') {
      scrapeQty = totalProcessOutput * (scrape / 100);
    } else {
      scrapeQty = scrape;
    }

    const currentNetQty = totalProcessOutput - scrapeQty - (reduction || 0);
    setNetAvailableQty(currentNetQty);

    if (currentNetQty > 0) {
      const baseAvgPrice = totalCost / currentNetQty;
      const finalPrice = baseAvgPrice + processCharge;
      setFinalAvgPrice(finalPrice);
    } else {
      setFinalAvgPrice(0);
    }
  }, [watchedValues, selectedProcess]);

  const handleProcessChange = (processName: string) => {
    const process = processes.find(p => p.processName === processName)
    setSelectedProcess(process || null)
    if(process) {
      form.setValue("processUsed", process.processName)
      form.setValue("productName", process.processName)
    }
  }

  const onSubmit = async (values: OutputFormValues) => {
    const submissionData = {
      ...values,
      quantityProduced: netAvailableQty,
      finalAveragePrice: finalAvgPrice,
    }
    
    const result = await updateOutput(submissionData)
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      })
      onOutputUpdated();
      onOpenChange(false);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Output</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} nextFocusRef={processSelectRef} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="processUsed"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Process Name</FormLabel>
                    <Select onValueChange={handleProcessChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger ref={processSelectRef}>
                        <SelectValue placeholder="Select a process" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {processes.map(p => (
                        <SelectItem key={p.processName} value={p.processName}>
                            {p.processName}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex items-end gap-2">
                    <FormField
                        control={form.control}
                        name="scrape"
                        render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormLabel>Scrape</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scrapeUnit"
                        render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="%">%</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="reduction"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reduction</FormLabel>
                        <FormControl>
                        <Input type="number" {...field} />
                        </FormControl>
                    </FormItem>
                    )}
                />
            </div>
            
            <FormField
                control={form.control}
                name="processCharge"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Process Charge</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-4 text-center">
                  <div>
                      <p className="text-sm text-muted-foreground">Final Price</p>
                      <p className="text-2xl font-bold">{finalAvgPrice.toFixed(2)}</p>
                  </div>
                  <div>
                      <p className="text-sm text-muted-foreground">Net Qty</p>
                      <p className="text-2xl font-bold">{netAvailableQty.toFixed(2)}</p>
                  </div>
              </CardContent>
            </Card>

            <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                    <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
