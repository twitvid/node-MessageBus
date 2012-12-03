// for testing, use http://visionmedia.github.com/mocha/

var MsgBusClient = require('../lib/client.js'),
	assert = require("assert"),
	fs = require("fs");

var apiKey = "YOUR_ACCOUNT_API_KEY_GOES_HERE";
var emailAddress  = "test@example.com";
var channelGuid = "0123456789abcdef";

var testOverridesExist = fs.existsSync("../.test.json");
if (testOverridesExist) {
	var testOptions = require("../../.test.json");
	apiKey = testOptions.apiKey;
	emailAddress = testOptions.emailAddress;
	channelGuid = testOptions.default_channel_guid;
}


describe('client tests:', function() {
	describe('auth', function() {
		it('bad api key', function(done) {
			var client = new MsgBusClient("fake key");
			client.sendEmailMessage(emailAddress, "cs@example.com", "Hello subjective world", {}, function(err, resp) {
				assert.equal(403, resp.statusCode);
				done();
			});
		});
	});

	describe('stats', function() {
		it('email stats', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getEmailStatsSince(3600000, function(err, resp) {
				assert.ok(!err);
				assert.equal(200, resp.statusCode);
				assert.ok(resp.stats);
				assert.equal("number", typeof resp.stats.msgsAttemptedCount);
				done();
			});
		});

		// DISABLED: currently timing out
		it.skip('channel stats', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannelStatsSince(channelGuid, function(err, resp) {
				assert.ok(!err);
				assert.equal(200, resp.statusCode);
				console.info(resp);
//				assert.ok(resp.stats);
//				assert.equal("number", typeof resp.stats.msgsAttemptedCount);
				done();
			});
		});
	});

	describe.skip('message/email/send', function() {
		it('simple send', function(done) {
			var client = new MsgBusClient(apiKey);
			client.sendEmailMessage(emailAddress, "cs@example.com", "Hello subjective world", {}, function(err, resp) {
				assert.ok(!err);
				assert.equal(202, resp.statusCode);
				assert.ok(resp.results);
				assert.equal("number", typeof resp.results.length);
				done();
			});
		});
	});

	describe('channels', function() {
		it('getChannels', function(done) {
			var client = new MsgBusClient(apiKey);
			client.getChannels(function(err, resp) {
				assert.ok(!err);
				assert.equal(200, resp.statusCode);
				assert.equal("number", typeof resp.results.length);
				done();
			});
		});
	});
});