"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Zap, ArrowRight, Mic, BrainCircuit, Activity, 
  ShieldCheck, Volume2, Users
} from "lucide-react";
import React from "react";

// Helper for slide-in animations
const slideVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function Home() {
  const agents = [
    { name: "Memory Agent", task: "Transcribes, structures, and tags every voice check-in", safe: "Fully" },
    { name: "Pattern Agent", task: "Runs behavioral analysis across months of entries", safe: "Fully" },
    { name: "Trigger Agent", task: "Monitors upcoming decisions matching past patterns, proactively alerts", safe: "Fully" },
    { name: "Research Agent", task: "Autonomously pulls public market data for mentioned decisions", safe: "Fully" },
    { name: "Document Agent", task: "Generates your annual 'Financial Life Review' narrative pdf", safe: "Fully" },
    { name: "Emotion Agent", task: "Analyzes vocal tone and word choice to detect financial stress", safe: "Fully" },
  ];

  return (
    <div className="relative bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      {/* PPTX Background Style */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_100%,transparent_100%)] opacity-20" />

      {/* Navigation Layer */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
         <div className="mx-auto flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-3">
               <div className="flex h-7 w-7 items-center justify-center rounded bg-white">
                  <Zap className="h-4 w-4 text-black" fill="currentColor" />
               </div>
               <span className="text-sm font-bold tracking-widest text-white uppercase">Kora</span>
            </div>
            <div className="flex items-center gap-6">
               <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Sign In</Link>
               <Link href="/dashboard" className="h-8 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
                  Dashboard
               </Link>
            </div>
         </div>
      </nav>

      <main className="relative z-10 w-full">
        
        {/* SLIDE 1: HERO */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 pt-20 border-b border-white/5">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideVariants} className="max-w-4xl">
             <div className="mb-8 flex justify-center">
                <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                   Slide 01 // Vision
                </div>
             </div>
             <h1 className="text-5xl font-extrabold tracking-tighter text-white sm:text-7xl lg:text-[6rem] leading-[1.05]">
                The only financial advisor that actually knows you.
             </h1>
             <p className="mt-8 text-2xl text-zinc-500 font-medium tracking-tight">
                Because it has listened to you for years.
             </p>
             <div className="mt-16 flex justify-center">
                <div className="animate-bounce h-10 w-10 flex items-center justify-center rounded-full border border-zinc-800">
                   ↓
                </div>
             </div>
          </motion.div>
        </section>

        {/* SLIDE 2: THE PROBLEM */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 border-b border-white/5">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideVariants} className="max-w-3xl text-center">
              <div className="mb-8 flex justify-center">
                <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                   Slide 02 // The Disconnect
                </div>
              </div>
              <h2 className="text-5xl font-bold tracking-tight text-white mb-10 leading-tight">Every financial tool treats you like a stranger.</h2>
              <p className="text-2xl text-zinc-400 leading-relaxed font-light mb-12">Your bank doesn't know you panic-sell when markets drop. Your app doesn't know you overspend after a stressful week. No software knows that three years ago you made the exact same mistake you're about to make right now.</p>
              <h3 className="text-5xl text-white font-extrabold tracking-tight">KORA does.</h3>
           </motion.div>
        </section>

        {/* SLIDE 3: THE EXPERIENCE */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 border-b border-white/5">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideVariants} className="w-full max-w-4xl">
              <div className="mb-8 flex justify-center">
                <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                   Slide 03 // The Intervention
                </div>
              </div>
              <div className="relative rounded-2xl border border-zinc-800 bg-[#050505] p-10 shadow-2xl">
                 <div className="absolute top-0 right-0 pt-5 pr-8 flex gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                 </div>
                 <p className="text-sm font-mono text-zinc-600 mb-10 border-b border-zinc-800 pb-4">Monday morning, voice check-in (3 mins)</p>
                 
                 <div className="space-y-8">
                    <div className="flex gap-6">
                       <div className="mt-1 h-10 w-10 flex-shrink-0 rounded-full bg-zinc-800 flex items-center justify-center"><Mic className="h-5 w-5 text-zinc-400"/></div>
                       <div className="text-zinc-300 text-xl leading-relaxed font-light max-w-2xl">
                          "Had a rough week. Bought some stuff I didn't need. Also thinking about finally investing in my friend's startup — he needs an answer by Friday."
                       </div>
                    </div>

                    <div className="flex gap-6 items-start pl-8 border-l-2 border-indigo-500/30 ml-5 py-4">
                       <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                          <Zap className="h-5 w-5 text-indigo-400"/>
                       </div>
                       <div>
                          <p className="text-indigo-200/90 text-xl leading-relaxed font-light max-w-2xl">
                            "I hear that. Before Friday, I want you to remember something. In April 2024, you told me almost exactly this — a close friend, a deadline, you felt guilty saying no. You lent €3,000. You told me 6 months later it damaged the friendship. Do you want me to pull up what you said back then?"
                          </p>
                       </div>
                    </div>

                    <div className="flex gap-6">
                       <div className="mt-1 h-10 w-10 flex-shrink-0 rounded-full bg-zinc-800 flex items-center justify-center"><Mic className="h-5 w-5 text-zinc-400"/></div>
                       <div className="text-zinc-300 text-xl leading-relaxed font-light">
                          "...yeah. Pull it up."
                       </div>
                    </div>
                 </div>
              </div>
              <p className="text-center text-zinc-500 mt-10 text-lg font-light tracking-wide">That moment — that is what no bank, no advisor, no app has ever done.</p>
           </motion.div>
        </section>

        {/* SLIDE 4: FEATURE 1 (VOICE) */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 border-b border-white/5">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideVariants} className="max-w-5xl w-full flex flex-col md:flex-row items-center gap-16">
              <div className="md:w-1/2">
                 <div className="mb-6">
                   <div className="inline-block rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                      Slide 04 // Step 1
                   </div>
                 </div>
                 <h2 className="text-5xl font-bold tracking-tight text-white mb-8">The Daily Voice<br/>Check-in.</h2>
                 <p className="text-xl text-zinc-400 leading-relaxed font-light">
                    You open the chatbot and just talk. No forms. No categories. No budget inputs. You say whatever is on your mind financially — worries, plans, purchases, feelings, decisions coming up. 
                 </p>
              </div>
              <div className="md:w-1/2 flex justify-center">
                 <div className="h-64 w-64 rounded-full border border-zinc-800 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border border-zinc-700 animate-ping opacity-20" />
                    <div className="absolute inset-4 rounded-full border border-zinc-600 animate-ping opacity-20" style={{ animationDelay: "0.5s" }} />
                    <Mic className="h-16 w-16 text-zinc-500" />
                 </div>
              </div>
           </motion.div>
        </section>

        {/* SLIDE 5: FEATURE 2 (THE CORE) */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 border-b border-white/5">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideVariants} className="max-w-5xl w-full">
              <div className="mb-12 flex justify-center">
                <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                   Slide 05 // Step 2
                </div>
              </div>
              <div className="text-center mb-16">
                 <h2 className="text-5xl font-bold tracking-tight text-white mb-6">The Agent Processes.</h2>
                 <p className="text-xl text-zinc-400 leading-relaxed font-light max-w-3xl mx-auto">This is where the agentic work happens — silently, continuously, autonomously.</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#050505]">
                  <table className="w-full text-left text-lg flex-col">
                     <thead className="bg-[#0A0A0A] border-b border-zinc-800 hidden md:table-header-group">
                        <tr>
                           <th className="px-8 py-5 font-bold text-white w-1/4">Agent</th>
                           <th className="px-8 py-5 font-bold text-white w-1/2">Task</th>
                           <th className="px-8 py-5 font-bold text-white w-1/4">Isolated?</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-800 font-light block md:table-row-group">
                        {agents.map((agent) => (
                           <tr key={agent.name} className="hover:bg-zinc-900/50 transition-colors block md:table-row">
                              <td className="px-8 py-6 text-white font-semibold flex items-center md:table-cell border-b border-zinc-800 md:border-0"><BrainCircuit className="h-4 w-4 mr-3 inline-block text-zinc-500 md:hidden"/>{agent.name}</td>
                              <td className="px-8 py-4 md:py-6 text-zinc-400 block md:table-cell">{agent.task}</td>
                              <td className="px-8 py-4 md:py-6 text-emerald-500 font-mono text-sm block md:table-cell pb-6">✅ {agent.safe} Safe</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
              </div>
              <p className="text-center text-sm text-zinc-600 mt-8 font-mono">Every single task is internal. Kora never touches your bank.</p>
           </motion.div>
        </section>

        {/* SLIDE 6: FEATURE 3 (PROACTIVE) */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 border-b border-white/5">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideVariants} className="max-w-5xl w-full flex flex-col md:flex-row-reverse items-center gap-16">
              <div className="md:w-1/2">
                 <div className="mb-6">
                   <div className="inline-block rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                      Slide 06 // Step 3
                   </div>
                 </div>
                 <h2 className="text-5xl font-bold tracking-tight text-white mb-8">Proactive<br/>Intervention.</h2>
                 <p className="text-xl text-zinc-400 leading-relaxed font-light">
                    When Kora detects you're approaching a decision that matches a past pattern, it reaches out first — before you make the mistake. With its ElevenLabs voice, it calls or messages you organically.
                 </p>
              </div>
              <div className="md:w-1/2 w-full">
                 <div className="border border-indigo-500/30 bg-indigo-500/5 p-8 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <Activity className="h-8 w-8 text-indigo-400 mb-6" />
                    <p className="text-2xl text-indigo-200/80 font-light leading-relaxed italic">
                       "Hey, I noticed you mentioned a €5,000 purchase you're considering. The last three times you made a large purchase after a stressful month, you told me you regretted it within 60 days. Want to talk about it before you decide?"
                    </p>
                 </div>
              </div>
           </motion.div>
        </section>

        {/* SLIDE 7: ELEVENLABS */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 border-b border-white/5">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideVariants} className="max-w-5xl w-full">
              <div className="mb-12 flex justify-center">
                <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                   Slide 07 // The Medium
                </div>
              </div>
              <div className="text-center mb-16">
                 <Volume2 className="h-12 w-12 text-zinc-300 mb-8 mx-auto" />
                 <h2 className="text-5xl font-bold tracking-tight text-white mb-6">The Soul of KORA.</h2>
                 <p className="text-2xl text-zinc-400 leading-relaxed font-light max-w-3xl mx-auto border-b border-zinc-800 pb-12">ElevenLabs isn't a feature. It's what makes Kora feel like a relationship, not a tool.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-[#050505] p-10 rounded-xl border border-zinc-800">
                    <h3 className="text-2xl text-white font-bold mb-4">Emotional Tone Adaptation</h3>
                    <p className="text-lg text-zinc-400 leading-relaxed font-light">When you're stressed, Kora's voice becomes softer. When you're excited and about to be impulsive, it becomes slower and more grounded. ElevenLabs' emotional controls make this real.</p>
                 </div>
                 <div className="bg-[#050505] p-10 rounded-xl border border-zinc-800">
                    <h3 className="text-2xl text-white font-bold mb-4">Memory Audio Playback</h3>
                    <p className="text-lg text-zinc-400 leading-relaxed font-light">Kora can literally play back your own voice from a past check-in: <span className="italic text-zinc-300">"Here's what you said 14 months ago in a similar moment..."</span> — then respond in its own voice with the contrast.</p>
                 </div>
              </div>
           </motion.div>
        </section>

        {/* SLIDE 8: PRICING & FOOTER CTA */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 pt-20 pb-20">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideVariants} className="max-w-6xl w-full">
              <div className="mb-12 flex justify-center">
                <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-mono text-zinc-400">
                   Slide 08 // Access
                </div>
              </div>
              <h2 className="text-5xl font-bold tracking-tight text-white mb-16 text-center">Business Model</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
                 <div className="border border-zinc-800 bg-[#050505] p-10 rounded-2xl flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-3">Free</h3>
                    <div className="text-4xl font-black text-white mb-10">$0</div>
                    <ul className="text-lg text-zinc-400 space-y-4 flex-grow font-light">
                       <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-zinc-600"/> 30-day memory</li>
                       <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-zinc-600"/> Basic weekly pattern</li>
                    </ul>
                 </div>
                 <div className="border-2 border-white bg-white text-black p-10 rounded-2xl flex flex-col relative transform md:scale-105 z-10 shadow-[0_0_50px_rgba(255,255,255,0.15)]">
                    <div className="absolute top-0 right-0 bg-black text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-bl-xl rounded-tr-xl">Most Irreplaceable</div>
                    <h3 className="text-2xl font-bold mb-3">KORA Pro</h3>
                    <div className="text-4xl font-black mb-10">$18<span className="text-lg font-medium text-zinc-500">/mo</span></div>
                    <ul className="text-lg text-zinc-800 space-y-4 flex-grow font-medium">
                       <li className="flex items-center gap-3"><Zap className="h-5 w-5 text-black"/> Unlimited memory depth</li>
                       <li className="flex items-center gap-3"><Zap className="h-5 w-5 text-black"/> Proactive voice triggers</li>
                       <li className="flex items-center gap-3"><Zap className="h-5 w-5 text-black"/> PDF Financial Reviews</li>
                    </ul>
                    <Link href="/dashboard" className="w-full mt-10 bg-black text-white rounded-lg py-4 text-center text-lg font-bold hover:bg-zinc-800 transition-colors">Launch Pro</Link>
                 </div>
                 <div className="border border-zinc-800 bg-[#050505] p-10 rounded-2xl flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-3">KORA Family</h3>
                    <div className="text-4xl font-black text-white mb-10">$30<span className="text-lg font-medium text-zinc-500">/mo</span></div>
                    <ul className="text-lg text-zinc-400 space-y-4 flex-grow font-light">
                       <li className="flex items-center gap-3"><Users className="h-5 w-5 text-zinc-600"/> Shared behavior patterns</li>
                       <li className="flex items-center gap-3"><Users className="h-5 w-5 text-zinc-600"/> Relationship patterns</li>
                    </ul>
                 </div>
              </div>

              {/* FOOTER CTA */}
              <div className="text-center pt-16 border-t border-zinc-800">
                 <h2 className="text-4xl font-bold tracking-tight text-white md:text-6xl leading-tight mb-8">
                    Year 1 KORA is good.<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-600">Year 3 KORA is priceless.</span>
                 </h2>
                 <p className="text-xl text-zinc-500 mb-16 font-light">No competitor can ever recreate three years of your financial memory.</p>
                 
                 <div className="flex items-center justify-center gap-2">
                     <Zap className="h-5 w-5 text-zinc-600" fill="currentColor" />
                     <span className="text-sm font-bold tracking-widest text-zinc-600 uppercase">Kora Agent © 2026</span>
                 </div>
              </div>
           </motion.div>
        </section>

      </main>
    </div>
  );
}
