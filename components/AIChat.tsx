
import React, { useState, useRef, useEffect } from 'react';
import { chatWithInventory } from '../services/geminiService';
import { InventoryItem, Transaction, TransactionType, TransactionStatus, CreateInventoryItemArgs, AdjustStockArgs } from '../types';
import { API } from '../services/api';
import Markdown from 'react-markdown';

interface AIChatProps {
  items: InventoryItem[];
  transactions: Transaction[];
  onDataChange: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ items, transactions, onDataChange }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string | undefined}[]>([
    { role: 'ai', text: 'Asc! Waxaan ahay SmartStock AI. Sideen kuu caawin karaa? Waxaad i dhihi kartaa: "Ku dar 10 Solar Panels ah" ama "Abuur SKU cusub oo ah GEN-500".' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const response = await chatWithInventory(userMsg, items, transactions);
    
    if (response && response.functionCalls) {
      for (const fc of response.functionCalls) {
        try {
          if (fc.name === 'createInventoryItem') {
            if (!fc.args) {
              setMessages(prev => [...prev, { role: 'ai', text: `❌ CILAD: Waxaa ka maqan doodaha 'createInventoryItem'.` }]);
              return;
            }
            const args = fc.args as unknown as CreateInventoryItemArgs;
            const newItem = await API.items.save(args);
            setMessages(prev => [...prev, { role: 'ai', text: `✨ SI GUUL LEH: Waxaan database-ka Supabase ku daray alaabta cusub: **${newItem.name}** (SKU: ${newItem.sku}).` }]);
          } 
          else if (fc.name === 'adjustStock') {
            if (!fc.args) {
              setMessages(prev => [...prev, { role: 'ai', text: `❌ CILAD: Waxaa ka maqan doodaha 'adjustStock'.` }]);
              return;
            }
            const args = fc.args as unknown as AdjustStockArgs;
            const item = items.find(i => i.sku === args.sku);
            if (item) {
              const qty = args.quantity;
              const type = qty > 0 ? TransactionType.IN : TransactionType.OUT;
              
              await API.transactions.create({
                itemId: item.id,
                itemName: item.name,
                type: type,
                quantity: Math.abs(qty),
                branchId: item.branchId,
                personnel: args.personnel,
                notes: args.notes || "AI Assisted Action",
                status: TransactionStatus.APPROVED,
                requestedBy: 'AI-ASSISTANT'
              });

              const newQty = item.quantity + qty;
              await API.items.save({ ...item, quantity: newQty });
              
              setMessages(prev => [...prev, { role: 'ai', text: `✅ XOGTA WAA LA CUSBOONAYSIYEY: ${item.name} hadda waa **${newQty}pcs**. Isbedelka: (${qty > 0 ? '+' : ''}${qty}). Supabase Cloud waa laga helayaa.` }]);
            } else {
              setMessages(prev => [...prev, { role: 'ai', text: `❌ Waan ka xumahay, ma helin alaab leh SKU-gaas: ${args.sku}.` }]);
            }
          }
          onDataChange();
        } catch (err) {
          setMessages(prev => [...prev, { role: 'ai', text: `❌ CILAD: Ma awoodin inaan database-ka wax ku daro. Fadlan hubi connection-kaaga.` }]);
        }
      }
    } else if (response && response.text) {
      setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
    } else {
      setMessages(prev => [...prev, { role: 'ai', text: "Waan ka xumahay, hadda ma garan karo amarkaas. Isku day inaad si cad u sharaxdo." }]);
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-[75vh] flex flex-col bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl animate-pulse">✨</div>
          <div>
            <h2 className="text-xl font-black tracking-tight">AI Cloud Controller</h2>
            <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Live Sync to Supabase</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-slate-50/50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-[2rem] shadow-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
            }`}>
              <div className="text-sm font-medium leading-relaxed">
                <Markdown>{m.text}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-5 rounded-[2rem] rounded-tl-none border border-slate-100 flex gap-2 items-center">
               <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
               <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-100"></div>
               <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex gap-4 items-center bg-slate-50 p-2 rounded-[2.5rem] border-2 border-slate-100 focus-within:border-indigo-500 transition-all">
           <input 
             className="flex-1 bg-transparent border-none outline-none px-6 py-3 font-bold text-slate-700"
             placeholder="Ku dar 5 xabbo oo Solar Panels ah..."
             value={input}
             onChange={e => setInput(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleSend()}
           />
           <button 
             onClick={handleSend}
             className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
           >
             🚀
           </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
