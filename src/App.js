import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc 
} from './firebase.js';

// Teclado Latinoamericano completo (Punto de entrada para el diseño)
const TECLADO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z',
  '0','1','2','3','4','5','6','7','8','9',
  '¡','!','¿','?','@','#','$','%','&','(',')','=','+','-','*','/','.',',',';',':','_','<','>','[',']','{','}','^','~','`','\'','"','|','\\'
];

function App() {
  // Estados de Usuario
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Estados del Editor
  const [currentChar, setCurrentChar] = useState('A');
  const [fontData, setFontData] = useState({}); // Guarda todos los caracteres
  const [grid, setGrid] = useState(Array(64).fill(false)); // Grid actual 8x8

  // 1. Efecto para detectar el estado de la sesión
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Funciones de Autenticación
  const handleGoogleLogin = () => signInWithPopup(auth, provider);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      // Intentamos iniciar sesión
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      // Si el usuario no existe, lo creamos automáticamente (Registro rápido)
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (regError) {
          alert("Error de registro: " + regError.message);
        }
      } else {
        alert("Error de acceso: " + error.message);
      }
    }
  };

  // 3. Lógica del Editor de Píxeles
  const togglePixel = (i) => {
    const newGrid = [...grid];
    newGrid[i] = !newGrid[i];
    setGrid(newGrid);
    // Actualizamos la "estantería" de la fuente
    setFontData(prev => ({ ...prev, [currentChar]: newGrid }));
  };

  const switchChar = (char) => {
    setCurrentChar(char);
    // Cargamos el dibujo guardado o un grid limpio
    setGrid(fontData[char] || Array(64).fill(false));
  };

  const handleSaveFont = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, "fuentes", user.uid), {
        author: user.displayName || user.email,
        font: fontData,
        lastUpdated: new Date()
      }, { merge: true });
      alert("¡Fuente guardada en CodeShelf!");
    } catch (e) {
      console.error(e);
      alert("Error al guardar en la base de datos.");
    }
  };

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400" }, "Cargando CodeShelf...");

  // PANTALLA DE LOGIN
  if (!user) {
    return React.createElement('div', { className: "h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 font-sans" },
      React.createElement('h1', { className: "text-6xl text-cyan-400 mb-2 font-bold tracking-tighter" }, "CODE SHELF"),
      React.createElement('p', { className: "text-neutral-500 mb-10 italic" }, "Pixel Font Social Studio"),

      React.createElement('form', { onSubmit: handleEmailAuth, className: "flex flex-col gap-3 w-full max-w-sm mb-6" },
        React.createElement('input', { 
          type: "email", placeholder: "Correo electrónico", value: email,
          onChange: (e) => setEmail(e.target.value),
          className: "bg-neutral-900 border border-neutral-800 p-4 rounded-lg focus:outline-none focus:border-cyan-400 transition"
        }),
        React.createElement('input', { 
          type: "password", placeholder: "Contraseña", value: password,
          onChange: (e) => setPassword(e.target.value),
          className: "bg-neutral-900 border border-neutral-800 p-4 rounded-lg focus:outline-none focus:border-cyan-400 transition"
        }),
        React.createElement('button', { type: "submit", className: "bg-cyan-600 hover:bg-cyan-500 p-4 rounded-lg font-bold transition shadow-lg shadow-cyan-900/20" }, "ENTRAR / UNIRSE")
      ),

      React.createElement('div', { className: "flex items-center gap-4 mb-6 w-full max-w-sm text-neutral-700" },
        React.createElement('hr', { className: "flex-1 border-neutral-800" }), "o", React.createElement('hr', { className: "flex-1 border-neutral-800" })
      ),

      React.createElement('button', { 
        onClick: handleGoogleLogin,
        className: "bg-white text-black px-8 py-4 rounded-lg font-bold hover:bg-cyan-400 transition w-full max-w-sm flex items-center justify-center gap-2" 
      }, "CONTINUAR CON GOOGLE")
    );
  }

  // PANTALLA DEL EDITOR
  return React.createElement('div', { className: "min-h-screen p-4 md:p-10 bg-neutral-950 text-neutral-200" },
    // Header
    React.createElement('header', { className: "flex justify-between items-center mb-10 max-w-6xl mx-auto border-b border-neutral-900 pb-6" },
      React.createElement('div', null,
        React.createElement('h1', { className: "text-2xl font-bold text-cyan-400" }, "CODE SHELF // EDITOR"),
        React.createElement('span', { className: "text-xs text-neutral-600" }, `User: ${user.email}`)
      ),
      React.createElement('button', { onClick: () => signOut(auth), className: "bg-red-900/10 text-red-500 border border-red-900/30 px-4 py-2 rounded text-xs hover:bg-red-900/20" }, "CERRAR SESIÓN")
    ),

    // Dashboard
    React.createElement('div', { className: "max-w-6xl mx-auto grid lg:grid-cols-2 gap-16" },
      
      // Panel de Dibujo (Izquierda)
      React.createElement('div', { className: "flex flex-col items-center" },
        React.createElement('div', { className: "mb-6 text-3xl font-mono text-white" }, 
          "Letra: ", React.createElement('span', { className: "bg-neutral-800 px-6 py-2 rounded-md border border-neutral-700 text-cyan-400" }, currentChar)
        ),
        
        React.createElement('div', { className: "grid grid-cols-8 gap-1 bg-neutral-900 p-3 rounded-xl border border-neutral-800 shadow-2xl" },
          grid.map((active, i) => React.createElement('div', {
            key: i,
            onClick: () => togglePixel(i),
            className: `w-10 h-10 md:w-14 md:h-14 cursor-pointer border border-black transition-all duration-100 ${active ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-neutral-950 hover:bg-neutral-800'}`
          }))
        ),

        React.createElement('div', { className: "mt-10 flex gap-4 w-full" },
          React.createElement('button', { 
            onClick: () => { setGrid(Array(64).fill(false)); setFontData(p => ({...p, [currentChar]: Array(64).fill(false)})); },
            className: "flex-1 bg-neutral-800 py-4 rounded-xl border border-neutral-700 font-bold hover:bg-neutral-700" 
          }, "LIMPIAR"),
          React.createElement('button', { 
            onClick: handleSaveFont,
            className: "flex-[2] bg-cyan-600 py-4 rounded-xl font-bold text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/30" 
          }, "GUARDAR FUENTE")
        )
      ),

      // Selector de Teclado (Derecha)
      React.createElement('div', { className: "bg-neutral-900/30 p-8 rounded-2xl border border-neutral-900 h-fit" },
        React.createElement('h3', { className: "text-xs uppercase tracking-[0.2em] text-neutral-600 mb-8 font-bold" }, "Teclado Latinoamericano"),
        React.createElement('div', { className: "flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-2" },
          TECLADO.map(t => React.createElement('button', {
            key: t,
            onClick: () => switchChar(t),
            className: `w-11 h-11 flex items-center justify-center rounded-lg border transition-all ${currentChar === t ? 'bg-cyan-400 text-black border-white scale-110' : 'bg-neutral-900 border-neutral-800 hover:border-cyan-400 text-neutral-400'}`
          }, t))
        )
      )
    )
  );
}

// Renderizado final
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
