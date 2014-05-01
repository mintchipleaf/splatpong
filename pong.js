var canvas = document.getElementById("game");

var manifest = {
	"images": {
		"playerLeft": "images/playerLeft.png",
		"playerRight": "images/playerRight.png",
		"ball": "images/ball.png"
	},
	"sounds": {
	},
	"fonts": [
	],
	"animations": {
	}
};

var game = new Splat.Game(canvas, manifest);

function invert(number){
	number *= -1;
	return number;
}

function sound(sound){
	game.sounds.play(sound);
}

function ballSpawn(scene){
	var randomNum = Math.random();

	//Ball goes bottom right
	if(randomNum < 0.25){
		ball.vx = speed;
		ball.vy = speed;
	//Ball goes bottom left
	}else if(randomNum < 0.5){
		ball.vx = invert(speed);
		ball.vy = speed;
	//Ball goes top left
	}else if(randomNum < 0.75){
		ball.vx = invert(speed);
		ball.vy = invert(speed);
	//Ball goes top right
	}else {
		ball.vx = speed;
		ball.vy = invert(speed);
	}
	scene.timers.ball.start();
}

function ballCollision(context, scene){
		if(ball.y + ball.height >= canvas.height){
			ball.y = canvas.height - ball.height;
			ball.vy = invert(ball.vy);
			//sound(wallbounce);
		}if(ball.y <= 0){
			ball.y = 0;
			ball.vy = invert(ball.vy);
			//sound(wallbounce);
		}
		paddleCollision();

}

function paddleCollision(){
	if(ball.collides(playerLeft)){
		ball.x = playerLeft.x + playerLeft.width;
		ball.vx = invert(ball.vx);
	}if(ball.collides(playerRight)){
		ball.x = playerRight.x - ball.width;
		ball.vx = invert(ball.vx);
	}
}

function checkPoints(scene){
	var point = false;
		if(ball.x + ball.width < 0){
			scoreRight++;
			point = true;
		}if(ball.x > canvas.width){
			scoreLeft++;
			point = true;
		}
		if(point){
			ball.x = canvas.width / 2 - ball.width / 2;
			ball.y = canvas.height / 2 - ball.height / 2;
			ballSpawn(scene);
			//sound(point);
			point = false;
		}
}


function checkKeys(){
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

	if (game.keyboard.isPressed("w") && playerLeft.y > 0) {
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

var playerLeft;
var playerRight;
var ball;
var waitingToStart = true;
var speed = 0.4;
var scoreLeft = 0;
var scoreRight = 0;

game.scenes.add("title", new Splat.Scene(canvas, function() {
	waitingToStart = true;

	var playerLeftImg = game.images.get("playerLeft");
	playerLeft = new Splat.AnimatedEntity(50, canvas.height / 2  - playerLeftImg.height / 2, playerLeftImg.width, playerLeftImg.height, playerLeftImg, 0, 0);

	var playerRightImg = game.images.get("playerRight");
	playerRight = new Splat.AnimatedEntity(canvas.width - 50 - playerRightImg.width, canvas.height / 2 - playerRightImg.height / 2, playerRightImg.width, playerRightImg.height, playerRightImg, 0, 0);

	var ballImg= game.images.get("ball");
	ball = new Splat.AnimatedEntity(canvas.width / 2 - ballImg.width / 2, canvas.height / 2 - ballImg.height / 2, ballImg.width,  ballImg.height, ballImg, 0, 0);

	this.timers.ball = new Splat.Timer(undefined, 500, function(){this.reset()});

	ballSpawn(this);

}, function(elapsedMillis) {
	if(waitingToStart){
		if(checkKeys()){
			waitingToStart = false;

		}
	}
	if(!waitingToStart){
		playerLeft.move(elapsedMillis);

		playerRight.move(elapsedMillis);

		if(!this.timers.ball.running){
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

	checkKeys();
	checkPoints(this);
	ballCollision();

}, function(context) {
	//draw background gradient
	this.camera.drawAbsolute(context, function() {
		context.fillStyle="black";
		context.fillRect(0,0,canvas.width,canvas.height);
	});

	var lineY = 0;
	while(lineY < canvas.height){
		context.fillStyle="white";
		context.fillRect(canvas.width / 2 - 5,lineY, 10, 50)
		lineY += 100;
	}

	playerLeft.draw(context); //draw player
	playerRight.draw(context);
	ball.draw(context);

	if(waitingToStart){

	}

	this.camera.drawAbsolute(context, function() {
			context.fillStyle = "#ffffff";
			context.font = "100px arial";
			context.fillText(scoreLeft, 100, 100);
			context.fillText(scoreRight, canvas.width - 150, 100)
		});

}));
game.scenes.switchTo("loading");
