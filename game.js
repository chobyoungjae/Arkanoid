// Supabase 설정
const SUPABASE_URL = 'https://lfjijdmlxreqcameyvhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmamlqZG1seHJlcWNhbWV5dmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4OTkyNjgsImV4cCI6MjA4MjQ3NTI2OH0.WyRgQVQM6H3iY8jO3a-sR_BQHvmuctaTLBceE5BTU64';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 게임 상수
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 350;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 80;
const MAX_HEALTH = 100;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const MOVE_SPEED = 5;
const SKILL_COOLDOWN = 3000; // 3초

// 공격 데미지
const DAMAGE = {
    punch: 8,
    kick: 12,
    skill: 25
};

// 게임 상태
let gameState = {
    roomId: null,
    playerId: null, // 'player1' or 'player2'
    isHost: false,
    gameRunning: false,
    subscription: null
};

// 플레이어 클래스
class Fighter {
    constructor(x, isPlayer1) {
        this.x = x;
        this.y = GROUND_Y - PLAYER_HEIGHT;
        this.vx = 0;
        this.vy = 0;
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.health = MAX_HEALTH;
        this.isPlayer1 = isPlayer1;
        this.facingRight = isPlayer1;
        this.isJumping = false;
        this.isAttacking = false;
        this.attackType = null;
        this.attackFrame = 0;
        this.skillCooldown = 0;
        this.hitCooldown = 0;
    }

    update(keys, opponent) {
        // 중력
        this.vy += GRAVITY;
        this.y += this.vy;

        // 바닥 충돌
        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.vy = 0;
            this.isJumping = false;
        }

        // 이동
        if (!this.isAttacking) {
            if (keys.left) {
                this.vx = -MOVE_SPEED;
                this.facingRight = false;
            } else if (keys.right) {
                this.vx = MOVE_SPEED;
                this.facingRight = true;
            } else {
                this.vx = 0;
            }
        }

        this.x += this.vx;

        // 화면 경계
        this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x));

        // 공격 애니메이션
        if (this.isAttacking) {
            this.attackFrame++;
            if (this.attackFrame >= 15) {
                this.isAttacking = false;
                this.attackType = null;
                this.attackFrame = 0;
            }
        }

        // 쿨다운
        if (this.skillCooldown > 0) this.skillCooldown -= 16;
        if (this.hitCooldown > 0) this.hitCooldown -= 16;

        // 상대방 바라보기
        if (!this.isAttacking && opponent) {
            this.facingRight = opponent.x > this.x;
        }
    }

    attack(type) {
        if (this.isAttacking) return false;
        if (type === 'skill' && this.skillCooldown > 0) return false;

        this.isAttacking = true;
        this.attackType = type;
        this.attackFrame = 0;

        if (type === 'skill') {
            this.skillCooldown = SKILL_COOLDOWN;
        }

        return true;
    }

    jump() {
        if (!this.isJumping) {
            this.vy = JUMP_FORCE;
            this.isJumping = true;
            return true;
        }
        return false;
    }

    getAttackHitbox() {
        if (!this.isAttacking || this.attackFrame < 5 || this.attackFrame > 10) {
            return null;
        }

        const reach = this.attackType === 'kick' ? 50 : (this.attackType === 'skill' ? 80 : 40);
        const hitboxWidth = this.attackType === 'skill' ? 60 : 30;
        const hitboxHeight = this.attackType === 'kick' ? 30 : 40;

        return {
            x: this.facingRight ? this.x + this.width : this.x - reach,
            y: this.y + (this.attackType === 'kick' ? 50 : 20),
            width: hitboxWidth,
            height: hitboxHeight
        };
    }

    takeDamage(amount) {
        if (this.hitCooldown > 0) return false;
        this.health = Math.max(0, this.health - amount);
        this.hitCooldown = 500;
        return true;
    }

    draw(ctx) {
        const color = this.isPlayer1 ? '#4ecdc4' : '#ff6b6b';
        const hitFlash = this.hitCooldown > 400 ? '#fff' : color;

        ctx.strokeStyle = hitFlash;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        const centerX = this.x + this.width / 2;
        const headY = this.y + 15;
        const bodyTopY = this.y + 30;
        const bodyBottomY = this.y + 55;

        // 머리
        ctx.beginPath();
        ctx.arc(centerX, headY, 12, 0, Math.PI * 2);
        ctx.stroke();

        // 몸통
        ctx.beginPath();
        ctx.moveTo(centerX, bodyTopY);
        ctx.lineTo(centerX, bodyBottomY);
        ctx.stroke();

        // 팔
        const armDir = this.facingRight ? 1 : -1;
        if (this.isAttacking && this.attackType === 'punch') {
            // 펀치 모션
            const punchExtend = Math.min(this.attackFrame * 3, 30);
            ctx.beginPath();
            ctx.moveTo(centerX, bodyTopY + 5);
            ctx.lineTo(centerX + armDir * punchExtend, bodyTopY);
            ctx.stroke();
            // 다른 팔
            ctx.beginPath();
            ctx.moveTo(centerX, bodyTopY + 5);
            ctx.lineTo(centerX - armDir * 15, bodyTopY + 20);
            ctx.stroke();
        } else if (this.isAttacking && this.attackType === 'skill') {
            // 스킬 모션 (양팔 앞으로)
            const skillExtend = Math.min(this.attackFrame * 4, 40);
            ctx.strokeStyle = '#f5576c';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(centerX, bodyTopY + 5);
            ctx.lineTo(centerX + armDir * skillExtend, bodyTopY - 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, bodyTopY + 5);
            ctx.lineTo(centerX + armDir * skillExtend, bodyTopY + 10);
            ctx.stroke();
            // 이펙트
            if (this.attackFrame > 5 && this.attackFrame < 12) {
                ctx.fillStyle = 'rgba(245, 87, 108, 0.5)';
                ctx.beginPath();
                ctx.arc(centerX + armDir * (skillExtend + 20), bodyTopY, 25, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = hitFlash;
            ctx.lineWidth = 4;
        } else {
            // 기본 팔
            ctx.beginPath();
            ctx.moveTo(centerX, bodyTopY + 5);
            ctx.lineTo(centerX + 20, bodyTopY + 25);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, bodyTopY + 5);
            ctx.lineTo(centerX - 20, bodyTopY + 25);
            ctx.stroke();
        }

        // 다리
        if (this.isAttacking && this.attackType === 'kick') {
            // 킥 모션
            const kickExtend = Math.min(this.attackFrame * 3, 35);
            ctx.beginPath();
            ctx.moveTo(centerX, bodyBottomY);
            ctx.lineTo(centerX + armDir * kickExtend, bodyBottomY + 10);
            ctx.stroke();
            // 다른 다리
            ctx.beginPath();
            ctx.moveTo(centerX, bodyBottomY);
            ctx.lineTo(centerX - armDir * 10, this.y + this.height);
            ctx.stroke();
        } else if (this.isJumping) {
            // 점프 다리
            ctx.beginPath();
            ctx.moveTo(centerX, bodyBottomY);
            ctx.lineTo(centerX + 15, bodyBottomY + 15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, bodyBottomY);
            ctx.lineTo(centerX - 15, bodyBottomY + 15);
            ctx.stroke();
        } else {
            // 기본 다리
            ctx.beginPath();
            ctx.moveTo(centerX, bodyBottomY);
            ctx.lineTo(centerX + 15, this.y + this.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, bodyBottomY);
            ctx.lineTo(centerX - 15, this.y + this.height);
            ctx.stroke();
        }
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            health: this.health,
            isJumping: this.isJumping,
            isAttacking: this.isAttacking,
            attackType: this.attackType,
            attackFrame: this.attackFrame,
            facingRight: this.facingRight
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.x = data.x;
        this.y = data.y;
        this.vx = data.vx;
        this.vy = data.vy;
        this.health = data.health;
        this.isJumping = data.isJumping;
        this.isAttacking = data.isAttacking;
        this.attackType = data.attackType;
        this.attackFrame = data.attackFrame;
        this.facingRight = data.facingRight;
    }
}

// 게임 변수
let canvas, ctx;
let player1, player2;
let myPlayer, opponentPlayer;
let keys = { left: false, right: false };
let lastUpdate = 0;

// DOM 요소
const screens = {
    menu: document.getElementById('menu-screen'),
    create: document.getElementById('create-screen'),
    join: document.getElementById('join-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

// 화면 전환
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 방 코드 생성
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 방 만들기
async function createRoom() {
    const roomId = generateRoomCode();
    gameState.roomId = roomId;
    gameState.playerId = 'player1';
    gameState.isHost = true;

    document.getElementById('room-code').textContent = roomId;
    showScreen('create');

    try {
        await supabaseClient.from('game_rooms').insert({
            id: roomId,
            player1: { ready: true },
            player2: null,
            status: 'waiting'
        });

        // 상대방 입장 대기
        gameState.subscription = supabaseClient
            .channel(`room-${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_rooms',
                filter: `id=eq.${roomId}`
            }, (payload) => {
                if (payload.new.player2 && payload.new.status === 'waiting') {
                    startGame();
                }
            })
            .subscribe();

    } catch (error) {
        console.error('방 생성 실패:', error);
        alert('방 생성에 실패했습니다.');
        showScreen('menu');
    }
}

// 방 입장
async function joinRoom() {
    const roomId = document.getElementById('room-code-input').value.toUpperCase().trim();
    const errorText = document.getElementById('join-error');

    if (roomId.length !== 6) {
        errorText.textContent = '6자리 방 코드를 입력하세요.';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error || !data) {
            errorText.textContent = '방을 찾을 수 없습니다.';
            return;
        }

        if (data.player2) {
            errorText.textContent = '방이 이미 가득 찼습니다.';
            return;
        }

        gameState.roomId = roomId;
        gameState.playerId = 'player2';
        gameState.isHost = false;

        await supabaseClient.from('game_rooms').update({
            player2: { ready: true }
        }).eq('id', roomId);

        startGame();

    } catch (error) {
        console.error('입장 실패:', error);
        errorText.textContent = '입장에 실패했습니다.';
    }
}

// 게임 시작
function startGame() {
    showScreen('game');

    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // 캔버스 크기 설정
    const containerWidth = Math.min(window.innerWidth - 40, CANVAS_WIDTH);
    const scale = containerWidth / CANVAS_WIDTH;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${CANVAS_HEIGHT * scale}px`;

    // 플레이어 초기화
    player1 = new Fighter(100, true);
    player2 = new Fighter(CANVAS_WIDTH - 140, false);

    if (gameState.playerId === 'player1') {
        myPlayer = player1;
        opponentPlayer = player2;
    } else {
        myPlayer = player2;
        opponentPlayer = player1;
    }

    gameState.gameRunning = true;

    // 실시간 동기화 구독
    subscribeToGame();

    // 게임 루프 시작
    lastUpdate = Date.now();
    requestAnimationFrame(gameLoop);

    // 키보드 입력 설정
    setupControls();
}

// 실시간 구독
function subscribeToGame() {
    if (gameState.subscription) {
        gameState.subscription.unsubscribe();
    }

    gameState.subscription = supabase
        .channel(`game-${gameState.roomId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_rooms',
            filter: `id=eq.${gameState.roomId}`
        }, (payload) => {
            const data = payload.new;

            // 상대방 데이터 업데이트
            if (gameState.playerId === 'player1' && data.player2) {
                opponentPlayer.fromJSON(data.player2);
            } else if (gameState.playerId === 'player2' && data.player1) {
                opponentPlayer.fromJSON(data.player1);
            }

            // 게임 종료 체크
            if (data.status === 'finished') {
                endGame(data.winner);
            }
        })
        .subscribe();
}

// 컨트롤 설정
function setupControls() {
    // 키보드
    document.addEventListener('keydown', (e) => {
        if (!gameState.gameRunning) return;

        switch(e.key) {
            case 'ArrowLeft': keys.left = true; break;
            case 'ArrowRight': keys.right = true; break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                myPlayer.jump();
                break;
            case 'a':
            case 'A':
                myPlayer.attack('punch');
                break;
            case 's':
            case 'S':
                myPlayer.attack('kick');
                break;
            case 'd':
            case 'D':
                myPlayer.attack('skill');
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowLeft': keys.left = false; break;
            case 'ArrowRight': keys.right = false; break;
        }
    });

    // 모바일 버튼
    document.querySelectorAll('.ctrl-btn').forEach(btn => {
        const action = btn.dataset.action;

        const handleAction = (e) => {
            e.preventDefault();
            if (!gameState.gameRunning) return;

            switch(action) {
                case 'left': keys.left = true; break;
                case 'right': keys.right = true; break;
                case 'jump': myPlayer.jump(); break;
                case 'punch': myPlayer.attack('punch'); break;
                case 'kick': myPlayer.attack('kick'); break;
                case 'skill': myPlayer.attack('skill'); break;
            }
        };

        const handleRelease = (e) => {
            e.preventDefault();
            if (action === 'left') keys.left = false;
            if (action === 'right') keys.right = false;
        };

        btn.addEventListener('touchstart', handleAction);
        btn.addEventListener('touchend', handleRelease);
        btn.addEventListener('mousedown', handleAction);
        btn.addEventListener('mouseup', handleRelease);
    });
}

// 게임 루프
function gameLoop() {
    if (!gameState.gameRunning) return;

    const now = Date.now();
    const delta = now - lastUpdate;

    // 60fps 목표
    if (delta >= 16) {
        update();
        draw();
        lastUpdate = now;

        // 서버에 내 상태 전송 (100ms마다)
        if (now % 100 < 20) {
            syncToServer();
        }
    }

    requestAnimationFrame(gameLoop);
}

// 업데이트
function update() {
    myPlayer.update(keys, opponentPlayer);

    // 공격 히트 체크
    const hitbox = myPlayer.getAttackHitbox();
    if (hitbox) {
        if (checkCollision(hitbox, {
            x: opponentPlayer.x,
            y: opponentPlayer.y,
            width: opponentPlayer.width,
            height: opponentPlayer.height
        })) {
            const damage = DAMAGE[myPlayer.attackType] || 10;
            if (opponentPlayer.takeDamage(damage)) {
                // 데미지 적용됨
                updateHealthBars();

                // 승리 체크
                if (opponentPlayer.health <= 0) {
                    declareWinner(gameState.playerId);
                }
            }
        }
    }

    // 상대방 공격 체크
    const oppHitbox = opponentPlayer.getAttackHitbox();
    if (oppHitbox) {
        if (checkCollision(oppHitbox, {
            x: myPlayer.x,
            y: myPlayer.y,
            width: myPlayer.width,
            height: myPlayer.height
        })) {
            const damage = DAMAGE[opponentPlayer.attackType] || 10;
            if (myPlayer.takeDamage(damage)) {
                updateHealthBars();

                if (myPlayer.health <= 0) {
                    const winner = gameState.playerId === 'player1' ? 'player2' : 'player1';
                    declareWinner(winner);
                }
            }
        }
    }
}

// 충돌 체크
function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// 체력바 업데이트
function updateHealthBars() {
    document.getElementById('health-p1').style.width = `${player1.health}%`;
    document.getElementById('health-p2').style.width = `${player2.health}%`;
}

// 그리기
function draw() {
    // 배경
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 바닥
    ctx.fillStyle = '#444';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // 바닥 라인
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // 플레이어 그리기
    player1.draw(ctx);
    player2.draw(ctx);
}

// 서버 동기화
async function syncToServer() {
    if (!gameState.roomId) return;

    const updateData = {};
    updateData[gameState.playerId] = myPlayer.toJSON();

    try {
        await supabaseClient.from('game_rooms').update(updateData).eq('id', gameState.roomId);
    } catch (error) {
        console.error('동기화 실패:', error);
    }
}

// 승자 선언
async function declareWinner(winner) {
    gameState.gameRunning = false;

    try {
        await supabaseClient.from('game_rooms').update({
            status: 'finished',
            winner: winner
        }).eq('id', gameState.roomId);
    } catch (error) {
        console.error('결과 저장 실패:', error);
    }

    endGame(winner);
}

// 게임 종료
function endGame(winner) {
    gameState.gameRunning = false;

    const resultText = document.getElementById('result-text');
    if (winner === gameState.playerId) {
        resultText.textContent = '🎉 승리! 🎉';
        resultText.style.color = '#4ecdc4';
    } else {
        resultText.textContent = '😢 패배... 😢';
        resultText.style.color = '#ff6b6b';
    }

    showScreen('result');
}

// 재경기
async function rematch() {
    if (gameState.isHost) {
        await supabaseClient.from('game_rooms').update({
            player1: { ready: true },
            player2: { ready: true },
            status: 'waiting',
            winner: null
        }).eq('id', gameState.roomId);
    }

    startGame();
}

// 메뉴로 돌아가기
async function backToMenu() {
    if (gameState.subscription) {
        gameState.subscription.unsubscribe();
    }

    if (gameState.roomId) {
        try {
            await supabaseClient.from('game_rooms').delete().eq('id', gameState.roomId);
        } catch (error) {
            console.error('방 삭제 실패:', error);
        }
    }

    gameState = {
        roomId: null,
        playerId: null,
        isHost: false,
        gameRunning: false,
        subscription: null
    };

    keys = { left: false, right: false };
    showScreen('menu');
}

// 이벤트 리스너
document.getElementById('create-room-btn').addEventListener('click', createRoom);
document.getElementById('join-room-btn').addEventListener('click', () => showScreen('join'));
document.getElementById('cancel-create-btn').addEventListener('click', backToMenu);
document.getElementById('cancel-join-btn').addEventListener('click', () => showScreen('menu'));
document.getElementById('join-btn').addEventListener('click', joinRoom);
document.getElementById('rematch-btn').addEventListener('click', rematch);
document.getElementById('back-menu-btn').addEventListener('click', backToMenu);

// Enter 키로 입장
document.getElementById('room-code-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

// 초기 화면
showScreen('menu');
