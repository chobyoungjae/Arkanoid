class ArkanoidGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.gameOverDiv = document.getElementById('gameOver');
        this.gameWinDiv = document.getElementById('gameWin');
        this.finalScoreElement = document.getElementById('finalScore');
        this.winScoreElement = document.getElementById('winScore');
        this.levelDisplayElement = document.getElementById('levelDisplay');

        this.gameState = 'waiting';
        this.score = 0;
        this.lives = 3;
        this.level = 1;

        this.paddle = {
            x: this.canvas.width / 2 - 60,
            y: this.canvas.height - 30,
            width: 120,
            height: 15,
            speed: 8
        };

        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            radius: 8,
            dx: 8,
            dy: -8,
            speed: 8
        };

        this.balls = [this.ball];
        this.items = [];
        this.obstacles = [];
        this.paddleOriginalWidth = 120;
        this.touchStartX = 0;
        this.isTouching = false;

        this.bricks = [];
        this.keys = {};
        this.mouseX = 0;

        this.initBricks();
        this.bindEvents();
        this.gameLoop();
    }

    initBricks() {
        this.bricks = [];
        this.obstacles = [];
        
        const patterns = this.getLevelPattern(this.level);
        const brickWidth = 50;
        const brickHeight = 20;
        const brickPadding = 3;
        const brickOffsetTop = 60;
        const brickOffsetLeft = 25;

        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#f39c12', '#e74c3c'];

        for (let row = 0; row < patterns.length; row++) {
            for (let col = 0; col < patterns[row].length; col++) {
                const cell = patterns[row][col];
                const x = brickOffsetLeft + col * (brickWidth + brickPadding);
                const y = brickOffsetTop + row * (brickHeight + brickPadding);
                
                if (cell === 1) {
                    this.bricks.push({
                        x: x,
                        y: y,
                        width: brickWidth,
                        height: brickHeight,
                        color: colors[row % colors.length],
                        visible: true,
                        points: (8 - row) * 10
                    });
                } else if (cell === 2) {
                    this.obstacles.push({
                        x: x,
                        y: y,
                        width: brickWidth,
                        height: brickHeight,
                        color: '#666',
                        indestructible: true
                    });
                }
            }
        }
    }

    getLevelPattern(level) {
        const patterns = {
            1: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            2: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,1,0,1,0,1,0,1,0,1,0,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,2,1,1,1,1,1,1,1,2,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            3: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,1,1,1,1,1,1,1,1,0,0,1],
                [1,1,1,1,2,1,1,1,1,2,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,2,1,1,1,2,2,1,1,1,2,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            4: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [0,1,0,1,0,1,0,1,0,1,0,1,0,1],
                [1,1,2,1,1,1,1,1,1,1,2,1,1,1],
                [1,0,1,0,1,2,1,1,2,1,0,1,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,2,2,1,1,1,1,1,1,2,2,1,1]
            ],
            5: [
                [1,0,1,0,1,0,1,0,1,0,1,0,1,0],
                [0,1,0,1,2,1,0,1,0,1,2,1,0,1],
                [1,0,1,0,1,0,1,0,1,0,1,0,1,0],
                [0,1,2,1,0,1,2,2,1,0,1,2,1,0],
                [1,0,1,0,1,0,1,0,1,0,1,0,1,0],
                [0,1,0,1,0,1,0,1,0,1,0,1,0,1]
            ]
        };
        
        const patternIndex = ((level - 1) % 5) + 1;
        return patterns[patternIndex] || patterns[5];
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ' && this.gameState === 'waiting') {
                this.startGame();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        });

        // 터치 이벤트 추가
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.touchStartX = e.touches[0].clientX - rect.left;
            this.isTouching = true;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isTouching) {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.touches[0].clientX - rect.left;
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isTouching = false;
            if (this.gameState === 'waiting') {
                this.startGame();
            }
        });

        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('nextLevelBtn').addEventListener('click', () => {
            this.nextLevel();
        });
    }

    startGame() {
        if (this.gameState === 'waiting') {
            this.gameState = 'playing';
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }

    resetGame() {
        this.gameState = 'waiting';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.paddle.x = this.canvas.width / 2 - 60;
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 50;
        this.ball.dx = 8;
        this.ball.dy = -8;
        this.balls = [this.ball];
        this.items = [];
        this.paddle.width = this.paddleOriginalWidth;
        this.initBricks();
        this.gameOverDiv.classList.add('hidden');
        this.gameWinDiv.classList.add('hidden');
        this.updateUI();
    }

    nextLevel() {
        this.level++;
        // 레벨이 올라갈 때마다 난이도 증가
        this.ball.speed += 1 + (this.level * 0.5);
        this.ball.dx = this.ball.dx > 0 ? this.ball.speed : -this.ball.speed;
        this.ball.dy = -this.ball.speed;
        this.balls = [this.ball];
        this.items = [];
        this.paddle.width = this.paddleOriginalWidth;
        this.initBricks();
        this.gameWinDiv.classList.add('hidden');
        this.gameState = 'waiting';
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 50;
    }

    updatePaddle() {
        if (this.gameState !== 'playing') return;

        if (this.keys['ArrowLeft'] && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys['ArrowRight'] && this.paddle.x < this.canvas.width - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }

        // 마우스/터치 조작은 키보드 입력이 없을 때만 작동
        if (!this.keys['ArrowLeft'] && !this.keys['ArrowRight'] && (this.mouseX > 0 || this.isTouching) && this.mouseX < this.canvas.width) {
            this.paddle.x = this.mouseX - this.paddle.width / 2;
            if (this.paddle.x < 0) this.paddle.x = 0;
            if (this.paddle.x > this.canvas.width - this.paddle.width) {
                this.paddle.x = this.canvas.width - this.paddle.width;
            }
        }
    }

    updateBalls() {
        if (this.gameState !== 'playing') return;

        for (let i = this.balls.length - 1; i >= 0; i--) {
            let ball = this.balls[i];
            
            ball.x += ball.dx;
            ball.y += ball.dy;

            if (ball.x + ball.radius > this.canvas.width || ball.x - ball.radius < 0) {
                ball.dx = -ball.dx;
            }

            if (ball.y - ball.radius < 0) {
                ball.dy = -ball.dy;
            }

            if (ball.y + ball.radius > this.canvas.height) {
                this.balls.splice(i, 1);
                if (this.balls.length === 0) {
                    this.lives--;
                    if (this.lives <= 0) {
                        this.gameOver();
                    } else {
                        this.resetBall();
                    }
                }
                continue;
            }

            if (ball.y + ball.radius > this.paddle.y &&
                ball.x > this.paddle.x &&
                ball.x < this.paddle.x + this.paddle.width &&
                ball.dy > 0) {
                
                let hitPos = (ball.x - this.paddle.x) / this.paddle.width;
                ball.dx = (hitPos - 0.5) * 16;
                ball.dy = -Math.abs(ball.dy);
            }
        }
    }

    checkBrickCollisions() {
        for (let ball of this.balls) {
            // 일반 벽돌과의 충돌
            for (let brick of this.bricks) {
                if (!brick.visible) continue;

                if (ball.x + ball.radius > brick.x &&
                    ball.x - ball.radius < brick.x + brick.width &&
                    ball.y + ball.radius > brick.y &&
                    ball.y - ball.radius < brick.y + brick.height) {
                    
                    brick.visible = false;
                    this.score += brick.points;
                    ball.dy = -ball.dy;

                    // 아이템 드롭 확률
                    if (Math.random() < 0.15) {
                        this.dropItem(brick.x + brick.width / 2, brick.y + brick.height);
                    }

                    if (this.bricks.every(b => !b.visible)) {
                        this.gameWin();
                    }
                    break;
                }
            }
            
            // 장애물과의 충돌 (파괴되지 않음)
            for (let obstacle of this.obstacles) {
                if (ball.x + ball.radius > obstacle.x &&
                    ball.x - ball.radius < obstacle.x + obstacle.width &&
                    ball.y + ball.radius > obstacle.y &&
                    ball.y - ball.radius < obstacle.y + obstacle.height) {
                    
                    ball.dy = -ball.dy;
                    break;
                }
            }
        }
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 50;
        this.ball.dx = Math.random() > 0.5 ? this.ball.speed : -this.ball.speed;
        this.ball.dy = -this.ball.speed;
        this.balls = [this.ball];
        this.gameState = 'waiting';
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.finalScoreElement.textContent = this.score;
        this.gameOverDiv.classList.remove('hidden');
    }

    gameWin() {
        this.gameState = 'gameWin';
        this.winScoreElement.textContent = this.score;
        this.gameWinDiv.classList.remove('hidden');
    }

    dropItem(x, y) {
        const itemTypes = ['bigBall', 'smallBall', 'multiBall', 'bigPaddle', 'smallPaddle'];
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        this.items.push({
            x: x,
            y: y,
            width: 30,
            height: 15,
            type: itemType,
            dy: 2,
            active: true
        });
    }

    updateItems() {
        if (this.gameState !== 'playing') return;

        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.y += item.dy;

            if (item.y > this.canvas.height) {
                this.items.splice(i, 1);
                continue;
            }

            if (item.y + item.height > this.paddle.y &&
                item.x + item.width > this.paddle.x &&
                item.x < this.paddle.x + this.paddle.width &&
                item.active) {
                
                this.applyItemEffect(item.type);
                this.items.splice(i, 1);
            }
        }
    }

    applyItemEffect(itemType) {
        switch (itemType) {
            case 'bigBall':
                for (let ball of this.balls) {
                    ball.radius = Math.min(ball.radius + 3, 15);
                }
                break;
            case 'smallBall':
                for (let ball of this.balls) {
                    ball.radius = Math.max(ball.radius - 2, 4);
                }
                break;
            case 'multiBall':
                if (this.balls.length < 5) {
                    let newBall = {
                        x: this.balls[0].x,
                        y: this.balls[0].y,
                        radius: this.balls[0].radius,
                        dx: Math.random() > 0.5 ? this.ball.speed : -this.ball.speed,
                        dy: -this.ball.speed,
                        speed: this.ball.speed
                    };
                    this.balls.push(newBall);
                }
                break;
            case 'bigPaddle':
                this.paddle.width = Math.min(this.paddle.width + 30, 200);
                break;
            case 'smallPaddle':
                this.paddle.width = Math.max(this.paddle.width - 20, 60);
                break;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

        for (let ball of this.balls) {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            this.ctx.closePath();
        }

        // 일반 벽돌 그리기
        for (let brick of this.bricks) {
            if (brick.visible) {
                this.ctx.fillStyle = brick.color;
                this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            }
        }
        
        // 장애물 그리기
        for (let obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // 장애물 표시 (X 마크)
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(obstacle.x + 5, obstacle.y + 5);
            this.ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + obstacle.height - 5);
            this.ctx.moveTo(obstacle.x + obstacle.width - 5, obstacle.y + 5);
            this.ctx.lineTo(obstacle.x + 5, obstacle.y + obstacle.height - 5);
            this.ctx.stroke();
        }

        for (let item of this.items) {
            this.ctx.fillStyle = this.getItemColor(item.type);
            this.ctx.fillRect(item.x, item.y, item.width, item.height);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(item.x, item.y, item.width, item.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.getItemText(item.type), item.x + item.width/2, item.y + item.height/2 + 3);
        }

        if (this.gameState === 'waiting') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('스페이스바를 눌러 시작하세요!', this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('일시정지', this.canvas.width / 2, this.canvas.height / 2);
        }

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`레벨: ${this.level}`, this.canvas.width - 20, 30);
    }

    getItemColor(type) {
        const colors = {
            'bigBall': '#ff6b6b',
            'smallBall': '#4ecdc4',
            'multiBall': '#feca57',
            'bigPaddle': '#45b7d1',
            'smallPaddle': '#96ceb4'
        };
        return colors[type] || '#fff';
    }

    getItemText(type) {
        const texts = {
            'bigBall': 'B+',
            'smallBall': 'B-',
            'multiBall': 'X2',
            'bigPaddle': 'P+',
            'smallPaddle': 'P-'
        };
        return texts[type] || '?';
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
        this.levelDisplayElement.textContent = this.level;
    }

    gameLoop() {
        this.updatePaddle();
        this.updateBalls();
        this.updateItems();
        this.checkBrickCollisions();
        this.draw();
        this.updateUI();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new ArkanoidGame();
});