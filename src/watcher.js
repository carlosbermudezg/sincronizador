import chokidar from 'chokidar';

export function watchLocalFolder(folderPath, onChange, onDelete) {
  const watcher = chokidar.watch(folderPath, {
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on('add', onChange);
  watcher.on('change', onChange);
  watcher.on('unlink', onDelete);

  console.log(`👀 Observando cambios en: ${folderPath}`);
}
