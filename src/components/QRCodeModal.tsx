import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  title: string;
  description?: string;
}

export function QRCodeModal({ isOpen, onClose, value, title, description }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (qrRef.current) {
      const svg = qrRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-qr.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl flex flex-col items-center text-center border border-slate-100 dark:border-slate-800"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20">
              <QRCodeSVG value={value} size={40} fgColor="#0f172a" bgColor="transparent" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            {description && <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">{description}</p>}
            
            <div ref={qrRef} className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 mb-6 flex items-center justify-center shadow-inner">
              <QRCodeSVG 
                value={value} 
                size={200} 
                level="H"
                includeMargin={false}
              />
            </div>
            
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 break-all select-all px-4">
              {value}
            </p>
            
            <button
              onClick={handleDownload}
              className="mt-8 w-full py-3 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black rounded-xl hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-lg shadow-slate-900/20 uppercase tracking-widest text-xs"
            >
              Download QR Code
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
