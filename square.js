document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('imageInput');
    const previewImage = document.getElementById('previewImage');
    const previewContainer = document.querySelector('.preview-container');
    const editorContainer = document.getElementById('editorContainer');
    const zoomInput = document.getElementById('zoomInput');
    const zoomValue = document.getElementById('zoomValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const frameImage = document.getElementById('frameImage');

    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;
    let scale = 1;
    let originalImageAspectRatio = 1;

    // 圖片上傳處理
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    originalImageAspectRatio = img.width / img.height;
                    previewImage.src = e.target.result;
                    editorContainer.style.display = 'block';
                    resetImagePosition();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 觸控事件處理
    function handleTouchStart(e) {
        if (e.touches && e.touches.length === 1) {
            isDragging = true;
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
            previewImage.style.cursor = 'grabbing';
        }
    }

    function handleTouchMove(e) {
        if (isDragging && e.touches && e.touches.length === 1) {
            e.preventDefault();
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTransform();
        }
    }

    function handleTouchEnd() {
        isDragging = false;
        previewImage.style.cursor = 'grab';
    }

    // 滑鼠事件處理
    function handleMouseDown(e) {
        isDragging = true;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        previewImage.style.cursor = 'grabbing';
    }

    function handleMouseMove(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTransform();
        }
    }

    function handleMouseUp() {
        isDragging = false;
        previewImage.style.cursor = 'grab';
    }

    function setTransform() {
        // 限制拖曳範圍
        const containerRect = previewContainer.getBoundingClientRect();
        const imageRect = previewImage.getBoundingClientRect();
        
        // 計算最大可移動範圍
        const maxX = (imageRect.width * scale - containerRect.width) / 2;
        const maxY = (imageRect.height * scale - containerRect.height) / 2;
        
        // 限制移動範圍
        xOffset = Math.min(Math.max(xOffset, -maxX), maxX);
        yOffset = Math.min(Math.max(yOffset, -maxY), maxY);

        previewImage.style.transform = `translate(${xOffset}px, ${yOffset}px) scale(${scale})`;
    }

    // 縮放處理
    zoomInput.addEventListener('input', function() {
        scale = this.value / 100;
        zoomValue.textContent = this.value + '%';
        setTransform();
    });

    // 重置圖片位置
    function resetImagePosition() {
        xOffset = 0;
        yOffset = 0;
        scale = 1;
        zoomInput.value = 100;
        zoomValue.textContent = '100%';
        
        // 根據圖片比例調整初始縮放
        const containerRect = previewContainer.getBoundingClientRect();
        const containerAspectRatio = containerRect.width / containerRect.height;
        
        if (originalImageAspectRatio > containerAspectRatio) {
            // 圖片較寬，以高度為基準
            scale = containerRect.height / (containerRect.width / originalImageAspectRatio);
        } else {
            // 圖片較高，以寬度為基準
            scale = containerRect.width / (containerRect.height * originalImageAspectRatio);
        }
        
        // 更新縮放值
        zoomInput.value = Math.round(scale * 100);
        zoomValue.textContent = Math.round(scale * 100) + '%';
        
        setTransform();
    }

    // 下載處理
    downloadBtn.addEventListener('click', async function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 800; // 輸出大小
        canvas.width = size;
        canvas.height = size;

        // 設定白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        // 計算裁剪區域
        const containerRect = previewContainer.getBoundingClientRect();
        const imageRect = previewImage.getBoundingClientRect();

        // 繪製圖片
        const drawImage = () => {
            const aspectRatio = previewImage.naturalWidth / previewImage.naturalHeight;
            let drawWidth = size * scale;
            let drawHeight = drawWidth / aspectRatio;
            
            if (drawHeight < size * scale) {
                drawHeight = size * scale;
                drawWidth = drawHeight * aspectRatio;
            }

            const drawX = size/2 - drawWidth/2 + (xOffset * size / containerRect.width);
            const drawY = size/2 - drawHeight/2 + (yOffset * size / containerRect.height);

            ctx.drawImage(previewImage, drawX, drawY, drawWidth, drawHeight);
        };

        drawImage();

        // 等待邊框圖片載入
        await new Promise((resolve) => {
            if (frameImage.complete) {
                resolve();
            } else {
                frameImage.onload = resolve;
            }
        });

        // 繪製邊框
        ctx.drawImage(frameImage, 0, 0, size, size);

        // 下載圖片
        const link = document.createElement('a');
        link.download = 'binance-avatar.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });

    // 添加事件監聽器
    previewContainer.addEventListener('mousedown', handleMouseDown);
    previewContainer.addEventListener('mousemove', handleMouseMove);
    previewContainer.addEventListener('mouseup', handleMouseUp);
    previewContainer.addEventListener('mouseleave', handleMouseUp);

    // 觸控事件
    previewContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    previewContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    previewContainer.addEventListener('touchend', handleTouchEnd);

    // 設定初始游標樣式
    previewImage.style.cursor = 'grab';

    // 防止預設的觸控行為（如滾動）
    previewContainer.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
        }
    }, { passive: false });
}); 