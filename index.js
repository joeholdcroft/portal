// TODO: use events for movement toggle to tidy up code
// TODO: fix bug where error when trying to close pin 7 when it isnt open sometimes
// TODO: implement quick fades for volume instead of on/off immediately
// TODO: perhaps implement min amount of time music can be playing for?
// NOTE: 14 seconds in is some drumming that could work

var audioPath = './audio/dojinsuite.mp3';
var fs        = require('fs');
var lame      = require('lame');
var Speaker   = require('speaker');
var speaker   = new Speaker();
var loudness  = require('loudness');
var gpio      = require('pi-gpio');
var audioStream = null;
var lastAudioToggle = null;
var muted = false;

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
loudness.setVolume(0, function() {
	console.log('Audio muted');
	muted = true;
});

// Ensure pin 7 (PIR) is closed before trying to open it
gpio.close(7);

// Open pin 7 (PIR) for input
gpio.open(7, 'input', function(err) {
	var muteSampleStart = null;

	// Set interval for every 100ms to check pin value
	setInterval(function() {
		gpio.read(7, function(err, value) {
			movement = (1 == value);

			// If we have movement and the audio is muted, unmute it
			if (movement && muted) {
				loudness.setVolume(100, function() {
					console.log('Audio unmuted');
				});
				muted = false;
			}

			// If unmuted, run sampling to check for movement stopping in a sensible manner
			if (!muted) {
				// If we are sampling for movement to mute
				if (null !== muteSampleStart) {
					// Reset if there is now some movement
					if (movement) {
						muteSampleStart = null;
					}
					// If there's still no movement and we have sampled for > 3 sec, mute
					else if (muteSampleStart < (Date.now() - 3000)) {
						loudness.setVolume(0, function() {
							console.log('Audio muted');
						});
						muted = true;
						muteSampleStart = null;
					}
				}
				// If we are not sampling and there's no movement, start sampling
				else if (!movement) {
					muteSampleStart = Date.now();
				}
			}
		}, 1);
	});
});