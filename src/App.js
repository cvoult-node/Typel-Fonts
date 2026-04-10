import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import opentype from 'https://esm.sh/opentype.js';
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc 
} from './firebase.js';

const TECLADO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z',
  '0','1','2','3','4','5','6','7','8','9',' ','!','?','.',',',':','-','+','='
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewText, setPreviewText] = useState("CODESHELF");
  const [isDrawing, setIsDrawing] = useState(false); // Para pintar arrastrando

  const [currentChar, setCurrentChar] = useState('A');
  const [fontData, setFontData] = useState({}); 
  const [grid, setGrid] = useState(Array(64).fill(false));
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await getDoc(doc(db, "fuentes", u.uid));
        if (docSnap.exists()) {
          const saved = docSnap.data().font || {};
          setFontData(saved);
          if (saved['A']) setGrid(saved['A']);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSaveFont = async (data = fontData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "fuentes", user.uid), { 
        font: data, 
        author: user.email,
        updatedAt: new Date() 
      }, { merge: true });
    } catch (e) { console.error(e); }
    setIsSaving(false);
  };

  const updatePixel = (i, value) => {
    const newGrid = [...grid];
    if (newGrid[i] === value) return; // Evita renders innecesarios
    newGrid[i] = value;
    setGrid(newGrid);
    const newFontData = { ...fontData, [currentChar]: newGrid };
    setFontData(newFontData);
  };

  const switchChar = (char) => {
    handleSaveFont();
    setCurrentChar(char);
    setGrid(fontData[char] || Array(64).fill(false));
  };

  // --- EXPORTAR TTF ---
  const exportarTTF = () => {
    const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 650, path: new opentype.Path() })];
    Object.keys(fontData).forEach(char => {
      const pixels = fontData[char];
      const path = new opentype.Path();
      const s = 100;
      pixels.forEach((active, i) => {
        if (active) {
          const x = (i % 8) * s;
          const y = (7 - Math.floor(i / 8)) * s;
          path.moveTo(x, y); path.lineTo(x+s, y); path.lineTo(x+s, y+s); path.lineTo(x, y+s); path.close();
        }
      });
      glyphs.push(new opentype.Glyph({ name: char, unicode: char.charCodeAt(0), advanceWidth: 900, path }));
    });
    new opentype.Font({ familyName: 'CodeShelfCustom', styleName: 'Regular', unitsPerEm: 1000, ascender: 800, descender: -200, glyphs }).download();
  };

  // --- RENDERIZADO DE MINI PREVIEW ---
  const renderMiniGlyph = (char) => {
    const pixels = fontData[char] || Array(64).fill(false);
    return React.createElement('div', { className: "grid grid-cols-8 gap-[1px] w-8 h-8 bg-neutral-800 p-[1px]" },
      pixels.map((p, i) => React.createElement('div', { key: i, className: `w-full h-full ${p ? 'bg-cyan-400' : 'bg-transparent'}` }))
    );
  };

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400 font-mono tracking-widest" }, "LOADING_PROJECT...");

  if (!user) { /* ... Login Code ... */ }

  return React.createElement('div', { className: "min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30" },
    
    // NAV BAR
    React.createElement('nav', { className: "sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl" },
      React.createElement('div', { className: "max-w-7xl mx-auto px-6 h-16 flex items-center justify-between" },
        React.createElement('div', { className: "flex items-center gap-8" },
          React.createElement('span', { className: "text-xl font-black italic tracking-tighter text-cyan-400" }, "CODESHELF.IO"),
          React.createElement('div', { className: "relative" },
            React.createElement('button', { onClick: () => setMenuOpen(!menuOpen), className: "text-xs font-bold text-neutral-400 hover:text-white transition" }, "PROJECT"),
            menuOpen && React.createElement('div', { className: "absolute top-10 left-0 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-2" },
              React.createElement('button', { onClick: exportarTTF, className: "w-full text-left p-3 hover:bg-cyan-500/10 rounded-lg text-xs text-cyan-400 font-bold" }, "DOWNLOAD .TTF"),
              React.createElement('button', { onClick: () => signOut(auth), className: "w-full text-left p-3 hover:bg-red-500/10 rounded-lg text-xs text-red-500" }, "EXIT")
            )
          )
        ),
        React.createElement('div', { className: "text-[10px] text-neutral-600 font-mono" }, user.email)
      )
    ),

    React.createElement('main', { className: "max-w-7xl mx-auto p-6 grid lg:grid-cols-[1fr_350px] gap-8" },
      
      // COLUMNA IZQUIERDA: EDITOR
      React.createElement('section', null,
        React.createElement('div', { className: "bg-neutral-900/40 border border-white/5 rounded-3xl p-8 flex flex-col items-center shadow-inner" },
          React.createElement('div', { className: "w-full flex justify-between items-end mb-8" },
            React.createElement('div', null,
              React.createElement('h2', { className: "text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1" }, "Character Editor"),
              React.createElement('div', { className: "text-5xl font-black text-white" }, currentChar)
            ),
            React.createElement('button', { onClick: () => setGrid(Array(64).fill(false)), className: "text-[10px] text-neutral-500 hover:text-red-400 transition" }, "CLEAR GRID")
          ),

          // GRID INTERACTIVO (Pintar arrastrando)
          React.createElement('div', { 
            className: "grid grid-cols-8 gap-1.5 bg-black p-4 rounded-2xl border border-white/5 shadow-2xl",
            onMouseDown: () => setIsDrawing(true),
            onMouseUp: () => setIsDrawing(false),
            onMouseLeave: () => setIsDrawing(false)
          },
            grid.map((active, i) => React.createElement('div', {
              key: i,
              onMouseEnter: () => isDrawing && updatePixel(i, true),
              onMouseDown: () => updatePixel(i, !active),
              className: `w-12 h-12 md:w-14 md:h-14 rounded-md cursor-crosshair transition-all duration-150 ${active ? 'bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] border-transparent' : 'bg-neutral-900 border border-white/5 hover:border-white/20'}`
            }))
          ),

          React.createElement('button', { 
            onClick: () => handleSaveFont(),
            className: "mt-10 w-full max-w-md py-4 bg-white text-black rounded-2xl font-black text-sm tracking-widest hover:bg-cyan-400 transition-colors shadow-xl"
          }, isSaving ? "SYNCING..." : "SAVE CHANGES")
        ),

        // VISTA PREVIA DE TEXTO
        React.createElement('div', { className: "mt-8 bg-neutral-900/20 border border-white/5 rounded-3xl p-8" },
          React.createElement('input', { 
            value: previewText, 
            onChange: (e) => setPreviewText(e.target.value),
            className: "w-full bg-transparent text-2xl font-bold outline-none mb-6 placeholder:text-neutral-800",
            placeholder: "Type to preview..."
          }),
          React.createElement('div', { className: "flex flex-wrap gap-2" },
            previewText.split('').map((char, i) => React.createElement('div', { key: i }, renderMiniGlyph(char)))
          )
        )
      ),

      // COLUMNA DERECHA: TECLADO
      React.createElement('aside', { className: "bg-neutral-900/40 border border-white/5 rounded-3xl p-6" },
        React.createElement('h3', { className: "text-xs font-bold text-neutral-600 mb-6 uppercase tracking-[0.3em]" }, "Glyph Map"),
        React.createElement('div', { className: "grid grid-cols-4 gap-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar" },
          TECLADO.map(t => {
            const hasData = fontData[t] && fontData[t].some(p => p === true);
            return React.createElement('button', {
              key: t,
              onClick: () => switchChar(t),
              className: `h-14 flex flex-col items-center justify-center rounded-xl border transition-all ${
                currentChar === t ? 'bg-white text-black border-white shadow-lg scale-105' : 
                hasData ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' : 'bg-black border-white/5 text-neutral-600 hover:border-white/20'
              }`
            }, 
              React.createElement('span', { className: "text-xs font-bold" }, t),
              hasData && React.createElement('div', { className: "w-1 h-1 bg-cyan-400 rounded-full mt-1" })
            );
          })
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
