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
import { CreateVoucherForm } from "./create-voucher-form"

export default function CreateVoucherPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <Link href="/create" className="mb-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Create Menu
          </Button>
        </Link>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Voucher</CardTitle>
            <CardDescription>
              Record a new raw material purchase into the inventory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateVoucherForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
