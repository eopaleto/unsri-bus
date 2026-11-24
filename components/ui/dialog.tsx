"use client";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Dialog({
  title,
  description,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  return (
    <Primitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Primitive.Portal>
        <Primitive.Overlay className="dialog-overlay" />
        <Primitive.Content
          className={`dialog-content ${wide ? "dialog-wide" : ""} ${className}`}
        >
          <div className="dialog-heading">
            <div>
              <Primitive.Title>{title}</Primitive.Title>
              <Primitive.Description>
                {description || "UNSRI Bus · Transportasi kampus"}
              </Primitive.Description>
            </div>
            <Primitive.Close className="icon-button" aria-label="Tutup dialog">
              <X size={20} />
            </Primitive.Close>
          </div>
          <div className="dialog-body">{children}</div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
