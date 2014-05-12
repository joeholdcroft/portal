var gpio = require('rpi-gpio');

// Open pin 7 (PIR) for input
// gpio.open(7, 'input', function(err) {
// 	// Set timeout for every 500ms to check pin value
// 	setTimeout(500, function() {
// 		gpio.read(7, function(err, value) {
// 			// Close pin 7 (PIR)
// 			//gpio.close(7);
// 			console.log(value);
// 		});
// 	});
// });

gpio.on('change', function(channel, value) {
	console.log('Channel ' + channel + ' value is now ' + value);
});
gpio.setup(7, gpio.DIR_IN);