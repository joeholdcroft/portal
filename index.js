var audioPath = './audio/dojinsuite.mp3';
var fs        = require('fs');
var lame      = require('lame');
var Speaker   = require('speaker');
var gpio      = require('pi-gpio');
var movement  = false;

// Ensure pin 7 (PIR) is closed before trying to open it
gpio.close(7);

// Test start playing audio
fs.createReadStream(audioPath)
	.pipe(new lame.Decoder())
	.on('format', function(format) {
		this.pipe(new Speaker(format));
	});

// Open pin 7 (PIR) for input
gpio.open(7, 'input', function(err) {
	// Set interval for every 100ms to check pin value
	setInterval(function() {
		gpio.read(7, function(err, value) {
			newMovement = (1 == value);

			if (newMovement !== movement) {
				console.log(newMovement ? 'Movement detected' : 'Movement stopped');
			}

			movement = newMovement;
		}, 100);
	});
});