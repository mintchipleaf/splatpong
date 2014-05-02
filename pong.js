"use strict";

// Store Html5 canvas tag called "game" as variable "canvas"
var canvas = document.getElementById("game");

// This is the manifest, which tells Splat where all your assets are located
var manifest = {
	// Add non-animated pictures here
	"images": {
		"playerLeft": "images/playerLeft.png",
		"playerRight": "images/playerRight.png",
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

function ballCollision(ball, playerLeft, playerRight) {
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
	if (ball.collides(playerLeft)) {
		ball.x = playerLeft.x + playerLeft.width;
		ball.vx = -ball.vx;
		game.sounds.play("paddlebounce");
	}
	if (ball.collides(playerRight)) {
		ball.x = playerRight.x - ball.width;
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

function checkKeys(playerLeft, playerRight) {
	var key = false;
	if (movePlayer(playerRight, "up", "down")) {
		key = true;
	}
	if (movePlayer(playerLeft, "w", "s")) {
		key = true;
	}
	return key;
}

function movePlayer(player, upKey, downKey) {
	var speed = 0.7;
	player.vy = 0;
	if (game.keyboard.isPressed(upKey) && player.y > 0) {
		player.vy = -speed;
		return true;
	} else if (game.keyboard.isPressed(downKey) && player.y + player.height < canvas.height) {
		player.vy = speed;
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
	var playerLeftImg = game.images.get("playerLeft");
	this.playerLeft = new Splat.AnimatedEntity(50, halfCanvasHeight  - playerLeftImg.height / 2, playerLeftImg.width, playerLeftImg.height, playerLeftImg, 0, 0);

	var playerRightImg = game.images.get("playerRight");
	this.playerRight = new Splat.AnimatedEntity(canvas.width - 50 - playerRightImg.width, halfCanvasHeight - playerRightImg.height / 2, playerRightImg.width, playerRightImg.height, playerRightImg, 0, 0);

	var ballImg = game.images.get("ball");
	this.ball = new Splat.AnimatedEntity(0, 0, ballImg.width,  ballImg.height, ballImg, 0, 0);

	this.timers.ball = new Splat.Timer(undefined, 500, function() {
		this.reset();
	});

	ballSpawn(this.ball, this);

}, function(elapsedMillis) { //***Simulation
	if (this.waitingToStart) {
		if (checkKeys(this.playerLeft, this.playerRight)) {
			this.waitingToStart = false;
		} else {
			return;
		}
	}
	this.playerLeft.move(elapsedMillis);
	this.playerRight.move(elapsedMillis);

	if (!this.timers.ball.running) {
		this.ball.move(elapsedMillis);
	}

	checkKeys(this.playerLeft, this.playerRight);
	checkPoints(this.ball, this);
	ballCollision(this.ball, this.playerLeft, this.playerRight);

}, function(context) {	//***Drawing
	// draw background
	context.fillStyle="black";
	context.fillRect(0, 0, canvas.width, canvas.height);

	for (var lineY = -25; lineY < canvas.height; lineY += 100) {
		context.fillStyle = "white";
		context.fillRect(canvas.width / 2 - 5, lineY, 10, 50);
	}

	this.playerLeft.draw(context); 	// draw left paddle
	this.playerRight.draw(context);	// draw right paddle
	this.ball.draw(context);			// draw ball

	if (this.waitingToStart) {
		context.fillStyle = "#ffffff";
		context.font = "150px arial";
		context.fillText("SPLAT", 200, 200);
		context.fillText("PONG", canvas.width - 700, 200);

		context.font = "50px arial";
		context.fillText("w", this.playerLeft.x, this.playerLeft.y - 30);
		context.fillText("s", this.playerLeft.x, this.playerLeft.y + this.playerLeft.height + 50);
		context.fillText("^", this.playerRight.x, this.playerRight.y - 10);
		context.fillText("v", this.playerRight.x, this.playerRight.y + this.playerRight.height + 50);
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
