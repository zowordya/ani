// Помоги сестренке - Игра три в ряд
// Main game logic

class Match3Game {
    constructor() {
        this.boardSize = 8;
        this.gemTypes = ['red', 'blue', 'green', 'purple', 'yellow', 'pink', 'orange', 'cyan'];
        this.board = [];
        this.selectedCell = null;
        this.score = 0;
        this.level = 1;
        this.targetScore = 1000;
        this.moves = 30;
        this.maxMoves = 30;
        this.gameState = 'playing'; // playing, won, lost, paused
        this.animating = false;
        this.combo = 0;
        this.hints = 3;
        this.shuffles = 2;
        
        this.init();
    }

    init() {
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        this.bindEvents();
        this.showWelcomeMessage();
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
                cell.className = `game-cell crystal-${this.board[row][col]}`;
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Добавляем иконку кристалла
                const icon = document.createElement('div');
                icon.className = 'crystal-icon';
                icon.style.backgroundImage = `url('./assets/gem_${this.board[row][col]}.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '100%';
                icon.style.height = '100%';
                cell.appendChild(icon);
                
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
        cell.classList.add('selected');
    }

    clearSelection() {
        if (this.selectedCell) {
            const cell = document.querySelector(`[data-row="${this.selectedCell.row}"][data-col="${this.selectedCell.col}"]`);
            if (cell) cell.classList.remove('selected');
            this.selectedCell = null;
        }
    }

    isAdjacent(cell1, cell2) {
        const rowDiff = Math.abs(cell1.row - cell2.row);
        const colDiff = Math.abs(cell1.col - cell2.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    async swapGems(cell1, cell2) {
        this.animating = true;
        
        // Меняем местами
        const temp = this.board[cell1.row][cell1.col];
        this.board[cell1.row][cell1.col] = this.board[cell2.row][cell2.col];
        this.board[cell2.row][cell2.col] = temp;
        
        this.renderBoard();
        await this.sleep(300);
        
        // Проверяем совпадения
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            // Успешный ход
            this.moves--;
            this.clearSelection();
            await this.processMatches();
            this.checkGameEnd();
        } else {
            // Неуспешный ход - возвращаем обратно
            const temp = this.board[cell1.row][cell1.col];
            this.board[cell1.row][cell1.col] = this.board[cell2.row][cell2.col];
            this.board[cell2.row][cell2.col] = temp;
            
            this.renderBoard();
            this.shakeBoard();
            this.clearSelection();
        }
        
        this.animating = false;
        this.updateUI();
    }

    findMatches() {
        const matches = [];
        const visited = new Set();
        
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
                            const key = `${row}-${i}`;
                            if (!visited.has(key)) {
                                matches.push({row, col: i});
                                visited.add(key);
                            }
                        }
                    }
                    count = 1;
                    currentGem = this.board[row][col];
                }
            }
            
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    const key = `${row}-${i}`;
                    if (!visited.has(key)) {
                        matches.push({row, col: i});
                        visited.add(key);
                    }
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
                            const key = `${i}-${col}`;
                            if (!visited.has(key)) {
                                matches.push({row: i, col});
                                visited.add(key);
                            }
                        }
                    }
                    count = 1;
                    currentGem = this.board[row][col];
                }
            }
            
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    const key = `${i}-${col}`;
                    if (!visited.has(key)) {
                        matches.push({row: i, col});
                        visited.add(key);
                    }
                }
            }
        }
        
        return matches;
    }

    async processMatches() {
        let totalMatches = 0;
        this.combo = 0;
        
        while (true) {
            const matches = this.findMatches();
            if (matches.length === 0) break;
            
            this.combo++;
            totalMatches += matches.length;
            
            // Анимация исчезновения
            await this.animateMatches(matches);
            
            // Убираем совпавшие кристаллы
            this.removeMatches(matches);
            
            // Падение кристаллов
            await this.dropGems();
            
            // Заполняем пустые места
            this.fillEmptySpaces();
            
            this.renderBoard();
            await this.sleep(300);
        }
        
        // Начисляем очки
        if (totalMatches > 0) {
            const baseScore = totalMatches * 10;
            const comboBonus = this.combo > 1 ? (this.combo - 1) * 50 : 0;
            const scoreGained = baseScore + comboBonus;
            
            this.score += scoreGained;
            this.showScorePopup(scoreGained);
            this.animateCharacter('happy');
            
            if (this.combo > 1) {
                this.showComboPopup(this.combo);
            }
        }
    }

    async animateMatches(matches) {
        matches.forEach(match => {
            const cell = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
            if (cell) {
                cell.classList.add('matching');
                this.createParticles(cell);
            }
        });
        
        await this.sleep(500);
    }

    removeMatches(matches) {
        matches.forEach(match => {
            this.board[match.row][match.col] = null;
        });
    }

    async dropGems() {
        for (let col = 0; col < this.boardSize; col++) {
            let writePos = this.boardSize - 1;
            
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    if (row !== writePos) {
                        this.board[writePos][col] = this.board[row][col];
                        this.board[row][col] = null;
                    }
                    writePos--;
                }
            }
        }
        
        this.renderBoard();
        await this.sleep(300);
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

    hasPossibleMoves() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // Проверяем возможность хода вправо
                if (col < this.boardSize - 1) {
                    if (this.wouldCreateMatch(row, col, row, col + 1)) {
                        return true;
                    }
                }
                
                // Проверяем возможность хода вниз
                if (row < this.boardSize - 1) {
                    if (this.wouldCreateMatch(row, col, row + 1, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    wouldCreateMatch(row1, col1, row2, col2) {
        // Временно меняем местами
        const temp = this.board[row1][col1];
        this.board[row1][col1] = this.board[row2][col2];
        this.board[row2][col2] = temp;
        
        const hasMatch = this.findMatches().length > 0;
        
        // Возвращаем обратно
        this.board[row2][col2] = this.board[row1][col1];
        this.board[row1][col1] = temp;
        
        return hasMatch;
    }

    showHint() {
        if (this.hints <= 0 || this.animating) return;
        
        this.hints--;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // Проверяем возможность хода вправо
                if (col < this.boardSize - 1) {
                    if (this.wouldCreateMatch(row, col, row, col + 1)) {
                        this.highlightHint(row, col, row, col + 1);
                        this.updateUI();
                        return;
                    }
                }
                
                // Проверяем возможность хода вниз
                if (row < this.boardSize - 1) {
                    if (this.wouldCreateMatch(row, col, row + 1, col)) {
                        this.highlightHint(row, col, row + 1, col);
                        this.updateUI();
                        return;
                    }
                }
            }
        }
    }

    highlightHint(row1, col1, row2, col2) {
        const cell1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const cell2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        
        [cell1, cell2].forEach(cell => {
            if (cell) {
                cell.classList.add('hint');
                setTimeout(() => {
                    cell.classList.remove('hint');
                }, 2000);
            }
        });
    }

    shuffleBoard() {
        if (this.shuffles <= 0 || this.animating) return;
        
        this.shuffles--;
        this.animating = true;
        
        // Собираем все кристаллы
        const gems = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                gems.push(this.board[row][col]);
            }
        }
        
        // Перемешиваем
        for (let i = gems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gems[i], gems[j]] = [gems[j], gems[i]];
        }
        
        // Размещаем обратно
        let index = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = gems[index++];
            }
        }
        
        this.removeInitialMatches();
        this.renderBoard();
        this.updateUI();
        
        setTimeout(() => {
            this.animating = false;
        }, 500);
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showPauseModal();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hidePauseModal();
        }
    }

    checkGameEnd() {
        if (this.score >= this.targetScore) {
            this.gameState = 'won';
            this.showVictoryModal();
        } else if (this.moves <= 0) {
            if (!this.hasPossibleMoves()) {
                this.gameState = 'lost';
                this.showGameOverModal();
            } else {
                this.gameState = 'lost';
                this.showGameOverModal();
            }
        }
    }

    newGame() {
        this.score = 0;
        this.moves = this.maxMoves;
        this.level = 1;
        this.targetScore = 1000;
        this.gameState = 'playing';
        this.combo = 0;
        this.hints = 3;
        this.shuffles = 2;
        
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        this.hideAllModals();
    }

    nextLevel() {
        this.level++;
        this.targetScore = this.level * 1000;
        this.moves = this.maxMoves;
        this.gameState = 'playing';
        this.hints = 3;
        this.shuffles = 2;
        
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        this.hideAllModals();
        this.showLevelStartMessage();
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('level-value').textContent = this.level;
        document.getElementById('moves-value').textContent = this.moves;
        document.getElementById('target-score').textContent = this.targetScore;
        
        // Обновляем прогресс-бар
        const progress = Math.min((this.score / this.targetScore) * 100, 100);
        document.querySelector('.progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${this.score}/${this.targetScore}`;
        
        // Обновляем состояние кнопок
        document.getElementById('hint-btn').disabled = this.hints <= 0;
        document.getElementById('shuffle-btn').disabled = this.shuffles <= 0;
        
        // Обновляем счетчики
        document.getElementById('hint-btn').textContent = `Подсказка (${this.hints})`;
        document.getElementById('shuffle-btn').textContent = `Перемешать (${this.shuffles})`;
    }

    // Анимации и эффекты
    shakeBoard() {
        const board = document.querySelector('.game-board');
        board.classList.add('shake');
        setTimeout(() => {
            board.classList.remove('shake');
        }, 500);
    }

    animateCharacter(emotion) {
        const character = document.querySelector('.character-img');
        character.classList.add(emotion);
        setTimeout(() => {
            character.classList.remove(emotion);
        }, 1000);
    }

    createParticles(element) {
        const rect = element.getBoundingClientRect();
        const colors = ['#ff6b9d', '#4ecdc4', '#95e1d3', '#a8edea', '#ffeaa7'];
        
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'fixed';
            particle.style.left = rect.left + rect.width / 2 + 'px';
            particle.style.top = rect.top + rect.height / 2 + 'px';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.zIndex = '1000';
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }

    showScorePopup(score) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = `+${score}`;
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.fontSize = '2em';
        popup.style.fontWeight = 'bold';
        popup.style.color = '#ff6b9d';
        popup.style.zIndex = '1000';
        popup.style.pointerEvents = 'none';
        popup.style.animation = 'score-popup 1s ease-out forwards';
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 1000);
    }

    showComboPopup(combo) {
        const popup = document.createElement('div');
        popup.className = 'combo-popup';
        popup.textContent = `КОМБО x${combo}!`;
        popup.style.position = 'fixed';
        popup.style.top = '40%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.fontSize = '1.5em';
        popup.style.fontWeight = 'bold';
        popup.style.color = '#ffeaa7';
        popup.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        popup.style.zIndex = '1000';
        popup.style.pointerEvents = 'none';
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 1500);
    }

    // Модальные окна
    showWelcomeMessage() {
        this.updateSpeechBubble("Привет! Помоги мне собрать кристаллы! Нужно набрать " + this.targetScore + " очков!");
    }

    showLevelStartMessage() {
        this.updateSpeechBubble(`Уровень ${this.level}! Теперь нужно набрать ${this.targetScore} очков!`);
    }

    updateSpeechBubble(message) {
        const bubble = document.querySelector('.speech-bubble p');
        if (bubble) {
            bubble.innerHTML = message.replace(/\d+/g, '<span id="target-score">$&</span>');
        }
    }

    showVictoryModal() {
        const modal = document.getElementById('victory-modal');
        const character = modal.querySelector('.celebration-img');
        
        // Обновляем изображение персонажа
        character.src = './assets/character_victory.png';
        
        modal.classList.remove('hidden');
        this.animateCharacter('happy');
        
        // Добавляем обработчики для кнопок
        modal.querySelector('.btn-primary').onclick = () => this.nextLevel();
        modal.querySelector('.btn-secondary').onclick = () => this.newGame();
    }

    showGameOverModal() {
        const modal = document.getElementById('game-over-modal');
        modal.classList.remove('hidden');
        
        modal.querySelector('.btn-primary').onclick = () => this.newGame();
    }

    showPauseModal() {
        const modal = document.getElementById('pause-modal');
        modal.classList.remove('hidden');
        
        modal.querySelector('.btn-primary').onclick = () => this.togglePause();
        modal.querySelector('.btn-secondary').onclick = () => this.newGame();
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    hidePauseModal() {
        document.getElementById('pause-modal').classList.add('hidden');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Match3Game();
});

// Дополнительные CSS анимации через JavaScript
const additionalCSS = `
    @keyframes score-popup {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.5);
        }
    }
    
    .game-cell.hint {
        animation: hint-pulse 0.5s ease-in-out infinite alternate;
        box-shadow: 0 0 20px #ffeaa7 !important;
    }
    
    @keyframes hint-pulse {
        0% { transform: scale(1); }
        100% { transform: scale(1.1); }
    }
    
    .crystal-icon {
        transition: all 0.3s ease;
    }
    
    .game-cell:hover .crystal-icon {
        transform: scale(1.1);
    }
    
    .game-cell.selected .crystal-icon {
        transform: scale(1.2);
        filter: brightness(1.3);
    }
`;

// Добавляем дополнительные стили
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

