
"use client"

import React, { useEffect, useState } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { PlusCircle, Trash2 } from "lucide-react"

import { processSchema } from "@/lib/schemas"
import { createProcess, getInventoryItem, getVoucherItemNames } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ProcessFormValues = z.infer<typeof processSchema>

interface MaterialData {
  availableStock: number;
  rate: number;
  code: string;
  quantityType: string;
}

export function CreateProcessForm() {
  const { toast } = useToast()
  const [materialData, setMaterialData] = useState<Record<string, MaterialData>>({});
  const [itemNames, setItemNames] = useState<string[]>([]);


  useEffect(() => {
    const fetchItemNames = async () => {
      const names = await getVoucherItemNames();
      setItemNames(names);
    };
    fetchItemNames();
  }, []);

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
      if (!name) return;
      const data = await getInventoryItem(name);
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

  useEffect(() => {
    rawMaterials.forEach((material, index) => {
        const output = (material.ratio ?? 0) * (totalProcessOutput ?? 0) / 100;
        if (form.getValues(`rawMaterials.${index}.quantity`) !== output) {
            form.setValue(`rawMaterials.${index}.quantity`, output, { shouldValidate: true });
        }
    });
  }, [rawMaterials, totalProcessOutput, form]);
  
  const calculatedMaterials = fields.map((field, index) => {
    const material = rawMaterials[index] || {};
    const data = materialData[material.name] || {};
    const quantity = material.quantity ?? 0;
    const rate = material.rate || data.rate || 0;
    const amount = quantity * rate;
    const stockIsInsufficient = (data.availableStock ?? 0) < quantity;

    return { 
        ...material, 
        output: quantity,
        availableStock: data.availableStock,
        rate: rate,
        amount, 
        stockIsInsufficient,
    };
  });

  const totalRatio = calculatedMaterials.reduce((sum, mat) => sum + (mat.ratio ?? 0), 0);
  const totalAmount = calculatedMaterials.reduce((sum, mat) => sum + mat.amount, 0);
  const averageRate = (totalProcessOutput ?? 0) > 0 ? totalAmount / (totalProcessOutput ?? 0) : 0;


  const onSubmit = async (values: ProcessFormValues) => {
    const result = await createProcess(values)
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
                  <DatePicker value={field.value} onChange={field.onChange} />
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
                  <UppercaseInput {...field} />
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
                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
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
                                <Select
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    fetchMaterialData(value, index);
                                }}
                                defaultValue={field.value}
                                >
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
                            render={({ field }) => <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />}
                        />
                      </TableCell>
                      <TableCell>{material?.output?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <FormField
                            control={form.control}
                            name={`rawMaterials.${index}.rate`}
                            render={({ field }) => <Input type="number" {...field} readOnly className="bg-muted" />}
                        />
                      </TableCell>
                      <TableCell>{material?.amount?.toFixed(2) || '0.00'}</TableCell>
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
                        <TableCell className="font-semibold">{totalRatio.toFixed(2)}%</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-semibold text-right">Avg Rate:</TableCell>
                        <TableCell className="font-semibold">{averageRate.toFixed(2)}</TableCell>
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
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save and Close"}
        </Button>
      </form>
    </Form>
  )
}
