
import React, { useRef } from 'react';
import { Sale, SaleItem, User, Branch, SystemSettings, PurchaseOrder, POItem } from '../types';

interface DocumentViewerProps {
  type: 'INVOICE' | 'QUOTATION' | 'SALES_ORDER' | 'PURCHASE_ORDER';
  data: Partial<Sale> | Partial<PurchaseOrder>;
  settings: SystemSettings;
  branch?: Branch;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ type, data, settings, branch, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${type} - ${data.id || 'Draft'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { padding: 0; margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="bg-white p-8">
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const title = type === 'INVOICE' ? 'TAX INVOICE' : type === 'QUOTATION' ? 'QUOTATION' : type === 'SALES_ORDER' ? 'SALES ORDER' : 'PURCHASE ORDER';
  const accentColor = type === 'INVOICE' ? 'indigo' : type === 'QUOTATION' ? 'emerald' : type === 'SALES_ORDER' ? 'amber' : 'slate';

  const items = ((data as any).items || []).map((item: any) => ({
    name: item.name,
    sku: item.sku || item.itemId || '',
    quantity: item.quantity || item.purchasedQty || 0,
    unitPrice: item.unitPrice || item.actualPrice || 0,
    total: item.total || (item.purchasedQty * item.actualPrice) || 0
  }));
  const subtotal = (data as any).subtotal || (data as any).total || 0;
  const vatAmount = (data as any).vatAmount || 0;
  const total = (data as any).total || 0;
  const customerName = (data as any).customerName || (data as any).vendorName || 'Walk-in Customer';
  const date = (data as any).timestamp || (data as any).date || new Date().toISOString();
  const paymentMethod = (data as any).paymentMethod || 'N/A';
  const customerLabel = type === 'PURCHASE_ORDER' ? 'Vendor' : 'Bill To';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20 flex flex-col">
        {/* Header / Controls */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-4">
            <button 
              onClick={handlePrint}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
            >
              <span>🖨️</span> Print Document
            </button>
            <button 
              className="bg-white text-slate-800 border border-slate-200 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <span>📄</span> Download PDF
            </button>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-12 no-scrollbar bg-white" ref={printRef}>
          <div className="max-w-3xl mx-auto">
            {/* Top Header */}
            <div className="flex justify-between items-start mb-12">
              <div className="flex gap-6 items-center">
                {settings.companyLogo ? (
                  <img src={settings.companyLogo} alt="Logo" className="w-24 h-24 object-contain rounded-2xl" />
                ) : (
                  <div className={`w-24 h-24 bg-${accentColor}-100 text-${accentColor}-600 rounded-2xl flex items-center justify-center text-4xl font-black`}>
                    {settings.systemName.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className={`text-4xl font-black text-slate-900 mb-1 tracking-tighter`}>{settings.systemName}</h1>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-widest space-y-0.5">
                    <p>{branch?.name || 'Main Branch'}</p>
                    {settings.companyAddress && <p>{settings.companyAddress}</p>}
                    {settings.companyPhone && <p>Tel: {settings.companyPhone}</p>}
                    {settings.companyEmail && <p>Email: {settings.companyEmail}</p>}
                    {settings.companyWebsite && <p>{settings.companyWebsite}</p>}
                    {settings.companyTaxId && <p>Tax ID: {settings.companyTaxId}</p>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h2 className={`text-5xl font-black text-${accentColor}-600 tracking-tight uppercase mb-4`}>{title}</h2>
                <div className="space-y-1">
                  <div className="flex justify-end gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document #</span>
                    <span className="text-sm font-black text-slate-800">{data.id || 'DRAFT'}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                    <span className="text-sm font-black text-slate-800">{new Date(date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To / Info */}
            <div className="grid grid-cols-2 gap-12 mb-12 pb-12 border-b border-slate-100">
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{customerLabel}</h3>
                <p className="text-lg font-black text-slate-900 uppercase">{customerName}</p>
                <p className="text-sm font-bold text-slate-500 mt-1">{type === 'PURCHASE_ORDER' ? 'Vendor ID' : 'Customer ID'}: {(data as any).customerId || (data as any).vendorId || 'N/A'}</p>
              </div>
              <div className="text-right">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Payment Info</h3>
                <p className="text-sm font-black text-slate-800 uppercase">{paymentMethod}</p>
                <p className="text-sm font-bold text-slate-500 mt-1">Status: {type === 'QUOTATION' ? 'PENDING' : (type === 'PURCHASE_ORDER' ? (data as any).status : 'PAID')}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                  <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</th>
                  <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-4">
                      <p className="font-black text-slate-800 uppercase text-sm">{item.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</p>
                    </td>
                    <td className="py-4 text-center font-bold text-slate-700">{item.quantity}</td>
                    <td className="py-4 text-right font-bold text-slate-700">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-4 text-right font-black text-slate-900">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals & Footer Info */}
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bank Details</h4>
                  <div className="text-[10px] font-bold text-slate-600 space-y-1">
                    <p>Bank: {settings.systemName} Finance</p>
                    <p>Account Name: {settings.systemName} General</p>
                    <p>Account Number: 1234567890 (Placeholder)</p>
                    <p>SWIFT/IBAN: ERP-SOM-01</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Terms & Conditions</h4>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    1. Payment is due within 30 days unless otherwise specified.<br/>
                    2. Goods once sold are not returnable after 7 days.<br/>
                    3. This is a system generated document and does not require a physical signature.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-slate-500 uppercase">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {vatAmount > 0 && (
                    <div className="flex justify-between text-sm font-bold text-slate-500 uppercase">
                      <span>VAT (15%)</span>
                      <span>${vatAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between text-xl font-black text-white bg-${accentColor}-600 p-4 rounded-2xl uppercase tracking-tighter`}>
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-24 pt-12 border-t border-slate-100 text-center">
              <div className="flex justify-between items-end mb-8">
                <div className="text-left">
                  <div className="w-32 h-32 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
                    <span className="text-[10px] font-black text-slate-300 uppercase">QR CODE</span>
                  </div>
                </div>
                <div className="flex gap-12">
                  <div className="w-40 border-t border-slate-900 pt-2">
                    <p className="text-[8px] font-black text-slate-900 uppercase">Authorized Signature</p>
                  </div>
                  <div className="w-40 border-t border-slate-900 pt-2">
                    <p className="text-[8px] font-black text-slate-900 uppercase">Customer Signature</p>
                  </div>
                </div>
              </div>
              <p className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Thank you for your business!</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">This is a system generated {type.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
