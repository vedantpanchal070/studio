
"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PagePasswordProtectProps {
  children: React.ReactNode;
  pageName: string;
}

export function PagePasswordProtect({ children, pageName }: PagePasswordProtectProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  if (!user) {
    // Should be handled by main auth guard, but as a fallback
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifying(true);
    setError("");
    // We use the existing login function to verify the password.
    // The first argument is the username, which we get from the current user session.
    const success = await login(user.username, password);
    setIsVerifying(false);

    if (success) {
      setIsVerified(true);
      toast({ title: "Access Granted", description: `You can now view ${pageName}.` });
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Render children in the background so the layout doesn't shift, but hide them visually */}
      <div className="invisible h-0 overflow-hidden">{children}</div>

      <AlertDialog open={!isVerified}>
        <AlertDialogContent onEscapeKeyDown={handleCancel}>
          <AlertDialogHeader>
            <AlertDialogTitle>Password Required</AlertDialogTitle>
            <AlertDialogDescription>
              To protect your data, please enter your password to view the {pageName} page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleVerify}>
            <div className="space-y-2">
              <Label htmlFor="page-password">Password</Label>
              <Input
                id="page-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </form>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleVerify} disabled={isVerifying}>
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
