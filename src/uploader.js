import ftp from 'basic-ftp';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { FTP_HOST, FTP_USER, FTP_PASS, REMOTE_DIR, LOCAL_DIR } = process.env;

let client;

// 🔹 Conectar o reconectar
async function connectClient() {
  if (!client) {
    client = new ftp.Client();
    client.ftp.verbose = false;
  }
  if (!client.closed) return client;

  try {
    await client.access({
      host: FTP_HOST,
      port: 21,
      user: FTP_USER,
      password: FTP_PASS,
      secure: true,
      secureOptions: { rejectUnauthorized: false },
      passive: true,
    });
    await client.ensureDir(REMOTE_DIR);
    return client;
  } catch (err) {
    client.close();
    client = null;
    throw err;
  }
}

// 🔹 Subir un archivo con reconexión automática
export async function uploadFile(filePath) {
    try {
      await connectClient();
      const relPath = path.relative(LOCAL_DIR, filePath).replace(/\\/g, '/');
      const remotePath = `${REMOTE_DIR}/${relPath}`;
      const remoteDir = path.dirname(remotePath);
  
      await client.ensureDir(remoteDir);
  
      // 🔹 Revisar si el archivo ya existe
      const existingFiles = await client.list(remoteDir);
      const fileName = path.basename(remotePath);
      const exists = existingFiles.some(f => f.name === fileName);
  
      if (exists) {
        // console.log(`ℹ️ Saltado (ya existe): ${relPath}`);
        return;
      }
  
      await client.uploadFrom(filePath, remotePath);
      console.log(`✅ Subido: ${relPath}`);
    } catch (err) {
      console.error(`❌ Error subiendo ${filePath}: ${err.message}. Reintentando...`);
      client?.close();
      client = null;
      await uploadFile(filePath); // reintento simple
    }
}  

// 🔹 Eliminar archivo remoto con reconexión
export async function deleteRemoteFile(filePath) {
  try {
    await connectClient();
    const relPath = path.relative(LOCAL_DIR, filePath).replace(/\\/g, '/');
    const remotePath = `${REMOTE_DIR}/${relPath}`;
    await client.remove(remotePath);
    console.log(`🗑️ Eliminado remoto: ${relPath}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo eliminar ${filePath}: ${err.message}. Reintentando...`);
    client?.close();
    client = null;
    await deleteRemoteFile(filePath);
  }
}

// 🔹 Subida inicial por batches
export async function syncAll(localDir, batchSize = 500) {
  console.log('📤 Sincronizando todos los archivos locales por batches...');

  const allFiles = [];

  async function collectFiles(dir, base = '') {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relPath = path.join(base, file).replace(/\\/g, '/');
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await collectFiles(fullPath, relPath);
      } else {
        allFiles.push(fullPath);
      }
    }
  }

  await collectFiles(localDir);

  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    console.log(`🔹 Subiendo batch ${i / batchSize + 1} (${batch.length} archivos)...`);
    for (const file of batch) {
      await uploadFile(file);
    }
  }

  console.log('🎉 Sincronización completa terminada.');
}

// 🔹 Cerrar conexión
export async function closeClient() {
  if (client) {
    client.close();
    client = null;
    console.log('🔌 Conexión FTP cerrada.');
  }
}
