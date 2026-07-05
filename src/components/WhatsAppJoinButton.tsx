'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MessageCircle, QrCode, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const WA_LINK = 'https://chat.whatsapp.com/EJja3rgqH6N3tYFBZ20fBD?mode=gi_t';

export function WhatsAppJoinButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Banner */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-2xl p-5 transition-all duration-150 active:scale-[0.99] text-left group"
      >
        <div className="w-11 h-11 rounded-xl bg-[#25D366] flex items-center justify-center shadow-sm shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-900 leading-tight">Bergabung di Grup WhatsApp</p>
          <p className="text-sm text-stone-500 mt-0.5">Ikuti diskusi dan update keluarga secara langsung</p>
        </div>
        <QrCode className="w-5 h-5 text-[#25D366] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center shadow">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <DialogTitle className="text-lg">Grup WhatsApp Keluarga</DialogTitle>
            <DialogDescription className="text-sm text-stone-500">
              Scan QR code dengan kamera HP, atau ketuk tombol di bawah untuk langsung bergabung.
            </DialogDescription>
          </DialogHeader>

          {/* QR Code */}
          <div className="flex justify-center my-2">
            <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm p-3 bg-white">
              <Image
                src="/qr_code.jpeg"
                alt="QR Code Grup WhatsApp"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Direct link button */}
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl py-3 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Buka di WhatsApp
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
