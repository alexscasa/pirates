var Pirates = Pirates || {};

Pirates.Game = function(){};

var windowHeight = window.innerHeight,
    windowWidth = window.innerWidth;

const DirectionEnum = {
    NORTH: 0,
    NORTHEAST: 45,
    EAST: 90,
    SOUTHEAST: 135,
    SOUTH: 180,
    SOUTHWEST: 225,
    WEST: 270,
    NORTHWEST: 315,
};

var playerDead = false,
    dragging = false,
    deltaTime;
      
var shootUp,
    shootDown,
    shootLeft,
    shootRight;
    
var cannonballs,
    ships;
    
var music = [];

var speed = 25,
    reloadTime = 2000,
    cannonballSpeed = 50,
    cannonballDMG = 25;
    
var computers = 2,
    players = 0;

var network,
    learningRate = .8;


    
Pirates.Game.prototype = {
    
  preload: function() {
      this.game.time.advancedTiming = true;
      this.game.input.maxPointers = 1;
    },
    
  create: function() {
      this.game.stage.backgroundColor = '#279BF6';
      this.game.physics.startSystem(Phaser.Physics.ARCADE);
      this.game.world.setBounds(0, 0, windowWidth, windowHeight);
      
      cannonballs = this.game.add.group();
      cannonballs.enableBody = true;
      cannonballs.physicsBodyType = Phaser.Physics.ARCADE;
      
      ships = this.game.add.group();
      ships.enableBody = true;
      ships.physicsBodyType = Phaser.Physics.ARCADE;
      
    //   var startingX = Math.floor(Math.random() * windowWidth);
    //   var startingY = Math.floor(Math.random() * windowHeight);
      
    //   this.playerShip = this.game.add.sprite(startingX, startingY, 'playerShip');
    //   ships.add(this.playerShip);
    //   this.playerShip.angle = (360 / (2 * Math.PI)) * this.game.math.angleBetween(
    //       startingX, startingY, this.game.world.centerX, this.game.world.centerY) + 270;
    //   this.playerShip.anchor.setTo(0.5, 0.5);
    //   this.playerShip.scale.setTo(0.25, 0.25);
    //   this.playerShip.body.setSize(this.playerShip.width * 0.25, this.playerShip.height * 0.25);
    //   this.playerShip.body.drag = 1000;
    //   this.playerShip.health = 100;
    //   this.playerShip.direction = DirectionEnum.S;
    //   this.playerShip.controlledBy = 'player';
    //   this.playerShip.reloadRemaining = 0;
      
      shootUp = this.game.input.keyboard.addKey(Phaser.Keyboard.W),
      shootDown = this.game.input.keyboard.addKey(Phaser.Keyboard.S),
      shootLeft = this.game.input.keyboard.addKey(Phaser.Keyboard.A),
      shootRight = this.game.input.keyboard.addKey(Phaser.Keyboard.D);
      
      this.spawnShip(players, 'player');
      this.spawnShip(computers, 'computer');
      
      music['battle'] = this.game.add.audio('battle');
      
      music['battle'].play();
      music['battle'].loop = true;
      
      victory = false;
      
      network = new synaptic.Architect.Perceptron((computers * 4) + (players * 4), 20, 1);
  },
  
  update: function() {
    if(!playerDead) {
        screenshot = this.game.canvas.toDataURL().split(',')[1];
        deltaTime = this.game.time.elapsed;
        
        // data for neural network
        var input = [];
        // check collisions between cannonballs and cannonballs and ships
        this.game.physics.arcade.collide(ships, cannonballs, this.cannonballHit, null, true);
        this.game.physics.arcade.collide(cannonballs, cannonballs, this.cannonballSmash, null, true);
        // add required input for neural network controlling AI
        ships.forEach(function(ship) {
            input = input.concat(this.networkInput(ship));
        }.bind(this));
        
        // control player and computer ships
        ships.forEach(function(ship) {
            if(ship.health <= 0) ship.destroy();
            
            if(ship.reloadRemaining > 0) {
                ship.reloadRemaining -= deltaTime;
            }
            
            if(ship.controlledBy.includes("player")) {
                this.playerRotate(ship);
                this.playerFollowInput(ship);
                if(ship.reloadRemaining <= 0) this.playerShooting(ship);
            } else {
                this.decisions(ship, Math.round(network.activate(input) * 365));
            }
        }.bind(this));
        
        cannonballs.forEach(function(cannonball) {
            if(cannonball.TTL <= 0) {
                cannonball.destroy();
            } else cannonball.TTL -= deltaTime;
        });
    }
  },
  
  // rotatoes the sprite according to mouse drag
  playerRotate: function(ship) {
      var targetAngle = (360 / (2 * Math.PI)) * this.game.math.angleBetween(
          ship.x, ship.y,
          this.game.input.activePointer.x, this.game.input.activePointer.y) + 90;

        if(this.game.input.activePointer.isDown && !dragging)
        {
            dragging = true;
        }
        if(!this.game.input.activePointer.isDown && dragging)
        {
            dragging = false;
        }

        if(dragging)
        {
            ship.angle = targetAngle + 180;
            
            if(20 < targetAngle && 70 > targetAngle) {
                ship.direction = DirectionEnum.NORTHEAST;
            }
            else if(70 <= targetAngle && 110 >= targetAngle) {
                ship.direction = DirectionEnum.EAST;
            }
            else if(110 < targetAngle && 160 > targetAngle) {
                ship.direction = DirectionEnum.SOUTHEAST;
            }
            else if(160 <= targetAngle && 210 >= targetAngle) {
                ship.direction = DirectionEnum.SOUTH;
            }
            else if(210 < targetAngle && 250 > targetAngle) {
                ship.direction = DirectionEnum.SOUTHWEST;
            }
            else if(250 <= targetAngle && 290 >= targetAngle) {
                ship.direction = DirectionEnum.WEST;
            }
            else if(290 < targetAngle && 340 > targetAngle) {
                ship.direction = DirectionEnum.NORTHWEST;
            }
            else ship.direction = DirectionEnum.NORTH;
        }
  },
  
  // moves player sprite towards their mouse click position (caught at end of drag)
  playerFollowInput: function(ship) {
    if (this.game.input.mousePointer.isDown) {
        this.game.physics.arcade.moveToPointer(ship, speed);
    }
  },
  
  playerShooting: function(ship) {
      var x = '';
      var y = '';
      var shooting = false;
      
      if(shootUp.isDown) {
          y = '-';
          shooting = true;
      }
      else if(shootDown.isDown) {
          y = '+';
          shooting = true;
      }
      else if(shootLeft.isDown) {
          x = '-';
          shooting = true;
      }
      else if(shootRight.isDown) {
          x = '+';
          shooting = true;
      }
      
      if(shooting) {
          this.shipShoot(x, y, ship);
          ship.reloadRemaining = reloadTime;
      }
  },
  
  shipShoot: function(dirX, dirY, ship) {
      var cannonball = this.game.add.sprite(ship.x, ship.y, 'cannonball');
      cannonball.shotBy = ship.controlledBy;
      cannonball.TTL = 8000;
      cannonballs.add(cannonball);
      cannonball.scale.setTo(0.05, 0.05);
      
      cannonball.body.velocity.x = ship.body.velocity.x;
      cannonball.body.velocity.y = ship.body.velocity.y;
      
      if(dirX == '+') {
          cannonball.body.velocity.x += cannonballSpeed;
      }
      else if(dirX == '-') {
          cannonball.body.velocity.x -= cannonballSpeed;
      }
      else if(dirY == '+') {
          cannonball.body.velocity.y += cannonballSpeed;
      }
      else if(dirY == '-') {
          cannonball.body.velocity.y -= cannonballSpeed;
      }
  },
  
  spawnShip: function(number, playerType) {
      for(var i = 1; i <= number; i++) {
        var startingX = Math.floor(Math.random() * windowWidth);
        var startingY = Math.floor(Math.random() * windowHeight);
        var enemyShip = this.game.add.sprite(startingX, startingY, 'playerShip');
        // enemies.add(enemyShip)
        ships.add(enemyShip);
        enemyShip.controlledBy = playerType + ' ' + i;
        enemyShip.anchor.setTo(0.5, 0.5);
        enemyShip.scale.setTo(0.25, 0.25);
        enemyShip.body.drag = 1000;
        enemyShip.health = 100;
        enemyShip.reloadRemaining = 0;
        enemyShip.loser = false;
        enemyShip.actionSequence = [];
        enemyShip.angle = (360 / (2 * Math.PI)) * this.game.math.angleBetween(
            startingX, startingY, this.game.world.centerX, this.game.world.centerY) + 270;
      }
  },
  
  //  when a ship is hit by a cannonball (that was fired by another ship)
  //  they will receive damage, base damage equal to 25hp
  //  a ship can withstand 4 shots before being destroyed
  cannonballHit: function(ship, cannonball) {
      if(ship.controlledBy != cannonball.shotBy) {
        cannonball.destroy();
        ship.health -= cannonballDMG;
        if(ship.health <= 0) {
          ship.destroy();
        }
        network.propagate(learningRate);
      }
  },
  
  //  cannonballs that collide are destroyed
  cannonballSmash: function(obj1, obj2) {
      obj1.destroy();
      obj2.destroy();
  },
  
  computerShoot: function(ship, direction) {
      if(direction == 'up') {
          this.shipShoot('', '-', ship);
      }
      else if(direction == 'down') {
          this.shipShoot('', '+', ship);
      }
      else if(direction == 'left') {
          this.shipShoot('-', '', ship);
      }
      else {
          this.shipShoot('+', '', ship);
      }
      
      ship.reloadRemaining = reloadTime;
  },
  
  computerMove: function(ship, angle) {
      ship.angle = angle;
      
      angle = (angle * Math.PI) / 180;
      var vx = speed * Math.cos(angle);
      var vy = speed * Math.sin(angle);
      
      ship.body.velocity.x = vx;
      ship.body.velocity.y = vy;
  },
  
  networkInput: function(ship) {
    var input = [];
    input.push(ship.world.x);
    input.push(ship.world.y);
    input.push(ship.body.velocity.x);
    input.push(ship.body.velocity.y);
    return input;
  },
  
  decisions: function(ship, action) {
      if(action >= 0 || action <= 360) {
          this.computerMove(ship, action);
      } else switch(action) {
          case 361:
              this.computerShoot('up');
              break;
          case 362:
              this.computerShoot('down');
              break;
          case 363:
              this.computerShoot('left');
              break;
          case 364:
              this.computerShoot('right');
              break;
      }
  }
};
    