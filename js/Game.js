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
    victory,
    speed = 25,
    reloadTime = 2000,  //ms
    deltaTime,
    cannonballSpeed = 50,
    firingTime = 500;
      
var shootUp,
    shootDown,
    shootLeft,
    shootRight;
    
var cannonballs,
    ships;
    
var cannonballDMG = 20;
    
var onScreen;
    
var music = [];

// to do -> will allow for learning based on context of action performed and
//          not just the action and the result.
var reinforcementTraining = [];

var actions = [];

var greedy = 0;

for(var i = 0; i <= 365; i++) {
    var holder = Math.random();
    if(i <= 360) {
        actions[i] = Math.random();
    }
    else if(i == 361){
        actions[i] = Math.random();
    }
    else if(i == 362){
        actions[i] = Math.random();
    }
    else if(i == 363){
        actions[i] = Math.random();
    }
    else if(i == 364){
        actions[i] = Math.random();
    }
    else {
        actions[i] = Math.random();
    }
}

    
Pirates.Game.prototype = {
    
  preload: function() {
      this.game.time.advancedTiming = true;
      this.game.input.maxPointers = 1;
    },
    
  create: function() {
      this.game.stage.backgroundColor = '#279BF6';
      this.game.physics.startSystem(Phaser.Physics.ARCADE);
      
      cannonballs = this.game.add.group();
      cannonballs.enableBody = true;
      cannonballs.physicsBodyType = Phaser.Physics.ARCADE;
      
      ships = this.game.add.group();
      ships.enableBody = true;
      ships.physicsBodyType = Phaser.Physics.ARCADE;
      
      var startingX = Math.floor(Math.random() * windowWidth);
      var startingY = Math.floor(Math.random() * windowHeight);
      
      this.playerShip = this.game.add.sprite(startingX, startingY, 'playerShip');
      ships.add(this.playerShip);
      this.playerShip.angle = (360 / (2 * Math.PI)) * this.game.math.angleBetween(
          startingX, startingY, this.game.world.centerX, this.game.world.centerY) + 270;
      this.playerShip.anchor.setTo(0.5, 0.5);
      this.playerShip.scale.setTo(0.25, 0.25);
      this.playerShip.body.setSize(this.playerShip.width * 0.25, this.playerShip.height * 0.25);
      this.playerShip.body.drag = 1000;
      this.playerShip.health = 100;
      this.playerShip.direction = DirectionEnum.S;
      this.playerShip.controlledBy = 'player';
      this.playerShip.reloadRemaining = 0;
      
      shootUp = this.game.input.keyboard.addKey(Phaser.Keyboard.W),
      shootDown = this.game.input.keyboard.addKey(Phaser.Keyboard.S),
      shootLeft = this.game.input.keyboard.addKey(Phaser.Keyboard.A),
      shootRight = this.game.input.keyboard.addKey(Phaser.Keyboard.D);
      
      this.spawnShip(1);
      
      music['battle'] = this.game.add.audio('battle');
      
      music['battle'].play();
      music['battle'].loop = true;
      
      victory = false;
     
  },
  
  update: function() {
    if(!playerDead) {
        deltaTime = this.game.time.elapsed;
        if(this.playerShip.reloadRemaining > 0) {
          this.playerShip.reloadRemaining -= deltaTime;
        }
        else this.playerShooting(this.playerShip);
        
        this.playerRotate();
        this.playerFollowInput();
        
        this.game.physics.arcade.collide(ships, cannonballs, this.cannonballHit, null, true);
        this.game.physics.arcade.collide(cannonballs, cannonballs, this.cannonballSmash, null, true);
        
        ships.forEach(this.basicReinforcement, this, true);
        
        ships.forEach(function(ship) {
            if(ship.health <= 0) {
                ship.destroy();
                victory = true;
            }
        });
        
        cannonballs.forEach(function(cannonball) {
            if(cannonball.TTL <= 0) {
                cannonball.destroy();
            } else cannonball.TTL -= deltaTime;
        });
    }
  },
  
  playerRotate: function() {
      var targetAngle = (360 / (2 * Math.PI)) * this.game.math.angleBetween(
          this.playerShip.x, this.playerShip.y,
          this.game.input.activePointer.x, this.game.input.activePointer.y) + 90;

        if(this.game.input.activePointer.isDown && !this.dragging)
        {
            this.dragging = true;
        }
        if(!this.game.input.activePointer.isDown && this.dragging)
        {
            this.dragging = false;
        }

        if(this.dragging)
        {
            this.playerShip.angle = targetAngle + 180;
            
            if(20 < targetAngle && 70 > targetAngle) {
                this.playerShip.direction = DirectionEnum.NORTHEAST;
            }
            else if(70 <= targetAngle && 110 >= targetAngle) {
                this.playerShip.direction = DirectionEnum.EAST;
            }
            else if(110 < targetAngle && 160 > targetAngle) {
                this.playerShip.direction = DirectionEnum.SOUTHEAST;
            }
            else if(160 <= targetAngle && 210 >= targetAngle) {
                this.playerShip.direction = DirectionEnum.SOUTH;
            }
            else if(210 < targetAngle && 250 > targetAngle) {
                this.playerShip.direction = DirectionEnum.SOUTHWEST;
            }
            else if(250 <= targetAngle && 290 >= targetAngle) {
                this.playerShip.direction = DirectionEnum.WEST;
            }
            else if(290 < targetAngle && 340 > targetAngle) {
                this.playerShip.direction = DirectionEnum.NORTHWEST;
            }
            else this.playerShip.direction = DirectionEnum.NORTH;
        }
  },
  
  playerFollowInput: function() {
    if (this.game.input.mousePointer.isDown) {
        this.game.physics.arcade.moveToPointer(this.playerShip, speed);
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
      console.log(ship);
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
  
  spawnShip: function(number) {
      for(var i = 1; i <= number; i++) {
        var startingX = Math.floor(Math.random() * windowWidth);
        var startingY = Math.floor(Math.random() * windowHeight);
        var enemyShip = this.game.add.sprite(startingX, startingY, 'playerShip');
        ships.add(enemyShip);
        enemyShip.controlledBy = 'computer ' + i;
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
  
  cannonballHit: function(ship, cannonball) {
      if(ship.controlledBy != cannonball.shotBy) {
        cannonball.destroy();
        ship.health -= cannonballDMG;
        if(ship.health <= cannonballDMG - 1) {
          ship.loser = true;
          this.victory();
        }
      }
  },
  
  cannonballSmash: function(obj1, obj2) {
      obj1.destroy();
      obj2.destroy();
  },
  
  
  /***********************************************************************/
  // Basic greedy reinforcement learning algorithm.                      //
  // - Iterate through available actions                                 //
  // -> check for action with higher reward than current action, 'greedy'//
  // - Perform action with highest reward                                //
  //                                                                     //
  // * Actions are number 0-365 (default 0)                              //
  //   0 - 360 are degrees of movement                                   //
  //   361 - 365 are shooting directions (up, down, left, right)         //
  /***********************************************************************/
  basicReinforcement: function(ship) {
      if(ship.controlledBy != 'player') {
        var length,
            reward = actions[greedy];
      
        if(ship.reloadRemaining > 0){ length = 360;}
        else { length = 365; }
      
        for(var i = 0; i <= length; i++) {
            if(actions[i] > reward) {
                greedy = i;
                reward = actions[i];
            }
        }
      
        if(greedy <= 360) {
            this.computerMove(ship, greedy);
            ship.actionSequence.push(greedy);
        }
        else if(greedy == 361){
            this.computerShoot(ship, 'up');
            ship.actionSequence.push(greedy);
        }
        else if(greedy == 362){
            this.computerShoot(ship, 'down');
            ship.actionSequence.push(greedy);
        }
        else if(greedy == 363){
            this.computerShoot(ship, 'left');
            ship.actionSequence.push(greedy);
        }
        else if(greedy == 364){
            this.computerShoot(ship, 'right');
            ship.actionSequence.push(greedy);
        }
        else if(greedy == 365){
            ship.actionSequence.push(greedy);
        }
      
        this.updateReward(ship);
      }
  },
  
  // *** TO DO *** //
  isEqual: function(actionSequence, reinforcementTraining) {
      var similarityDiff,
          mostSimilar,
          testing;
          
      for(var i = 0; i < reinforcementTraining.length; i++) {
          testing = reinforcementTraining[i];
          for(var j = 0; j < actionSequence.length; j++) {
              if(testing[i] == actionSequence[i]) {
                  
              }
          }
      }
  },
  
  /***********************************************************************/
  // Update the reward of taken action                                   //
  // - If ship lost health from last action                              //
  //    -> reduce actions reward                                         //
  // - If ship repeats same move 25 times in a row                       //
  //    -> reduce actions reward                                         //
  /***********************************************************************/
  updateReward: function(ship) {
      if('pastHP' in ship) {
          if(ship.pastHP > ship.health) {
              for(var i = 0; i < ship.actionSequence.length; i++) {
                  actions[ship.actionSequence[i]] *= ((ship.pastHP - ship.health) / 100); 
              }
          }
          ship.pastHp = ship.health;
      } else {
          ship.pastHP = ship.health;
      }
      
      var holder,
          sameAction = false;
      
      if(ship.actionSequence.length % 25 == 0){
        for(var i = ship.actionSequence.length - 5; i < ship.actionSequence.length - 1; i++) {
            holder = ship.actionSequence[i];
            if(holder == ship.actionSequence[i + 1]) {
              sameAction = true;
            }
            else { 
              i = ship.actionSequence.length;
              sameAction = false;
            }
        }
      }
      
      if(sameAction) {
          actions[holder] *= 0.75; 
      }
  },
  
  victory: function() {
      ships.forEach(function(ship) {
        if(ship.loser) {
            for(var i = 0; i < ship.actionSequence; i++) {
              actions[ship.actionSequence[i]] *= 0.5;
            }
            ship.destroy();
        }
        else {
            for(var i = 0; i < ship.actionSequence.length; i++) {
              actions[ship.actionSequence[i]] = (actions[ship.actionSequence[i]] + 1) / 2; 
            }
            ship.destroy();
        }
      });
      
      this.spawnShip(2);
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
  }
};
    