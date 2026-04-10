import React, { useState, useEffect } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, increment, updateDoc } from 'firebase/firestore';

// Lista de teclas teclado Latinoamericano
const TECLADO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','ñ','o','p','q','r','s','t','u','v','w','x','y','z',
  '0','1','2','3','4','5','6','7','8','9',
  '¡','!','¿','?','@','#','$','%','&','(',')','=','+','-','*','/','.',',',';',':','_','<','>','[',']','{','}','^','~','`','\'','"','|','\\'
];

function App() {
  const [user, setUser] = useState(null);
  const [charActual, setCharActual] = useState('A');
  const [fuente, setFuente] = useState({}); // { 'A': [0,1...], 'B': [...] }
  const [grid, setGrid] = useState(Array(64).fill(false));

  // 1. Manejo de Sesión
  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
    // Contador de visitas global (opcional)
    const countRef = doc(db, "stats", "global");
    updateDoc(countRef, { visitas: increment(1) }).catch(() => {});
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  // 2. Lógica del Dibujo
  const togglePixel = (index) => {
    const nuevoGrid = [...grid];
    nuevoGrid[index] = !nuevoGrid[index];
    setGrid(nuevoGrid);
    
    // Auto-guardado en el estado local de la fuente
    setFuente({ ...fuente, [charActual]: nuevoGrid });
  };

  const cambiarLetra = (letra) => {
    setCharActual(letra);
    // Si ya existe dibujo para esa letra, lo carga. Si no, grid vacío.
    setGrid(fuente[letra] || Array(64).fill(false));
  };

  // 3. Guardar en Firebase
  const guardarEnFirebase = async () => {
    if (!user) return alert("Inicia sesión primero");
    try {
      await setDoc(doc(db, "fuentes", user.uid), {
        autor: user.displayName,
        mapa: fuente,
        ultimaActualizacion: new Date()
      }, { merge: true });
      alert("¡Fuente guardada en CodeShelf!");
    } catch (e) { console.error(e); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <h1 className="text-5xl font-bold mb-8 text-cyan-400">CodeShelf</h1>
        <button onClick={login} className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-cyan-400 transition">
          Entrar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200 p-4 md:p-8 font-mono">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-neutral-700 pb-4">
        <h1 className="text-2xl font-bold text-cyan-400">CodeShelf // Editor</h1>
        <div className="flex items-center gap-4">
          <span>{user.displayName}</span>
          <button onClick={logout} className="text-xs bg-red-900/30 text-red-400 p-2 rounded">Cerrar Sesión</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Lado Izquierdo: El Grid */}
        <div className="flex flex-col items-center">
          <div className="mb-4 text-xl">Editando: <span className="text-white bg-neutral-700 px-3 py-1 rounded">{charActual}</span></div>
          <div className="grid grid-cols-8 gap-1 bg-neutral-800 p-2 rounded shadow-2xl border border-neutral-700">
            {grid.map((active, i) => (
              <div 
                key={i} 
                onClick={() => togglePixel(i)}
                className={`w-8 h-8 md:w-12 md:h-12 cursor-pointer border border-neutral-700 transition-colors ${active ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-neutral-900 hover:bg-neutral-800'}`}
              />
            ))}
          </div>
          <button 
            onClick={guardarEnFirebase}
            className="mt-8 bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-3 rounded font-bold w-full"
          >
            GUARDAR TODO
          </button>
        </div>

        {/* Lado Derecho: Selector de Teclas */}
        <div className="bg-neutral-800 p-4 rounded border border-neutral-700 h-[500px] overflow-y-auto">
          <h2 className="mb-4 text-sm uppercase tracking-widest text-neutral-500">Selector de Teclado Latam</h2>
          <div className="flex flex-wrap gap-2">
            {TECLADO.map((t) => (
              <button
                key={t}
                onClick={() => cambiarLetra(t)}
                className={`w-10 h-10 rounded flex items-center justify-center border ${charActual === t ? 'bg-cyan-400 text-black border-white' : 'bg-neutral-900 border-neutral-700 hover:border-cyan-400'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
