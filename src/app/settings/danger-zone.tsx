
"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { clearUserData } from "@/lib/actions"
import { useRouter } from "next/navigation"

export function DangerZone() {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [isClearing, setIsClearing] = useState(false)

  const handleClearData = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      })
      return
    }

    setIsClearing(true)
    const result = await clearUserData(user.username)
    setIsClearing(false)

    if (result.success) {
      toast({
        title: "Success!",
        description: "Your transaction data has been cleared.",
      })
      // Optional: redirect to home page after clearing data
      router.push("/")
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="border-destructive shadow-lg">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          These actions are permanent and cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
          <div>
            <h4 className="font-semibold">Clear All Transaction Data</h4>
            <p className="text-sm text-muted-foreground">
              Deletes all vouchers, processes, outputs, and sales for your account.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isClearing}>
                {isClearing ? "Clearing..." : "Clear Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  of your inventory and transaction records. Your account will
                  not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, clear all data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

