const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

const ROW = 20;
const COL = 10;
const SQ = canvas.width / COL; // Size of a square
const VACANT = '#ddd'; // Color of an empty square

// Draw a square
function drawSquare(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * SQ, y * SQ, SQ, SQ);

    context.strokeStyle = '#555'; // Border color
    context.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

// Create the board
let board = [];
for (let r = 0; r < ROW; r++) {
    board[r] = [];
    for (let c = 0; c < COL; c++) {
        board[r][c] = VACANT;
    }
}

// Draw the board
function drawBoard() {
    for (let r = 0; r < ROW; r++) {
        for (let c = 0; c < COL; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

drawBoard();

let score = 0;

// --- Tetrominoes and their colors ---
const PIECES = [
    [Z, "red"],
    [S, "green"],
    [T, "purple"],
    [O, "blue"],
    [L, "orange"],
    [I, "cyan"],
    [J, "yellow"]
];

// --- The Objects ---

// Generate random pieces
function randomPiece() {
    let r = Math.floor(Math.random() * PIECES.length); // 0 -> 6
    return new Piece(PIECES[r][0], PIECES[r][1]);
}

let p = randomPiece();

// The Piece object
function Piece(tetromino, color) {
    this.tetromino = tetromino;
    this.color = color;

    this.tetrominoN = 0; // Start from the first rotation pattern
    this.activeTetromino = this.tetromino[this.tetrominoN];

    // Default starting position
    this.x = 3; // Middle of the board approximately
    this.y = -2; // Start slightly above the visible board
}

// Fill function to draw the piece
Piece.prototype.fill = function(color) {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino[r].length; c++) {
            // Draw only occupied squares
            if (this.activeTetromino[r][c]) {
                drawSquare(this.x + c, this.y + r, color);
            }
        }
    }
}

// Draw a piece to the board
Piece.prototype.draw = function() {
    this.fill(this.color);
}

// Undraw a piece (fill with vacant color)
Piece.prototype.unDraw = function() {
    this.fill(VACANT);
}

// Move Down the piece
Piece.prototype.moveDown = function() {
    if (!this.collision(0, 1, this.activeTetromino)) {
        this.unDraw();
        this.y++;
        this.draw();
    } else {
        // Lock the piece and generate a new one
        this.lock();
        p = randomPiece();
    }
}

// Move Right the piece
Piece.prototype.moveRight = function() {
    if (!this.collision(1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x++;
        this.draw();
    }
}

// Move Left the piece
Piece.prototype.moveLeft = function() {
    if (!this.collision(-1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x--;
        this.draw();
    }
}

// Rotate the piece
Piece.prototype.rotate = function() {
    let nextPattern = this.tetromino[(this.tetrominoN + 1) % this.tetromino.length];
    let kick = 0;

    if (this.collision(0, 0, nextPattern)) {
        if (this.x > COL / 2) {
            // It's the right wall
            kick = -1; // We need to move the piece to the left
        } else {
            // It's the left wall
            kick = 1; // We need to move the piece to the right
        }
    }

    if (!this.collision(kick, 0, nextPattern)) {
        this.unDraw();
        this.x += kick;
        this.tetrominoN = (this.tetrominoN + 1) % this.tetromino.length; // Update the pattern index
        this.activeTetromino = this.tetromino[this.tetrominoN]; // Update the active tetromino
        this.draw();
    }
}

// Lock the piece in place
Piece.prototype.lock = function() {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino[r].length; c++) {
            // Skip vacant squares
            if (!this.activeTetromino[r][c]) {
                continue;
            }
            // Pieces to lock on top = game over
            if (this.y + r < 0) {
                alert("Game Over");
                // Stop request animation frame
                gameOver = true;
                break;
            }
            // Lock the piece onto the board
            board[this.y + r][this.x + c] = this.color;
        }
    }
    // Remove full rows
    for (let r = 0; r < ROW; r++) {
        let isRowFull = true;
        for (let c = 0; c < COL; c++) {
            isRowFull = isRowFull && (board[r][c] !== VACANT);
        }
        if (isRowFull) {
            // If the row is full, move down all rows above it
            for (let y = r; y > 1; y--) {
                for (let c = 0; c < COL; c++) {
                    board[y][c] = board[y - 1][c];
                }
            }
            // The top row board[0] has no row above it
            for (let c = 0; c < COL; c++) {
                board[0][c] = VACANT;
            }
            // Increment the score
            score += 10;
        }
    }
    // Update the board
    drawBoard();

    // Update score
    scoreElement.innerHTML = score;
}


// Collision detection function
Piece.prototype.collision = function(x, y, piece) {
    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece[r].length; c++) {
            // If the square is empty, skip it
            if (!piece[r][c]) {
                continue;
            }

            // Coordinates of the piece after movement
            let newX = this.x + c + x;
            let newY = this.y + r + y;

            // Conditions for collision
            if (newX < 0 || newX >= COL || newY >= ROW) {
                return true; // Collision with walls or bottom
            }
            // Skip negative Y values - checking above the board boundary
            if (newY < 0) {
                continue;
            }
            // Check for collision with locked pieces
            if (board[newY][newX] !== VACANT) {
                return true;
            }
        }
    }
    return false;
}


// --- Control the piece ---
document.addEventListener("keydown", CONTROL);

function CONTROL(event) {
    if (event.keyCode == 37) { // Left arrow
        p.moveLeft();
        dropStart = Date.now(); // Reset drop timer
    } else if (event.keyCode == 38) { // Up arrow (Rotate)
        p.rotate();
        dropStart = Date.now(); // Reset drop timer
    } else if (event.keyCode == 39) { // Right arrow
        p.moveRight();
        dropStart = Date.now(); // Reset drop timer
    } else if (event.keyCode == 40) { // Down arrow (Accelerate drop)
        p.moveDown();
    }
}

// --- Game Loop ---
let dropStart = Date.now();
let gameOver = false;

function drop() {
    let now = Date.now();
    let delta = now - dropStart;
    if (delta > 1000) { // Drop every 1 second
        p.moveDown();
        dropStart = Date.now();
    }
    if (!gameOver) {
        requestAnimationFrame(drop);
    }
}

// Need to define the actual shapes (Tetrominoes)
// Z shape
const Z = [
    [[1, 1, 0],
     [0, 1, 1],
     [0, 0, 0]],

    [[0, 0, 1],
     [0, 1, 1],
     [0, 1, 0]]
];

// S shape
const S = [
    [[0, 1, 1],
     [1, 1, 0],
     [0, 0, 0]],

    [[0, 1, 0],
     [0, 1, 1],
     [0, 0, 1]]
];

// T shape
const T = [
    [[0, 1, 0],
     [1, 1, 1],
     [0, 0, 0]],

    [[0, 1, 0],
     [0, 1, 1],
     [0, 1, 0]],

    [[0, 0, 0],
     [1, 1, 1],
     [0, 1, 0]],

    [[0, 1, 0],
     [1, 1, 0],
     [0, 1, 0]]
];

// O shape (Square)
const O = [
    [[1, 1],
     [1, 1]]
];

// L shape
const L = [
    [[0, 0, 1],
     [1, 1, 1],
     [0, 0, 0]],

    [[0, 1, 0],
     [0, 1, 0],
     [0, 1, 1]],

    [[0, 0, 0],
     [1, 1, 1],
     [1, 0, 0]],

    [[1, 1, 0],
     [0, 1, 0],
     [0, 1, 0]]
];

// I shape (Line)
const I = [
    [[0, 0, 0, 0],
     [1, 1, 1, 1],
     [0, 0, 0, 0],
     [0, 0, 0, 0]],

    [[0, 1, 0, 0],
     [0, 1, 0, 0],
     [0, 1, 0, 0],
     [0, 1, 0, 0]]
];

// J shape
const J = [
    [[1, 0, 0],
     [1, 1, 1],
     [0, 0, 0]],

    [[0, 1, 1],
     [0, 1, 0],
     [0, 1, 0]],

    [[0, 0, 0],
     [1, 1, 1],
     [0, 0, 1]],

    [[0, 1, 0],
     [0, 1, 0],
     [1, 1, 0]]
];


// Start the game loop
drop();
