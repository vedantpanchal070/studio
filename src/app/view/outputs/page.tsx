
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
import { ViewOutputsClient } from "./view-outputs-client"
import { PagePasswordProtect } from "@/components/page-password-protect"


export default function ViewOutputsPage() {

  return (
    <PagePasswordProtect pageName="Outputs">
      <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-7xl">
          <Link href="/view" className="mb-6 inline-block">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to View Menu
            </Button>
          </Link>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">View Outputs (Finished Goods Ledger)</CardTitle>
              <CardDescription>
                View the complete history of a product, including production (IN) and sales (OUT).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ViewOutputsClient />
            </CardContent>
          </Card>
        </div>
      </main>
    </PagePasswordProtect>
  )
}

    
