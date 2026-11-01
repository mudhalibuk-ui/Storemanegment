import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = 'gemini-3.8-flash';

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const controlTools: FunctionDeclaration[] = [
  {
    name: 'createInventoryItem',
    description: 'Abuur alaab cusub (New SKU) oo lagu darayo nidaamka Supabase Cloud.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Magaca alaabta' },
        sku: { type: Type.STRING, description: 'SKU code-ka alaabta (waa inuu ahaado mid gaar ah)' },
        category: { type: Type.STRING, description: 'Nooca alaabta (e.g. Energy, Hardware)' },
        quantity: { type: Type.NUMBER, description: 'Tirada bilowga ah ee stock-ga' },
        branchId: { type: Type.STRING, description: 'Aqoonsiga Branch-ga (e.g. b1, b2)' },
        minThreshold: { type: Type.NUMBER, description: 'Tirada digniinta halista ah (default is 5)' },
      },
      required: ['name', 'sku', 'category', 'quantity', 'branchId'],
    },
  },
  {
    name: 'adjustStock',
    description: 'Kordhi ama ka bixi (Stock IN/OUT) alaab horey ugu jirtay database-ka.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sku: { type: Type.STRING, description: 'SKU-ga saxda ah ee alaabta la badalayo' },
        quantity: { type: Type.NUMBER, description: 'Tirada (Positive (+10) for IN, Negative (-10) for OUT)' },
        personnel: { type: Type.STRING, description: 'Magaca qofka amarka bixinaya' },
        notes: { type: Type.STRING, description: 'Sababta dhaqdhaqaaqa' },
      },
      required: ['sku', 'quantity', 'personnel'],
    },
  },
];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API Routes for Gemini ---

  // Chat with inventory context and function calling
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { message, items = [], transactions = [] } = req.body;
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message string is required' });
        return;
      }

      const ai = getAI();
      const context = `
        You are SmartStock AI, a master of inventory and database logistics.
        SYSTEM STATUS: Directly connected to Supabase Cloud.
        
        Current Inventory Overview:
        ${(items || []).slice(0, 50).map((i: any) => `- ${i.name} (SKU: ${i.sku}): ${i.quantity}pcs at Branch ${i.branchId}`).join('\n')}
        
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

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: message,
        config: {
          systemInstruction: context,
          tools: [{ functionDeclarations: controlTools }],
        },
      });

      res.json({
        text: response.text || null,
        functionCalls: response.functionCalls || null,
      });
    } catch (error: any) {
      console.error('Gemini Chat Error:', error);
      res.status(500).json({
        error: error?.message || 'Failed to process AI chat message',
        text: 'Waan ka xumahay, cilad farsamo ayaa ka dhacday AI server-ka.',
        functionCalls: null,
      });
    }
  });

  // Short inventory insights
  app.post('/api/gemini/inventory-insights', async (req: Request, res: Response) => {
    try {
      const { items = [] } = req.body;
      const ai = getAI();
      const prompt = `Analyze current stock and transactions. Provide 3 high-impact business insights in Somali. Return as JSON array of strings. Data: ${JSON.stringify((items || []).slice(0, 10))}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '[]');
      res.json({ insights: Array.isArray(parsed) ? parsed : [] });
    } catch (error: any) {
      console.error('Inventory Insights Error:', error);
      res.json({
        insights: [
          'Falanqaynta xogta hadda lama heli karo.',
          'Hubi in stock-gu uu yahay mid sax ah.',
          'Codso caawinaad AI haddii loo baahdo.',
        ],
      });
    }
  });

  // ERP Smart Suggestions
  app.post('/api/gemini/smart-insights', async (req: Request, res: Response) => {
    try {
      const { items = [], sales = [], purchaseOrders = [] } = req.body;
      const ai = getAI();
      const prompt = `
        Analyze this ERP data and provide 4 CRITICAL SMART SUGGESTIONS in Somali.
        Data Overview:
        - Items: ${JSON.stringify((items || []).slice(0, 15).map((i: any) => ({ name: i.name, qty: i.quantity, expiry: i.expiryDate, lastSold: i.lastSoldDate })))}
        - Sales: ${JSON.stringify((sales || []).slice(0, 10).map((s: any) => ({ total: s.total, date: s.timestamp })))}
        - POs: ${JSON.stringify((purchaseOrders || []).slice(0, 5).map((p: any) => ({ total: p.total, status: p.status })))}
        
        Focus on:
        1. Demand Forecasting (What to order based on lastSold/Ramadan context).
        2. Expiry Risk (Which items need discounts fast).
        3. Auto-Transfer (Suggest moving stock if one branch is low/high).
        4. Cashflow Prediction (Projected cash for next 15 days).
        
        Return as a JSON array of objects: { title: string, description: string, type: 'FORECAST' | 'EXPIRY' | 'TRANSFER' | 'CASHFLOW', actionLabel: string }.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '[]');
      res.json({ insights: Array.isArray(parsed) ? parsed : [] });
    } catch (error: any) {
      console.error('Smart Insights Error:', error);
      res.json({ insights: [] });
    }
  });

  // Report Summary
  app.post('/api/gemini/report-summary', async (req: Request, res: Response) => {
    try {
      const { transactions = [], itemCount = 0 } = req.body;
      const ai = getAI();
      const prompt = `Summarize inventory transactions and performance in Somali. Total items: ${itemCount}, Transactions count: ${transactions.length}. Provide a 2-paragraph professional executive summary.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });

      res.json({ summary: response.text || 'Falanqaynta warbixinta lama helin.' });
    } catch (error: any) {
      console.error('Report Summary Error:', error);
      res.json({ summary: 'Cilad ayaa ka dhacday abuurista warbixinta AI.' });
    }
  });

  // Predictive Restocking Report with AI and Seasonal Analysis
  app.post('/api/gemini/predictive-restock', async (req: Request, res: Response) => {
    try {
      const {
        items = [],
        transactions = [],
        sales = [],
        branches = [],
        branchId = 'ALL',
        seasonalPreset = 'AUTOMATIC'
      } = req.body;

      // Map branch lookup
      const branchMap = new Map<string, string>();
      branches.forEach((b: any) => {
        if (b && b.id) branchMap.set(b.id, b.name);
      });

      // Filter items if specific branch selected
      const targetItems = branchId === 'ALL'
        ? items
        : items.filter((i: any) => i.branchId === branchId);

      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      // Seasonal factors definition
      let seasonName = 'Standard Seasonal Baseline';
      let globalSeasonalMultiplier = 1.0;

      if (seasonalPreset === 'RAMADAN_SURGE') {
        seasonName = 'Ramadan & Festive Peak (Surge Period)';
        globalSeasonalMultiplier = 1.35;
      } else if (seasonalPreset === 'DRY_SEASON_SURGE') {
        seasonName = 'Dry Season / Infrastructure & Building Peak';
        globalSeasonalMultiplier = 1.25;
      } else if (seasonalPreset === 'YEAR_END_PEAK') {
        seasonName = 'Year-End Commercial & Wholesale Peak';
        globalSeasonalMultiplier = 1.30;
      } else {
        // Automatic season detection based on current calendar month
        const currentMonth = new Date().getMonth(); // 0-11
        if (currentMonth >= 1 && currentMonth <= 3) {
          seasonName = 'Spring / Ramadan Preparatory Season';
          globalSeasonalMultiplier = 1.25;
        } else if (currentMonth >= 5 && currentMonth <= 7) {
          seasonName = 'Mid-Year Trade & Monsoon Logistics Season';
          globalSeasonalMultiplier = 1.15;
        } else if (currentMonth >= 10) {
          seasonName = 'Q4 Peak Commercial Season';
          globalSeasonalMultiplier = 1.30;
        } else {
          seasonName = 'Regular Trading Cycle';
          globalSeasonalMultiplier = 1.10;
        }
      }

      // Pre-compute statistical velocity per item
      const itemMetrics = targetItems.map((item: any) => {
        const itemId = item.id;
        const itemSku = (item.sku || '').toLowerCase();
        const itemName = (item.name || '').toLowerCase();

        // Count outbound transactions
        let qtyOut30Days = 0;
        let qtyOut7Days = 0;

        transactions.forEach((tx: any) => {
          if (tx.type === 'OUT' || tx.type === 'TRANSFER') {
            const matchesId = tx.itemId === itemId;
            const matchesName = tx.itemName && tx.itemName.toLowerCase() === itemName;
            if (matchesId || matchesName) {
              const txDate = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
              const age = now - txDate;
              if (age <= THIRTY_DAYS_MS) {
                qtyOut30Days += Number(tx.quantity || 0);
                if (age <= SEVEN_DAYS_MS) {
                  qtyOut7Days += Number(tx.quantity || 0);
                }
              }
            }
          }
        });

        // Count sales items
        sales.forEach((sale: any) => {
          if (Array.isArray(sale.items)) {
            sale.items.forEach((si: any) => {
              const matches = (si.itemId && si.itemId === itemId) ||
                              (si.sku && si.sku.toLowerCase() === itemSku) ||
                              (si.name && si.name.toLowerCase() === itemName);
              if (matches) {
                const sDate = sale.timestamp ? new Date(sale.timestamp).getTime() : 0;
                const age = now - sDate;
                if (age <= THIRTY_DAYS_MS) {
                  qtyOut30Days += Number(si.quantity || 0);
                  if (age <= SEVEN_DAYS_MS) {
                    qtyOut7Days += Number(si.quantity || 0);
                  }
                }
              }
            });
          }
        });

        // Apply realistic baseline if transaction history is limited
        let dailyVelocity = qtyOut30Days > 0 ? (qtyOut30Days / 30) : 0;
        if (dailyVelocity === 0) {
          // If no recorded transactions yet, derive a baseline from item properties
          const baselineFromThreshold = Math.max(0.2, (item.minThreshold || 5) / 14);
          dailyVelocity = Number(baselineFromThreshold.toFixed(2));
          qtyOut30Days = Math.round(dailyVelocity * 30);
          qtyOut7Days = Math.round(dailyVelocity * 7);
        }

        // Category specific seasonal weighting
        const cat = (item.category || '').toLowerCase();
        let itemSeasonalMultiplier = globalSeasonalMultiplier;
        if (cat.includes('food') || cat.includes('beverage') || cat.includes('cunto') || cat.includes('grocery')) {
          if (seasonalPreset === 'RAMADAN_SURGE') itemSeasonalMultiplier *= 1.25;
        } else if (cat.includes('hardware') || cat.includes('dhisid') || cat.includes('electric') || cat.includes('tool')) {
          if (seasonalPreset === 'DRY_SEASON_SURGE') itemSeasonalMultiplier *= 1.20;
        }

        const adjustedDailyVelocity = Number((dailyVelocity * itemSeasonalMultiplier).toFixed(2));
        const weeklyVelocity = Number((adjustedDailyVelocity * 7).toFixed(1));

        const currentStock = Number(item.quantity || 0);
        const minThreshold = Number(item.minThreshold || 5);
        const daysUntilStockout = adjustedDailyVelocity > 0
          ? Math.max(0, Math.round(currentStock / adjustedDailyVelocity))
          : 999;

        // Estimated lead time per branch (7 days standard, 10 days for remote hub)
        const leadTimeDays = 7;
        const safetyBufferDays = 14;
        const requiredBuffer = Math.ceil(adjustedDailyVelocity * (leadTimeDays + safetyBufferDays));
        const suggestedReorderQty = Math.max(0, requiredBuffer - currentStock);

        let urgency: 'CRITICAL' | 'WARNING' | 'OPTIMAL' | 'OVERSTOCKED' = 'OPTIMAL';
        if (currentStock <= 0 || daysUntilStockout <= 5 || currentStock <= minThreshold / 2) {
          urgency = 'CRITICAL';
        } else if (daysUntilStockout <= 14 || currentStock <= minThreshold) {
          urgency = 'WARNING';
        } else if (daysUntilStockout > 60 && currentStock > minThreshold * 4) {
          urgency = 'OVERSTOCKED';
        }

        const unitCost = Number(item.costPrice || item.landedCost || item.lastKnownPrice || (item.sellingPrice ? item.sellingPrice * 0.7 : 10));
        const estimatedCost = Math.round(suggestedReorderQty * unitCost);
        const shiftPct = Math.round((itemSeasonalMultiplier - 1.0) * 100);

        return {
          itemId: item.id,
          sku: item.sku || 'N/A',
          itemName: item.name || 'Unnamed Item',
          category: item.category || 'General',
          branchId: item.branchId || 'b1',
          branchName: branchMap.get(item.branchId) || `Branch ${item.branchId}`,
          currentStock,
          minThreshold,
          dailyVelocity: adjustedDailyVelocity,
          weeklyVelocity,
          daysUntilStockout,
          seasonalDemandShiftPct: shiftPct,
          suggestedReorderQty,
          urgency,
          confidenceScore: 88,
          aiReasoning: urgency === 'CRITICAL'
            ? `Kaydku aad buu u hooseeyaa (${currentStock} pcs). Xawaaraha iibku waa ${adjustedDailyVelocity}/maalin oo koror xilliyeed ah +${shiftPct}%. Stockout la filayo ${daysUntilStockout} maalmood gudahood.`
            : `Xawaaruhu waa deggan yahay (${adjustedDailyVelocity}/maalin). Dalbo ${suggestedReorderQty} pcs si loo helo kayd badbaado ah oo 21 maalmood ah.`,
          recommendedAction: urgency === 'CRITICAL'
            ? 'Abuur Purchase Order (PO) degdeg ah ama Inter-Branch Transfer'
            : (urgency === 'WARNING' ? 'Ku dar wareegga dalabka toddobaadlaha ah' : 'Kaydku waa ku filan yahay hadda'),
          unitCost,
          estimatedCost,
          packType: item.packType || 'PCS',
        };
      });

      // Sort with critical first, then warnings
      const rank: Record<string, number> = { CRITICAL: 0, WARNING: 1, OPTIMAL: 2, OVERSTOCKED: 3 };
      itemMetrics.sort((a: any, b: any) => {
        const rankA = rank[a.urgency as string] ?? 99;
        const rankB = rank[b.urgency as string] ?? 99;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return a.daysUntilStockout - b.daysUntilStockout;
      });

      // If GEMINI_API_KEY is available, enrich with Gemini intelligence
      let aiExecutiveSummary = `Falanqaynta Saadaasha Dib-u-Dhammaystirka Xarumaha (${seasonName}). Waxaa la falanqeeyay ${itemMetrics.length} nooc oo alaab ah.`;
      
      try {
        const ai = getAI();
        const topCandidates = itemMetrics.slice(0, 15).map((m: any) => ({
          sku: m.sku,
          name: m.itemName,
          branch: m.branchName,
          stock: m.currentStock,
          velocityPerDay: m.dailyVelocity,
          daysLeft: m.daysUntilStockout,
          suggestedQty: m.suggestedReorderQty,
          urgency: m.urgency,
        }));

        const prompt = `
You are an expert supply chain and inventory replenishment AI for an enterprise retail/wholesale ERP system.
Analyze this predictive restocking data for branches considering the active season: "${seasonName}".

Analyzed Items:
${JSON.stringify(topCandidates, null, 2)}

Provide a JSON response with this EXACT structure:
{
  "executiveSummary": "A concise 2-3 sentence strategic executive restocking advisory in Somali for branch and procurement managers, emphasizing high-risk stockout items, seasonal demand surges, and proactive supply order placement.",
  "itemNotes": [
    {
      "sku": "...",
      "confidenceScore": 92,
      "aiReasoning": "Specific concise justification in Somali considering velocity and seasonal trend",
      "recommendedAction": "Actionable step e.g. 'Dalbo 150 pcs degdeg ah' or 'Ka wareeji Main Warehouse'"
    }
  ]
}
`;

        const aiResponse = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        if (aiResponse.text) {
          const parsed = JSON.parse(aiResponse.text);
          if (parsed.executiveSummary) {
            aiExecutiveSummary = parsed.executiveSummary;
          }
          if (Array.isArray(parsed.itemNotes)) {
            const notesMap = new Map();
            parsed.itemNotes.forEach((n: any) => {
              if (n && n.sku) notesMap.set(n.sku, n);
            });

            itemMetrics.forEach((m: any) => {
              const note = notesMap.get(m.sku);
              if (note) {
                if (note.confidenceScore) m.confidenceScore = note.confidenceScore;
                if (note.aiReasoning) m.aiReasoning = note.aiReasoning;
                if (note.recommendedAction) m.recommendedAction = note.recommendedAction;
              }
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini enrichment optional failure; using algorithmic model:', geminiErr);
      }

      // Aggregate high-level summary KPIs
      const criticalCount = itemMetrics.filter((m: any) => m.urgency === 'CRITICAL').length;
      const warningCount = itemMetrics.filter((m: any) => m.urgency === 'WARNING').length;
      const optimalCount = itemMetrics.filter((m: any) => m.urgency === 'OPTIMAL').length;
      const overstockedCount = itemMetrics.filter((m: any) => m.urgency === 'OVERSTOCKED').length;
      const totalSuggestedUnits = itemMetrics.reduce((sum: number, m: any) => sum + m.suggestedReorderQty, 0);
      const totalEstimatedCost = itemMetrics.reduce((sum: number, m: any) => sum + m.estimatedCost, 0);

      res.json({
        summary: {
          totalItemsAnalyzed: itemMetrics.length,
          criticalCount,
          warningCount,
          optimalCount,
          overstockedCount,
          totalSuggestedUnits,
          totalEstimatedCost,
          activeSeasonName: seasonName,
          seasonalTrendFactor: `+${Math.round((globalSeasonalMultiplier - 1.0) * 100)}% Demand Factor`,
          aiExecutiveSummary,
        },
        recommendations: itemMetrics,
      });
    } catch (error: any) {
      console.error('Predictive Restock Server Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate predictive restocking report' });
    }
  });

  // Streaming text generation via Server-Sent Events (SSE)
  app.post('/api/gemini/stream', async (req: Request, res: Response) => {
    try {
      const { prompt, systemInstruction } = req.body;
      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const ai = getAI();
      const responseStream = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Stream Generation Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || 'Streaming failed' });
      } else {
        res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming failed' })}\n\n`);
        res.end();
      }
    }
  });

  // --- Vite Dev Server Middleware or Static Production Serving ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartStock Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
