// Помоги сестренке - Игра три в ряд
// Main game logic

class AudioManager {
    constructor() {
        this.bgMusic = document.getElementById('bg-music');
        this.matchSound = document.getElementById('match-sound');
        this.comboSound = document.getElementById('combo-sound');
        this.audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
        this.setupAudioControls();
    }

    setupAudioControls() {
        const audioToggle = document.getElementById('audio-toggle');
        audioToggle.addEventListener('click', () => this.toggleAudio());
        this.updateAudioButton();
        
        if (this.audioEnabled) {
            // Try to play background music (will be blocked until user interaction)
            this.bgMusic.volume = 0.3;
        }
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        localStorage.setItem('audioEnabled', this.audioEnabled);
        
        if (this.audioEnabled) {
            this.bgMusic.play().catch(() => {
                // Autoplay blocked, will play on first user interaction
            });
        } else {
            this.bgMusic.pause();
        }
        
        this.updateAudioButton();
    }

    updateAudioButton() {
        const audioToggle = document.getElementById('audio-toggle');
        audioToggle.textContent = this.audioEnabled ? '🔊' : '🔇';
        audioToggle.classList.toggle('muted', !this.audioEnabled);
    }

    playMatchSound() {
        if (this.audioEnabled) {
            this.matchSound.currentTime = 0;
            this.matchSound.play().catch(() => {});
        }
    }

    playComboSound() {
        if (this.audioEnabled) {
            this.comboSound.currentTime = 0;
            this.comboSound.play().catch(() => {});
        }
    }

    startBackgroundMusic() {
        if (this.audioEnabled) {
            this.bgMusic.play().catch(() => {});
        }
    }
}

class PreLoader {
    constructor() {
        this.assetsToLoad = [
            'assets/gem_red.png',
            'assets/gem_blue.png',
            'assets/gem_green.png',
            'assets/gem_purple.png',
            'assets/gem_yellow.png',
            'assets/gem_pink.png',
            'assets/gem_orange.png',
            'assets/gem_cyan.png',
            'assets/character_main.png',
            'assets/character_full_1.png',
            'assets/character_full_2.png',
            'assets/character_full_3.png',
            'assets/background_main.png',
            'assets/preloader_character.png',
            'assets/bg_music.wav',
            'assets/match_sound.wav',
            'assets/combo_sound.wav'
        ];
        this.loadedAssets = 0;
        this.totalAssets = this.assetsToLoad.length;
    }

    async loadAssets() {
        document.body.classList.add('loading');
        
        const promises = this.assetsToLoad.map(asset => this.loadAsset(asset));
        
        try {
            await Promise.all(promises);
            this.onLoadComplete();
        } catch (error) {
            console.warn('Some assets failed to load:', error);
            this.onLoadComplete();
        }
    }

    loadAsset(src) {
        return new Promise((resolve) => {
            if (src.endsWith('.wav')) {
                // Load audio
                const audio = new Audio(src);
                audio.addEventListener('canplaythrough', () => {
                    this.updateProgress();
                    resolve();
                });
                audio.addEventListener('error', () => {
                    this.updateProgress();
                    resolve(); // Don't fail on audio errors
                });
            } else {
                // Load image
                const img = new Image();
                img.onload = () => {
                    this.updateProgress();
                    resolve();
                };
                img.onerror = () => {
                    this.updateProgress();
                    resolve(); // Don't fail on image errors
                };
                img.src = src;
            }
        });
    }

    updateProgress() {
        this.loadedAssets++;
        const percentage = Math.round((this.loadedAssets / this.totalAssets) * 100);
        
        const progressFill = document.querySelector('.progress-fill-preloader');
        const percentageText = document.querySelector('.preloader-percentage');
        
        if (progressFill) progressFill.style.width = percentage + '%';
        if (percentageText) percentageText.textContent = percentage + '%';
    }

    onLoadComplete() {
        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            preloader.classList.add('hidden');
            document.body.classList.remove('loading');
            
            // Initialize game after preloader
            setTimeout(() => {
                window.game = new Match3Game();
            }, 500);
        }, 1000);
    }
}

class Match3Game {
    constructor() {
        this.boardSize = 8;
        this.gemTypes = ['red', 'blue', 'green', 'purple', 'yellow', 'pink', 'orange', 'cyan'];
        this.board = [];
        this.score = 0;
        this.level = 1;
        this.moves = 30;
        this.targetScore = 1000;
        this.selectedCell = null;
        this.animating = false;
        this.gameState = 'playing'; // 'playing', 'paused', 'victory', 'gameover'
        this.hints = 3;
        this.shuffles = 2;
        this.comboCount = 0;
        this.idleTime = 0;
        this.hintShown = false;
        this.tutorialShown = localStorage.getItem('tutorialShown') === 'true';
        this.idleTimer = null;
        
        this.audioManager = new AudioManager();
        this.initGame();
    }

    initGame() {
        this.board = [];
        this.score = 0;
        this.level = 1;
        this.moves = this.getMovesForLevel(this.level);
        this.targetScore = this.getTargetScoreForLevel(this.level);
        this.selectedCell = null;
        this.animating = false;
        this.gameState = 'playing';
        this.hints = 3;
        this.shuffles = 2;
        this.comboCount = 0;
        this.idleTime = 0;
        this.hintShown = false;
        
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        this.bindEvents();
        
        // Start idle timer for hints
        this.startIdleTimer();
        
        // Start background music
        this.audioManager.startBackgroundMusic();
        
        // Show tutorial if first time
        if (!this.tutorialShown) {
            setTimeout(() => this.showTutorial(), 1000);
        }
        
        this.showWelcomeMessage();
    }

    getMovesForLevel(level) {
        // Gradually decrease moves as level increases
        const baseMoves = 30;
        const reduction = Math.floor((level - 1) / 3); // Reduce by 1 every 3 levels
        return Math.max(15, baseMoves - reduction); // Minimum 15 moves
    }

    getTargetScoreForLevel(level) {
        // Gradually increase target score
        return 1000 + (level - 1) * 500;
    }

    startIdleTimer() {
        if (this.idleTimer) clearInterval(this.idleTimer);
        this.idleTime = 0;
        this.hintShown = false;
        
        this.idleTimer = setInterval(() => {
            if (this.gameState === 'playing' && !this.animating) {
                this.idleTime++;
                if (this.idleTime >= 5 && !this.hintShown && this.hints > 0) {
                    this.showAutoHint();
                    this.hintShown = true;
                }
            }
        }, 1000);
    }

    resetIdleTimer() {
        this.idleTime = 0;
        this.hintShown = false;
    }

    showTutorial() {
        const modal = document.createElement('div');
        modal.className = 'modal tutorial-modal';
        modal.innerHTML = `
            <div class="modal-content tutorial-content">
                <div class="tutorial-character">
                    <img src="assets/character_full_1.png" alt="Аниме девочка">
                </div>
                <div class="tutorial-text">
                    <h2>Привет, онэ-тян! 💖</h2>
                    <p>Я покажу тебе, как играть!</p>
                    <div class="tutorial-step" id="tutorial-step-1">
                        <p>Кликни на кристалл, чтобы выбрать его</p>
                        <div class="tutorial-hand">👆</div>
                    </div>
                    <div class="tutorial-step hidden" id="tutorial-step-2">
                        <p>Теперь кликни на соседний кристалл, чтобы поменять их местами</p>
                        <div class="tutorial-hand">👆</div>
                    </div>
                </div>
                <button class="btn btn-primary tutorial-next" onclick="game.nextTutorialStep()">Понятно!</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.tutorialStep = 1;
        this.gameState = 'tutorial';
    }

    nextTutorialStep() {
        if (this.tutorialStep === 1) {
            document.getElementById('tutorial-step-1').classList.add('hidden');
            document.getElementById('tutorial-step-2').classList.remove('hidden');
            this.tutorialStep = 2;
        } else {
            this.closeTutorial();
        }
    }

    closeTutorial() {
        const modal = document.querySelector('.tutorial-modal');
        if (modal) modal.remove();
        
        localStorage.setItem('tutorialShown', 'true');
        this.tutorialShown = true;
        this.gameState = 'playing';
    }

    showAutoHint() {
        const possibleMoves = this.findPossibleMoves();
        if (possibleMoves.length > 0) {
            const move = possibleMoves[0];
            this.highlightHintMove(move);
        }
    }

    highlightHintMove(move) {
        const cell1 = document.querySelector(`[data-row="${move.from.row}"][data-col="${move.from.col}"]`);
        const cell2 = document.querySelector(`[data-row="${move.to.row}"][data-col="${move.to.col}"]`);
        
        if (cell1 && cell2) {
            // Add animated hand pointer
            this.showAnimatedHand(cell1, cell2);
            
            // Highlight cells
            cell1.classList.add('hint-highlight');
            cell2.classList.add('hint-highlight');
            
            setTimeout(() => {
                cell1.classList.remove('hint-highlight');
                cell2.classList.remove('hint-highlight');
                this.removeAnimatedHand();
            }, 3000);
        }
    }

    showAnimatedHand(cell1, cell2) {
        const hand = document.createElement('div');
        hand.className = 'animated-hand';
        hand.innerHTML = '👆';
        
        const rect1 = cell1.getBoundingClientRect();
        const rect2 = cell2.getBoundingClientRect();
        
        hand.style.position = 'fixed';
        hand.style.left = rect1.left + rect1.width / 2 + 'px';
        hand.style.top = rect1.top + rect1.height / 2 + 'px';
        hand.style.fontSize = '24px';
        hand.style.zIndex = '1000';
        hand.style.pointerEvents = 'none';
        hand.style.animation = 'handPulse 1s infinite';
        
        document.body.appendChild(hand);
        
        // Animate to second cell
        setTimeout(() => {
            hand.style.transition = 'all 1s ease-in-out';
            hand.style.left = rect2.left + rect2.width / 2 + 'px';
            hand.style.top = rect2.top + rect2.height / 2 + 'px';
        }, 1000);
    }

    removeAnimatedHand() {
        const hand = document.querySelector('.animated-hand');
        if (hand) hand.remove();
    }

    createBoard() {
        this.board = [];
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = this.getRandomGem();
            }
        }
        
        // Убираем начальные совпадения
        this.removeInitialMatches();
        
        // Убеждаемся, что есть возможные ходы
        if (!this.hasPossibleMoves()) {
            this.shuffleBoard();
        }
    }

    getRandomGem() {
        return this.gemTypes[Math.floor(Math.random() * 6)]; // Используем только первые 6 типов для баланса
    }

    removeInitialMatches() {
        let hasMatches = true;
        let attempts = 0;
        
        while (hasMatches && attempts < 100) {
            hasMatches = false;
            
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    // Проверяем горизонтальные совпадения
                    if (col >= 2 && 
                        this.board[row][col] === this.board[row][col-1] && 
                        this.board[row][col] === this.board[row][col-2]) {
                        this.board[row][col] = this.getRandomGem();
                        hasMatches = true;
                    }
                    
                    // Проверяем вертикальные совпадения
                    if (row >= 2 && 
                        this.board[row][col] === this.board[row-1][col] && 
                        this.board[row][col] === this.board[row-2][col]) {
                        this.board[row][col] = this.getRandomGem();
                        hasMatches = true;
                    }
                }
            }
            attempts++;
        }
    }

    renderBoard() {
        const boardElement = document.querySelector('.game-board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'game-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const gem = document.createElement('div');
                gem.className = `gem gem-${this.board[row][col]}`;
                gem.style.backgroundImage = `url('assets/gem_${this.board[row][col]}.png')`;
                
                cell.appendChild(gem);
                boardElement.appendChild(cell);
            }
        }
    }

    bindEvents() {
        const boardElement = document.querySelector('.game-board');
        
        // Mouse events
        boardElement.addEventListener('click', (e) => this.handleCellClick(e));
        
        // Touch events for mobile devices
        let touchStartCell = null;
        
        boardElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const cell = element.closest('.game-cell');
            if (cell) {
                touchStartCell = {
                    row: parseInt(cell.dataset.row),
                    col: parseInt(cell.dataset.col)
                };
            }
        });
        
        boardElement.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (touchStartCell) {
                this.handleCellTouch(touchStartCell);
                touchStartCell = null;
            }
        });
        
        // Prevent scrolling on the game board
        boardElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        // Кнопки управления
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('shuffle-btn').addEventListener('click', () => this.shuffleBoard());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        
        // Keyboard support
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleCellTouch(cellPos) {
        if (this.animating || this.gameState !== 'playing') return;
        
        const {row, col} = cellPos;
        
        if (this.selectedCell) {
            if (this.selectedCell.row === row && this.selectedCell.col === col) {
                // Отменяем выбор
                this.clearSelection();
                return;
            }
            
            if (this.isAdjacent(this.selectedCell, {row, col})) {
                // Пытаемся поменять местами
                this.swapGems(this.selectedCell, {row, col});
            } else {
                // Выбираем новую ячейку
                this.selectCell(row, col);
            }
        } else {
            this.selectCell(row, col);
        }
    }

    handleKeyboard(e) {
        if (this.gameState !== 'playing' || this.animating) return;
        
        switch(e.key) {
            case 'h':
            case 'H':
                this.showHint();
                break;
            case 's':
            case 'S':
                this.shuffleBoard();
                break;
            case 'p':
            case 'P':
            case ' ':
                this.togglePause();
                break;
            case 'n':
            case 'N':
                this.newGame();
                break;
            case 'Escape':
                this.clearSelection();
                break;
        }
    }

    handleCellClick(e) {
        if (this.animating || this.gameState !== 'playing') return;
        
        const cell = e.target.closest('.game-cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        this.resetIdleTimer();
        
        if (this.selectedCell) {
            if (this.selectedCell.row === row && this.selectedCell.col === col) {
                // Отменяем выбор
                this.clearSelection();
                return;
            }
            
            if (this.isAdjacent(this.selectedCell, {row, col})) {
                // Пытаемся поменять местами
                this.swapGems(this.selectedCell, {row, col});
            } else {
                // Выбираем новую ячейку
                this.selectCell(row, col);
            }
        } else {
            this.selectCell(row, col);
        }
    }

    selectCell(row, col) {
        this.clearSelection();
        this.selectedCell = {row, col};
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('selected');
        }
    }

    clearSelection() {
        if (this.selectedCell) {
            const cell = document.querySelector(`[data-row="${this.selectedCell.row}"][data-col="${this.selectedCell.col}"]`);
            if (cell) {
                cell.classList.remove('selected');
            }
        }
        this.selectedCell = null;
    }

    isAdjacent(cell1, cell2) {
        const rowDiff = Math.abs(cell1.row - cell2.row);
        const colDiff = Math.abs(cell1.col - cell2.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    swapGems(cell1, cell2) {
        this.animating = true;
        
        // Временно меняем местами
        const temp = this.board[cell1.row][cell1.col];
        this.board[cell1.row][cell1.col] = this.board[cell2.row][cell2.col];
        this.board[cell2.row][cell2.col] = temp;
        
        // Проверяем, есть ли совпадения
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            // Валидный ход
            this.clearSelection();
            this.moves--;
            this.renderBoard();
            
            setTimeout(() => {
                this.processMatches();
            }, 300);
        } else {
            // Недопустимый ход - возвращаем обратно
            this.board[cell2.row][cell2.col] = this.board[cell1.row][cell1.col];
            this.board[cell1.row][cell1.col] = temp;
            
            this.animating = false;
            this.clearSelection();
        }
    }

    findMatches() {
        const matches = [];
        
        // Горизонтальные совпадения
        for (let row = 0; row < this.boardSize; row++) {
            let count = 1;
            let currentGem = this.board[row][0];
            
            for (let col = 1; col < this.boardSize; col++) {
                if (this.board[row][col] === currentGem) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = col - count; i < col; i++) {
                            matches.push({row, col: i});
                        }
                    }
                    currentGem = this.board[row][col];
                    count = 1;
                }
            }
            
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.push({row, col: i});
                }
            }
        }
        
        // Вертикальные совпадения
        for (let col = 0; col < this.boardSize; col++) {
            let count = 1;
            let currentGem = this.board[0][col];
            
            for (let row = 1; row < this.boardSize; row++) {
                if (this.board[row][col] === currentGem) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = row - count; i < row; i++) {
                            matches.push({row: i, col});
                        }
                    }
                    currentGem = this.board[row][col];
                    count = 1;
                }
            }
            
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.push({row: i, col});
                }
            }
        }
        
        return matches;
    }

    processMatches() {
        const matches = this.findMatches();
        
        if (matches.length === 0) {
            this.animating = false;
            this.checkGameEnd();
            return;
        }
        
        // Play match sound
        this.audioManager.playMatchSound();
        
        // Подсчет очков и комбо
        const baseScore = matches.length * 10;
        let comboMultiplier = 1;
        
        if (matches.length >= 4) {
            this.comboCount++;
            comboMultiplier = 1 + (this.comboCount * 0.5);
            this.showComboEffect(matches.length);
            this.audioManager.playComboSound();
        } else {
            this.comboCount = 0;
        }
        
        const scoreGained = Math.floor(baseScore * comboMultiplier);
        this.score += scoreGained;
        
        // Анимация исчезновения
        matches.forEach(match => {
            const cell = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
            if (cell) {
                cell.classList.add('matched');
            }
        });
        
        setTimeout(() => {
            // Удаляем совпавшие кристаллы
            matches.forEach(match => {
                this.board[match.row][match.col] = null;
            });
            
            // Опускаем кристаллы
            this.dropGems();
            
            // Заполняем пустые места
            this.fillEmptySpaces();
            
            this.renderBoard();
            this.updateUI();
            
            // Проверяем новые совпадения
            setTimeout(() => {
                this.processMatches();
            }, 300);
            
        }, 500);
    }

    showComboEffect(matchCount) {
        const comboText = document.createElement('div');
        comboText.className = 'combo-effect';
        comboText.innerHTML = `
            <div class="combo-text">COMBO!</div>
            <div class="combo-multiplier">x${this.comboCount + 1}</div>
        `;
        
        document.body.appendChild(comboText);
        
        setTimeout(() => {
            comboText.remove();
        }, 2000);
    }

    dropGems() {
        for (let col = 0; col < this.boardSize; col++) {
            let writeIndex = this.boardSize - 1;
            
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    this.board[writeIndex][col] = this.board[row][col];
                    if (writeIndex !== row) {
                        this.board[row][col] = null;
                    }
                    writeIndex--;
                }
            }
        }
    }

    fillEmptySpaces() {
        for (let col = 0; col < this.boardSize; col++) {
            for (let row = 0; row < this.boardSize; row++) {
                if (this.board[row][col] === null) {
                    this.board[row][col] = this.getRandomGem();
                }
            }
        }
    }

    checkGameEnd() {
        if (this.score >= this.targetScore) {
            this.levelUp();
        } else if (this.moves <= 0) {
            this.gameOver();
        }
    }

    levelUp() {
        this.gameState = 'victory';
        this.level++;
        
        // Show victory modal with new character
        this.showVictoryModal();
    }

    showVictoryModal() {
        const characterImages = [
            'character_full_1.png',
            'character_full_2.png', 
            'character_full_3.png'
        ];
        
        const randomCharacter = characterImages[Math.floor(Math.random() * characterImages.length)];
        
        const modal = document.getElementById('victory-modal');
        const characterImg = modal.querySelector('.celebration-img');
        if (characterImg) {
            characterImg.style.backgroundImage = `url('assets/${randomCharacter}')`;
        }
        
        modal.classList.remove('hidden');
        
        // Bind victory modal buttons
        const nextLevelBtn = modal.querySelector('.btn-primary');
        const newGameBtn = modal.querySelector('.btn-secondary');
        
        nextLevelBtn.onclick = () => this.nextLevel();
        newGameBtn.onclick = () => this.newGame();
    }

    nextLevel() {
        document.getElementById('victory-modal').classList.add('hidden');
        
        // Reset for next level
        this.moves = this.getMovesForLevel(this.level);
        this.targetScore = this.getTargetScoreForLevel(this.level);
        this.hints = 3;
        this.shuffles = 2;
        this.gameState = 'playing';
        
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        this.showLevelMessage();
    }

    showLevelMessage() {
        const messages = [
            "Отлично, онэ-тян! Следующий уровень!",
            "Ты супер! Продолжаем!",
            "Ещё чуть-чуть! Я верю в тебя!",
            "Потрясающе! Ты лучшая!",
            "Невероятно! Идём дальше!"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.updateSpeechBubble(randomMessage);
    }

    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('game-over-modal').classList.remove('hidden');
        
        const retryBtn = document.querySelector('#game-over-modal .btn-primary');
        retryBtn.onclick = () => this.newGame();
    }

    newGame() {
        // Hide all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        
        // Reset game state
        this.level = 1;
        this.initGame();
    }

    showHint() {
        if (this.hints <= 0 || this.animating || this.gameState !== 'playing') return;
        
        const possibleMoves = this.findPossibleMoves();
        if (possibleMoves.length > 0) {
            this.hints--;
            const move = possibleMoves[0];
            this.highlightHintMove(move);
            this.updateUI();
        }
    }

    findPossibleMoves() {
        const moves = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // Проверяем возможные обмены с соседними ячейками
                const directions = [
                    {dr: 0, dc: 1}, // право
                    {dr: 1, dc: 0}, // вниз
                ];
                
                directions.forEach(dir => {
                    const newRow = row + dir.dr;
                    const newCol = col + dir.dc;
                    
                    if (newRow < this.boardSize && newCol < this.boardSize) {
                        // Временно меняем местами
                        const temp = this.board[row][col];
                        this.board[row][col] = this.board[newRow][newCol];
                        this.board[newRow][newCol] = temp;
                        
                        // Проверяем, есть ли совпадения
                        const matches = this.findMatches();
                        if (matches.length > 0) {
                            moves.push({
                                from: {row, col},
                                to: {row: newRow, col: newCol}
                            });
                        }
                        
                        // Возвращаем обратно
                        this.board[newRow][newCol] = this.board[row][col];
                        this.board[row][col] = temp;
                    }
                });
            }
        }
        
        return moves;
    }

    hasPossibleMoves() {
        return this.findPossibleMoves().length > 0;
    }

    shuffleBoard() {
        if (this.shuffles <= 0 || this.animating || this.gameState !== 'playing') return;
        
        this.shuffles--;
        this.animating = true;
        
        // Перемешиваем доску
        const gems = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                gems.push(this.board[row][col]);
            }
        }
        
        // Перемешиваем массив
        for (let i = gems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gems[i], gems[j]] = [gems[j], gems[i]];
        }
        
        // Заполняем доску перемешанными кристаллами
        let index = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = gems[index++];
            }
        }
        
        // Убираем возможные начальные совпадения
        this.removeInitialMatches();
        
        // Убеждаемся, что есть возможные ходы
        if (!this.hasPossibleMoves()) {
            this.shuffleBoard(); // Рекурсивно перемешиваем снова
            return;
        }
        
        this.renderBoard();
        this.updateUI();
        this.animating = false;
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pause-modal').classList.remove('hidden');
            
            const continueBtn = document.querySelector('#pause-modal .btn-primary');
            const newGameBtn = document.querySelector('#pause-modal .btn-secondary');
            
            continueBtn.onclick = () => this.togglePause();
            newGameBtn.onclick = () => this.newGame();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pause-modal').classList.add('hidden');
        }
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('level-value').textContent = this.level;
        document.getElementById('moves-value').textContent = this.moves;
        document.getElementById('target-score').textContent = this.targetScore;
        document.getElementById('progress-text').textContent = `${this.score}/${this.targetScore}`;
        
        // Обновляем прогресс-бар
        const progress = Math.min((this.score / this.targetScore) * 100, 100);
        document.querySelector('.progress-fill').style.width = progress + '%';
        
        // Обновляем кнопки
        document.getElementById('hint-btn').textContent = `Подсказка (${this.hints})`;
        document.getElementById('shuffle-btn').textContent = `Перемешать (${this.shuffles})`;
        
        // Отключаем кнопки если нет использований
        document.getElementById('hint-btn').disabled = this.hints <= 0;
        document.getElementById('shuffle-btn').disabled = this.shuffles <= 0;
    }

    showWelcomeMessage() {
        const messages = [
            "Привет! Помоги мне собрать кристаллы!",
            "Давай играть вместе, онэ-тян!",
            "Нужно набрать очки! Ты поможешь?",
            "Собери кристаллы и помоги мне!"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.updateSpeechBubble(randomMessage);
    }

    updateSpeechBubble(message) {
        const bubble = document.querySelector('.speech-bubble p');
        if (bubble) {
            bubble.innerHTML = message + ` Нужно набрать <span id="target-score">${this.targetScore}</span> очков!`;
        }
    }
}

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    const preloader = new PreLoader();
    preloader.loadAssets();
});

