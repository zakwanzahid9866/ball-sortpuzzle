class BallSortGame {
    constructor() {
        this.currentLevel = 1;
        this.moves = 0;
        this.score = 0;
        this.coins = 0;
        this.startTime = null;
        this.gameTime = 0;
        this.gameInterval = null;
        this.tubes = [];
        this.selectedTube = null;
        this.gameHistory = [];
        this.settings = {
            sound: true,
            vibration: true
        };
        this.inventory = {
            extraUndos: 0,
            hints: 0,
            autoSorts: 0,
            themes: ['default'],
            currentTheme: 'default'
        };
        this.lastDailyReward = null;
        this.currentHint = null;
        this.hintTimeout = null;
        
        // Enhanced level configurations for 1000+ levels
        this.maxLevel = 1000;
        
        // Color palette (expanded)
        this.colors = [
            '#ef4444', // red
            '#3b82f6', // blue
            '#22c55e', // green
            '#f59e0b', // yellow
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#f97316', // orange
            '#84cc16', // lime
            '#6366f1', // indigo
            '#dc2626', // red-600
            '#7c3aed', // violet
            '#059669', // emerald
            '#d97706', // amber
            '#be123c', // rose
            '#0891b2', // sky
            '#65a30d', // lime-600
            '#7c2d12', // orange-900
            '#4338ca', // indigo-600
            '#a21caf'  // fuchsia
        ];
        
        this.init();
    }
    
    // Dynamic level configuration generator for 1000+ levels
    getLevelConfig(level) {
        // Progressive difficulty scaling
        let tubes, colors, ballsPerColor;
        
        if (level <= 15) {
            // First 15 levels (original configuration)
            const configs = [
                { tubes: 3, colors: 2, ballsPerColor: 3 },   // Level 1
                { tubes: 4, colors: 2, ballsPerColor: 4 },   // Level 2
                { tubes: 4, colors: 3, ballsPerColor: 4 },   // Level 3
                { tubes: 5, colors: 3, ballsPerColor: 5 },   // Level 4
                { tubes: 5, colors: 4, ballsPerColor: 5 },   // Level 5
                { tubes: 6, colors: 4, ballsPerColor: 6 },   // Level 6
                { tubes: 6, colors: 5, ballsPerColor: 5 },   // Level 7
                { tubes: 6, colors: 5, ballsPerColor: 6 },   // Level 8
                { tubes: 7, colors: 5, ballsPerColor: 7 },   // Level 9
                { tubes: 7, colors: 6, ballsPerColor: 6 },   // Level 10
                { tubes: 7, colors: 6, ballsPerColor: 7 },   // Level 11
                { tubes: 8, colors: 6, ballsPerColor: 8 },   // Level 12
                { tubes: 8, colors: 7, ballsPerColor: 7 },   // Level 13
                { tubes: 8, colors: 7, ballsPerColor: 8 },   // Level 14
                { tubes: 8, colors: 8, ballsPerColor: 8 }    // Level 15
            ];
            return configs[level - 1];
        } else {
            // Dynamic generation for levels 16+
            const baseLevel = (level - 16) % 50; // Cycle every 50 levels with variations
            const cycle = Math.floor((level - 16) / 50);
            
            // Base configuration that scales with level
            tubes = Math.min(3 + Math.floor(level / 20), 12); // Max 12 tubes
            colors = Math.min(2 + Math.floor(level / 15), Math.min(tubes - 1, this.colors.length));
            ballsPerColor = Math.min(3 + Math.floor(level / 25) + cycle, 8); // Max 8 balls per color
            
            // Add some randomness to keep it interesting
            if (level > 100) {
                const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                tubes = Math.max(4, Math.min(12, tubes + variance));
            }
            
            return { tubes, colors, ballsPerColor };
        }
    }
    
    init() {
        this.loadGameState();
        this.setupEventListeners();
        this.updateUI();
        this.checkDailyReward();
    }
    
    setupEventListeners() {
        // Home screen
        document.getElementById('playButton').addEventListener('click', () => this.startGame());
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSetting('sound'));
        document.getElementById('vibrationToggle').addEventListener('click', () => this.toggleSetting('vibration'));
        document.getElementById('watchAdButton').addEventListener('click', () => this.showAdRewardModal());
        document.getElementById('shopButton').addEventListener('click', () => this.showShopModal());
        
        // Game screen
        document.getElementById('backButton').addEventListener('click', () => this.showHome());
        document.getElementById('menuButton').addEventListener('click', () => this.showMenuModal());
        document.getElementById('undoButton').addEventListener('click', () => this.undoMove());
        document.getElementById('hintButton').addEventListener('click', () => this.requestHint());
        document.getElementById('restartButton').addEventListener('click', () => this.restartLevel());
        document.getElementById('nextButton').addEventListener('click', () => this.nextLevel());
        
        // Modals
        document.getElementById('continueButton').addEventListener('click', () => this.nextLevel());
        document.getElementById('homeFromModalButton').addEventListener('click', () => this.showHome());
        document.getElementById('resumeButton').addEventListener('click', () => this.hideMenuModal());
        document.getElementById('restartFromMenuButton').addEventListener('click', () => {
            this.hideMenuModal();
            this.restartLevel();
        });
        document.getElementById('homeFromMenuButton').addEventListener('click', () => {
            this.hideMenuModal();
            this.showHome();
        });
        
        // Shop system
        document.getElementById('closeShopButton').addEventListener('click', () => this.hideShopModal());
        document.querySelectorAll('.shop-item').forEach(item => {
            item.addEventListener('click', () => this.purchaseItem(item.dataset.item, parseInt(item.dataset.price)));
        });
        
        // Daily reward
        document.getElementById('claimDailyRewardButton').addEventListener('click', () => this.claimDailyReward());
        
        // Ad system
        document.getElementById('confirmWatchAdButton').addEventListener('click', () => this.watchRewardedAd());
        document.getElementById('cancelAdButton').addEventListener('click', () => this.hideAdRewardModal());
        
        // Hint system
        document.getElementById('watchAdForHintButton').addEventListener('click', () => this.watchAdForHint());
        document.getElementById('useStoredHintButton').addEventListener('click', () => this.useStoredHint());
        document.getElementById('cancelHintButton').addEventListener('click', () => this.hideHintRequestModal());
        
        // Close modals on background click
        this.setupModalCloseListeners();
    }
    
    setupModalCloseListeners() {
        const modals = ['successModal', 'menuModal', 'shopModal', 'dailyRewardModal', 'adRewardModal', 'hintRequestModal'];
        modals.forEach(modalId => {
            document.getElementById(modalId).addEventListener('click', (e) => {
                if (e.target === document.getElementById(modalId)) {
                    this.hideModal(modalId);
                }
            });
        });
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }
    
    loadGameState() {
        const saved = localStorage.getItem('ballSortGame');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentLevel = data.currentLevel || 1;
            this.score = data.score || 0;
            this.coins = data.coins || 0;
            this.settings = { ...this.settings, ...data.settings };
            this.inventory = { ...this.inventory, ...data.inventory };
            this.lastDailyReward = data.lastDailyReward || null;
        }
    }
    
    saveGameState() {
        const data = {
            currentLevel: this.currentLevel,
            score: this.score,
            coins: this.coins,
            settings: this.settings,
            inventory: this.inventory,
            lastDailyReward: this.lastDailyReward
        };
        localStorage.setItem('ballSortGame', JSON.stringify(data));
    }
    
    checkDailyReward() {
        const today = new Date().toDateString();
        if (this.lastDailyReward !== today) {
            // Show daily reward available
            this.showDailyRewardModal();
        }
        this.updateDailyRewardStatus();
    }
    
    updateDailyRewardStatus() {
        const today = new Date().toDateString();
        const status = this.lastDailyReward === today ? 'Claimed' : 'Available';
        document.getElementById('dailyRewardStatus').textContent = status;
    }
    
    toggleSetting(setting) {
        this.settings[setting] = !this.settings[setting];
        this.updateSettingsUI();
        this.saveGameState();
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(50);
            } else if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }
    }
    
    updateSettingsUI() {
        const soundToggle = document.getElementById('soundToggle');
        const vibrationToggle = document.getElementById('vibrationToggle');
        
        if (this.settings.sound) {
            soundToggle.classList.remove('bg-gray-400');
            soundToggle.classList.add('bg-green-400');
            soundToggle.querySelector('div').classList.remove('translate-x-6');
            soundToggle.querySelector('div').classList.add('translate-x-0');
        } else {
            soundToggle.classList.remove('bg-green-400');
            soundToggle.classList.add('bg-gray-400');
            soundToggle.querySelector('div').classList.remove('translate-x-0');
            soundToggle.querySelector('div').classList.add('translate-x-6');
        }
        
        if (this.settings.vibration) {
            vibrationToggle.classList.remove('bg-gray-400');
            vibrationToggle.classList.add('bg-green-400');
            vibrationToggle.querySelector('div').classList.remove('translate-x-6');
            vibrationToggle.querySelector('div').classList.add('translate-x-0');
        } else {
            vibrationToggle.classList.remove('bg-green-400');
            vibrationToggle.classList.add('bg-gray-400');
            vibrationToggle.querySelector('div').classList.remove('translate-x-0');
            vibrationToggle.querySelector('div').classList.add('translate-x-6');
        }
    }
    
    updateUI() {
        document.getElementById('currentLevelDisplay').textContent = this.currentLevel;
        document.getElementById('bestScoreDisplay').textContent = this.score;
        document.getElementById('coinsDisplay').textContent = this.coins;
        document.getElementById('shopCoinsDisplay').textContent = this.coins;
        document.getElementById('hintCountDisplay').textContent = this.inventory.hints;
        this.updateSettingsUI();
        this.updateDailyRewardStatus();
        this.updateHintButton();
    }
    
    // Shop System
    showShopModal() {
        document.getElementById('shopModal').classList.remove('hidden');
        this.updateShopItems();
    }
    
    hideShopModal() {
        document.getElementById('shopModal').classList.add('hidden');
    }
    
    updateShopItems() {
        document.querySelectorAll('.shop-item').forEach(item => {
            const itemId = item.dataset.item;
            const price = parseInt(item.dataset.price);
            
            if (this.inventory.themes && this.inventory.themes.includes(itemId)) {
                item.classList.add('opacity-50');
                item.disabled = true;
                item.textContent = item.textContent.replace(/\(\d+🪙\)/, '(Owned)');
            } else if (this.coins < price) {
                item.classList.add('opacity-50');
                item.disabled = true;
            } else {
                item.classList.remove('opacity-50');
                item.disabled = false;
            }
        });
    }
    
    purchaseItem(itemId, price) {
        if (this.coins < price) {
            alert('Not enough coins!');
            return;
        }
        
        this.coins -= price;
        
        if (itemId.startsWith('theme-')) {
            this.inventory.themes.push(itemId);
            this.inventory.currentTheme = itemId;
        } else if (itemId === 'undo-pack') {
            this.inventory.extraUndos += 5;
        } else if (itemId === 'hint-pack') {
            this.inventory.hints += 3;
        } else if (itemId === 'auto-sort') {
            this.inventory.autoSorts += 1;
        }
        
        this.saveGameState();
        this.updateUI();
        this.updateShopItems();
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(100);
            } else if ('vibrate' in navigator) {
                navigator.vibrate(100);
            }
        }
    }
    
    // Daily Reward System
    showDailyRewardModal() {
        const rewardAmount = 50 + (this.currentLevel * 2); // Increasing daily rewards
        document.getElementById('dailyRewardAmount').textContent = rewardAmount;
        document.getElementById('dailyRewardModal').classList.remove('hidden');
    }
    
    claimDailyReward() {
        const rewardAmount = 50 + (this.currentLevel * 2);
        this.coins += rewardAmount;
        this.lastDailyReward = new Date().toDateString();
        
        this.saveGameState();
        this.updateUI();
        document.getElementById('dailyRewardModal').classList.add('hidden');
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(200);
            } else if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }
    
    // Ad Reward System
    showAdRewardModal() {
        document.getElementById('adRewardModal').classList.remove('hidden');
    }
    
    hideAdRewardModal() {
        document.getElementById('adRewardModal').classList.add('hidden');
    }
    
    watchRewardedAd() {
        // Notify Android to show rewarded ad
        if (typeof Android !== 'undefined') {
            Android.showRewardedAd();
        } else {
            // For web testing, simulate ad reward
            this.giveAdReward();
        }
        this.hideAdRewardModal();
    }
    
    giveAdReward() {
        this.coins += 50;
        this.saveGameState();
        this.updateUI();
        
        // Show success message
        alert('You earned 50 coins! 🪙');
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(150);
            } else if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }
    
    // Hint System
    updateHintButton() {
        const hintButton = document.getElementById('hintButton');
        const useStoredHintButton = document.getElementById('useStoredHintButton');
        
        if (this.inventory.hints > 0) {
            hintButton.classList.remove('opacity-50');
            hintButton.disabled = false;
            if (useStoredHintButton) {
                useStoredHintButton.classList.remove('hidden');
                document.getElementById('hintCountDisplay').textContent = this.inventory.hints;
            }
        } else {
            hintButton.classList.remove('opacity-50');
            hintButton.disabled = false;
            if (useStoredHintButton) {
                useStoredHintButton.classList.add('hidden');
            }
        }
    }
    
    requestHint() {
        this.clearCurrentHint();
        this.showHintRequestModal();
    }
    
    showHintRequestModal() {
        document.getElementById('hintRequestModal').classList.remove('hidden');
        this.updateHintButton();
    }
    
    hideHintRequestModal() {
        document.getElementById('hintRequestModal').classList.add('hidden');
    }
    
    watchAdForHint() {
        // Notify Android to show rewarded ad for hint
        if (typeof Android !== 'undefined') {
            Android.showRewardedAdForHint();
        } else {
            // For web testing, simulate ad reward
            this.giveHintReward();
        }
        this.hideHintRequestModal();
    }
    
    useStoredHint() {
        if (this.inventory.hints <= 0) {
            alert('No hints available!');
            return;
        }
        
        this.inventory.hints--;
        this.showHint();
        this.hideHintRequestModal();
        this.saveGameState();
        this.updateUI();
    }
    
    giveHintReward() {
        this.showHint();
        
        // Show success message
        alert('Hint unlocked! Watch the golden glow! 💡');
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(150);
            } else if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }
    
    showHint() {
        const hint = this.analyzeGameForHint();
        if (hint) {
            this.displayHint(hint);
        } else {
            alert('No helpful moves found at the moment!');
        }
    }
    
    analyzeGameForHint() {
        // Find the best possible move
        const possibleMoves = [];
        
        for (let fromTube = 0; fromTube < this.tubes.length; fromTube++) {
            if (this.tubes[fromTube].length === 0) continue;
            
            for (let toTube = 0; toTube < this.tubes.length; toTube++) {
                if (fromTube === toTube) continue;
                
                if (this.canMoveBall(fromTube, toTube)) {
                    const move = {
                        from: fromTube,
                        to: toTube,
                        priority: this.calculateMovePriority(fromTube, toTube)
                    };
                    possibleMoves.push(move);
                }
            }
        }
        
        if (possibleMoves.length === 0) return null;
        
        // Sort by priority (higher is better)
        possibleMoves.sort((a, b) => b.priority - a.priority);
        return possibleMoves[0];
    }
    
    calculateMovePriority(fromTube, toTube) {
        let priority = 0;
        const fromBalls = this.tubes[fromTube];
        const toBalls = this.tubes[toTube];
        const movingBall = fromBalls[fromBalls.length - 1];
        
        // Priority 1: Moving to an empty tube
        if (toBalls.length === 0) {
            priority += 10;
            
            // Extra priority if we're freeing up a mixed color sequence
            if (fromBalls.length > 1 && fromBalls[fromBalls.length - 2] !== movingBall) {
                priority += 20;
            }
        }
        
        // Priority 2: Completing a color sequence
        if (toBalls.length > 0 && toBalls[0] === movingBall) {
            const sameColorCount = toBalls.filter(ball => ball === movingBall).length;
            priority += sameColorCount * 15;
            
            // Extra priority if this completes the tube
            if (sameColorCount === toBalls.length && toBalls.length >= 3) {
                priority += 50;
            }
        }
        
        // Priority 3: Avoid creating mixed sequences
        if (toBalls.length > 0 && toBalls[toBalls.length - 1] !== movingBall) {
            priority -= 30;
        }
        
        return priority;
    }
    
    displayHint(hint) {
        this.clearCurrentHint();
        
        const fromTubeElement = document.querySelector(`[data-tube-index="${hint.from}"]`);
        const toTubeElement = document.querySelector(`[data-tube-index="${hint.to}"]`);
        
        if (fromTubeElement && toTubeElement) {
            // Highlight source tube
            fromTubeElement.classList.add('hint-glow');
            
            // Add arrow pointing from source to destination
            const arrow = document.createElement('div');
            arrow.className = 'hint-arrow';
            arrow.innerHTML = '→';
            arrow.style.top = '50%';
            arrow.style.left = '50%';
            arrow.style.transform = 'translate(-50%, -50%)';
            
            fromTubeElement.style.position = 'relative';
            fromTubeElement.appendChild(arrow);
            
            // Highlight destination tube
            toTubeElement.classList.add('hint-glow');
            
            this.currentHint = { fromTubeElement, toTubeElement, arrow };
            
            // Auto-clear hint after 5 seconds
            this.hintTimeout = setTimeout(() => {
                this.clearCurrentHint();
            }, 5000);
        }
    }
    
    clearCurrentHint() {
        if (this.currentHint) {
            this.currentHint.fromTubeElement.classList.remove('hint-glow');
            this.currentHint.toTubeElement.classList.remove('hint-glow');
            if (this.currentHint.arrow && this.currentHint.arrow.parentNode) {
                this.currentHint.arrow.parentNode.removeChild(this.currentHint.arrow);
            }
            this.currentHint = null;
        }
        
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }
    }
    
    // Ball Movement Animation
    animateBallMovement(fromTube, toTube, ballColor) {
        const fromTubeElement = document.querySelector(`[data-tube-index="${fromTube}"]`);
        const toTubeElement = document.querySelector(`[data-tube-index="${toTube}"]`);
        
        if (!fromTubeElement || !toTubeElement) return;
        
        // Get the top ball from source tube
        const fromBalls = fromTubeElement.querySelectorAll('.ball');
        const topBall = fromBalls[fromBalls.length - 1];
        
        if (!topBall) return;
        
        // Create animated ball element
        const animatedBall = document.createElement('div');
        animatedBall.className = 'ball w-8 h-8 rounded-full ball-moving';
        animatedBall.style.backgroundColor = ballColor;
        animatedBall.style.position = 'absolute';
        animatedBall.style.zIndex = '1000';
        
        // Get positions
        const fromRect = topBall.getBoundingClientRect();
        const containerRect = document.getElementById('gameContainer').getBoundingClientRect();
        
        // Set initial position
        animatedBall.style.left = (fromRect.left - containerRect.left) + 'px';
        animatedBall.style.top = (fromRect.top - containerRect.top) + 'px';
        
        // Add to container
        document.getElementById('gameContainer').appendChild(animatedBall);
        
        // Hide the original ball temporarily
        topBall.style.opacity = '0';
        
        // Calculate target position (top of destination tube)
        const toRect = toTubeElement.getBoundingClientRect();
        const targetX = (toRect.left - containerRect.left) + (toRect.width / 2) - 16; // Center in tube
        const targetY = (toRect.bottom - containerRect.top) - 40; // Near bottom of tube
        
        // Animate the ball movement
        setTimeout(() => {
            // First, move up out of the source tube
            animatedBall.style.transform = 'translateY(-30px) scale(1.2)';
            
            setTimeout(() => {
                // Then move to target position
                animatedBall.style.left = targetX + 'px';
                animatedBall.style.top = targetY + 'px';
                animatedBall.style.transform = 'translateY(0) scale(1)';
                
                // Clean up after animation
                setTimeout(() => {
                    if (animatedBall.parentNode) {
                        animatedBall.parentNode.removeChild(animatedBall);
                    }
                }, 300);
            }, 150);
        }, 50);
    }
    
    startGame() {
        // Notify Android app that game started
        if (typeof Android !== 'undefined') {
            Android.onGameStart();
        }
        
        this.showGame();
        this.generateLevel();
        this.startTimer();
    }
    
    showHome() {
        document.getElementById('homeScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        this.hideAllModals();
        this.clearCurrentHint();
        this.stopTimer();
        this.updateUI();
    }
    
    showGame() {
        document.getElementById('homeScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        this.hideAllModals();
    }
    
    hideAllModals() {
        document.getElementById('successModal').classList.add('hidden');
        document.getElementById('menuModal').classList.add('hidden');
    }
    
    showSuccessModal() {
        const modal = document.getElementById('successModal');
        document.getElementById('finalMoves').textContent = this.moves;
        document.getElementById('finalTime').textContent = this.formatTime(this.gameTime);
        document.getElementById('finalScore').textContent = this.score;
        modal.classList.remove('hidden');
    }
    
    hideSuccessModal() {
        document.getElementById('successModal').classList.add('hidden');
    }
    
    showMenuModal() {
        document.getElementById('menuModal').classList.remove('hidden');
    }
    
    hideMenuModal() {
        document.getElementById('menuModal').classList.add('hidden');
    }
    
    generateLevel() {
        const config = this.getLevelConfig(this.currentLevel);
        const ballsPerColor = config.ballsPerColor;
        const totalBalls = config.colors * ballsPerColor;
        
        // Reset game state
        this.moves = 0;
        this.gameTime = 0;
        this.tubes = [];
        this.selectedTube = null;
        this.gameHistory = [];
        
        // Initialize tubes
        for (let i = 0; i < config.tubes; i++) {
            this.tubes.push([]);
        }
        
        // Create balls for each color
        const balls = [];
        for (let colorIndex = 0; colorIndex < config.colors; colorIndex++) {
            for (let i = 0; i < ballsPerColor; i++) {
                balls.push(this.colors[colorIndex % this.colors.length]);
            }
        }
        
        // Shuffle balls
        for (let i = balls.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [balls[i], balls[j]] = [balls[j], balls[i]];
        }
        
        // Distribute balls to tubes (leaving at least one empty)
        const tubesWithBalls = Math.max(1, config.tubes - Math.ceil(config.tubes / 4));
        const ballsPerTube = Math.ceil(balls.length / tubesWithBalls);
        
        for (let i = 0; i < tubesWithBalls && balls.length > 0; i++) {
            const ballsToAdd = Math.min(ballsPerTube, balls.length, 8); // Max 8 balls per tube
            for (let j = 0; j < ballsToAdd; j++) {
                if (balls.length > 0) {
                    this.tubes[i].push(balls.pop());
                }
            }
        }
        
        this.renderGame();
        this.updateGameUI();
    }
    
    renderGame() {
        const container = document.getElementById('tubesContainer');
        const config = this.getLevelConfig(this.currentLevel);
        
        // Set grid columns based on number of tubes
        const cols = Math.min(config.tubes, 4);
        container.className = `grid gap-2 justify-center items-end min-h-80 grid-cols-${cols}`;
        
        // Clear container
        container.innerHTML = '';
        container.style.position = 'relative'; // Enable positioned children for animations
        
        // Calculate tube size based on screen width and number of tubes
        const maxWidth = Math.min(window.innerWidth - 32, 500); // max container width
        const tubeWidth = Math.floor((maxWidth - (config.tubes - 1) * 8) / config.tubes);
        const adjustedTubeWidth = Math.max(Math.min(tubeWidth, 80), 50); // min 50px, max 80px
        
        this.tubes.forEach((tube, tubeIndex) => {
            const tubeElement = document.createElement('div');
            tubeElement.className = `tube cursor-pointer touch-target`;
            tubeElement.style.width = `${adjustedTubeWidth}px`;
            tubeElement.style.height = '280px';
            tubeElement.style.padding = '8px';
            tubeElement.style.paddingTop = '20px'; // Space for the top rim
            tubeElement.style.display = 'flex';
            tubeElement.style.flexDirection = 'column';
            tubeElement.style.justifyContent = 'flex-end'; // Align balls to bottom
            tubeElement.style.alignItems = 'center';
            tubeElement.dataset.tubeIndex = tubeIndex;
            
            // Add balls to tube - IMPORTANT: First ball in array = bottom visually, Last ball in array = top visually
            tube.forEach((ballColor, ballIndex) => {
                const ball = document.createElement('div');
                ball.className = `ball w-8 h-8 rounded-full cursor-pointer mb-1`;
                ball.style.backgroundColor = ballColor;
                ball.dataset.tubeIndex = tubeIndex;
                ball.dataset.ballIndex = ballIndex;
                ball.dataset.arrayPosition = ballIndex; // Track position in data array
                // Mark if this is the top ball (last in the array)
                ball.dataset.isTopBall = (ballIndex === tube.length - 1) ? 'true' : 'false';
                tubeElement.appendChild(ball);
            });
            
            // Add touch/click handlers
            tubeElement.addEventListener('click', () => this.handleTubeClick(tubeIndex));
            tubeElement.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleTubeClick(tubeIndex);
            });
            
            container.appendChild(tubeElement);
        });
    }
    
    handleTubeClick(tubeIndex) {
        if (this.selectedTube === null) {
            // Select tube if it has balls - only select if there are moveable balls
            if (this.tubes[tubeIndex].length > 0) {
                this.selectTube(tubeIndex);
            }
        } else if (this.selectedTube === tubeIndex) {
            // Deselect if clicking the same tube
            this.deselectTube();
        } else {
            // Try to move ball from selected tube to this tube
            this.moveBall(this.selectedTube, tubeIndex);
        }
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(25);
            } else if ('vibrate' in navigator) {
                navigator.vibrate(25);
            }
        }
    }
    
    selectTube(tubeIndex) {
        this.selectedTube = tubeIndex;
        this.updateTubeVisuals();
    }
    
    deselectTube() {
        this.selectedTube = null;
        this.updateTubeVisuals();
    }
    
    updateTubeVisuals() {
        const tubes = document.querySelectorAll('.tube');
        tubes.forEach((tube, index) => {
            tube.classList.remove('valid-drop', 'invalid-drop');
            const balls = tube.querySelectorAll('.ball');
            balls.forEach(ball => ball.classList.remove('selected'));
            
            if (this.selectedTube === index) {
                // Find and highlight the TOP ball (the one that can be moved)
                const topBall = tube.querySelector('.ball[data-is-top-ball="true"]');
                if (topBall) {
                    topBall.classList.add('selected');
                } else {
                    // Fallback - last ball in DOM is top ball
                    if (balls.length > 0) {
                        const fallbackTopBall = balls[balls.length - 1];
                        fallbackTopBall.classList.add('selected');
                    }
                }
            } else if (this.selectedTube !== null && index !== this.selectedTube) {
                // Show drop feedback for other tubes
                if (this.canMoveBall(this.selectedTube, index)) {
                    tube.classList.add('valid-drop');
                } else {
                    tube.classList.add('invalid-drop');
                }
            }
        });
    }
    
    canMoveBall(fromTube, toTube) {
        const fromBalls = this.tubes[fromTube];
        const toBalls = this.tubes[toTube];
        
        if (fromBalls.length === 0) return false;
        if (toBalls.length >= 8) return false; // Max 8 balls per tube
        
        const topBallFrom = fromBalls[fromBalls.length - 1];
        const topBallTo = toBalls.length > 0 ? toBalls[toBalls.length - 1] : null;
        
        return topBallTo === null || topBallFrom === topBallTo;
    }
    
    moveBall(fromTube, toTube) {
        if (!this.canMoveBall(fromTube, toTube)) return;
        
        // Save state for undo
        this.gameHistory.push({
            tubes: this.tubes.map(tube => [...tube]),
            moves: this.moves,
            score: this.score
        });
        
        // Get the ball that's being moved (from the top of the source tube)
        const ball = this.tubes[fromTube].pop();
        
        // Add visual feedback for ball movement
        this.animateBallMovement(fromTube, toTube, ball);
        
        // Move the ball in the data structure
        this.tubes[toTube].push(ball);
        
        // Clear any active hints since game state changed
        this.clearCurrentHint();
        
        // Update game state
        this.moves++;
        this.score += 10;
        
        // Deselect tube
        this.deselectTube();
        
        // Re-render and update UI
        setTimeout(() => {
            this.renderGame();
            this.updateGameUI();
            
            // Check for level completion
            setTimeout(() => {
                if (this.isLevelComplete()) {
                    this.completeLevel();
                }
            }, 300);
        }, 300); // Wait for animation to complete
    }
    
    isLevelComplete() {
        return this.tubes.every(tube => {
            if (tube.length === 0) return true;
            const firstColor = tube[0];
            return tube.every(ball => ball === firstColor);
        });
    }
    
    completeLevel() {
        this.stopTimer();
        
        // Calculate bonus score and coins
        const timeBonus = Math.max(0, 300 - this.gameTime) * 2;
        const moveBonus = Math.max(0, 50 - this.moves) * 5;
        const levelBonus = this.currentLevel * 10;
        
        this.score += timeBonus + moveBonus + levelBonus;
        
        // Award coins based on performance
        const coinsEarned = 10 + Math.floor(levelBonus / 10) + Math.floor(timeBonus / 20);
        this.coins += coinsEarned;
        
        // Notify Android app of level completion
        if (typeof Android !== 'undefined') {
            Android.onLevelComplete(this.currentLevel);
        }
        
        // Show success modal
        this.showSuccessModal();
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(200);
            } else if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
        }
        
        this.saveGameState();
    }
    
    nextLevel() {
        this.currentLevel++;
        this.hideSuccessModal();
        
        if (this.currentLevel <= this.maxLevel) {
            this.generateLevel();
            this.startTimer();
        } else {
            // Game complete - congratulations!
            if (typeof Android !== 'undefined') {
                Android.onGameComplete();
            } else {
                alert('Incredible! You completed all 1000 levels! You are a true Ball Sort master! 🏆');
            }
            this.showHome();
        }
        
        this.saveGameState();
    }
    
    undoMove() {
        if (this.gameHistory.length === 0) return;
        
        const previousState = this.gameHistory.pop();
        this.tubes = previousState.tubes;
        this.moves = previousState.moves;
        this.score = previousState.score;
        
        this.deselectTube();
        this.renderGame();
        this.updateGameUI();
        
        if (this.settings.vibration) {
            if (typeof Android !== 'undefined') {
                Android.vibrate(50);
            } else if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }
    }
    
    restartLevel() {
        this.clearCurrentHint();
        this.generateLevel();
        this.startTimer();
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.gameTime = 0;
        this.gameInterval = setInterval(() => {
            this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateGameUI();
        }, 1000);
    }
    
    stopTimer() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateGameUI() {
        document.getElementById('levelNumber').textContent = this.currentLevel;
        document.getElementById('movesCount').textContent = this.moves;
        document.getElementById('timeCount').textContent = this.formatTime(this.gameTime);
        document.getElementById('scoreCount').textContent = this.score;
        
        // Enable/disable undo button
        const undoButton = document.getElementById('undoButton');
        if (this.gameHistory.length === 0) {
            undoButton.disabled = true;
            undoButton.classList.add('opacity-50');
        } else {
            undoButton.disabled = false;
            undoButton.classList.remove('opacity-50');
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BallSortGame();
});