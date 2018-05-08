var Pirates = Pirates || {};

Pirates.game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.CANVAS, '');

Pirates.game.state.add('Boot', Pirates.Boot);
Pirates.game.state.add('Preload', Pirates.Preload);
Pirates.game.state.add('Game', Pirates.Game);

Pirates.game.state.start('Boot');