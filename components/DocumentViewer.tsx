
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
    category: item.category || 'General',
    quantity: item.quantity || item.purchasedQty || 0,
    unitPrice: item.unitPrice || item.actualPrice || 0,
    total: item.total || (item.purchasedQty * item.actualPrice) || 0
  }));

  // Group items by category
  const groupedItems = items.reduce((acc: any, item: any) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const subtotal = (data as any).subtotal || (data as any).total || 0;
  const vatAmount = (data as any).vatAmount || 0;
  const total = (data as any).total || 0;
  const applyVat = (data as any).applyVat || (data as any).isVatSale || false;
  const customerName = (data as any).customerName || (data as any).vendorName || 'Walk-in Customer';
  const customerAddress = (data as any).customerAddress || 'N/A';
  const customerPhone = (data as any).customerPhone || 'N/A';
  const customerEmail = (data as any).customerEmail || 'N/A';
  const date = (data as any).timestamp || (data as any).date || new Date().toISOString();
  const paymentMethod = (data as any).paymentMethod || 'N/A';
  const customerLabel = type === 'PURCHASE_ORDER' ? 'Vendor' : 'BILL TO';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header / Controls */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 no-print">
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
        <div className="flex-1 overflow-y-auto p-0 no-scrollbar bg-white" ref={printRef}>
          <div className="mx-auto font-sans text-slate-800 bg-white min-h-full flex flex-col">
            {/* Top Dark Header */}
            <div className="bg-[#0a192f] p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#00a8e8] flex items-center justify-center rounded-lg">
                  <span className="text-2xl">🏗️</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-[#00a8e8] uppercase">CONSTRUCTION</h1>
              </div>
              <div className="text-sm font-medium opacity-80">
                {settings.companyWebsite || 'www.constructioncompany.com'}
              </div>
            </div>

            <div className="p-12 flex-1">
              {/* Company Info & Invoice Title */}
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-3xl font-bold text-[#00a8e8] mb-4">&lt;{settings.systemName}&gt;</h2>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>{settings.companyAddress || '<100 Street Address, City, State, Zip>'}</p>
                    <p>{settings.companyWebsite || '<Website, Email Address>'}</p>
                    <p>{settings.companyPhone || '<Phone Number>'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-5xl font-black text-slate-900 mb-2">INVOICE</h3>
                  <div className="flex justify-end">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-200 pt-1">
                      CREATED BY <span className="text-slate-900">TemplateLAB</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To / Location / Invoice Details */}
              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{customerLabel}</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p className="font-bold text-slate-900">&lt;{customerName}&gt;</p>
                    <p>&lt;{customerAddress}&gt;</p>
                    <p>&lt;{customerPhone}, {customerEmail}&gt;</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">LOCATION</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p className="font-bold text-slate-900">&lt;{branch?.name || 'Main Branch'}&gt;</p>
                    <p>&lt;{branch?.location || 'Address'}&gt;</p>
                    <p>&lt;{settings.companyPhone}&gt;</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-[#00a8e8] font-bold text-right">Invoice No:</div>
                    <div className="text-slate-900 text-right">{data.id ? data.id.slice(-8).toUpperCase() : 'PREVIEW'}</div>
                    
                    <div className="text-[#00a8e8] font-bold text-right">Invoice Date:</div>
                    <div className="text-slate-900 text-right">{new Date(date).toLocaleDateString()}</div>
                    
                    <div className="text-[#00a8e8] font-bold text-right">Due Date:</div>
                    <div className="text-slate-900 text-right">{new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-12 border-collapse">
                <thead>
                  <tr className="bg-[#1a2b3c] text-white text-xs uppercase tracking-widest">
                    <th className="text-left py-3 px-4 font-black border border-[#1a2b3c]">DESCRIPTION</th>
                    <th className="text-center py-3 px-4 font-black border border-[#1a2b3c] w-24">QTY</th>
                    <th className="text-center py-3 px-4 font-black border border-[#1a2b3c] w-32">UNIT PRICE</th>
                    <th className="text-right py-3 px-4 font-black border border-[#1a2b3c] w-32">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedItems).map((cat) => (
                    <React.Fragment key={cat}>
                      <tr className="bg-[#00a8e8] text-white">
                        <td colSpan={4} className="py-2 px-4 font-bold text-sm uppercase">{cat}</td>
                      </tr>
                      {groupedItems[cat].map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="py-3 px-6 text-sm text-slate-700 align-top border-x border-slate-200">
                            {item.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700 text-center align-top border-r border-slate-200">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700 text-center align-top border-r border-slate-200">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 text-right font-bold align-top border-r border-slate-200">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {/* Empty rows to maintain layout if needed */}
                  {[...Array(Math.max(0, 5 - items.length))].map((_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-slate-200 h-10">
                      <td className="border-x border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Footer Info */}
              <div className="flex justify-between items-end pt-4">
                <div className="w-1/2">
                  <h4 className="text-xl font-bold text-[#00a8e8] mb-12">Thank you for your business!</h4>
                  <div className="space-y-2">
                    <h5 className="text-xs font-black text-[#00a8e8] uppercase tracking-widest">Terms & Instructions</h5>
                    <div className="text-[10px] text-slate-500 space-y-1">
                      <p>&lt;Add payment instructions here, e.g: bank, paypal...&gt;</p>
                      <p>&lt;Add terms here, e.g: warranty, returns policy...&gt;</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-1/3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                      <span className="text-slate-900">SUBTOTAL</span>
                      <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                      <span className="text-slate-900">DISCOUNT</span>
                      <span className="text-slate-900">$0.00</span>
                    </div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                      <span className="text-slate-900">SUBTOTAL LESS DISCOUNT</span>
                      <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                      <span className="text-slate-900">TAX RATE</span>
                      <span className="text-slate-900">{applyVat ? '15%' : '0%'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                      <span className="text-slate-900">TOTAL TAX</span>
                      <span className="text-slate-900">${vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#00a8e8] p-4 mt-4">
                      <span className="text-lg font-black text-slate-900 uppercase">Balance Due</span>
                      <span className="text-2xl font-black text-slate-900">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-[#0a192f] p-4 text-center text-[10px] text-white/50 uppercase tracking-widest mt-auto">
              © {settings.companyWebsite || 'TemplateLab.com'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
