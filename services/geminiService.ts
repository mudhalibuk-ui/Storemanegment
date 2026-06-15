
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { InventoryItem, Transaction, TransactionType } from "../types";

// Always initialize the client using the apiKey named parameter from process.env.API_KEY.
const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const controlTools: FunctionDeclaration[] = [
  {
    name: "createInventoryItem",
    description: "Abuur alaab cusub (New SKU) oo lagu darayo nidaamka Supabase Cloud.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Magaca alaabta" },
        sku: { type: Type.STRING, description: "SKU code-ka alaabta (waa inuu ahaado mid gaar ah)" },
        category: { type: Type.STRING, description: "Nooca alaabta (e.g. Energy, Hardware)" },
        quantity: { type: Type.NUMBER, description: "Tirada bilowga ah ee stock-ga" },
        branchId: { type: Type.STRING, description: "Aqoonsiga Branch-ga (e.g. b1, b2)" },
        minThreshold: { type: Type.NUMBER, description: "Tirada digniinta halista ah (default is 5)" }
      },
      required: ["name", "sku", "category", "quantity", "branchId"]
    }
  },
  {
    name: "adjustStock",
    description: "Kordhi ama ka bixi (Stock IN/OUT) alaab horey ugu jirtay database-ka.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sku: { type: Type.STRING, description: "SKU-ga saxda ah ee alaabta la badalayo" },
        quantity: { type: Type.NUMBER, description: "Tirada (Positive (+10) for IN, Negative (-10) for OUT)" },
        personnel: { type: Type.STRING, description: "Magaca qofka amarka bixinaya" },
        notes: { type: Type.STRING, description: "Sababta dhaqdhaqaaqa" }
      },
      required: ["sku", "quantity", "personnel"]
    }
  }
];

export const chatWithInventory = async (message: string, items: InventoryItem[], transactions: Transaction[]) => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';

  const context = `
    You are SmartStock AI, a master of inventory and database logistics.
    SYSTEM STATUS: Directly connected to Supabase Cloud.
    
    Current Inventory Overview:
    ${items.map(i => `- ${i.name} (SKU: ${i.sku}): ${i.quantity}pcs at Branch ${i.branchId}`).join('\n')}
    
    ACTIVE BRANCHES:
    - b1: Main Warehouse
    - b2: North Branch
    - b3: South Hub
    
    IMPORTANT RULES:
    1. If a user asks to add or remove items, ALWAYS use the 'adjustStock' tool.
    2. If a user asks to create a new product, ALWAYS use 'createInventoryItem'.
    3. Always respond in Somali with a professional and helpful tone.
    4. Confirm explicitly that data has been synced to the Cloud after a tool call.
  `;

  try {
    // Correctly call generateContent with model name and contents.
    const response = await ai.models.generateContent({
      model,
      contents: message,
      config: {
        systemInstruction: context,
        tools: [{ functionDeclarations: controlTools }]
      }
    });

    return response;
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};

export const getInventoryInsights = async (items: InventoryItem[], transactions: Transaction[]) => {
  const ai = getAI();
  const prompt = `Analyze current stock and transactions. Provide 3 high-impact business insights in Somali. Return as JSON array of strings. Data: ${JSON.stringify(items.slice(0,10))}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    // Access the extracted string output directly via the .text property.
    return JSON.parse(response.text || "[]");
  } catch (e) { 
    return ["Falanqaynta xogta hadda lama heli karo.", "Hubi in stock-gu uu yahay mid sax ah.", "Codso caawinaad AI haddii loo baahdo."]; 
  }
};

export const getSmartInsights = async (items: InventoryItem[], transactions: Transaction[], sales: Sale[], purchaseOrders: PurchaseOrder[]) => {
  const ai = getAI();
  const prompt = `
    Analyze this ERP data and provide 4 CRITICAL SMART SUGGESTIONS in Somali.
    Data Overview:
    - Items: ${JSON.stringify(items.slice(0, 15).map(i => ({ name: i.name, qty: i.quantity, expiry: i.expiryDate, lastSold: i.lastSoldDate })))}
    - Sales: ${JSON.stringify(sales.slice(0, 10).map(s => ({ total: s.total, date: s.timestamp })))}
    - POs: ${JSON.stringify(purchaseOrders.slice(0, 5).map(p => ({ total: p.total, status: p.status })))}
    
    Focus on:
    1. Demand Forecasting (What to order based on lastSold/Ramadan context).
    2. Expiry Risk (Which items need discounts fast).
    3. Auto-Transfer (Suggest moving stock if one branch is low/high).
    4. Cashflow Prediction (Projected cash for next 15 days).
    
    Return as a JSON array of objects: { title: string, description: string, type: 'FORECAST' | 'EXPIRY' | 'TRANSFER' | 'CASHFLOW', actionLabel: string }.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};