// TODO: use events for movement toggle to tidy up code
// TODO: fix bug where error when trying to close pin 7 when it isnt open sometimes
// TODO: perhaps implement min amount of time music can be playing for?
// TODO: implement logging
// TODO: test in situ
// NOTE: 14 seconds in is some drumming that could work

var audioPath = __dirname + '/audio/dojinsuite.mp3';
var debug     = require('debug')('portal:server')
var fs        = require('fs');
var lame      = require('lame');
var Speaker   = require('speaker');
var loudness  = require('loudness');
var gpio      = require('pi-gpio');
var audioStream = null;
var lastAudioToggle = null;
var muted = false;
var movementStart = null;

var startAudio = function() {
	audioStream = fs.createReadStream(audioPath)
		.pipe(new lame.Decoder())
		.on('format', function(format) {
			// Check audio is not muted (mute causes weirdness for some reason)
			loudness.setMuted(false, function() {});

			// Start by muting the audio using volume
			loudness.setVolume(1, function() {
				muted = true;
			});

			var speaker = new Speaker(format);

			// Re-start the audio when it has finished playing
			speaker.on('close', startAudio);

			this.pipe(speaker);
		});
};

var setMuted = function(val) {
	targetVol = val ? 1 : 100;
	jump      = val ? 2 : 15;

	// Get the current volume
	loudness.getVolume(function(err, vol) {
		currentVol = vol;
		modifier   = targetVol > currentVol ? jump : (jump * -1);

		// Start loop to reduce volume by 1 point every 10ms
		var updateVolume = function() {
			if (currentVol === targetVol) {
				return true;
			}

			currentVol = currentVol + modifier;

			// Ensure volume doesn't exceed boundaries
			currentVol = (currentVol < 1) ? 1 : currentVol;
			currentVol = (currentVol > 100) ? 100 : currentVol;

			loudness.setVolume(currentVol, function() {
				updateVolume();
			});
		};

		updateVolume();
	});
};

// Start the audio
startAudio();

// Close pin 7 (PIR) on process interrupt signal
process.on('SIGINT', function() {
	gpio.close(7);
	process.exit();
});

var runApp = function() {
	// Open pin 7 (PIR) for input
	gpio.open(7, 'input', function(err) {
		// If there was an error opening the pin, it was probably that it's busy,
		// so close it and try again
		if (err) {
			gpio.close(7);
			runApp();
		}

		var muteSampleStart = null;

		// Set interval for every 100ms to check pin value
		setInterval(function() {
			gpio.read(7, function(err, value) {
				movement = (1 == value);

				// If we have movement and the audio is muted, unmute it
				if (movement && muted) {
					debug('Movement started');
					movementStart = Date.now();
					setMuted(false);
					muted = false;
					muteSampleStart = null;

					return true;
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
							debug('Movement stopped. Movement lasted ' + (Date.now() - movementStart) + ' milliseconds');
							setMuted(true);
							muted = true;
							muteSampleStart = null;
							movementStart = null;
						}
					}
					// If we are not sampling and there's no movement, start sampling
					else if (!movement) {
						muteSampleStart = Date.now();
					}
				}
			});
		}, 5);
	});
};

runApp();