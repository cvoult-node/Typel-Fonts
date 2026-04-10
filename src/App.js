import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import opentype from 'https://esm.sh/opentype.js';
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc 
} from './firebase.js';

// Constantes globales
const TECLADO = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9',' ',',','.',':',';','!','?'];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(true);
  const [gridSize, setGridSize] = useState(8);
  const [fontData, setFontData] = useState({});
  const [currentChar, setCurrentChar] = useState('A');
  const [grid, setGrid] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Efecto de carga inicial
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await getDoc(doc(db, "fuentes", u.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFontData(data.font || {});
          setGridSize(data.gridSize || 8);
          setSetupMode(false);
          setGrid(data.font?.['A'] || Array(Math.pow(data.gridSize || 8, 2)).fill(false));
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Función para crear proyecto nuevo
  const startProject = (size) => {
    setGridSize(size);
    setGrid(Array(size * size).fill(false));
    setSetupMode(false);
  };

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400 font-mono" }, "VERIFICANDO_SISTEMA...");

  // Renderizado Condicional: LOGIN
  if (!user) {
    return (
      React.createElement('div', { className: "h-screen flex items-center justify-center bg-[#050505] p-4" },
        React.createElement('div', { className: "w-full max-w-md bg-neutral-900/50 border border-white/10 p-8 rounded-3xl backdrop-blur-md" },
          React.createElement('h1', { className: "text-4xl font-black text-white text-center mb-8" }, "CODE SHELF"),
          React.createElement('form', { 
            onSubmit: async (e) => {
              e.preventDefault();
              try { await signInWithEmailAndPassword(auth, email, password); } 
              catch { await createUserWithEmailAndPassword(auth, email, password); }
            },
            className: "flex flex-col gap-4" 
          },
            React.createElement('input', { type: "email", placeholder: "Email", value: email, onChange: e => setEmail(e.target.value), className: "bg-black border border-white/5 p-4 rounded-xl text-white outline-none focus:border-cyan-500" }),
            React.createElement('input', { type: "password", placeholder: "Contraseña", value: password, onChange: e => setPassword(e.target.value), className: "bg-black border border-white/5 p-4 rounded-xl text-white outline-none focus:border-cyan-500" }),
            React.createElement('button', { className: "bg-cyan-600 py-4 rounded-xl font-bold" }, "ACCEDER")
          ),
          React.createElement('button', { onClick: () => signInWithPopup(auth, provider), className: "w-full bg-white text-black py-4 rounded-xl font-bold mt-4" }, "GOOGLE LOGIN")
        )
      )
    );
  }

  // Renderizado Condicional: SELECTOR DE TAMAÑO
  if (setupMode) {
    return (
      React.createElement('div', { className: "h-screen bg-black flex flex-col items-center justify-center text-white" },
        React.createElement('h2', { className: "text-2xl font-black mb-8 text-cyan-400" }, "RESOLUCIÓN DEL LIENZO"),
        React.createElement('div', { className: "grid grid-cols-2 gap-4" },
          [8, 10, 12, 16].map(size => (
            React.createElement('button', {
              key: size,
              onClick: () => startProject(size),
              className: "w-32 h-32 bg-neutral-900 border border-white/10 rounded-2xl hover:border-cyan-500 flex flex-col items-center justify-center transition-all"
            }, 
              React.createElement('span', { className: "text-2xl font-bold" }, `${size}x${size}`),
              React.createElement('span', { className: "text-[10px] text-neutral-500" }, "PIXELS")
            )
          ))
        )
      )
    );
  }

  // Si llegamos aquí, mostramos el EDITOR (que te daré en el siguiente mensaje)
  return React.createElement('div', null, "Cargando Editor Principal...");
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
