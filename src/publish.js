// ─────────────────────────────────────────────
//  publish.js
//  Publica una fuente en la colección pública
//  'posts' de Firestore.
// ─────────────────────────────────────────────
import { db } from './firebase.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Publica o actualiza un post público para un proyecto.
 * Usa el proyectoId como ID del post (solo 1 post por proyecto).
 *
 * @param {Object} user  - Firebase Auth user
 * @param {Object} proyecto - { id, nombre, gridSize, font }
 * @param {string} previewText - Texto de preview
 * @returns {Promise<string>} - ID del post creado/actualizado
 */
export async function publishFont(user, proyecto, previewText = 'HELLO') {
  // Cargar perfil del autor
  let autorNombre = '';
  let autorBio    = '';
  let avatarColor = '#e62222';
  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid, 'config', 'perfil'));
    if (snap.exists()) {
      autorNombre = snap.data().displayName || '';
      autorBio    = snap.data().bio || '';
      avatarColor = snap.data().avatarColor || '#e62222';
    }
  } catch {}

  const postId = proyecto.id; // 1 post por proyecto
  const postRef = doc(db, 'posts', postId);

  const data = {
    uid:          user.uid,
    autorEmail:   user.email || '',
    autorNombre:  autorNombre || user.email?.split('@')[0] || 'Anónimo',
    autorBio,
    avatarColor,
    fontNombre:   proyecto.nombre || 'Sin nombre',
    gridSize:     proyecto.gridSize || 8,
    font:         proyecto.font || {},
    proyectoId:   proyecto.id,
    previewText,
    publishedAt:  serverTimestamp(),
  };

  await setDoc(postRef, data, { merge: false });
  return postId;
}
