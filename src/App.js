import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import opentype from 'https://esm.sh/opentype.js'; // Librería para generar fuentes
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc 
} from './firebase.js';

const TECLADO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z',
  '0','1','2','3','4','5','6','7','8','9',' ','!','?','.',',',':'
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    await setDoc(doc(db, "fuentes", user.uid), { font: data }, { merge: true });
    setIsSaving(false);
  };

  const togglePixel = (i) => {
    const newGrid = [...grid];
    newGrid[i] = !newGrid[i];
    setGrid(newGrid);
    const newFontData = { ...fontData, [currentChar]: newGrid };
    setFontData(newFontData);
  };

  const switchChar = (char) => {
    handleSaveFont();
    setCurrentChar(char);
    setGrid(fontData[char] || Array(64).fill(false));
  };

  // --- LÓGICA DE ARCHIVOS ---
  
  const exportarJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fontData));
    const link = document.createElement("a");
    link.href = dataStr; link.download = "codeshelf_backup.json";
    link.click();
    setMenuOpen(false);
  };

  const importarJSON = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const imported = JSON.parse(event.target.result);
      setFontData(imported);
      if (imported[currentChar]) setGrid(imported[currentChar]);
      handleSaveFont(imported);
      alert("✅ Fuente importada correctamente");
    };
    reader.readAsText(file);
    setMenuOpen(false);
  };

  const exportarTTF = () => {
    const notDefGlyph = new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 650, path: new opentype.Path() });
    const glyphs = [notDefGlyph];

    Object.keys(fontData).forEach(char => {
      const pixels = fontData[char];
      const path = new opentype.Path();
      const scale = 100; // Tamaño de cada pixel en el archivo de fuente

      pixels.forEach((active, i) => {
        if (active) {
          const x = (i % 8) * scale;
          const y = (7 - Math.floor(i / 8)) * scale; // Invertimos Y para formato de fuente
          path.moveTo(x, y);
          path.lineTo(x + scale, y);
          path.lineTo(x + scale, y + scale);
          path.lineTo(x, y + scale);
          path.close();
        }
      });

      glyphs.push(new opentype.Glyph({
        name: char,
        unicode: char.charCodeAt(0),
        advanceWidth: 900,
        path: path
      }));
    });

    const font = new opentype.Font({
      familyName: 'CodeShelfFont',
      styleName: 'Medium',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: glyphs
    });

    font.download();
    setMenuOpen(false);
  };

  // --- INTERFAZ ---

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400" }, "INICIANDO...");

  if (!user) {
    return React.createElement('div', { className: "h-screen flex flex-col items-center justify-center bg-black text-white" },
      React.createElement('h1', { className: "text-4xl font-bold text-cyan-400 mb-8" }, "CODE SHELF"),
      React.createElement('button', { onClick: () => signInWithPopup(auth, provider), className: "bg-white text-black px-10 py-4 rounded-full font-bold" }, "ENTRAR CON GOOGLE")
    );
  }

  return React.createElement('div', { className: "min-h-screen bg-neutral-950 text-white p-4" },
    // HEADER CON MENÚ
    React.createElement('header', { className: "max-w-5xl mx-auto flex justify-between items-center mb-8 bg-neutral-900 p-4 rounded-2xl border border-neutral-800" },
      React.createElement('div', { className: "relative" },
        React.createElement('button', { 
          onClick: () => setMenuOpen(!menuOpen),
          className: "bg-neutral-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-700 transition"
        }, "📂 ARCHIVO"),
        
        menuOpen && React.createElement('div', { className: "absolute top-12 left-0 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1" },
          React.createElement('button', { onClick: exportarJSON, className: "text-left p-2 hover:bg-neutral-800 rounded text-xs" }, "📤 Exportar JSON"),
          React.createElement('button', { onClick: () => fileInputRef.current.click(), className: "text-left p-2 hover:bg-neutral-800 rounded text-xs" }, "📥 Importar JSON"),
          React.createElement('hr', { className: "border-neutral-800 my-1" }),
          React.createElement('button', { onClick: exportarTTF, className: "text-left p-2 hover:bg-cyan-900/30 text-cyan-400 rounded text-xs font-bold" }, "🎯 GENERAR .TTF"),
          React.createElement('hr', { className: "border-neutral-800 my-1" }),
          React.createElement('button', { onClick: () => signOut(auth), className: "text-left p-2 hover:bg-red-900/20 text-red-500 rounded text-xs" }, "🚪 Salir")
        )
      ),
      React.createElement('h2', { className: "text-cyan-400 font-black tracking-widest" }, "CODESHELF"),
      React.createElement('div', { className: "w-20" }) // Balance visual
    ),

    React.createElement('input', { type: "file", ref: fileInputRef, className: "hidden", accept: ".json", onChange: importarJSON }),

    // CUERPO DEL EDITOR
    React.createElement('div', { className: "max-w-5xl mx-auto grid md:grid-cols-2 gap-8" },
      React.createElement('div', { className: "flex flex-col items-center" },
        React.createElement('div', { className: "text-5xl font-mono mb-6 text-cyan-400 bg-neutral-900 w-20 h-20 flex items-center justify-center rounded-2xl border border-cyan-900/50" }, currentChar),
        React.createElement('div', { className: "grid grid-cols-8 gap-1 bg-neutral-900 p-3 rounded-xl border border-neutral-800 shadow-2xl" },
          grid.map((active, i) => React.createElement('div', {
            key: i,
            onClick: () => togglePixel(i),
            className: `w-10 h-10 md:w-12 md:h-12 cursor-pointer transition-all rounded-sm ${active ? 'bg-cyan-400 shadow-[0_0_15px_cyan]' : 'bg-black hover:bg-neutral-800'}`
          }))
        ),
        React.createElement('button', { onClick: () => handleSaveFont(), className: "mt-6 w-full bg-cyan-600 py-4 rounded-xl font-bold shadow-lg shadow-cyan-900/20" }, isSaving ? "GUARDANDO..." : "GUARDAR NUBE")
      ),

      React.createElement('div', { className: "bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800" },
        React.createElement('p', { className: "text-[10px] text-neutral-500 mb-4 font-bold tracking-widest" }, "TECLADO"),
        React.createElement('div', { className: "flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-2" },
          TECLADO.map(t => {
            const tiene = fontData[t] && fontData[t].some(p => p === true);
            return React.createElement('button', {
              key: t,
              onClick: () => switchChar(t),
              className: `w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                currentChar === t ? 'bg-cyan-400 text-black border-white' : 
                tiene ? 'border-cyan-500/50 text-cyan-400 bg-cyan-900/10' : 'bg-neutral-900 border-neutral-800 text-neutral-600'
              }`
            }, t);
          })
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
