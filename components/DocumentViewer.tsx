
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
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header / Controls */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
            >
              <span>🖨️</span> Print
            </button>
            <button 
              className="bg-white text-slate-700 border border-slate-300 px-5 py-2 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <span>📄</span> Download PDF
            </button>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">✕</button>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-10 no-scrollbar bg-white" ref={printRef}>
          <div className="max-w-4xl mx-auto font-sans text-slate-800">
            {/* Top Header */}
            <div className="flex justify-between items-start mb-10">
              <div className="flex flex-col gap-2">
                {settings.companyLogo ? (
                  <img src={settings.companyLogo} alt="Logo" className="w-32 h-auto object-contain mb-2" />
                ) : (
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{settings.systemName}</h1>
                )}
                <div className="text-sm text-slate-600 space-y-0.5">
                  <p className="font-semibold">{branch?.name || 'Main Branch'}</p>
                  {settings.companyAddress && <p>{settings.companyAddress}</p>}
                  {settings.companyPhone && <p>{settings.companyPhone}</p>}
                  {settings.companyEmail && <p>{settings.companyEmail}</p>}
                  {settings.companyWebsite && <p>{settings.companyWebsite}</p>}
                  {settings.companyTaxId && <p>Tax ID: {settings.companyTaxId}</p>}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-normal text-slate-400 uppercase tracking-widest mb-6">{title}</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="text-slate-500 font-medium text-right">Date</div>
                  <div className="text-slate-900 text-right">{new Date(date).toLocaleDateString()}</div>
                  
                  <div className="text-slate-500 font-medium text-right">{type === 'INVOICE' ? 'Invoice #' : 'Document #'}</div>
                  <div className="text-slate-900 text-right">{data.id || 'DRAFT'}</div>
                  
                  {type === 'INVOICE' && (
                    <>
                      <div className="text-slate-500 font-medium text-right">Due Date</div>
                      <div className="text-slate-900 text-right">{new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To / Info */}
            <div className="mb-10">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg inline-block min-w-[300px]">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{customerLabel}</h3>
                <p className="text-base font-bold text-slate-900">{customerName}</p>
                <p className="text-sm text-slate-600 mt-1">ID: {(data as any).customerId || (data as any).vendorId || 'N/A'}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8 border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-sm">
                  <th className="text-left py-3 px-4 font-semibold border border-slate-800">Item</th>
                  <th className="text-left py-3 px-4 font-semibold border border-slate-800">Description</th>
                  <th className="text-right py-3 px-4 font-semibold border border-slate-800 w-24">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold border border-slate-800 w-32">Rate</th>
                  <th className="text-right py-3 px-4 font-semibold border border-slate-800 w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-900 align-top border-x border-slate-200">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 align-top border-r border-slate-200">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right align-top border-r border-slate-200">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right align-top border-r border-slate-200">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right align-top border-r border-slate-200">
                      ${item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals & Footer Info */}
            <div className="flex justify-between items-start pt-4">
              <div className="w-1/2 pr-8 space-y-6">
                {type === 'INVOICE' && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Payment Details</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Payment Method: <span className="font-medium text-slate-900">{paymentMethod}</span></p>
                      <p>Bank: {settings.systemName} Finance</p>
                      <p>Account Name: {settings.systemName} General</p>
                      <p>Account Number: 1234567890</p>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Notes / Terms</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Thank you for your business.<br/>
                    Payment is due within 30 days.
                  </p>
                </div>
              </div>
              
              <div className="w-1/3">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex justify-between py-3 px-4 border-b border-slate-200 bg-slate-50 text-sm">
                    <span className="text-slate-600 font-medium">Subtotal</span>
                    <span className="text-slate-900 font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  {vatAmount > 0 && (
                    <div className="flex justify-between py-3 px-4 border-b border-slate-200 bg-slate-50 text-sm">
                      <span className="text-slate-600 font-medium">Tax (15%)</span>
                      <span className="text-slate-900 font-medium">${vatAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-4 px-4 bg-slate-100 text-lg">
                    <span className="text-slate-900 font-bold">Total</span>
                    <span className="text-slate-900 font-bold">${total.toFixed(2)}</span>
                  </div>
                  {type === 'INVOICE' && (
                    <div className="flex justify-between py-4 px-4 bg-slate-800 text-white text-lg">
                      <span className="font-bold">Balance Due</span>
                      <span className="font-bold">${total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
              <p>This is a computer-generated document. No signature is required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
