// TODO: use events for movement toggle to tidy up code
// TODO: fix bug where error when trying to close pin 7 when it isnt open sometimes
// TODO: perhaps implement min amount of time music can be playing for?
// TODO: implement logging
// TODO: test in situ
// NOTE: 14 seconds in is some drumming that could work

var audioPath = __dirname + '/audio/dojinsuite.mp3';
var fs        = require('fs');
var lame      = require('lame');
var Speaker   = require('speaker');
var loudness  = require('loudness');
var gpio      = require('pi-gpio');
var audioStream = null;
var lastAudioToggle = null;
var muted = false;

var startAudio = function() {
	audioStream = fs.createReadStream(audioPath)
		.pipe(new lame.Decoder())
		.on('format', function(format) {
			var speaker = new Speaker(format);

			// Re-start the audio when it has finished playing
			speaker.on('close', startAudio);

			this.pipe(speaker);
		});
};

var setMuted = function(val) {
	targetVol = val ? 1 : 100;

	// Get the current volume
	loudness.getVolume(function(err, vol) {
		currentVol = vol;
		modifier   = targetVol > currentVol ? 1 : -1;

		console.log('fading volume from' + currentVol + ' to ' + targetVol);

		// Start loop to reduce volume by 1 point every 10ms
		var updateVolume = function() {
			if (currentVol === targetVol) {
				return true;
			}

			currentVol = currentVol + modifier;

			loudness.setVolume(currentVol, function() {
				updateVolume();
			});
		};

		updateVolume();
	});
};

// Start the audio
startAudio();

// Check audio is not muted
loudness.setMuted(false, function() {
});

// Start by muting the audio
loudness.setVolume(1, function() {
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
						setMuted(true);
						muted = true;
						muteSampleStart = null;
					}
				}
				// If we are not sampling and there's no movement, start sampling
				else if (!movement) {
					muteSampleStart = Date.now();
				}
			}
		}, 10);
	});
});