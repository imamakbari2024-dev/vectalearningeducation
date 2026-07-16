import { useEffect, useState, useRef } from 'react';
import {
  Bot,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAppStore } from '../store/appStore';
import { supabase, type Material } from '../lib/supabase';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// System prompt Socratic — PERSIS seperti yang diminta
const SYSTEM_INSTRUCTION = `Kamu adalah Vecta AI, tutor pendidikan dengan metode Socratic. ATURAN MUTLAK: 1. Kamu HANYA boleh menjawab berdasarkan teks materi yang diberikan di dalam konteks ini. 2. JANGAN PERNAH memberikan jawaban akhir atau kunci jawaban secara langsung. 3. Bantulah siswa berpikir kritis dengan menganalisis pertanyaan mereka, lalu berikan petunjuk (hint) atau pertanyaan panganan (scaffolding) agar mereka menemukan jawabannya sendiri. 4. Jika siswa bertanya tentang topik di luar materi (misal game, politik), TOLAK dengan sopan dan katakan: 'Maaf, Vecta AI hanya diprogram untuk mendiskusikan materi pelajaran saat ini. Mari kembali ke topik belajar kita.'`;

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Halo! Saya Vecta AI, tutor pendidikan dengan metode Socratic. Saya akan membantu kamu berpikir kritis dan menemukan jawaban sendiri berdasarkan materi pelajaran. Silakan ajukan pertanyaan tentang materi yang sedang kamu pelajari!',
  timestamp: Date.now(),
};

export default function VectaAIPage() {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load materials untuk RAG context
  useEffect(() => {
    if (!activeClass) {
      setLoadingMaterials(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('materials')
        .select('*')
        .eq('class_id', activeClass.id)
        .order('order_index');
      const mats = (data ?? []) as Material[];
      setMaterials(mats);
      // Auto-pilih materi pertama yang punya text_content
      const withText = mats.find((m) => m.text_content);
      if (withText) setSelectedMaterialId(withText.id);
      setLoadingMaterials(false);
    })();
  }, [activeClass]);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingIndicator]);

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
  const ragContext = selectedMaterial?.text_content ?? null;

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userText = input.trim();
    setInput('');
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setTypingIndicator(true);

    try {
      // Inisialisasi Gemini
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
      if (!apiKey) {
        throw new Error('Kunci API Gemini belum dikonfigurasi. Hubungi administrator.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      // RAG injection — masukkan teks materi ke konteks prompt
      const contextPrefix = ragContext
        ? `=== KONTEKS MATERI PELAJARAN ===\n${ragContext}\n=== AKHIR KONTEKS ===\n\n`
        : '';

      const fullPrompt = `${contextPrefix}Pertanyaan siswa: ${userText}`;

      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();

      const modelMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: responseText || 'Maaf, saya tidak dapat memberikan respons saat ini.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.';
      setError(`Gagal menghubungi Vecta AI: ${errMsg}`);
    } finally {
      setSending(false);
      setTypingIndicator(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  };

  if (!activeClass) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-warning-300 bg-warning-50 p-12 text-center dark:border-warning-700 dark:bg-warning-900/10">
        <AlertCircle className="mb-3 h-10 w-10 text-warning-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Silakan pilih kelas terlebih dahulu
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vecta AI memerlukan kelas aktif untuk mengambil konteks materi (RAG)
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 shadow-lg shadow-primary-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vecta AI</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tutor Socratic berbasis materi kelas
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="btn-ghost text-sm">
          <RefreshCw className="h-4 w-4" />
          Reset
        </button>
      </div>

      {/* RAG context selector */}
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 shrink-0 text-gray-400" />
        <select
          value={selectedMaterialId}
          onChange={(e) => setSelectedMaterialId(e.target.value)}
          className="input-field max-w-xs text-sm"
          disabled={loadingMaterials}
        >
          <option value="">— Tanpa konteks materi —</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} {m.text_content ? '✓' : '(tanpa teks RAG)'}
            </option>
          ))}
        </select>
        {ragContext && (
          <span className="flex items-center gap-1 rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-900/30 dark:text-success-400">
            <Sparkles className="h-3 w-3" />
            RAG Aktif
          </span>
        )}
      </div>

      {/* Chat messages */}
      <div className="card flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'user'
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className="text-xs font-bold">
                      {profile?.full_name?.[0]?.toUpperCase() ?? 'S'}
                    </span>
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <span
                    className={`mt-1 block text-[10px] ${
                      msg.role === 'user' ? 'text-primary-200' : 'text-gray-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typingIndicator && (
            <div className="flex justify-start">
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/20 dark:text-error-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pertanyaan tentang materi..."
          rows={1}
          className="input-field max-h-32 resize-none"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="btn-primary shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-center text-xs text-gray-400">
        Vecta AI menggunakan metode Socratic — kamu akan dibimbing menemukan jawaban sendiri
      </p>
    </div>
  );
}
