jQuery(function($, undefined) {

    var level;
    var tiles = [];
    var $tiles = $('#Tiles');
    var activeTiles = [];
    var paused = false;
    
    var paddle = {};
    (function(){
        paddle.$ele = $('#Paddle');
        paddle.width = paddle.$ele.width();
        paddle.left = 0;
        paddle.right = 0;
        paddle.top = 580;
        
        paddle.center = function(){
            paddle.left = ($tiles.width() / 2) - (paddle.width / 2);
            paddle.right = paddle.left + paddle.width;
            return paddle;
        };
        
        paddle.update = function(){
            paddle.$ele.css('left', Math.round(paddle.left));
            paddle.right = paddle.left + paddle.width;
            return paddle;
        };
    })();
    
    var $balls = $('#Balls');
    var balls = [];

    var maxElapsed = 1000 / 30;
    var maxSpeed = 100;

    function timer(taskname, callback){
        var start = new Date().getTime();
        callback();
        console.log(taskname, new Date().getTime() - start);
    }
    
    function clone(obj){
        var cloneObj = {};
        var objKeys = Object.keys(obj);
        for(var i = 0; i < objKeys.length; i++) {
            var objKey = objKeys[i];
            var propertyValue = obj[objKey];
            if(typeof propertyValue === "object") {
                propertyValue = clone(propertyValue);
            }
            cloneObj[objKey] = propertyValue;
        }
        return cloneObj;
    }
    
    function createTileElement(tile) {
        return $tile = $('<div>')
            .addClass('tile')
            .css({
                left: tile.x,
                top: tile.y,
                width: tile.w,
                height: tile.h,
                'background-image': 'url(' + tile.img + ')'
            });
    }
    
    function createTile(params) {
        var tile = clone(tiles[params.type]);
        var objKeys = Object.keys(params);
        for(var i = 0; i < objKeys.length; i++) {
            var objKey = objKeys[i];
            if(typeof tile[objKey] === "undefined")
                continue;
            tile[objKey] = params[objKey];
        }
        tile.left = tile.x;
        tile.right = tile.x + tile.w;
        tile.top = tile.y;
        tile.bottom = tile.y + tile.h;
        return tile;
    }
    
    function updateBallLocations() {
        for(var i = 0; i < balls.length; i++) {
            var ball = balls[i];
            ball.element.css({
                top: Math.round(ball.y) - 5,
                left: Math.round(ball.x) - 5
            });
        }
    }
    
    function spawnBall(x, y, speed, orientation) {
        if(x === undefined) x = $tiles.width() / 2;
        if(y === undefined) y = $('#Board').position().top - 5;
        if(speed === undefined) speed = 30;
        if(orientation === undefined) orientation = 30;
        
        balls.push({
            x: x, y: y, speed: speed, orientation: orientation,
            lastX: 0, lastY: 0,
            element: $('<div>').addClass('ball').appendTo($balls)
        });
    }

    function CallbackObj() {
        var _this = this;
        _this.funcs = {done: []};
        _this.done = function(func) {
            var doneCallback = new CallbackObj();
            var args = [];
            for(var i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            _this.funcs.done.push({context: doneCallback, func: func, args: args});
            return doneCallback;
        };
        _this.doneCallback = function() {
            for(var i = 0; i < _this.funcs.done.length; i++) {
                var callback = _this.funcs.done[i];
                callback.func.apply(callback.context, callback.args);
            }
        }
    }

    function initTiles() {
        var callbackObj = new CallbackObj();
        $.get('./levels/tiles.json', function(json) {
            tiles = (typeof json === "object") ? json : JSON.parse(json);
            callbackObj.doneCallback();
        });
        return callbackObj;
    }

    function initLevel(i) {
        var _this = this;

        // Clear tiles
        $tiles.html('');
        activeTiles = [];
        
        // Place tiles
        $.get('./levels/' + i + '.json', function(json) {
            level = (typeof json === "object") ? json : JSON.parse(json);
            var lvlTiles = level.tiles;
            for(var i = 0; i < lvlTiles.length; i++) {
                var tile = createTile(lvlTiles[i]);
                var $tile = createTileElement(tile);
                $tiles.append($tile);
                tile.element = $tile;
                activeTiles.push(tile);
            }
            if(_this instanceof CallbackObj) {
                _this.doneCallback();
            }
            setTimeout(function(){
                paused = false;
            }, 500);
        });

        // Center paddle
        paddle.center().update();
        
        // Clear balls
        $balls.html('');
        balls = [];
        
        // Spawn ball
        spawnBall();
    }
    
    var keys = {};
    function initControls() {
        var _this = this;

        document.addEventListener('keydown', function(e) {
            var k = e.keyCode;
            keys[k] = true;
        });
        document.addEventListener('keyup', function(e) {
            var k = e.keyCode;
            keys[k] = undefined;
        });
        if(_this instanceof CallbackObj) {
            _this.doneCallback();
        }
    }

    // Encapsulate variables
    var initAnimationCycle;
    (function() {

        function t() {
            return new Date().getTime();
        }
        
        function bounceDown(ball) {
            var ori = ball.orientation;
            if(ori <= 90) ori = 180 - ori;
            else if(ori >= 270) ori = 270 - (ori - 270);
            ball.orientation = ori;
            ball.y = ball.lastY;
        }
        function bounceUp(ball) {
            var ori = ball.orientation;
            if(ori >= 90 && ori <= 180) ori = 180 - ori;
            else if(ori <= 270 && ori >= 180) ori = 360 - (ori - 180);
            ball.orientation = ori;
            ball.y = ball.lastY;
        }
        function bounceLeft(ball) {
            var ori = ball.orientation;
            if(ori <= 90) ori = 360 - ori;
            else if(ori <= 180) ori = 270 - (ori - 90);
            ball.orientation = ori;
            ball.x = ball.lastX;
        }
        function bounceRight(ball) {
            var ori = ball.orientation;
            if(ori >= 270) ori = 360 - ori;
            else if(ori >= 180) ori = 90 + (270 - ori);
            ball.orientation = ori;
            ball.x = ball.lastX;
        }
        

        function checkWallBounce(ball) {
            var x = ball.x;
            var y = ball.y;

            var maxX = $tiles.width() - 5;
            if(x < 5) bounceRight(ball);
            if(x > maxX) bounceLeft(ball);
            if(y < 5) bounceDown(ball);
        }
        
        function checkPaddleBounce(ball) {
            var paddleTop = 580;
            var paddleLeft = paddle.left - 5;
            var paddleRight = paddle.right + 5;
            // Increase the width of the paddle by 5px on both sides to compensate for the size of the ball
            
            var ballY = ball.y + 5; // We care about the bottom of the ball for the paddle
            var ballX = ball.x;
            
            if(ballY >= paddleTop && ballY < (paddleTop + 20)) {
                // The ball is at the height of the paddle
                if(ballX >= paddleLeft && ballX <= paddleRight) {
                    // The ball is touching the paddle
                    ball.y = paddleTop - 5;
                    
                    var pos = (ballX - paddleLeft) / paddle.width;
                    var ori = ((pos * 120) + 30 + 360 - 90) % 360;
                    ball.orientation = ori;
                    
                    ball.speed++;
                    if(ball.speed > maxSpeed) ball.speed = maxSpeed;
                }
            }
        }
        
        function checkTileBounce(ball) {
            for(var i = 0; i < activeTiles.length; i++) {
                var tile = activeTiles[i];
                var $tile = tile.element;
                var tpos = {
                    left: tile.left - 5,
                    right: tile.right + 5,
                    top: tile.top - 5,
                    bottom: tile.bottom + 5
                };
                
                var ballX = ball.x;
                var ballY = ball.y;
                
                // If not touching, not relevant
                if(ballX < tpos.left || ballX > tpos.right) continue;
                if(ballY < tpos.top || ballY > tpos.bottom) continue;
                
                // It's touching, but where
                var lastX = ball.lastX;
                var lastY = ball.lastY;
                
                if(lastX < tpos.left) bounceLeft(ball);
                else if(lastX > tpos.right) bounceRight(ball);
                if(lastY < tpos.top) bounceUp(ball);
                else if(lastY > tpos.bottom) bounceDown(ball);
                
                $tile.remove();
                activeTiles.splice(i, 1);
                i--;
            }
            
        }
        
        function moveBalls(elapsed) {
            if(paused) return;
            for(var i = 0; i < balls.length; i++) {
                var ball = balls[i];
                var spd = ball.speed;
                var ori = ball.orientation;
                var x = ball.x;
                var y = ball.y;
                
                // Store the last location of the ball
                ball.lastX = x;
                ball.lastY = y;

                var h = Math.sin(ori * Math.PI / 180.0);
                var v = Math.pow(1 - Math.pow(h, 2), 0.5);
                if(ori > 90 && ori < 270) v *= -1;

                x += elapsed / (1 / (h * spd)) / 100;
                y -= elapsed / (1 / (v * spd)) / 100;

                ball.x = x;
                ball.y = y;
                
                if(ball.y > 600) {
                    balls.splice(i--, 1);
                    ball.element.remove();
                    setTimeout(function(){ paddle.center(); }, 250);
                    setTimeout(function(){ spawnBall(); }, 500);
                    continue;
                }
                checkWallBounce(ball);
                checkPaddleBounce(ball);
                checkTileBounce(ball);
            }
        }

        var lastAnimationFrame;
        function animateFrame() {
            var time = t();
            var elapsed = Math.abs(lastAnimationFrame - time);
            if(elapsed > maxElapsed) elapsed = maxElapsed;
            
            lastAnimationFrame = time;

            if(!!keys['37']) {
                if(!usingKeyboard) useKeyboard();
                var x = paddle.left;
                var moveTo = x - (elapsed / 3);
                if(moveTo < 0) moveTo = 0;
                paddle.left = moveTo;
            }
            if(!!keys['39']) {
                if(!usingKeyboard) useKeyboard();
                var x = paddle.left;
                var moveTo = x + (elapsed / 3);
                var maxX = $tiles.width() - paddle.width;
                if(moveTo > maxX) moveTo = maxX;
                paddle.left = moveTo;
            }
            else if(!usingKeyboard && fingerX >= 0){
                var x = paddle.left;
                var moveAmount = (elapsed / 3);
                var minX = Math.max(0, x - moveAmount);
                var maxX = Math.min($tiles.width() - paddle.width, x + moveAmount);
                
                var moveTo = fingerX - (paddle.width / 2);
                if(moveTo < minX) moveTo = minX;
                if(moveTo > maxX) moveTo = maxX;
                paddle.left = moveTo;
            }
            paddle.update();
            
            moveBalls(elapsed);
            updateBallLocations();
            if(activeTiles.length <= 0 && !paused) {
                paused = true;
                initLevel(level.next);
            }
            
            window.requestAnimationFrame(animateFrame);
        }

        initAnimationCycle = function() {
            lastAnimationFrame = t();
            window.requestAnimationFrame(animateFrame);

            console.log('Initialization completed');
        };

    })();

    initTiles()
        .done(initLevel, 1)
        .done(initControls)
        .done(initAnimationCycle);
    
    // Work on mobile
    var usingKeyboard = false;
    var fingerX = -1;
    var useKeyboard;
    
    (function(){
        var touching = false;
        function touchStart(e){
            touching = true;
            fingerX = e.changedTouches[0].pageX;
        }
        function touchMove(e){
            if(!touching) return;
            fingerX = e.changedTouches[0].pageX;
        }
        function touchEnd(e){
            fingerX = -1;
            touching = false;
        }
        window.addEventListener("touchstart", touchStart, true);
        window.addEventListener("touchmove", touchMove, true);
        window.addEventListener("touchend", touchEnd, true);
        
        useKeyboard = function(){
            usingKeyboard = true;
            window.removeEventListener("deviceorientation", deviceOrientationListener);
        };
    })();

});