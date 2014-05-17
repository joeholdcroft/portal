// TODO: use events for movement toggle to tidy up code
// TODO: loop the audio
// TODO: fade audio in/out and mute when no movement instead of stopping

var audioPath = './audio/dojinsuite.mp3';
var fs        = require('fs');
var lame      = require('lame');
var Speaker   = require('speaker');
var speaker   = new Speaker();
var loudness  = require('loudness');
var gpio      = require('pi-gpio');
var movement  = false;
var audioStream = null;

var startAudio = function() {
	audioStream = fs.createReadStream(audioPath)
		.pipe(new lame.Decoder())
		.on('format', function(format) {
			this.pipe(new Speaker(format));
		});
};

// Start the audio
startAudio();

// Re-start the audio when it has finished playing
speaker.on('close', startAudio);

// Test muting after 20 seconds
setTimeout(function() {
	loudness.setMuted(true, function() {
		console.log('muted');
	});
}, 1000 * 20);

// Test unmuting after 40 seconds
setTimeout(function() {
	loudness.setMuted(true, function() {
		console.log('un-muted');
	});
}, 1000 * 40);

// Ensure pin 7 (PIR) is closed before trying to open it
gpio.close(7);

// Open pin 7 (PIR) for input
gpio.open(7, 'input', function(err) {
	// Set interval for every 100ms to check pin value
	setInterval(function() {
		gpio.read(7, function(err, value) {
			newMovement = (1 == value);

			if (newMovement !== movement) {
				console.log(newMovement ? 'Movement detected' : 'Movement stopped');

				// if (newMovement && null === audioStream) {
				// 	audioStream = fs.createReadStream(audioPath)
				// 		.pipe(new lame.Decoder())
				// 		.on('format', function(format) {
				// 			this.pipe(new Speaker(format));
				// 		});
				// }
				// else if (!newMovement && null !== audioStream) {
				// 	audioStream.end();
				// 	audioStream = null;
				// }
			}

			movement = newMovement;
		}, 100);
	});
});