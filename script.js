// Main game canvas
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scale = 20; // Size of each block in pixels
context.scale(scale, scale);
const boardWidth = canvas.width / scale;
const boardHeight = canvas.height / scale;

// Next piece canvas
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const nextScale = 20; // Use same scale or adjust if needed
nextContext.scale(nextScale, nextScale);
const nextCanvasWidth = nextCanvas.width / nextScale;
const nextCanvasHeight = nextCanvas.height / nextScale;


// Game elements
const scoreElement = document.getElementById('score');
const startPauseButton = document.getElementById('start-pause');
const gameOverOverlay = document.getElementById('game-over-overlay');

// Game state
let gameState = 'paused'; // 'playing', 'paused', 'gameOver'
let animationFrameId = null;

const board = createBoard(boardWidth, boardHeight);

console.log(`Board dimensions: ${boardWidth}x${boardHeight}`);

// --- Tetromino Shapes and Colors ---
const colors = [
    null,       // 0 represents empty cell
    '#FF0D72',  // T
    '#0DC2FF',  // O
    '#0DFF72',  // L
    '#F538FF',  // J
    '#FF8E0D',  // I
    '#FFE138',  // S
    '#3877FF',  // Z
];

const tetrominoes = {
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'O': [
        [2, 2],
        [2, 2]
    ],
    'L': [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3]
    ],
    'J': [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0]
    ],
    'I': [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0]
    ],
    'S': [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0]
    ],
    'Z': [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]
};

// --- Game Board ---
function createBoard(width, height) {
    const board = [];
    while (height--) {
        board.push(new Array(width).fill(0));
    }
    return board;
}

// --- Drawing Functions ---
function drawSquare(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x, y, 1, 1);
    context.strokeStyle = '#333'; // Border color
    context.lineWidth = 0.1;
    context.strokeRect(x, y, 1, 1);
}

function drawMatrix(matrix, offsetX, offsetY) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawSquare(x + offsetX, y + offsetY, colors[value]);
            }
        });
    });
}

function drawNextPiece() {
    // Clear next canvas
    nextContext.fillStyle = '#eee'; // Background color matching CSS
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!player.nextMatrix) return;

    // Calculate position to center the piece
    const matrix = player.nextMatrix;
    const matrixWidth = matrix[0].length;
    const matrixHeight = matrix.length;
    const offsetX = Math.floor((nextCanvasWidth - matrixWidth) / 2);
    const offsetY = Math.floor((nextCanvasHeight - matrixHeight) / 2);

    // Draw the piece using the main context's functions but on nextContext
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Temporarily adjust fillStyle and strokeStyle for nextContext
                nextContext.fillStyle = colors[value];
                nextContext.fillRect(x + offsetX, y + offsetY, 1, 1);
                nextContext.strokeStyle = '#333';
                nextContext.lineWidth = 0.1 / (scale / nextScale); // Adjust line width based on scale difference if any
                nextContext.strokeRect(x + offsetX, y + offsetY, 1, 1);
            }
        });
    });
}


// --- Game Logic Functions ---

function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Ensure we don't try to write outside board bounds vertically
                if (y + player.pos.y < board.length) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            }
        });
    });
}

function rotate(matrix, dir) {
    // Transpose + Reverse = Rotate
    // Transpose: Swap rows and columns
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }

    // Reverse each row to complete rotation
    if (dir > 0) { // Clockwise
        matrix.forEach(row => row.reverse());
    } else { // Counter-clockwise
        matrix.reverse();
    }
    return matrix;
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    const originalMatrix = JSON.parse(JSON.stringify(player.matrix)); // Deep copy

    player.matrix = rotate(player.matrix, dir);

    // Collision check after rotation - implement wall kicks
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1)); // Try moving alternating left/right
        if (offset > player.matrix[0].length) { // If offset is too large, rotation failed
            player.matrix = originalMatrix; // Revert matrix
            player.pos.x = pos; // Revert position
            return; // Exit rotation attempt
        }
    }
    // If loop completes without returning, rotation (with potential kick) was successful
}


function boardSweep() {
    let rowCount = 0;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer; // Row is not full, check next row up
            }
        }

        // If we reach here, the row is full
        const row = board.splice(y, 1)[0].fill(0); // Remove the full row
        board.unshift(row); // Add a new empty row at the top
        ++y; // Re-check the current y index as rows shifted down

        rowCount++;
    }

    // Update score based on cleared lines
    if (rowCount > 0) {
        // Simple scoring: 10 points per line, bonus for multiple lines
        player.score += rowCount * 10 * rowCount; // e.g., 1=10, 2=40, 3=90, 4=160
        scoreElement.innerText = player.score;
        console.log(`Cleared ${rowCount} rows! Score: ${player.score}`);
    }
}


const tetrominoKeys = 'ILJOTSZ';

function generateNewPiece() {
    const randomType = tetrominoKeys[Math.floor(Math.random() * tetrominoKeys.length)];
    return JSON.parse(JSON.stringify(tetrominoes[randomType])); // Deep copy
}

function playerReset() {
    // Current piece becomes the next piece, generate a new next piece
    player.matrix = player.nextMatrix || generateNewPiece(); // Use next or generate if first time
    player.nextMatrix = generateNewPiece();
    player.pos.y = 0;
    player.pos.x = Math.floor(boardWidth / 2) - Math.floor(player.matrix[0].length / 2);

    drawNextPiece(); // Update the preview

    // Game Over check
    if (collide(board, player)) {
        console.log("GAME OVER");
        gameState = 'gameOver';
        gameOverOverlay.style.display = 'flex'; // Show overlay
        startPauseButton.innerText = 'Restart'; // Change button text
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Stop the loop
            animationFrameId = null;
        }
    }
}

// --- Player State ---
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,      // Current falling piece
    nextMatrix: null,  // Next piece to fall
    score: 0,
};


// --- Collision Detection ---
function collide(board, player) {
    const [matrix, offset] = [player.matrix, player.pos];
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < matrix[y].length; ++x) {
            if (matrix[y][x] !== 0 && // Check if it's part of the piece
                (board[y + offset.y] && // Check if the row exists on the board
                 board[y + offset.y][x + offset.x]) !== 0) { // Check if the board cell is occupied
                return true; // Collision detected
            }
        }
    }
    return false; // No collision
}


// --- Player Movement ---
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        // If collision, move back
        player.pos.x -= dir;
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--; // Move back up
        merge(board, player); // Merge the piece into the board
        boardSweep();         // Check for completed lines
        playerReset();        // Get the next piece
        // Optionally increase speed over time/score here
        // dropInterval *= 0.99;
    }
    dropCounter = 0; // Reset counter after any drop attempt (manual or auto)
}


// --- Game State & Timing ---
let dropCounter = 0;
let dropInterval = 1000; // Drop every 1000ms (1 second)
let lastTime = 0;


// --- Game Loop ---
function draw() {
    // Clear canvas (draw background)
    context.fillStyle = '#ddd'; // Background color matching CSS
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the fixed blocks on the board
    drawMatrix(board, 0, 0);

    // Draw the current player piece
    // Draw the current player piece only if the game is not over
    if (gameState !== 'gameOver' && player.matrix) {
        drawMatrix(player.matrix, player.pos.x, player.pos.y);
    }
}

function update(time = 0) {
    if (gameState !== 'playing') {
        // If paused or game over, don't proceed with game logic, but keep requesting frames
        // to allow potential restart or unpause via button.
        // Alternatively, cancel the frame request and restart it on button press.
        // Let's keep it running for simplicity of restart/unpause.
        animationFrameId = requestAnimationFrame(update);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop(); // playerDrop now handles landing, merging, reset, and game over check
    }

    // Draw everything
    draw();

    // Request next frame
    animationFrameId = requestAnimationFrame(update);
}

// --- Keyboard Input ---
document.addEventListener('keydown', event => {
    if (gameState !== 'playing') return; // Ignore input if not playing

    // console.log(event.keyCode); // Useful for debugging key codes
    if (event.keyCode === 37) { // Left arrow
        playerMove(-1);
    } else if (event.keyCode === 39) { // Right arrow
        playerMove(1);
    } else if (event.keyCode === 40) { // Down arrow
        playerDrop(); // Manual drop resets dropCounter inside
    } else if (event.keyCode === 81) { // Q key (rotate counter-clockwise)
        playerRotate(-1);
    } else if (event.keyCode === 87 || event.keyCode === 38) { // W key or Up Arrow (rotate clockwise)
        playerRotate(1);
    }
});

// --- Button Control ---
startPauseButton.addEventListener('click', () => {
    if (gameState === 'playing') {
        gameState = 'paused';
        startPauseButton.innerText = 'Resume';
        // Optional: Stop animation frame requests here and restart on resume
        // if (animationFrameId) {
        //     cancelAnimationFrame(animationFrameId);
        //     animationFrameId = null;
        // }
    } else if (gameState === 'paused') {
        gameState = 'playing';
        startPauseButton.innerText = 'Pause';
        lastTime = performance.now(); // Reset lastTime to avoid large deltaTime jump
        if (!animationFrameId) { // Restart loop if it was fully stopped
            update();
        }
    } else if (gameState === 'gameOver') {
        // Restart the game
        board.forEach(row => row.fill(0)); // Clear board
        player.score = 0; // Reset score
        scoreElement.innerText = player.score;
        playerReset(); // Get first piece, set initial state
        gameState = 'playing'; // Set state to playing
        gameOverOverlay.style.display = 'none'; // Hide overlay
        startPauseButton.innerText = 'Pause';
        lastTime = performance.now(); // Reset time
        if (!animationFrameId) { // Ensure loop starts
            update();
        }
    }
});


// --- Initial Setup ---
function initGame() {
    board.forEach(row => row.fill(0)); // Ensure board is clear
    player.score = 0;
    scoreElement.innerText = player.score;
    player.nextMatrix = null; // Clear any previous next matrix
    playerReset(); // Get first and next piece
    drawNextPiece(); // Draw initial next piece
    draw(); // Draw initial board state
    gameState = 'paused'; // Start paused
    startPauseButton.innerText = 'Start';
    gameOverOverlay.style.display = 'none';
    console.log("Game initialized. Press Start.");
}

initGame(); // Set up the game initially
// update(); // Don't start the loop automatically, wait for button press
