var Pirates = Pirates || {};

//loading the game assets
Pirates.Preload = function(){};

Pirates.Preload.prototype = {
  preload: function() {
    //show loading screen
    this.game.stage.backgroundColor = '#279BF6';
    this.preloadBar = this.add.sprite(this.game.world.centerX, this.game.world.centerY, 'preloadbar');
    this.preloadBar.anchor.setTo(0.5);
    this.preloadBar.scale.setTo(3);

    this.load.setPreloadSprite(this.preloadBar);

    //load game assets
    this.load.image('playerShip', 'assets/images/defaultShip.png');
    this.load.image('cannonball', 'assets/images/cannonball.png');
    this.load.audio('battle', 'assets/audio/battle.wav');  // reformat - wav takes too long to dl
    this.load.onLoadComplete.add(this.loadComplete, this);
    
    // this.load.tilemap('level1', 'assets/tilemaps/level1.json', null, Phaser.Tilemap.TILED_JSON);
    // this.load.audio('coin', ['assets/audio/coin.ogg', 'assets/audio/coin.mp3']);
  },
  
  loadComplete: function() {
    this.ready = true;
  },
  
  update: function() {
    if(this.cache.isSoundDecoded('battle') && this.ready === true) {
      this.state.start('Game');
    }
  }
};