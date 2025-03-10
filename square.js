document.addEventListener('DOMContentLoaded', async () => {
    const imageInput = document.getElementById('imageInput');
    const previewImage = document.getElementById('previewImage');
    const frameImage = document.getElementById('frameImage');
    const editorContainer = document.getElementById('editorContainer');
    const zoomInput = document.getElementById('zoomInput');
    const zoomValue = document.getElementById('zoomValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const imageContainer = document.querySelector('.image-container');
    const previewContainer = document.querySelector('.preview-container');

    let originalImage = null;
    let originalSize = 0;
    let cropX = 0;
    let cropY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let dragSensitivity = 1.5;
    let isFrameLoaded = false;
    let frameImageObj = null;

    // 預加載邊框圖片
    try {
        frameImageObj = new Image();
        frameImageObj.src = frameImage.src;
        await new Promise((resolve, reject) => {
            frameImageObj.onload = () => {
                isFrameLoaded = true;
                console.log('Frame image loaded');
                resolve();
            };
            frameImageObj.onerror = reject;
            if (frameImageObj.complete) {
                isFrameLoaded = true;
                resolve();
            }
        });
    } catch (error) {
        console.error('無法載入邊框圖片:', error);
    }

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                originalImage = new Image();
                originalImage.src = event.target.result;
                originalImage.onload = () => {
                    // 計算裁剪位置，使圖片從中心裁剪為正方形
                    originalSize = Math.min(originalImage.width, originalImage.height);
                    cropX = (originalImage.width - originalSize) / 2;
                    cropY = (originalImage.height - originalSize) / 2;
                    currentX = cropX;
                    currentY = cropY;
                    
                    // 重置縮放
                    zoomInput.value = 100;
                    updatePreview();
                    updateImageSize();
                    editorContainer.style.display = 'block';

                    // 更新拖曳靈敏度
                    dragSensitivity = Math.max(1, Math.min(2, originalImage.width / originalSize));
                };
            };
            reader.readAsDataURL(file);
        }
    });

    function updatePreview() {
        if (!originalImage) return;

        const zoom = parseInt(zoomInput.value) / 100;
        const containerSize = previewContainer.offsetWidth;
        const displaySize = containerSize * Math.max(1, zoom);

        // 更新圖片樣式
        previewImage.style.width = `${displaySize}px`;
        previewImage.style.height = `${displaySize}px`;
        previewImage.style.left = `${(containerSize - displaySize) / 2}px`;
        previewImage.style.top = `${(containerSize - displaySize) / 2}px`;
        
        // 創建一個臨時canvas來裁剪預覽圖片
        const tempCanvas = document.createElement('canvas');
        const scaledSize = originalSize / Math.max(zoom, 1);
        tempCanvas.width = originalSize;
        tempCanvas.height = originalSize;
        const tempCtx = tempCanvas.getContext('2d');

        // 設置黑色背景
        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, originalSize, originalSize);
        
        // 在臨時canvas上繪製裁剪後的圖片
        tempCtx.drawImage(
            originalImage,
            currentX, currentY,
            scaledSize, scaledSize,
            0, 0,
            originalSize, originalSize
        );
        
        // 將裁剪後的圖片設為預覽圖片的源
        previewImage.src = tempCanvas.toDataURL();
    }

    function updateImageSize() {
        if (originalImage) {
            const zoom = parseInt(zoomInput.value);
            zoomValue.textContent = `${zoom}%`;
            updatePreview();
        }
    }

    // 優化的拖曳功能
    previewContainer.addEventListener('mousedown', (e) => {
        if (!originalImage) return;
        
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        previewContainer.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = (e.clientX - lastMouseX) * dragSensitivity;
        const deltaY = (e.clientY - lastMouseY) * dragSensitivity;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // 計算當前縮放比例
        const zoom = parseInt(zoomInput.value) / 100;
        
        // 根據縮放比例調整移動範圍
        let newX = currentX - deltaX;
        let newY = currentY - deltaY;

        // 計算考慮縮放後的最大範圍
        const scaledSize = originalSize / Math.max(zoom, 1);
        const maxX = originalImage.width - scaledSize;
        const maxY = originalImage.height - scaledSize;

        // 使用 clamp 函數來限制範圍，允許負值以支持更大範圍的移動
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        newX = clamp(newX, -maxX, maxX);
        newY = clamp(newY, -maxY, maxY);

        if (newX !== currentX || newY !== currentY) {
            currentX = newX;
            currentY = newY;
            requestAnimationFrame(() => {
                updatePreview();
            });
        }
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        previewContainer.style.cursor = 'grab';
    });

    previewContainer.addEventListener('selectstart', (e) => {
        if (isDragging) e.preventDefault();
    });

    previewContainer.addEventListener('mouseover', () => {
        if (originalImage) {
            previewContainer.style.cursor = 'grab';
        }
    });

    previewContainer.addEventListener('mouseout', () => {
        if (!isDragging) {
            previewContainer.style.cursor = 'default';
        }
    });

    window.addEventListener('resize', updateImageSize);
    zoomInput.addEventListener('input', updateImageSize);

    downloadBtn.addEventListener('click', async () => {
        if (!originalImage || !isFrameLoaded) {
            alert('請等待圖片載入完成');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const totalSize = 800;
            canvas.width = totalSize;
            canvas.height = totalSize;

            // 設定透明背景
            ctx.clearRect(0, 0, totalSize, totalSize);

            const zoom = parseInt(zoomInput.value) / 100;
            const imageSize = Math.round(totalSize * 0.8);  // 圖片顯示區域大小
            
            // 根據縮放比例計算實際需要的圖片大小
            const scaledDisplaySize = imageSize * zoom;
            const scaledSize = originalSize / zoom;
            
            const centerX = totalSize / 2;
            const centerY = totalSize / 2;

            // 創建方形裁剪區域
            ctx.save();
            ctx.beginPath();
            const x = centerX - imageSize / 2;
            const y = centerY - imageSize / 2;
            ctx.rect(x, y, imageSize, imageSize);
            ctx.clip();

            // 計算源圖片的裁剪區域
            const sourceX = currentX + (originalSize - scaledSize) / 2;
            const sourceY = currentY + (originalSize - scaledSize) / 2;
            
            // 計算繪製位置，確保圖片中心點對齊預覽區域中心點
            const drawX = centerX - (scaledDisplaySize / 2);
            const drawY = centerY - (scaledDisplaySize / 2);
            
            ctx.drawImage(
                originalImage,
                sourceX, sourceY,
                scaledSize, scaledSize,
                drawX, drawY,
                scaledDisplaySize, scaledDisplaySize
            );
            ctx.restore();

            // 繪製邊框圖片
            ctx.drawImage(frameImageObj, 0, 0, totalSize, totalSize);

            const link = document.createElement('a');
            link.download = 'edited-image.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('下載圖片時發生錯誤:', error);
            alert('下載圖片時發生錯誤，請重試');
        }
    });
}); 