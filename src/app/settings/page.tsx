
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
import { ChangePasswordForm } from "./change-password-form"
import { PasswordProtect } from "@/components/password-protect"

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Settings</CardTitle>
            <CardDescription>
              Manage application settings. Change your password here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordProtect>
              <ChangePasswordForm />
            </PasswordProtect>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
