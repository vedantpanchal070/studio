
"use client"

import { useEffect, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { outputSchema, type Output } from "@/lib/schemas"
import { getProcessNamesAndDetails, updateOutput, type ProcessDetails } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
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
import { Combobox } from "@/components/ui/combobox"


type OutputFormValues = z.infer<typeof outputSchema>

interface EditOutputDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  output: Output
  onOutputUpdated: () => void
}

export function EditOutputDialog({ isOpen, onOpenChange, output, onOutputUpdated }: EditOutputDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
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
      reductionUnit: output.reductionUnit || 'kg',
    },
  })

  useEffect(() => {
    form.reset({
      ...output,
      date: new Date(output.date),
      reductionUnit: output.reductionUnit || 'kg',
    })
  }, [output, form])

  useEffect(() => {
    if (!user) return;
    const fetchProcesses = async () => {
      const processData = await getProcessNamesAndDetails(user.username)
      setProcesses(processData)
      const currentProcess = processData.find(p => p.processName === output.processUsed);
      setSelectedProcess(currentProcess || null);
    }
    fetchProcesses()
  }, [output, user])

  const watchedScrape = useWatch({ control: form.control, name: 'scrape' });
  const watchedScrapeUnit = useWatch({ control: form.control, name: 'scrapeUnit' });
  const watchedReduction = useWatch({ control: form.control, name: 'reduction' });
  const watchedReductionUnit = useWatch({ control: form.control, name: 'reductionUnit' });
  const watchedProcessCharge = useWatch({ control: form.control, name: 'processCharge' });

  useEffect(() => {
    if (!selectedProcess) {
      setFinalAvgPrice(0);
      setNetAvailableQty(0);
      return;
    }

    const { totalCost, totalProcessOutput } = selectedProcess;
    const scrape = Number(watchedScrape) || 0;
    const scrapeUnit = watchedScrapeUnit || 'kg';
    const reduction = Number(watchedReduction) || 0;
    const reductionUnit = watchedReductionUnit || 'kg';
    const processCharge = Number(watchedProcessCharge) || 0;

    let scrapeQty = 0;
    if (scrapeUnit === '%') {
      scrapeQty = totalProcessOutput * (scrape / 100);
    } else {
      scrapeQty = scrape;
    }

    let reductionQty = 0;
    if (reductionUnit === '%') {
      reductionQty = totalProcessOutput * (reduction / 100);
    } else {
      reductionQty = reduction;
    }

    const currentNetQty = totalProcessOutput - scrapeQty - reductionQty;
    setNetAvailableQty(currentNetQty);

    if (currentNetQty > 0) {
      const baseAvgPrice = totalCost / currentNetQty;
      const finalPrice = parseFloat((baseAvgPrice + processCharge).toFixed(2));
      setFinalAvgPrice(finalPrice);
    } else {
      setFinalAvgPrice(0);
    }
  }, [selectedProcess, watchedScrape, watchedScrapeUnit, watchedReduction, watchedReductionUnit, watchedProcessCharge]);

  const handleProcessChange = (processName: string) => {
    const process = processes.find(p => p.processName === processName)
    setSelectedProcess(process || null)
    if(process) {
      form.setValue("processUsed", process.processName)
      form.setValue("productName", process.processName)
    }
  }

  const onSubmit = async (values: OutputFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const submissionData = {
      ...values,
      quantityProduced: netAvailableQty,
      finalAveragePrice: finalAvgPrice,
      id: output.id,
    }
    
    const result = await updateOutput(user.username, submissionData)
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
                    <Combobox
                      options={processes.map(p => ({ value: p.processName, label: p.processName }))}
                      value={field.value}
                      onChange={handleProcessChange}
                      placeholder="Select a process"
                      searchPlaceholder="Search processes..."
                    />
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
                            <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} />
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
                <div className="flex items-end gap-2">
                  <FormField
                      control={form.control}
                      name="reduction"
                      render={({ field }) => (
                      <FormItem className="flex-grow">
                          <FormLabel>Reduction</FormLabel>
                          <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} />
                          </FormControl>
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="reductionUnit"
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
            </div>
            
            <FormField
                control={form.control}
                name="processCharge"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Process Charge</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} />
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
              <Button type="submit" disabled={form.formState.isSubmitting || !user}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
