var gpio         = require('pi-gpio');
var EventEmitter = require('events').EventEmitter;
var events       = function() {};
var movement     = false;

util.inherits(events, EventEmitter);

// Ensure pin 7 (PIR) is closed before trying to open it
gpio.close(7);

// Open pin 7 (PIR) for input
gpio.open(7, 'input', function(err) {
	// Set interval for every 100ms to check pin value
	setInterval(function() {
		gpio.read(7, function(err, value) {
			events.emit('movement', (1 == value));
		}, 500);
	});
});

events.on('movement', function(val) {
	movement = val;

	console.log(movement ? 'Movement detected' : 'Movement stopped');
});