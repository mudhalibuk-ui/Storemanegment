
import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';

interface BiometricScanModalProps {
  employees: Employee[];
  hardwareUrl?: string;
  zkConfig?: { ip?: string; port?: number };
  onMatch: (employee: Employee) => void;
  onCancel: () => void;
  title?: string;
}

const BiometricScanModal: React.FC<BiometricScanModalProps> = ({ 
  employees, hardwareUrl, zkConfig, onMatch, onCancel, title = "ZKTeco Identification" 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Sugaya Scanner-ka...");
  const pollInterval = useRef<number | null>(null);

  useEffect(() => {
    if (hardwareUrl && zkConfig?.ip) {
      checkDeviceStatus();
    }
    return () => stopPolling();
  }, [hardwareUrl, zkConfig]);

  const checkDeviceStatus = async () => {
    try {
      const response = await fetch(`${hardwareUrl}/zk/status?ip=${zkConfig?.ip}&port=${zkConfig?.port || 4370}`);
      const data = await response.json();
      if (data.connected) {
        setStatusText("Qalabka waa diyaar (Connected) ✅");
      } else {
        setHardwareError("Qalabka laguma heli karo IP-gaas. Fadlan hubi Ethernet-ka.");
      }
    } catch (err) {
      setHardwareError("Ma awoodin inaan la xiriiro Bridge-ka PC-ga.");
    }
  };

  const startPolling = () => {
    setIsScanning(true);
    setHardwareError(null);
    setStatusText("Fadlan saar suulka qalabka...");

    // Clear any existing poll
    if (pollInterval.current) clearInterval(pollInterval.current);

    pollInterval.current = window.setInterval(async () => {
      if (!hardwareUrl) return;
      try {
        const response = await fetch(`${hardwareUrl}/zk/last-scan?ip=${zkConfig?.ip}`);
        if (!response.ok) return;
        
        const data = await response.json();
        // ZKTeco returns UserID or Fingerprint Index
        if (data.userId) {
          stopPolling();
          const found = employees.find(e => e.employeeIdCode === data.userId || e.fingerprintHash === data.userId);
          
          if (found) {
            setMatchedEmployee(found);
            setScanComplete(true);
            setTimeout(() => onMatch(found), 1500);
          } else {
            setScanComplete(true);
            setMatchedEmployee(null);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1000); // Check every second
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    setIsScanning(false);
  };

  const startManualScan = () => {
    if (hardwareUrl && zkConfig?.ip) {
      startPolling();
    } else {
      // Simulation for demo
      setIsScanning(true);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * employees.length);
        const found = employees[randomIndex];
        setMatchedEmployee(found);
        setIsScanning(false);
        setScanComplete(true);
        setTimeout(() => { if (found) onMatch(found); }, 1500);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[50000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{title}</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              {zkConfig?.ip ? `ZKTeco U280 @ ${zkConfig.ip}` : "Simulation Mode"}
            </p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white flex items-center justify-center text-slate-400">✕</button>
        </div>

        <div className="p-10 flex flex-col items-center">
          <div className="relative mb-10 group">
            <div className={`w-40 h-40 rounded-[2.5rem] border-4 flex items-center justify-center text-6xl transition-all duration-500 ${
              isScanning ? 'border-indigo-500 bg-indigo-50 shadow-[0_0_30px_rgba(79,70,229,0.2)]' : 
              scanComplete ? 'border-emerald-500 bg-emerald-50' : 
              hardwareError ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-slate-50'
            }`}>
              <span>{hardwareError ? '⚠️' : '☝️'}</span>
              {isScanning && (
                <div className="absolute inset-0 overflow-hidden rounded-[2.2rem]">
                  <div className="w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,1)] absolute top-0 left-0 animate-[scan_2s_linear_infinite]"></div>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes scan {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
          `}</style>

          <div className="text-center mb-6">
            <p className={`font-black text-[10px] uppercase tracking-widest ${hardwareError ? 'text-rose-600' : 'text-indigo-600'}`}>
              {hardwareError || statusText}
            </p>
          </div>

          {!isScanning && !scanComplete && (
            <button 
              onClick={startManualScan}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              DAAR SCANNER-KA ⚡
            </button>
          )}

          {scanComplete && matchedEmployee && (
            <div className="text-center animate-in fade-in zoom-in duration-500 w-full">
              <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 flex flex-col items-center">
                <img src={matchedEmployee.avatar} className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg mb-4" alt="" />
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{matchedEmployee.name}</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Waa la Aqoonsaday ✅</p>
              </div>
            </div>
          )}
          
          {scanComplete && !matchedEmployee && (
            <div className="text-center space-y-4 w-full">
              <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100">
                <span className="text-3xl">⚠️</span>
                <p className="text-sm font-black text-rose-600 mt-2 uppercase">Lama Helin!</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Suulkan kuma jiro diiwaanka</p>
              </div>
              <button onClick={() => { setScanComplete(false); }} className="text-[10px] font-black text-indigo-600 uppercase underline">Isku day mar kale</button>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center">
           <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Jooji / Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default BiometricScanModal;
