import { InventoryItem, Transaction, Sale, PurchaseOrder } from "../types";

export interface ChatResponse {
  text?: string;
  functionCalls?: Array<{
    name: string;
    args?: Record<string, any>;
    id?: string;
  }> | null;
}

export const chatWithInventory = async (
  message: string,
  items: InventoryItem[],
  transactions: Transaction[]
): Promise<ChatResponse | null> => {
  try {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, items, transactions }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Server AI Chat Error:', err);
      return {
        text: err?.text || 'Waan ka xumahay, cilad ayaa ka dhacday nidaamka AI.',
        functionCalls: null,
      };
    }

    const data = await res.json();
    return {
      text: data.text || undefined,
      functionCalls: data.functionCalls || null,
    };
  } catch (error) {
    console.error("AI Error:", error);
    return {
      text: "Waan ka xumahay, xiriirka server-ka AI lama heli karo hadda. Fadlan hubi internet-kaaga.",
      functionCalls: null,
    };
  }
};

export const getInventoryInsights = async (
  items: InventoryItem[],
  transactions: Transaction[]
): Promise<string[]> => {
  try {
    const res = await fetch('/api/gemini/inventory-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items, transactions }),
    });

    if (!res.ok) {
      throw new Error('Failed to fetch inventory insights');
    }

    const data = await res.json();
    return Array.isArray(data.insights) ? data.insights : [];
  } catch (e) {
    return [
      "Falanqaynta xogta hadda lama heli karo.",
      "Hubi in stock-gu uu yahay mid sax ah.",
      "Codso caawinaad AI haddii loo baahdo."
    ];
  }
};

export interface SmartSuggestion {
  title: string;
  description: string;
  type: 'FORECAST' | 'EXPIRY' | 'TRANSFER' | 'CASHFLOW';
  actionLabel: string;
}

export const getSmartInsights = async (
  items: InventoryItem[],
  transactions: Transaction[],
  sales: Sale[],
  purchaseOrders: PurchaseOrder[]
): Promise<SmartSuggestion[]> => {
  try {
    const res = await fetch('/api/gemini/smart-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items, transactions, sales, purchaseOrders }),
    });

    if (!res.ok) {
      throw new Error('Failed to fetch smart insights');
    }

    const data = await res.json();
    return Array.isArray(data.insights) ? data.insights : [];
  } catch (e) {
    console.error('Error fetching smart insights:', e);
    return [];
  }
};

export const generateReportSummary = async (
  transactions: any[],
  itemCount: number
): Promise<string> => {
  try {
    const res = await fetch('/api/gemini/report-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactions, itemCount }),
    });

    if (!res.ok) {
      throw new Error('Failed to generate report summary');
    }

    const data = await res.json();
    return data.summary || "Falanqaynta warbixinta lama helin.";
  } catch (e) {
    console.error('Error generating report summary:', e);
    return "Cilad ayaa ka dhacday abuurista warbixinta AI.";
  }
};

/**
 * Helper to stream text responses from server SSE endpoint
 */
export const streamGeminiPrompt = async (
  prompt: string,
  onChunk: (chunk: string) => void,
  systemInstruction?: string
): Promise<void> => {
  const res = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!res.ok || !res.body) {
    throw new Error('Stream request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') return;
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.text) {
          onChunk(parsed.text);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    }
  }
};

export interface PredictiveRestockItem {
  itemId: string;
  sku: string;
  itemName: string;
  category: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  minThreshold: number;
  dailyVelocity: number;
  weeklyVelocity: number;
  daysUntilStockout: number;
  seasonalDemandShiftPct: number;
  suggestedReorderQty: number;
  urgency: 'CRITICAL' | 'WARNING' | 'OPTIMAL' | 'OVERSTOCKED';
  confidenceScore: number;
  aiReasoning: string;
  recommendedAction: string;
  unitCost: number;
  estimatedCost: number;
  packType?: string;
}

export interface PredictiveRestockSummary {
  totalItemsAnalyzed: number;
  criticalCount: number;
  warningCount: number;
  optimalCount: number;
  overstockedCount: number;
  totalSuggestedUnits: number;
  totalEstimatedCost: number;
  activeSeasonName: string;
  seasonalTrendFactor: string;
  aiExecutiveSummary: string;
}

export interface PredictiveRestockResponse {
  summary: PredictiveRestockSummary;
  recommendations: PredictiveRestockItem[];
}

export const getPredictiveRestockingReport = async (params: {
  items: InventoryItem[];
  transactions: Transaction[];
  sales?: Sale[];
  branches?: any[];
  branchId?: string;
  seasonalPreset?: string;
}): Promise<PredictiveRestockResponse> => {
  try {
    const res = await fetch('/api/gemini/predictive-restock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch predictive restocking report:', error);
    // Client-side fallback if server fails
    const items = params.items || [];
    const recommendations: PredictiveRestockItem[] = items.map((i) => {
      const dailyVelocity = Math.max(0.2, (i.minThreshold || 5) / 10);
      const stock = Number(i.quantity || 0);
      const days = Math.round(stock / dailyVelocity);
      const suggested = Math.max(0, Math.ceil(dailyVelocity * 21 - stock));
      const urgency = (stock <= 0 || days <= 5) ? 'CRITICAL' : (days <= 14 ? 'WARNING' : 'OPTIMAL');

      return {
        itemId: i.id,
        sku: i.sku || 'N/A',
        itemName: i.name,
        category: i.category || 'General',
        branchId: i.branchId,
        branchName: `Branch ${i.branchId}`,
        currentStock: stock,
        minThreshold: i.minThreshold || 5,
        dailyVelocity: Number(dailyVelocity.toFixed(1)),
        weeklyVelocity: Number((dailyVelocity * 7).toFixed(1)),
        daysUntilStockout: days,
        seasonalDemandShiftPct: 15,
        suggestedReorderQty: suggested,
        urgency,
        confidenceScore: 85,
        aiReasoning: `Kaydku waa ${stock} pcs. Xawaaruhu waa ${dailyVelocity.toFixed(1)}/maalin. Dalbo ${suggested} pcs.`,
        recommendedAction: urgency === 'CRITICAL' ? 'Dalbo degdeg ah' : 'Dalab caadi ah',
        unitCost: Number(i.costPrice || i.landedCost || 10),
        estimatedCost: suggested * Number(i.costPrice || i.landedCost || 10),
        packType: i.packType || 'PCS',
      };
    });

    return {
      summary: {
        totalItemsAnalyzed: items.length,
        criticalCount: recommendations.filter(r => r.urgency === 'CRITICAL').length,
        warningCount: recommendations.filter(r => r.urgency === 'WARNING').length,
        optimalCount: recommendations.filter(r => r.urgency === 'OPTIMAL').length,
        overstockedCount: recommendations.filter(r => r.urgency === 'OVERSTOCKED').length,
        totalSuggestedUnits: recommendations.reduce((acc, r) => acc + r.suggestedReorderQty, 0),
        totalEstimatedCost: recommendations.reduce((acc, r) => acc + r.estimatedCost, 0),
        activeSeasonName: 'Standard Trading Season',
        seasonalTrendFactor: '+15% Demand Factor',
        aiExecutiveSummary: 'Falanqaynta xawaaraha iibka iyo heerka kaydka ayaa muujinaya alaabo u baahan dib-u-dalbasho degdeg ah si looga fogaado stockout.',
      },
      recommendations,
    };
  }
};