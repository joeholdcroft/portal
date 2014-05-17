// TODO: use events for movement toggle to tidy up code
// TODO: loop the audio
// TODO: fade audio in/out and mute when no movement instead of stopping
// TODO: fix bug where error when trying to close pin 7 when it isnt open sometimes
// NOTE: 14 seconds in is some drumming that could work

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

// Start by muting the audio
loudness.setMuted(true, function() {
	console.log('Audio muted');
});

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

				// Check if audio is currently muted
				loudness.getMuted(function (err, muted) {
					// If muted state matches movement state, we need to change that
					if (muted === newMovement) {
						loudness.setMuted(!newMovement, function() {
							console.log('Audio ' + (newMovement ? 'not' : '') + ' muted');
						});
					}
				});
			}

			movement = newMovement;
		}, 100);
	});
});