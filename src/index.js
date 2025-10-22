import dotenv from 'dotenv';
import { watchLocalFolder } from './watcher.js';
import { uploadFile, syncAll, deleteRemoteFile, closeClient } from './uploader.js';
import { addTask } from './ftpQueue.js';

dotenv.config({ quiet: true });

const LOCAL_DIR = process.env.LOCAL_DIR;
const HOST = process.env.FTP_HOST;

(async () => {
  console.log(`🚀 Iniciando sincronización FTP completa con ${HOST}`);

  // Paso 1: sincronización inicial en batches
  await syncAll(LOCAL_DIR, 500); // batch de 500 archivos

  // Paso 2: iniciar monitoreo en tiempo real usando la cola
  watchLocalFolder(
    LOCAL_DIR,
    (filePath) => addTask(async () => {
      console.log(`📂 Cambio detectado: ${filePath}`);
      await uploadFile(filePath);
    }),
    (filePath) => addTask(async () => {
      console.log(`🗑️ Eliminación detectada: ${filePath}`);
      await deleteRemoteFile(filePath);
    })
  );

  // Cerrar la conexión cuando la app se detenga
  process.on('exit', async () => await closeClient());
  process.on('SIGINT', async () => {
    await closeClient();
    process.exit();
  });
})();
