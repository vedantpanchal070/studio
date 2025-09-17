
"use client"

import React, { useEffect, useRef, useState } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { PlusCircle, Trash2 } from "lucide-react"

import { processSchema } from "@/lib/schemas"
import { createProcess, getInventoryItem, getVoucherItemNames } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
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
import { UppercaseInput } from "@/components/ui/uppercase-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { ReadOnlyInput } from "@/components/ui/read-only-input"
import { Combobox } from "@/components/ui/combobox"

type ProcessFormValues = z.infer<typeof processSchema>

interface MaterialData {
  availableStock: number;
  rate: number;
  code: string;
  quantityType: string;
}

export function CreateProcessForm() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [materialData, setMaterialData] = useState<Record<string, MaterialData>>({});
  const [itemNames, setItemNames] = useState<string[]>([]);
  const processNameRef = useRef<HTMLInputElement>(null)


  useEffect(() => {
    if (!user) return;
    const fetchItemNames = async () => {
      const names = await getVoucherItemNames(user.username);
      setItemNames(names);
    };
    fetchItemNames();
  }, [user]);

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: {
      date: new Date(),
      processName: "",
      totalProcessOutput: 0,
      outputUnit: "",
      rawMaterials: [],
      notes: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rawMaterials",
  })

  const totalProcessOutput = useWatch({ control: form.control, name: "totalProcessOutput" });
  const rawMaterials = useWatch({ control: form.control, name: "rawMaterials" });

  const fetchMaterialData = async (name: string, index: number) => {
      if (!name || !user) return;
      const data = await getInventoryItem(user.username, name);
      setMaterialData(prev => ({...prev, [name]: {
          availableStock: data.availableStock,
          rate: data.averagePrice,
          code: data.code,
          quantityType: data.quantityType,
      }}));
      form.setValue(`rawMaterials.${index}.rate`, data.averagePrice, { shouldValidate: true });
      form.setValue(`rawMaterials.${index}.code`, data.code, { shouldValidate: true });
      form.setValue(`rawMaterials.${index}.quantityType`, data.quantityType, { shouldValidate: true });
  }

  // Recalculate all quantities when totalProcessOutput changes
  useEffect(() => {
    if (totalProcessOutput > 0) {
      rawMaterials.forEach((material, index) => {
        const ratio = form.getValues(`rawMaterials.${index}.ratio`) || 0;
        const newQuantity = (ratio / 100) * totalProcessOutput;
        form.setValue(`rawMaterials.${index}.quantity`, newQuantity, { shouldValidate: true });
      });
    }
  }, [totalProcessOutput, form, rawMaterials]);

  const handleRatioChange = (index: number, newRatio: number) => {
    const output = totalProcessOutput > 0 ? (newRatio / 100) * totalProcessOutput : 0;
    form.setValue(`rawMaterials.${index}.quantity`, output, { shouldValidate: true });
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const ratio = totalProcessOutput > 0 ? (newQuantity / totalProcessOutput) * 100 : 0;
    form.setValue(`rawMaterials.${index}.ratio`, ratio, { shouldValidate: true });
  };

  
  const calculatedMaterials = fields.map((field, index) => {
    const material = rawMaterials[index] || {};
    const data = materialData[material.name] || {};
    const quantity = Number(material.quantity) || 0;
    const rate = Number(material.rate) || data.rate || 0;
    const amount = quantity * rate;
    const stockIsInsufficient = (data.availableStock ?? 0) < quantity;

    return { 
        ...material, 
        availableStock: data.availableStock,
        rate: rate,
        amount, 
        stockIsInsufficient,
    };
  });

  const totalRatio = calculatedMaterials.reduce((sum, mat) => sum + (Number(mat.ratio) || 0), 0);
  const totalAmount = calculatedMaterials.reduce((sum, mat) => sum + mat.amount, 0);
  const averageRate = (Number(totalProcessOutput) || 0) > 0 ? totalAmount / (Number(totalProcessOutput) || 0) : 0;


  const onSubmit = async (values: ProcessFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a process.", variant: "destructive" });
      return;
    }
    const result = await createProcess(user.username, values)
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      })
      form.reset()
      setMaterialData({})
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} nextFocusRef={processNameRef} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="processName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Process Name</FormLabel>
                <FormControl>
                  <UppercaseInput {...field} ref={processNameRef} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
                control={form.control}
                name="totalProcessOutput"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Total Process Output</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="outputUnit"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Output Unit</FormLabel>
                    <FormControl>
                    <UppercaseInput {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recipe Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Ingredient</TableHead>
                    <TableHead>Avail. Stock</TableHead>
                    <TableHead>% Ratio</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const material = calculatedMaterials[index];
                    return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                            control={form.control}
                            name={`rawMaterials.${index}.name`}
                            render={({ field }) => (
                                <Combobox
                                    options={itemNames.map(name => ({ value: name, label: name }))}
                                    value={field.value}
                                    onChange={(value) => {
                                        field.onChange(value);
                                        fetchMaterialData(value, index);
                                    }}
                                    placeholder="Select an item"
                                    searchPlaceholder="Search items..."
                                />
                            )}
                        />
                      </TableCell>
                      <TableCell>
                         <span className={material?.stockIsInsufficient ? "text-destructive" : ""}>
                            {material?.availableStock?.toFixed(2) || '0.00'}
                         </span>
                      </TableCell>
                      <TableCell>
                        <FormField
                            control={form.control}
                            name={`rawMaterials.${index}.ratio`}
                            render={({ field }) => <Input type="number" {...field} onChange={e => {
                                const newRatio = e.target.valueAsNumber || 0;
                                field.onChange(newRatio);
                                handleRatioChange(index, newRatio);
                            }} />}
                        />
                      </TableCell>
                      <TableCell>
                          <FormField
                              control={form.control}
                              name={`rawMaterials.${index}.quantity`}
                              render={({ field }) => (
                                  <Input type="number" {...field} onChange={e => {
                                      const newQuantity = e.target.valueAsNumber || 0;
                                      field.onChange(newQuantity);
                                      handleQuantityChange(index, newQuantity);
                                  }} />
                              )}
                          />
                      </TableCell>
                      <TableCell>
                           <FormField
                              control={form.control}
                              name={`rawMaterials.${index}.rate`}
                              render={({ field }) => (
                                <>
                                  <ReadOnlyInput value={field.value?.toFixed(2) || '0.00'} />
                                  {/* Hidden input to ensure value is submitted */}
                                  <input type="hidden" {...field} />
                                </>
                              )}
                          />
                      </TableCell>
                      <TableCell>
                        <ReadOnlyInput value={material?.amount?.toFixed(2) || '0.00'} />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="font-semibold">{Number.isFinite(totalRatio) ? totalRatio.toFixed(2) : '0.00'}%</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-semibold">{averageRate.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">{totalAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </div>
            <Separator className="my-4" />
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: "", quantity: 0, ratio: 0, code: "", quantityType: "", rate: 0 })}
            >
              <PlusCircle className="mr-2" />
              Add Ingredient
            </Button>
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
        <Button type="submit" disabled={form.formState.isSubmitting || !user}>
          {form.formState.isSubmitting ? "Saving..." : "Save and Close"}
        </Button>
      </form>
    </Form>
  )
}

    