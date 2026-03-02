import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus,
  Trash2,
  Calendar, 
  MapPin, 
  Users, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  ChevronRight,
  Image as ImageIcon,
  Type,
  Mail,
  Clock,
  Layout,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Content, RSVP, ScheduleItem } from './types';

export default function App() {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [rsvpForm, setRsvpForm] = useState({ name: '', sector: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [allRsvps, setAllRsvps] = useState<RSVP[]>([]);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);

  // Check if we should show the envelope (only for public view, first time)
  useEffect(() => {
    const hasOpened = sessionStorage.getItem('envelope_opened');
    if (hasOpened) setIsEnvelopeOpen(true);
  }, []);

  const handleOpenEnvelope = () => {
    setIsEnvelopeOpen(true);
    sessionStorage.setItem('envelope_opened', 'true');
  };

  const themes = {
    gold: { main: '#D4AF37', dark: '#996515', rgb: '212, 175, 55' },
    silver: { main: '#C0C0C0', dark: '#808080', rgb: '192, 192, 192' },
    emerald: { main: '#047857', dark: '#065F46', rgb: '4, 120, 87' }
  };

  const fontFamilies = [
    'Cormorant Garamond',
    'Montserrat',
    'Playfair Display',
    'Inter',
    'Cinzel'
  ];

  useEffect(() => {
    if (content) {
      setEditingContent(content);
      // Update CSS variables for dynamic theme
      const root = document.documentElement;
      const theme = themes[content.theme_color as keyof typeof themes] || themes.gold;
      root.style.setProperty('--theme-color', theme.main);
      root.style.setProperty('--theme-color-dark', theme.dark);
      root.style.setProperty('--theme-color-rgb', theme.rgb);
      root.style.setProperty('--bg-color', content.bg_color || '#0A0A0A');
      root.style.setProperty('--text-color', content.text_color || '#FFFFF0');
      root.style.setProperty('--card-bg-color', content.card_bg_color || '#1A1A1A');
      root.style.setProperty('--font-family-main', content.font_family || 'Cormorant Garamond');
    }
  }, [content]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setError(null);
      const res = await fetch('/api/content');
      if (!res.ok) {
        if (res.status === 500) {
          throw new Error('ERRO 500 (V2): Verifique as variáveis SUPABASE_URL e SUPABASE_ANON_KEY na Vercel. Se já configurou, faça um REDEPLOY.');
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      
      if (!data || Object.keys(data).length === 0) {
        throw new Error('No content found in database');
      }
      
      setContent(data);
      setEditingContent(data);
    } catch (err: any) {
      console.error('Failed to fetch content:', err);
      setError(err.message || 'Falha ao carregar os detalhes do evento');
      setTimeout(fetchContent, 5000); // Retry
    }
  };

  const fetchRsvps = async () => {
    const res = await fetch('/api/rsvps');
    const data = await res.json();
    setAllRsvps(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email === 'samantha@proanalysis.com' && loginForm.password === 'proanalysis') {
      setIsLoggedIn(true);
      fetchRsvps();
    } else {
      alert('Credenciais inválidas');
    }
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rsvps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvpForm),
      });
      if (res.ok) {
        setIsSending(true);
        // Wait for the closing animation sequence to complete
        setTimeout(() => {
          setIsSubmitted(true);
          setIsSending(false);
          setIsSubmitting(false);
          setRsvpForm({ name: '', sector: '' });
        }, 4500); // Increased to allow full animation sequence + pause
      } else {
        setIsSubmitting(false);
        alert('Ocorreu um erro ao enviar sua confirmação. Por favor, tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert('Erro de conexão. Verifique sua internet.');
    }
  };

  const handleUpdateContent = async (key: keyof Content, value: string) => {
    await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    fetchContent();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(212, 175, 55); // Gold color
    doc.text('Lista de Presença - ' + (content?.event_title || 'Evento'), 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    
    // Add table
    const tableData = allRsvps.map(rsvp => [
      rsvp.name,
      rsvp.sector,
      new Date(rsvp.created_at).toLocaleDateString('pt-BR')
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [['Nome', 'Setor', 'Data']],
      body: tableData,
      headStyles: { fillColor: [212, 175, 55], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 35 },
    });
    
    doc.save(`lista_presenca_${new Date().getTime()}.pdf`);
  };

  const handleImageUpload = async (key: keyof Content, file: File) => {
    setIsUploading(key);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.url) {
        await handleUpdateContent(key, data.url);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(`Erro no upload: ${err.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  if (error && !content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rich-black text-gold p-8 text-center">
        <h1 className="font-serif text-3xl mb-4 italic">Desculpe, algo deu errado.</h1>
        <p className="opacity-60 mb-8 max-w-md">{error}</p>
        <button onClick={() => fetchContent()} className="gold-button">Tentar Novamente</button>
      </div>
    );
  }

  if (!content) return <div className="min-h-screen flex items-center justify-center bg-rich-black text-gold font-serif text-2xl italic animate-pulse">Carregando Elegância...</div>;

  return (
    <div className="min-h-screen selection:bg-gold selection:text-rich-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center bg-transparent">
        <button 
          onClick={() => setIsAdmin(true)}
          className="font-serif text-xl md:text-2xl tracking-[0.3em] gold-text uppercase truncate max-w-[60%] hover:opacity-80 transition-opacity"
        >
          {content.logo_image ? (
            <img src={content.logo_image} alt="Logo" className="h-8 md:h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          ) : (
            'Prestígio'
          )}
        </button>
        <div className="flex gap-4 md:gap-8 items-center">
          {isLoggedIn && (
            <button 
              onClick={() => setIsAdmin(true)}
              className="text-[10px] md:text-xs uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity flex items-center gap-2"
            >
              <Settings size={14} /> <span className="hidden sm:inline">Painel</span>
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {!isEnvelopeOpen && !isAdmin && content ? (
          <motion.div
            key="envelope-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-rich-black flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg aspect-[4/3] group cursor-pointer" onClick={handleOpenEnvelope}>
              {/* Envelope Body */}
              <div className="absolute inset-0 bg-[#1a1a1a] shadow-2xl border border-white/5 rounded-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                
                {/* Envelope Flap (Static back part) */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#222] clip-path-envelope-flap" />
                
                {/* Content inside (peek) */}
                <div className="absolute inset-x-8 top-12 bottom-8 bg-white/5 flex flex-col items-center justify-center text-center p-6 border border-white/10">
                  <div className="w-12 h-12 mb-4 opacity-20">
                    {content.logo_image ? (
                      <img src={content.logo_image} alt="Logo" className="w-full h-full object-contain grayscale" referrerPolicy="no-referrer" />
                    ) : (
                      <Mail className="w-full h-full" />
                    )}
                  </div>
                  <p className="font-serif italic text-xl gold-text opacity-40">Você foi convidado</p>
                </div>
              </div>

              {/* Animated Flap (Front) */}
              <motion.div 
                className="absolute top-0 left-0 right-0 h-1/2 bg-[#1a1a1a] origin-top z-20 shadow-xl border-x border-t border-white/10"
                style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                whileHover={{ rotateX: -10 }}
                transition={{ type: "spring", stiffness: 100 }}
              />

              {/* Wax Seal */}
              <motion.div 
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-16 h-16 md:w-20 md:h-20"
                whileHover={{ scale: 1.1 }}
              >
                <div className="w-full h-full bg-gold rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center border-4 border-dark-gold/30 relative">
                  <div className="absolute inset-1 rounded-full border border-white/20" />
                  <span className="font-serif text-2xl md:text-3xl text-rich-black font-bold">P</span>
                </div>
              </motion.div>

              <div className="absolute -bottom-16 left-0 right-0 text-center">
                <p className="text-[10px] uppercase tracking-[0.4em] gold-text animate-pulse">Toque para abrir</p>
              </div>
            </div>
          </motion.div>
        ) : isAdmin && !isLoggedIn ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="w-full max-w-md p-12 luxury-border luxury-gradient">
              <h2 className="font-serif text-3xl mb-8 text-center gold-text italic">Acesso Restrito</h2>
                  <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60">Email</label>
                  <input 
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                    className="w-full bg-white/5 border border-gold/40 rounded-xl px-4 py-3 focus:border-gold outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60">Senha</label>
                  <input 
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    className="w-full bg-white/5 border border-gold/40 rounded-xl px-4 py-3 focus:border-gold outline-none transition-all"
                  />
                </div>
                <button type="submit" className="w-full gold-button">Entrar</button>
                <button 
                  type="button" 
                  onClick={() => setIsAdmin(false)}
                  className="w-full text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 mt-4"
                >
                  Voltar ao Convite
                </button>
              </form>
            </div>
          </motion.div>
        ) : isAdmin && isLoggedIn ? (
          <motion.div 
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-32 pb-20 px-8 max-w-7xl mx-auto"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/10 pb-8 gap-6">
              <div>
                <h1 className="font-serif text-4xl md:text-5xl gold-text italic">Painel de Gestão</h1>
                <p className="text-xs md:text-sm opacity-50 mt-2 uppercase tracking-widest">Controle de Conteúdo e Convidados</p>
              </div>
              <button onClick={() => setIsLoggedIn(false)} className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest opacity-50 hover:opacity-100">
                <LogOut size={16} /> Sair
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
              {/* Gestão de Conteúdo */}
              <div className="lg:col-span-1 space-y-8">
                <div className="p-8 luxury-border luxury-gradient">
                  <h3 className="font-serif text-xl mb-6 gold-text flex items-center gap-2">
                    <Settings size={18} /> Personalização Visual
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest mb-3 opacity-60">Tema Principal</label>
                      <div className="flex gap-4">
                        {Object.keys(themes).map((t) => (
                          <button
                            key={t}
                            onClick={() => handleUpdateContent('theme_color', t)}
                            className={`w-10 h-10 rounded-full border-2 transition-all ${content.theme_color === t ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                            style={{ backgroundColor: themes[t as keyof typeof themes].main }}
                            title={t === 'gold' ? 'Dourado' : t === 'silver' ? 'Prateado' : 'Esmeralda'}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60">Fundo</label>
                        <input 
                          type="color" 
                          value={content.bg_color || '#0A0A0A'}
                          onChange={e => handleUpdateContent('bg_color', e.target.value)}
                          className="w-full h-10 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60">Texto</label>
                        <input 
                          type="color" 
                          value={content.text_color || '#FFFFF0'}
                          onChange={e => handleUpdateContent('text_color', e.target.value)}
                          className="w-full h-10 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60">Cards</label>
                        <input 
                          type="color" 
                          value={content.card_bg_color || '#1A1A1A'}
                          onChange={e => handleUpdateContent('card_bg_color', e.target.value)}
                          className="w-full h-10 bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60">Fonte do Sistema</label>
                      <select 
                        value={content.font_family}
                        onChange={e => handleUpdateContent('font_family', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-3 text-xs focus:border-gold outline-none"
                      >
                        {fontFamilies.map(f => (
                          <option key={f} value={f} className="bg-rich-black">{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-8 luxury-border luxury-gradient">
                  <h3 className="font-serif text-xl mb-6 gold-text flex items-center gap-2">
                    <Type size={18} /> Textos do Evento
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: 'event_title', label: 'Título do Evento' },
                      { key: 'event_date', label: 'Data do Evento' },
                      { key: 'event_location', label: 'Local do Evento' },
                      { key: 'event_description', label: 'Descrição do Evento' },
                      { key: 'invitation_text', label: 'Texto de Convite' },
                      { key: 'dress_code', label: 'Traje (Dress Code)' },
                      { key: 'reception_time', label: 'Horário da Recepção' },
                      { key: 'rsvp_deadline', label: 'Prazo de Confirmação' },
                      { key: 'thank_you_title', label: 'Título de Agradecimento' },
                      { key: 'thank_you_text', label: 'Texto de Agradecimento' }
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">{label}</label>
                        {key === 'event_description' || key === 'thank_you_text' ? (
                          <textarea 
                            value={editingContent?.[key as keyof Content] || ''}
                            onChange={e => setEditingContent({...editingContent!, [key]: e.target.value})}
                            onBlur={() => handleUpdateContent(key as keyof Content, editingContent![key as keyof Content])}
                            className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:border-gold outline-none h-32"
                          />
                        ) : (
                          <input 
                            type="text"
                            value={editingContent?.[key as keyof Content] || ''}
                            onChange={e => setEditingContent({...editingContent!, [key]: e.target.value})}
                            onBlur={() => handleUpdateContent(key as keyof Content, editingContent![key as keyof Content])}
                            className="w-full bg-white/5 border border-gold/40 rounded-lg p-3 text-sm focus:border-gold outline-none transition-all"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 luxury-border luxury-gradient">
                  <h3 className="font-serif text-xl mb-6 gold-text flex items-center gap-2">
                    <ImageIcon size={18} /> Imagens e Logo
                  </h3>
                  <div className="space-y-6">
                    {[
                      { key: 'logo_image', label: 'Imagem da Logo' },
                      { key: 'hero_image', label: 'Imagem Principal (Web)' },
                      { key: 'hero_image_mobile', label: 'Imagem Principal (Mobile)' },
                      { key: 'gallery_image_1', label: 'Imagem da Galeria 1' },
                      { key: 'gallery_image_2', label: 'Imagem da Galeria 2' },
                      { key: 'thank_you_image', label: 'Imagem de Agradecimento' }
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">{label}</label>
                        <div className="flex gap-2">
                          <label className="flex-1 cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-3 flex items-center justify-between transition-colors border border-gold/40 rounded-lg">
                            <span className="text-[10px] uppercase tracking-widest opacity-60">
                              {isUploading === key ? 'Enviando...' : 'Selecionar Imagem'}
                            </span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={e => e.target.files?.[0] && handleImageUpload(key as keyof Content, e.target.files[0])}
                            />
                            {isUploading === key ? (
                              <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ImageIcon size={16} />
                            )}
                          </label>
                        </div>
                        {editingContent?.[key as keyof Content] && (
                          <div className="mt-2 aspect-video overflow-hidden border border-gold/40 rounded-lg group relative">
                            <img 
                              src={editingContent[key as keyof Content]} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] uppercase tracking-widest">Clique acima para trocar</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-8 luxury-border luxury-gradient">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl gold-text flex items-center gap-2">
                      <Clock size={18} /> Cronograma do Evento
                    </h3>
                  </div>
                  <div className="space-y-6">
                    {(() => {
                      const schedule: ScheduleItem[] = JSON.parse(editingContent?.schedule || '[]');
                      const updateSchedule = (newSchedule: ScheduleItem[]) => {
                        setEditingContent(prev => prev ? ({ ...prev, schedule: JSON.stringify(newSchedule) }) : null);
                      };

                      return (
                        <>
                          {schedule.map((item, index) => (
                            <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 relative group">
                              <button 
                                onClick={() => {
                                  const newSchedule = schedule.filter((_, i) => i !== index);
                                  updateSchedule(newSchedule);
                                  handleUpdateContent('schedule', JSON.stringify(newSchedule));
                                }}
                                className="absolute top-2 right-2 p-2 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} />
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">Horário</label>
                                  <input 
                                    type="text"
                                    value={item.time}
                                    onChange={e => {
                                      const newSchedule = [...schedule];
                                      newSchedule[index].time = e.target.value;
                                      updateSchedule(newSchedule);
                                    }}
                                    onBlur={() => handleUpdateContent('schedule', JSON.stringify(schedule))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:border-gold outline-none"
                                    placeholder="Ex: 20:00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">Título</label>
                                  <input 
                                    type="text"
                                    value={item.title}
                                    onChange={e => {
                                      const newSchedule = [...schedule];
                                      newSchedule[index].title = e.target.value;
                                      updateSchedule(newSchedule);
                                    }}
                                    onBlur={() => handleUpdateContent('schedule', JSON.stringify(schedule))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:border-gold outline-none"
                                    placeholder="Ex: Abertura"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">Descrição</label>
                                <textarea 
                                  value={item.description}
                                  onChange={e => {
                                    const newSchedule = [...schedule];
                                    newSchedule[index].description = e.target.value;
                                    updateSchedule(newSchedule);
                                  }}
                                  onBlur={() => handleUpdateContent('schedule', JSON.stringify(schedule))}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:border-gold outline-none h-20"
                                  placeholder="O que vai acontecer..."
                                />
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newSchedule = [...schedule, { id: Date.now().toString(), time: '', title: '', description: '' }];
                              updateSchedule(newSchedule);
                              handleUpdateContent('schedule', JSON.stringify(newSchedule));
                            }}
                            className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 hover:border-gold/50 hover:bg-gold/5 transition-all text-[10px] uppercase tracking-widest opacity-60"
                          >
                            <Plus size={16} /> Adicionar Item ao Cronograma
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Lista de Presença */}
              <div className="md:col-span-2 lg:col-span-2">
                <div className="p-6 md:p-8 luxury-border luxury-gradient h-full">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl gold-text flex items-center gap-2">
                      <Users size={18} /> Lista de Presença ({allRsvps.length})
                    </h3>
                    <button 
                      onClick={exportToPDF}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest gold-text border border-gold/20 px-4 py-2 rounded-lg hover:bg-gold/10 transition-all"
                    >
                      <Download size={14} /> Exportar PDF
                    </button>
                  </div>
                  <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                    <table className="w-full text-left text-sm min-w-[500px]">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest opacity-50">
                          <th className="pb-4 font-medium">Nome</th>
                          <th className="pb-4 font-medium">Setor</th>
                          <th className="pb-4 font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allRsvps.map((rsvp) => (
                          <tr key={rsvp.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 font-medium">{rsvp.name}</td>
                            <td className="py-4 opacity-70">{rsvp.sector}</td>
                            <td className="py-4 opacity-50 text-xs">{new Date(rsvp.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Footer */}
            <footer className="mt-20 py-12 border-t border-white/5 text-center">
              <p className="text-[10px] opacity-20 uppercase tracking-widest">© {new Date().getFullYear()} SistemasPro (RW). Todos os Direitos Reservados.</p>
            </footer>
          </motion.div>
        ) : (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Hero Section */}
            <header className="relative h-screen flex items-center justify-center overflow-hidden">
              <motion.div 
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 2 }}
                className="absolute inset-0"
              >
                <picture>
                  {content.hero_image_mobile && (
                    <source media="(max-width: 768px)" srcSet={content.hero_image_mobile} />
                  )}
                  <img 
                    src={content.hero_image} 
                    alt="Imagem Principal" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </picture>
              </motion.div>

              <div className="relative z-10 text-center px-4 max-w-4xl flex flex-col items-center h-full justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="flex flex-col items-center"
                >
                  {content.invitation_text && (
                    <span className="text-xs uppercase tracking-[0.5em] gold-text mb-6 block">{content.invitation_text}</span>
                  )}
                  {content.event_title && (
                    <h1 className="font-serif text-5xl md:text-8xl lg:text-9xl mb-8 leading-tight italic break-words">
                      {content.event_title}
                    </h1>
                  )}
                  
                  {(content.event_date || content.event_location) && (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 text-[10px] md:text-sm uppercase tracking-[0.2em] opacity-80 mb-12">
                      {content.event_date && (
                        <div className="flex items-center gap-3">
                          <Calendar size={18} className="gold-text" />
                          {content.event_date}
                        </div>
                      )}
                      {content.event_location && (
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className="gold-text" />
                          {content.event_location}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="absolute bottom-24"
                >
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' })}
                    className="gold-button shadow-2xl shadow-gold/20"
                  >
                    Confirmar Presença
                  </motion.button>
                </motion.div>
              </div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-30"
              >
                <div className="w-[1px] h-20 bg-gold mx-auto" />
              </motion.div>
            </header>

            {/* Details Section */}
            <section className="py-20 md:py-32 px-6 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
              <div className="space-y-8 md:space-y-12">
                <div className="space-y-4 md:space-y-6">
                  {/* Removed "A Noite" as requested */}
                  {content.event_description && (
                    <p className="text-base md:text-lg leading-relaxed opacity-80 font-light">
                      {content.event_description}
                    </p>
                  )}
                </div>
                
                {(content.dress_code || content.reception_time) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    {content.dress_code && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-widest gold-text">Traje</h4>
                        <p className="text-sm uppercase tracking-widest">{content.dress_code}</p>
                      </div>
                    )}
                    {content.reception_time && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-widest gold-text">Recepção</h4>
                        <p className="text-sm uppercase tracking-widest">{content.reception_time}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="aspect-[4/5] overflow-hidden luxury-border">
                  <img 
                    src={content.gallery_image_1} 
                    alt="Detalhe do Evento" 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-10 -left-10 w-2/3 aspect-square overflow-hidden luxury-border hidden md:block">
                  <img 
                    src={content.gallery_image_2} 
                    alt="Detalhe do Evento 2" 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </section>

            {/* Schedule Section */}
            {(() => {
              try {
                const scheduleData = JSON.parse(content.schedule || '[]');
                if (scheduleData.length > 0) {
                  return (
                    <section id="schedule" className="py-20 md:py-32 px-6 bg-white/[0.01]">
                      <div className="max-w-xl mx-auto text-center">
                        <div className="mb-16 md:mb-24">
                          <h2 className="font-serif text-5xl md:text-7xl italic gold-text mb-6">Cronograma</h2>
                          <div className="w-32 h-[1px] bg-gold/20 mx-auto" />
                        </div>

                        <div className="space-y-16">
                          {scheduleData.map((item: ScheduleItem) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              key={item.id} 
                              className="flex flex-col items-center"
                            >
                              <span className="font-serif text-4xl md:text-5xl italic gold-text mb-2">{item.time}</span>
                              <h3 className="text-lg md:text-xl font-sans uppercase tracking-[0.3em] gold-text font-medium">
                                {item.title}
                              </h3>
                              {item.description && (
                                <p className="mt-4 text-sm md:text-base opacity-50 font-light leading-relaxed max-w-xs mx-auto">
                                  {item.description}
                                </p>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                }
              } catch (e) {
                console.error("Error parsing schedule", e);
              }
              return null;
            })()}

            {/* RSVP Section */}
            <section id="rsvp" className="py-20 md:py-32 px-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/[0.02] -skew-y-3" />
              
              <div className="max-w-3xl mx-auto relative z-10">
                <div className="text-center mb-12 md:mb-16">
                  <h2 className="font-serif text-5xl md:text-6xl italic gold-text mb-4">Confirmação de Presença</h2>
                  {content.rsvp_deadline && (
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] opacity-60">{content.rsvp_deadline}</p>
                  )}
                </div>

                <div className="luxury-border luxury-gradient p-8 md:p-20 relative min-h-[500px] flex items-center justify-center overflow-hidden">
                  {/* Background decorative elements */}
                  <div className="absolute top-0 left-0 w-32 h-32 border-l border-t border-gold/10 -translate-x-4 -translate-y-4" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 border-r border-b border-gold/10 translate-x-4 translate-y-4" />
                  
                  <AnimatePresence mode="wait">
                    {isSending ? (
                      <motion.div
                        key="sending-envelope"
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ 
                          opacity: 0, 
                          y: -400, 
                          x: 100,
                          scale: 0.3, 
                          rotate: 15,
                          filter: 'blur(10px)'
                        }}
                        transition={{ 
                          duration: 1, 
                          ease: [0.23, 1, 0.32, 1] 
                        }}
                        className="relative w-full max-w-sm aspect-[4/3] z-50"
                      >
                        {/* Envelope Body */}
                        <div className="absolute inset-0 bg-[#1a1a1a] luxury-shadow border border-white/10 rounded-sm overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                          
                          {/* Side flaps */}
                          <div className="absolute inset-0 bg-[#222] clip-path-envelope-side-left opacity-30" />
                          <div className="absolute inset-0 bg-[#222] clip-path-envelope-side-right opacity-30" />
                          <div className="absolute inset-0 bg-[#1a1a1a] clip-path-envelope-flap-bottom border-t border-white/5 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]" />
                          
                          {/* The "Letter" sliding down */}
                          <motion.div 
                            initial={{ y: -120, opacity: 0 }}
                            animate={{ y: 40, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
                            className="absolute inset-x-8 top-0 h-48 paper-texture shadow-2xl p-8 flex flex-col items-center justify-start border border-gray-200"
                          >
                            <div className="w-full h-px bg-gold/20 mb-4" />
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100">
                              <CheckCircle2 size={24} className="text-emerald-600" />
                            </div>
                            <h4 className="font-serif italic text-lg text-rich-black mb-1">Confirmado</h4>
                            <p className="text-[8px] uppercase tracking-[0.3em] text-gray-400">Sua presença foi registrada</p>
                            <div className="mt-auto w-full flex justify-between items-end">
                              <div className="space-y-1">
                                <div className="w-16 h-1 bg-gray-100" />
                                <div className="w-10 h-1 bg-gray-100" />
                              </div>
                              <div className="w-8 h-8 opacity-10">
                                {content.logo_image ? (
                                  <img src={content.logo_image} alt="Logo" className="w-full h-full object-contain grayscale" referrerPolicy="no-referrer" />
                                ) : (
                                  <Mail className="w-full h-full" />
                                )}
                              </div>
                            </div>
                          </motion.div>

                          {/* Top Flap Closing */}
                          <motion.div 
                            initial={{ rotateX: -180 }}
                            animate={{ rotateX: 0 }}
                            transition={{ delay: 1.8, duration: 1, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute top-0 left-0 right-0 h-1/2 bg-[#1a1a1a] origin-top z-20 shadow-2xl border-x border-t border-white/10"
                            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', backfaceVisibility: 'hidden' }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                          </motion.div>

                          {/* Wax Seal appearing with a "stamp" effect */}
                          <motion.div 
                            initial={{ scale: 3, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ delay: 2.8, type: "spring", stiffness: 300, damping: 15 }}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-16 h-16"
                          >
                            <motion.div 
                              animate={{ 
                                scale: [1, 1.1, 1],
                                boxShadow: [
                                  "0 0 20px rgba(212,175,55,0.5)",
                                  "0 0 40px rgba(212,175,55,0.8)",
                                  "0 0 20px rgba(212,175,55,0.5)"
                                ]
                              }}
                              transition={{ delay: 2.8, duration: 0.5 }}
                              className="w-full h-full bg-gold rounded-full flex items-center justify-center border-4 border-dark-gold/30 relative"
                            >
                              <div className="absolute inset-1 rounded-full border border-white/20" />
                              <span className="font-serif text-2xl text-rich-black font-bold">P</span>
                            </motion.div>
                          </motion.div>
                        </div>
                        
                        {/* Sending particles effect */}
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ delay: 3.5, duration: 0.5 }}
                          className="absolute -inset-10 pointer-events-none"
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-3xl rounded-full" />
                        </motion.div>

                        <div className="absolute -bottom-16 left-0 right-0 text-center">
                          <p className="text-[10px] uppercase tracking-[0.5em] gold-text animate-pulse">Enviando para os anfitriões</p>
                        </div>
                      </motion.div>
                    ) : isSubmitted ? (
                      <motion.div 
                        key="success-message"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-10 py-12 w-full"
                      >
                        <div className="relative inline-block">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="w-28 h-28 bg-gold/10 rounded-full flex items-center justify-center mx-auto border border-gold/20 relative z-10"
                          >
                            <CheckCircle2 size={56} className="gold-text" />
                          </motion.div>
                          {/* Animated rings */}
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                            className="absolute inset-0 border border-gold/30 rounded-full"
                          />
                        </div>
                        
                        <div className="space-y-6">
                          <motion.h3 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="font-serif text-5xl md:text-6xl italic gold-text"
                          >
                            {content.thank_you_title || 'Presença Confirmada'}
                          </motion.h3>
                          <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="opacity-70 text-xl md:text-2xl max-w-lg mx-auto leading-relaxed font-light italic"
                          >
                            {content.thank_you_text || 'Sua presença foi registrada com sucesso. Mal podemos esperar para celebrar com você!'}
                          </motion.p>
                        </div>

                        {content.thank_you_image && (
                          <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 1 }}
                            className="aspect-video w-full overflow-hidden luxury-border mt-12 shadow-2xl"
                          >
                            <img 
                              src={content.thank_you_image} 
                              alt="Agradecimento" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </motion.div>
                        )}

                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1 }}
                          className="pt-12"
                        >
                          <button 
                            onClick={() => setIsSubmitted(false)}
                            className="text-[10px] uppercase tracking-[0.5em] gold-text hover:opacity-70 transition-opacity flex items-center gap-3 mx-auto group"
                          >
                            <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                            Fazer outra confirmação
                          </button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleRsvpSubmit} className="space-y-12 md:space-y-16 w-full max-w-2xl mx-auto relative">
                        <div className="flex justify-center mb-8">
                          <div className="w-px h-16 bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
                          <div className="space-y-4 group">
                            <label className="block text-[10px] uppercase tracking-[0.4em] opacity-40 ml-1 group-focus-within:opacity-100 transition-opacity duration-500">Nome Completo</label>
                            <div className="relative">
                              <input 
                                type="text"
                                required
                                value={rsvpForm.name}
                                onChange={e => setRsvpForm({...rsvpForm, name: e.target.value})}
                                className="w-full bg-transparent border-b border-gold/20 rounded-none px-1 py-4 focus:border-gold outline-none transition-all duration-700 text-xl font-serif italic placeholder:opacity-10"
                                placeholder="Como está no convite"
                              />
                              <div className="absolute bottom-0 left-0 w-0 h-px bg-gold transition-all duration-700 group-focus-within:w-full" />
                            </div>
                          </div>
                          <div className="space-y-4 group">
                            <label className="block text-[10px] uppercase tracking-[0.4em] opacity-40 ml-1 group-focus-within:opacity-100 transition-opacity duration-500">Setor / Organização</label>
                            <div className="relative">
                              <input 
                                type="text"
                                required
                                value={rsvpForm.sector}
                                onChange={e => setRsvpForm({...rsvpForm, sector: e.target.value})}
                                className="w-full bg-transparent border-b border-gold/20 rounded-none px-1 py-4 focus:border-gold outline-none transition-all duration-700 text-xl font-serif italic placeholder:opacity-10"
                                placeholder="Sua empresa ou setor"
                              />
                              <div className="absolute bottom-0 left-0 w-0 h-px bg-gold transition-all duration-700 group-focus-within:w-full" />
                            </div>
                          </div>
                        </div>

                        <div className="relative pt-12">
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                          
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full gold-button py-7 md:py-8 flex items-center justify-center gap-8 disabled:opacity-50 group relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                          >
                            <span className="relative z-10 flex items-center gap-6 text-xs md:text-sm tracking-[0.5em] font-bold">
                              {isSubmitting ? 'PROCESSANDO...' : 'CONFIRMAR PRESENÇA'}
                              {!isSubmitting && (
                                <motion.div
                                  animate={{ x: [0, 5, 0] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                  <ChevronRight size={20} />
                                </motion.div>
                              )}
                            </span>
                            <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out" />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000" />
                          </button>
                          
                          <div className="flex items-center justify-center gap-4 mt-10">
                            <div className="h-px w-8 bg-gold/20" />
                            <p className="text-[9px] uppercase tracking-[0.6em] opacity-30 italic whitespace-nowrap">
                              Sua presença é nossa maior honra
                            </p>
                            <div className="h-px w-8 bg-gold/20" />
                          </div>
                        </div>
                      </form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-white/5 text-center px-4">
              <button 
                onClick={() => setIsAdmin(true)}
                className="font-serif text-2xl md:text-3xl tracking-[0.3em] gold-text uppercase mb-8 flex items-center justify-center mx-auto hover:opacity-80 transition-opacity"
              >
                {content.logo_image ? (
                  <img src={content.logo_image} alt="Logo" className="h-12 md:h-16 w-auto object-contain" referrerPolicy="no-referrer" />
                ) : (
                  'Prestígio'
                )}
              </button>
              <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[10px] uppercase tracking-[0.2em] opacity-40">
                <span>Exclusividade</span>
                <span>Elegância</span>
                <span>Celebração</span>
              </div>
              <p className="mt-12 text-[10px] opacity-20 uppercase tracking-widest">© {new Date().getFullYear()} SistemasPro (RW). Todos os Direitos Reservados.</p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
