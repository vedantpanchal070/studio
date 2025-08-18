
"use client"

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Screen hierarchy for back navigation
const parentRoutes: { [key: string]: string } = {
  "/create/voucher": "/create",
  "/create/process": "/create",
  "/create/output": "/create",
  "/view/vouchers": "/view",
  "/view/processes": "/view",
  "/view/outputs": "/view",
  "/view/inventory": "/",
  "/create": "/",
  "/view": "/",
};

export function EscapeHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Check if any dialogs/popovers are open. If so, let them handle the ESC press.
      const isModalOpen = document.querySelector('[data-state="open"]');
      if (isModalOpen) {
        return;
      }
      
      event.preventDefault();

      const parentRoute = parentRoutes[pathname];
      if (parentRoute) {
        router.push(parentRoute);
      } else if (pathname === "/") {
        setIsExitDialogOpen(true);
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
  
  const handleExit = () => {
    // In a real desktop app, this would close the window.
    // Here, we can just show a message and disable the dialog.
    setIsExitDialogOpen(false);
    alert("Application would close now.");
  };

  return (
    <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit Application?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to exit the application?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction onClick={handleExit}>Yes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
