"use strict";

// Store Html5 canvas tag called "game" as variable "canvas"
var canvas = document.getElementById("game");

// This is the manifest, which tells Splat where all your assets are located
var manifest = {
	// Add non-animated pictures here
	"images": {
		"leftPaddle": "images/leftPaddle.png",
		"rightPaddle": "images/rightPaddle.png",
		"ball": "images/ball.png"
	},
	// Sounds (wav and mp3) (IE can't do wav [For SOME reason])
	"sounds": {
		"wallbounce": "sounds/blip1.wav",
		"paddlebounce": "sounds/blip2.wav",
		"point": "sounds/point.wav"
	},
	// Fonts (specify font location in css @font-face{})
	"fonts": [
	],
	// Animated pictures
	"animations": {
	/*TODO:
		Add sample animations
	*/
	}
};

// Make new "game" variable with "canvas" from line 1
var game = new Splat.Game(canvas, manifest);

// Variables that initialize once when the page is loaded
var scoreLeft = 0;	// Score for left paddle
var scoreRight = 0;	// Score for right paddle

/*
	The following functions were created by me and are not necessary for a Splat game to run.
*/

// Set beginning ball speed and direction
function ballSpawn(ball, scene) {
	var speed = 0.4;
	var randomNum = Math.random();

	ball.x = canvas.width / 2 - ball.width / 2;
	ball.y = canvas.height / 2 - ball.height / 2;

	// Ball goes towards bottom right
	if (randomNum < 0.25) {
		ball.vx = speed;
		ball.vy = speed;
	// Ball goes towards bottom left
	} else if (randomNum < 0.5) {
		ball.vx = -speed;
		ball.vy = speed;
	// Ball goes towards top left
	} else if (randomNum < 0.75) {
		ball.vx = -speed;
		ball.vy = -speed;
	// Ball goes towards top right
	} else {
		ball.vx = speed;
		ball.vy = -speed;
	}
	// Start timer for delayed ball movement
	scene.timers.ball.start();
}

function ballCollision(ball, leftPaddle, rightPaddle) {
	if (ball.y + ball.height >= canvas.height) {
		ball.y = canvas.height - ball.height;
		ball.vy = -ball.vy;
		game.sounds.play("wallbounce");
	}
	if (ball.y <= 0) {
		ball.y = 0;
		ball.vy = -ball.vy;
		game.sounds.play("wallbounce");
	}
	if (ball.collides(leftPaddle)) {
		ball.x = leftPaddle.x + leftPaddle.width;
		ball.vx = -ball.vx;
		game.sounds.play("paddlebounce");
	}
	if (ball.collides(rightPaddle)) {
		ball.x = rightPaddle.x - ball.width;
		ball.vx = -ball.vx;
		game.sounds.play("paddlebounce");
	}
}

function checkPoints(ball, scene) {
	if (ball.x + ball.width < 0) {
		scoreRight++;
		pointScored(ball, scene);
	}
	if (ball.x > canvas.width) {
		scoreLeft++;
		pointScored(ball, scene);
	}
}

function pointScored(ball, scene) {
	ballSpawn(ball, scene);
	game.sounds.play("point");
}

function checkKeys(leftPaddle, rightPaddle) {
	var key = false;
	if (movePaddle(rightPaddle, "up", "down")) {
		key = true;
	}
	if (movePaddle(leftPaddle, "w", "s")) {
		key = true;
	}
	return key;
}

function movePaddle(paddle, upKey, downKey) {
	var speed = 0.7;
	paddle.vy = 0;
	if (game.keyboard.isPressed(upKey) && paddle.y > 0) {
		paddle.vy = -speed;
		return true;
	} else if (game.keyboard.isPressed(downKey) && paddle.y + paddle.height < canvas.height) {
		paddle.vy = speed;
		return true;
	}
	return false;
}

/*
	User-created functions end above
*/

/*
	Here's where the magic happens. Each Splat game has at least one "scene".
	NOTE: A "loading" and "title" scene is NECESSARY (for Splat's built in loading), "loading" scene is called first and is called at the last line of the file. 

	Scenes look like this:
		game.scenes.add("nameOfScene", new Splat.Scene(canvas, function() { }, function(elapsedmillis){}, function(context){}));

	Scenes are switched to with:
		game.scenes.switchTo("nameOfScene");
	
	Each scene has three parts (functions): Initializer, Simulation, and Drawing.
	***Initializer
		This function runs only once when the scene is switched to or started.
		This is where you declare and set variables how you want them to be at the beginning of the scene.
		(Useful to clear arrays, make entities like players, switch on title screen, start timers, etc)
		NOTE: Nothing is drawn or moved here but you can still set position and velocities.

	***Simulation (uses elapsedmillis)
		This function is run EVERY SINGLE FRAME and can be thought of as "the actual game" as far as movement/interactivity.
		This is where you check for user input and collisions, play sounds, move things,  
		Code that responds to input, movement, position, etc will be found here
		(Since anything here is run many times per second if checks and timers are important to only have code run when you want it to)
		NOTE: You may need to pass "this" (for anything using "scene") or "elapsedmillis" as arguments into functions here.

	***Drawing (uses context)
		This function is run every fame like Simulation is, but is used to draw pictures, animation, text, and shapes on to the HTML5 canvas object.
		NOTE: The "camera" is view area you can currently see, not the whole drawable canvas area. These are not always the same, canvas area extends past the current camera view.
		Use this.camera.drawAbsolute(context, function() {}); to draw to a specific coordinate of the CAMERA instead of the CANVAS
*/
game.scenes.add("title", new Splat.Scene(canvas, function() { //***Initializer
	// Start the title screen
	this.waitingToStart = true;

	var halfCanvasHeight = canvas.height / 2;
	var leftPaddleImg = game.images.get("leftPaddle");
	this.leftPaddle = new Splat.AnimatedEntity(50, halfCanvasHeight  - leftPaddleImg.height / 2, leftPaddleImg.width, leftPaddleImg.height, leftPaddleImg, 0, 0);

	var rightPaddleImg = game.images.get("rightPaddle");
	this.rightPaddle = new Splat.AnimatedEntity(canvas.width - 50 - rightPaddleImg.width, halfCanvasHeight - rightPaddleImg.height / 2, rightPaddleImg.width, rightPaddleImg.height, rightPaddleImg, 0, 0);

	var ballImg = game.images.get("ball");
	this.ball = new Splat.AnimatedEntity(0, 0, ballImg.width,  ballImg.height, ballImg, 0, 0);

	this.timers.ball = new Splat.Timer(undefined, 500, function() {
		this.reset();
	});

	ballSpawn(this.ball, this);

}, function(elapsedMillis) { //***Simulation
	if (this.waitingToStart) {
		if (checkKeys(this.leftPaddle, this.rightPaddle)) {
			this.waitingToStart = false;
		} else {
			return;
		}
	}

	checkKeys(this.leftPaddle, this.rightPaddle);
	this.leftPaddle.move(elapsedMillis);
	this.rightPaddle.move(elapsedMillis);

	if (!this.timers.ball.running) {
		this.ball.move(elapsedMillis);
		checkPoints(this.ball, this);
		ballCollision(this.ball, this.leftPaddle, this.rightPaddle);
	}
}, function(context) {	//***Drawing
	// draw background
	context.fillStyle = "black";
	context.fillRect(0, 0, canvas.width, canvas.height);

	for (var lineY = -25; lineY < canvas.height; lineY += 100) {
		context.fillStyle = "white";
		context.fillRect(canvas.width / 2 - 5, lineY, 10, 50);
	}

	this.leftPaddle.draw(context); 	// draw left paddle
	this.rightPaddle.draw(context);	// draw right paddle
	this.ball.draw(context);			// draw ball

	if (this.waitingToStart) {
		context.fillStyle = "#ffffff";
		context.font = "150px arial";
		context.fillText("SPLAT", 200, 200);
		context.fillText("PONG", canvas.width - 700, 200);

		context.font = "50px arial";
		context.fillText("w", this.leftPaddle.x, this.leftPaddle.y - 30);
		context.fillText("s", this.leftPaddle.x, this.leftPaddle.y + this.leftPaddle.height + 50);
		context.fillText("^", this.rightPaddle.x, this.rightPaddle.y - 10);
		context.fillText("v", this.rightPaddle.x, this.rightPaddle.y + this.rightPaddle.height + 50);
	} else {
		context.fillStyle = "#ffffff";
		context.font = "100px arial";
		context.fillText(scoreLeft, 100, 100);
		context.fillText(scoreRight, canvas.width - 150, 100);
	}
}));

/*
	This "loading" scene is the first thing called (shows loading bar and loads images, sounds, etc from the manifest
*/
game.scenes.switchTo("loading");
