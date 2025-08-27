
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
  "/settings": "/",
};

export function EscapeHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  const handleExit = () => {
    // In a real desktop app, this would close the window.
    // Here, we can just show a message and disable the dialog.
    setIsExitDialogOpen(false);
    alert("Application would close now.");
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // If the exit dialog is open, handle Enter and Escape specifically
    if (isExitDialogOpen) {
      if (event.key === "Enter") {
        event.preventDefault();
        handleExit();
      }
      // The `onOpenChange` of the AlertDialog will handle closing on 'Escape'
      return;
    }

    if (event.key === "Escape") {
      // Check if any other dialogs/popovers are open. If so, let them handle the ESC press.
      const isOtherModalOpen = document.querySelector('[data-state="open"]');
      if (isOtherModalOpen) {
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
  }, [pathname, router, isExitDialogOpen]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

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
