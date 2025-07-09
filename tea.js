let gameState = {
    selectedTea: 'green',
    temperature: 80,
    optimalTemp: 80,
    brewTime: 3,
    currentStep: 'leaves', // leaves, water, brewing, complete
    timer: 0,
    teaCount: 0,
    perfectCount: 0,
    selectedAccessories: new Set(),
    brewing: false,
    leavesInPot: 0,
    hasWater: false
};

const teaColors = {
    green: '#90EE90',
    black: '#8B4513',
    oolong: '#DAA520',
    white: '#F5F5DC',
    'pu-erh': '#A0522D'
};

const zenQuotes = [
    "Tea is a cup of life",
    "In every drop, find serenity",
    "Patience makes the perfect brew",
    "The way of tea is the way of peace",
    "Mindfulness begins with the first sip",
    "Tea time is me time",
    "Breathe in the aroma, breathe out stress",
    "Each cup is a small meditation"
];

// --- Consolidated Drag State Variables ---
let isDragging = false;
let dragElement = null;
let dragOffset = { x: 0, y: 0 };

function updateZenQuote() {
    const quote = zenQuotes[Math.floor(Math.random() * zenQuotes.length)];
    document.getElementById('zenQuote').textContent = `"${quote}"`;
}

function setupTeaSelection() {
    document.querySelectorAll('.tea-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.tea-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            
            gameState.selectedTea = this.dataset.tea;
            gameState.optimalTemp = parseInt(this.dataset.temp);
            gameState.brewTime = parseInt(this.dataset.time);
            
            document.getElementById('tempSlider').value = gameState.optimalTemp;
            updateTemperature();
            
            updateTeaLeaves();
            resetBrewing();
        });
    });
}

function updateTeaLeaves() {
    const leaves = document.querySelectorAll('.tea-leaf');
    leaves.forEach(leaf => {
        leaf.className = `tea-leaf ${gameState.selectedTea}`;
    });
}

function setupDragAndDrop() {
    // Tea leaves
    document.querySelectorAll('.tea-leaf').forEach(leaf => {
        leaf.addEventListener('mousedown', startDrag);
        leaf.addEventListener('touchstart', startDrag);
    });

    // Kettle
    const kettle = document.getElementById('kettle');
    kettle.addEventListener('mousedown', startDrag);
    kettle.addEventListener('touchstart', startDrag);

    // Global move and up events
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, { passive: false }); // prevent scrolling on touch
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
}

function startDrag(e) {
    if (e.target.closest('.tea-leaf')?.style.display === 'none') return;
    e.preventDefault();

    isDragging = true;
    dragElement = e.target.closest('.tea-leaf') || e.target.closest('.kettle');
    
    const rect = dragElement.getBoundingClientRect();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    // --- FIX FOR THE JUMPING KETTLE ---
    let initialLeft = rect.left;
    let initialTop = rect.top;

    // If the dragged element is the kettle, it gets scaled, so we must correct its position.
    if (dragElement.id === 'kettle') {
        const scale = 1.1; // from the .dragging class CSS
        const widthIncrease = rect.width * (scale - 1);
        const heightIncrease = rect.height * (scale - 1);
        // The position shifts by half the size increase because transform-origin is center
        initialLeft -= widthIncrease / 2;
        initialTop -= heightIncrease / 2;
    }
    
    dragOffset.x = clientX - initialLeft;
    dragOffset.y = clientY - initialTop;

    dragElement.classList.add('dragging');

    // Apply the calculated position
    dragElement.style.left = initialLeft + 'px';
    dragElement.style.top = initialTop + 'px';
}

function handleDragMove(e) {
    if (!isDragging || !dragElement) return;
    e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    dragElement.style.left = (clientX - dragOffset.x) + 'px';
    dragElement.style.top = (clientY - dragOffset.y) + 'px';
    
    const teapotRect = document.getElementById('teapot').getBoundingClientRect();
    const isOverTeapot = clientX >= teapotRect.left && clientX <= teapotRect.right &&
                       clientY >= teapotRect.top && clientY <= teapotRect.bottom;
    
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.toggle('drag-over', isOverTeapot);
}

function handleDragEnd(e) {
    if (!isDragging || !dragElement) return;

    const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;
    
    const teapotRect = document.getElementById('teapot').getBoundingClientRect();
    const isOverTeapot = clientX >= teapotRect.left && clientX <= teapotRect.right &&
                       clientY >= teapotRect.top && clientY <= teapotRect.bottom;
    
    // Reset inline styles to let CSS handle positioning again
    dragElement.style.left = '';
    dragElement.style.top = '';
    
    if (dragElement.classList.contains('tea-leaf') && isOverTeapot) {
        addLeafToPot(dragElement);
        dragElement.style.display = 'none';
        gameState.leavesInPot++;
        updateBrewingState();
    } else if (dragElement.id === 'kettle' && isOverTeapot && gameState.leavesInPot > 0) {
        pourWater();
    }
    
    dragElement.classList.remove('dragging');
    document.getElementById('dropZone').classList.remove('drag-over');
    
    isDragging = false;
    dragElement = null;
}

function addLeafToPot(leafElement) {
    const potLeaves = document.getElementById('potTeaLeaves');
    const newLeaf = document.createElement('div');
    newLeaf.className = `pot-tea-leaf ${gameState.selectedTea}`;
    newLeaf.style.background = getComputedStyle(leafElement).background;
    newLeaf.style.animationDelay = Math.random() * 0.3 + 's';
    
    potLeaves.appendChild(newLeaf);
    showCompletionMessage('🌿 Perfect! Tea leaf added with care');
}

function pourWater() {
    if (gameState.hasWater) return;
    
    const kettle = document.getElementById('kettle');
    const waterStream = document.getElementById('waterStream');
    
    kettle.classList.add('pouring');
    waterStream.classList.add('flowing');
    
    setTimeout(() => {
        const liquid = document.getElementById('teaLiquid');
        liquid.style.height = '70px';
        liquid.style.backgroundColor = teaColors[gameState.selectedTea];
        
        gameState.hasWater = true;
        updateBrewingState();
        
        showCompletionMessage(`💧 Water poured at ${gameState.temperature}°C`);
        
        setTimeout(() => {
            kettle.classList.remove('pouring');
            waterStream.classList.remove('flowing');
        }, 1000);
        
    }, 500);
}

function updateBrewingState() {
    const startBtn = document.getElementById('startBrewBtn');
    const timerDisplay = document.getElementById('timerDisplay');
    
    if (gameState.leavesInPot === 0) {
        timerDisplay.textContent = 'Add tea leaves first';
        startBtn.disabled = true;
    } else if (!gameState.hasWater) {
        timerDisplay.textContent = 'Pour water with the kettle';
        startBtn.disabled = true;
    } else {
        timerDisplay.textContent = 'Ready to brew!';
        startBtn.disabled = false;
    }
}

function setupControls() {
    document.getElementById('tempSlider').addEventListener('input', updateTemperature);
    document.getElementById('startBrewBtn').addEventListener('click', startBrewing);
    document.getElementById('resetBtn').addEventListener('click', resetBrewing);
    
    document.querySelectorAll('.accessory-item').forEach(item => {
        item.addEventListener('click', function() {
            const bonus = this.dataset.bonus;
            if (gameState.selectedAccessories.has(bonus)) {
                gameState.selectedAccessories.delete(bonus);
                this.classList.remove('selected');
            } else {
                gameState.selectedAccessories.add(bonus);
                this.classList.add('selected');
            }
        });
    });
}

function updateTemperature() {
    gameState.temperature = parseInt(document.getElementById('tempSlider').value);
    document.getElementById('tempDisplay').textContent = gameState.temperature + '°C';
}

function startBrewing() {
    if (gameState.leavesInPot === 0 || !gameState.hasWater) return;
    
    gameState.currentStep = 'brewing';
    gameState.brewing = true;
    gameState.timer = gameState.brewTime;
    
    const startBtn = document.getElementById('startBrewBtn');
    startBtn.disabled = true;
    startBtn.classList.add('active');
    startBtn.textContent = 'Brewing...';
    
    document.getElementById('teapot').classList.add('brewing');
    
    let brewTimeModifier = 1;
    if (gameState.selectedAccessories.has('music')) {
        brewTimeModifier = 0.95;
    }
    
    const interval = setInterval(() => {
        gameState.timer -= 0.1 / brewTimeModifier; // Note: faster means dividing by a smaller interval time
        
        if (gameState.timer <= 0) {
            clearInterval(interval);
            completeBrewing();
        } else {
            const minutes = Math.floor(gameState.timer / 60);
            const seconds = Math.floor(gameState.timer % 60);
            document.getElementById('timerDisplay').textContent = 
                `Brewing: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 100);
}

function completeBrewing() {
    gameState.brewing = false;
    gameState.currentStep = 'complete';
    gameState.teaCount++;
    
    document.getElementById('teapot').classList.remove('brewing');
    document.getElementById('timerDisplay').textContent = 'Brewing complete!';
    
    setTimeout(() => {
        const cupTea = document.getElementById('cupTea');
        cupTea.style.height = '60px';
        cupTea.style.backgroundColor = teaColors[gameState.selectedTea];
        
        const tempDiff = Math.abs(gameState.temperature - gameState.optimalTemp);
        let quality = 100 - (tempDiff * 2);
        
        if (gameState.leavesInPot >= 3 && gameState.leavesInPot <= 6) {
            quality += 5;
        } else if (gameState.leavesInPot < 3) {
            quality -= 10;
        } else {
            quality -= 5;
        }
        
        if (gameState.selectedAccessories.has('patience')) quality += 10;
        quality = Math.min(100, Math.max(0, quality));
        
        const isPerfect = quality >= 95;
        if (isPerfect) {
            gameState.perfectCount++;
        }
        
        let message = `🍵 ${gameState.selectedTea.charAt(0).toUpperCase() + gameState.selectedTea.slice(1)} tea complete!\n`;
        message += `Leaves used: ${gameState.leavesInPot}\n`;
        message += `Quality: ${Math.round(quality)}%`;
        if (isPerfect) message += '\n✨ Perfect brew achieved!';
        
        showCompletionMessage(message);
        updateStats();
        updateZenQuote();
        
        setTimeout(resetBrewing, 4000);
        
    }, 1000);
}

function resetBrewing() {
    gameState.currentStep = 'leaves';
    gameState.brewing = false;
    gameState.timer = 0;
    gameState.leavesInPot = 0;
    gameState.hasWater = false;
    
    const startBtn = document.getElementById('startBrewBtn');
    startBtn.disabled = true;
    startBtn.classList.remove('active');
    startBtn.textContent = 'Start Brewing';
    
    document.getElementById('teaLiquid').style.height = '0';
    document.getElementById('cupTea').style.height = '0';
    document.getElementById('timerDisplay').textContent = 'Add tea leaves first';
    document.getElementById('potTeaLeaves').innerHTML = '';
    
    document.querySelectorAll('.tea-leaf').forEach(leaf => {
        leaf.style.display = 'inline-block';
    });
    
    gameState.selectedAccessories.clear();
    document.querySelectorAll('.accessory-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    updateBrewingState();
}

function updateStats() {
    document.getElementById('teaCount').textContent = gameState.teaCount;
    document.getElementById('perfectCount').textContent = gameState.perfectCount;
    
    let level = 'Novice';
    if (gameState.perfectCount >= 15) level = 'Tea Master';
    else if (gameState.perfectCount >= 10) level = 'Tea Artisan';
    else if (gameState.perfectCount >= 5) level = 'Tea Enthusiast';
    else if (gameState.teaCount >= 10) level = 'Tea Student';
    else if (gameState.teaCount >= 5) level = 'Tea Apprentice';
    
    document.getElementById('masterLevel').textContent = level;
}

function showCompletionMessage(message) {
    const existingMessage = document.querySelector('.completion-message');
    if (existingMessage) existingMessage.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'completion-message';
    messageDiv.style.whiteSpace = 'pre-wrap'; // To respect \n in the message
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}

// --- Initialize Game ---
setupTeaSelection();
setupDragAndDrop();
setupControls();
updateTemperature();
updateTeaLeaves();
updateZenQuote();
updateBrewingState();

setInterval(updateZenQuote, 10000);

document.getElementById('teaCup').addEventListener('click', function() {
    if (gameState.currentStep === 'complete') {
        this.style.transform = 'scale(1.1) rotateZ(-5deg)';
        setTimeout(() => {
            this.style.transform = 'scale(1.05)';
            showCompletionMessage('😌 Ahh... perfect sip of serenity');
        }, 200);
    }
});

document.addEventListener('dragstart', (e) => e.preventDefault());
document.addEventListener('selectstart', function(e) {
    if (e.target.closest('.tea-leaf') || e.target.closest('.kettle')) {
        e.preventDefault();
    }
});