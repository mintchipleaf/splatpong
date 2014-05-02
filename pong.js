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
var ball;			// What it says
var waitingToStart = true;	// Used for start/title screen
var scoreLeft = 0;	// Score for left paddle
var scoreRight = 0;	// Score for right paddle

/*
	The following functions were created by me and are not necessary for a Splat game to run.
*/

// Set beginning ball speed and direction
function ballSpawn(scene) {
	var speed = 0.4;
	var randomNum = Math.random();

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

function ballCollision(playerLeft, playerRight) {
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
	paddleCollision(playerLeft, playerRight);
}

function paddleCollision(playerLeft, playerRight) {
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

function checkPoints(scene) {
	var point = false;
	if (ball.x + ball.width < 0) {
		scoreRight++;
		point = true;
	}
	if (ball.x > canvas.width) {
		scoreLeft++;
		point = true;
	}
	if (point) {
		ball.x = canvas.width / 2 - ball.width / 2;
		ball.y = canvas.height / 2 - ball.height / 2;
		ballSpawn(scene);
		game.sounds.play("point");
		point = false;
	}
}

function checkKeys(playerLeft, playerRight) {
	var key = false;
	if (game.keyboard.isPressed("up") && playerRight.y > 0) {
		playerRight.vy = -0.7;
		key = true;
	} else if (game.keyboard.isPressed("down") && playerRight.y + playerRight.height < canvas.height) {
		playerRight.vy = 0.7;
		key = true;
	} else {
		playerRight.vy = 0;
	}

	if (game.keyboard.isPressed("w") && playerLeft.y >  0) {
		playerLeft.vy = -0.7;
		key = true;
	} else if (game.keyboard.isPressed("s") && playerLeft.y + playerLeft.height < canvas.height) {
		playerLeft.vy = 0.7;
		key = true;
	} else {
		playerLeft.vy = 0;
	}
	return key;
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
	waitingToStart = true;	// Start the title screen

	var playerLeftImg = game.images.get("playerLeft");
	this.playerLeft = new Splat.AnimatedEntity(50, canvas.height / 2  - playerLeftImg.height / 2, playerLeftImg.width, playerLeftImg.height, playerLeftImg, 0, 0);

	var playerRightImg = game.images.get("playerRight");
	this.playerRight = new Splat.AnimatedEntity(canvas.width - 50 - playerRightImg.width, canvas.height / 2 - playerRightImg.height / 2, playerRightImg.width, playerRightImg.height, playerRightImg, 0, 0);

	var ballImg = game.images.get("ball");
	ball = new Splat.AnimatedEntity(canvas.width / 2 - ballImg.width / 2, canvas.height / 2 - ballImg.height / 2, ballImg.width,  ballImg.height, ballImg, 0, 0);

	this.timers.ball = new Splat.Timer(undefined, 500, function() {
		this.reset();
	});

	ballSpawn(this);

}, function(elapsedMillis) { //***Simulation
	if (waitingToStart) {
		if (checkKeys(this.playerLeft, this.playerRight)) {
			waitingToStart = false;
		}
	}
	if (!waitingToStart) {
		this.playerLeft.move(elapsedMillis);
		this.playerRight.move(elapsedMillis);

		if (!this.timers.ball.running) {
			ball.move(elapsedMillis);
		}
	}

	/*if(waitingToStart) {
		var startTimer = this.timer("start");
		this.camera.vy = player.vy;
		player.vy = 1;
		if(startTimer > 100 && anythingWasPressed()){
			//game.sounds.play("music", true);
			this.stopTimer("start");
			startPos = player.y;
			waitingToStart = false;
		}
	}*/

	checkKeys(this.playerLeft, this.playerRight);
	checkPoints(this);
	ballCollision(this.playerLeft, this.playerRight);

}, function(context) {	//***Drawing
	// draw background
	context.fillStyle="black";
	context.fillRect(0, 0, canvas.width, canvas.height);

	var lineY = -25;
	while (lineY < canvas.height) {
		context.fillStyle="white";
		context.fillRect(canvas.width / 2 - 5, lineY, 10, 50);
		lineY += 100;
	}

	this.playerLeft.draw(context); 	// draw left paddle
	this.playerRight.draw(context);	// draw right paddle
	ball.draw(context);			// draw ball

	if (waitingToStart) {
		context.fillStyle = "#ffffff";
		context.font = "150px arial";
		context.fillText("SPLAT", 200, 200);
		context.fillText("PONG", canvas.width - 700, 200);

		context.font = "50px arial";
		context.fillText("w", this.playerLeft.x, this.playerLeft.y - 30);
		context.fillText("s", this.playerLeft.x, this.playerLeft.y + this.playerLeft.height + 50);
		context.fillText("^", this.playerRight.x, this.playerRight.y - 10);
		context.fillText("v", this.playerRight.x, this.playerRight.y + this.playerRight.height + 50);
	}

	if (!waitingToStart) {
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
