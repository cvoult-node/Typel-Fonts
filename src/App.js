import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import opentype from 'https://esm.sh/opentype.js';
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc 
} from './firebase.js';

const TECLADO = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9',' ',',','.',':',';','!','?'];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState(8);
  const [setupMode, setSetupMode] = useState(true);
  const [currentChar, setCurrentChar] = useState('A');
  const [fontData, setFontData] = useState({}); 
  const [grid, setGrid] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await getDoc(doc(db, "fuentes", u.uid));
        if (docSnap.exists()) {
          const d = docSnap.data();
          setFontData(d.font || {});
          setGridSize(d.gridSize || 8);
          setGrid(d.font?.[currentChar] || Array(Math.pow(d.gridSize || 8, 2)).fill(false));
          setSetupMode(false);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [currentChar]);

// 1. Manejo de errores de Firebase traducidos
  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email': return "El formato del correo no es válido.";
      case 'auth/weak-password': return "La contraseña debe tener al menos 6 caracteres.";
      case 'auth/wrong-password': return "Contraseña incorrecta.";
      default: return "Error de conexión. Inténtalo de nuevo.";
    }
  };

  // 2. Función de Auth unificada (Login/Registro)
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Por favor, completa todos los campos.");
    
    try {
      // Intentamos iniciar sesión
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      // Si el usuario no existe, lo registramos automáticamente
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          alert("¡Cuenta creada con éxito! Bienvenido a CodeShelf.");
        } catch (regError) {
          alert(getErrorMessage(regError.code));
        }
      } else {
        alert(getErrorMessage(error.code));
      }
    }
  };

  // 3. Google Login simplificado
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code !== 'auth/cancelled-popup-request') {
        alert("Error al conectar con Google.");
      }
    }
  };

  const saveToCloud = async (data = fontData) => {
    if (!user) return;
    setIsSaving(true);
    await setDoc(doc(db, "fuentes", user.uid), { font: data, gridSize }, { merge: true });
    setIsSaving(false);
  };

// 1. Actualización inteligente de píxeles
  const updatePixel = (i, value) => {
    // Evitamos renderizados innecesarios si el píxel ya tiene ese valor
    if (grid[i] === value) return;

    const newGrid = [...grid];
    newGrid[i] = value;
    setGrid(newGrid);

    // Guardamos en el estado local de la fuente
    const newFontData = { ...fontData, [currentChar]: newGrid };
    setFontData(newFontData);
  };

  // 2. Lógica para cambiar de letra (con auto-guardado preventivo)
  const switchChar = (char) => {
    // Sincronizamos con la nube antes de cambiar para no perder progreso
    handleSaveFont(); 
    
    setCurrentChar(char);
    
    // Si la letra ya existe, la cargamos. Si no, creamos un grid vacío del tamaño actual.
    const savedGrid = fontData[char];
    if (savedGrid && savedGrid.length === gridSize * gridSize) {
      setGrid(savedGrid);
    } else {
      setGrid(Array(gridSize * gridSize).fill(false));
    }
  };

  // 3. Manejador de "Dibujo Continuo"
  // Esta función se activa cuando pasas el mouse por encima de un píxel
  const handleMouseEnter = (i) => {
    if (isDrawing) {
      updatePixel(i, true);
    }
  };

  const exportTTF = () => {
    const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 650, path: new opentype.Path() })];
    Object.keys(fontData).forEach(char => {
      const path = new opentype.Path();
      const s = 100;
      fontData[char].forEach((active, i) => {
        if (active) {
          const x = (i % gridSize) * s, y = (gridSize - 1 - Math.floor(i / gridSize)) * s;
          path.moveTo(x, y); path.lineTo(x+s, y); path.lineTo(x+s, y+s); path.lineTo(x, y+s); path.close();
        }
      });
      glyphs.push(new opentype.Glyph({ name: char, unicode: char.charCodeAt(0), advanceWidth: gridSize * 110, path }));
    });
    new opentype.Font({ familyName: 'CodeShelf', styleName: 'Reg', unitsPerEm: 1000, ascender: 800, descender: -200, glyphs }).download();
  };

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400 font-mono" }, "SISTEMA_INICIANDO...");

  if (!user) return React.createElement('div', { className: "h-screen bg-[#050505] flex items-center justify-center p-4" },
    React.createElement('div', { className: "w-full max-w-sm bg-neutral-900 border border-white/10 p-8 rounded-3xl" },
      React.createElement('h1', { className: "text-3xl font-black text-white text-center mb-6" }, "CODE SHELF"),
      React.createElement('form', { onSubmit: handleEmailAuth, className: "flex flex-col gap-3" },
        React.createElement('input', { type: "email", placeholder: "Email", value: email, onChange: e => setEmail(e.target.value), className: "bg-black border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500" }),
        React.createElement('input', { type: "password", placeholder: "Pass", value: password, onChange: e => setPassword(e.target.value), className: "bg-black border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500" }),
        React.createElement('button', { className: "bg-cyan-600 py-3 rounded-xl font-bold" }, "ENTRAR")
      ),
      React.createElement('button', { onClick: () => signInWithPopup(auth, provider), className: "w-full bg-white text-black py-3 rounded-xl font-bold mt-3" }, "GOOGLE")
    )
  );

  if (setupMode) return React.createElement('div', { className: "h-screen bg-black flex flex-col items-center justify-center text-white" },
    React.createElement('h2', { className: "text-xl font-bold mb-6" }, "RESOLUCIÓN DEL LIENZO"),
    React.createElement('div', { className: "grid grid-cols-2 gap-4" },
      [8, 10, 12, 16].map(s => React.createElement('button', { key: s, onClick: () => { setGridSize(s); setGrid(Array(s*s).fill(false)); setSetupMode(false); }, className: "w-24 h-24 bg-neutral-900 border border-white/10 rounded-2xl hover:border-cyan-500 font-bold" }, `${s}x${s}`))
    )
  );

  return React.createElement('div', { className: "min-h-screen bg-[#050505] text-white font-sans" },
    React.createElement('nav', { className: "border-b border-white/5 p-4 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-50" },
      React.createElement('div', { className: "relative" },
        React.createElement('button', { onClick: () => setMenuOpen(!menuOpen), className: "bg-neutral-800 px-4 py-2 rounded-lg text-xs font-bold" }, "📂 PROYECTO"),
        menuOpen && React.createElement('div', { className: "absolute top-12 left-0 w-44 bg-neutral-900 border border-white/10 rounded-xl p-2 z-50 shadow-2xl" },
          React.createElement('button', { onClick: exportTTF, className: "w-full text-left p-2 hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold" }, "EXPORTAR .TTF"),
          React.createElement('button', { onClick: () => { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fontData)); const l = document.createElement("a"); l.href = dataStr; l.download = "font.json"; l.click(); }, className: "w-full text-left p-2 hover:bg-neutral-800 text-xs" }, "EXPORTAR JSON"),
          React.createElement('button', { onClick: () => setSetupMode(true), className: "w-full text-left p-2 hover:bg-neutral-800 text-xs" }, "CAMBIAR TAMAÑO"),
          React.createElement('button', { onClick: () => signOut(auth), className: "w-full text-left p-2 hover:bg-red-900/10 text-red-500 text-xs" }, "SALIR")
        )
      ),
      React.createElement('span', { className: "font-black text-cyan-400" }, "CODE SHELF"),
      React.createElement('span', { className: "text-[10px] text-neutral-600 font-mono" }, user.email)
    ),

    React.createElement('main', { className: "max-w-6xl mx-auto p-6 grid lg:grid-cols-[1fr_350px] gap-8" },
      React.createElement('section', { className: "flex flex-col items-center" },
        React.createElement('div', { className: "mb-4 text-4xl font-black" }, currentChar),
        React.createElement('div', { className: "relative group shadow-2xl rounded-xl overflow-hidden" },
          React.createElement('div', { className: "absolute inset-0 pointer-events-none border border-white/5" },
            React.createElement('div', { className: "absolute w-full h-[1px] bg-red-500/30", style: { top: '75%' } }),
            React.createElement('div', { className: "absolute w-full h-[1px] bg-blue-500/30", style: { top: '25%' } })
          ),
          React.createElement('div', { 
            className: "grid bg-neutral-900", 
            style: { gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'min(85vw, 450px)', height: 'min(85vw, 450px)', gap: '1px' },
            onMouseDown: () => setIsDrawing(true), onMouseUp: () => setIsDrawing(false), onMouseLeave: () => setIsDrawing(false)
          },
            grid.map((a, i) => React.createElement('div', {
              key: i, onMouseEnter: () => isDrawing && updatePixel(i, true), onMouseDown: () => updatePixel(i, !a),
              className: `w-full h-full cursor-crosshair transition-all ${a ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-black hover:bg-neutral-800'}`
            }))
          )
        ),
        React.createElement('button', { onClick: () => saveToCloud(), className: "mt-6 w-full max-w-[450px] py-4 bg-cyan-600 rounded-xl font-bold hover:bg-cyan-500 transition shadow-lg" }, isSaving ? "GUARDANDO..." : "GUARDAR EN LA NUBE")
      ),

      React.createElement('aside', { className: "bg-neutral-900/40 border border-white/5 rounded-3xl p-6" },
        React.createElement('h3', { className: "text-[10px] text-neutral-600 font-bold mb-4 tracking-widest uppercase" }, "Glifos"),
        React.createElement('div', { className: "grid grid-cols-4 gap-2 h-[60vh] overflow-y-auto pr-2 custom-scrollbar" },
          TECLADO.map(t => {
            const has = fontData[t] && fontData[t].some(p => p === true);
            return React.createElement('button', {
              key: t, onClick: () => { saveToCloud(); setCurrentChar(t); setGrid(fontData[t] || Array(gridSize*gridSize).fill(false)); },
              className: `h-12 rounded-lg border text-sm font-bold transition-all ${currentChar === t ? 'bg-white text-black border-white' : has ? 'border-cyan-500/30 text-cyan-400 bg-cyan-900/20' : 'bg-black border-white/5 text-neutral-700'}`
            }, t);
          })
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
