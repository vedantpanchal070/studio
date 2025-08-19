
"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ViewVouchersClient } from "./view-vouchers-client"


export default function ViewVouchersPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-7xl">
        <Link href="/view" className="mb-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to View Menu
          </Button>
        </Link>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">View Vouchers</CardTitle>
            <CardDescription>
              Search, view, edit, or delete the transaction history for any raw material.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ViewVouchersClient />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

    