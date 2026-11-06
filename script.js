document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadLink = document.getElementById('upload-link');
  const selectFilesBtn = document.getElementById('select-files-btn');
  const fileListContainer = document.getElementById('file-list-container');
  const fileList = document.getElementById('file-list');
  const convertBtn = document.getElementById('convert-btn');
  const convertingSpinner = document.getElementById('converting-spinner');
  const convertText = document.getElementById('convert-text');
  const resultsList = document.getElementById('results-list');
  const downloadAllBtn = document.getElementById('download-all-btn');

  const supportedExtensions = new Set(['heic', 'heif', 'webp', 'png', 'jpg', 'jpeg']);
  let filesToConvert = [];
  let convertedBlobs = [];
  let zipLoader;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** exponent).toFixed(exponent ? 1 : 0)} ${units[exponent]}`;
  };

  const extensionOf = (file) => file.name.split('.').pop().toLowerCase();
  const isHeic = (file) => ['heic', 'heif'].includes(extensionOf(file)) || /heic|heif/.test(file.type);
  const fileKey = (file) => `${file.name}:${file.size}:${file.lastModified}`;

  const revokeResultUrls = () => {
    convertedBlobs.forEach((result) => result.url && URL.revokeObjectURL(result.url));
  };

  const setResultsMessage = (message) => {
    resultsList.replaceChildren();
    const paragraph = document.createElement('p');
    paragraph.className = 'initial-message';
    paragraph.textContent = message;
    resultsList.append(paragraph);
  };

  const updateControls = () => {
    fileListContainer.classList.toggle('hidden', filesToConvert.length === 0);
    convertBtn.disabled = filesToConvert.length === 0 || convertBtn.dataset.busy === 'true';
    if (!filesToConvert.length) {
      downloadAllBtn.classList.add('hidden');
      setResultsMessage('Conversion results will appear here.');
    }
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const uniqueDownloadName = (file, usedNames) => {
    const base = file.name.replace(/\.[^/.]+$/, '') || 'image';
    let name = `${base}.jpg`;
    let index = 2;
    while (usedNames.has(name)) {
      name = `${base}-${index++}.jpg`;
    }
    usedNames.add(name);
    return name;
  };

  const renderFiles = () => {
    revokeResultUrls();
    convertedBlobs = [];
    fileList.replaceChildren();

    filesToConvert.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';

      const info = document.createElement('div');
      info.className = 'file-item-info';

      const name = document.createElement('span');
      name.className = 'file-item-name';
      name.textContent = file.name;
      name.title = file.name;

      const size = document.createElement('span');
      size.className = 'file-item-size';
      size.textContent = formatBytes(file.size);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-download';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.addEventListener('click', () => {
        filesToConvert.splice(index, 1);
        renderFiles();
        updateControls();
      });

      info.append(name);
      item.append(info, size, remove);
      fileList.append(item);
    });

    if (filesToConvert.length) setResultsMessage('Ready to convert.');
  };

  const addFiles = (fileListLike) => {
    const seen = new Set(filesToConvert.map(fileKey));
    const rejected = [];
    const added = [];

    for (const file of Array.from(fileListLike)) {
      const extension = extensionOf(file);
      if (!supportedExtensions.has(extension)) {
        rejected.push(file.name);
      } else if (!seen.has(fileKey(file))) {
        seen.add(fileKey(file));
        added.push(file);
      }
    }

    filesToConvert.push(...added);
    if (added.length) renderFiles();
    updateControls();
    fileInput.value = '';

    if (rejected.length) {
      alert(`Unsupported file type: ${rejected.join(', ')}. Please choose HEIC, HEIF, WebP, PNG, or JPEG files.`);
    }
  };

  const blobFromCanvas = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not create a JPEG.')), 'image/jpeg', 0.95);
  });

  const nativeToJpeg = async (file) => {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0);
        return await blobFromCanvas(canvas);
      } finally {
        bitmap.close?.();
      }
    }

    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('This image could not be decoded by your browser.'));
        element.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      return await blobFromCanvas(canvas);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const heicToJpeg = async (file) => {
    if (typeof window.heic2any !== 'function') {
      throw new Error('The HEIC converter did not load. Check your connection and try again.');
    }
    const converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
    return Array.isArray(converted) ? converted[0] : converted;
  };

  const convertOne = async (file, usedNames) => {
    try {
      const blob = isHeic(file) ? await heicToJpeg(file) : await nativeToJpeg(file);
      return {
        originalName: file.name,
        downloadName: uniqueDownloadName(file, usedNames),
        blob,
        success: true,
      };
    } catch (error) {
      console.error('Conversion failed for', file.name, error);
      return {
        originalName: file.name,
        error: error instanceof Error ? error.message : 'Unknown conversion error.',
        success: false,
      };
    }
  };

  const renderResults = () => {
    resultsList.replaceChildren();

    convertedBlobs.forEach((result) => {
      const item = document.createElement('div');
      item.className = `result-item ${result.success ? 'success' : 'error'}`;

      const name = document.createElement('span');
      name.className = 'result-item-name';
      name.textContent = result.originalName;
      name.title = result.originalName;

      const status = document.createElement('span');
      status.className = `result-status ${result.success ? 'status-ok' : 'status-error'}`;
      status.textContent = result.success ? `Converted · ${formatBytes(result.blob.size)}` : result.error;

      item.append(name, status);

      if (result.success) {
        result.url = URL.createObjectURL(result.blob);
        const download = document.createElement('a');
        download.className = 'btn-download';
        download.href = result.url;
        download.download = result.downloadName;
        download.textContent = 'Download JPG';
        item.append(download);
      }

      resultsList.append(item);
    });

    downloadAllBtn.classList.toggle('hidden', !convertedBlobs.some((result) => result.success));
  };

  const loadJSZip = () => {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (zipLoader) return zipLoader;

    zipLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.async = true;
      script.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('JSZip loaded without exposing its API.'));
      script.onerror = () => reject(new Error('Could not load the ZIP helper. Check your connection and try again.'));
      document.head.append(script);
    });
    return zipLoader;
  };

  const downloadAll = async () => {
    const successful = convertedBlobs.filter((result) => result.success);
    if (!successful.length) return;

    downloadAllBtn.disabled = true;
    const originalLabel = downloadAllBtn.textContent;
    downloadAllBtn.textContent = 'Creating ZIP…';

    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();
      successful.forEach((result) => zip.file(result.downloadName, result.blob));
      const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      triggerDownload(archive, 'converted-images.zip');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not create the ZIP archive.');
    } finally {
      downloadAllBtn.disabled = false;
      downloadAllBtn.textContent = originalLabel;
    }
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });
  ['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover')));
  ['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover')));
  dropZone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
  dropZone.addEventListener('click', (event) => {
    if (event.target === dropZone) fileInput.click();
  });
  uploadLink.addEventListener('click', (event) => {
    event.preventDefault();
    fileInput.click();
  });
  selectFilesBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (event) => addFiles(event.target.files));

  convertBtn.addEventListener('click', async () => {
    if (!filesToConvert.length) return;

    revokeResultUrls();
    convertedBlobs = [];
    convertBtn.dataset.busy = 'true';
    updateControls();
    convertText.textContent = 'Converting…';
    convertingSpinner.classList.remove('hidden');
    setResultsMessage(`Converting 0 of ${filesToConvert.length}…`);

    const usedNames = new Set();
    for (const [index, file] of filesToConvert.entries()) {
      convertedBlobs.push(await convertOne(file, usedNames));
      renderResults();
      const progress = document.createElement('p');
      progress.className = 'initial-message';
      progress.textContent = `Converted ${index + 1} of ${filesToConvert.length}.`;
      resultsList.prepend(progress);
    }

    convertBtn.dataset.busy = 'false';
    convertText.textContent = 'Convert to JPG';
    convertingSpinner.classList.add('hidden');
    updateControls();
  });

  downloadAllBtn.addEventListener('click', downloadAll);
  window.addEventListener('beforeunload', revokeResultUrls);
  updateControls();
});