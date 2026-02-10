
import React, { useEffect, useRef, useState } from 'react';

interface ScannerModalProps {
  onScan: (code: string) => void;
  onCancel: () => void;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ onScan, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Ma suuragalin in la furo Camera-da. Fadlan iska hubi fasaxa (Permissions).");
      }
    }
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const simulateScan = () => {
    // In a real app, you'd use a library like quagga or zxing to decode the video frame.
    // Here we simulate detecting a code.
    onScan("GEN-001");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[30000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative border border-white/10">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Scanner-ka Alaabta</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Akhrinta Barcode ama QR Code</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white text-slate-400">✕</button>
        </div>

        <div className="p-4 relative">
          <div className="aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden relative border-4 border-indigo-500/30">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-rose-400">
                <span className="text-4xl mb-4">🚫</span>
                <p className="font-bold text-sm">{error}</p>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover grayscale opacity-50"
                />
                {/* Scanner Overlay UI */}
                <div className="absolute inset-0 border-[40px] border-slate-900/60 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-indigo-500 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.3)] animate-pulse">
                   <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                   <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                   <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                   <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,1)] animate-bounce"></div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
          <button 
            onClick={simulateScan}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
          >
            Hubi Alaabta (Simulate Scan)
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest"
          >
            Jooji Scanner-ka
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;
