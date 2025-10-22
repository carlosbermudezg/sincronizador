import ftp from 'basic-ftp';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const { FTP_HOST, FTP_USER, FTP_PASS, REMOTE_DIR, LOCAL_DIR } = process.env;

export async function deleteRemoteFile(filePath) {
  const client = new ftp.Client();
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

    const relPath = path.relative(LOCAL_DIR, filePath).replace(/\\/g, '/');
    const remotePath = `${REMOTE_DIR}/${relPath}`;

    await client.remove(remotePath);
    console.log(`🗑️ Eliminado remoto: ${relPath}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo eliminar ${filePath}: ${err.message}`);
  } finally {
    client.close();
  }
}
