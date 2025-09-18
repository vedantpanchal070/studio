
"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export function ViewPasswordSetting() {
  const { toast } = useToast()
  const { user, login, updateUserPreferences } = useAuth()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  if (!user) return null

  const isChecked = user.disableViewPassword || false

  const handleCheckedChange = async (checked: boolean) => {
    if (checked) {
      // If user is trying to DISABLE the password, show dialog to verify
      setIsDialogOpen(true)
    } else {
      // If user is trying to ENABLE the password, just do it
      const success = await updateUserPreferences({ disableViewPassword: false })
      if (success) {
        toast({ title: "Preference Saved", description: "Password check for view pages is now enabled." })
      } else {
        toast({ title: "Error", description: "Could not save preference.", variant: "destructive" })
      }
    }
  }

  const handleVerifyAndDisable = async () => {
    if (!user) return
    setIsLoading(true)
    setError("")

    const isPasswordCorrect = await login(user.username, password)

    if (isPasswordCorrect) {
      const success = await updateUserPreferences({ disableViewPassword: true })
      if (success) {
        toast({ title: "Preference Saved", description: "Password check for view pages has been disabled." })
        setIsDialogOpen(false)
        setPassword("")
      } else {
        setError("Failed to save the new setting. Please try again.")
      }
    } else {
      setError("Incorrect password. Please try again.")
    }
    setIsLoading(false)
  }

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">View Page Security</h3>
        <div className="flex items-center space-x-2 rounded-lg border p-4">
          <Switch
            id="view-password-toggle"
            checked={isChecked}
            onCheckedChange={handleCheckedChange}
          />
          <Label htmlFor="view-password-toggle" className="flex-1">
            Disable password check for view pages
            <p className="text-sm text-muted-foreground">
              If disabled, you won't be asked for your password to see voucher, process, or output ledgers.
            </p>
          </Label>
        </div>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              To disable this security feature, please enter your current password for verification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="verify-password">Password</Label>
            <Input
              id="verify-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPassword("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerifyAndDisable} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
