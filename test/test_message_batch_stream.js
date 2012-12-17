// for testing, use http://visionmedia.github.com/mocha/

var MessageBatchStream = require('../lib/message_batch_stream.js');
var assert = require('assert');


describe('MessageBatchStream', function() {
	it('end flush', function(done) {
		var message = {
			'subject': 'foobar'
		};

		var stream = new MessageBatchStream();
		stream.on('data', function(batch) {
			assert.equal(5, batch.length);
			done();
		});

		// write 5 messages to the stream
		for (var i = 0; i < 5; i++) {
			stream.write(message);
		}
		stream.end();
	});

	it('batch count', function(done) {
		var message = {
			'subject': 'foobar'
		};

		var stream = new MessageBatchStream(2);
		var count = 0;
		stream.on('data', function(batch) {
			assert.equal(2, batch.length);
			count += batch.length;

			if (count >= 6) {
				done();
			}
		});

		// write 6 messages to the stream
		for (var i = 0; i < 6; i++) {
			stream.write(message);
		}
		stream.end();
	});

	it('buffer size', function(done) {
		var message = {
			'subject': 'foobar'
		};

		var stream = new MessageBatchStream(1000, 18);

		var count = 0;
		stream.on('data', function(batch) {
			assert.equal(6, batch.length);
			count += batch.length;
		});

		var isDrained = false;
		stream.on('drain', function() {
			isDrained = true;
		});

		// write 18 bytes to the stream
		assert.ok(stream.write(message));
		assert.ok(stream.write(message));
		assert.ok(stream.write(message));

		// write another 18 bytes to the stream after buffer limit
		assert.ok(!stream.write(message));
		assert.ok(!stream.write(message));
		assert.ok(!stream.write(message));

		global.setTimeout(function() {
			assert.equal(6, count);
			assert.ok(isDrained);
			done();
		}, 1000);
	});

	it('pause and resume', function(done) {
		var message = {
			'subject': 'foobar'
		};

		// 2 messages per batch
		var stream = new MessageBatchStream(2);

		var dataCount = 0;
		stream.on('data', function(batch) {
			dataCount += batch.length;
		});

		var isPause = false;
		stream.on('pause', function() {
			isPause = true;
		});

		var isResume = false;
		stream.on('resume', function() {
			isResume = true;
		});

		stream.write(message);
		stream.pause();
		stream.write(message);
		stream.write(message);
		stream.write(message);

		global.setTimeout(function() {
			assert.equal(0, dataCount);
			stream.resume();
			global.setTimeout(function() {
				assert.equal(4, dataCount);
				assert.ok(isPause);
				assert.ok(isResume);
				done();
			}, 200);
		}, 200);
	});
});