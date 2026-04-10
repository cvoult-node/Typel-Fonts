import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import opentype from 'https://esm.sh/opentype.js';
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc 
} from './firebase.js';

const TECLADO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z',
  '0','1','2','3','4','5','6','7','8','9',' ','!','?','.',',',':'
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const [currentChar, setCurrentChar] = useState('A');
  const [fontData, setFontData] = useState({}); 
  const [grid, setGrid] = useState(Array(64).fill(false));
  const fileInputRef = useRef(null);

  // CONTROL DE SESIÓN Y CARGA DE DATOS
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docSnap = await getDoc(doc(db, "fuentes", u.uid));
          if (docSnap.exists()) {
            const saved = docSnap.data().font || {};
            setFontData(saved);
            if (saved['A']) setGrid(saved['A']);
          }
        } catch (e) { console.error("Error al cargar:", e); }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // FUNCIONES DE AUTENTICACIÓN (CORREGIDAS)
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Llena todos los campos");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          alert("Cuenta creada con éxito");
        } catch (regError) { alert("Error al registrar: " + regError.message); }
      } else { alert("Error: " + error.message); }
    }
  };

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (e) { alert("Error Google: " + e.message); }
  };

  // LÓGICA DEL EDITOR
  const handleSaveFont = async (data = fontData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "fuentes", user.uid), { font: data }, { merge: true });
    } catch (e) { console.error(e); }
    setIsSaving(false);
  };

  const updatePixel = (i, value) => {
    const newGrid = [...grid];
    if (newGrid[i] === value) return;
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

  // EXPORTACIÓN TTF
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
    new opentype.Font({ familyName: 'CodeShelfFont', styleName: 'Regular', unitsPerEm: 1000, ascender: 800, descender: -200, glyphs }).download();
    setMenuOpen(false);
  };

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400 font-mono" }, "CONECTANDO...");

  // PANTALLA DE INICIO (MEJORADA)
  if (!user) {
    return React.createElement('div', { className: "h-screen flex items-center justify-center bg-[#050505] p-4" },
      React.createElement('div', { className: "w-full max-w-md bg-neutral-900/50 border border-white/10 p-8 rounded-3xl backdrop-blur-md" },
        React.createElement('h1', { className: "text-4xl font-black text-white text-center mb-2 tracking-tighter" }, "CODE SHELF"),
        React.createElement('p', { className: "text-neutral-500 text-center text-xs mb-8 uppercase tracking-widest" }, "Font Forge Studio"),
        
        React.createElement('form', { onSubmit: handleEmailAuth, className: "flex flex-col gap-4" },
          React.createElement('input', { 
            type: "email", placeholder: "Correo electrónico", value: email, 
            onChange: (e) => setEmail(e.target.value),
            className: "bg-black border border-white/5 p-4 rounded-xl outline-none focus:border-cyan-500 text-white transition" 
          }),
          React.createElement('input', { 
            type: "password", placeholder: "Contraseña", value: password, 
            onChange: (e) => setPassword(e.target.value),
            className: "bg-black border border-white/5 p-4 rounded-xl outline-none focus:border-cyan-500 text-white transition" 
          }),
          React.createElement('button', { type: "submit", className: "bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-bold transition shadow-lg shadow-cyan-900/20" }, "ENTRAR O REGISTRAR")
        ),

        React.createElement('div', { className: "flex items-center my-6" },
          React.createElement('div', { className: "flex-1 h-[1px] bg-white/5" }),
          React.createElement('span', { className: "px-4 text-[10px] text-neutral-600 font-bold" }, "O TAMBIÉN"),
          React.createElement('div', { className: "flex-1 h-[1px] bg-white/5" })
        ),

        React.createElement('button', { 
          onClick: handleGoogleLogin, 
          className: "w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition" 
        }, "CONTINUAR CON GOOGLE")
      )
    );
  }

  // INTERFAZ PRINCIPAL
  return React.createElement('div', { className: "min-h-screen bg-[#050505] text-white" },
    React.createElement('nav', { className: "border-b border-white/5 bg-black/50 backdrop-blur-md p-4" },
      React.createElement('div', { className: "max-w-6xl mx-auto flex justify-between items-center" },
        React.createElement('div', { className: "relative" },
          React.createElement('button', { onClick: () => setMenuOpen(!menuOpen), className: "bg-neutral-800 px-4 py-2 rounded-lg text-xs font-bold" }, "📂 PROYECTO"),
          menuOpen && React.createElement('div', { className: "absolute top-12 left-0 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-2 z-50" },
            React.createElement('button', { onClick: exportarTTF, className: "w-full text-left p-3 hover:bg-cyan-500/10 rounded-lg text-xs text-cyan-400 font-bold" }, "DESCARGAR .TTF"),
            React.createElement('button', { onClick: () => signOut(auth), className: "w-full text-left p-3 hover:bg-red-500/10 rounded-lg text-xs text-red-500" }, "CERRAR SESIÓN")
          )
        ),
        React.createElement('span', { className: "font-black tracking-tighter text-cyan-400" }, "CODE SHELF"),
        React.createElement('span', { className: "text-[10px] text-neutral-600" }, user.email)
      )
    ),

    React.createElement('main', { className: "max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-10" },
      React.createElement('div', { className: "flex flex-col items-center" },
        React.createElement('div', { className: "mb-6 text-4xl font-black text-white" }, currentChar),
        React.createElement('div', { 
          className: "grid grid-cols-8 gap-1.5 bg-black p-4 rounded-2xl border border-white/5 shadow-2xl",
          onMouseDown: () => setIsDrawing(true), onMouseUp: () => setIsDrawing(false), onMouseLeave: () => setIsDrawing(false)
        },
          grid.map((active, i) => React.createElement('div', {
            key: i,
            onMouseEnter: () => isDrawing && updatePixel(i, true),
            onMouseDown: () => updatePixel(i, !active),
            className: `w-12 h-12 md:w-14 md:h-14 rounded-sm cursor-crosshair transition-all ${active ? 'bg-cyan-400 shadow-[0_0_15px_cyan]' : 'bg-neutral-900 hover:bg-neutral-800'}`
          }))
        ),
        React.createElement('button', { onClick: () => handleSaveFont(), className: "mt-8 w-full py-4 bg-cyan-600 rounded-xl font-bold hover:bg-cyan-500 transition" }, isSaving ? "GUARDANDO..." : "GUARDAR CAMBIOS")
      ),

      React.createElement('div', { className: "bg-neutral-900/30 p-6 rounded-3xl border border-white/5" },
        React.createElement('h3', { className: "text-[10px] text-neutral-500 mb-6 font-bold tracking-[0.2em]" }, "MAPA DE GLIFOS"),
        React.createElement('div', { className: "flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto pr-2" },
          TECLADO.map(t => {
            const hasData = fontData[t] && fontData[t].some(p => p === true);
            return React.createElement('button', {
              key: t, onClick: () => switchChar(t),
              className: `w-10 h-10 flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                currentChar === t ? 'bg-white text-black border-white' : 
                hasData ? 'border-cyan-500/30 text-cyan-400 bg-cyan-900/20' : 'bg-neutral-900 border-white/5 text-neutral-600'
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
