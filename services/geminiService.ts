import { GoogleGenAI } from "@google/genai";
import { ProjectData, AIAnalysisResult } from "../types";

// Initializing Gemini Client
// Note: API key should be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProjectData = async (data: ProjectData[], query: string): Promise<string> => {
  try {
    // We limit the data sent to the model to prevent token overflow for this demo
    // In a real app with millions of rows, we would send aggregated stats or use RAG.
    const contextData = data.slice(0, 50).map(p => ({
        Project: p.name,
        Status: p.status,
        Manager: p.manager,
        Efficiency: Math.round((p.hoursUsed / p.hoursTotal) * 100) + '%'
    }));

    const prompt = `
      Oled Rivest ehitusettevõtte tehisintellekti assistent.
      Siin on andmed praeguste projektide kohta (JSON formaadis):
      ${JSON.stringify(contextData)}

      Kasutaja küsimus: "${query}"

      Palun vasta lühidalt, professionaalselt ja eesti keeles. Too välja kriitilised punktid.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
          temperature: 0.3,
      }
    });

    return response.text || "Vabandust, ma ei suutnud andmeid analüüsida.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Viga andmete töötlemisel. Palun kontrolli API võtit.";
  }
};

export const generateInspectionReport = async (formData: any): Promise<string> => {
    try {
        const prompt = `
         Oled sõidukite tehniline ekspert. Koosta lühike kokkuvõte sõiduki seisukorrast järgmiste andmete põhjal:
         ${JSON.stringify(formData)}
         
         Kui on vigu (status != OK), too need eraldi välja. Vasta eesti keeles.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "Raportit ei saanud luua.";
    } catch (e) {
        return "Viga raporti genereerimisel.";
    }
}

// New function for file/image analysis
export const analyzeImageContent = async (imageUrl: string): Promise<AIAnalysisResult> => {
    try {
        // In a real scenario, we would fetch the image bytes and send them to Gemini.
        // For this demo, we will ask Gemini to imagine or simulate the analysis based on typical construction site context
        // OR if it's a real URL, we pass it if the model supports it (depends on access).
        // Here we use a text prompt to simulate the robust response structure.
        
        const prompt = `
            Analüüsi seda pilti ehituskontekstis (simulatsioon).
            Genereeri JSON vastus järgmise struktuuriga:
            {
                "tags": ["silt1", "silt2", "silt3"],
                "description": "Lühike kirjeldus eesti keeles (max 1 lause)",
                "detectedObjects": ["objekt1", "objekt2"]
            }
            
            Kui pildi URL viitab ehitusele, kasuta ehitustermineid (betoon, kraana, kiiver, projekt).
            Kui URL on teadmata, genereeri üldine ehitusplatsi analüüs.
        `;

        // Use 2.5 Flash for speed
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        
        return JSON.parse(text) as AIAnalysisResult;
    } catch (error) {
        console.error("AI Analysis Failed:", error);
        return {
            tags: ['analüüs_ebaõnnestus'],
            description: "Ei suutnud faili analüüsida.",
            detectedObjects: []
        };
    }
}