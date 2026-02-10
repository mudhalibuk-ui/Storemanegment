
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { InventoryItem, Transaction, TransactionType } from "../types";

// Always initialize the client using the apiKey named parameter from process.env.API_KEY.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const generateReportSummary = async (filteredTransactions: Transaction[], totalItems: number) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a professional management summary in Somali for these transactions: ${JSON.stringify(filteredTransactions.slice(0,15))}`
    });
    // Access the extracted string output directly via the .text property.
    return response.text;
  } catch (e) { return "Cilad ayaa dhacday soo saarista warbixinta."; }
};