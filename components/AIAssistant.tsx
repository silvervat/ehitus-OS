
import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: 'Tere! Olen Rivest AI assistent. Kuidas saan aidata andmete analüüsimisel või dokumentide leidmisel?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
      if(!input.trim()) return;
      setMessages([...messages, { role: 'user', text: input }]);
      setInput('');
      
      // Simulate AI Response
      setTimeout(() => {
          setMessages(prev => [...prev, { 
              role: 'ai', 
              text: 'See on simulatsioon. Päris süsteemis ühendaksin ma Gemini API-ga, et analüüsida sinu andmebaasi, otsida faile või genereerida kokkuvõtteid.' 
          }]);
      }, 1000);
  };

  if (!isOpen) {
      return (
          <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform z-50"
          >
              <Bot size={28} />
          </button>
      );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 transition-all duration-300 ${isExpanded ? 'w-[600px] h-[80vh]' : 'w-[350px] h-[500px]'}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-teal-500 to-indigo-600 rounded-t-2xl text-white">
            <div className="flex items-center gap-2 font-bold">
                <Bot size={20} /> Rivest AI
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-white/20 rounded">
                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
                    <X size={16} />
                </button>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 rounded-b-2xl">
            <div className="relative flex items-center">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Küsi midagi..."
                    className="w-full pl-4 pr-10 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <button 
                    onClick={handleSend}
                    className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                >
                    <Send size={14} />
                </button>
            </div>
            <div className="mt-2 flex justify-center gap-2">
                <button className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles size={8} /> Analüüsi projekte
                </button>
                <button className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded-full">
                    Otsi dokumenti
                </button>
            </div>
        </div>
    </div>
  );
};
