// for testing, use http://visionmedia.github.com/mocha/

var MsgBusClient = require('../lib/client.js'),
	assert = require('assert'),
	fs = require('fs');

var apiKey = 'YOUR_ACCOUNT_API_KEY_GOES_HERE';
var emailAddress  = 'test@example.com';
var channelGuid = '0123456789abcdef';

var testOverridesExist = fs.existsSync('../.test.json');
if (testOverridesExist) {
	var testOptions = require('../../.test.json');
	apiKey = testOptions.apiKey;
	emailAddress = testOptions.emailAddress;
	channelGuid = testOptions.default_channel_guid;
}


describe('MsgBusClient', function() {
	describe('auth', function() {
		it('bad api key', function(done) {
			var client = new MsgBusClient('fake key');
			client.sendEmailMessage(emailAddress, 'cs@example.com', 'Hello subjective world', {}, function(err, resp) {
				assert.ok(err);
				done();
			});
		});
	});

	// skipped to prevent sending email unnecessarily
	describe.skip('Sending Email', function() {
		it('sendEmailMessage', function(done) {
			var client = new MsgBusClient(apiKey);
			client.sendEmailMessage(emailAddress, 'cs@example.com', 'Hello subjective world', {}, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(202, resp.statusCode);
				assert.ok(resp.results);
				assert.equal('number', typeof resp.results.length);
				done();
			});
		});
	});

	describe('Email Metrics', function() {
		it('getEmailStatsSince', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getEmailStatsSince(3600000, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.ok(resp.stats);
				assert.equal('number', typeof resp.stats.msgsAttemptedCount);
				done();
			});
		});

		// DISABLED: currently timing out
		it.skip('getChannelStatsSince', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannelStatsSince(channelGuid, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				console.info(resp);
//				assert.ok(resp.stats);
//				assert.equal('number', typeof resp.stats.msgsAttemptedCount);
				done();
			});
		});
	});

	describe('Bounces', function() {
		it('getBouncesSince', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getBouncesSince(3600000, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.ok(resp.bounces);
				assert.equal('number', typeof resp.bounces.length);
				done();
			});
		});
	});

	describe('Complaint Processing', function() {
		it('getComplaintsSince', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getComplaintsSince(3600000, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.ok(resp.complaints);
				done();
			});
		});

		// timing out
		it.skip('getChannelComplaintsSince', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannelComplaintsSince(3600000, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.ok(resp.complaints);
				done();
			});
		});
	});

	describe('Unsubscribe Requests', function() {
		it('getUnsubsSince', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getUnsubsSince(3600000, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.ok(resp.unsubs);
				done();
			});
		});

		it('getChannelUnsubsSince', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannelUnsubsSince(channelGuid, 3600000, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.ok(resp.unsubs);
				done();
			});
		});
	});

	describe('Separating Mail Streams (Channels)', function() {
		it('getChannels', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannels(function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.equal('number', typeof resp.results.length);
				done();
			});
		});

		it('getChannelConfig', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannelConfig(channelGuid, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				assert.ok(resp.configuration, resp);
				done();
			});
		});

		// error on Messsage bus: "java.io.EOFException: No content to map to Object due to end of input"
		it.skip('getChannelSessions', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannelSessions(channelGuid, function(err, resp) {
				assert.ok(!err, err ? err.toString() : "");
				assert.equal(200, resp.statusCode);
				done();
			});
		});


	});
});