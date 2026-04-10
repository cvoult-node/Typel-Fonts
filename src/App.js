import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import { 
  auth, provider, db, signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc 
} from './firebase.js';

const TECLADO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z',
  '0','1','2','3','4','5','6','7','8','9',
  '¡','!','¿','?','@','#','$','%','&','(',')','=','+','-','*','/','.',',',';',':','_','<','>','[',']','{','}','^','~','`','\'','"','|','\\'
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [currentChar, setCurrentChar] = useState('A');
  const [fontData, setFontData] = useState({}); 
  const [grid, setGrid] = useState(Array(64).fill(false));

  // Cargar datos de Firebase al iniciar sesión
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "fuentes", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const savedFont = docSnap.data().font || {};
          setFontData(savedFont);
          if (savedFont['A']) setGrid(savedFont['A']);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (regError) { alert("Error: " + regError.message); }
      } else { alert("Error: " + error.message); }
    }
  };

  const togglePixel = (i) => {
    const newGrid = [...grid];
    newGrid[i] = !newGrid[i];
    setGrid(newGrid);
    setFontData(prev => ({ ...prev, [currentChar]: newGrid }));
  };

  const switchChar = (char) => {
    setCurrentChar(char);
    setGrid(fontData[char] || Array(64).fill(false));
  };

  const handleSaveFont = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "fuentes", user.uid), {
        author: user.displayName || user.email,
        font: fontData,
        lastUpdated: new Date()
      }, { merge: true });
      alert("✅ Fuente guardada");
    } catch (e) {
      alert("❌ Error al guardar. Revisa las Reglas de Firestore.");
    }
    setIsSaving(false);
  };

  if (loading) return React.createElement('div', { className: "h-screen bg-black flex items-center justify-center text-cyan-400 font-bold" }, "CARGANDO CODESHELF...");

  if (!user) {
    return React.createElement('div', { className: "h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6" },
      React.createElement('h1', { className: "text-6xl text-cyan-400 mb-2 font-bold tracking-tighter" }, "CODE SHELF"),
      React.createElement('form', { onSubmit: handleEmailAuth, className: "flex flex-col gap-3 w-full max-w-sm mt-8" },
        React.createElement('input', { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), className: "bg-neutral-900 border border-neutral-800 p-4 rounded-lg outline-none focus:border-cyan-400" }),
        React.createElement('input', { type: "password", placeholder: "Contraseña", value: password, onChange: (e) => setPassword(e.target.value), className: "bg-neutral-900 border border-neutral-800 p-4 rounded-lg outline-none focus:border-cyan-400" }),
        React.createElement('button', { type: "submit", className: "bg-cyan-600 p-4 rounded-lg font-bold hover:bg-cyan-500" }, "ENTRAR / REGISTRAR")
      ),
      React.createElement('button', { onClick: () => signInWithPopup(auth, provider), className: "mt-4 bg-white text-black px-8 py-4 rounded-lg font-bold w-full max-w-sm" }, "GOOGLE LOGIN")
    );
  }

  return React.createElement('div', { className: "min-h-screen p-6 bg-neutral-950 text-neutral-200" },
    React.createElement('header', { className: "flex justify-between items-center max-w-6xl mx-auto mb-10 border-b border-neutral-900 pb-6" },
      React.createElement('h1', { className: "text-2xl font-bold text-cyan-400" }, "CODE SHELF"),
      React.createElement('button', { onClick: () => signOut(auth), className: "text-red-500 text-sm" }, "CERRAR SESIÓN")
    ),

    React.createElement('div', { className: "max-w-6xl mx-auto grid lg:grid-cols-2 gap-10" },
      React.createElement('div', { className: "flex flex-col items-center" },
        React.createElement('div', { className: "mb-6 text-2xl font-mono text-cyan-400" }, `Editando: ${currentChar}`),
        React.createElement('div', { className: "grid grid-cols-8 gap-1 bg-neutral-900 p-2 rounded border border-neutral-800 shadow-xl" },
          grid.map((active, i) => React.createElement('div', {
            key: i,
            onClick: () => togglePixel(i),
            className: `w-10 h-10 md:w-12 md:h-12 cursor-pointer border border-black ${active ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-neutral-950 hover:bg-neutral-800'}`
          }))
        ),
        React.createElement('button', { 
          onClick: handleSaveFont, 
          disabled: isSaving,
          className: `mt-8 w-full py-4 rounded-xl font-bold transition ${isSaving ? 'bg-neutral-700' : 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/20'}` 
        }, isSaving ? "GUARDANDO..." : "GUARDAR EN LA NUBE")
      ),

      React.createElement('div', { className: "bg-neutral-900/30 p-6 rounded-2xl border border-neutral-900" },
        React.createElement('h3', { className: "text-xs text-neutral-600 mb-6 font-bold uppercase tracking-widest" }, "Selector de Caracteres"),
        React.createElement('div', { className: "flex flex-wrap gap-2 h-[400px] overflow-y-auto" },
          TECLADO.map(t => {
            const tieneDibujo = fontData[t] && fontData[t].some(p => p === true);
            return React.createElement('button', {
              key: t,
              onClick: () => switchChar(t),
              className: `w-10 h-10 flex items-center justify-center rounded border transition-all ${
                currentChar === t ? 'bg-cyan-400 text-black border-white' : 
                tieneDibujo ? 'border-cyan-600 text-cyan-600 bg-cyan-900/10' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
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
