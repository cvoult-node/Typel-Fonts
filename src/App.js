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

// --- VISTAS (RENDERIZADO) ---

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400 font-mono" }, "SISTEMA_INICIANDO...");

  if (!user) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center p-4" },
    React.createElement('div', { className: "w-full max-w-sm bg-neutral-900 p-8 rounded-3xl border border-white/10" },
      React.createElement('h1', { className: "text-3xl font-black text-center mb-6 text-white" }, "CODE SHELF"),
      React.createElement('form', { 
        onSubmit: (e) => { 
          e.preventDefault(); 
          signInWithEmailAndPassword(auth, email, password).catch(() => createUserWithEmailAndPassword(auth, email, password)); 
        }, 
        className: "flex flex-col gap-3" 
      },
        React.createElement('input', { type: "email", placeholder: "Email", value: email, onChange: e => setEmail(e.target.value), className: "bg-black border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-400" }),
        React.createElement('input', { type: "password", placeholder: "Password", value: password, onChange: e => setPassword(e.target.value), className: "bg-black border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-400" }),
        React.createElement('button', { className: "bg-cyan-600 py-3 rounded-xl font-bold text-white hover:bg-cyan-500" }, "ENTRAR / REGISTRAR")
      ),
      React.createElement('button', { onClick: () => signInWithPopup(auth, provider), className: "w-full bg-white text-black py-3 rounded-xl font-bold mt-3" }, "GOOGLE")
    )
  );

// MODAL DE CONFIGURACIÓN
      showModal && React.createElement('div', { className: "fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" },
        React.createElement('div', { className: "bg-neutral-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl" },
          React.createElement('h2', { className: "text-2xl font-bold mb-8 text-center" }, "CONFIGURAR FUENTE"),
          
          // Campo de Nombre
          React.createElement('div', { className: "mb-8" },
            React.createElement('label', { className: "text-[10px] text-neutral-500 font-bold uppercase tracking-widest block mb-3" }, "Nombre del Proyecto"),
            React.createElement('input', { 
              autoFocus: true,
              value: nuevoNombre,
              onChange: e => setNuevoNombre(e.target.value),
              placeholder: "Ej: MyPixelFont",
              className: "w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-cyan-500 transition-colors"
            })
          ),

          // Selector de Cuadrícula
          React.createElement('div', { className: "mb-10" },
            React.createElement('label', { className: "text-[10px] text-neutral-500 font-bold uppercase tracking-widest block mb-3" }, "Resolución (Grid)"),
            React.createElement('div', { className: "grid grid-cols-3 gap-3" },
              [8, 12, 16].map(s => React.createElement('button', {
                key: s,
                onClick: () => setNuevoSize(s),
                className: `py-3 rounded-xl font-bold transition-all ${nuevoSize === s ? 'bg-cyan-500 text-black' : 'bg-black text-white border border-white/5'}`
              }, `${s}x${s}`))
            )
          ),

          // Botones de Acción
          React.createElement('div', { className: "flex gap-3" },
            React.createElement('button', { 
              onClick: () => setShowModal(false),
              className: "flex-1 py-4 text-neutral-500 font-bold hover:text-white transition-colors"
            }, "CANCELAR"),
            React.createElement('button', { 
              onClick: confirmarNuevoProyecto,
              className: "flex-1 bg-white text-black py-4 rounded-2xl font-black hover:bg-cyan-400 transition-colors"
            }, "EMPEZAR")
          )
        )
      )
  return React.createElement('div', { className: "min-h-screen bg-black text-white" },
    React.createElement('nav', { className: "p-4 border-b border-white/5 flex justify-between items-center" },
      React.createElement('button', { onClick: () => setSetupMode(true), className: "bg-neutral-800 px-4 py-2 rounded-lg text-xs" }, "📂 PROYECTOS"),
      React.createElement('span', { className: "font-black text-cyan-400" }, "CODE SHELF"),
      React.createElement('button', { onClick: exportTTF, className: "bg-cyan-600 px-4 py-2 rounded-lg text-xs font-bold" }, "EXPORTAR TTF")
    ),
    React.createElement('main', { className: "p-6 max-w-6xl mx-auto grid lg:grid-cols-[1fr_350px] gap-8" },
      React.createElement('section', { className: "flex flex-col items-center" },
        React.createElement('div', { className: "mb-4 text-4xl font-black text-cyan-400" }, currentChar),
        React.createElement('div', { 
          className: "grid bg-neutral-900 relative p-1", 
          style: { gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'min(85vw, 450px)', height: 'min(85vw, 450px)', gap: '1px' },
          onMouseDown: () => setIsDrawing(true), onMouseUp: () => setIsDrawing(false), onMouseLeave: () => setIsDrawing(false)
        },
          grid.map((a, i) => React.createElement('div', {
            key: i, 
            onMouseEnter: () => isDrawing && updatePixel(i, true), 
            onMouseDown: () => updatePixel(i, !a),
            className: `w-full h-full transition-all ${a ? 'bg-cyan-400' : 'bg-black hover:bg-neutral-800'}`
          }))
        ),
        React.createElement('button', { onClick: () => handleSaveFont(), className: "mt-6 w-full max-w-[450px] py-4 bg-cyan-600 rounded-xl font-bold" }, isSaving ? "GUARDANDO..." : "GUARDAR CAMBIOS")
      ),
      React.createElement('aside', { className: "bg-neutral-900/80 border border-white/5 rounded-[2rem] p-6 backdrop-blur-xl" },
        React.createElement('div', { className: "flex justify-between items-center mb-6" },
          React.createElement('h3', { className: "text-[10px] font-black tracking-[0.2em] text-neutral-500 uppercase" }, "Mapa de Caracteres"),
          React.createElement('button', { onClick: clearCanvas, className: "text-[10px] text-red-400 hover:bg-red-500/10 px-2 py-1 rounded" }, "LIMPIAR")
        ),
        React.createElement('div', { className: "grid grid-cols-4 gap-2 h-[65vh] overflow-y-auto pr-2 custom-scrollbar" },
          TECLADO.map(t => {
            const isConfigured = fontData[t] && fontData[t].some(p => p === true);
            return React.createElement('button', {
              key: t, 
              onClick: () => switchChar(t),
              className: `relative group h-14 rounded-xl border-2 transition-all flex items-center justify-center font-bold text-lg ${
                currentChar === t 
                  ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                  : isConfigured 
                    ? 'border-cyan-900/50 bg-cyan-900/10 text-cyan-400' 
                    : 'border-white/5 bg-black/40 text-neutral-600 hover:border-white/20'
              }`
            }, 
              t,
              isConfigured && currentChar !== t && React.createElement('div', { 
                className: "absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" 
              })
            );
          })
        )
      )
    )
  );
} // <--- CIERRE DE LA FUNCIÓN App

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
