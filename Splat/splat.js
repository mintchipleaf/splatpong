!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Splat=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

function Accelerometer(canvas) {
	this.alpha = 0;
	this.beta = 0;
	this.gamma = 0;

	var that = this;
	window.addEventListener('deviceorientation', function(event) {
	    that.alpha = event.alpha;
	    that.beta = event.beta;
	    that.gamma = event.gamma;
	}, false);
}

module.exports = Accelerometer;
},{}],2:[function(_dereq_,module,exports){
"use strict";

var Entity = _dereq_("./entity");

function AnimatedEntity(x, y, width, height, sprite, spriteOffsetX, spriteOffsetY) {
	this.sprite = sprite;
	this.spriteOffsetX = spriteOffsetX;
	this.spriteOffsetY = spriteOffsetY;
	Entity.call(this, x, y, width, height);
}
AnimatedEntity.prototype = Object.create(Entity.prototype);
AnimatedEntity.prototype.move = function(elapsedMillis) {
	Entity.prototype.move.call(this, elapsedMillis);
	if (typeof this.sprite.move === "function") {
		this.sprite.move(elapsedMillis);
	}
};
AnimatedEntity.prototype.draw = function(context) {
	if (typeof this.sprite.draw === "function") {
		this.sprite.draw(context, this.x + this.spriteOffsetX, this.y + this.spriteOffsetY);
	} else {
		context.drawImage(this.sprite, this.x + this.spriteOffsetX, this.y + this.spriteOffsetY);
	}
	// draw bounding boxes
	// context.strokeStyle = "#ff0000";
	// context.strokeRect(this.x, this.y, this.width, this.height);
};
AnimatedEntity.prototype.copy = function() {
	return new AnimatedEntity(this.x, this.y, this.width, this.height, this.sprite, this.spriteOffsetX, this.spriteOffsetY);
};

module.exports = AnimatedEntity;

},{"./entity":7}],3:[function(_dereq_,module,exports){
"use strict";

var buffer = _dereq_("./buffer");

function Animation() {
	this.frames = [];
	this.frame = 0;
	this.elapsedMillis = 0;
	this.repeatAt = 0;
	this.width = 0;
	this.height = 0;
}
Animation.prototype.add = function(img, time) {
	this.frames.push({img: img, time: time});
	if (this.frames.length === 1) {
		this.width = img.width;
		this.height = img.height;
	}
};
Animation.prototype.step = function() {
	this.frame++;
	if (this.frame >= this.frames.length) {
		this.frame = this.repeatAt;
	}
};
Animation.prototype.move = function(elapsedMillis) {
	this.elapsedMillis += elapsedMillis;
	while (this.elapsedMillis > this.frames[this.frame].time) {
		this.elapsedMillis -= this.frames[this.frame].time;
		this.step();
	}
};
Animation.prototype.draw = function(context, x, y) {
	var img = this.frames[this.frame].img;
	context.drawImage(img, x, y);
};
Animation.prototype.reset = function() {
	this.frame = 0;
	this.elapsedMillis = 0;
};
Animation.prototype.flipHorizontally = function() {
	for (var i = 0; i < this.frames.length; i++) {
		this.frames[i].img = buffer.flipBufferHorizontally(this.frames[i].img);
	}
};
Animation.prototype.flipVertically = function() {
	for (var i = 0; i < this.frames.length; i++) {
		this.frames[i].img = buffer.flipBufferVertically(this.frames[i].img);
	}
};

module.exports = Animation;

},{"./buffer":5}],4:[function(_dereq_,module,exports){
"use strict";

var buffer = _dereq_("./buffer");
var Animation = _dereq_("./animation");

function makeFrame(img, frameWidth, f) {
	return buffer.makeBuffer(frameWidth, img.height, function(ctx) {
		var sx = f * frameWidth;
		ctx.drawImage(img, sx, 0, frameWidth, img.height, 0, 0, frameWidth, img.height);
	});
}

function makeAnimation(img, numFrames, time) {
	var a = new Animation();
	var frameWidth = img.width / numFrames |0;
	for (var f = 0; f < numFrames; f++) {
		a.add(makeFrame(img, frameWidth, f), time);
	}
	return a;
}

function loadImageFromManifest(imageLoader, name, info) {
	if (info.strip !== undefined) {
		imageLoader.load(name, info.strip);
	} else if (info.prefix !== undefined) {
		for (var i = 1; i <= info.frames; i++) {
			var number = "" + i;
			if (info.padNumberTo > 1) {
				while (number.length < info.padNumberTo) {
					number = "0" + number;
				}
			}
			name = info.prefix + number + info.suffix;
			imageLoader.load(name + i, name);
		}
	}
}

function loadImagesFromManifest(imageLoader, manifest) {
	for (var key in manifest) {
		if (manifest.hasOwnProperty(key)) {
			var info = manifest[key];
			loadImageFromManifest(imageLoader, key, info);
		}
	}
}

function makeAnimationFromManifest(images, key, manifestEntry) {
	var animation;
	if (manifestEntry.strip !== undefined) {
		var strip = images.get(key);
		animation = makeAnimation(strip, manifestEntry.frames, manifestEntry.msPerFrame);
	} else if (manifestEntry.prefix !== undefined) {
		animation = new Animation();
		for (var i = 1; i <= manifestEntry.frames; i++) {
			var frame = images.get(key + i);
			animation.add(frame, manifestEntry.msPerFrame);
		}
	}
	if (manifestEntry.repeatAt !== undefined) {
		animation.repeatAt = manifestEntry.repeatAt;
	}
	if (manifestEntry.flip === "horizontal") {
		animation.flipHorizontally();
	}
	if (manifestEntry.flip === "vertical") {
		animation.flipVertically();
	}
	animation.name = key;
	return animation;
}

function generateAnimationsFromManifest(images, manifest) {
	var animations = {};
	for (var key in manifest) {
		if (manifest.hasOwnProperty(key)) {
			var info = manifest[key];
			animations[key] = makeAnimationFromManifest(images, key, info);
		}
	}
	return animations;
}

function AnimationLoader(imageLoader, manifest) {
	this.imageLoader = imageLoader;
	this.manifest = manifest;
	loadImagesFromManifest(imageLoader, manifest);
}
AnimationLoader.prototype.allLoaded = function() {
	if (this.loaded) {
		return true;
	}
	var loaded = this.imageLoader.allLoaded();
	if (loaded) {
		this.animations = generateAnimationsFromManifest(this.imageLoader, this.manifest);
		this.loaded = true;
	}
	return loaded;
};
AnimationLoader.prototype.load = function(name, info) {
	this.manifest[name] = info;
	this.loaded = false;
	loadImageFromManifest(this.imageLoader, name, info);
};
AnimationLoader.prototype.get = function(name) {
	var anim = this.animations[name];
	if (anim === undefined) {
		console.error("Unknown animation: " + name);
	}
	return anim;
};

module.exports = AnimationLoader;

},{"./animation":3,"./buffer":5}],5:[function(_dereq_,module,exports){
"use strict";
/** @module buffer */

/**
 * Make an invisible {@link canvas}.
 * @param {number} width The width of the canvas
 * @param {number} height The height of the canvas
 * @returns {canvas} A canvas DOM element
 * @private
 */
function makeCanvas(width, height) {
	var c = document.createElement("canvas");
	c.width = width;
	c.height = height;
	return c;
}

/**
 * Make an invisible canvas buffer, and draw on it.
 * @param {number} width The width of the buffer
 * @param {number} height The height of the buffer
 * @param {drawCallback} drawFun The callback that draws on the buffer
 * @returns {external:canvas} The drawn buffer
 */
function makeBuffer(width, height, drawFun) {
	var canvas = makeCanvas(width, height);
	var ctx = canvas.getContext("2d");
	drawFun(ctx);
	return canvas;
}

/**
 * Make a horizonally-flipped copy of a buffer or image.
 * @param {external:canvas|external:image} buffer The original image
 * @return {external:canvas} The flipped buffer
 */
function flipBufferHorizontally(buffer) {
	return makeBuffer(buffer.width, buffer.height, function(context) {
		context.scale(-1, 1);
		context.drawImage(buffer, -buffer.width, 0);
	});
}

/**
 * Make a vertically-flipped copy of a buffer or image.
 * @param {external:canvas|external:image} buffer The original image
 * @return {external:canvas} The flipped buffer
 */
function flipBufferVertically(buffer) {
	return makeBuffer(buffer.width, buffer.height, function(context) {
		context.scale(1, -1);
		context.drawImage(buffer, 0, -buffer.height);
	});
}

module.exports = {
	makeBuffer: makeBuffer,
	flipBufferHorizontally: flipBufferHorizontally,
	flipBufferVertically: flipBufferVertically
};

},{}],6:[function(_dereq_,module,exports){
"use strict";

var Entity = _dereq_("./entity");

/**
 * A basic camera. It's really an {@link Entity}, so you can control it in the same way.
 * By changing {@link Entity#x} and {@link Entity#y} you control what portion of the canvas is viewable.
 * For example, if the Camera is at 50,50, and you draw a rectangle at 200,200,
 * it will appear on the screen at 150,150.
 * @constructor
 * @param {number} x The top-left x coordinate
 * @param {number} y The top-left y coordinate
 * @param {number} width The width on the x-axis. Currently doesn't do anything.
 * @param {number} height The height on the y-axis. Currently doesn't do anything.
 */
function Camera(x, y, width, height) {
	Entity.call(this, x, y, width, height);
}
Camera.prototype = Object.create(Entity.prototype);
/**
 * Offset all following draw operations on the canvas.
 * This is automatically called for you by {@link Scene}.
 * @param {external:CanvasRendingContext2D} context The context to offset
 */
Camera.prototype.draw = function(context) {
	context.translate(-(this.x|0), -(this.y|0));
};
/**
 * Draw on the canvas at not-offset coordinates.
 * For example, if the camera is at 50,50 and you draw a rectangle at 200,200
 * it will appear on the screen at 200,200.
 * @param {external:CanvasRendingContext2D} context The context to offset
 * @param {drawCallback} context The callback the performs the non-offset drawing.
 */
Camera.prototype.drawAbsolute = function(context, drawFunc) {
	context.save();
	context.translate(this.x|0, this.y|0);
	drawFunc();
	context.restore();
};

module.exports = Camera;

},{"./entity":7}],7:[function(_dereq_,module,exports){
"use strict";

/**
 * The base in-game object, it supports a location and velocity.
 * Entities are boxes, consisting of an x,y coordinate along with a width and height.
 * Entities can have basic collision detection, and can resolve collisions in a basic way.
 * @constructor
 * @param {number} x The top-left x coordinate
 * @param {number} y The top-left y coordinate
 * @param {number} width The width on the x-axis
 * @param {number} height The height on the y-axis
 */
function Entity(x, y, width, height) {
	/**
	 * Leftmost position along the x-axis.
	 * @member {number}
	 */
	this.x = x;
	/**
	 * Topmost position along the y-axis.
	 * @member {number}
	 */
	this.y = y;
	/**
	 * Width of the Entity, extending to the right of {@link Entity#x}.
	 * @member {number}
	 */
	this.width = width;
	/**
	 * Height of the Entity, extending downward from {@link Entity#y}.
	 * @member {number}
	 */
	this.height = height;
	/**
	 * Velocity along the x-axis in pixels/millisecond.
	 * @member {number}
	 */
	this.vx = 0;
	/**
	 * Velocity along the y-axis in pixels/millisecond.
	 * @member {number}
	 */
	this.vy = 0;
	/**
	 * The value of {@link Entity#x} in the last frame.
	 * @member {number}
	 * @readonly
	 */
	this.lastX = x;
	/**
	 * The value of {@link Entity#y} in the last frame.
	 * @member {number}
	 * @readonly
	 */
	this.lastY = y;
	/**
	 * A multiplier on {@link Entity#vx}. Can be used to implement basic friction.
	 * @member {number}
	 * @private
	 */
	this.frictionX = 1;
	/**
	 * A multiplier on {@link Entity#vy}. Can be used to implement basic friction.
	 * @member {number}
	 * @private
	 */
	this.frictionY = 1;
}
/**
 * Simulate movement since the last frame, changing {@link Entity#x} and {@link Entity#y} as necessary.
 * @param {number} elapsedMillis The number of milliseconds since the last frame.
 */
Entity.prototype.move = function(elapsedMillis) {
	this.lastX = this.x;
	this.lastY = this.y;
	this.x += elapsedMillis * this.vx;
	this.y += elapsedMillis * this.vy;
	this.vx *= this.frictionX;
	this.vy *= this.frictionY;
};
/**
 * Test if this Entity horizontally overlaps another.
 * @param {Entity} other The Entity to test for overlap with
 * @returns {boolean}
 */
Entity.prototype.overlapsHoriz = function(other) {
	return this.x + this.width >= other.x && this.x <= other.x + other.width;
};
/**
 * Test if this Entity vertically overlaps another.
 * @param {Entity} other The Entity to test for overlap with
 * @returns {boolean}
 */
Entity.prototype.overlapsVert = function(other) {
	return this.y + this.height >= other.y && this.y <= other.y + other.height;
};
/**
 * Test if this Entity is currently colliding with another.
 * @param {Entity} other The Entity to test for collision with
 * @returns {boolean}
 */
Entity.prototype.collides = function(other) {
	return this.overlapsHoriz(other) && this.overlapsVert(other);
};

/**
 * Test if this Entity horizontally overlapped another in the previous frame.
 * @param {Entity} other The Entity to test for overlap with
 * @returns {boolean}
 */
Entity.prototype.didOverlapHoriz = function(other) {
	return this.lastX + this.width >= other.lastX && this.lastX <= other.lastX + other.width;
};
/**
 * Test if this Entity vertically overlapped another in the previous frame.
 * @param {Entity} other The Entity to test for overlap with
 * @returns {boolean}
 */
Entity.prototype.didOverlapVert = function(other) {
	return this.lastY + this.height >= other.lastY && this.lastY <= other.lastY + other.height;
};

/**
 * Test if this Entity was above another in the previous frame.
 * @param {Entity} other The Entity to test for above-ness with
 * @returns {boolean}
 */
Entity.prototype.wasAbove = function(other) {
	return this.lastY + this.height <= other.lastY;
};
/**
 * Test if this Entity was below another in the previous frame.
 * @param {Entity} other The Entity to test for below-ness with
 * @returns {boolean}
 */
Entity.prototype.wasBelow = function(other) {
	return this.lastY >= other.lastY + other.height;
};
/**
 * Test if this Entity was to the left of another in the previous frame.
 * @param {Entity} other The Entity to test for left-ness with
 * @returns {boolean}
 */
Entity.prototype.wasLeft = function(other) {
	return this.lastX + this.width <= other.lastX;
};
/**
 * Test if this Entity was to the right of another in the previous frame.
 * @param {Entity} other The Entity to test for right-ness with
 * @returns {boolean}
 */
Entity.prototype.wasRight = function(other) {
	return this.lastX >= other.lastX + other.width;
};

/**
 * Test if this Entity has changed position since the last frame.
 * @returns {boolean}
 */
Entity.prototype.moved = function() {
	var x = this.x|0;
	var lastX = this.lastX|0;
	var y = this.y|0;
	var lastY = this.lastY|0;
	return (x !== lastX) || (y !== lastY);
};

Entity.prototype.draw = function() {
	// draw bounding boxes
	// context.strokeStyle = "#ff0000";
	// context.strokeRect(this.x, this.y, this.width, this.height);
};

/**
 * Adjust the Entity's position so its bottom edge does not penetrate the other Entity's top edge.
 * {@link Entity#vy} is also zeroed.
 * @param {Entity} other
 */
Entity.prototype.resolveBottomCollisionWith = function(other) {
	if (this.didOverlapHoriz(other) && this.wasAbove(other)) {
		this.y = other.y - this.height;
		this.vy = 0;
	}
};
/**
 * Adjust the Entity's position so its top edge does not penetrate the other Entity's bottom edge.
 * {@link Entity#vy} is also zeroed.
 * @param {Entity} other
 */
Entity.prototype.resolveTopCollisionWith = function(other) {
	if (this.didOverlapHoriz(other) && this.wasBelow(other)) {
		this.y = other.y + other.height;
		this.vy = 0;
	}
};
/**
 * Adjust the Entity's position so its right edge does not penetrate the other Entity's left edge.
 * {@link Entity#vx} is also zeroed.
 * @param {Entity} other
 */
Entity.prototype.resolveRightCollisionWith = function(other) {
	if (this.didOverlapVert(other) && this.wasLeft(other)) {
		this.x = other.x - this.width;
		this.vx = 0;
	}
};
/**
 * Adjust the Entity's position so its left edge does not penetrate the other Entity's right edge.
 * {@link Entity#vx} is also zeroed.
 * @param {Entity} other
 */
Entity.prototype.resolveLeftCollisionWith = function(other) {
	if (this.didOverlapVert(other) && this.wasRight(other)) {
		this.x = other.x + other.width;
		this.vx = 0;
	}
};
/**
 * Adjust the Entity's position so it does not penetrate the other Entity.
 * {@link Entity#vx} will be zeroed if {@link Entity#x} was adjusted, and {@link Entity#vy} will be zeroed if {@link Entity#y} was adjusted.
 * @param {Entity} other
 */
Entity.prototype.resolveCollisionWith = function(other) {
	this.resolveBottomCollisionWith(other);
	this.resolveTopCollisionWith(other);
	this.resolveRightCollisionWith(other);
	this.resolveLeftCollisionWith(other);
};

module.exports = Entity;

},{}],8:[function(_dereq_,module,exports){
"use strict";

var Camera = _dereq_("./camera");

function EntityBoxCamera(entity, width, height, screenCenterX, screenCenterY) {
	this.entity = entity;
	this.screenCenterX = screenCenterX;
	this.screenCenterY = screenCenterY;

	var x = keepPositionInBox(entity.x, entity.width, 0, width, screenCenterX);
	var y = keepPositionInBox(entity.y, entity.height, 0, height, screenCenterY);
	Camera.call(this, x, y, width, height);
}
EntityBoxCamera.prototype = Object.create(Camera.prototype);
EntityBoxCamera.prototype.move = function() {
	this.x = keepPositionInBox(this.entity.x, this.entity.width, this.x, this.width, this.screenCenterX);
	this.y = keepPositionInBox(this.entity.y, this.entity.height, this.y, this.height, this.screenCenterY);
};

function keepPositionInBox(entityPos, entitySize, thisPos, thisSize, offset) {
	var boundsFromCenter = thisSize / 2;
	if (entityPos < thisPos + offset - boundsFromCenter) {
		thisPos = entityPos - offset + boundsFromCenter;
	}
	if (entityPos + entitySize > thisPos + offset + boundsFromCenter) {
		thisPos = entityPos + entitySize - offset - boundsFromCenter;
	}
	return thisPos;
}

module.exports = EntityBoxCamera;

},{"./camera":6}],9:[function(_dereq_,module,exports){
"use strict";

_dereq_("../vendor/FontLoader.js");

function buildFontFaceRule(family, urls) {
	var eot = urls["embedded-opentype"];
	var woff = urls.woff;
	var ttf = urls.truetype;
	var svg = urls.svg;

	var css = "\n";
	css += "@font-face {\n";
	css += "  font-family: '" + family + "';\n";
	css += "  src: url('" + eot + "');\n";
	css += "  src: url('" + eot + "?iefix') format('embedded-opentype'),\n";
	css += "       url('" + woff + "') format('woff'),\n";
	css += "       url('" + ttf + "') format('ttf'),\n";
	css += "       url('" + svg + "') format('svg');\n";
	css += "}\n";
	return css;
}

function createCssFontFaces(fontFamilies) {
	var style = document.createElement("style");
	style.setAttribute("type", "text/css");
	var css = "";
	for (var family in fontFamilies) {
		if (fontFamilies.hasOwnProperty(family)) {
			css += buildFontFaceRule(family, fontFamilies[family]);
		}
	}
	style.appendChild(document.createTextNode(css));
	document.head.appendChild(style);
}

function FontLoader() {
	this.totalFonts = 0;
	this.loadedFonts = 0;
}
FontLoader.prototype.load = function(fontFamilies) {
	createCssFontFaces(fontFamilies);

	var families = [];
	for (var family in fontFamilies) {
		if (families.hasOwnProperty(family)) {
			families.push(family);
		}
	}
	this.totalFonts += families.length;

	var that = this;
	var loader = new window.FontLoader(families, {
		"fontLoaded": function() {
			that.loadedFonts++;
		}
	});
	loader.loadFonts();
};
FontLoader.prototype.allLoaded = function() {
	return this.totalFonts === this.loadedFonts;
};

function EjectaFontLoader() {
	this.totalFonts = 0;
	this.loadedFonts = 0;
}
EjectaFontLoader.prototype.load = function(fontFamilies) {
	for (var family in fontFamilies) {
		if (fontFamilies.hasOwnProperty(family)) {
			var fontPath = fontFamilies[family].truetype;
			if (fontPath) {
				window.ejecta.loadFont(fontPath);
			}
		}
	}
};
EjectaFontLoader.prototype.allLoaded = function() {
	return true;
};

if (window.ejecta) {
	module.exports = EjectaFontLoader;
} else {
	module.exports = FontLoader;
}

},{"../vendor/FontLoader.js":23}],10:[function(_dereq_,module,exports){
"use strict";

var Scene = _dereq_("./scene");
var Mouse = _dereq_("./mouse");
var Accelerometer = _dereq_("./accelerometer");
var Keyboard = _dereq_("./keyboard");
var keyMap = _dereq_("./key_map");
var ImageLoader = _dereq_("./image_loader");
var SoundLoader = _dereq_("./sound_loader");
var FontLoader = _dereq_("./font_loader");
var AnimationLoader = _dereq_("./animation_loader");
var SceneManager = _dereq_("./scene_manager");

function loadAssets(assetLoader, assets) {
	for (var key in assets) {
		if (assets.hasOwnProperty(key)) {
			assetLoader.load(key, assets[key]);
		}
	}
}

function makeLoadingScene(game, canvas, nextScene) {
	return new Scene(canvas, function() {
	}, function() {
		if (game.isLoaded()) {
			game.scenes.switchTo(nextScene);
		}
	}, function(context) {
		context.fillStyle = "#000000";
		context.fillRect(0, 0, canvas.width, canvas.height);

		var quarterWidth = (canvas.width / 4) |0;
		var halfWidth = (canvas.width / 2) |0;
		var halfHeight = (canvas.height / 2) |0;

		context.fillStyle = "#ffffff";
		context.fillRect(quarterWidth, halfHeight - 15, halfWidth, 30);

		context.fillStyle = "#000000";
		context.fillRect(quarterWidth + 3, halfHeight - 12, halfWidth - 6, 24);

		context.fillStyle = "#ffffff";
		var barWidth = (halfWidth - 6) * game.percentLoaded();
		context.fillRect(quarterWidth + 3, halfHeight - 12, barWidth, 24);
	});
}

function setCanvasSizeScaled(canvas) {
	var ww = window.innerWidth;
	var wh = window.innerHeight;
	var cw = canvas.width;
	var ch = canvas.height;

	if (ww >= cw && wh >= ch) {
		return;
	} else if (ww < cw && wh >= ch) {
		wh = ((ww / cw) * ch) | 0;
		canvas.style.width = ww + "px";
		canvas.style.height = wh + "px";
	} else if (ww >= cw && wh < ch) {
		ww = ((wh / ch) * cw) | 0;
		canvas.style.width = ww + "px";
		canvas.style.height = wh + "px";
	} else if (ww < cw && wh < ch) {
		if ((ww / cw) * ch > wh) {
			ww = ((wh / ch) * cw) | 0;
		} else {
			wh = ((ww / cw) * ch) | 0;
		}
		canvas.style.width = ww + "px";
		canvas.style.height = wh + "px";
	}
}

function setCanvasSizeFullScreen(canvas) {
	canvas.width = window.innerWidth * window.devicePixelRatio;
	canvas.height = window.innerHeight * window.devicePixelRatio;
	canvas.style.width = window.innerWidth + "px";
	canvas.style.height = window.innerHeight + "px";
}

function Game(canvas, manifest) {
	if (window.ejecta) {
		setCanvasSizeFullScreen(canvas);
	} else {
		window.addEventListener("resize", function() { setCanvasSizeScaled(canvas); });
		setCanvasSizeScaled(canvas);
	}

	this.mouse = new Mouse(canvas);
	this.keyboard = new Keyboard(keyMap.US);

	this.accelerometer = new Accelerometer(canvas);

	this.images = new ImageLoader();
	loadAssets(this.images, manifest.images);

	this.sounds = new SoundLoader();
	loadAssets(this.sounds, manifest.sounds);

	this.fonts = new FontLoader();
	this.fonts.load(manifest.fonts);

	this.animations = new AnimationLoader(this.images, manifest.animations);

	this.scenes = new SceneManager();
	this.scenes.add("loading", makeLoadingScene(this, canvas, "title"));
}
Game.prototype.isLoaded = function() {
	return this.images.allLoaded() &&
		this.sounds.allLoaded() &&
		this.fonts.allLoaded() &&
		this.animations.allLoaded();
};
Game.prototype.percentLoaded = function() {
	var totalAssets =
		this.images.totalImages +
		this.sounds.totalSounds +
		this.fonts.totalFonts;
	var loadedAssets =
		this.images.loadedImages +
		this.sounds.loadedSounds +
		this.fonts.loadedFonts;
	return loadedAssets / totalAssets;
};
Game.prototype.isChromeApp = function() {
	return window.chrome && window.chrome.app && window.chrome.app.runtime;
};

module.exports = Game;

},{"./accelerometer":1,"./animation_loader":4,"./font_loader":9,"./image_loader":11,"./key_map":12,"./keyboard":13,"./mouse":16,"./scene":19,"./scene_manager":20,"./sound_loader":21}],11:[function(_dereq_,module,exports){
"use strict";

function ImageLoader() {
	this.images = {};
	this.totalImages = 0;
	this.loadedImages = 0;
	this.names = [];
}
ImageLoader.prototype.load = function(name, path) {
	// only load an image once
	if (this.names.indexOf(name) > -1) {
		return;
	}
	this.names.push(name);

	this.totalImages++;

	var img = new Image();
	var that = this;
	img.addEventListener("load", function() {
		that.loadedImages++;
		that.images[name] = img;
	});
	img.addEventListener("error", function() {
		console.error("Error loading image " + path);
	});
	img.src = path;
};
ImageLoader.prototype.allLoaded = function() {
	return this.totalImages === this.loadedImages;
};
ImageLoader.prototype.get = function(name) {
	var img = this.images[name];
	if (img === undefined) {
		console.error("Unknown image: " + name);
	}
	return img;
};

module.exports = ImageLoader;

},{}],12:[function(_dereq_,module,exports){
module.exports = {
	"US": {
		8: "backspace",
		9: "tab",
		13: "enter",
		16: "shift",
		17: "ctrl",
		18: "alt",
		19: "pause/break",
		20: "capslock",
		27: "escape",
		32: "space",
		33: "pageup",
		34: "pagedown",
		35: "end",
		36: "home",
		37: "left",
		38: "up",
		39: "right",
		40: "down",
		45: "insert",
		46: "delete",
		48: "0",
		49: "1",
		50: "2",
		51: "3",
		52: "4",
		53: "5",
		54: "6",
		55: "7",
		56: "8",
		57: "9",
		65: "a",
		66: "b",
		67: "c",
		68: "d",
		69: "e",
		70: "f",
		71: "g",
		72: "h",
		73: "i",
		74: "j",
		75: "k",
		76: "l",
		77: "m",
		78: "n",
		79: "o",
		80: "p",
		81: "q",
		82: "r",
		83: "s",
		84: "t",
		85: "u",
		86: "v",
		87: "w",
		88: "x",
		89: "y",
		90: "z",
		91: "leftwindow",
		92: "rightwindow",
		93: "select",
		96: "numpad-0",
		97: "numpad-1",
		98: "numpad-2",
		99: "numpad-3",
		100: "numpad-4",
		101: "numpad-5",
		102: "numpad-6",
		103: "numpad-7",
		104: "numpad-8",
		105: "numpad-9",
		106: "multiply",
		107: "add",
		109: "subtract",
		110: "decimalpoint",
		111: "divide",
		112: "f1",
		113: "f2",
		114: "f3",
		115: "f4",
		116: "f5",
		117: "f6",
		118: "f7",
		119: "f8",
		120: "f9",
		121: "f10",
		122: "f11",
		123: "f12",
		144: "numlock",
		145: "scrolllock",
		186: "semicolon",
		187: "equals",
		188: "comma",
		189: "dash",
		190: "period",
		191: "forwardslash",
		192: "graveaccent",
		219: "openbracket",
		220: "backslash",
		221: "closebraket",
		222: "singlequote"
	}
};

},{}],13:[function(_dereq_,module,exports){
"use strict";

function Keyboard(keyMap) {
	this.keys = {};

	var that = this;
	for (var kc in keyMap) {
		if (keyMap.hasOwnProperty(kc)) {
			this.keys[keyMap[kc]] = 0;
		}
	}
	window.addEventListener("keydown", function(event) {
		if (keyMap.hasOwnProperty(event.keyCode)) {
			if (that.keys[keyMap[event.keyCode]] === 0) {
				that.keys[keyMap[event.keyCode]] = 2;
			}
			return false;
		}
	});
	window.addEventListener("keyup", function(event) {
		if (keyMap.hasOwnProperty(event.keyCode)) {
			that.keys[keyMap[event.keyCode]] = 0;
			return false;
		}
	});
}
Keyboard.prototype.isPressed = function(name) {
	return this.keys[name] >= 1;
};
Keyboard.prototype.consumePressed = function(name) {
	var p = this.keys[name] === 2;
	if (p) {
		this.keys[name] = 1;
	}
	return p;
};

module.exports = Keyboard;

},{}],14:[function(_dereq_,module,exports){
"use strict";

var buffer = _dereq_("./buffer");

module.exports = {
	makeBuffer: buffer.makeBuffer,
	flipBufferHorizontally: buffer.flipBufferHorizontally,
	flipBufferVertically: buffer.flipBufferVertically,

	AnimatedEntity: _dereq_("./animated_entity"),
	Camera: _dereq_("./camera"),
	saveData: _dereq_("./save_data"),
	Entity: _dereq_("./entity"),
	EntityBoxCamera: _dereq_("./entity_box_camera"),
	Game: _dereq_("./game"),
	math: _dereq_("./math"),
	NinePatch: _dereq_("./ninepatch"),
	Scene: _dereq_("./scene"),
	Timer: _dereq_("./timer"),
};

},{"./animated_entity":2,"./buffer":5,"./camera":6,"./entity":7,"./entity_box_camera":8,"./game":10,"./math":15,"./ninepatch":17,"./save_data":18,"./scene":19,"./timer":22}],15:[function(_dereq_,module,exports){
"use strict";

module.exports = {
	"oscillate": function(current, period) {
		return Math.sin(current / period * Math.PI);
	}
};

},{}],16:[function(_dereq_,module,exports){
"use strict";

// prevent springy scrolling on ios
document.ontouchmove = function(e) {
	e.preventDefault();
};

// prevent right-click on desktop
window.oncontextmenu = function() {
	return false;
};

var relMouseCoords = function(canvas, event) {
	var x = event.pageX - canvas.offsetLeft + document.body.scrollLeft;
	var y = event.pageY - canvas.offsetTop + document.body.scrollTop;

	// scale based on ratio of canvas internal dimentions to css dimensions
	if (canvas.style.width.length) {
		x *= canvas.width / canvas.style.width.substring(0, canvas.style.width.indexOf("p"));
	}
	if (canvas.style.height.length) {
		y *= canvas.height / canvas.style.height.substring(0, canvas.style.height.indexOf("p"));
	}

	return {x:x, y:y};
};

function relMouseCoordsEjecta() {
	var event = arguments[1];
	var x = event.pageX * window.devicePixelRatio;
	var y = event.pageY * window.devicePixelRatio;
	return {x:x, y:y};
}

if (window.ejecta) {
	relMouseCoords = relMouseCoordsEjecta;
}

function Mouse(canvas) {
	this.x = 0;
	this.y = 0;
	this.buttons = [0, 0, 0];

	var that = this;
	canvas.addEventListener("mousedown", function(event) {
		var m = relMouseCoords(canvas, event);
		that.x = m.x;
		that.y = m.y;
		that.buttons[event.button] = 2;
	});
	canvas.addEventListener("mouseup", function(event) {
		var m = relMouseCoords(canvas, event);
		that.x = m.x;
		that.y = m.y;
		that.buttons[event.button] = 0;
	});
	canvas.addEventListener("touchstart", function(event) {
		var touch = event.touches[0];
		var m = relMouseCoords(canvas, touch);
		that.x = m.x;
		that.y = m.y;
		that.buttons[0] = 2;
	});
	canvas.addEventListener("touchend", function() {
		that.buttons[0] = 0;
	});
}
Mouse.prototype.supportsTouch = function() {
	return "ontouchstart" in window || navigator.msMaxTouchPoints;
};
Mouse.prototype.isPressed = function(button) {
	return this.buttons[button] >= 1;
};
Mouse.prototype.consumePressed = function(button, x, y, width, height) {
	var b = this.buttons[button] === 2;
	if (arguments.length > 1 && (this.x < x || this.x > x + width || this.y < y || this.y > y + height)) {
		b = false;
	}
	if (b) {
		this.buttons[button] = 1;
	}
	return b;
};

module.exports = Mouse;

},{}],17:[function(_dereq_,module,exports){
"use strict";

var buffer = _dereq_("./buffer");

function getContextForImage(image) {
	var ctx;
	buffer.makeBuffer(image.width, image.height, function(context) {
		context.drawImage(image, 0, 0, image.width, image.height);
		ctx = context;
	});
	return ctx;
}

function NinePatch(image) {
	this.img = image;
	var imgw = image.width - 1;
	var imgh = image.height - 1;

	var context = getContextForImage(image);
	var firstDiv = imgw;
	var secondDiv = imgw;
	var pixel;
	var alpha;
	for (var x = 0; x < imgw; x++) {
		pixel = context.getImageData(x, imgh, 1, 1).data;
		alpha = pixel[3];
		if (firstDiv === imgw && alpha > 0) {
			firstDiv = x;
		}
		if (firstDiv < imgw && alpha === 0) {
			secondDiv = x;
			break;
		}
	}
	this.w1 = firstDiv;
	this.w2 = secondDiv - firstDiv;
	this.w3 = imgw - secondDiv;

	firstDiv = secondDiv = imgh;
	for (var y = 0; y < imgh; y++) {
		pixel = context.getImageData(imgw, y, 1, 1).data;
		alpha = pixel[3];
		if (firstDiv === imgh && alpha > 0) {
			firstDiv = y;
		}
		if (firstDiv < imgh && alpha === 0) {
			secondDiv = y;
			break;
		}
	}
	this.h1 = firstDiv;
	this.h2 = secondDiv - firstDiv;
	this.h3 = imgh - secondDiv;
}
NinePatch.prototype.draw = function(context, x, y, width, height) {
	x = x|0;
	y = y|0;
	width = width |0;
	height = height |0;
	var cx, cy, w, h;

	for (cy = y + this.h1; cy < y + height - this.h3; cy += this.h2) {
		for (cx = x + this.w1; cx < x + width - this.w3; cx += this.w2) {
			w = Math.min(this.w2, x + width - this.w3 - cx);
			h = Math.min(this.h2, y + height - this.h3 - cy);
			context.drawImage(this.img, this.w1, this.h1, w, h, cx, cy, w, h);
		}
	}
	for (cy = y + this.h1; cy < y + height - this.h3; cy += this.h2) {
		h = Math.min(this.h2, y + height - this.h3 - cy);
		if (this.w1 > 0) {
			context.drawImage(this.img, 0,                 this.h1, this.w1, h, x,                   cy, this.w1, h);
		}
		if (this.w3 > 0) {
			context.drawImage(this.img, this.w1 + this.w2, this.h1, this.w3, h, x + width - this.w3, cy, this.w3, h);
		}
	}
	for (cx = x + this.w1; cx < x + width - this.w3; cx += this.w2) {
		w = Math.min(this.w2, x + width - this.w3 - cx);
		if (this.h1 > 0) {
			context.drawImage(this.img, this.w1, 0,                 w, this.h1, cx, y,                    w, this.h1);
		}
		if (this.h3 > 0) {
			context.drawImage(this.img, this.w1, this.w1 + this.w2, w, this.h3, cx, y + height - this.h3, w, this.h3);
		}
	}
	if (this.w1 > 0 && this.h1 > 0) {
		context.drawImage(this.img, 0, 0, this.w1, this.h1, x, y, this.w1, this.h1);
	}
	if (this.w3 > 0 && this.h1 > 0) {
		context.drawImage(this.img, this.w1 + this.w2, 0, this.w3, this.h1, x + width - this.w3, y, this.w3, this.h1);
	}
	if (this.w1 > 0 && this.h3 > 0) {
		context.drawImage(this.img, 0, this.h1 + this.h2, this.w1, this.h3, x, y + height - this.h3, this.w1, this.h3);
	}
	if (this.w3 > 0 && this.h3 > 0) {
		context.drawImage(this.img, this.w1 + this.w2, this.h1 + this.h2, this.w3, this.h3, x + width - this.w3, y + height - this.h3, this.w3, this.h3);
	}
};

module.exports = NinePatch;

},{"./buffer":5}],18:[function(_dereq_,module,exports){
"use strict";

function cookieGet(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length === 2) {
		return parts.pop().split(";").shift();
	}
}

function cookieSet(name, value) {
	var expire = new Date();
	expire.setTime(expire.getTime() + 1000 * 60 * 60 * 24 * 365);
	var cookie = name + "=" + value + "; expires=" + expire.toUTCString() + ";";
	document.cookie = cookie;
}

var cookieSaveData = {
	"get": cookieGet,
	"set": cookieSet
};

function localStorageGet(name) {
	return window.localStorage.getItem(name);
}

function localStorageSet(name, value) {
	return window.localStorage.setItem(name, value.toString());
}

var localStorageSaveData = {
	"get": localStorageGet,
	"set": localStorageSet
};

if (window.localStorage) {
	module.exports = localStorageSaveData;
} else {
	module.exports = cookieSaveData;
}

},{}],19:[function(_dereq_,module,exports){
"use strict";

var Camera = _dereq_("./camera");

/**
 * A Scene handles the render loop for the game.
 * @constructor
 * @param {external:canvas} canvas The canvas to render on.
 * @param {emptyCallback} initFunc A callback to be called every time the Scene is {@link Scene#start started}.
 * @param {simulationCallback} simulationFunc A callback that updates the state of the game's simulation.
 * @param {drawCallback} drawFunc A callback that draws the game.
 */
function Scene(canvas, initFunc, simulationFunc, drawFunc) {
	/**
	 * The canvas to render on.
	 * @member {external:canvas}
	 * @private
	 */
	this.canvas = canvas;
	/**
	 * A callback to be called ever time the Scene is {@link Scene#start started}.
	 * @member {emptyCallback}
	 * @private
	 */
	this.initFunc = initFunc;
	/**
	 * A callback that updates the state of the game's simulation.
	 * @member {simulationCallback}
	 * @private
	 */
	this.simulationFunc = simulationFunc;
	/**
	 * A callback that draws the game.
	 * @member {drawCallback}
	 * @private
	 */
	this.drawFunc = drawFunc;

	/**
	 * The drawing context for {@link Scene#canvas}
	 * @member {external:CanvasRenderingContext2D}
	 * @private
	 */
	this.context = canvas.getContext("2d");
	/**
	 * The timestamp of the last frame. Used to determine how many milliseconds elapsed between frames.
	 * @member {number}
	 * @private
	 */
	this.lastTimestamp = -1;
	/**
	 * Whether or not the Scene is currently running.
	 * @member {boolean}
	 * @private
	 */
	this.running = false;
	/**
	 * A key-value store of named timers. Timers in this object will be automatically {@link Timer#tick ticked} for you when the scene is running.
	 * @member {object}
	 */
	this.timers = {};

	/**
	 * The Camera used to offset the Scene's drawing.
	 * This Camera's {@link Entity#move move} and {@link Camera#draw draw} methods are called automatically for you. The default Camera starts at the origin (0,0).
	 * @member {Camera}
	 */
	this.camera = new Camera(0, 0, canvas.width, canvas.height);
	/**
	 * A flag that enables/disables a frame rate counter in the corner of the screen. This is useful during development.
	 * @member {boolean}
	 */
	this.showFrameRate = false;
}
/**
 * Start running the scene.
 */
Scene.prototype.start = function() {
	this.lastTimestamp = -1;
	this.running = true;
	this.initFunc.call(this);
	var scene = this;
	window.requestAnimationFrame(function(t) { mainLoop(scene, t); });
};
/**
 * Stop running the scene.
 */
Scene.prototype.stop = function() {
	this.running = false;
};
/**
 * Reset the simulation by re-running the {@link Scene#initFunc}.
 */
Scene.prototype.reset = function() {
	this.initFunc.call(this);
};

function mainLoop(scene, timestamp) {
	if (!scene.running) {
		return;
	}
	if (scene.lastTimestamp === -1) {
		scene.lastTimestamp = timestamp;
	}
	var elapsedMillis = timestamp - scene.lastTimestamp;
	scene.lastTimestamp = timestamp;

	incrementTimers(scene.timers, elapsedMillis);
	if (!scene.running) {
		return;
	}
	scene.simulationFunc.call(scene, elapsedMillis);
	scene.camera.move(elapsedMillis);

	scene.context.save();
	scene.camera.draw(scene.context);
	scene.drawFunc.call(scene, scene.context);

	if (scene.showFrameRate) {
		drawFrameRate(scene, elapsedMillis);
	}

	scene.context.restore();

	if (scene.running) {
		window.requestAnimationFrame(function(t) { mainLoop(scene, t); });
	}
}

function incrementTimers(timers, elapsedMillis) {
	for (var i in timers) {
		if (timers.hasOwnProperty(i)) {
			timers[i].tick(elapsedMillis);
		}
	}
}

function drawFrameRate(scene, elapsedMillis) {
	var fps = (1000 / elapsedMillis) |0;

	scene.context.font = "24px mono";
	if (fps < 30) {
		scene.context.fillStyle = "#ff0000";
	} else if (fps < 50) {
		scene.context.fillStyle = "#ffff00";
	} else {
		scene.context.fillStyle = "#00ff00";
	}
	var msg = fps + " FPS";
	var w = scene.context.measureText(msg).width;
	scene.camera.drawAbsolute(scene.context, function() {
		scene.context.fillText(msg, scene.canvas.width - w - 50, 50);
	});
}

module.exports = Scene;

},{"./camera":6}],20:[function(_dereq_,module,exports){
"use strict";

function SceneManager() {
	this.scenes = {};
}
SceneManager.prototype.add = function(name, scene) {
	this.scenes[name] = scene;
};
SceneManager.prototype.get = function(name) {
	return this.scenes[name];
};
SceneManager.prototype.switchTo = function(name) {
	if (this.currentScene === this.scenes[name]) {
		this.currentScene.reset();
		return;
	}
	if (this.currentScene !== undefined) {
		this.currentScene.stop();
	}
	this.currentScene = this.scenes[name];
	this.currentScene.start();
};

module.exports = SceneManager;

},{}],21:[function(_dereq_,module,exports){
"use strict";

window.AudioContext = window.AudioContext || window.webkitAudioContext;

function SoundLoader() {
	this.sounds = {};
	this.totalSounds = 0;
	this.loadedSounds = 0;
	this.muted = false;
	this.looping = {};

	this.context = new window.AudioContext();
}
SoundLoader.prototype.load = function(name, path) {
	var that = this;

	if (this.totalSounds === 0) {
		// safari on iOS mutes sounds until they're played in response to user input
		// play a dummy sound on first touch
		var firstTouchHandler = function() {
			window.removeEventListener("click", firstTouchHandler);
			window.removeEventListener("keydown", firstTouchHandler);
			window.removeEventListener("touchstart", firstTouchHandler);

			var source = that.context.createOscillator();
			source.connect(that.context.destination);
			source.start(0);
			source.stop(0);

			if (that.firstPlay) {
				that.play(that.firstPlay, that.firstPlayLoop);
			} else {
				that.firstPlay = "workaround";
			}

		};
		window.addEventListener("click", firstTouchHandler);
		window.addEventListener("keydown", firstTouchHandler);
		window.addEventListener("touchstart", firstTouchHandler);
	}

	this.totalSounds++;

	var request = new XMLHttpRequest();
	request.open("GET", path, true);
	request.responseType = "arraybuffer";
	request.addEventListener("readystatechange", function() {
		if (request.readyState !== 4) {
			return;
		}
		if (request.status !== 200 && request.status !== 0) {
			console.error("Error loading sound " + path);
			return;
		}
		that.context.decodeAudioData(request.response, function(buffer) {
			that.sounds[name] = buffer;
			that.loadedSounds++;
		}, function(err) {
			console.error("Error decoding audio data for " + path + ": " + err);
		});
	});
	request.addEventListener("error", function() {
		console.error("Error loading sound " + path);
	});
	request.send();
};
SoundLoader.prototype.allLoaded = function() {
	return this.totalSounds === this.loadedSounds;
};
SoundLoader.prototype.play = function(name, loop) {
	if (loop && this.looping[name]) {
		return;
	}
	if (!this.firstPlay) {
		// let the iOS user input workaround handle it
		this.firstPlay = name;
		this.firstPlayLoop = loop;
		return;
	}
	if (this.muted) {
		return;
	}
	var snd = this.sounds[name];
	if (snd === undefined) {
		console.error("Unknown sound: " + name);
	}
	var source = this.context.createBufferSource();
	source.buffer = snd;
	source.connect(this.context.destination);
	if (loop) {
		source.loop = true;
		this.looping[name] = source;
	}
	source.start(0);
};
SoundLoader.prototype.stop = function(name) {
	if (!this.looping[name]) {
		return;
	}
	this.looping[name].stop();
	delete this.looping[name];
};

function AudioTagSoundLoader() {
	this.sounds = {};
	this.totalSounds = 0;
	this.loadedSounds = 0;
	this.muted = false;
	this.looping = {};
}
AudioTagSoundLoader.prototype.load = function(name, path) {
	this.totalSounds++;

	var audio = new Audio();
	var that = this;
	audio.addEventListener("error", function() {
		console.error("Error loading sound " + path);
	});
	audio.addEventListener("canplaythrough", function() {
		that.sounds[name] = audio;
		that.loadedSounds++;
	});
	audio.src = path;
	audio.load();
};
AudioTagSoundLoader.prototype.allLoaded = function() {
	return this.totalSounds === this.loadedSounds;
};
AudioTagSoundLoader.prototype.play = function(name, loop) {
	if (loop && this.looping[name]) {
		return;
	}
	if (this.muted) {
		return;
	}
	var snd = this.sounds[name];
	if (snd === undefined) {
		console.error("Unknown sound: " + name);
	}
	if (loop) {
		snd.loop = true;
		this.looping[name] = snd;
	}
	snd.play();
};
AudioTagSoundLoader.prototype.stop = function(name) {
	var snd = this.looping[name];
	if (!snd) {
		return;
	}
	snd.loop = false;
	snd.pause();
	snd.currentTime = 0;
	delete this.looping[name];
};

if (window.AudioContext) {
	module.exports = SoundLoader;
} else if (window.Audio) {
	module.exports = AudioTagSoundLoader;
} else {
	console.log("This browser doesn't support the Web Audio API");
	var fakeSoundLoader = function() {};
	fakeSoundLoader.prototype.load = function() {};
	fakeSoundLoader.prototype.allLoaded = function() { return true; };
	fakeSoundLoader.prototype.play = function() {};
	module.exports = fakeSoundLoader;
}

},{}],22:[function(_dereq_,module,exports){
"use strict";

/**
 * A timer that calls callbacks while it is running, and when it expires.
 * @constructor
 * @param {simulationCallback} onTick Called when the Timer is {@link Timer#tick tick()}ed
 * @param {number} expireMillis The number of milliseconds until the Timer expires
 * @param {emptyCallback} onExpire Called when the Timer expires
 */
function Timer(onTick, expireMillis, onExpire) {
	/**
	 * Called when the Timer is {@link Timer#tick tick()}ed
	 * @member {tickCallback}
	 * @private
	 */
	this.onTick = onTick;
	/**
	 * The number of milliseconds until the Timer expires.
	 * When {@link Timer#time} reaches this number, the Timer will be expired, and {@link Timer#onExpire} will be called.
	 * @member {number}
	 * @private
	 */
	this.expireMillis = expireMillis;
	/**
	 * Called when the Timer expires.
	 * @member {expireCallback}
	 * @private
	 */
	this.onExpire = onExpire;
	/**
	 * Whether or not the Timer is currently running.
	 * @member {boolean}
	 * @private
	 */
	this.running = false;
	/**
	 * How long the Timer has run in milliseconds.
	 * @member {number}
	 * @private
	 */
	this.time = 0;
}
/** 
 * Start the Timer running.
 * This does not {@link Timer#reset reset} the Timer!
 */
Timer.prototype.start = function() {
	this.running = true;
};
/** 
 * Stop the Timer.
 * This does not {@link Timer#reset reset} the Timer!
 */
Timer.prototype.stop = function() {
	this.running = false;
};
/**
 * Zeroes the timer.
 * This does not {@link Timer#stop stop} the Timer!
 */
Timer.prototype.reset = function() {
	this.time = 0;
};
/**
 * Advance the Timer.
 * Normally {@link Scene} does this for you.
 * @param {number} elapsedMillis How many milliseconds to advance the timer.
 */
Timer.prototype.tick = function(elapsedMillis) {
	if (!this.running) {
		return;
	}
	this.time += elapsedMillis;
	if (this.expired()) {
		this.stop();
		if (typeof this.onExpire === "function") {
			this.onExpire.call(this);
		}
		return;
	}

	if (typeof this.onTick === "function") {
		this.onTick.call(this, elapsedMillis);
	}
};
/**
 * Test if the Timer has expired.
 * @returns {boolean}
 */
Timer.prototype.expired = function() {
	return typeof this.expireMillis !== "undefined" && this.time >= this.expireMillis;
};

module.exports = Timer;

},{}],23:[function(_dereq_,module,exports){
(function(namespace) {
	
	var isIE = /MSIE/i.test(navigator.userAgent),
		ieVer = null;
	
	// Get Internet Explorer version
	if (isIE) {
		var re, result;
		re = new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");
		result = re.exec(navigator.userAgent);
		if (result !== null) {
			ieVer = parseFloat(result[1]);
		}
	}
	
	/**
	 * FontLoader detects when web fonts specified in the "fontFamiliesArray" array were loaded and rendered. Then it
	 * notifies the specified delegate object via "fontLoaded" and "fontsLoaded" methods when specific or all fonts were
	 * loaded respectively. The use of this functions implies that the insertion of specified web fonts into the
	 * document is done elsewhere.
	 * 
	 * If timeout (default 3000ms) is reached before all fonts were loaded and rendered, then "fontsLoaded" delegate
	 * method is invoked with an error object as its single parameter. The error object has two fields: the "message"
	 * field holding the error description and the "notLoadedFontFamilies" field holding an array with all the
	 * font-families that weren't loaded. Otherwise the parameter is null.
	 *
	 * @param {Array}     fontFamiliesArray       Array of font-family strings.
	 * @param {Object}    delegate                Delegate object whose delegate methods will be invoked in its own context.
	 * @param {Function}  [delegate.fontsLoaded]  Delegate method invoked after all fonts are loaded or timeout is reached.
	 * @param {Function}  [delegate.fontLoaded]   Delegate method invoked for each loaded font with its font-family string as its single parameter.
	 * @param {Number}    [timeout=3000]          Timeout in milliseconds. Pass "null" to disable timeout.
	 * @constructor
	 */
	function FontLoader(fontFamiliesArray, delegate, timeout) {
		// Public
		this.delegate = delegate;
		this.timeout = (typeof timeout !== "undefined") ? timeout : 3000;

		// Private
		this._fontFamiliesArray = fontFamiliesArray.slice(0);
		this._testContainer = null;
		this._adobeBlankSizeWatcher = null;
		this._timeoutId = null;
		this._intervalId = null;
		this._intervalDelay = 50;
		this._numberOfLoadedFonts = 0;
		this._numberOfFontFamilies = this._fontFamiliesArray.length;
		this._fontsMap = {};
		this._finished = false;
	}

	namespace.FontLoader = FontLoader;
	
	FontLoader.testDiv = null;
	FontLoader.useAdobeBlank = !isIE || ieVer >= 11.0;
	FontLoader.useResizeEvent = isIE && ieVer < 11.0 && typeof document.attachEvent !== "undefined";
	FontLoader.useIntervalChecking = window.opera || (isIE && ieVer < 11.0 && !FontLoader.useResizeEvent);
	FontLoader.referenceText = " !\"\\#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
	FontLoader.referenceFontFamilies = FontLoader.useAdobeBlank ? ["AdobeBlank"] : ["serif", "cursive"];
	FontLoader.referenceFontFamiliesSizes = [];
	FontLoader.adobeBlankFontFaceRule = "@font-face{ font-family:AdobeBlank; src:url('data:font/opentype;base64,T1RUTwAKAIAAAwAgQ0ZGIM6ZbkwAAEPEAAAZM0RTSUcAAAABAABtAAAAAAhPUy8yAR6vMwAAARAAAABgY21hcDqI98oAACjEAAAa4GhlYWT+BQILAAAArAAAADZoaGVhCCID7wAAAOQAAAAkaG10eAPoAHwAAFz4AAAQBm1heHAIAVAAAAABCAAAAAZuYW1lD/tWxwAAAXAAACdScG9zdP+4ADIAAEOkAAAAIAABAAAAAQj1Snw1O18PPPUAAwPoAAAAAM2C2p8AAAAAzYLanwB8/4gDbANwAAAAAwACAAAAAAAAAAEAAANw/4gAyAPoAHwAfANsAAEAAAAAAAAAAAAAAAAAAAACAABQAAgBAAAABAAAAZAABQAAAooCWAAAAEsCigJYAAABXgAyANwAAAAAAAAAAAAAAAD3/67/+9///w/gAD8AAAAAQURCRQHAAAD//wNw/4gAyANwAHhgLwH/AAAAAAAAAAAAAAAgAAAAAAARANIAAQAAAAAAAQALAAAAAQAAAAAAAgAHAAsAAQAAAAAAAwAbABIAAQAAAAAABAALAAAAAQAAAAAABQA5AC0AAQAAAAAABgAKAGYAAwABBAkAAABuAHAAAwABBAkAAQAWAN4AAwABBAkAAgAOAPQAAwABBAkAAwA2AQIAAwABBAkABAAWAN4AAwABBAkABQByATgAAwABBAkABgAUAaoAAwABBAkACAA0Ab4AAwABBAkACwA0AfIAAwABBAkADSQSAiYAAwABBAkADgBIJjhBZG9iZSBCbGFua1JlZ3VsYXIxLjAzNTtBREJFO0Fkb2JlQmxhbms7QURPQkVWZXJzaW9uIDEuMDM1O1BTIDEuMDAzO2hvdGNvbnYgMS4wLjcwO21ha2VvdGYubGliMi41LjU5MDBBZG9iZUJsYW5rAKkAIAAyADAAMQAzACAAQQBkAG8AYgBlACAAUwB5AHMAdABlAG0AcwAgAEkAbgBjAG8AcgBwAG8AcgBhAHQAZQBkAC4AIABBAGwAbAAgAFIAaQBnAGgAdABzACAAUgBlAHMAZQByAHYAZQBkAC4AQQBkAG8AYgBlACAAQgBsAGEAbgBrAFIAZQBnAHUAbABhAHIAMQAuADAAMwA1ADsAQQBEAEIARQA7AEEAZABvAGIAZQBCAGwAYQBuAGsAOwBBAEQATwBCAEUAVgBlAHIAcwBpAG8AbgAgADEALgAwADMANQA7AFAAUwAgADEALgAwADAAMwA7AGgAbwB0AGMAbwBuAHYAIAAxAC4AMAAuADcAMAA7AG0AYQBrAGUAbwB0AGYALgBsAGkAYgAyAC4ANQAuADUAOQAwADAAQQBkAG8AYgBlAEIAbABhAG4AawBBAGQAbwBiAGUAIABTAHkAcwB0AGUAbQBzACAASQBuAGMAbwByAHAAbwByAGEAdABlAGQAaAB0AHQAcAA6AC8ALwB3AHcAdwAuAGEAZABvAGIAZQAuAGMAbwBtAC8AdAB5AHAAZQAvAEEAZABvAGIAZQAgAEIAbABhAG4AawAgAGkAcwAgAHIAZQBsAGUAYQBzAGUAZAAgAHUAbgBkAGUAcgAgAHQAaABlACAAUwBJAEwAIABPAHAAZQBuACAARgBvAG4AdAAgAEwAaQBjAGUAbgBzAGUAIAAtACAAcABsAGUAYQBzAGUAIAByAGUAYQBkACAAaQB0ACAAYwBhAHIAZQBmAHUAbABsAHkAIABhAG4AZAAgAGQAbwAgAG4AbwB0ACAAZABvAHcAbgBsAG8AYQBkACAAdABoAGUAIABmAG8AbgB0AHMAIAB1AG4AbABlAHMAcwAgAHkAbwB1ACAAYQBnAHIAZQBlACAAdABvACAAdABoAGUAIAB0AGgAZQAgAHQAZQByAG0AcwAgAG8AZgAgAHQAaABlACAAbABpAGMAZQBuAHMAZQA6AA0ACgANAAoAQwBvAHAAeQByAGkAZwBoAHQAIACpACAAMgAwADEAMwAgAEEAZABvAGIAZQAgAFMAeQBzAHQAZQBtAHMAIABJAG4AYwBvAHIAcABvAHIAYQB0AGUAZAAgACgAaAB0AHQAcAA6AC8ALwB3AHcAdwAuAGEAZABvAGIAZQAuAGMAbwBtAC8AKQAsACAAdwBpAHQAaAAgAFIAZQBzAGUAcgB2AGUAZAAgAEYAbwBuAHQAIABOAGEAbQBlACAAQQBkAG8AYgBlACAAQgBsAGEAbgBrAA0ACgANAAoAVABoAGkAcwAgAEYAbwBuAHQAIABTAG8AZgB0AHcAYQByAGUAIABpAHMAIABsAGkAYwBlAG4AcwBlAGQAIAB1AG4AZABlAHIAIAB0AGgAZQAgAFMASQBMACAATwBwAGUAbgAgAEYAbwBuAHQAIABMAGkAYwBlAG4AcwBlACwAIABWAGUAcgBzAGkAbwBuACAAMQAuADEALgANAAoADQAKAFQAaABpAHMAIABsAGkAYwBlAG4AcwBlACAAaQBzACAAYwBvAHAAaQBlAGQAIABiAGUAbABvAHcALAAgAGEAbgBkACAAaQBzACAAYQBsAHMAbwAgAGEAdgBhAGkAbABhAGIAbABlACAAdwBpAHQAaAAgAGEAIABGAEEAUQAgAGEAdAA6ACAAaAB0AHQAcAA6AC8ALwBzAGMAcgBpAHAAdABzAC4AcwBpAGwALgBvAHIAZwAvAE8ARgBMAA0ACgANAAoALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAA0ACgBTAEkATAAgAE8AUABFAE4AIABGAE8ATgBUACAATABJAEMARQBOAFMARQAgAFYAZQByAHMAaQBvAG4AIAAxAC4AMQAgAC0AIAAyADYAIABGAGUAYgByAHUAYQByAHkAIAAyADAAMAA3AA0ACgAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ALQAtAC0ADQAKAA0ACgBQAFIARQBBAE0AQgBMAEUADQAKAFQAaABlACAAZwBvAGEAbABzACAAbwBmACAAdABoAGUAIABPAHAAZQBuACAARgBvAG4AdAAgAEwAaQBjAGUAbgBzAGUAIAAoAE8ARgBMACkAIABhAHIAZQAgAHQAbwAgAHMAdABpAG0AdQBsAGEAdABlACAAdwBvAHIAbABkAHcAaQBkAGUAIABkAGUAdgBlAGwAbwBwAG0AZQBuAHQAIABvAGYAIABjAG8AbABsAGEAYgBvAHIAYQB0AGkAdgBlACAAZgBvAG4AdAAgAHAAcgBvAGoAZQBjAHQAcwAsACAAdABvACAAcwB1AHAAcABvAHIAdAAgAHQAaABlACAAZgBvAG4AdAAgAGMAcgBlAGEAdABpAG8AbgAgAGUAZgBmAG8AcgB0AHMAIABvAGYAIABhAGMAYQBkAGUAbQBpAGMAIABhAG4AZAAgAGwAaQBuAGcAdQBpAHMAdABpAGMAIABjAG8AbQBtAHUAbgBpAHQAaQBlAHMALAAgAGEAbgBkACAAdABvACAAcAByAG8AdgBpAGQAZQAgAGEAIABmAHIAZQBlACAAYQBuAGQAIABvAHAAZQBuACAAZgByAGEAbQBlAHcAbwByAGsAIABpAG4AIAB3AGgAaQBjAGgAIABmAG8AbgB0AHMAIABtAGEAeQAgAGIAZQAgAHMAaABhAHIAZQBkACAAYQBuAGQAIABpAG0AcAByAG8AdgBlAGQAIABpAG4AIABwAGEAcgB0AG4AZQByAHMAaABpAHAAIAB3AGkAdABoACAAbwB0AGgAZQByAHMALgANAAoADQAKAFQAaABlACAATwBGAEwAIABhAGwAbABvAHcAcwAgAHQAaABlACAAbABpAGMAZQBuAHMAZQBkACAAZgBvAG4AdABzACAAdABvACAAYgBlACAAdQBzAGUAZAAsACAAcwB0AHUAZABpAGUAZAAsACAAbQBvAGQAaQBmAGkAZQBkACAAYQBuAGQAIAByAGUAZABpAHMAdAByAGkAYgB1AHQAZQBkACAAZgByAGUAZQBsAHkAIABhAHMAIABsAG8AbgBnACAAYQBzACAAdABoAGUAeQAgAGEAcgBlACAAbgBvAHQAIABzAG8AbABkACAAYgB5ACAAdABoAGUAbQBzAGUAbAB2AGUAcwAuACAAVABoAGUAIABmAG8AbgB0AHMALAAgAGkAbgBjAGwAdQBkAGkAbgBnACAAYQBuAHkAIABkAGUAcgBpAHYAYQB0AGkAdgBlACAAdwBvAHIAawBzACwAIABjAGEAbgAgAGIAZQAgAGIAdQBuAGQAbABlAGQALAAgAGUAbQBiAGUAZABkAGUAZAAsACAAcgBlAGQAaQBzAHQAcgBpAGIAdQB0AGUAZAAgAGEAbgBkAC8AbwByACAAcwBvAGwAZAAgAHcAaQB0AGgAIABhAG4AeQAgAHMAbwBmAHQAdwBhAHIAZQAgAHAAcgBvAHYAaQBkAGUAZAAgAHQAaABhAHQAIABhAG4AeQAgAHIAZQBzAGUAcgB2AGUAZAAgAG4AYQBtAGUAcwAgAGEAcgBlACAAbgBvAHQAIAB1AHMAZQBkACAAYgB5ACAAZABlAHIAaQB2AGEAdABpAHYAZQAgAHcAbwByAGsAcwAuACAAVABoAGUAIABmAG8AbgB0AHMAIABhAG4AZAAgAGQAZQByAGkAdgBhAHQAaQB2AGUAcwAsACAAaABvAHcAZQB2AGUAcgAsACAAYwBhAG4AbgBvAHQAIABiAGUAIAByAGUAbABlAGEAcwBlAGQAIAB1AG4AZABlAHIAIABhAG4AeQAgAG8AdABoAGUAcgAgAHQAeQBwAGUAIABvAGYAIABsAGkAYwBlAG4AcwBlAC4AIABUAGgAZQAgAHIAZQBxAHUAaQByAGUAbQBlAG4AdAAgAGYAbwByACAAZgBvAG4AdABzACAAdABvACAAcgBlAG0AYQBpAG4AIAB1AG4AZABlAHIAIAB0AGgAaQBzACAAbABpAGMAZQBuAHMAZQAgAGQAbwBlAHMAIABuAG8AdAAgAGEAcABwAGwAeQAgAHQAbwAgAGEAbgB5ACAAZABvAGMAdQBtAGUAbgB0ACAAYwByAGUAYQB0AGUAZAAgAHUAcwBpAG4AZwAgAHQAaABlACAAZgBvAG4AdABzACAAbwByACAAdABoAGUAaQByACAAZABlAHIAaQB2AGEAdABpAHYAZQBzAC4ADQAKAA0ACgBEAEUARgBJAE4ASQBUAEkATwBOAFMADQAKACIARgBvAG4AdAAgAFMAbwBmAHQAdwBhAHIAZQAiACAAcgBlAGYAZQByAHMAIAB0AG8AIAB0AGgAZQAgAHMAZQB0ACAAbwBmACAAZgBpAGwAZQBzACAAcgBlAGwAZQBhAHMAZQBkACAAYgB5ACAAdABoAGUAIABDAG8AcAB5AHIAaQBnAGgAdAAgAEgAbwBsAGQAZQByACgAcwApACAAdQBuAGQAZQByACAAdABoAGkAcwAgAGwAaQBjAGUAbgBzAGUAIABhAG4AZAAgAGMAbABlAGEAcgBsAHkAIABtAGEAcgBrAGUAZAAgAGEAcwAgAHMAdQBjAGgALgAgAFQAaABpAHMAIABtAGEAeQAgAGkAbgBjAGwAdQBkAGUAIABzAG8AdQByAGMAZQAgAGYAaQBsAGUAcwAsACAAYgB1AGkAbABkACAAcwBjAHIAaQBwAHQAcwAgAGEAbgBkACAAZABvAGMAdQBtAGUAbgB0AGEAdABpAG8AbgAuAA0ACgANAAoAIgBSAGUAcwBlAHIAdgBlAGQAIABGAG8AbgB0ACAATgBhAG0AZQAiACAAcgBlAGYAZQByAHMAIAB0AG8AIABhAG4AeQAgAG4AYQBtAGUAcwAgAHMAcABlAGMAaQBmAGkAZQBkACAAYQBzACAAcwB1AGMAaAAgAGEAZgB0AGUAcgAgAHQAaABlACAAYwBvAHAAeQByAGkAZwBoAHQAIABzAHQAYQB0AGUAbQBlAG4AdAAoAHMAKQAuAA0ACgANAAoAIgBPAHIAaQBnAGkAbgBhAGwAIABWAGUAcgBzAGkAbwBuACIAIAByAGUAZgBlAHIAcwAgAHQAbwAgAHQAaABlACAAYwBvAGwAbABlAGMAdABpAG8AbgAgAG8AZgAgAEYAbwBuAHQAIABTAG8AZgB0AHcAYQByAGUAIABjAG8AbQBwAG8AbgBlAG4AdABzACAAYQBzACAAZABpAHMAdAByAGkAYgB1AHQAZQBkACAAYgB5ACAAdABoAGUAIABDAG8AcAB5AHIAaQBnAGgAdAAgAEgAbwBsAGQAZQByACgAcwApAC4ADQAKAA0ACgAiAE0AbwBkAGkAZgBpAGUAZAAgAFYAZQByAHMAaQBvAG4AIgAgAHIAZQBmAGUAcgBzACAAdABvACAAYQBuAHkAIABkAGUAcgBpAHYAYQB0AGkAdgBlACAAbQBhAGQAZQAgAGIAeQAgAGEAZABkAGkAbgBnACAAdABvACwAIABkAGUAbABlAHQAaQBuAGcALAAgAG8AcgAgAHMAdQBiAHMAdABpAHQAdQB0AGkAbgBnACAALQAtACAAaQBuACAAcABhAHIAdAAgAG8AcgAgAGkAbgAgAHcAaABvAGwAZQAgAC0ALQAgAGEAbgB5ACAAbwBmACAAdABoAGUAIABjAG8AbQBwAG8AbgBlAG4AdABzACAAbwBmACAAdABoAGUAIABPAHIAaQBnAGkAbgBhAGwAIABWAGUAcgBzAGkAbwBuACwAIABiAHkAIABjAGgAYQBuAGcAaQBuAGcAIABmAG8AcgBtAGEAdABzACAAbwByACAAYgB5ACAAcABvAHIAdABpAG4AZwAgAHQAaABlACAARgBvAG4AdAAgAFMAbwBmAHQAdwBhAHIAZQAgAHQAbwAgAGEAIABuAGUAdwAgAGUAbgB2AGkAcgBvAG4AbQBlAG4AdAAuAA0ACgANAAoAIgBBAHUAdABoAG8AcgAiACAAcgBlAGYAZQByAHMAIAB0AG8AIABhAG4AeQAgAGQAZQBzAGkAZwBuAGUAcgAsACAAZQBuAGcAaQBuAGUAZQByACwAIABwAHIAbwBnAHIAYQBtAG0AZQByACwAIAB0AGUAYwBoAG4AaQBjAGEAbAAgAHcAcgBpAHQAZQByACAAbwByACAAbwB0AGgAZQByACAAcABlAHIAcwBvAG4AIAB3AGgAbwAgAGMAbwBuAHQAcgBpAGIAdQB0AGUAZAAgAHQAbwAgAHQAaABlACAARgBvAG4AdAAgAFMAbwBmAHQAdwBhAHIAZQAuAA0ACgANAAoAUABFAFIATQBJAFMAUwBJAE8ATgAgACYAIABDAE8ATgBEAEkAVABJAE8ATgBTAA0ACgBQAGUAcgBtAGkAcwBzAGkAbwBuACAAaQBzACAAaABlAHIAZQBiAHkAIABnAHIAYQBuAHQAZQBkACwAIABmAHIAZQBlACAAbwBmACAAYwBoAGEAcgBnAGUALAAgAHQAbwAgAGEAbgB5ACAAcABlAHIAcwBvAG4AIABvAGIAdABhAGkAbgBpAG4AZwAgAGEAIABjAG8AcAB5ACAAbwBmACAAdABoAGUAIABGAG8AbgB0ACAAUwBvAGYAdAB3AGEAcgBlACwAIAB0AG8AIAB1AHMAZQAsACAAcwB0AHUAZAB5ACwAIABjAG8AcAB5ACwAIABtAGUAcgBnAGUALAAgAGUAbQBiAGUAZAAsACAAbQBvAGQAaQBmAHkALAAgAHIAZQBkAGkAcwB0AHIAaQBiAHUAdABlACwAIABhAG4AZAAgAHMAZQBsAGwAIABtAG8AZABpAGYAaQBlAGQAIABhAG4AZAAgAHUAbgBtAG8AZABpAGYAaQBlAGQAIABjAG8AcABpAGUAcwAgAG8AZgAgAHQAaABlACAARgBvAG4AdAAgAFMAbwBmAHQAdwBhAHIAZQAsACAAcwB1AGIAagBlAGMAdAAgAHQAbwAgAHQAaABlACAAZgBvAGwAbABvAHcAaQBuAGcAIABjAG8AbgBkAGkAdABpAG8AbgBzADoADQAKAA0ACgAxACkAIABOAGUAaQB0AGgAZQByACAAdABoAGUAIABGAG8AbgB0ACAAUwBvAGYAdAB3AGEAcgBlACAAbgBvAHIAIABhAG4AeQAgAG8AZgAgAGkAdABzACAAaQBuAGQAaQB2AGkAZAB1AGEAbAAgAGMAbwBtAHAAbwBuAGUAbgB0AHMALAAgAGkAbgAgAE8AcgBpAGcAaQBuAGEAbAAgAG8AcgAgAE0AbwBkAGkAZgBpAGUAZAAgAFYAZQByAHMAaQBvAG4AcwAsACAAbQBhAHkAIABiAGUAIABzAG8AbABkACAAYgB5ACAAaQB0AHMAZQBsAGYALgANAAoADQAKADIAKQAgAE8AcgBpAGcAaQBuAGEAbAAgAG8AcgAgAE0AbwBkAGkAZgBpAGUAZAAgAFYAZQByAHMAaQBvAG4AcwAgAG8AZgAgAHQAaABlACAARgBvAG4AdAAgAFMAbwBmAHQAdwBhAHIAZQAgAG0AYQB5ACAAYgBlACAAYgB1AG4AZABsAGUAZAAsACAAcgBlAGQAaQBzAHQAcgBpAGIAdQB0AGUAZAAgAGEAbgBkAC8AbwByACAAcwBvAGwAZAAgAHcAaQB0AGgAIABhAG4AeQAgAHMAbwBmAHQAdwBhAHIAZQAsACAAcAByAG8AdgBpAGQAZQBkACAAdABoAGEAdAAgAGUAYQBjAGgAIABjAG8AcAB5ACAAYwBvAG4AdABhAGkAbgBzACAAdABoAGUAIABhAGIAbwB2AGUAIABjAG8AcAB5AHIAaQBnAGgAdAAgAG4AbwB0AGkAYwBlACAAYQBuAGQAIAB0AGgAaQBzACAAbABpAGMAZQBuAHMAZQAuACAAVABoAGUAcwBlACAAYwBhAG4AIABiAGUAIABpAG4AYwBsAHUAZABlAGQAIABlAGkAdABoAGUAcgAgAGEAcwAgAHMAdABhAG4AZAAtAGEAbABvAG4AZQAgAHQAZQB4AHQAIABmAGkAbABlAHMALAAgAGgAdQBtAGEAbgAtAHIAZQBhAGQAYQBiAGwAZQAgAGgAZQBhAGQAZQByAHMAIABvAHIAIABpAG4AIAB0AGgAZQAgAGEAcABwAHIAbwBwAHIAaQBhAHQAZQAgAG0AYQBjAGgAaQBuAGUALQByAGUAYQBkAGEAYgBsAGUAIABtAGUAdABhAGQAYQB0AGEAIABmAGkAZQBsAGQAcwAgAHcAaQB0AGgAaQBuACAAdABlAHgAdAAgAG8AcgAgAGIAaQBuAGEAcgB5ACAAZgBpAGwAZQBzACAAYQBzACAAbABvAG4AZwAgAGEAcwAgAHQAaABvAHMAZQAgAGYAaQBlAGwAZABzACAAYwBhAG4AIABiAGUAIABlAGEAcwBpAGwAeQAgAHYAaQBlAHcAZQBkACAAYgB5ACAAdABoAGUAIAB1AHMAZQByAC4ADQAKAA0ACgAzACkAIABOAG8AIABNAG8AZABpAGYAaQBlAGQAIABWAGUAcgBzAGkAbwBuACAAbwBmACAAdABoAGUAIABGAG8AbgB0ACAAUwBvAGYAdAB3AGEAcgBlACAAbQBhAHkAIAB1AHMAZQAgAHQAaABlACAAUgBlAHMAZQByAHYAZQBkACAARgBvAG4AdAAgAE4AYQBtAGUAKABzACkAIAB1AG4AbABlAHMAcwAgAGUAeABwAGwAaQBjAGkAdAAgAHcAcgBpAHQAdABlAG4AIABwAGUAcgBtAGkAcwBzAGkAbwBuACAAaQBzACAAZwByAGEAbgB0AGUAZAAgAGIAeQAgAHQAaABlACAAYwBvAHIAcgBlAHMAcABvAG4AZABpAG4AZwAgAEMAbwBwAHkAcgBpAGcAaAB0ACAASABvAGwAZABlAHIALgAgAFQAaABpAHMAIAByAGUAcwB0AHIAaQBjAHQAaQBvAG4AIABvAG4AbAB5ACAAYQBwAHAAbABpAGUAcwAgAHQAbwAgAHQAaABlACAAcAByAGkAbQBhAHIAeQAgAGYAbwBuAHQAIABuAGEAbQBlACAAYQBzACAAcAByAGUAcwBlAG4AdABlAGQAIAB0AG8AIAB0AGgAZQAgAHUAcwBlAHIAcwAuAA0ACgANAAoANAApACAAVABoAGUAIABuAGEAbQBlACgAcwApACAAbwBmACAAdABoAGUAIABDAG8AcAB5AHIAaQBnAGgAdAAgAEgAbwBsAGQAZQByACgAcwApACAAbwByACAAdABoAGUAIABBAHUAdABoAG8AcgAoAHMAKQAgAG8AZgAgAHQAaABlACAARgBvAG4AdAAgAFMAbwBmAHQAdwBhAHIAZQAgAHMAaABhAGwAbAAgAG4AbwB0ACAAYgBlACAAdQBzAGUAZAAgAHQAbwAgAHAAcgBvAG0AbwB0AGUALAAgAGUAbgBkAG8AcgBzAGUAIABvAHIAIABhAGQAdgBlAHIAdABpAHMAZQAgAGEAbgB5ACAATQBvAGQAaQBmAGkAZQBkACAAVgBlAHIAcwBpAG8AbgAsACAAZQB4AGMAZQBwAHQAIAB0AG8AIABhAGMAawBuAG8AdwBsAGUAZABnAGUAIAB0AGgAZQAgAGMAbwBuAHQAcgBpAGIAdQB0AGkAbwBuACgAcwApACAAbwBmACAAdABoAGUAIABDAG8AcAB5AHIAaQBnAGgAdAAgAEgAbwBsAGQAZQByACgAcwApACAAYQBuAGQAIAB0AGgAZQAgAEEAdQB0AGgAbwByACgAcwApACAAbwByACAAdwBpAHQAaAAgAHQAaABlAGkAcgAgAGUAeABwAGwAaQBjAGkAdAAgAHcAcgBpAHQAdABlAG4AIABwAGUAcgBtAGkAcwBzAGkAbwBuAC4ADQAKAA0ACgA1ACkAIABUAGgAZQAgAEYAbwBuAHQAIABTAG8AZgB0AHcAYQByAGUALAAgAG0AbwBkAGkAZgBpAGUAZAAgAG8AcgAgAHUAbgBtAG8AZABpAGYAaQBlAGQALAAgAGkAbgAgAHAAYQByAHQAIABvAHIAIABpAG4AIAB3AGgAbwBsAGUALAAgAG0AdQBzAHQAIABiAGUAIABkAGkAcwB0AHIAaQBiAHUAdABlAGQAIABlAG4AdABpAHIAZQBsAHkAIAB1AG4AZABlAHIAIAB0AGgAaQBzACAAbABpAGMAZQBuAHMAZQAsACAAYQBuAGQAIABtAHUAcwB0ACAAbgBvAHQAIABiAGUAIABkAGkAcwB0AHIAaQBiAHUAdABlAGQAIAB1AG4AZABlAHIAIABhAG4AeQAgAG8AdABoAGUAcgAgAGwAaQBjAGUAbgBzAGUALgAgAFQAaABlACAAcgBlAHEAdQBpAHIAZQBtAGUAbgB0ACAAZgBvAHIAIABmAG8AbgB0AHMAIAB0AG8AIAByAGUAbQBhAGkAbgAgAHUAbgBkAGUAcgAgAHQAaABpAHMAIABsAGkAYwBlAG4AcwBlACAAZABvAGUAcwAgAG4AbwB0ACAAYQBwAHAAbAB5ACAAdABvACAAYQBuAHkAIABkAG8AYwB1AG0AZQBuAHQAIABjAHIAZQBhAHQAZQBkACAAdQBzAGkAbgBnACAAdABoAGUAIABGAG8AbgB0ACAAUwBvAGYAdAB3AGEAcgBlAC4ADQAKAA0ACgBUAEUAUgBNAEkATgBBAFQASQBPAE4ADQAKAFQAaABpAHMAIABsAGkAYwBlAG4AcwBlACAAYgBlAGMAbwBtAGUAcwAgAG4AdQBsAGwAIABhAG4AZAAgAHYAbwBpAGQAIABpAGYAIABhAG4AeQAgAG8AZgAgAHQAaABlACAAYQBiAG8AdgBlACAAYwBvAG4AZABpAHQAaQBvAG4AcwAgAGEAcgBlACAAbgBvAHQAIABtAGUAdAAuAA0ACgANAAoARABJAFMAQwBMAEEASQBNAEUAUgANAAoAVABIAEUAIABGAE8ATgBUACAAUwBPAEYAVABXAEEAUgBFACAASQBTACAAUABSAE8AVgBJAEQARQBEACAAIgBBAFMAIABJAFMAIgAsACAAVwBJAFQASABPAFUAVAAgAFcAQQBSAFIAQQBOAFQAWQAgAE8ARgAgAEEATgBZACAASwBJAE4ARAAsACAARQBYAFAAUgBFAFMAUwAgAE8AUgAgAEkATQBQAEwASQBFAEQALAAgAEkATgBDAEwAVQBEAEkATgBHACAAQgBVAFQAIABOAE8AVAAgAEwASQBNAEkAVABFAEQAIABUAE8AIABBAE4AWQAgAFcAQQBSAFIAQQBOAFQASQBFAFMAIABPAEYAIABNAEUAUgBDAEgAQQBOAFQAQQBCAEkATABJAFQAWQAsACAARgBJAFQATgBFAFMAUwAgAEYATwBSACAAQQAgAFAAQQBSAFQASQBDAFUATABBAFIAIABQAFUAUgBQAE8AUwBFACAAQQBOAEQAIABOAE8ATgBJAE4ARgBSAEkATgBHAEUATQBFAE4AVAAgAE8ARgAgAEMATwBQAFkAUgBJAEcASABUACwAIABQAEEAVABFAE4AVAAsACAAVABSAEEARABFAE0AQQBSAEsALAAgAE8AUgAgAE8AVABIAEUAUgAgAFIASQBHAEgAVAAuACAASQBOACAATgBPACAARQBWAEUATgBUACAAUwBIAEEATABMACAAVABIAEUAIABDAE8AUABZAFIASQBHAEgAVAAgAEgATwBMAEQARQBSACAAQgBFACAATABJAEEAQgBMAEUAIABGAE8AUgAgAEEATgBZACAAQwBMAEEASQBNACwAIABEAEEATQBBAEcARQBTACAATwBSACAATwBUAEgARQBSACAATABJAEEAQgBJAEwASQBUAFkALAAgAEkATgBDAEwAVQBEAEkATgBHACAAQQBOAFkAIABHAEUATgBFAFIAQQBMACwAIABTAFAARQBDAEkAQQBMACwAIABJAE4ARABJAFIARQBDAFQALAAgAEkATgBDAEkARABFAE4AVABBAEwALAAgAE8AUgAgAEMATwBOAFMARQBRAFUARQBOAFQASQBBAEwAIABEAEEATQBBAEcARQBTACwAIABXAEgARQBUAEgARQBSACAASQBOACAAQQBOACAAQQBDAFQASQBPAE4AIABPAEYAIABDAE8ATgBUAFIAQQBDAFQALAAgAFQATwBSAFQAIABPAFIAIABPAFQASABFAFIAVwBJAFMARQAsACAAQQBSAEkAUwBJAE4ARwAgAEYAUgBPAE0ALAAgAE8AVQBUACAATwBGACAAVABIAEUAIABVAFMARQAgAE8AUgAgAEkATgBBAEIASQBMAEkAVABZACAAVABPACAAVQBTAEUAIABUAEgARQAgAEYATwBOAFQAIABTAE8ARgBUAFcAQQBSAEUAIABPAFIAIABGAFIATwBNACAATwBUAEgARQBSACAARABFAEEATABJAE4ARwBTACAASQBOACAAVABIAEUAIABGAE8ATgBUACAAUwBPAEYAVABXAEEAUgBFAC4ADQAKAGgAdAB0AHAAOgAvAC8AdwB3AHcALgBhAGQAbwBiAGUALgBjAG8AbQAvAHQAeQBwAGUALwBsAGUAZwBhAGwALgBoAHQAbQBsAAAAAAAFAAAAAwAAADgAAAAEAAABUAABAAAAAAAsAAMAAQAAADgAAwAKAAABUAAGAAwAAAAAAAEAAAAEARgAAABCAEAABQACB/8P/xf/H/8n/y//N/8//0f/T/9X/1//Z/9v/3f/f/+H/4//l/+f/6f/r/+3/7//x//P/9f/5//v//f//c///f//AAAAAAgAEAAYACAAKAAwADgAQABIAFAAWABgAGgAcAB4AIAAiACQAJgAoACoALAAuADAAMgA0ADgAOgA8AD4AP3w//8AAfgB8AHoAeAB2AHQAcgBwAG4AbABqAGgAZgBkAGIAYABeAFwAWgBYAFYAVABSAFAATgBMAEgARgBEAEIAQgBAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAZkAAAAAAAAAIgAAAAAAAAB/8AAAABAAAIAAAAD/8AAAABAAAQAAAAF/8AAAABAAAYAAAAH/8AAAABAAAgAAAAJ/8AAAABAAAoAAAAL/8AAAABAAAwAAAAN/8AAAABAAA4AAAAP/8AAAABAABAAAAAR/8AAAABAABIAAAAT/8AAAABAABQAAAAV/8AAAABAABYAAAAX/8AAAABAABgAAAAZ/8AAAABAABoAAAAb/8AAAABAABwAAAAd/8AAAABAAB4AAAAf/8AAAABAACAAAAAh/8AAAABAACIAAAAj/8AAAABAACQAAAAl/8AAAABAACYAAAAn/8AAAABAACgAAAAp/8AAAABAACoAAAAr/8AAAABAACwAAAAt/8AAAABAAC4AAAAv/8AAAABAADAAAAAx/8AAAABAADIAAAAz/8AAAABAADQAAAA1/8AAAABAADgAAAA5/8AAAABAADoAAAA7/8AAAABAADwAAAA9/8AAAABAAD4AAAA/c8AAAABAAD98AAA//0AAAXxAAEAAAABB/8AAAABAAEIAAABD/8AAAABAAEQAAABF/8AAAABAAEYAAABH/8AAAABAAEgAAABJ/8AAAABAAEoAAABL/8AAAABAAEwAAABN/8AAAABAAE4AAABP/8AAAABAAFAAAABR/8AAAABAAFIAAABT/8AAAABAAFQAAABV/8AAAABAAFYAAABX/8AAAABAAFgAAABZ/8AAAABAAFoAAABb/8AAAABAAFwAAABd/8AAAABAAF4AAABf/8AAAABAAGAAAABh/8AAAABAAGIAAABj/8AAAABAAGQAAABl/8AAAABAAGYAAABn/8AAAABAAGgAAABp/8AAAABAAGoAAABr/8AAAABAAGwAAABt/8AAAABAAG4AAABv/8AAAABAAHAAAABx/8AAAABAAHIAAABz/8AAAABAAHQAAAB1/8AAAABAAHYAAAB3/8AAAABAAHgAAAB5/8AAAABAAHoAAAB7/8AAAABAAHwAAAB9/8AAAABAAH4AAAB//0AAAABAAIAAAACB/8AAAABAAIIAAACD/8AAAABAAIQAAACF/8AAAABAAIYAAACH/8AAAABAAIgAAACJ/8AAAABAAIoAAACL/8AAAABAAIwAAACN/8AAAABAAI4AAACP/8AAAABAAJAAAACR/8AAAABAAJIAAACT/8AAAABAAJQAAACV/8AAAABAAJYAAACX/8AAAABAAJgAAACZ/8AAAABAAJoAAACb/8AAAABAAJwAAACd/8AAAABAAJ4AAACf/8AAAABAAKAAAACh/8AAAABAAKIAAACj/8AAAABAAKQAAACl/8AAAABAAKYAAACn/8AAAABAAKgAAACp/8AAAABAAKoAAACr/8AAAABAAKwAAACt/8AAAABAAK4AAACv/8AAAABAALAAAACx/8AAAABAALIAAACz/8AAAABAALQAAAC1/8AAAABAALYAAAC3/8AAAABAALgAAAC5/8AAAABAALoAAAC7/8AAAABAALwAAAC9/8AAAABAAL4AAAC//0AAAABAAMAAAADB/8AAAABAAMIAAADD/8AAAABAAMQAAADF/8AAAABAAMYAAADH/8AAAABAAMgAAADJ/8AAAABAAMoAAADL/8AAAABAAMwAAADN/8AAAABAAM4AAADP/8AAAABAANAAAADR/8AAAABAANIAAADT/8AAAABAANQAAADV/8AAAABAANYAAADX/8AAAABAANgAAADZ/8AAAABAANoAAADb/8AAAABAANwAAADd/8AAAABAAN4AAADf/8AAAABAAOAAAADh/8AAAABAAOIAAADj/8AAAABAAOQAAADl/8AAAABAAOYAAADn/8AAAABAAOgAAADp/8AAAABAAOoAAADr/8AAAABAAOwAAADt/8AAAABAAO4AAADv/8AAAABAAPAAAADx/8AAAABAAPIAAADz/8AAAABAAPQAAAD1/8AAAABAAPYAAAD3/8AAAABAAPgAAAD5/8AAAABAAPoAAAD7/8AAAABAAPwAAAD9/8AAAABAAP4AAAD//0AAAABAAQAAAAEB/8AAAABAAQIAAAED/8AAAABAAQQAAAEF/8AAAABAAQYAAAEH/8AAAABAAQgAAAEJ/8AAAABAAQoAAAEL/8AAAABAAQwAAAEN/8AAAABAAQ4AAAEP/8AAAABAARAAAAER/8AAAABAARIAAAET/8AAAABAARQAAAEV/8AAAABAARYAAAEX/8AAAABAARgAAAEZ/8AAAABAARoAAAEb/8AAAABAARwAAAEd/8AAAABAAR4AAAEf/8AAAABAASAAAAEh/8AAAABAASIAAAEj/8AAAABAASQAAAEl/8AAAABAASYAAAEn/8AAAABAASgAAAEp/8AAAABAASoAAAEr/8AAAABAASwAAAEt/8AAAAB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AAloAAAJb/8AAAABAAlwAAAJd/8AAAABAAl4AAAJf/8AAAABAAmAAAAJh/8AAAABAAmIAAAJj/8AAAABAAmQAAAJl/8AAAABAAmYAAAJn/8AAAABAAmgAAAJp/8AAAABAAmoAAAJr/8AAAABAAmwAAAJt/8AAAABAAm4AAAJv/8AAAABAAnAAAAJx/8AAAABAAnIAAAJz/8AAAABAAnQAAAJ1/8AAAABAAnYAAAJ3/8AAAABAAngAAAJ5/8AAAABAAnoAAAJ7/8AAAABAAnwAAAJ9/8AAAABAAn4AAAJ//0AAAABAAoAAAAKB/8AAAABAAoIAAAKD/8AAAABAAoQAAAKF/8AAAABAAoYAAAKH/8AAAABAAogAAAKJ/8AAAABAAooAAAKL/8AAAABAAowAAAKN/8AAAABAAo4AAAKP/8AAAABAApAAAAKR/8AAAABAApIAAAKT/8AAAABAApQAAAKV/8AAAABAApYAAAKX/8AAAABAApgAAAKZ/8AAAABAApoAAAKb/8AAAABAApwAAAKd/8AAAABAAp4AAAKf/8AAAABAAqAAAAKh/8AAAABAAqIAAAKj/8AAAABAAqQAAAKl/8AAAABAAqYAAAKn/8AAAABAAqgAAAKp/8AAAABAAqoAAAKr/8AAAABAAqwAAAKt/8AAAABAAq4AAAKv/8AAAABAArAAAAKx/8AAAABAArIAAAKz/8AAAABAArQAAAK1/8AAAABAArYAAAK3/8AAAABAArgAAAK5/8AAAABAAroAAAK7/8AAAABAArwAAAK9/8AAAABAAr4AAAK//0AAAABAAsAAAALB/8AAAABAAsIAAALD/8AAAABAAsQAAALF/8AAAABAAsYAAALH/8AAAABAAsgAAALJ/8AAAABAAsoAAALL/8AAAABAAswAAALN/8AAAABAAs4AAALP/8AAAABAAtAAAALR/8AAAABAAtIAAALT/8AAAABAAtQAAALV/8AAAABAAtYAAALX/8AAAABAAtgAAALZ/8AAAABAAtoAAALb/8AAAABAAtwAAALd/8AAAABAAt4AAALf/8AAAABAAuAAAALh/8AAAABAAuIAAALj/8AAAABAAuQAAALl/8AAAABAAuYAAALn/8AAAABAAugAAALp/8AAAABAAuoAAALr/8AAAABAAuwAAALt/8AAAABAAu4AAALv/8AAAAB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ASwBLQEuAS8BMAExATIBMwE0ATUBNgE3ATgBOQE6ATsBPAE9AT4BPwFAAUEBQgFDAUQBRQFGAUcBSAFJAUoBSwFMAU0BTgFPAVABUQFSAVMBVAFVAVYBVwFYAVkBWgFbAVwBXQFeAV8BYAFhAWIBYwFkAWUBZgFnAWgBaQFqAWsBbAFtAW4BbwFwAXEBcgFzAXQBdQF2AXcBeAF5AXoBewF8AX0BfgF/AYABgQGCAYMBhAGFAYYBhwGIAYkBigGLAYwBjQGOAY8BkAGRAZIBkwGUAZUBlgGXAZgBmQGaAZsBnAGdAZ4BnwGgAaEBogGjAaQBpQGmAacBqAGpAaoBqwGsAa0BrgGvAbABsQGyAbMBtAG1AbYBtwG4AbkBugG7AbwBvQG+Ab8BwAHBAcIBwwHEAcUBxgHHAcgByQHKAcsBzAHNAc4BzwHQAdEB0gHTAdQB1QHWAdcB2AHZAdoB2wHcAd0B3gHfAeAB4QHiAeMB5AHlAeYB5wHoAekB6gHrAewB7QHuAe8B8AHxAfIB8wH0AfUB9gH3AfgB+QH6AfsB/AH9Af4B/wIAAgECAgIDAgQCBQIGAgcCCAIJAgoCCwIMAg0CDgIPAhACEQISAhMCFAIVAhYCFwIYAhkCGgIbAhwCHQIeAh8CIAIhAiICIwIkAiUCJgInAigCKQIqAisCLAItAi4CLwIwAjECMgIzAjQCNQI2AjcCOAI5AjoCOwI8Aj0CPgI/AkACQQJCAkMCRAJFAkYCRwJIAkkCSgJLAkwCTQJOAk8CUAJRAlICUwJUAlUCVgJXAlgCWQJaAlsCXAJdAl4CXwJgAmECYgJjAmQCZQJmAmcCaAJpAmoCawJsAm0CbgJvAnACcQJyAnMCdAJ1AnYCdwJ4AnkCegJ7AnwCfQJ+An8CgAKBAoICgwKEAoUChgKHAogCiQKKAosCjAKNAo4CjwKQApECkgKTApQClQKWApcCmAKZApoCmwKcAp0CngKfAqACoQKiAqMCpAKlAqYCpwKoAqkCqgKrAqwCrQKuAq8CsAKxArICswK0ArUCtgK3ArgCuQK6ArsCvAK9Ar4CvwLAAsECwgLDAsQCxQLGAscCyALJAsoCywLMAs0CzgLPAtAC0QLSAtMC1ALVAtYC1wLYAtkC2gLbAtwC3QLeAt8C4ALhAuIC4wLkAuUC5gLnAugC6QLqAusC7ALtAu4C7wLwAvEC8gLzAvQC9QL2AvcC+AL5AvoC+wL8Av0C/gL/AwADAQMCAwMDBAMFAwYDBwMIAwkDCgMLAwwDDQMOAw8DEAMRAxIDEwMUAxUDFgMXAxgDGQMaAxsDHAMdAx4DHwMgAyEDIgMjAyQDJQMmAycDKAMpAyoDKwMsAy0DLgMvAzADMQMyAzMDNAM1AzYDNwM4AzkDOgM7AzwDPQM+Az8DQANBA0IDQwNEA0UDRgNHA0gDSQNKA0sDTANNA04DTwNQA1EDUgNTA1QDVQNWA1cDWANZA1oDWwNcA10DXgNfA2ADYQNiA2MDZANlA2YDZwNoA2kDagNrA2wDbQNuA28DcANxA3IDcwN0A3UDdgN3A3gDeQN6A3sDfAN9A34DfwOAA4EDggODA4QDhQOGA4cDiAOJA4oDiwOMA40DjgOPA5ADkQOSA5MDlAOVA5YDlwOYA5kDmgObA5wDnQOeA58DoAOhA6IDowOkA6UDpgOnA6gDqQOqA6sDrAOtA64DrwOwA7EDsgOzA7QDtQO2A7cDuAO5A7oDuwO8A70DvgO/A8ADwQPCA8MDxAPFA8YDxwPIA8kDygPLA8wDzQPOA88D0APRA9ID0wPUA9UD1gPXA9gD2QPaA9sD3APdA94D3wPgA+ED4gPjA+QD5QPmA+cD6APpA+oD6wPsA+0D7gPvA/AD8QPyA/MD9AP1A/YD9wP4A/kD+gP7A/wD/QP+A/8EAAQBBAIEAwQEBAUEBgQHBAgECQQKBAsEDAQNBA4EDwQQBBEEEgQTBBQEFQQWBBcEGAQZBBoEGwQcBB0EHgQfBCAEIQQiBCMEJAQlBCYEJwQoBCkEKgQrBCwELQQuBC8EMAQxBDIEMwQ0BDUENgQ3BDgEOQQ6BDsEPAQ9BD4EPwRABEEEQgRDBEQERQRGBEcESARJBEoESwRMBE0ETgRPBFAEUQRSBFMEVARVBFYEVwRYBFkEWgRbBFwEXQReBF8EYARhBGIEYwRkBGUEZgRnBGgEaQRqBGsEbARtBG4EbwRwBHEEcgRzBHQEdQR2BHcEeAR5BHoEewR8BH0EfgR/BIAEgQSCBIMEhASFBIYEhwSIBIkEigSLBIwEjQSOBI8EkASRBJIEkwSUBJUElgSXBJgEmQSaBJsEnASdBJ4EnwSgBKEEogSjBKQEpQSmBKcEqASpBKoEqwSsBK0ErgSvBLAEsQSyBLMEtAS1BLYEtwS4BLkEugS7BLwEvQS+BL8EwATBBMIEwwTEBMUExgTHBMgEyQTKBMsEzATNBM4EzwTQBNEE0gTTBNQE1QTWBNcE2ATZBNoE2wTcBN0E3gTfBOAE4QTiBOME5ATlBOYE5wToBOkE6gTrBOwE7QTuBO8E8ATxBPIE8wT0BPUE9gT3BPgE+QT6BPsE/AT9BP4E/wUABQEFAgUDBQQFBQUGBQcFCAUJBQoFCwUMBQ0FDgUPBRAFEQUSBRMFFAUVBRYFFwUYBRkFGgUbBRwFHQUeBR8FIAUhBSIFIwUkBSUFJgUnBSgFKQUqBSsFLAUtBS4FLwUwBTEFMgUzBTQFNQU2BTcFOAU5BToFOwU8BT0FPgU/BUAFQQVCBUMFRAVFBUYFRwVIBUkFSgVLBUwFTQVOBU8FUAVRBVIFUwVUBVUFVgVXBVgFWQVaBVsFXAVdBV4FXwVgBWEFYgVjBWQFZQVmBWcFaAVpBWoFawVsBW0FbgVvBXAFcQVyBXMFdAV1BXYFdwV4BXkFegV7BXwFfQV+BX8FgAWBBYIFgwWEBYUFhgWHBYgFiQWKBYsFjAWNBY4FjwWQBZEFkgWTBZQFlQWWBZcFmAWZBZoFmwWcBZ0FngWfBaAFoQWiBaMFpAWlBaYFpwWoBakFqgWrBawFrQWuBa8FsAWxBbIFswW0BbUFtgW3BbgFuQW6BbsFvAW9Bb4FvwXABcEFwgXDBcQFxQXGBccFyAXJBcoFywXMBc0FzgXPBdAF0QXSBdMF1AXVBdYF1wXYBdkF2gXbBdwF3QXeBd8F4AXhBeIF4wXkBeUF5gXnBegF6QXqBesF7AXtBe4F7wXwBfEF8gXzBfQF9QX2BfcF+AX5BfoF+wX8Bf0F/gX/BgAGAQYCBgMGBAYFBgYGBwYIBgkGCgYLBgwGDQYOBg8GEAYRBhIGEwYUBhUGFgYXBhgGGQYaBhsGHAYdBh4GHwYgBiEGIgYjBiQGJQYmBicGKAYpBioGKwYsBi0GLgYvBjAGMQYyBjMGNAY1BjYGNwY4BjkGOgY7BjwGPQY+Bj8GQAZBBkIGQwZEBkUGRgZHBkgGSQZKBksGTAZNBk4GTwZQBlEGUgZTBlQGVQZWBlcGWAZZBloGWwZcBl0GXgZfBmAGYQZiBmMGZAZlBmYGZwZoBmkGagZrBmwGbQZuBm8GcAZxBnIGcwZ0BnUGdgZ3BngGeQZ6BnsGfAZ9Bn4GfwaABoEGggaDBoQGhQaGBocGiAaJBooGiwaMBo0GjgaPBpAGkQaSBpMGlAaVBpYGlwaYBpkGmgabBpwGnQaeBp8GoAahBqIGowakBqUGpganBqgGqQaqBqsGrAatBq4GrwawBrEGsgazBrQGtQa2BrcGuAa5BroGuwa8Br0Gvga/BsAGwQbCBsMGxAbFBsYGxwbIBskGygbLBswGzQbOBs8G0AbRBtIG0wbUBtUG1gbXBtgG2QbaBtsG3AbdBt4G3wbgBuEG4gbjBuQG5QbmBucG6AbpBuoG6wbsBu0G7gbvBvAG8QbyBvMG9Ab1BvYG9wb4BvkG+gb7BvwG/Qb+Bv8HAAcBBwIHAwcEBwUHBgcHBwgHCQcKBwsHDAcNBw4HDwcQBxEHEgcTBxQHFQcWBxcHGAcZBxoHGwccBx0HHgcfByAHIQciByMHJAclByYHJwcoBykHKgcrBywHLQcuBy8HMAcxBzIHMwc0BzUHNgc3BzgHOQc6BzsHPAc9Bz4HPwdAB0EHQgdDB0QHRQdGB0cHSAdJB0oHSwdMB00HTgdPB1AHUQdSB1MHVAdVB1YHVwdYB1kHWgdbB1wHXQdeB18HYAdhB2IHYwdkB2UHZgdnB2gHaQdqB2sHbAdtB24HbwdwB3EHcgdzB3QHdQd2B3cHeAd5B3oHewd8B30Hfgd/B4AHgQeCB4MHhAeFB4YHhweIB4kHigeLB4wHjQeOB48HkAeRB5IHkweUB5UHlgeXB5gHmQeaB5sHnAedB54HnwegB6EHogejB6QHpQemB6cHqAepB6oHqwesB60HrgevB7AHsQeyB7MHtAe1B7YHtwe4B7kHuge7B7wHvQe+B78HwAfBB8IHwwfEB8UHxgfHB8gHyQfKB8sHzAfNB84HzwfQB9EH0gfTB9QH1QfWB9cH2AfZB9oH2wfcB90H3gffB+AH4QfiB+MH5AflB+YH5wfoB+kH6gfrB+wH7QfuB+8H8AfxB/IH8wf0B/UH9gf3B/gH+Qf6B/sH/Af9B/4H/wgACAEIAggDCAQIBQgGCAcICAgJCAoICwgMCA0IDggPCBAIEQgSCBMIFAgVCBYIFwgYCBkIGggbCBwIHQgeCB8IIAghCCIIIwgkCCUIJggnCCgIKQgqCCsILAgtCC4ILwgwCDEIMggzCDQINQg2CDcIOAg5CDoIOwg8CD0IPgg/CEAIQQhCCEMIRAhFCEYIRwhICEkISghLIPsMt/oktwH3ELf5LLcD9xD6BBX+fPmE+nwH/Vj+JxX50gf3xfwzBaawFfvF+DcF+PYGpmIV/dIH+8X4MwVwZhX3xfw3Bfz2Bg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgABAQEK+B8MJpocGSQS+46LHAVGiwa9Cr0L+ucVAAPoAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAA') format('truetype'); }";
	
	FontLoader.prototype = {
		constructor: FontLoader,
		loadFonts: function() {
			var self = this;
			
			if (this._numberOfFontFamilies === 0) {
				this._finish();
				return;
			}
			
			if (this.timeout !== null) {
				this._timeoutId = window.setTimeout(function timeoutFire() {
					self._finish();
				}, this.timeout);
			}
			
			// Use constant line-height so there won't be changes in height because Adobe Blank uses zero width but not zero height.
			this._testContainer = document.createElement("div");
			this._testContainer.style.cssText = "position:absolute; left:-10000px; top:-10000px; white-space:nowrap; font-size:20px; line-height:20px; visibility:hidden;";
			
			if (FontLoader.testDiv === null) {
				this._runOnce();
			} else {
				this._loadFonts();
			}
		},
		_runOnce: function() {
			var self = this,
				clonedDiv, j,
				adobeBlankFontFaceStyle, adobeBlankDiv,
				adobeBlankFallbackFont = "serif";
			
			// Create testFiv template that will be cloned for each font
			FontLoader.testDiv = document.createElement("div");
			FontLoader.testDiv.style.position = "absolute";
			FontLoader.testDiv.appendChild(document.createTextNode(FontLoader.referenceText));

			if (!FontLoader.useAdobeBlank) {
				// Get default dimensions
				clonedDiv = FontLoader.testDiv.cloneNode(true);
				this._testContainer.appendChild(clonedDiv);
				document.body.appendChild(this._testContainer);

				for (j = 0; j < FontLoader.referenceFontFamilies.length; j++) {
					clonedDiv.style.fontFamily = FontLoader.referenceFontFamilies[j];
					FontLoader.referenceFontFamiliesSizes.push(new Size(clonedDiv.offsetWidth, clonedDiv.offsetHeight));
				}

				this._testContainer.parentNode.removeChild(this._testContainer);
				clonedDiv.parentNode.removeChild(clonedDiv);
				this._loadFonts();
			} else {
				// Add AdobeBlank @font-face
				adobeBlankFontFaceStyle = document.createElement("style");
				adobeBlankFontFaceStyle.setAttribute("type", "text/css");
				adobeBlankFontFaceStyle.appendChild(document.createTextNode(FontLoader.adobeBlankFontFaceRule));
				document.getElementsByTagName("head")[0].appendChild(adobeBlankFontFaceStyle);

				// Get default dimensions
				adobeBlankDiv = /** @type HTMLElement */FontLoader.testDiv.cloneNode(true);
				this._testContainer.appendChild(adobeBlankDiv);
				document.body.appendChild(this._testContainer);

				adobeBlankDiv.style.fontFamily = adobeBlankFallbackFont;

				if (FontLoader.useIntervalChecking) {
					this._testContainer.appendChild(adobeBlankDiv);
					// Start polling element sizes but also do first synchronous check in case all fonts where already loaded.
					this._intervalId = window.setInterval(function intervalFire() {
						self._checkAdobeBlankSize();
					}, this._intervalDelay);
					this._checkAdobeBlankSize();
				} else {
					this._adobeBlankSizeWatcher = new SizeWatcher(adobeBlankDiv, {
						container: this._testContainer,
						delegate: this,
						continuous: true,
						direction: SizeWatcher.directions.decrease,
						dimension: SizeWatcher.dimensions.horizontal
					});
					this._adobeBlankSizeWatcher.prepareForWatch();
					this._adobeBlankSizeWatcher.beginWatching();
				}

				adobeBlankDiv.style.fontFamily = FontLoader.referenceFontFamilies[0] + ", " + adobeBlankFallbackFont;
			}
		},
		_checkAdobeBlankSize: function() {
			var adobeBlankDiv = this._testContainer.firstChild;
			this._adobeBlankLoaded(adobeBlankDiv);
		},
		_adobeBlankLoaded: function(adobeBlankDiv) {
			// Prevent false size change, for example if AdobeBlank height is higher than fallback font.
			if (adobeBlankDiv.offsetWidth !== 0) {
				return;
			}
			
			FontLoader.referenceFontFamiliesSizes.push(new Size(adobeBlankDiv.offsetWidth, adobeBlankDiv.offsetHeight));
			
			if (this._adobeBlankSizeWatcher !== null) {
				// SizeWatcher method
				this._adobeBlankSizeWatcher.endWatching();
				this._adobeBlankSizeWatcher.removeScrollWatchers();
				this._adobeBlankSizeWatcher = null;
			} else {
				// Polling method (IE)
				window.clearInterval(this._intervalId);
				adobeBlankDiv.parentNode.removeChild(adobeBlankDiv);
			}
			
			this._testContainer.parentNode.removeChild(this._testContainer);

			this._loadFonts();
		},
		_loadFonts: function() {
			var i, j, clonedDiv, sizeWatcher, sizeWatchers = [],
				self = this;

			// Add div for each font-family
			for (i = 0; i < this._numberOfFontFamilies; i++) {
				this._fontsMap[this._fontFamiliesArray[i]] = true;

				if (FontLoader.useResizeEvent) {
					for (j = 0; j < FontLoader.referenceFontFamilies.length; j++) {
						clonedDiv = FontLoader.testDiv.cloneNode(true);
						clonedDiv.setAttribute("data-font-family", this._fontFamiliesArray[i]);
						clonedDiv.setAttribute("data-ref-font-family-index", String(j));
						clonedDiv.style.fontFamily = FontLoader.referenceFontFamilies[j];
						this._testContainer.appendChild(clonedDiv);
					}
				} else if (FontLoader.useIntervalChecking) {
					for (j = 0; j < FontLoader.referenceFontFamilies.length; j++) {
						clonedDiv = FontLoader.testDiv.cloneNode(true);
						clonedDiv.setAttribute("data-font-family", this._fontFamiliesArray[i]);
						clonedDiv.setAttribute("data-ref-font-family-index", String(j));
						clonedDiv.style.fontFamily = "'" + this._fontFamiliesArray[i] + "', " + FontLoader.referenceFontFamilies[j];
						this._testContainer.appendChild(clonedDiv);
					}
				} else {
					for (j = 0; j < FontLoader.referenceFontFamilies.length; j++) {
						clonedDiv = FontLoader.testDiv.cloneNode(true);
						clonedDiv.setAttribute("data-font-family", this._fontFamiliesArray[i]);
						clonedDiv.setAttribute("data-ref-font-family-index", String(j));
						clonedDiv.style.fontFamily = FontLoader.referenceFontFamilies[j];
						sizeWatcher = new SizeWatcher(/** @type HTMLElement */clonedDiv, {
							container: this._testContainer,
							delegate: this,
							size: FontLoader.referenceFontFamiliesSizes[j],
							direction: SizeWatcher.directions.increase,
							dimension: SizeWatcher.dimensions.horizontal
						});
						// The prepareForWatch() and beginWatching() methods will be invoked in separate iterations to
						// reduce number of browser's CSS recalculations.
						sizeWatchers.push(sizeWatcher);
					}
				}
			}

			// Append the testContainer after all test elements to minimize DOM insertions
			document.body.appendChild(this._testContainer);

			if (FontLoader.useResizeEvent) {
				for (j = 0; j < this._testContainer.childNodes.length; j++) {
					clonedDiv = this._testContainer.childNodes[j];
					// "resize" event works only with attachEvent
					clonedDiv.attachEvent("onresize", (function(self, clonedDiv) {
						return function() {
							self._elementSizeChanged(clonedDiv);
						}
					})(this, clonedDiv));
				}
				window.setTimeout(function() {
					for (j = 0; j < self._testContainer.childNodes.length; j++) {
						clonedDiv = self._testContainer.childNodes[j];
						clonedDiv.style.fontFamily = "'" + clonedDiv.getAttribute("data-font-family") + "', " + FontLoader.referenceFontFamilies[clonedDiv.getAttribute("data-ref-font-family-index")];
					}
				}, 0);
			} else if (FontLoader.useIntervalChecking) {
				// Start polling element sizes but also do first synchronous check in case all fonts where already loaded.
				this._intervalId = window.setInterval(function intervalFire() {
					self._checkSizes();
				}, this._intervalDelay);
				this._checkSizes();
			} else {
				// We are dividing the prepareForWatch() and beginWatching() methods to optimize browser performance by
				// removing CSS recalculation from each iteration to the end of iterations.
				for (i = 0; i < this._numberOfFontFamilies * FontLoader.referenceFontFamilies.length; i++) {
					sizeWatcher = sizeWatchers[i];
					sizeWatcher.prepareForWatch();
				}
				for (i = 0; i < this._numberOfFontFamilies * FontLoader.referenceFontFamilies.length; i++) {
					sizeWatcher = sizeWatchers[i];
					sizeWatcher.beginWatching();
					// Apply tested font-family
					clonedDiv = sizeWatcher.getWatchedElement();
					clonedDiv.style.fontFamily = "'" + clonedDiv.getAttribute("data-font-family") + "', " + FontLoader.referenceFontFamilies[clonedDiv.getAttribute("data-ref-font-family-index")];
				}
			}
		},
		_checkSizes: function() {
			var i, testDiv, currSize, refSize;
			for (i = this._testContainer.childNodes.length - 1; i >= 0; i--) {
				testDiv = this._testContainer.childNodes[i];
				currSize = new Size(testDiv.offsetWidth, testDiv.offsetHeight);
				refSize = FontLoader.referenceFontFamiliesSizes[testDiv.getAttribute("data-ref-font-family-index")];
				if (!refSize.isEqual(currSize)) {
					// Element dimensions changed, this means its font loaded, remove it from testContainer div
					testDiv.parentNode.removeChild(testDiv);
					this._elementSizeChanged(testDiv);
				}
			}
		},
		_elementSizeChanged: function(element) {
			var fontFamily = element.getAttribute("data-font-family");
			
			if (this._finished) {
				return;
			}
			
			// Check that the font of this element wasn't already marked as loaded by an element with different reference font family. 
			if (typeof this._fontsMap[fontFamily] === "undefined") {
				return;
			}
			
			this._numberOfLoadedFonts++;
			delete this._fontsMap[fontFamily];
			
			if (this.delegate && typeof this.delegate.fontLoaded === "function") {
				this.delegate.fontLoaded(fontFamily);
			}
			
			if (this._numberOfLoadedFonts === this._numberOfFontFamilies) {
				this._finish();
			}
		},
		_finish: function() {
			var callbackParameter,
				fontFamily,
				notLoadedFontFamilies = [];
			
			if (this._finished) {
				return;
			}
			
			this._finished = true;
			
			if (this._adobeBlankSizeWatcher !== null) {
				this._adobeBlankSizeWatcher = null;
			}
			
			if (this._testContainer !== null) {
				this._testContainer.parentNode.removeChild(this._testContainer);
			}
			
			if (this._timeoutId !== null) {
				window.clearTimeout(this._timeoutId);
			}
			
			if (this._intervalId !== null) {
				window.clearInterval(this._intervalId);
			}
			
			if (this._numberOfLoadedFonts < this._numberOfFontFamilies) {
				for (fontFamily in this._fontsMap) {
					if (this._fontsMap.hasOwnProperty(fontFamily)) {
						notLoadedFontFamilies.push(fontFamily);
					}
				}
				callbackParameter = {
					message: "Not all fonts were loaded",
					notLoadedFontFamilies: notLoadedFontFamilies
				};
			} else {
				callbackParameter = null;
			}
			if (this.delegate && typeof this.delegate.fontsLoaded === "function") {
				this.delegate.fontsLoaded(callbackParameter);
			}
		},
		/**
		 * SizeWatcher delegate method
		 * @param {SizeWatcher} sizeWatcher
		 */
		sizeWatcherChangedSize: function(sizeWatcher) {
			var watchedElement = sizeWatcher.getWatchedElement();
			if (sizeWatcher === this._adobeBlankSizeWatcher) {
				this._adobeBlankLoaded(watchedElement);
			} else {
				this._elementSizeChanged(watchedElement);
			}
		}
	};
	
	/**
	 * Size object
	 *
	 * @param width
	 * @param height
	 * @constructor
	 */
	function Size(width, height) {
		this.width = width;
		this.height = height;
	}
	
	/**
	 * Compares receiver object to passed in size object.
	 * 
	 * @param otherSize
	 * @returns {boolean}
	 */
	Size.prototype.isEqual = function(otherSize) {
		return (this.width === otherSize.width && this.height === otherSize.height);
	};
	
	/**
	 * SizeWatcher observes size of an element and notifies when its size is changed. It doesn't use any timeouts
	 * to check the element size, when change in size occurs a callback method immediately invoked.
	 * 
	 * To watch for element's size changes the element, and other required elements are appended to a container element
	 * you specify, and which must be added to the DOM tree before invoking prepareForWatch() method. Your container
	 * element should be positioned outside of client's visible area. Therefore you shouldn't use SizeWatcher to watch
	 * for size changes of elements used for UI.
	 * Such container element could be a simple <div> that is a child of the <body> element:
	 * <div style="position:absolute; left:-10000px; top:-10000px;"></div>
	 * 
	 * You must invoke SizeWatcher's methods in a specific order to establish size change listeners:
	 * 
	 * 1. Create SizeWatcher instance by invoke SizeWatcher constructor passing the element (size of which you want to
	 *    observe), the container element, the delegate object and optional size parameter of type Size which should be
	 *    the pre-calculated initial size of your element.
	 * 4. Invoke prepareForWatch() method. This method will calculate element size if you didn't passed it to the constructor.
	 * 5. Invoke beginWatching() method. This method will set event listeners and invoke your delegate's method once
	 *    element size changes. 
	 * 
	 * Failing to invoke above methods in their predefined order will throw an exception.
	 * 
	 * @param {HTMLElement} element An element, size of which will be observed for changes.
	 * @param {Object}      options
	 * @param {HTMLElement} options.container An element to which special observing elements will be added. Must be in DOM tree
	 *                      when prepareForWatch() method is called.
	 * @param {Object}      options.delegate A delegate object with a sizeWatcherChangedSize method which will be invoked, in
	 *                      context of the delegate object, when change in size occurs. This method is invoked with single
	 *                      parameter which is the current SizeWatcher instance.
	 * @param {Size}        [options.size] The pre-calculated initial size of your element. When passed, the element is not
	 *                      asked for offsetWidth and offsetHeight, which may be useful to reduce browser's CSS
	 *                      recalculations. If you will not pass the size parameter then its size calculation will be
	 *                      deferred to prepareForWatch() method.
	 * @param {Boolean}     [options.continuous=false] A boolean flag indicating if the SizeWatcher will watch only for
	 *                      the first size change (default) or will continuously watch for size changes.
	 * @param {Number}      [options.direction=SizeWatcher.directions.both] The direction of size change that should be
	 *                      watched: SizeWatcher.directions.increase, SizeWatcher.directions.decrease or
	 *                      SizeWatcher.directions.both
	 * @param {Number}      [options.dimension=SizeWatcher.dimensions.both] The dimension of size change that should be
	 *                      watched: SizeWatcher.dimensions.horizontal, SizeWatcher.dimensions.vertical or
	 *                      SizeWatcher.dimensions.both
	 * @constructor
	 */
	function SizeWatcher(element, options) {
		this._element = element;
		this._delegate = options.delegate;
		this._size = null;
		this._continuous = !!options.continuous;
		this._direction = options.direction ? options.direction : SizeWatcher.directions.both;
		this._dimension = options.dimension ? options.dimension : SizeWatcher.dimensions.both;
		this._sizeIncreaseWatcherContentElm = null;
		this._sizeDecreaseWatcherElm = null;
		this._sizeIncreaseWatcherElm = null;
		this._state = SizeWatcher.states.initialized;
		
		this._generateScrollWatchers(options.size);
		this._appendScrollWatchersToElement(options.container);
	}
	
	SizeWatcher.states = {
		initialized: 0,
		generatedScrollWatchers: 1,
		appendedScrollWatchers: 2,
		preparedScrollWatchers: 3,
		watchingForSizeChange: 4
	};

	SizeWatcher.directions = {
		decrease: 1,
		increase: 2,
		both: 3
	};

	SizeWatcher.dimensions = {
		horizontal: 1,
		vertical: 2,
		both: 3
	};
	
	//noinspection JSUnusedLocalSymbols
	SizeWatcher.prototype = {
		constructor: SizeWatcher,
		getWatchedElement: function() {
			return this._element;
		},
		setSize: function(size) {
			this._size = size;
			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.increase) {
				this._sizeIncreaseWatcherContentElm.style.cssText = "width: " + (size.width + 1) + "px; height: " + (size.height + 1) + "px;";
			}
			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.decrease) {
				this._sizeDecreaseWatcherElm.style.cssText = "position:absolute; left: 0px; top: 0px; overflow: hidden; width: " + (size.width - 1) + "px; height: " + (size.height - 1) + "px;";
			}
		},
		_generateScrollWatchers: function(size) {

			this._element.style.position = "absolute";
			
			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.increase) {
				this._sizeIncreaseWatcherContentElm = document.createElement("div");
				
				this._sizeIncreaseWatcherElm = document.createElement("div");
				this._sizeIncreaseWatcherElm.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: hidden;";
				this._sizeIncreaseWatcherElm.appendChild(this._sizeIncreaseWatcherContentElm);

				this._element.appendChild(this._sizeIncreaseWatcherElm);
			}

			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.decrease) {
				this._sizeDecreaseWatcherElm = document.createElement("div");
				this._sizeDecreaseWatcherElm.appendChild(this._element);
			}
			
			if (size) {
				this.setSize(size);
			}
			
			this._state = SizeWatcher.states.generatedScrollWatchers;
		},
		_appendScrollWatchersToElement: function(container) {
			if (this._state !== SizeWatcher.states.generatedScrollWatchers) {
				throw new Error("SizeWatcher._appendScrollWatchersToElement() was invoked before SizeWatcher._generateScrollWatchers()");
			}

			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.decrease) {
				container.appendChild(this._sizeDecreaseWatcherElm);
			} else {
				container.appendChild(this._element);
			}
			
			this._state = SizeWatcher.states.appendedScrollWatchers;
		},
		removeScrollWatchers: function() {
			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.decrease) {
				if (this._sizeDecreaseWatcherElm.parentNode) {
					this._sizeDecreaseWatcherElm.parentNode.removeChild(this._sizeDecreaseWatcherElm);
				}
			} else if (this._element.parentNode) {
				this._element.parentNode.removeChild(this._element);
			}
		},
		prepareForWatch: function() {
			var parentNode,
				sizeDecreaseWatcherElmScrolled = true,
				sizeIncreaseWatcherElmScrolled = true;
			
			if (this._state !== SizeWatcher.states.appendedScrollWatchers) {
				throw new Error("SizeWatcher.prepareForWatch() invoked before SizeWatcher._appendScrollWatchersToElement()");
			}
			
			if (this._size === null) {
				this.setSize(new Size(this._element.offsetWidth, this._element.offsetHeight));
			}

			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.decrease) {
				sizeDecreaseWatcherElmScrolled = this._scrollElementToBottomRight(this._sizeDecreaseWatcherElm);
			}
			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.increase) {
				sizeIncreaseWatcherElmScrolled = this._scrollElementToBottomRight(this._sizeIncreaseWatcherElm);
			}
			
			// Check if scroll positions updated.
			if (!sizeDecreaseWatcherElmScrolled || !sizeIncreaseWatcherElmScrolled) {
				
				// Traverse tree to the top node to see if element is in the DOM tree.
				parentNode = this._element.parentNode;
				while (parentNode !== window.document && parentNode !== null) {
					parentNode = parentNode.parentNode;
				}
				
				if (parentNode === null) {
					throw new Error("Can't set scroll position of scroll watchers. SizeWatcher is not in the DOM tree.");
				} else if (console && typeof console.warn === "function") {
					console.warn("SizeWatcher can't set scroll position of scroll watchers.");
				}
			}
			
			this._state = SizeWatcher.states.preparedScrollWatchers;
		},
		_scrollElementToBottomRight: function(element) {
			var elementScrolled = true;
			//noinspection JSBitwiseOperatorUsage
			if (this._dimension & SizeWatcher.dimensions.vertical) {
				element.scrollTop = 1;
				elementScrolled = elementScrolled && element.scrollTop === 1;
			}
			//noinspection JSBitwiseOperatorUsage
			if (this._dimension & SizeWatcher.dimensions.horizontal) {
				element.scrollLeft = 1;
				elementScrolled = elementScrolled && element.scrollLeft === 1;
			}
			return elementScrolled;
		},
		beginWatching: function() {
			if (this._state !== SizeWatcher.states.preparedScrollWatchers) {
				throw new Error("SizeWatcher.beginWatching() invoked before SizeWatcher.prepareForWatch()");
			}

			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.decrease) {
				//noinspection JSValidateTypes
				this._sizeDecreaseWatcherElm.addEventListener("scroll", this, false);
			}
			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.increase) {
				//noinspection JSValidateTypes
				this._sizeIncreaseWatcherElm.addEventListener("scroll", this, false);
			}
			
			this._state = SizeWatcher.states.watchingForSizeChange;
		},
		endWatching: function() {
			if (this._state !== SizeWatcher.states.watchingForSizeChange) {
				throw new Error("SizeWatcher.endWatching() invoked before SizeWatcher.beginWatching()");
			}

			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.decrease) {
				//noinspection JSValidateTypes
				this._sizeDecreaseWatcherElm.removeEventListener("scroll", this, false);
			}
			//noinspection JSBitwiseOperatorUsage
			if (this._direction & SizeWatcher.directions.increase) {
				//noinspection JSValidateTypes
				this._sizeIncreaseWatcherElm.removeEventListener("scroll", this, false);
			}
			this._state = SizeWatcher.states.appendedScrollWatchers;
		},
		/**
		 * @private
		 */
		handleEvent: function(event) {
			var newSize, oldSize;
			
			// This is not suppose to happen because when we run endWatching() we remove scroll listeners.
			// But some browsers will fire second scroll event which was pushed into event stack before listener was
			// removed so do this check anyway.
			if (this._state !== SizeWatcher.states.watchingForSizeChange) {
				return;
			}
			
			newSize = new Size(this._element.offsetWidth, this._element.offsetHeight);
			oldSize = this._size;
			
			// Check if element size is changed. How come that element size isn't changed but scroll event fired?
			// This can happen in two cases: when double scroll occurs or immediately after calling prepareForWatch()
			// (event if scroll event listeners attached after it).
			// The double scroll event happens when one size dimension (e.g.:width) is increased and another
			// (e.g.:height) is decreased.
			if (oldSize.isEqual(newSize)) {
				return;
			}
			
			if (this._delegate && typeof this._delegate.sizeWatcherChangedSize === "function") {
				this._delegate.sizeWatcherChangedSize(this);
				
				// Check that endWatching() wasn't invoked from within the delegate.
				if (this._state !== SizeWatcher.states.watchingForSizeChange) {
					return;
				}
			}
			
			if (!this._continuous) {
				this.endWatching();
			} else {
				// Set the new size so in case of double scroll event we won't cause the delegate method to be executed twice
				// and also to update to the new watched size.
				this.setSize(newSize);
				// change state so prepareFowWatch() won't throw exception about wrong order invocation.
				this._state = SizeWatcher.states.appendedScrollWatchers;
				// Run prepareForWatch to reset the scroll watchers, we have already set the size
				this.prepareForWatch();
				// Set state to listeningForSizeChange, there is no need to invoke beginWatching() method as scroll event
				// listeners and callback are already set.
				this._state = SizeWatcher.states.watchingForSizeChange;
				
			}
		}
	};
	
}(window));
},{}]},{},[14])
(14)
});