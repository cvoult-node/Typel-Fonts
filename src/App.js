import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import opentype from 'https://esm.sh/opentype.js';
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  doc, setDoc, getDocs, collection, query, orderBy, deleteDoc 
} from './firebase.js';

const TECLADO = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9',' ',',','.',':',';','!','?'];

function App() {
  // ESTADOS BÁSICOS
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoSize, setNuevoSize] = useState(8);
  
  // ESTADOS DEL PROYECTO
  const [proyectos, setProyectos] = useState([]);
  const [proyectoActivo, setProyectoActivo] = useState(null);
  const [setupMode, setSetupMode] = useState(true);
  
  // ESTADOS DEL EDITOR
  const [gridSize, setGridSize] = useState(8);
  const [currentChar, setCurrentChar] = useState('A');
  const [fontData, setFontData] = useState({}); 
  const [grid, setGrid] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 1. CARGA INICIAL DE PROYECTOS
  const cargarProyectos = async (u) => {
    try {
      const q = query(collection(db, "usuarios", u.uid, "proyectos"), orderBy("updatedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProyectos(lista);
    } catch (e) { console.error("Error cargando lista:", e); }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) cargarProyectos(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. FUNCIONES DE GESTIÓN (Dashboard)
  const confirmarNuevoProyecto = async () => {
      if (!nuevoNombre.trim()) return alert("Escribe un nombre para tu fuente");
      
      setIsSaving(true);
      try {
        const id = Date.now().toString();
        const ref = doc(db, "usuarios", user.uid, "proyectos", id);
        const inicial = { 
          nombre: nuevoNombre, 
          gridSize: nuevoSize, 
          font: {}, 
          updatedAt: new Date() 
        };
        
        await setDoc(ref, inicial);
        abrirProyecto({ id, ...inicial });
        cargarProyectos(user);
        
        // Resetear y cerrar modal
        setShowModal(false);
        setNuevoNombre("");
      } catch (e) {
        alert("Error al crear el proyecto");
      } finally {
        setIsSaving(false);
      }
    };

  const eliminarProyecto = async (id) => {
    if (!confirm("¿Borrar proyecto?")) return;
    await deleteDoc(doc(db, "usuarios", user.uid, "proyectos", id));
    cargarProyectos(user);
  };

  const abrirProyecto = (p) => {
    setProyectoActivo(p.id);
    setGridSize(p.gridSize);
    setFontData(p.font || {});
    setGrid(p.font[currentChar] || Array(p.gridSize * p.gridSize).fill(false));
    setSetupMode(false);
  };

  // 3. FUNCIONES DEL EDITOR
  const handleSaveFont = async (data = fontData) => {
    if (!user || !proyectoActivo) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "usuarios", user.uid, "proyectos", proyectoActivo), {
        font: data,
        gridSize: gridSize,
        updatedAt: new Date()
      }, { merge: true });
    } catch (e) { alert("Error al guardar"); }
    setIsSaving(false);
  };

  const updatePixel = (i, val) => {
    if (grid[i] === val) return;
    const newGrid = [...grid];
    newGrid[i] = val;
    setGrid(newGrid);
    const newFontData = { ...fontData, [currentChar]: newGrid };
    setFontData(newFontData);
  };

// 1. Mejoramos el cambio de letra para que sea instantáneo
  const switchChar = (char) => {
    if (currentChar === char) return;
    
    handleSaveFont();
    
    setCurrentChar(char);
    const nextGrid = fontData[char] || Array(gridSize * gridSize).fill(false);
    setGrid(nextGrid);
  };

  const clearCanvas = () => {
    if (confirm("¿Limpiar todo el dibujo de esta letra?")) {
      const empty = Array(gridSize * gridSize).fill(false);
      setGrid(empty);
      setFontData(prev => ({ ...prev, [currentChar]: empty }));
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

// --- SECCIÓN 4: VISTAS (RENDERIZADO) ---

  // 1. Pantalla de Carga
  if (loading) return React.createElement('div', { 
    className: "h-screen bg-black flex items-center justify-center text-cyan-400 font-mono tracking-widest animate-pulse" 
  }, "SISTEMA_INICIANDO...");

  // 2. Pantalla de Login
  if (!user) return React.createElement('div', { className: "h-screen bg-[#050505] flex items-center justify-center p-4 font-sans" },
    React.createElement('div', { className: "w-full max-w-sm bg-neutral-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl" },
      React.createElement('h1', { className: "text-4xl font-black text-center mb-2 text-white tracking-tighter" }, "CODE SHELF"),
      React.createElement('p', { className: "text-center text-neutral-500 text-[10px] mb-8 uppercase tracking-[0.3em]" }, "Typography Studio"),
      React.createElement('form', { 
        onSubmit: (e) => { 
          e.preventDefault(); 
          signInWithEmailAndPassword(auth, email, password).catch(() => createUserWithEmailAndPassword(auth, email, password)); 
        }, 
        className: "flex flex-col gap-3" 
      },
        React.createElement('input', { type: "email", placeholder: "Email", value: email, onChange: e => setEmail(e.target.value), className: "bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-cyan-500 transition-all" }),
        React.createElement('input', { type: "password", placeholder: "Password", value: password, onChange: e => setPassword(e.target.value), className: "bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-cyan-500 transition-all" }),
        React.createElement('button', { className: "bg-cyan-600 py-4 rounded-2xl font-black text-white hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 transition-all mt-2" }, "ENTRAR")
      ),
      React.createElement('div', { className: "relative my-8" },
        React.createElement('div', { className: "absolute inset-0 flex items-center" }, React.createElement('div', { className: "w-full border-t border-white/5" })),
        React.createElement('div', { className: "relative flex justify-center text-[10px]" }, React.createElement('span', { className: "bg-neutral-900 px-2 text-neutral-600 font-bold" }, "O TAMBIÉN"))
      ),
      React.createElement('button', { 
        onClick: () => signInWithPopup(auth, provider), 
        className: "w-full bg-white text-black py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all" 
      }, "GOOGLE")
    )
  );

  // 3. Pantalla de Proyectos (Dashboard)
  if (setupMode) return React.createElement('div', { className: "min-h-screen bg-[#050505] p-8 text-white font-sans" },
    React.createElement('div', { className: "max-w-6xl mx-auto" },
      React.createElement('header', { className: "flex justify-between items-center mb-12 border-b border-white/5 pb-8" },
        React.createElement('div', null,
          React.createElement('h1', { className: "text-4xl font-black text-cyan-400 tracking-tighter" }, "MIS PROYECTOS"),
          React.createElement('p', { className: "text-[10px] text-neutral-500 font-mono mt-1" }, "ESTUDIO DE TIPOGRAFÍA")
        ),
        React.createElement('button', { onClick: () => signOut(auth), className: "bg-neutral-900 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold hover:text-red-400 transition-all" }, "CERRAR SESIÓN")
      ),
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" },
        React.createElement('div', { 
          onClick: () => setShowModal(true), 
          className: "group border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center p-10 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all min-h-[220px]"
        },
          React.createElement('span', { className: "text-5xl text-neutral-700 group-hover:text-cyan-400 mb-3" }, "+"),
          React.createElement('span', { className: "text-[10px] font-black text-neutral-600 group-hover:text-cyan-400 uppercase tracking-widest" }, "Nuevo Diseño")
        ),
        proyectos.map(p => React.createElement('div', { key: p.id, className: "bg-neutral-900/40 border border-white/5 rounded-[2.5rem] p-8 hover:border-white/20 transition-all relative group overflow-hidden" },
          React.createElement('div', { className: "absolute -right-4 -top-4 text-7xl font-black text-white/5 italic select-none" }, p.gridSize),
          React.createElement('div', { className: "relative z-10" },
            React.createElement('h3', { className: "text-xl font-bold mb-2 truncate" }, p.nombre || "Sin nombre"),
            React.createElement('div', { className: "flex gap-3 mb-8" },
              React.createElement('span', { className: "text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full font-bold" }, `${p.gridSize}x${p.gridSize} PX`),
              React.createElement('span', { className: "text-[10px] bg-white/5 text-neutral-500 px-2 py-1 rounded-full font-bold" }, "CLOUD_SYNC")
            ),
            React.createElement('div', { className: "flex gap-2" },
              React.createElement('button', { onClick: () => abrirProyecto(p), className: "flex-1 bg-white text-black py-3 rounded-2xl font-black text-xs hover:bg-cyan-400 transition-colors" }, "ABRIR"),
              React.createElement('button', { onClick: (e) => { e.stopPropagation(); eliminarProyecto(p.id); }, className: "w-12 bg-neutral-800 flex items-center justify-center rounded-2xl hover:text-red-500 transition-colors" }, "🗑️")
            )
          )
        ))
      )
    ),
    showModal && React.createElement('div', { 
      className: "fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4",
      onClick: (e) => e.target === e.currentTarget && setShowModal(false)
    },
      React.createElement('div', { className: "bg-neutral-900 border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl" },
        React.createElement('h2', { className: "text-2xl font-black mb-8 text-center" }, "CONFIGURAR FUENTE"),
        React.createElement('div', { className: "mb-6" },
          React.createElement('label', { className: "text-[10px] text-neutral-500 font-bold uppercase mb-3 block" }, "Nombre"),
          React.createElement('input', { autoFocus: true, value: nuevoNombre, onChange: e => setNuevoNombre(e.target.value), className: "w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-cyan-400" })
        ),
        React.createElement('div', { className: "mb-10" },
          React.createElement('label', { className: "text-[10px] text-neutral-500 font-bold uppercase mb-3 block" }, "Resolución"),
          React.createElement('div', { className: "grid grid-cols-3 gap-3" },
            [8, 12, 16].map(s => React.createElement('button', { key: s, onClick: () => setNuevoSize(s), className: `py-4 rounded-2xl font-black text-xs transition-all ${nuevoSize === s ? 'bg-cyan-500 text-black' : 'bg-black border border-white/5 text-neutral-400'}` }, `${s}x${s}`))
          )
        ),
        React.createElement('div', { className: "flex gap-3" },
          React.createElement('button', { onClick: () => setShowModal(false), className: "flex-1 py-4 text-neutral-500 font-bold" }, "ATRÁS"),
          React.createElement('button', { onClick: confirmarNuevoProyecto, disabled: !nuevoNombre.trim(), className: "flex-1 bg-white text-black py-4 rounded-2xl font-black" }, "CREAR")
        )
      )
    )
  );

  // 4. Pantalla del Editor (Principal)
  return React.createElement('div', { className: "min-h-screen bg-black text-white font-sans" },
    React.createElement('nav', { className: "p-4 border-b border-white/5 flex justify-between items-center backdrop-blur-md bg-black/50 sticky top-0 z-40" },
      React.createElement('button', { onClick: () => setSetupMode(true), className: "bg-neutral-900 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-neutral-800 transition-all" }, "📂 PROYECTOS"),
      React.createElement('div', { className: "flex items-center gap-2" },
        React.createElement('div', { className: "w-2 h-2 rounded-full bg-cyan-400 animate-pulse" }),
        React.createElement('span', { className: "font-black text-cyan-400 tracking-tighter" }, "CODE SHELF")
      ),
      React.createElement('button', { onClick: exportTTF, className: "bg-cyan-600 px-6 py-2 rounded-xl text-[10px] font-black hover:bg-cyan-500 transition-all" }, "EXPORTAR TTF")
    ),
    React.createElement('main', { className: "p-6 max-w-6xl mx-auto grid lg:grid-cols-[1fr_350px] gap-8" },
      React.createElement('section', { className: "flex flex-col items-center justify-center bg-neutral-900/20 rounded-[3rem] border border-white/5 p-8" },
        React.createElement('div', { className: "mb-6 text-6xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]" }, currentChar),
        React.createElement('div', { 
          className: "grid bg-neutral-800/50 relative p-2 rounded-2xl border-4 border-neutral-800 shadow-2xl", 
          style: { gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'min(80vw, 450px)', height: 'min(80vw, 450px)', gap: '1px' },
          onMouseDown: () => setIsDrawing(true), onMouseUp: () => setIsDrawing(false), onMouseLeave: () => setIsDrawing(false)
        },
          grid.map((a, i) => React.createElement('div', {
            key: i, 
            onMouseEnter: () => isDrawing && updatePixel(i, true), 
            onMouseDown: () => updatePixel(i, !a),
            className: `w-full h-full transition-all duration-75 ${a ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'bg-black hover:bg-neutral-800'}`
          }))
        ),
        React.createElement('button', { 
          onClick: () => handleSaveFont(), 
          className: `mt-8 w-full max-w-[450px] py-4 rounded-[2rem] font-black transition-all ${isSaving ? 'bg-neutral-800 text-neutral-500' : 'bg-cyan-600 hover:bg-cyan-500'}` 
        }, isSaving ? "GUARDANDO..." : "GUARDAR CAMBIOS")
      ),
      React.createElement('aside', { className: "bg-neutral-900/50 border border-white/5 rounded-[2.5rem] p-6 backdrop-blur-xl h-fit" },
        React.createElement('div', { className: "flex justify-between items-center mb-6" },
          React.createElement('h3', { className: "text-[10px] font-black tracking-[0.2em] text-neutral-500 uppercase" }, "Caracteres"),
          React.createElement('button', { onClick: clearCanvas, className: "text-[10px] text-red-400 hover:bg-red-500/10 px-2 py-1 rounded font-bold" }, "LIMPIAR")
        ),
        React.createElement('div', { className: "grid grid-cols-4 gap-2 h-[60vh] overflow-y-auto pr-2 custom-scrollbar" },
          TECLADO.map(t => {
            const isConfigured = fontData && fontData[t] && fontData[t].some(p => p === true);
            return React.createElement('button', {
              key: t, onClick: () => switchChar(t),
              className: `relative h-14 rounded-xl border-2 transition-all flex items-center justify-center font-bold text-lg ${currentChar === t ? 'bg-cyan-500 border-cyan-400 text-black' : isConfigured ? 'border-cyan-900/30 bg-cyan-900/10 text-cyan-400' : 'border-white/5 bg-black/40 text-neutral-600 hover:border-white/10'}`
            }, t, isConfigured && currentChar !== t && React.createElement('div', { className: "absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" }));
          })
        )
      )
    )
  );
} // <--- FIN DE LA FUNCIÓN App

// RENDERIZADO FINAL EN EL DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
