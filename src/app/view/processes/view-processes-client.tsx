
"use client"

import React, { useState, useRef, useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Search, Trash2, ChevronDown, Edit } from "lucide-react"
import { format } from 'date-fns'

import type { Process } from "@/lib/schemas"
import { getProcesses, deleteProcess, getUniqueProcessNames } from "@/lib/actions"
import { useAuth } from "@/hooks/use-auth"
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
import { cn } from "@/lib/utils"
import { EditProcessDialog } from "./edit-process-dialog"
import { Combobox } from "@/components/ui/combobox"

const searchSchema = z.object({
  name: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

type SearchFormValues = z.infer<typeof searchSchema>


function ProcessEntry({ process, onDelete, onEdit }: { process: Process, onDelete: (process: Process) => void, onEdit: (process: Process) => void }) {
    const [isOpen, setIsOpen] = useState(false)

    const totalAmount = process.rawMaterials.reduce((sum, mat) => sum + ((mat.rate ?? 0) * mat.quantity), 0);
    const totalIngredients = process.rawMaterials.reduce((sum, mat) => sum + mat.quantity, 0);
    const costPerUnit = process.totalProcessOutput > 0 ? totalAmount / process.totalProcessOutput : 0;
    
    return (
        <React.Fragment key={process.id}>
            <TableRow className="hover:bg-muted/50" data-state={isOpen ? 'open' : 'closed'}>
                <TableCell>{format(new Date(process.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="min-w-[400px]">{process.processName}</TableCell>
                <TableCell>{costPerUnit.toFixed(2)}</TableCell>
                <TableCell>{totalIngredients.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(process)}>
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
                                    <AlertDialogDescription>
                                        This will delete the process and add all consumed raw materials back to your inventory. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(process)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            <span className="sr-only">{isOpen ? "Collapse" : "Expand"}</span>
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {isOpen && (
                <TableRow>
                    <TableCell colSpan={5} className="p-0">
                        <div className="p-4 bg-background">
                            <h4 className="font-semibold mb-2">Recipe Details:</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingredient</TableHead>
                                        <TableHead>Qty Used</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {process.rawMaterials.map((material, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{material.name}</TableCell>
                                            <TableCell>{material.quantity.toFixed(2)} {material.quantityType}</TableCell>
                                            <TableCell>{(material.rate ?? 0).toFixed(2)}</TableCell>
                                            <TableCell>{((material.rate ?? 0) * material.quantity).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {process.notes && <p className="mt-4 text-sm text-muted-foreground">Notes: {process.notes}</p>}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    )
}

export function ViewProcessesClient() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [processes, setProcesses] = useState<Process[]>([])
  const [processNames, setProcessNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const endDateRef = useRef<HTMLButtonElement>(null)


  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  })

  const watchedFilters = useWatch({ control: form.control });

  useEffect(() => {
    if (!user) return;
    const fetchProcesses = async () => {
      setIsLoading(true)
      const [results, names] = await Promise.all([
        getProcesses(user.username, watchedFilters),
        getUniqueProcessNames(user.username)
      ]);
      setProcesses(results)
      setProcessNames(names)
      setIsLoading(false)
    };

    fetchProcesses();
  }, [watchedFilters, user]);


  const handleClear = () => {
    form.reset({ name: "", startDate: undefined, endDate: undefined })
  }
  
  const handleDelete = async (process: Process) => {
    if (!user) return;
    const result = await deleteProcess(user.username, process);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      const results = await getProcesses(user.username, form.getValues())
      setProcesses(results)
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleEdit = (process: Process) => {
    setSelectedProcess(process);
    setIsEditDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Process Name</FormLabel>
                   <Combobox
                      options={processNames.map(name => ({ value: name, label: name }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a process"
                      searchPlaceholder="Search processes..."
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
                    <DatePicker value={field.value} onChange={field.onChange} nextFocusRef={endDateRef} />
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
                    <DatePicker value={field.value} onChange={field.onChange} ref={endDateRef} />
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
        <div className="max-h-96 overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[150px]">Date</TableHead>
                        <TableHead>Process Name</TableHead>
                        <TableHead>Cost/Unit</TableHead>
                        <TableHead>Ingred. Qty</TableHead>
                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            Loading...
                        </TableCell>
                    </TableRow>
                  ) : processes.length > 0 ? processes.map((process) => (
                      <ProcessEntry key={process.id} process={process} onDelete={handleDelete} onEdit={handleEdit} />
                  )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No process history found for the selected criteria.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
            </Table>
        </div>
      </div>
      {selectedProcess && (
        <EditProcessDialog
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            process={selectedProcess}
            onProcessUpdated={async () => {
                if (!user) return;
                const results = await getProcesses(user.username, form.getValues())
                setProcesses(results)
            }}
        />
      )}
    </div>
  )
}

    