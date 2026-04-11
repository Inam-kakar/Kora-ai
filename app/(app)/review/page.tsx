"use client";

import { useState } from "react";
import { FileText, Loader2, Download, Printer, CheckCircle2, ChevronDown, Check } from "lucide-react";

interface DocumentSection {
  title: string;
  content: string;
  type: "narrative" | "stats" | "list";
}

interface ReviewPayload {
  title: string;
  generatedAt: string;
  sections: DocumentSection[];
  error?: string;
}

export default function ReviewPage() {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("Finance Report");
  const [documentType, setDocumentType] = useState("");
  const [useMemory, setUseMemory] = useState(true);

  const generateReview = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/agents/document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        year: new Date().getUTCFullYear(),
        category,
        documentType: documentType.trim() ? documentType.trim() : "Standard Review",
        useMemory
      }),
    });

    const payload: ReviewPayload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not generate document");
      return;
    }

    setReview(payload);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between items-start gap-4 mb-2">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                 Document Agent Online
              </span>
           </div>
           <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
             Financial Documents
           </h1>
           <p className="text-sm text-zinc-400">Generate structured PDFs, Legal, and narrative Annual Reviews powered by Gemini.</p>
        </div>
      </div>

      {!review && (
        <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-4">
             <FileText className="h-5 w-5 text-indigo-400" />
             <h2 className="text-lg font-bold text-white">Custom Document Generator</h2>
          </div>
          
          <div className="space-y-6 mb-8 max-w-xl">
             <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300">Document Category</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                   {["Legal", "Finance Report", "Kora Narrative"].map((c) => (
                      <button 
                         key={c}
                         onClick={() => setCategory(c)}
                         className={`py-3 px-4 rounded-md border text-sm font-medium transition-all ${
                            category === c 
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' 
                              : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                         }`}
                      >
                         {c}
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300">Specific Document Type</label>
                <input 
                   placeholder="e.g. Non-disclosure Agreement, Balance Sheet..."
                   value={documentType}
                   onChange={(e) => setDocumentType(e.target.value)}
                   className="w-full bg-black border border-zinc-800 rounded-md py-3 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
             </div>

             <div className="flex items-center gap-3">
                <button 
                   onClick={() => setUseMemory(!useMemory)}
                   className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                      useMemory ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-black border-zinc-700'
                   }`}
                >
                   {useMemory && <Check className="h-3 w-3" />}
                </button>
                <label className="text-sm font-medium text-zinc-300 cursor-pointer" onClick={() => setUseMemory(!useMemory)}>
                   Inject Database Memory History
                </label>
             </div>
          </div>

          <div className="pt-6 border-t border-zinc-800">
             <button 
                onClick={generateReview} 
                disabled={loading}
                className="flex items-center gap-2 rounded bg-white px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
             >
               {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Rendering Payload...</>
               ) : (
                  <>Generate Document</>
               )}
             </button>
             {error ? <p className="text-xs text-red-400 mt-4">{error}</p> : null}
          </div>
        </div>
      )}

      {review ? (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           
           <div className="flex items-center justify-between bg-[#0A0A0A] border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                 <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                 <div>
                    <h3 className="text-sm font-bold text-white">Generation Complete</h3>
                    <p className="text-xs font-mono text-zinc-500">Rendered at {new Date(review.generatedAt).toLocaleTimeString()} • {category}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => setReview(null)} className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-colors mr-4">
                    New File
                 </button>
                 <button className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-colors">
                    <Printer className="h-3 w-3" /> Print
                 </button>
                 <button className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-zinc-200 transition-colors">
                    <Download className="h-3 w-3" /> Export PDF
                 </button>
              </div>
           </div>

           <div className="rounded-sm border border-zinc-200 bg-white shadow-2xl p-8 sm:p-12 md:p-16 text-black min-h-[800px] mb-20 max-w-3xl mx-auto w-full">
             <div className="border-b-2 border-black pb-8 mb-10">
                <h1 className="text-4xl font-serif font-bold tracking-tight mb-4">{review.title}</h1>
                <p className="text-sm font-mono text-gray-500 uppercase tracking-widest">
                  {category} Document • {documentType || "Standard"}
                </p>
             </div>
             
             <div className="space-y-10">
               {review.sections.map((section) => (
                 <section key={`${section.title}-${section.type}`} className="space-y-3">
                   <h2 className="text-xl font-bold font-serif border-b border-gray-200 pb-2">{section.title}</h2>
                   <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap font-serif">
                     {section.content}
                   </p>
                 </section>
               ))}
             </div>
           </div>
        </div>
      ) : null}
    </div>
  );
}
